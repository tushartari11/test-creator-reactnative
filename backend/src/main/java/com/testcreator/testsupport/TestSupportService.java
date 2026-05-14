package com.testcreator.testsupport;

import com.testcreator.entity.GuestTestSession;
import com.testcreator.entity.Option;
import com.testcreator.entity.Question;
import com.testcreator.entity.Role;
import com.testcreator.entity.Test;
import com.testcreator.entity.TestStatus;
import com.testcreator.entity.User;
import com.testcreator.repository.GuestTestSessionRepository;
import com.testcreator.repository.OptionRepository;
import com.testcreator.repository.ProctoringViolationRepository;
import com.testcreator.repository.QuestionRepository;
import com.testcreator.repository.StudentAnswerRepository;
import com.testcreator.repository.TestAttemptRepository;
import com.testcreator.repository.TestRepository;
import com.testcreator.repository.UserRepository;
import com.testcreator.testsupport.ScenarioLedger.ScenarioEntities;
import com.testcreator.testsupport.dto.TestSupportDtos.CreateGuestAccessRequest;
import com.testcreator.testsupport.dto.TestSupportDtos.CreateGuestAccessResponse;
import com.testcreator.testsupport.dto.TestSupportDtos.CreateTestRequest;
import com.testcreator.testsupport.dto.TestSupportDtos.CreateTestResponse;
import com.testcreator.testsupport.dto.TestSupportDtos.CreateUserRequest;
import com.testcreator.testsupport.dto.TestSupportDtos.CreateUserResponse;
import com.testcreator.testsupport.dto.TestSupportDtos.LoginAsResponse;
import com.testcreator.testsupport.dto.TestSupportDtos.QuestionDescriptor;
import com.testcreator.testsupport.dto.TestSupportDtos.QuestionSeed;
import com.testcreator.util.JwtUtil;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.Consumer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Orchestrates fixture creation and cleanup for E2E scenarios.
 *
 * <p>All mutating methods scope their work to a single scenario via
 * {@link ScenarioLedger} and run inside a Spring transaction so a thrown
 * exception rolls back the partial inserts atomically.
 */
@Service
@Profile("e2e")
@RequiredArgsConstructor
@Slf4j
public class TestSupportService {

    private final ScenarioLedger ledger;
    private final UserRepository userRepository;
    private final TestRepository testRepository;
    private final QuestionRepository questionRepository;
    private final OptionRepository optionRepository;
    private final TestAttemptRepository testAttemptRepository;
    private final StudentAnswerRepository studentAnswerRepository;
    private final GuestTestSessionRepository guestSessionRepository;
    private final ProctoringViolationRepository proctoringViolationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RedisTemplate<String, Object> redisTemplate;

    public UUID createScenario() {
        UUID id = ledger.create();
        log.debug("Created scenario {}", id);
        return id;
    }

    @Transactional
    public CreateUserResponse createUser(UUID scenarioId, CreateUserRequest req, Role role) {
        ScenarioEntities entities = ledger.get(scenarioId);
        if (userRepository.existsByEmail(req.email())) {
            throw new IllegalArgumentException("Email already exists: " + req.email());
        }
        User user = User.builder()
            .email(req.email())
            .password(passwordEncoder.encode(req.password() == null ? "Password123" : req.password()))
            .name(req.name() == null ? defaultName(role) : req.name())
            .role(role)
            .active(true)
            .build();
        user = userRepository.save(user);
        entities.userIds.add(user.getId());

        String jwt = generateJwt(user);
        return new CreateUserResponse(user.getId(), user.getEmail(), user.getName(), user.getRole(), jwt);
    }

    @Transactional
    public CreateTestResponse createTest(UUID scenarioId, CreateTestRequest req) {
        ScenarioEntities entities = ledger.get(scenarioId);
        User teacher = userRepository.findById(req.teacherId())
            .orElseThrow(() -> new IllegalArgumentException("Teacher not found: " + req.teacherId()));
        if (teacher.getRole() != Role.TEACHER) {
            throw new IllegalArgumentException("User " + req.teacherId() + " is not a TEACHER");
        }

        List<QuestionSeed> seeds = req.questions() == null || req.questions().isEmpty()
            ? defaultQuestionSeeds()
            : req.questions();

        boolean publish = Boolean.TRUE.equals(req.publish());
        Test test = Test.builder()
            .title(req.title() == null ? "E2E Test " + scenarioId.toString().substring(0, 8) : req.title())
            .description("Created by test-support module for scenario " + scenarioId)
            .createdBy(teacher)
            .totalQuestions(seeds.size())
            .passingScore(req.passingScore() == null ? 1 : req.passingScore())
            .durationMinutes(req.durationMinutes() == null ? 30 : req.durationMinutes())
            .testDate(LocalDateTime.now().plusMinutes(1))
            .accessCode(Boolean.TRUE.equals(req.generateAccessCode()) ? generateAccessCode() : null)
            .status(publish ? TestStatus.PUBLISHED : TestStatus.DRAFT)
            .build();
        test = testRepository.save(test);
        entities.testIds.add(test.getId());

        List<QuestionDescriptor> qDescriptors = new ArrayList<>();
        for (int i = 0; i < seeds.size(); i++) {
            QuestionSeed seed = seeds.get(i);
            validateSeed(seed, i);
            Question question = Question.builder()
                .test(test)
                .questionNumber(i + 1)
                .questionText(seed.questionText())
                .correctOptionNumber(seed.correctOptionNumber())
                .build();
            question = questionRepository.save(question);
            entities.questionIds.add(question.getId());

            List<Long> optionIds = new ArrayList<>();
            for (int j = 0; j < seed.options().size(); j++) {
                Option option = Option.builder()
                    .question(question)
                    .optionNumber(j + 1)
                    .optionText(seed.options().get(j))
                    .build();
                option = optionRepository.save(option);
                entities.optionIds.add(option.getId());
                optionIds.add(option.getId());
            }
            qDescriptors.add(new QuestionDescriptor(question.getId(), i + 1, optionIds));
        }

        return new CreateTestResponse(test.getId(), test.getTitle(), test.getAccessCode(),
            test.getTestDate(), qDescriptors);
    }

    @Transactional
    public CreateGuestAccessResponse createGuestAccess(UUID scenarioId, CreateGuestAccessRequest req) {
        ScenarioEntities entities = ledger.get(scenarioId);
        Test test = testRepository.findById(req.testId())
            .orElseThrow(() -> new IllegalArgumentException("Test not found: " + req.testId()));
        int hours = req.expiresInHours() == null ? 24 : req.expiresInHours();

        GuestTestSession session = GuestTestSession.builder()
            .test(test)
            .guestToken(UUID.randomUUID().toString())
            .createdAt(LocalDateTime.now())
            .expiresAt(LocalDateTime.now().plusHours(hours))
            .isUsed(false)
            .build();
        session = guestSessionRepository.save(session);
        entities.guestSessionIds.add(session.getId());

        return new CreateGuestAccessResponse(session.getId(), session.getGuestToken(),
            session.getExpiresAt(), test.getAccessCode());
    }

    @Transactional(readOnly = true)
    public LoginAsResponse loginAs(UUID scenarioId, Long userId) {
        ledger.get(scenarioId);
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        return new LoginAsResponse(generateJwt(user), user.getRole());
    }

    /**
     * Deletes every entity tracked by the scenario, in FK-safe order, atomically.
     * Also purges Redis keys keyed on the scenario's test attempts.
     */
    @Transactional
    public void deleteScenario(UUID scenarioId) {
        ScenarioEntities entities = ledger.remove(scenarioId);
        if (entities == null) {
            log.debug("Scenario {} not in ledger — nothing to delete", scenarioId);
            return;
        }
        log.debug("Cleaning up scenario {}: users={} tests={} attempts={}",
            scenarioId, entities.userIds.size(), entities.testIds.size(), entities.testAttemptIds.size());

        deleteByIds(entities.proctoringViolationIds, proctoringViolationRepository::deleteAllByIdInBatch);
        deleteByIds(entities.studentAnswerIds, studentAnswerRepository::deleteAllByIdInBatch);

        Set<Long> attemptIds = new HashSet<>(entities.testAttemptIds);
        deleteByIds(entities.testAttemptIds, testAttemptRepository::deleteAllByIdInBatch);

        deleteByIds(entities.guestSessionIds, guestSessionRepository::deleteAllByIdInBatch);
        deleteByIds(entities.optionIds, optionRepository::deleteAllByIdInBatch);
        deleteByIds(entities.questionIds, questionRepository::deleteAllByIdInBatch);
        deleteByIds(entities.testIds, testRepository::deleteAllByIdInBatch);
        deleteByIds(entities.userIds, userRepository::deleteAllByIdInBatch);

        purgeRedisKeysForAttempts(attemptIds);
    }

    public int sweepStale(Instant cutoff) {
        Set<UUID> stale = ledger.scenarioIdsOlderThan(cutoff);
        for (UUID id : stale) {
            try {
                deleteScenario(id);
            } catch (RuntimeException ex) {
                log.warn("Sweeper failed to delete stale scenario {}: {}", id, ex.getMessage());
            }
        }
        return stale.size();
    }

    private void purgeRedisKeysForAttempts(Set<Long> attemptIds) {
        if (attemptIds.isEmpty()) return;
        List<String> keys = new ArrayList<>();
        for (Long attemptId : attemptIds) {
            keys.add("attempt_answers:" + attemptId);
            keys.add("attempt_session:" + attemptId);
            Set<String> wildcardMatches = redisTemplate.keys("answer:" + attemptId + ":*");
            if (wildcardMatches != null) keys.addAll(wildcardMatches);
        }
        if (!keys.isEmpty()) redisTemplate.delete(keys);
    }

    private void deleteByIds(Set<Long> ids, Consumer<Iterable<Long>> deleter) {
        if (ids != null && !ids.isEmpty()) {
            deleter.accept(ids);
        }
    }

    private static void validateSeed(QuestionSeed seed, int index) {
        if (seed.options() == null || seed.options().size() != 3) {
            throw new IllegalArgumentException("Question " + (index + 1) + " must have exactly 3 options");
        }
        if (seed.correctOptionNumber() == null || seed.correctOptionNumber() < 1 || seed.correctOptionNumber() > 3) {
            throw new IllegalArgumentException(
                "Question " + (index + 1) + " correctOptionNumber must be in [1,3]");
        }
    }

    private static List<QuestionSeed> defaultQuestionSeeds() {
        return List.of(
            new QuestionSeed("What is 2 + 2?", List.of("3", "4", "5"), 2),
            new QuestionSeed("Capital of France?", List.of("Berlin", "Paris", "Madrid"), 2),
            new QuestionSeed("Largest planet?", List.of("Earth", "Mars", "Jupiter"), 3)
        );
    }

    private static String defaultName(Role role) {
        return role == Role.TEACHER ? "E2E Teacher" : "E2E Student";
    }

    private static String generateAccessCode() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private String generateJwt(User user) {
        org.springframework.security.core.userdetails.UserDetails details =
            org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(user.getPassword())
                .authorities("ROLE_" + user.getRole().name())
                .build();
        return jwtUtil.generateToken(details);
    }

    /** Used only by tests and the sweeper. */
    public int activeScenarioCount() {
        return ledger.size();
    }
}
