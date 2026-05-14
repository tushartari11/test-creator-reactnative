import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  CreateTestPayload,
  QuestionForm,
  TeacherTestAPI,
  TestDetail,
} from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { C } from '../../src/lib/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'details' | 'questions' | 'settings';

type QuestionDraft = QuestionForm & { _key: string };

type ModalState = {
  open: boolean;
  idx: number;
  questionText: string;
  explanation: string;
  correctOptionNumber: number;
  options: [string, string, string];
};

const BLANK_MODAL = (): ModalState => ({
  open: false, idx: -1,
  questionText: '', explanation: '',
  correctOptionNumber: 0,
  options: ['', '', ''],
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EditTestScreen() {
  const { width } = useWindowDimensions();
  const isMedium = width > 768;
  const { user, logout } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const testId = params.id ? parseInt(params.id, 10) : null;

  const [test, setTest] = useState<TestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('details');

  // Test Details tab state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [passingScore, setPassingScore] = useState('');
  const [maxAttempts, setMaxAttempts] = useState('1');
  const [accessCode, setAccessCode] = useState('');
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [detailsSuccess, setDetailsSuccess] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  // Questions tab state
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [questionsSaving, setQuestionsSaving] = useState(false);
  const [questionsError, setQuestionsError] = useState('');
  const [questionsSuccess, setQuestionsSuccess] = useState(false);
  const [modal, setModal] = useState<ModalState>(BLANK_MODAL());
  const [modalError, setModalError] = useState('');

  // Settings tab state
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  const loadTest = useCallback(async () => {
    if (!testId) { setLoadError('Invalid test ID'); setLoading(false); return; }
    setLoading(true);
    setLoadError('');
    try {
      const data = await TeacherTestAPI.getTestDetail(testId);
      setTest(data);
      setTitle(data.title);
      setDescription(data.description ?? '');
      setDuration(String(data.durationMinutes));
      setPassingScore(String(data.passingScore));
      setAccessCode(data.accessCode ?? '');
      setStartTime(data.testDate ?? '');
      setQuestions(data.questions.map((q, i) => ({
        ...q,
        options: q.options.map(o => o.optionText) as unknown as QuestionForm['options'],
        _key: String(i),
      })));
    } catch (e: unknown) {
      setLoadError((e as Error).message || 'Failed to load test');
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => { loadTest(); }, [loadTest]);

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  function buildPayload(overrideQuestions?: QuestionDraft[]): CreateTestPayload {
    const qs = overrideQuestions ?? questions;
    return {
      title: title.trim(),
      description: description.trim(),
      totalQuestions: qs.length,
      passingScore: parseInt(passingScore, 10) || 60,
      durationMinutes: parseInt(duration, 10) || 60,
      testDate: startTime || new Date().toISOString(),
      questions: qs.map((q, i): QuestionForm => ({
        questionNumber: i + 1,
        questionText: q.questionText.trim(),
        explanation: q.explanation.trim(),
        correctOptionNumber: q.correctOptionNumber,
        options: (q.options as unknown as string[]).map((opt: string, oi: number) => ({
          optionNumber: oi + 1,
          optionText: opt.trim(),
        })),
      })),
    };
  }

  // ── Details tab ──

  async function handleSaveDetails() {
    setDetailsError('');
    setDetailsSuccess(false);
    if (!title.trim()) { setDetailsError('Title is required'); return; }
    if (title.trim().length < 5) { setDetailsError('Title must be at least 5 characters'); return; }
    if (!description.trim()) { setDetailsError('Description is required'); return; }
    const d = parseInt(duration, 10);
    const ps = parseInt(passingScore, 10);
    if (isNaN(d) || d < 5 || d > 240) { setDetailsError('Duration must be 5–240 minutes'); return; }
    if (isNaN(ps) || ps < 0 || ps > 100) { setDetailsError('Passing score must be 0–100'); return; }

    setDetailsSaving(true);
    try {
      await TeacherTestAPI.updateTest(testId!, buildPayload());
      setDetailsSuccess(true);
      setTimeout(() => setDetailsSuccess(false), 3000);
    } catch (e: unknown) {
      setDetailsError((e as Error).message || 'Failed to save changes');
    } finally {
      setDetailsSaving(false);
    }
  }

  async function handleGenerateCode() {
    setGeneratingCode(true);
    try {
      const updated = await TeacherTestAPI.generateAccessCode(testId!);
      setAccessCode(updated.accessCode ?? '');
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed to generate access code');
    } finally {
      setGeneratingCode(false);
    }
  }

  // ── Questions tab ──

  function openEditModal(idx: number) {
    const q = questions[idx];
    const opts = q.options as unknown as string[];
    setModal({
      open: true, idx,
      questionText: q.questionText,
      explanation: q.explanation,
      correctOptionNumber: q.correctOptionNumber,
      options: [opts[0] ?? '', opts[1] ?? '', opts[2] ?? ''],
    });
    setModalError('');
  }

  function openAddModal() {
    setModal({
      open: true, idx: -1,
      questionText: '', explanation: '',
      correctOptionNumber: 0,
      options: ['', '', ''],
    });
    setModalError('');
  }

  function handleModalSave() {
    setModalError('');
    if (!modal.questionText.trim()) { setModalError('Question text is required'); return; }
    if (!modal.explanation.trim()) { setModalError('Explanation is required'); return; }
    if (modal.correctOptionNumber === 0) { setModalError('Select the correct answer'); return; }
    if (modal.options.some(o => !o.trim())) { setModalError('All 3 option texts are required'); return; }

    const saved: QuestionDraft = {
      questionNumber: modal.idx >= 0 ? questions[modal.idx].questionNumber : questions.length + 1,
      questionText: modal.questionText.trim(),
      explanation: modal.explanation.trim(),
      correctOptionNumber: modal.correctOptionNumber,
      options: modal.options.map((opt, oi) => ({ optionNumber: oi + 1, optionText: opt.trim() })) as unknown as QuestionForm['options'],
      _key: modal.idx >= 0 ? questions[modal.idx]._key : String(Date.now()),
    };

    if (modal.idx >= 0) {
      setQuestions(prev => prev.map((q, i) => i === modal.idx ? saved : q));
    } else {
      setQuestions(prev => [...prev, saved]);
    }
    setModal(BLANK_MODAL());
  }

  function handleDeleteQuestion(idx: number) {
    Alert.alert('Delete Question', 'Remove this question from the test?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => setQuestions(prev =>
          prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, questionNumber: i + 1 }))
        ),
      },
    ]);
  }

  async function handleSaveQuestions() {
    setQuestionsError('');
    setQuestionsSuccess(false);
    if (questions.length === 0) { setQuestionsError('Add at least one question'); return; }
    for (const q of questions) {
      if (!q.questionText.trim() || !q.explanation.trim() || q.correctOptionNumber === 0) {
        setQuestionsError('All questions must be complete');
        return;
      }
    }
    setQuestionsSaving(true);
    try {
      await TeacherTestAPI.updateTest(testId!, buildPayload());
      setQuestionsSuccess(true);
      setTimeout(() => setQuestionsSuccess(false), 3000);
    } catch (e: unknown) {
      setQuestionsError((e as Error).message || 'Failed to save questions');
    } finally {
      setQuestionsSaving(false);
    }
  }

  // ── Settings tab ──

  async function handleSaveSettings() {
    setSettingsError('');
    setSettingsSuccess(false);
    setSettingsSaving(true);
    try {
      await TeacherTestAPI.updateTest(testId!, buildPayload());
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (e: unknown) {
      setSettingsError((e as Error).message || 'Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  }

  async function handlePublish() {
    Alert.alert('Publish Test', 'Make this test available to students?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Publish',
        onPress: async () => {
          try {
            await TeacherTestAPI.publishTest(testId!);
            setTest(prev => prev ? { ...prev, status: 'PUBLISHED' } : prev);
          } catch (e: unknown) {
            Alert.alert('Error', (e as Error).message || 'Failed to publish');
          }
        },
      },
    ]);
  }

  async function handleDelete() {
    Alert.alert('Delete Test', 'This action cannot be undone. Delete this test?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await TeacherTestAPI.deleteTest(testId!);
            router.replace('/(teacher)/dashboard');
          } catch (e: unknown) {
            Alert.alert('Error', (e as Error).message || 'Failed to delete');
          }
        },
      },
    ]);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const isDraft = test?.status === 'DRAFT';

  return (
    <View style={styles.root}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.logo}>Test Creator</Text>
        <View style={styles.topBarRight}>
          {isMedium && (
            <TouchableOpacity onPress={() => router.replace('/(teacher)/dashboard')} style={styles.topBarLink}>
              <Text style={styles.topBarLinkText}>Dashboard</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.topBarUser}>{user?.name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>TEACHER</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.body}>
        {/* Sidebar */}
        {isMedium && (
          <View style={styles.sidebar}>
            <NavItem label="Dashboard" onPress={() => router.replace('/(teacher)/dashboard')} />
            <NavItem label="+ Create Test" onPress={() => router.push('/(teacher)/create-test')} />
            <NavItem label="Analytics" onPress={() => Alert.alert('Coming Soon', 'Analytics coming soon.')} />
          </View>
        )}

        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Page header */}
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle} numberOfLines={2}>
              {loading ? 'Loading…' : `Edit: ${test?.title ?? ''}`}
            </Text>
            <View style={styles.pageHeaderRight}>
              {test && (
                <View style={[styles.statusBadge, { borderColor: statusColor(test.status), backgroundColor: `${statusColor(test.status)}22` }]}>
                  <Text style={[styles.statusBadgeText, { color: statusColor(test.status) }]}>{test.status}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => router.replace('/(teacher)/dashboard')}
                activeOpacity={0.8}
              >
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={styles.centeredState}>
              <ActivityIndicator color={C.ACCENT} size="large" />
            </View>
          ) : loadError ? (
            <View style={styles.centeredState}>
              <Text style={styles.errorText}>{loadError}</Text>
              <TouchableOpacity onPress={loadTest} style={[styles.outlineBtn, { marginTop: 12 }]}>
                <Text style={styles.outlineBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Tab bar */}
              <View style={styles.tabBar}>
                {(['details', 'questions', 'settings'] as Tab[]).map(tab => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.tab, activeTab === tab && styles.tabActive]}
                    onPress={() => setActiveTab(tab)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                      {tab === 'details' ? 'Test Details' : tab === 'questions' ? 'Questions' : 'Settings'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tab content */}
              {activeTab === 'details' && (
                <DetailsTab
                  title={title} setTitle={setTitle}
                  description={description} setDescription={setDescription}
                  duration={duration} setDuration={setDuration}
                  passingScore={passingScore} setPassingScore={setPassingScore}
                  maxAttempts={maxAttempts} setMaxAttempts={setMaxAttempts}
                  accessCode={accessCode}
                  generatingCode={generatingCode}
                  onGenerateCode={handleGenerateCode}
                  saving={detailsSaving}
                  error={detailsError}
                  success={detailsSuccess}
                  onSave={handleSaveDetails}
                />
              )}

              {activeTab === 'questions' && (
                <QuestionsTab
                  questions={questions}
                  saving={questionsSaving}
                  error={questionsError}
                  success={questionsSuccess}
                  onAdd={openAddModal}
                  onEdit={openEditModal}
                  onDelete={handleDeleteQuestion}
                  onSave={handleSaveQuestions}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsTab
                  startTime={startTime} setStartTime={setStartTime}
                  endTime={endTime} setEndTime={setEndTime}
                  shuffleQuestions={shuffleQuestions} setShuffleQuestions={setShuffleQuestions}
                  showResults={showResults} setShowResults={setShowResults}
                  saving={settingsSaving}
                  error={settingsError}
                  success={settingsSuccess}
                  isDraft={isDraft}
                  onSave={handleSaveSettings}
                  onPublish={handlePublish}
                  onDelete={handleDelete}
                />
              )}
            </>
          )}
        </ScrollView>
      </View>

      {/* Edit Question Modal (overlay) */}
      {modal.open && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modal.idx >= 0 ? 'Edit Question' : 'Add Question'}
              </Text>
              <TouchableOpacity onPress={() => setModal(BLANK_MODAL())} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Field label="Question Text *">
                <TextInput
                  style={[styles.input, styles.textarea]}
                  placeholder="Enter your question..."
                  placeholderTextColor={C.TEXT_SEC}
                  value={modal.questionText}
                  onChangeText={v => setModal(m => ({ ...m, questionText: v }))}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </Field>

              <Field label="Points">
                <TextInput
                  style={[styles.input, { width: 80 }]}
                  value="1"
                  editable={false}
                  keyboardType="number-pad"
                />
              </Field>

              <Text style={styles.optionsLabel}>Options (select correct answer)</Text>
              {modal.options.map((opt, oi) => (
                <View key={oi} style={styles.optionRow}>
                  <TouchableOpacity
                    style={styles.radio}
                    onPress={() => setModal(m => ({ ...m, correctOptionNumber: oi + 1 }))}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <View style={[
                      styles.radioOuter,
                      modal.correctOptionNumber === oi + 1 && styles.radioOuterActive,
                    ]}>
                      {modal.correctOptionNumber === oi + 1 && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.input, styles.optionInput]}
                    placeholder={`Option ${oi + 1}`}
                    placeholderTextColor={C.TEXT_SEC}
                    value={opt}
                    onChangeText={v => setModal(m => {
                      const opts: [string, string, string] = [...m.options] as [string, string, string];
                      opts[oi] = v;
                      return { ...m, options: opts };
                    })}
                  />
                  <TouchableOpacity
                    style={[styles.optionRemoveBtn, { opacity: 0.4 }]}
                    disabled
                  >
                    <Text style={styles.optionRemoveBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {!!modalError && <Text style={styles.errorText}>{modalError}</Text>}

              <Field label="Explanation (shown after submission)">
                <TextInput
                  style={[styles.input, styles.textarea]}
                  placeholder="Why is this the correct answer?"
                  placeholderTextColor={C.TEXT_SEC}
                  value={modal.explanation}
                  onChangeText={v => setModal(m => ({ ...m, explanation: v }))}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </Field>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setModal(BLANK_MODAL())}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleModalSave}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Save Question</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Tab Components ───────────────────────────────────────────────────────────

function DetailsTab({
  title, setTitle, description, setDescription,
  duration, setDuration, passingScore, setPassingScore,
  maxAttempts, setMaxAttempts, accessCode, generatingCode,
  onGenerateCode, saving, error, success, onSave,
}: {
  title: string; setTitle: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  duration: string; setDuration: (v: string) => void;
  passingScore: string; setPassingScore: (v: string) => void;
  maxAttempts: string; setMaxAttempts: (v: string) => void;
  accessCode: string;
  generatingCode: boolean;
  onGenerateCode: () => void;
  saving: boolean;
  error: string;
  success: boolean;
  onSave: () => void;
}) {
  return (
    <View style={styles.tabContent}>
      <Field label="Test Title *">
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Test title"
          placeholderTextColor={C.TEXT_SEC}
        />
      </Field>

      <Field label="Description">
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Test description"
          placeholderTextColor={C.TEXT_SEC}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </Field>

      <View style={styles.row3}>
        <View style={styles.rowField}>
          <Field label="Duration (minutes) *">
            <TextInput style={styles.input} value={duration} onChangeText={setDuration} keyboardType="number-pad" />
          </Field>
        </View>
        <View style={styles.rowField}>
          <Field label="Passing Score (%)">
            <TextInput style={styles.input} value={passingScore} onChangeText={setPassingScore} keyboardType="number-pad" />
          </Field>
        </View>
        <View style={styles.rowField}>
          <Field label="Max Attempts">
            <TextInput style={styles.input} value={maxAttempts} onChangeText={setMaxAttempts} keyboardType="number-pad" />
          </Field>
        </View>
      </View>

      <Field label="Access Code">
        <View style={styles.codeRow}>
          <TextInput
            style={[styles.input, styles.codeInput]}
            value={accessCode}
            editable={false}
            placeholder="—"
            placeholderTextColor={C.TEXT_SEC}
          />
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={onGenerateCode}
            disabled={generatingCode}
            activeOpacity={0.85}
          >
            {generatingCode
              ? <ActivityIndicator size="small" color={C.ACCENT} />
              : <Text style={styles.outlineBtnText}>Generate</Text>
            }
          </TouchableOpacity>
        </View>
        <Text style={styles.hintText}>Share this code with students for guest access</Text>
      </Field>

      {!!error && <Text style={styles.errorText}>{error}</Text>}
      {success && <Text style={styles.successText}>Changes saved successfully!</Text>}

      <TouchableOpacity
        style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
        onPress={onSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.primaryBtnText}>Save Changes</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

function QuestionsTab({
  questions, saving, error, success,
  onAdd, onEdit, onDelete, onSave,
}: {
  questions: QuestionDraft[];
  saving: boolean;
  error: string;
  success: boolean;
  onAdd: () => void;
  onEdit: (idx: number) => void;
  onDelete: (idx: number) => void;
  onSave: () => void;
}) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.qtabHeader}>
        <Text style={styles.qtabTitle}>Questions ({questions.length})</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={onAdd} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>+ Add Question</Text>
        </TouchableOpacity>
      </View>

      {questions.length === 0 ? (
        <View style={styles.centeredState}>
          <Text style={styles.emptyText}>No questions yet. Add your first question.</Text>
        </View>
      ) : (
        questions.map((q, idx) => {
          const opts = q.options as unknown as { optionText: string; optionNumber: number }[];
          return (
            <View key={q._key} style={styles.qListCard}>
              <View style={styles.qListTop}>
                <Text style={styles.qListText} numberOfLines={2}>
                  Q{idx + 1}. {q.questionText}
                </Text>
                <View style={styles.qListRight}>
                  <View style={styles.ptsBadge}>
                    <Text style={styles.ptsBadgeText}>1 PTS</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.qEditBtn}
                    onPress={() => onEdit(idx)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.qEditBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.qDeleteBtn}
                    onPress={() => onDelete(idx)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.qDeleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.qOptRow}>
                {opts.map((opt, oi) => {
                  const isCorrect = q.correctOptionNumber === oi + 1;
                  return (
                    <View key={oi} style={styles.qOptItem}>
                      <Text style={isCorrect ? styles.qOptCorrect : styles.qOptWrong}>
                        {isCorrect ? '✓ ' : '○ '}
                      </Text>
                      <Text style={[styles.qOptText, isCorrect && styles.qOptTextCorrect]} numberOfLines={1}>
                        {opt.optionText}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })
      )}

      {!!error && <Text style={styles.errorText}>{error}</Text>}
      {success && <Text style={styles.successText}>Questions saved!</Text>}

      <TouchableOpacity
        style={[styles.primaryBtn, { marginTop: 16 }, saving && styles.primaryBtnDisabled]}
        onPress={onSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.primaryBtnText}>Save Changes</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

function SettingsTab({
  startTime, setStartTime, endTime, setEndTime,
  shuffleQuestions, setShuffleQuestions,
  showResults, setShowResults,
  saving, error, success, isDraft,
  onSave, onPublish, onDelete,
}: {
  startTime: string; setStartTime: (v: string) => void;
  endTime: string; setEndTime: (v: string) => void;
  shuffleQuestions: boolean; setShuffleQuestions: (v: boolean) => void;
  showResults: boolean; setShowResults: (v: boolean) => void;
  saving: boolean; error: string; success: boolean;
  isDraft: boolean | undefined;
  onSave: () => void;
  onPublish: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.settingsCard}>
        <View style={styles.row2}>
          <View style={styles.rowField}>
            <Field label="Start Time">
              <TextInput
                style={styles.input}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="YYYY-MM-DDTHH:mm:ss"
                placeholderTextColor={C.TEXT_SEC}
              />
            </Field>
          </View>
          <View style={styles.rowField}>
            <Field label="End Time">
              <TextInput
                style={styles.input}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="YYYY-MM-DDTHH:mm:ss"
                placeholderTextColor={C.TEXT_SEC}
              />
            </Field>
          </View>
        </View>

        <Checkbox
          label="Shuffle Questions"
          checked={shuffleQuestions}
          onToggle={() => setShuffleQuestions(!shuffleQuestions)}
        />
        <Checkbox
          label="Show Results to Students"
          checked={showResults}
          onToggle={() => setShowResults(!showResults)}
        />

        {!!error && <Text style={styles.errorText}>{error}</Text>}
        {success && <Text style={styles.successText}>Settings saved!</Text>}

        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 16 }, saving && styles.primaryBtnDisabled]}
          onPress={onSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.primaryBtnText}>Save Settings</Text>
          }
        </TouchableOpacity>
      </View>

      <View style={styles.actionsCard}>
        <Text style={styles.actionsTitle}>Test Actions</Text>
        <View style={styles.actionsRow}>
          {isDraft && (
            <TouchableOpacity style={styles.publishBtn} onPress={onPublish} activeOpacity={0.85}>
              <Text style={styles.publishBtnText}>Publish Test</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.85}>
            <Text style={styles.deleteBtnText}>Delete Test</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Small components ─────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
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

function Checkbox({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity style={styles.checkRow} onPress={onToggle} activeOpacity={0.7}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function statusColor(status: string): string {
  if (status === 'PUBLISHED') return C.SUCCESS;
  if (status === 'ARCHIVED') return C.WARNING;
  return C.TEXT_SEC;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.BG },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, height: 60,
    backgroundColor: C.ELEVATED,
    borderBottomWidth: 1, borderBottomColor: C.BORDER,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.4)' } as object,
      default: { elevation: 4 },
    }),
  },
  logo: { fontSize: 18, fontWeight: '700', color: C.TEXT },
  topBarRight: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'flex-end', gap: 12,
  },
  topBarLink: { paddingHorizontal: 8, paddingVertical: 4 },
  topBarLinkText: { fontSize: 14, color: C.TEXT_SEC },
  topBarUser: { fontSize: 14, color: C.TEXT, fontWeight: '500' },
  roleBadge: {
    backgroundColor: 'rgba(99,102,241,0.18)',
    borderWidth: 1, borderColor: C.ACCENT,
    borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: C.ACCENT_LIGHT, letterSpacing: 0.5 },
  logoutBtn: {
    borderWidth: 1, borderColor: C.BORDER_STRONG,
    borderRadius: 6, paddingHorizontal: 14, paddingVertical: 6,
  },
  logoutBtnText: { fontSize: 13, color: C.TEXT, fontWeight: '500' },
  body: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 220, backgroundColor: C.ELEVATED,
    borderRightWidth: 1, borderRightColor: C.BORDER,
    paddingTop: 16, paddingBottom: 24,
  },
  navItem: { paddingHorizontal: 20, paddingVertical: 12 },
  navItemActive: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderLeftWidth: 3, borderLeftColor: C.ACCENT,
  },
  navItemText: { fontSize: 14, color: C.TEXT_SEC, fontWeight: '500' },
  navItemTextActive: { color: C.TEXT },
  contentScroll: { flex: 1 },
  contentInner: { padding: 28, paddingBottom: 60 },

  pageHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 20,
    flexWrap: 'wrap', gap: 12,
  },
  pageTitle: { fontSize: 22, fontWeight: '700', color: C.TEXT, flex: 1 },
  pageHeaderRight: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  statusBadge: {
    borderWidth: 1, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  backBtn: {
    borderWidth: 1, borderColor: C.BORDER_STRONG,
    borderRadius: 6, paddingHorizontal: 14, paddingVertical: 8,
  },
  backBtnText: { fontSize: 13, color: C.TEXT, fontWeight: '500' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: C.BORDER,
    marginBottom: 20,
  },
  tab: {
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: C.ACCENT },
  tabText: { fontSize: 14, color: C.TEXT_SEC, fontWeight: '500' },
  tabTextActive: { color: C.ACCENT_LIGHT, fontWeight: '600' },

  tabContent: {
    backgroundColor: C.ELEVATED,
    borderRadius: 12, borderWidth: 1, borderColor: C.BORDER,
    padding: 24,
  },

  // Fields
  field: { marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: C.TEXT, marginBottom: 8 },
  input: {
    backgroundColor: C.SURFACE,
    borderWidth: 1, borderColor: C.BORDER,
    borderRadius: 8, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, color: C.TEXT,
  },
  textarea: { minHeight: 80, paddingTop: 10 },
  row3: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', marginBottom: 4 },
  row2: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  row4: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', marginBottom: 4 },
  rowField: { flex: 1, minWidth: 120 },
  codeRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  codeInput: { flex: 1 },
  hintText: { fontSize: 12, color: C.ACCENT_LIGHT, marginTop: 6 },
  errorText: { color: C.DANGER, fontSize: 13, marginBottom: 8 },
  successText: { color: C.SUCCESS, fontSize: 13, marginBottom: 8 },

  // Buttons
  primaryBtn: {
    backgroundColor: C.ACCENT, borderRadius: 8,
    paddingHorizontal: 20, paddingVertical: 12,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  secondaryBtn: {
    backgroundColor: C.SURFACE, borderRadius: 8,
    borderWidth: 1, borderColor: C.BORDER_STRONG,
    paddingHorizontal: 20, paddingVertical: 12,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  secondaryBtnText: { color: C.TEXT, fontSize: 14, fontWeight: '500' },
  outlineBtn: {
    borderWidth: 1, borderColor: C.ACCENT,
    borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  outlineBtnText: { color: C.ACCENT_LIGHT, fontSize: 13, fontWeight: '500' },

  // Questions tab
  qtabHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  qtabTitle: { fontSize: 18, fontWeight: '600', color: C.TEXT },
  qListCard: {
    borderWidth: 1, borderColor: C.BORDER,
    borderRadius: 8, padding: 16, marginBottom: 10,
    backgroundColor: C.SURFACE,
  },
  qListTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 10, gap: 12,
  },
  qListText: { fontSize: 14, color: C.TEXT, fontWeight: '500', flex: 1 },
  qListRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ptsBadge: {
    borderWidth: 1, borderColor: C.BORDER_STRONG,
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  ptsBadgeText: { fontSize: 10, color: C.TEXT_SEC, fontWeight: '600' },
  qEditBtn: {
    borderWidth: 1, borderColor: C.ACCENT,
    borderRadius: 5, paddingHorizontal: 10, paddingVertical: 5,
  },
  qEditBtnText: { fontSize: 12, color: C.ACCENT_LIGHT, fontWeight: '500' },
  qDeleteBtn: {
    backgroundColor: C.DANGER,
    borderRadius: 5, paddingHorizontal: 10, paddingVertical: 5,
  },
  qDeleteBtnText: { fontSize: 12, color: '#fff', fontWeight: '500' },
  qOptRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  qOptItem: { flexDirection: 'row', alignItems: 'center', maxWidth: '33%' },
  qOptCorrect: { fontSize: 13, color: C.SUCCESS, fontWeight: '700' },
  qOptWrong: { fontSize: 13, color: C.TEXT_SEC },
  qOptText: { fontSize: 13, color: C.TEXT_SEC },
  qOptTextCorrect: { color: C.SUCCESS, fontWeight: '600' },

  // Settings tab
  settingsCard: {
    marginBottom: 20,
  },
  actionsCard: {
    marginTop: 8,
    backgroundColor: C.ELEVATED,
    borderRadius: 12, borderWidth: 1, borderColor: C.BORDER,
    padding: 20,
  },
  actionsTitle: { fontSize: 16, fontWeight: '600', color: C.TEXT, marginBottom: 16 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  publishBtn: {
    backgroundColor: C.SUCCESS, borderRadius: 8,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  publishBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  deleteBtn: {
    backgroundColor: C.DANGER, borderRadius: 8,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  deleteBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Checkbox
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  checkbox: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 1.5, borderColor: C.BORDER_STRONG,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: C.ACCENT, borderColor: C.ACCENT },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  checkLabel: { fontSize: 14, color: C.TEXT },

  // Options in modal
  optionsLabel: { fontSize: 13, color: C.TEXT, fontWeight: '500', marginBottom: 10 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  radio: { padding: 4 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: C.BORDER_STRONG,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: C.ACCENT },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.ACCENT },
  optionInput: { flex: 1 },
  optionRemoveBtn: {
    backgroundColor: C.DANGER, borderRadius: 5,
    paddingHorizontal: 8, paddingVertical: 6,
  },
  optionRemoveBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Modal
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 100,
    ...Platform.select({ web: { position: 'fixed' } as object, default: {} }),
  },
  modalCard: {
    backgroundColor: C.ELEVATED,
    borderRadius: 16, borderWidth: 1, borderColor: C.BORDER,
    width: '90%', maxWidth: 520,
    maxHeight: '85%',
    padding: 24,
    ...Platform.select({
      web: { boxShadow: '0 24px 64px rgba(0,0,0,0.7)' } as object,
      default: { elevation: 20 },
    }),
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.TEXT },
  modalClose: { fontSize: 18, color: C.TEXT_SEC, fontWeight: '700' },
  modalFooter: {
    flexDirection: 'row', justifyContent: 'flex-end',
    gap: 12, marginTop: 16,
  },

  // States
  centeredState: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: C.TEXT_SEC, textAlign: 'center' },
});
