import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  AvailableTest,
  PageResponse,
  StudentAPI,
  StudentResult,
  StudentResultsSummary,
} from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { C } from '../../src/lib/theme';
import { formatDate } from '../../src/lib/utils';

export default function StudentDashboard() {
  const { width } = useWindowDimensions();
  const isMedium = width > 768;
  const { user, logout } = useAuth();

  const [availableTests, setAvailableTests] = useState<AvailableTest[]>([]);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [summary, setSummary] = useState<StudentResultsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [testsPage, results] = await Promise.all([
        StudentAPI.getAvailableTests(0, 20),
        StudentAPI.getResults(),
      ]);
      setAvailableTests(testsPage.content);
      setTotalAvailable(testsPage.totalElements);
      setSummary(results);
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  function comingSoon(feature: string) {
    Alert.alert('Coming Soon', `${feature} will be available in a future update.`);
  }

  function renderAvailableTest({ item: test }: { item: AvailableTest }) {
    if (isMedium) {
      return (
        <View style={styles.tableRow}>
          <View style={styles.colTitle}>
            <Text style={styles.testTitle} numberOfLines={2}>{test.title}</Text>
            {test.description ? (
              <Text style={styles.testDesc} numberOfLines={1}>{test.description}</Text>
            ) : null}
          </View>
          <Text style={[styles.td, styles.colTeacher]} numberOfLines={1}>{test.teacherName}</Text>
          <Text style={[styles.td, styles.colQuestions]}>{test.totalQuestions}</Text>
          <Text style={[styles.td, styles.colDuration]}>{test.durationMinutes} min</Text>
          <Text style={[styles.td, styles.colDate]}>{formatDate(test.testDate)}</Text>
          <View style={[styles.colAction]}>
            {test.alreadyAttempted ? (
              <Text style={styles.attemptedLabel}>Attempted</Text>
            ) : (
              <TouchableOpacity
                style={styles.takeBtn}
                onPress={() => comingSoon('Take Test')}
                activeOpacity={0.8}
              >
                <Text style={styles.takeBtnText}>Take Test</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.testCard}>
        <View style={styles.testCardHeader}>
          <Text style={styles.testTitle} numberOfLines={2}>{test.title}</Text>
          {test.alreadyAttempted && (
            <Text style={styles.attemptedLabel}>Attempted</Text>
          )}
        </View>
        <Text style={styles.metaText}>By {test.teacherName}</Text>
        <View style={styles.testCardMeta}>
          <Text style={styles.metaText}>{test.totalQuestions} questions</Text>
          <Text style={styles.metaText}>{test.durationMinutes} min</Text>
          {test.testDate && <Text style={styles.metaText}>{formatDate(test.testDate)}</Text>}
        </View>
        {!test.alreadyAttempted && (
          <TouchableOpacity
            style={styles.takeBtn}
            onPress={() => comingSoon('Take Test')}
            activeOpacity={0.8}
          >
            <Text style={styles.takeBtnText}>Take Test</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function renderResult({ item: result }: { item: StudentResult }) {
    const isPassed = result.result === 'PASS';
    if (isMedium) {
      return (
        <View style={styles.tableRow}>
          <View style={styles.colTitle}>
            <Text style={styles.testTitle} numberOfLines={2}>{result.testTitle}</Text>
          </View>
          <Text style={[styles.td, styles.colScore]}>{result.score.toFixed(1)}%</Text>
          <View style={styles.colResult}>
            <ResultBadge result={result.result} />
          </View>
          <Text style={[styles.td, styles.colDate]}>{formatDate(result.submittedAt)}</Text>
          <View style={styles.colAction}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => comingSoon('View Result Details')}
              activeOpacity={0.7}
            >
              <Text style={styles.actionBtnText}>Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.testCard}>
        <View style={styles.testCardHeader}>
          <Text style={styles.testTitle} numberOfLines={2}>{result.testTitle}</Text>
          <ResultBadge result={result.result} />
        </View>
        <View style={styles.testCardMeta}>
          <Text style={[styles.metaText, { color: isPassed ? C.SUCCESS : C.DANGER, fontWeight: '600' }]}>
            {result.score.toFixed(1)}%
          </Text>
          <Text style={styles.metaText}>{formatDate(result.submittedAt)}</Text>
        </View>
      </View>
    );
  }

  const passRate = summary && summary.totalAttempts > 0
    ? Math.round((summary.passCount / summary.totalAttempts) * 100)
    : 0;

  return (
    <View style={styles.root}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.logo}>Test Creator</Text>
        <View style={styles.topBarRight}>
          <Text style={styles.topBarUser}>{user?.name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>STUDENT</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Sidebar */}
        {isMedium && (
          <View style={styles.sidebar}>
            <NavItem label="Dashboard" active />
            <NavItem label="Available Tests" onPress={() => {}} />
            <NavItem label="My Results" onPress={() => {}} />
          </View>
        )}

        {/* Main content */}
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Student Dashboard</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatCard
              value={loading ? '…' : String(totalAvailable)}
              label="Available Tests"
              accent={C.ACCENT}
            />
            <StatCard
              value={loading ? '…' : String(summary?.totalAttempts ?? 0)}
              label="Attempts"
              accent={C.ACCENT}
            />
            <StatCard
              value={loading ? '…' : `${passRate}%`}
              label="Pass Rate"
              accent={passRate >= 50 ? C.SUCCESS : C.DANGER}
            />
            <StatCard
              value={loading ? '…' : summary?.totalAttempts ? `${(summary.averageScore ?? 0).toFixed(1)}%` : '—'}
              label="Avg Score"
              accent={C.ACCENT}
            />
          </View>

          {/* Error banner */}
          {!!error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={loadDashboard}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Available Tests */}
          <View style={styles.tableCard}>
            <Text style={styles.sectionTitle}>Available Tests</Text>

            {isMedium && (
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <Text style={[styles.th, styles.colTitle]}>TITLE</Text>
                <Text style={[styles.th, styles.colTeacher]}>TEACHER</Text>
                <Text style={[styles.th, styles.colQuestions]}>QUESTIONS</Text>
                <Text style={[styles.th, styles.colDuration]}>DURATION</Text>
                <Text style={[styles.th, styles.colDate]}>DATE</Text>
                <Text style={[styles.th, styles.colAction]}>ACTION</Text>
              </View>
            )}

            {loading ? (
              <View style={styles.centeredState}>
                <ActivityIndicator color={C.ACCENT} />
              </View>
            ) : availableTests.length === 0 && !error ? (
              <View style={styles.centeredState}>
                <Text style={styles.emptyText}>No tests available right now.</Text>
              </View>
            ) : (
              <FlatList
                data={availableTests}
                keyExtractor={item => String(item.id)}
                renderItem={renderAvailableTest}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.rowDivider} />}
              />
            )}
          </View>

          {/* Past Results */}
          <View style={[styles.tableCard, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>My Results</Text>

            {isMedium && (summary?.results?.length ?? 0) > 0 && (
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <Text style={[styles.th, styles.colTitle]}>TEST</Text>
                <Text style={[styles.th, styles.colScore]}>SCORE</Text>
                <Text style={[styles.th, styles.colResult]}>RESULT</Text>
                <Text style={[styles.th, styles.colDate]}>DATE</Text>
                <Text style={[styles.th, styles.colAction]}>ACTION</Text>
              </View>
            )}

            {loading ? (
              <View style={styles.centeredState}>
                <ActivityIndicator color={C.ACCENT} />
              </View>
            ) : (summary?.results?.length ?? 0) === 0 && !error ? (
              <View style={styles.centeredState}>
                <Text style={styles.emptyText}>No attempts yet. Take a test to see your results here.</Text>
              </View>
            ) : (
              <FlatList
                data={summary?.results ?? []}
                keyExtractor={item => String(item.attemptId)}
                renderItem={renderResult}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.rowDivider} />}
              />
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function StatCard({ value, label, accent }: { value: string; label: string; accent: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function NavItem({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.navItem, active && styles.navItemActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.navItemText, active && styles.navItemTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ResultBadge({ result }: { result: 'PASS' | 'FAIL' }) {
  const color = result === 'PASS' ? C.SUCCESS : C.DANGER;
  return (
    <Text style={[styles.resultBadge, { color, borderColor: color, backgroundColor: `${color}22` }]}>
      {result}
    </Text>
  );
}

const COL_TITLE = 220;
const COL_TEACHER = 140;
const COL_QUESTIONS = 90;
const COL_DURATION = 90;
const COL_DATE = 120;
const COL_ACTION = 120;
const COL_SCORE = 90;
const COL_RESULT = 90;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.BG },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: 60,
    backgroundColor: C.ELEVATED,
    borderBottomWidth: 1,
    borderBottomColor: C.BORDER,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.4)' } as object,
      default: { elevation: 4 },
    }),
  },
  logo: { fontSize: 18, fontWeight: '700', color: C.TEXT },
  topBarRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  topBarUser: { fontSize: 14, color: C.TEXT, fontWeight: '500' },
  roleBadge: {
    backgroundColor: 'rgba(52,211,153,0.15)',
    borderWidth: 1,
    borderColor: C.SUCCESS,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.SUCCESS,
    letterSpacing: 0.5,
  },
  logoutBtn: {
    borderWidth: 1,
    borderColor: C.BORDER_STRONG,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  logoutBtnText: { fontSize: 13, color: C.TEXT, fontWeight: '500' },
  body: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 220,
    backgroundColor: C.ELEVATED,
    borderRightWidth: 1,
    borderRightColor: C.BORDER,
    paddingTop: 16,
    paddingBottom: 24,
  },
  navItem: { paddingHorizontal: 20, paddingVertical: 12 },
  navItemActive: {
    backgroundColor: 'rgba(52,211,153,0.10)',
    borderLeftWidth: 3,
    borderLeftColor: C.SUCCESS,
  },
  navItemText: { fontSize: 14, color: C.TEXT_SEC, fontWeight: '500' },
  navItemTextActive: { color: C.TEXT },
  contentScroll: { flex: 1 },
  contentInner: { padding: 28, paddingBottom: 48 },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  pageTitle: { fontSize: 24, fontWeight: '700', color: C.TEXT },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 28, flexWrap: 'wrap' },
  statCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: C.ELEVATED,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.BORDER,
    padding: 20,
    alignItems: 'flex-start',
  },
  statValue: { fontSize: 32, fontWeight: '700', marginBottom: 6 },
  statLabel: { fontSize: 13, color: C.TEXT_SEC },
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
  th: {
    fontSize: 11,
    fontWeight: '700',
    color: C.TEXT_SEC,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
  td: { fontSize: 13, color: C.TEXT_SEC },
  testTitle: { fontSize: 14, color: C.TEXT, fontWeight: '500' },
  testDesc: { fontSize: 12, color: C.TEXT_SEC, marginTop: 2 },
  rowDivider: { height: 1, backgroundColor: C.BORDER, marginHorizontal: 20 },
  colTitle: { width: COL_TITLE, flexShrink: 1 },
  colTeacher: { width: COL_TEACHER },
  colQuestions: { width: COL_QUESTIONS },
  colDuration: { width: COL_DURATION },
  colDate: { width: COL_DATE },
  colAction: { flex: 1, alignItems: 'flex-start' },
  colScore: { width: COL_SCORE },
  colResult: { width: COL_RESULT },
  takeBtn: {
    backgroundColor: C.SUCCESS,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  takeBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  attemptedLabel: {
    fontSize: 12,
    color: C.TEXT_SEC,
    fontWeight: '500',
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: C.BORDER_STRONG,
  },
  actionBtnText: { fontSize: 12, fontWeight: '500', color: C.TEXT_SEC },
  testCard: { padding: 16 },
  testCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 12,
  },
  testCardMeta: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  metaText: { fontSize: 13, color: C.TEXT_SEC },
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
  centeredState: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: C.TEXT_SEC, textAlign: 'center' },
});
