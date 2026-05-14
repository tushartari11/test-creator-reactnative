import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { ReviewQuestion, StudentAPI, TestResultDTO } from '../../src/lib/api';
import { C } from '../../src/lib/theme';
import { formatDate } from '../../src/lib/utils';

export default function TestResult() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const { width } = useWindowDimensions();
  const isMedium = width > 768;

  const [result, setResult] = useState<TestResultDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!attemptId) { setError('No attempt ID provided.'); setIsLoading(false); return; }
    StudentAPI.getDetailedResult(Number(attemptId))
      .then(setResult)
      .catch(e => setError((e as Error).message || 'Failed to load result.'))
      .finally(() => setIsLoading(false));
  }, [attemptId]);

  function toggleExpand(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={C.ACCENT} size="large" />
      </View>
    );
  }

  if (error || !result) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Result not found.'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(student)/dashboard')}>
          <Text style={styles.backBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPassed = result.result === 'PASS';
  const resultColor = isPassed ? C.SUCCESS : C.DANGER;
  const mins = Math.floor((result.timeTakenSeconds ?? 0) / 60);
  const secs = (result.timeTakenSeconds ?? 0) % 60;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.inner}>
      {/* Result header card */}
      <View style={styles.headerCard}>
        <Text style={styles.testTitle}>{result.testTitle}</Text>
        <Text style={[styles.score, { color: resultColor }]}>{result.score.toFixed(1)}%</Text>
        <View style={[styles.badge, { borderColor: resultColor, backgroundColor: `${resultColor}22` }]}>
          <Text style={[styles.badgeText, { color: resultColor }]}>{result.result}</Text>
        </View>
        <Text style={styles.passingNote}>
          Needed {result.passingScore}% to pass
        </Text>

        <View style={styles.statsRow}>
          <StatBox label="Correct" value={String(result.correctAnswers)} color={C.SUCCESS} />
          <StatBox label="Wrong" value={String(result.wrongAnswers)} color={C.DANGER} />
          <StatBox label="Skipped" value={String(result.skippedQuestions)} color={C.TEXT_SEC} />
          {result.timeTakenSeconds != null && (
            <StatBox
              label="Time"
              value={`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`}
              color={C.TEXT_SEC}
            />
          )}
        </View>

        {result.submittedAt && (
          <Text style={styles.submittedAt}>Submitted {formatDate(result.submittedAt)}</Text>
        )}
      </View>

      {/* Review questions */}
      {result.reviewQuestions?.length > 0 && (
        <View style={styles.reviewSection}>
          <Text style={styles.reviewTitle}>Question Review</Text>
          {result.reviewQuestions.map(q => (
            <ReviewCard
              key={q.id}
              question={q}
              expanded={isMedium || expanded.has(q.id)}
              onToggle={() => toggleExpand(q.id)}
              isMedium={isMedium}
            />
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.replace('/(student)/dashboard')}
        activeOpacity={0.8}
      >
        <Text style={styles.backBtnText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ReviewCard({
  question,
  expanded,
  onToggle,
  isMedium,
}: {
  question: ReviewQuestion;
  expanded: boolean;
  onToggle: () => void;
  isMedium: boolean;
}) {
  const correctColor = question.isCorrect ? C.SUCCESS : C.DANGER;
  return (
    <View style={styles.reviewCard}>
      <TouchableOpacity
        style={styles.reviewCardHeader}
        onPress={isMedium ? undefined : onToggle}
        activeOpacity={isMedium ? 1 : 0.7}
      >
        <View style={styles.reviewCardLeft}>
          <Text style={[styles.correctMark, { color: correctColor }]}>
            {question.isCorrect ? '✓' : '✗'}
          </Text>
          <Text style={styles.reviewQNum}>Q{question.questionNumber}</Text>
        </View>
        <Text style={styles.reviewQText} numberOfLines={expanded ? undefined : 2}>
          {question.questionText}
        </Text>
        {!isMedium && (
          <Text style={styles.expandChevron}>{expanded ? '▲' : '▼'}</Text>
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.reviewOptionsContainer}>
          {question.options.map(opt => {
            const isCorrect = opt.isCorrect;
            const wasSelected = opt.wasSelected;
            let bg: string = 'transparent';
            let border: string = C.BORDER;
            let textColor: string = C.TEXT_SEC;
            if (isCorrect && wasSelected) { bg = `${C.SUCCESS}22`; border = C.SUCCESS; textColor = C.SUCCESS; }
            else if (isCorrect) { border = C.SUCCESS; textColor = C.SUCCESS; }
            else if (wasSelected) { bg = `${C.DANGER}22`; border = C.DANGER; textColor = C.DANGER; }

            return (
              <View
                key={opt.optionNumber}
                style={[styles.reviewOption, { backgroundColor: bg, borderColor: border }]}
              >
                <Text style={[styles.reviewOptionNum, { color: textColor }]}>{opt.optionNumber}.</Text>
                <Text style={[styles.reviewOptionText, { color: textColor }]}>{opt.optionText}</Text>
                {isCorrect && <Text style={styles.correctTag}>✓ correct</Text>}
                {wasSelected && !isCorrect && <Text style={styles.wrongTag}>✗ your answer</Text>}
              </View>
            );
          })}

          {question.explanation ? (
            <View style={styles.explanationBox}>
              <Text style={styles.explanationLabel}>Explanation</Text>
              <Text style={styles.explanationText}>{question.explanation}</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.BG },
  inner: { padding: 20, paddingBottom: 48 },
  centered: { flex: 1, backgroundColor: C.BG, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  errorText: { color: C.DANGER, fontSize: 15, textAlign: 'center' },
  headerCard: {
    backgroundColor: C.ELEVATED,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.BORDER,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  testTitle: { fontSize: 18, fontWeight: '700', color: C.TEXT, marginBottom: 12, textAlign: 'center' },
  score: { fontSize: 52, fontWeight: '800', marginBottom: 8 },
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 12,
  },
  badgeText: { fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  passingNote: { fontSize: 13, color: C.TEXT_SEC, marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 12 },
  statBox: {
    alignItems: 'center',
    backgroundColor: C.BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.BORDER,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 70,
  },
  statValue: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 12, color: C.TEXT_SEC },
  submittedAt: { fontSize: 12, color: C.TEXT_SEC, marginTop: 4 },
  reviewSection: { marginBottom: 24 },
  reviewTitle: { fontSize: 16, fontWeight: '600', color: C.TEXT, marginBottom: 12 },
  reviewCard: {
    backgroundColor: C.ELEVATED,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.BORDER,
    marginBottom: 10,
    overflow: 'hidden',
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 10,
  },
  reviewCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  correctMark: { fontSize: 16, fontWeight: '700' },
  reviewQNum: { fontSize: 12, color: C.TEXT_SEC, fontWeight: '600' },
  reviewQText: { flex: 1, fontSize: 14, color: C.TEXT, lineHeight: 20 },
  expandChevron: { fontSize: 12, color: C.TEXT_SEC, marginLeft: 4 },
  reviewOptionsContainer: { paddingHorizontal: 14, paddingBottom: 14, gap: 6 },
  reviewOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
  },
  reviewOptionNum: { fontSize: 13, fontWeight: '600', width: 20 },
  reviewOptionText: { flex: 1, fontSize: 13 },
  correctTag: { fontSize: 11, color: C.SUCCESS, fontWeight: '600' },
  wrongTag: { fontSize: 11, color: C.DANGER, fontWeight: '600' },
  explanationBox: {
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.3)',
    padding: 12,
    marginTop: 6,
  },
  explanationLabel: { fontSize: 11, color: C.ACCENT_LIGHT, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' as const },
  explanationText: { fontSize: 13, color: C.TEXT_SEC, lineHeight: 18 },
  backBtn: {
    backgroundColor: C.ELEVATED,
    borderWidth: 1,
    borderColor: C.BORDER_STRONG,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  backBtnText: { fontSize: 15, fontWeight: '600', color: C.TEXT },
});
