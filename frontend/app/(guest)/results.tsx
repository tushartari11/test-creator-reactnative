import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TestResultDTO } from '../../src/lib/api';
import { C } from '../../src/lib/theme';

export default function GuestResults() {
  const { resultData } = useLocalSearchParams<{ resultData: string }>();

  const result: TestResultDTO | null = (() => {
    try { return resultData ? JSON.parse(resultData) : null; } catch { return null; }
  })();

  if (!result) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Result data not found.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(guest)' as any)}>
          <Text style={styles.btnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPassed = result.result === 'PASS';
  const resultColor = isPassed ? C.SUCCESS : C.DANGER;

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.testTitle}>{result.testTitle}</Text>

        <Text style={[styles.score, { color: resultColor }]}>{result.score.toFixed(1)}%</Text>

        <View style={[styles.badge, { borderColor: resultColor, backgroundColor: `${resultColor}22` }]}>
          <Text style={[styles.badgeText, { color: resultColor }]}>
            {isPassed ? '🎉 PASSED' : 'FAILED'}
          </Text>
        </View>

        <Text style={styles.passingNote}>Passing score: {result.passingScore}%</Text>

        <View style={styles.statsRow}>
          <StatBox label="Correct" value={String(result.correctAnswers)} color={C.SUCCESS} />
          <StatBox label="Wrong" value={String(result.wrongAnswers)} color={C.DANGER} />
          <StatBox label="Skipped" value={String(result.skippedQuestions)} color={C.TEXT_SEC} />
        </View>

        <TouchableOpacity
          style={[styles.btn, { marginBottom: 12 }]}
          onPress={() => router.replace('/(guest)' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>Take Another Test</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.replace('/')}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.BG,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  centered: { flex: 1, backgroundColor: C.BG, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  errorText: { color: C.DANGER, fontSize: 15, textAlign: 'center' },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: C.ELEVATED,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.BORDER,
    padding: 32,
    alignItems: 'center',
  },
  testTitle: { fontSize: 18, fontWeight: '700', color: C.TEXT, textAlign: 'center', marginBottom: 20 },
  score: { fontSize: 56, fontWeight: '800', marginBottom: 12 },
  badge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 12,
  },
  badgeText: { fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  passingNote: { fontSize: 13, color: C.TEXT_SEC, marginBottom: 24 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28, justifyContent: 'center' },
  statBox: {
    alignItems: 'center',
    backgroundColor: C.BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.BORDER,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 75,
  },
  statValue: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 12, color: C.TEXT_SEC },
  btn: {
    backgroundColor: C.ACCENT,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 28,
    alignItems: 'center',
    width: '100%',
  },
  btnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: C.BORDER_STRONG,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: 'center',
    width: '100%',
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '500', color: C.TEXT_SEC },
});
