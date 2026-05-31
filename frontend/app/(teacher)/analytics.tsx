import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { AnalyticsAPI, PageResponse, StudentAttemptSummary } from '../../src/lib/api';
import { C } from '../../src/lib/theme';

function alertDialog(
  title: string,
  message: string,
  buttons?: { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }[]
) {
  if (Platform.OS !== 'web') {
    const { Alert } = require('react-native');
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

export default function TestAnalytics() {
  const { testId, testTitle } = useLocalSearchParams<{ testId: string; testTitle: string }>();
  const { width } = useWindowDimensions();
  const isMedium = width > 768;

  const [data, setData] = useState<PageResponse<StudentAttemptSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resettingId, setResettingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!testId) return;
    setLoading(true);
    setError('');
    try {
      const result = await AnalyticsAPI.getStudentResults(Number(testId));
      setData(result);
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to load student results');
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    load();
  }, [load]);

  function handleReset(attempt: StudentAttemptSummary) {
    if (!attempt.studentId) return;
    const sid = attempt.studentId;
    alertDialog(
      'Reset Attempt',
      `Reset ${attempt.studentName}'s attempt? They will be able to retake the test.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setResettingId(sid);
            try {
              await AnalyticsAPI.resetStudentAttempt(Number(testId), sid);
              setData(prev =>
                prev
                  ? { ...prev, content: prev.content.filter(a => a.studentId !== sid), totalElements: prev.totalElements - 1 }
                  : prev
              );
            } catch (e: unknown) {
              alertDialog('Error', (e as Error).message || 'Failed to reset attempt');
            } finally {
              setResettingId(null);
            }
          },
        },
      ]
    );
  }

  function renderRow({ item }: { item: StudentAttemptSummary }) {
    const isResetting = resettingId === item.studentId;
    const statusColor = item.status === 'SUBMITTED'
      ? (item.result === 'PASS' ? C.SUCCESS : C.DANGER)
      : item.status === 'IN_PROGRESS' ? C.WARNING : C.TEXT_SEC;

    if (isMedium) {
      return (
        <View style={styles.tableRow}>
          <View style={styles.colName}>
            <Text style={styles.studentName} numberOfLines={1}>{item.studentName}</Text>
            <Text style={styles.studentEmail} numberOfLines={1}>{item.studentEmail}</Text>
          </View>
          <View style={styles.colStatus}>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
          </View>
          <Text style={[styles.td, styles.colScore]}>
            {item.score != null ? `${item.score.toFixed(1)}%` : '—'}
          </Text>
          <View style={styles.colResult}>
            {item.result ? (
              <Text style={[styles.resultBadge, {
                color: item.result === 'PASS' ? C.SUCCESS : C.DANGER,
                borderColor: item.result === 'PASS' ? C.SUCCESS : C.DANGER,
                backgroundColor: item.result === 'PASS' ? `${C.SUCCESS}22` : `${C.DANGER}22`,
              }]}>{item.result}</Text>
            ) : <Text style={styles.td}>—</Text>}
          </View>
          <Text style={[styles.td, styles.colViolations]}>
            {item.violationCount ?? 0}{item.hasCriticalViolations ? ' ⚠' : ''}
          </Text>
          <View style={styles.colAction}>
            {isResetting ? (
              <ActivityIndicator size="small" color={C.DANGER} />
            ) : item.studentId ? (
              <TouchableOpacity style={styles.resetBtn} onPress={() => handleReset(item)} activeOpacity={0.7}>
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.guestLabel}>Guest</Text>
            )}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.studentName} numberOfLines={1}>{item.studentName}</Text>
            <Text style={styles.studentEmail} numberOfLines={1}>{item.studentEmail}</Text>
          </View>
          <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.metaText}>
            Score: {item.score != null ? `${item.score.toFixed(1)}%` : '—'}
          </Text>
          {item.result && (
            <Text style={[styles.resultBadge, {
              color: item.result === 'PASS' ? C.SUCCESS : C.DANGER,
              borderColor: item.result === 'PASS' ? C.SUCCESS : C.DANGER,
              backgroundColor: item.result === 'PASS' ? `${C.SUCCESS}22` : `${C.DANGER}22`,
            }]}>{item.result}</Text>
          )}
          <Text style={styles.metaText}>Violations: {item.violationCount ?? 0}</Text>
        </View>
        {item.studentId && (
          <View style={styles.cardActions}>
            {isResetting ? (
              <ActivityIndicator size="small" color={C.DANGER} />
            ) : (
              <TouchableOpacity style={styles.resetBtn} onPress={() => handleReset(item)} activeOpacity={0.7}>
                <Text style={styles.resetBtnText}>Reset Attempt</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {testTitle ?? `Test #${testId}`}
          </Text>
          <Text style={styles.headerSub}>Student Attempts</Text>
        </View>
        <TouchableOpacity onPress={load} style={styles.refreshBtn} activeOpacity={0.7}>
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        {data && (
          <View style={styles.summaryRow}>
            <SummaryCard value={String(data.totalElements)} label="Total Attempts" />
            <SummaryCard
              value={String(data.content.filter(a => a.status === 'IN_PROGRESS').length)}
              label="In Progress"
              color={C.WARNING}
            />
            <SummaryCard
              value={String(data.content.filter(a => a.result === 'PASS').length)}
              label="Passed"
              color={C.SUCCESS}
            />
            <SummaryCard
              value={String(data.content.filter(a => a.result === 'FAIL').length)}
              label="Failed"
              color={C.DANGER}
            />
          </View>
        )}

        {/* Error */}
        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Table */}
        <View style={styles.tableCard}>
          <Text style={styles.sectionTitle}>Students</Text>

          {isMedium && (
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
              <Text style={[styles.th, styles.colName]}>STUDENT</Text>
              <Text style={[styles.th, styles.colStatus]}>STATUS</Text>
              <Text style={[styles.th, styles.colScore]}>SCORE</Text>
              <Text style={[styles.th, styles.colResult]}>RESULT</Text>
              <Text style={[styles.th, styles.colViolations]}>VIOLATIONS</Text>
              <Text style={[styles.th, styles.colAction]}>ACTION</Text>
            </View>
          )}

          {loading ? (
            <View style={styles.centeredState}>
              <ActivityIndicator color={C.ACCENT} />
            </View>
          ) : (data?.content.length ?? 0) === 0 && !error ? (
            <View style={styles.centeredState}>
              <Text style={styles.emptyText}>No attempts yet for this test.</Text>
            </View>
          ) : (
            <FlatList
              data={data?.content ?? []}
              keyExtractor={item => String(item.attemptId)}
              renderItem={renderRow}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.rowDivider} />}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function SummaryCard({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={[styles.summaryValue, { color: color ?? C.ACCENT }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const COL_NAME = 200;
const COL_STATUS = 110;
const COL_SCORE = 80;
const COL_RESULT = 80;
const COL_VIOLATIONS = 100;
const COL_ACTION = 90;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 60,
    backgroundColor: C.ELEVATED,
    borderBottomWidth: 1,
    borderBottomColor: C.BORDER,
    gap: 12,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.4)' } as object,
      default: { elevation: 4 },
    }),
  },
  backBtn: { paddingVertical: 6, paddingRight: 4 },
  backBtnText: { fontSize: 14, color: C.ACCENT_LIGHT, fontWeight: '500' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.TEXT },
  headerSub: { fontSize: 12, color: C.TEXT_SEC, marginTop: 1 },
  refreshBtn: {
    borderWidth: 1,
    borderColor: C.BORDER_STRONG,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  refreshBtnText: { fontSize: 12, color: C.TEXT_SEC },
  content: { padding: 24, paddingBottom: 48 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 24, flexWrap: 'wrap' },
  summaryCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: C.ELEVATED,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.BORDER,
    padding: 16,
    alignItems: 'flex-start',
  },
  summaryValue: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  summaryLabel: { fontSize: 12, color: C.TEXT_SEC },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderWidth: 1,
    borderColor: C.DANGER,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  errorText: { color: C.DANGER, fontSize: 14 },
  retryText: { color: C.ACCENT_LIGHT, fontSize: 14, fontWeight: '600' },
  tableCard: {
    backgroundColor: C.ELEVATED,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.BORDER,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.TEXT,
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.BORDER,
  },
  tableHeaderRow: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 1,
    borderBottomColor: C.BORDER,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  th: { fontSize: 11, fontWeight: '700', color: C.TEXT_SEC, letterSpacing: 0.6, textTransform: 'uppercase' as const },
  td: { fontSize: 13, color: C.TEXT_SEC },
  rowDivider: { height: 1, backgroundColor: C.BORDER, marginHorizontal: 20 },
  colName: { width: COL_NAME, flexShrink: 1 },
  colStatus: { width: COL_STATUS },
  colScore: { width: COL_SCORE },
  colResult: { width: COL_RESULT },
  colViolations: { width: COL_VIOLATIONS },
  colAction: { flex: 1 },
  studentName: { fontSize: 14, color: C.TEXT, fontWeight: '500' },
  studentEmail: { fontSize: 12, color: C.TEXT_SEC, marginTop: 2 },
  statusText: { fontSize: 12, fontWeight: '600' },
  resultBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  resetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: C.DANGER,
  },
  resetBtnText: { fontSize: 12, fontWeight: '500', color: C.DANGER },
  guestLabel: { fontSize: 12, color: C.TEXT_SEC, fontStyle: 'italic' },
  card: { padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' },
  metaText: { fontSize: 13, color: C.TEXT_SEC },
  cardActions: { flexDirection: 'row', gap: 8 },
  centeredState: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: C.TEXT_SEC, textAlign: 'center' },
});
