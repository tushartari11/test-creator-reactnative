package com.testcreator.testsupport;

import java.time.Instant;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * In-memory ledger of every entity created on behalf of a test scenario.
 *
 * <p>Lives only in the test-support module — never touches production code. Used by {@link
 * TestSupportService} to delete exactly the rows a scenario created, so cleanup is precise and
 * parallel-safe.
 */
@Component
@Profile("e2e")
public class ScenarioLedger {

  private final Map<UUID, ScenarioEntities> scenarios = new ConcurrentHashMap<>();

  /** Creates a new scenario and returns its UUID. */
  public UUID create() {
    UUID id = UUID.randomUUID();
    scenarios.put(id, new ScenarioEntities(Instant.now()));
    return id;
  }

  public boolean exists(UUID scenarioId) {
    return scenarios.containsKey(scenarioId);
  }

  /** Returns the entities for the given scenario, throwing if it does not exist. */
  public ScenarioEntities get(UUID scenarioId) {
    ScenarioEntities entities = scenarios.get(scenarioId);
    if (entities == null) {
      throw new ScenarioNotFoundException(scenarioId);
    }
    return entities;
  }

  public ScenarioEntities remove(UUID scenarioId) {
    return scenarios.remove(scenarioId);
  }

  /** Returns all scenario IDs whose creation time is before {@code cutoff}. */
  public Set<UUID> scenarioIdsOlderThan(Instant cutoff) {
    Set<UUID> stale = new HashSet<>();
    scenarios.forEach(
        (id, entities) -> {
          if (entities.createdAt.isBefore(cutoff)) {
            stale.add(id);
          }
        });
    return stale;
  }

  public int size() {
    return scenarios.size();
  }

  /** Per-scenario record of every primary key inserted on its behalf. */
  public static class ScenarioEntities {
    public final Instant createdAt;
    public final Set<Long> userIds = ConcurrentHashMap.newKeySet();
    public final Set<Long> testIds = ConcurrentHashMap.newKeySet();
    public final Set<Long> questionIds = ConcurrentHashMap.newKeySet();
    public final Set<Long> optionIds = ConcurrentHashMap.newKeySet();
    public final Set<Long> testAttemptIds = ConcurrentHashMap.newKeySet();
    public final Set<Long> studentAnswerIds = ConcurrentHashMap.newKeySet();
    public final Set<Long> guestSessionIds = ConcurrentHashMap.newKeySet();
    public final Set<Long> proctoringViolationIds = ConcurrentHashMap.newKeySet();

    ScenarioEntities(Instant createdAt) {
      this.createdAt = createdAt;
    }
  }

  /** Thrown when a requested scenario ID is not found in the ledger. */
  public static class ScenarioNotFoundException extends RuntimeException {
    public ScenarioNotFoundException(UUID id) {
      super("Scenario not found: " + id);
    }
  }
}
