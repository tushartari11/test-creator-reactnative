import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

function showAlert(
  title: string,
  message: string,
  buttons?: { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }[]
) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  if (!buttons?.length) {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  const confirmBtn = buttons.find(b => b.style !== 'cancel');
  if (window.confirm(`${title}\n\n${message}`)) {
    confirmBtn?.onPress?.();
  }
}
import {
  CachedAnswerDto,
  QuestionWithOptionsDto,
  StudentAPI,
  TestAttemptDto,
} from '../../src/lib/api';
import { AUTO_SAVE_INTERVAL, HEARTBEAT_INTERVAL, TIMER_DANGER, TIMER_WARNING } from '../../src/lib/config';
import { C } from '../../src/lib/theme';

export default function TakeTest() {
  const { testId } = useLocalSearchParams<{ testId: string }>();
  const { width } = useWindowDimensions();
  const isMedium = width > 768;

  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<QuestionWithOptionsDto[]>([]);
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [testTitle, setTestTitle] = useState('');

  const dirtyAnswers = useRef<Map<number, number>>(new Map());
  const submittedRef = useRef(false);

  const doSubmit = useCallback(async (id: number) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setIsSubmitting(true);
    try {
      await flushDirtyAnswers(id);
      await StudentAPI.submitTest(id);
      router.replace({ pathname: '/(student)/test-result', params: { attemptId: id } });
    } catch (e: unknown) {
      submittedRef.current = false;
      setIsSubmitting(false);
      showAlert('Submit Failed', (e as Error).message || 'Could not submit test. Please try again.');
    }
  }, []);

  useEffect(() => {
    if (!testId) {
      showAlert('Error', 'No test selected.');
      router.back();
      return;
    }

    (async () => {
      try {
        const attempt: TestAttemptDto = await StudentAPI.startAttempt(Number(testId));
        setAttemptId(attempt.id);
        setQuestions(attempt.questions);
        setTestTitle(attempt.testTitle);
        setRemainingSeconds(Math.max(0, attempt.remainingMinutes * 60));

        const cached: CachedAnswerDto[] = await StudentAPI.recoverCachedAnswers(attempt.id);
        if (cached.length > 0) {
          const recovered = new Map<number, number>();
          cached.forEach(c => recovered.set(c.questionId, c.selectedOption));
          setAnswers(recovered);
        }
      } catch (e: unknown) {
        showAlert('Error', (e as Error).message || 'Failed to start test.');
        router.back();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [testId]);

  // Timer
  useEffect(() => {
    if (isLoading || remainingSeconds <= 0 || submittedRef.current) return;
    const t = setInterval(() => {
      setRemainingSeconds(s => {
        if (s <= 1) {
          clearInterval(t);
          if (attemptId && !submittedRef.current) {
            showAlert("Time's Up", 'Your time has expired. Submitting now.', [
              { text: 'OK', onPress: () => doSubmit(attemptId) },
            ]);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isLoading, attemptId, doSubmit]);

  // Autosave
  useEffect(() => {
    if (!attemptId || isLoading) return;
    const t = setInterval(() => flushDirtyAnswers(attemptId), AUTO_SAVE_INTERVAL);
    return () => clearInterval(t);
  }, [attemptId, isLoading]);

  // Heartbeat
  useEffect(() => {
    if (!attemptId || isLoading) return;
    const t = setInterval(() => {
      StudentAPI.sendHeartbeat(attemptId).catch(() => {});
    }, HEARTBEAT_INTERVAL);
    return () => clearInterval(t);
  }, [attemptId, isLoading]);

  async function flushDirtyAnswers(id: number) {
    const toFlush = new Map(dirtyAnswers.current);
    if (toFlush.size === 0) return;
    dirtyAnswers.current.clear();
    const promises = Array.from(toFlush.entries()).map(([questionId, selectedOption]) =>
      StudentAPI.autoSaveAnswer(id, { questionId, selectedOption }).catch(() => {
        dirtyAnswers.current.set(questionId, selectedOption);
      })
    );
    await Promise.all(promises);
  }

  function handleSelectOption(questionId: number, optionNumber: number) {
    setAnswers(prev => {
      const next = new Map(prev);
      next.set(questionId, optionNumber);
      return next;
    });
    dirtyAnswers.current.set(questionId, optionNumber);
  }

  function handleSubmitPress() {
    if (!attemptId) return;
    showAlert('Submit Test', 'Are you sure? You cannot change answers after submitting.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Submit', style: 'destructive', onPress: () => doSubmit(attemptId) },
    ]);
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timerColor =
    remainingSeconds > TIMER_WARNING ? C.SUCCESS :
    remainingSeconds > TIMER_DANGER ? C.WARNING : C.DANGER;

  const currentQuestion = questions[currentIndex] ?? null;
  const answeredCount = answers.size;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={C.ACCENT} size="large" />
        <Text style={styles.loadingText}>Starting test…</Text>
      </View>
    );
  }

  if (isSubmitting) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={C.SUCCESS} size="large" />
        <Text style={styles.loadingText}>Submitting…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.testTitle} numberOfLines={1}>{testTitle}</Text>
        <View style={styles.headerRight}>
          <Text style={styles.progress}>{answeredCount}/{questions.length} answered</Text>
          <View style={[styles.timerBox, { borderColor: timerColor }]}>
            <Text style={[styles.timerText, { color: timerColor }]}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </Text>
          </View>
        </View>
      </View>

      {!!error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.body}>
        {/* Sidebar — desktop only */}
        {isMedium && (
          <ScrollView style={styles.sidebar} showsVerticalScrollIndicator={false}>
            {questions.map((q, idx) => {
              const answered = answers.has(q.id);
              const active = idx === currentIndex;
              return (
                <TouchableOpacity
                  key={q.id}
                  style={[
                    styles.sidebarItem,
                    active && styles.sidebarItemActive,
                    answered && !active && styles.sidebarItemAnswered,
                  ]}
                  onPress={() => setCurrentIndex(idx)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.sidebarItemText,
                    active && styles.sidebarItemTextActive,
                    answered && !active && styles.sidebarItemTextAnswered,
                  ]}>
                    Q{q.questionNumber}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Question area */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          {currentQuestion ? (
            <>
              {/* Mobile dot indicators */}
              {!isMedium && (
                <View style={styles.dotRow}>
                  {questions.map((q, idx) => (
                    <TouchableOpacity key={q.id} onPress={() => setCurrentIndex(idx)}>
                      <View style={[
                        styles.dot,
                        idx === currentIndex && styles.dotActive,
                        answers.has(q.id) && idx !== currentIndex && styles.dotAnswered,
                      ]} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.questionMeta}>
                Question {currentQuestion.questionNumber} of {questions.length}
              </Text>
              <Text style={styles.questionText}>{currentQuestion.questionText}</Text>

              <View style={styles.optionsList}>
                {currentQuestion.options.map(opt => {
                  const selected = answers.get(currentQuestion.id) === opt.optionNumber;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.optionBtn, selected && styles.optionBtnSelected]}
                      onPress={() => handleSelectOption(currentQuestion.id, opt.optionNumber)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.optionCircle, selected && styles.optionCircleSelected]}>
                        {selected && <View style={styles.optionCircleFill} />}
                      </View>
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                        {opt.optionText}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>No questions available.</Text>
          )}

          {/* Navigation */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
              onPress={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              activeOpacity={0.7}
            >
              <Text style={styles.navBtnText}>← Previous</Text>
            </TouchableOpacity>

            {currentIndex < questions.length - 1 ? (
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
                activeOpacity={0.7}
              >
                <Text style={styles.navBtnText}>Next →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmitPress}
                activeOpacity={0.8}
              >
                <Text style={styles.submitBtnText}>Submit Test</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Floating submit button */}
      {isMedium && (
        <View style={styles.floatingSubmit}>
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitPress} activeOpacity={0.8}>
            <Text style={styles.submitBtnText}>Submit Test</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.BG },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.BG, gap: 16 },
  loadingText: { color: C.TEXT_SEC, fontSize: 15 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 60,
    backgroundColor: C.ELEVATED,
    borderBottomWidth: 1,
    borderBottomColor: C.BORDER,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.4)' } as object,
      default: { elevation: 4 },
    }),
  },
  testTitle: { fontSize: 16, fontWeight: '600', color: C.TEXT, flex: 1, marginRight: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  progress: { fontSize: 13, color: C.TEXT_SEC },
  timerBox: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  timerText: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] as const },
  errorBanner: {
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderBottomWidth: 1,
    borderBottomColor: C.DANGER,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  errorText: { color: C.DANGER, fontSize: 13 },
  body: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 80,
    backgroundColor: C.ELEVATED,
    borderRightWidth: 1,
    borderRightColor: C.BORDER,
    paddingTop: 8,
  },
  sidebarItem: {
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 6,
  },
  sidebarItemActive: { backgroundColor: C.ACCENT },
  sidebarItemAnswered: { backgroundColor: 'rgba(52,211,153,0.15)' },
  sidebarItemText: { fontSize: 12, color: C.TEXT_SEC, fontWeight: '500' },
  sidebarItemTextActive: { color: '#fff', fontWeight: '700' },
  sidebarItemTextAnswered: { color: C.SUCCESS },
  content: { flex: 1 },
  contentInner: { padding: 24, paddingBottom: 48 },
  dotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.BORDER_STRONG },
  dotActive: { backgroundColor: C.ACCENT, width: 12, height: 12, borderRadius: 6 },
  dotAnswered: { backgroundColor: C.SUCCESS },
  questionMeta: { fontSize: 13, color: C.TEXT_SEC, marginBottom: 12 },
  questionText: { fontSize: 17, color: C.TEXT, fontWeight: '500', lineHeight: 26, marginBottom: 24 },
  optionsList: { gap: 10, marginBottom: 32 },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.ELEVATED,
    borderWidth: 1,
    borderColor: C.BORDER,
    borderRadius: 10,
    padding: 16,
  },
  optionBtnSelected: {
    borderColor: C.ACCENT,
    backgroundColor: 'rgba(99,102,241,0.12)',
  },
  optionCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.TEXT_SEC,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCircleSelected: { borderColor: C.ACCENT },
  optionCircleFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.ACCENT,
  },
  optionText: { fontSize: 15, color: C.TEXT_SEC, flex: 1 },
  optionTextSelected: { color: C.TEXT, fontWeight: '500' },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  navBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.BORDER_STRONG,
  },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { fontSize: 14, color: C.TEXT_SEC, fontWeight: '500' },
  submitBtn: {
    backgroundColor: C.SUCCESS,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitBtnText: { fontSize: 14, fontWeight: '600', color: '#07091a' },
  floatingSubmit: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.5)' } as object,
      default: { elevation: 8 },
    }),
  },
  emptyText: { fontSize: 14, color: C.TEXT_SEC, textAlign: 'center', marginTop: 40 },
});
