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
import { StatusBadge } from '../../src/components/StatusBadge';
import { TeacherTestAPI, TestListItem } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { C } from '../../src/lib/theme';
import { formatDate } from '../../src/lib/utils';

function alertDialog(
  title: string,
  message: string,
  buttons?: { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }[]
) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons as Parameters<typeof Alert.alert>[2]);
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

export default function TeacherDashboard() {
  const { width } = useWindowDimensions();
  const isMedium = width > 768;
  const { user, logout } = useAuth();

  const [tests, setTests] = useState<TestListItem[]>([]);
  const [totalTests, setTotalTests] = useState(0);
  const [publishedCount, setPublishedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [allPage, publishedPage] = await Promise.all([
        TeacherTestAPI.getTests(0, 10),
        TeacherTestAPI.getTests(0, 1, 'PUBLISHED'),
      ]);
      setTests(allPage.content);
      setTotalTests(allPage.totalElements);
      setPublishedCount(publishedPage.totalElements);
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to load tests');
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

  async function handlePublish(test: TestListItem) {
    const isRepublish = test.status === 'ARCHIVED';
    alertDialog(
      isRepublish ? 'Re-publish Test' : 'Publish Test',
      `${isRepublish ? 'Re-publish' : 'Publish'} "${test.title}"? Students will be able to take it.`,
      [
      { text: 'Cancel', style: 'cancel' },
      {
        text: isRepublish ? 'Re-publish' : 'Publish',
        onPress: async () => {
          setActionLoading(test.id);
          try {
            const updated = await TeacherTestAPI.publishTest(test.id);
            setTests(prev => prev.map(t => (t.id === test.id ? { ...t, status: updated.status } : t)));
            setPublishedCount(c => c + 1);
          } catch (e: unknown) {
            alertDialog('Error', (e as Error).message || 'Failed to publish test');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  }

  async function handleArchive(test: TestListItem) {
    alertDialog('Archive Test', `Archive "${test.title}"? Students won't be able to take it.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(test.id);
          try {
            const updated = await TeacherTestAPI.archiveTest(test.id);
            setTests(prev => prev.map(t => (t.id === test.id ? { ...t, status: updated.status } : t)));
            setPublishedCount(c => Math.max(0, c - 1));
          } catch (e: unknown) {
            alertDialog('Error', (e as Error).message || 'Failed to archive test');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  }

  async function handleDelete(test: TestListItem) {
    alertDialog('Delete Test', `Delete "${test.title}"? This action cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(test.id);
          try {
            await TeacherTestAPI.deleteTest(test.id);
            setTests(prev => prev.filter(t => t.id !== test.id));
            setTotalTests(c => c - 1);
            if (test.status === 'PUBLISHED') setPublishedCount(c => Math.max(0, c - 1));
          } catch (e: unknown) {
            alertDialog('Error', (e as Error).message || 'Failed to delete test');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  }

  function comingSoon(feature: string) {
    alertDialog('Coming Soon', `${feature} will be available in a future update.`);
  }

  function renderTestRow({ item: test }: { item: TestListItem }) {
    const isActing = actionLoading === test.id;
    if (isMedium) {
      return (
        <View style={styles.tableRow}>
          <View style={styles.colTitle}>
            <Text style={styles.testTitle} numberOfLines={2}>{test.title}</Text>
          </View>
          <View style={styles.colStatus}>
            <StatusBadge status={test.status} />
          </View>
          <Text style={[styles.td, styles.colQuestions]}>{test.totalQuestions}</Text>
          <Text style={[styles.td, styles.colDuration]}>
            {test.durationMinutes ? `${test.durationMinutes} min` : '—'}
          </Text>
          <Text style={[styles.td, styles.colCode]} numberOfLines={1}>
            {test.accessCode ?? '—'}
          </Text>
          <Text style={[styles.td, styles.colCreated]}>{formatDate(test.createdAt)}</Text>
          <View style={[styles.colActions, styles.actionsRow]}>
            {isActing ? (
              <ActivityIndicator size="small" color={C.ACCENT} />
            ) : (
              <>
                <ActionBtn label="Edit" onPress={() => router.push({ pathname: '/(teacher)/edit-test', params: { id: test.id } })} />
                {test.status === 'DRAFT' && (
                  <ActionBtn label="Publish" filled color={C.SUCCESS} onPress={() => handlePublish(test)} />
                )}
                {test.status === 'PUBLISHED' && (
                  <ActionBtn label="Archive" color={C.WARNING} onPress={() => handleArchive(test)} />
                )}
                {test.status === 'ARCHIVED' && (
                  <ActionBtn label="Re-publish" filled color={C.SUCCESS} onPress={() => handlePublish(test)} />
                )}
                <ActionBtn label="Analytics" onPress={() => comingSoon('Analytics')} />
                <ActionBtn label="Delete" filled color={C.DANGER} onPress={() => handleDelete(test)} />
              </>
            )}
          </View>
        </View>
      );
    }

    // Card layout for small screens
    return (
      <View style={styles.testCard}>
        <View style={styles.testCardHeader}>
          <Text style={styles.testTitle} numberOfLines={2}>{test.title}</Text>
          <StatusBadge status={test.status} />
        </View>
        <View style={styles.testCardMeta}>
          <Text style={styles.metaText}>{test.totalQuestions} questions</Text>
          {!!test.durationMinutes && <Text style={styles.metaText}>{test.durationMinutes} min</Text>}
          <Text style={styles.metaText}>{formatDate(test.createdAt)}</Text>
        </View>
        {test.accessCode && (
          <Text style={styles.accessCode}>{test.accessCode}</Text>
        )}
        <View style={styles.testCardActions}>
          {isActing ? (
            <ActivityIndicator size="small" color={C.ACCENT} />
          ) : (
            <>
              <ActionBtn label="Edit" onPress={() => router.push({ pathname: '/(teacher)/edit-test', params: { id: test.id } })} />
              {test.status === 'DRAFT' && (
                <ActionBtn label="Publish" filled color={C.SUCCESS} onPress={() => handlePublish(test)} />
              )}
              {test.status === 'PUBLISHED' && (
                <ActionBtn label="Archive" color={C.WARNING} onPress={() => handleArchive(test)} />
              )}
              {test.status === 'ARCHIVED' && (
                <ActionBtn label="Re-publish" filled color={C.SUCCESS} onPress={() => handlePublish(test)} />
              )}
              <ActionBtn label="Delete" filled color={C.DANGER} onPress={() => handleDelete(test)} />
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root} testID="teacher-dashboard">
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.logo} testID="teacher-dashboard-logo">Test Creator</Text>
        <View style={styles.topBarRight}>
          {isMedium && (
            <TouchableOpacity onPress={() => {}} style={styles.topBarLink}>
              <Text style={styles.topBarLinkText}>Dashboard</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.topBarUser} testID="teacher-dashboard-user-name">{user?.name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText} testID="teacher-dashboard-role-badge">TEACHER</Text>
          </View>
          <TouchableOpacity testID="teacher-dashboard-logout" onPress={handleLogout} style={styles.logoutBtn}>
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
            <NavItem label="+ Create Test" onPress={() => router.push('/(teacher)/create-test')} />
            <NavItem label="Analytics" onPress={() => comingSoon('Analytics')} />
          </View>
        )}

        {/* Main content */}
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
        >
          {/* Page header */}
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>My Tests</Text>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => router.push('/(teacher)/create-test')}
              activeOpacity={0.85}
            >
              <Text style={styles.createBtnText}>+ Create New Test</Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatCard value={loading ? '…' : String(totalTests)} label="Total Tests" />
            <StatCard value={loading ? '…' : String(publishedCount)} label="Published" />
            <StatCard value="—" label="Total Attempts" />
          </View>

          {/* Error */}
          {!!error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={loadDashboard}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tests table */}
          <View style={styles.tableCard}>
            <Text style={styles.sectionTitle}>Test List</Text>

            {isMedium && (
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <Text style={[styles.th, styles.colTitle]}>TITLE</Text>
                <Text style={[styles.th, styles.colStatus]}>STATUS</Text>
                <Text style={[styles.th, styles.colQuestions]}>QUESTIONS</Text>
                <Text style={[styles.th, styles.colDuration]}>DURATION</Text>
                <Text style={[styles.th, styles.colCode]}>ACCESS CODE</Text>
                <Text style={[styles.th, styles.colCreated]}>CREATED</Text>
                <Text style={[styles.th, styles.colActions]}>ACTIONS</Text>
              </View>
            )}

            {loading ? (
              <View style={styles.centeredState}>
                <ActivityIndicator color={C.ACCENT} />
              </View>
            ) : tests.length === 0 && !error ? (
              <View style={styles.centeredState}>
                <Text style={styles.emptyText}>
                  No tests yet.{' '}
                  <Text
                    style={styles.emptyLink}
                    onPress={() => router.push('/(teacher)/create-test')}
                  >
                    Create your first test
                  </Text>
                </Text>
              </View>
            ) : (
              <FlatList
                data={tests}
                keyExtractor={item => String(item.id)}
                renderItem={renderTestRow}
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

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function NavItem({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
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

function ActionBtn({
  label,
  color,
  filled,
  onPress,
}: {
  label: string;
  color?: string;
  filled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionBtn,
        filled && color ? { backgroundColor: color, borderColor: color } : null,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.actionBtnText,
        filled ? { color: '#fff' } : color ? { color } : null,
      ]}>{label}</Text>
    </TouchableOpacity>
  );
}

const COL_TITLE = 200;
const COL_STATUS = 100;
const COL_QUESTIONS = 80;
const COL_DURATION = 90;
const COL_CODE = 130;
const COL_CREATED = 110;
const COL_ACTIONS = 240;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.BG,
  },
  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 0,
    height: 60,
    backgroundColor: C.ELEVATED,
    borderBottomWidth: 1,
    borderBottomColor: C.BORDER,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.4)' } as object,
      default: { elevation: 4 },
    }),
  },
  logo: {
    fontSize: 18,
    fontWeight: '700',
    color: C.TEXT,
  },
  topBarRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  topBarLink: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  topBarLinkText: {
    fontSize: 14,
    color: C.TEXT_SEC,
  },
  topBarUser: {
    fontSize: 14,
    color: C.TEXT,
    fontWeight: '500',
  },
  roleBadge: {
    backgroundColor: 'rgba(99,102,241,0.18)',
    borderWidth: 1,
    borderColor: C.ACCENT,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.ACCENT_LIGHT,
    letterSpacing: 0.5,
  },
  logoutBtn: {
    borderWidth: 1,
    borderColor: C.BORDER_STRONG,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  logoutBtnText: {
    fontSize: 13,
    color: C.TEXT,
    fontWeight: '500',
  },
  // Body layout
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  // Sidebar
  sidebar: {
    width: 220,
    backgroundColor: C.ELEVATED,
    borderRightWidth: 1,
    borderRightColor: C.BORDER,
    paddingTop: 16,
    paddingBottom: 24,
  },
  navItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 0,
  },
  navItemActive: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderLeftWidth: 3,
    borderLeftColor: C.ACCENT,
  },
  navItemText: {
    fontSize: 14,
    color: C.TEXT_SEC,
    fontWeight: '500',
  },
  navItemTextActive: {
    color: C.TEXT,
  },
  // Content
  contentScroll: {
    flex: 1,
  },
  contentInner: {
    padding: 28,
    paddingBottom: 48,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: C.TEXT,
  },
  createBtn: {
    backgroundColor: C.ACCENT,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(99,102,241,0.4)' } as object,
      default: { elevation: 4 },
    }),
  },
  createBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.ELEVATED,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.BORDER,
    padding: 20,
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: C.ACCENT,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 13,
    color: C.TEXT_SEC,
  },
  // Error banner
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
  errorText: {
    color: C.DANGER,
    fontSize: 14,
  },
  retryText: {
    color: C.ACCENT_LIGHT,
    fontSize: 14,
    fontWeight: '600',
  },
  // Table card
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
  // Table layout (medium+ screens)
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
  td: {
    fontSize: 13,
    color: C.TEXT_SEC,
  },
  testTitle: {
    fontSize: 14,
    color: C.TEXT,
    fontWeight: '500',
  },
  rowDivider: {
    height: 1,
    backgroundColor: C.BORDER,
    marginHorizontal: 20,
  },
  // Column widths
  colTitle: {
    width: COL_TITLE,
    flexShrink: 1,
  },
  colStatus: {
    width: COL_STATUS,
  },
  colQuestions: {
    width: COL_QUESTIONS,
  },
  colDuration: {
    width: COL_DURATION,
  },
  colCode: {
    width: COL_CODE,
    fontFamily: Platform.select({ web: 'monospace', default: undefined }),
    fontSize: 12,
    color: C.TEXT_SEC,
  },
  colCreated: {
    width: COL_CREATED,
  },
  colActions: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: C.BORDER_STRONG,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: C.TEXT_SEC,
  },
  // Card layout (small screens)
  testCard: {
    padding: 16,
  },
  testCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  testCardMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 13,
    color: C.TEXT_SEC,
  },
  accessCode: {
    fontSize: 12,
    color: C.TEXT_SEC,
    fontFamily: Platform.select({ web: 'monospace', default: undefined }),
    marginBottom: 12,
  },
  testCardActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  // States
  centeredState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: C.TEXT_SEC,
    textAlign: 'center',
  },
  emptyLink: {
    color: C.ACCENT_LIGHT,
    fontWeight: '500',
  },
});
