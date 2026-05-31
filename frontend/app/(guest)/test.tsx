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
import { GuestAPI, QuestionWithOptionsDTO, TestAttemptDTO } from '../../src/lib/api';
import { TIMER_DANGER, TIMER_WARNING } from '../../src/lib/config';
import { C } from '../../src/lib/theme';

export default function GuestTest() {
  const { attemptId, guestToken, attemptData } = useLocalSearchParams<{
    attemptId: string;
    guestToken: string;
    attemptData: string;
  }>();
  const { width } = useWindowDimensions();
  const isMedium = width > 768;

  const attempt: TestAttemptDTO | null = (() => {
    try { return attemptData ? JSON.parse(attemptData) : null; } catch { return null; }
  })();

  const [questions] = useState<QuestionWithOptionsDTO[]>(attempt?.questions ?? []);
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [remainingSeconds, setRemainingSeconds] = useState(Math.max(0, (attempt?.remainingMinutes ?? 0) * 60));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submittedRef = useRef(false);
  const parsedAttemptId = Number(attemptId);

  const submitTest = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await GuestAPI.submitTest(parsedAttemptId);
      if (guestToken) GuestAPI.invalidateSession(guestToken).catch(() => {});
      router.replace({
        pathname: '/(guest)/results',
        params: { resultData: JSON.stringify(result) },
      });
    } catch (e: unknown) {
      submittedRef.current = false;
      setIsSubmitting(false);
      Alert.alert('Submit Failed', (e as Error).message || 'Could not submit. Please try again.');
    }
  }, [parsedAttemptId, guestToken]);

  // Timer countdown
  useEffect(() => {
    if (remainingSeconds <= 0 || submittedRef.current) return;
    const t = setInterval(() => {
      setRemainingSeconds(s => {
        if (s <= 1) {
          clearInterval(t);
          if (!submittedRef.current) {
            Alert.alert("Time's Up", 'Your time has expired. Submitting now.', [
              { text: 'OK', onPress: () => submitTest() },
            ]);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [submitTest]);

  // Timer sync with server every 30s
  useEffect(() => {
    if (!parsedAttemptId || submittedRef.current) return;
    const t = setInterval(async () => {
      try {
        const fresh = await GuestAPI.getAttemptState(parsedAttemptId);
        setRemainingSeconds(Math.max(0, fresh.remainingMinutes * 60));
      } catch { /* silent */ }
    }, 30000);
    return () => clearInterval(t);
  }, [parsedAttemptId]);

  function handleSelectOption(questionId: number, optionId: number) {
    setAnswers(prev => {
      const next = new Map(prev);
      next.set(questionId, optionId);
      return next;
    });
    GuestAPI.submitAnswer(parsedAttemptId, questionId, optionId).catch(() => {
      Alert.alert('Warning', 'Failed to save answer. Check your connection and try again.');
    });
  }

  function handleSubmitPress() {
    Alert.alert('Submit Test', 'Are you sure? You cannot change your answers after submitting.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Submit', style: 'destructive', onPress: submitTest },
    ]);
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timerColor =
    remainingSeconds > TIMER_WARNING ? C.SUCCESS :
    remainingSeconds > TIMER_DANGER ? C.WARNING : C.DANGER;

  const currentQuestion = questions[currentIndex] ?? null;

  if (!attempt || questions.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Test data not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(guest)' as any)}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isSubmitting) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={C.SUCCESS} size="large" />
        <Text style={styles.loadingText}>Submitting your test…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.testTitle} numberOfLines={1}>{attempt.testTitle}</Text>
        <View style={styles.headerRight}>
          <Text style={styles.progressText}>{answers.size}/{questions.length}</Text>
          <View style={[styles.timerBox, { borderColor: timerColor }]}>
            <Text style={[styles.timerText, { color: timerColor }]}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {/* Sidebar — desktop */}
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

        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
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

          {currentQuestion && (
            <>
              <Text style={styles.questionMeta}>
                Question {currentQuestion.questionNumber} of {questions.length}
              </Text>
              <Text style={styles.questionText}>{currentQuestion.questionText}</Text>

              <View style={styles.optionsList}>
                {currentQuestion.options.map(opt => {
                  const selected = answers.get(currentQuestion.id) === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.optionBtn, selected && styles.optionBtnSelected]}
                      onPress={() => handleSelectOption(currentQuestion.id, opt.id)}
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
                onPress={() => setCurrentIndex(i => i + 1)}
                activeOpacity={0.7}
              >
                <Text style={styles.navBtnText}>Next →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitPress} activeOpacity={0.8}>
                <Text style={styles.submitBtnText}>Submit Test</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>

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
  centered: { flex: 1, backgroundColor: C.BG, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  errorText: { color: C.DANGER, fontSize: 15, textAlign: 'center' },
  loadingText: { color: C.TEXT_SEC, fontSize: 15 },
  backBtn: {
    backgroundColor: C.ELEVATED,
    borderWidth: 1,
    borderColor: C.BORDER_STRONG,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  backBtnText: { fontSize: 14, fontWeight: '600', color: C.TEXT },
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
  testTitle: { fontSize: 15, fontWeight: '600', color: C.TEXT, flex: 1, marginRight: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  progressText: { fontSize: 13, color: C.TEXT_SEC },
  timerBox: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  timerText: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] as const },
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
  contentInner: { padding: 24, paddingBottom: 80 },
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
  optionCircleFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.ACCENT },
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
});
