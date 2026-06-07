import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import type { ScrollView as ScrollViewType } from 'react-native';
import {
  AvailableTest,
  PageResponse,
  ReviewQuestion,
  StudentAPI,
  StudentResult,
  StudentResultsSummary,
  TestResultDto,
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

  const [activeNav, setActiveNav] = useState<'dashboard' | 'available-tests' | 'my-results'>('dashboard');

  const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(null);
  const [modalResult, setModalResult] = useState<TestResultDto | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalExpanded, setModalExpanded] = useState<Set<number>>(new Set());

  const scrollRef = useRef<ScrollViewType>(null);
  const availableTestsY = useRef(0);
  const myResultsY = useRef(0);

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

  useEffect(() => {
    if (!selectedAttemptId) return;
    setModalLoading(true);
    setModalResult(null);
    setModalError('');
    setModalExpanded(new Set());
    StudentAPI.getDetailedResult(selectedAttemptId)
      .then(setModalResult)
      .catch(e => setModalError((e as Error).message || 'Failed to load result.'))
      .finally(() => setModalLoading(false));
  }, [selectedAttemptId]);

  function closeModal() {
    setSelectedAttemptId(null);
    setModalResult(null);
    setModalError('');
  }

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login');
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
                onPress={() => router.push({ pathname: '/(student)/take-test', params: { testId: test.id } })}
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
            onPress={() => router.push({ pathname: '/(student)/take-test', params: { testId: test.id } })}
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
              onPress={() => setSelectedAttemptId(result.attemptId)}
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
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setSelectedAttemptId(result.attemptId)}
          activeOpacity={0.7}
        >
          <Text style={styles.actionBtnText}>Details</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const passRate = summary && summary.totalAttempts > 0
    ? Math.round((summary.passCount / summary.totalAttempts) * 100)
    : 0;

  const modalResultColor = modalResult?.result === 'PASS' ? C.SUCCESS : C.DANGER;
  const modalMins = Math.floor((modalResult?.timeTakenSeconds ?? 0) / 60);
  const modalSecs = (modalResult?.timeTakenSeconds ?? 0) % 60;

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
            <NavItem
              label="Dashboard"
              active={activeNav === 'dashboard'}
              onPress={() => { setActiveNav('dashboard'); scrollRef.current?.scrollTo({ y: 0, animated: true }); }}
            />
            <NavItem
              label="Available Tests"
              active={activeNav === 'available-tests'}
              onPress={() => { setActiveNav('available-tests'); scrollRef.current?.scrollTo({ y: availableTestsY.current, animated: true }); }}
            />
            <NavItem
              label="My Results"
              active={activeNav === 'my-results'}
              onPress={() => { setActiveNav('my-results'); scrollRef.current?.scrollTo({ y: myResultsY.current, animated: true }); }}
            />
          </View>
        )}

        {/* Main content */}
        <ScrollView
          ref={scrollRef}
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
          <View style={styles.tableCard} onLayout={e => { availableTestsY.current = e.nativeEvent.layout.y; }}>
            <View style={[styles.sectionTitleRow, activeNav === 'available-tests' && styles.sectionTitleRowActive]}>
              <Text style={styles.sectionTitle}>Available Tests</Text>
            </View>

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
          <View style={[styles.tableCard, { marginTop: 24 }]} onLayout={e => { myResultsY.current = e.nativeEvent.layout.y; }}>
            <View style={[styles.sectionTitleRow, activeNav === 'my-results' && styles.sectionTitleRowActive]}>
              <Text style={styles.sectionTitle}>My Results</Text>
            </View>

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

      {/* Result details lightbox */}
      <Modal
        visible={selectedAttemptId !== null}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeModal}>
          <TouchableOpacity
            style={[styles.modalCard, isMedium && styles.modalCardDesktop]}
            activeOpacity={1}
            onPress={() => {}}
          >
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                {modalResult?.testTitle ?? 'Result Details'}
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.modalCloseBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Modal body */}
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollInner}
              showsVerticalScrollIndicator={false}
            >
              {modalLoading && (
                <View style={styles.modalCentered}>
                  <ActivityIndicator color={C.ACCENT} size="large" />
                </View>
              )}

              {!!modalError && (
                <View style={styles.modalCentered}>
                  <Text style={styles.modalErrorText}>{modalError}</Text>
                  <TouchableOpacity
                    style={styles.modalRetryBtn}
                    onPress={() => {
                      if (selectedAttemptId) {
                        setModalLoading(true);
                        setModalError('');
                        StudentAPI.getDetailedResult(selectedAttemptId)
                          .then(setModalResult)
                          .catch(e => setModalError((e as Error).message || 'Failed to load result.'))
                          .finally(() => setModalLoading(false));
                      }
                    }}
                  >
                    <Text style={styles.modalRetryBtnText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}

              {modalResult && (
                <>
                  {/* Score hero */}
                  <View style={styles.modalScoreHero}>
                    <Text style={[styles.modalScoreValue, { color: modalResultColor }]}>
                      {modalResult.score.toFixed(1)}%
                    </Text>
                    <View style={[styles.modalResultBadge, { borderColor: modalResultColor, backgroundColor: `${modalResultColor}22` }]}>
                      <Text style={[styles.modalResultBadgeText, { color: modalResultColor }]}>
                        {modalResult.result}
                      </Text>
                    </View>
                    <Text style={styles.modalPassingNote}>
                      Needed {modalResult.passingScore}% to pass
                    </Text>
                  </View>

                  {/* Stats row */}
                  <View style={styles.modalStatsRow}>
                    <ResultStatBox label="Correct" value={String(modalResult.correctAnswers)} color={C.SUCCESS} />
                    <ResultStatBox label="Wrong" value={String(modalResult.wrongAnswers)} color={C.DANGER} />
                    <ResultStatBox label="Skipped" value={String(modalResult.skippedQuestions)} color={C.TEXT_SEC} />
                    {modalResult.timeTakenSeconds != null && (
                      <ResultStatBox
                        label="Time"
                        value={`${String(modalMins).padStart(2, '0')}:${String(modalSecs).padStart(2, '0')}`}
                        color={C.TEXT_SEC}
                      />
                    )}
                  </View>

                  {modalResult.submittedAt && (
                    <Text style={styles.modalSubmittedAt}>
                      Submitted {formatDate(modalResult.submittedAt)}
                    </Text>
                  )}

                  {/* Question review */}
                  {modalResult.reviewQuestions?.length > 0 && (
                    <View style={styles.modalReviewSection}>
                      <Text style={styles.modalReviewTitle}>Question Review</Text>
                      {modalResult.reviewQuestions.map(q => (
                        <ResultReviewCard
                          key={q.id}
                          question={q}
                          expanded={isMedium || modalExpanded.has(q.id)}
                          onToggle={() => {
                            setModalExpanded(prev => {
                              const next = new Set(prev);
                              next.has(q.id) ? next.delete(q.id) : next.add(q.id);
                              return next;
                            });
                          }}
                          isMedium={isMedium}
                        />
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
      accessibilityRole="menuitem"
      accessibilityState={{ selected: !!active }}
      accessibilityLabel={label}
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

function ResultStatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.modalStatBox}>
      <Text style={[styles.modalStatValue, { color }]}>{value}</Text>
      <Text style={styles.modalStatLabel}>{label}</Text>
    </View>
  );
}

function ResultReviewCard({
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
  navItem: {
    paddingHorizontal: 17,
    paddingVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    ...Platform.select({
      web: { outlineStyle: 'none' } as object,
    }),
  },
  navItemActive: {
    backgroundColor: 'rgba(52,211,153,0.10)',
    borderLeftColor: C.SUCCESS,
  },
  navItemFocused: {
    ...Platform.select({
      web: { outlineWidth: 2, outlineStyle: 'solid', outlineColor: C.ACCENT_LIGHT, outlineOffset: -2 } as object,
    }),
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
  sectionTitleRow: {
    borderBottomWidth: 1,
    borderBottomColor: C.BORDER,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  sectionTitleRowActive: {
    backgroundColor: 'rgba(52,211,153,0.07)',
    borderLeftColor: C.SUCCESS,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.TEXT,
    padding: 20,
    paddingLeft: 17,
    paddingBottom: 12,
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

  // Modal / lightbox
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: C.ELEVATED,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.BORDER,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 24px 64px rgba(0,0,0,0.6)' } as object,
      default: { elevation: 20 },
    }),
  },
  modalCardDesktop: {
    maxWidth: 720,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.BORDER,
  },
  modalHeaderTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: C.TEXT,
    marginRight: 12,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: { fontSize: 13, color: C.TEXT_SEC, fontWeight: '600' },
  modalScroll: { flexShrink: 1 },
  modalScrollInner: { padding: 20, paddingBottom: 28 },
  modalCentered: { padding: 40, alignItems: 'center', justifyContent: 'center', gap: 16 },
  modalErrorText: { color: C.DANGER, fontSize: 14, textAlign: 'center' },
  modalRetryBtn: {
    borderWidth: 1,
    borderColor: C.ACCENT,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalRetryBtnText: { color: C.ACCENT_LIGHT, fontSize: 13, fontWeight: '600' },
  modalScoreHero: { alignItems: 'center', marginBottom: 20 },
  modalScoreValue: { fontSize: 52, fontWeight: '800', marginBottom: 8 },
  modalResultBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 8,
  },
  modalResultBadgeText: { fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  modalPassingNote: { fontSize: 13, color: C.TEXT_SEC },
  modalStatsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalStatBox: {
    alignItems: 'center',
    backgroundColor: C.BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.BORDER,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 64,
  },
  modalStatValue: { fontSize: 20, fontWeight: '700', marginBottom: 3 },
  modalStatLabel: { fontSize: 11, color: C.TEXT_SEC },
  modalSubmittedAt: { fontSize: 12, color: C.TEXT_SEC, textAlign: 'center', marginBottom: 20 },
  modalReviewSection: { marginTop: 4 },
  modalReviewTitle: { fontSize: 15, fontWeight: '600', color: C.TEXT, marginBottom: 10 },

  // Review card (shared between lightbox and test-result page)
  reviewCard: {
    backgroundColor: C.BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.BORDER,
    marginBottom: 8,
    overflow: 'hidden',
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    gap: 10,
  },
  reviewCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  correctMark: { fontSize: 15, fontWeight: '700' },
  reviewQNum: { fontSize: 12, color: C.TEXT_SEC, fontWeight: '600' },
  reviewQText: { flex: 1, fontSize: 14, color: C.TEXT, lineHeight: 20 },
  expandChevron: { fontSize: 12, color: C.TEXT_SEC, marginLeft: 4 },
  reviewOptionsContainer: { paddingHorizontal: 12, paddingBottom: 12, gap: 6 },
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
    padding: 10,
    marginTop: 4,
  },
  explanationLabel: {
    fontSize: 11,
    color: C.ACCENT_LIGHT,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase' as const,
  },
  explanationText: { fontSize: 13, color: C.TEXT_SEC, lineHeight: 18 },
});
