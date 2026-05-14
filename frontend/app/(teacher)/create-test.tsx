import { router } from 'expo-router';
import { useRef, useState } from 'react';
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
import { CreateTestPayload, QuestionForm, TeacherTestAPI } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { C } from '../../src/lib/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type QuestionDraft = {
  questionText: string;
  explanation: string;
  correctOptionNumber: number;   // 1 | 2 | 3, 0 = unset
  options: [string, string, string];
};

const blankQuestion = (): QuestionDraft => ({
  questionText: '',
  explanation: '',
  correctOptionNumber: 0,
  options: ['', '', ''],
});

function isComplete(q: QuestionDraft): boolean {
  return (
    q.questionText.trim().length > 0 &&
    q.explanation.trim().length > 0 &&
    q.correctOptionNumber > 0 &&
    q.options.every(o => o.trim().length > 0)
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreateTestScreen() {
  const { width } = useWindowDimensions();
  const isMedium = width > 768;
  const { user, logout } = useAuth();

  // Step 1 state
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [numQuestions, setNumQuestions] = useState('10');
  const [duration, setDuration] = useState('60');
  const [passingScore, setPassingScore] = useState('60');
  const [maxAttempts, setMaxAttempts] = useState('1');
  const [step1Error, setStep1Error] = useState('');

  // Step 2 state
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number>(0);
  const [qErrors, setQErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const scrollRef = useRef<ScrollView>(null);

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  function handleNextStep() {
    setStep1Error('');
    const n = parseInt(numQuestions, 10);
    const d = parseInt(duration, 10);
    const ps = parseInt(passingScore, 10);
    if (!title.trim()) { setStep1Error('Test title is required'); return; }
    if (title.trim().length < 5) { setStep1Error('Title must be at least 5 characters'); return; }
    if (!description.trim()) { setStep1Error('Description is required'); return; }
    if (isNaN(n) || n < 1 || n > 100) { setStep1Error('Number of questions must be 1–100'); return; }
    if (isNaN(d) || d < 5 || d > 240) { setStep1Error('Duration must be 5–240 minutes'); return; }
    if (isNaN(ps) || ps < 0 || ps > 100) { setStep1Error('Passing score must be 0–100'); return; }
    const blanks = Array.from({ length: n }, blankQuestion);
    setQuestions(blanks);
    setQErrors(Array(n).fill(''));
    setExpandedIdx(0);
    setStep(2);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function updateQuestion(idx: number, patch: Partial<QuestionDraft>) {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q));
  }

  function updateOption(qIdx: number, optIdx: number, text: string) {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const opts: [string, string, string] = [...q.options] as [string, string, string];
      opts[optIdx] = text;
      return { ...q, options: opts };
    }));
  }

  function validateAndAdvance(idx: number) {
    const q = questions[idx];
    const newErrors = [...qErrors];
    if (!isComplete(q)) {
      newErrors[idx] = 'Fill question, all 3 options, select correct answer, and add explanation.';
      setQErrors(newErrors);
      return;
    }
    newErrors[idx] = '';
    setQErrors(newErrors);
    if (idx < questions.length - 1) {
      setExpandedIdx(idx + 1);
    }
  }

  function toggleExpand(idx: number) {
    setExpandedIdx(prev => prev === idx ? -1 : idx);
  }

  async function handleCreate() {
    // Validate all questions
    const errors = questions.map(q =>
      isComplete(q) ? '' : 'Fill question, all 3 options, select correct answer, and add explanation.'
    );
    setQErrors(errors);
    if (errors.some(e => e)) {
      const firstBad = errors.findIndex(e => e);
      setExpandedIdx(firstBad);
      Alert.alert('Incomplete Questions', 'Please complete all questions before creating the test.');
      return;
    }

    const payload: CreateTestPayload = {
      title: title.trim(),
      description: description.trim(),
      totalQuestions: questions.length,
      passingScore: parseInt(passingScore, 10),
      durationMinutes: parseInt(duration, 10),
      testDate: new Date().toISOString(),
      questions: questions.map((q, i): QuestionForm => ({
        questionNumber: i + 1,
        questionText: q.questionText.trim(),
        explanation: q.explanation.trim(),
        correctOptionNumber: q.correctOptionNumber,
        options: q.options.map((opt, oi) => ({ optionNumber: oi + 1, optionText: opt.trim() })),
      })),
    };

    setSubmitting(true);
    setSubmitError('');
    try {
      await TeacherTestAPI.createTest(payload);
      router.replace('/(teacher)/dashboard');
    } catch (e: unknown) {
      setSubmitError((e as Error).message || 'Failed to create test. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const allComplete = questions.length > 0 && questions.every(isComplete);

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
            <NavItem label="+ Create Test" active />
            <NavItem label="Analytics" onPress={() => Alert.alert('Coming Soon', 'Analytics will be available soon.')} />
          </View>
        )}

        <ScrollView
          ref={scrollRef}
          style={styles.contentScroll}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Page header */}
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Create New Test</Text>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.replace('/(teacher)/dashboard')}
              activeOpacity={0.8}
            >
              <Text style={styles.backBtnText}>← Back to Dashboard</Text>
            </TouchableOpacity>
          </View>

          {/* Step indicator */}
          <View style={styles.stepRow}>
            <StepBadge num={1} label="Test Details" active={step === 1} done={step === 2} />
            <View style={styles.stepLine} />
            <StepBadge num={2} label="Add Questions" active={step === 2} done={false} />
          </View>

          <View style={styles.formCard}>
            {step === 1 ? (
              <Step1Form
                title={title} setTitle={setTitle}
                description={description} setDescription={setDescription}
                numQuestions={numQuestions} setNumQuestions={setNumQuestions}
                duration={duration} setDuration={setDuration}
                passingScore={passingScore} setPassingScore={setPassingScore}
                maxAttempts={maxAttempts} setMaxAttempts={setMaxAttempts}
                error={step1Error}
                onNext={handleNextStep}
                onCancel={() => router.replace('/(teacher)/dashboard')}
              />
            ) : (
              <Step2Form
                testTitle={title}
                numQuestions={parseInt(numQuestions, 10)}
                questions={questions}
                expandedIdx={expandedIdx}
                qErrors={qErrors}
                submitting={submitting}
                submitError={submitError}
                allComplete={allComplete}
                onToggle={toggleExpand}
                onUpdate={updateQuestion}
                onUpdateOption={updateOption}
                onSaveNext={validateAndAdvance}
                onBack={() => setStep(1)}
                onCreate={handleCreate}
                onEditDetails={() => setStep(1)}
              />
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────

function Step1Form({
  title, setTitle, description, setDescription,
  numQuestions, setNumQuestions, duration, setDuration,
  passingScore, setPassingScore, maxAttempts, setMaxAttempts,
  error, onNext, onCancel,
}: {
  title: string; setTitle: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  numQuestions: string; setNumQuestions: (v: string) => void;
  duration: string; setDuration: (v: string) => void;
  passingScore: string; setPassingScore: (v: string) => void;
  maxAttempts: string; setMaxAttempts: (v: string) => void;
  error: string;
  onNext: () => void;
  onCancel: () => void;
}) {
  return (
    <View>
      <Field label="Test Title *">
        <TextInput
          style={styles.input}
          placeholder="e.g. Midterm Exam - Chapter 1-5"
          placeholderTextColor={C.TEXT_SEC}
          value={title}
          onChangeText={setTitle}
          returnKeyType="next"
        />
      </Field>

      <Field label="Description">
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Brief description of the test..."
          placeholderTextColor={C.TEXT_SEC}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </Field>

      <View style={styles.row4}>
        <View style={styles.rowField}>
          <Field label="Number of Questions *">
            <TextInput
              style={styles.input}
              value={numQuestions}
              onChangeText={setNumQuestions}
              keyboardType="number-pad"
            />
          </Field>
        </View>
        <View style={styles.rowField}>
          <Field label="Duration (minutes) *">
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              keyboardType="number-pad"
            />
          </Field>
        </View>
        <View style={styles.rowField}>
          <Field label="Passing Score (%)">
            <TextInput
              style={styles.input}
              value={passingScore}
              onChangeText={setPassingScore}
              keyboardType="number-pad"
            />
          </Field>
        </View>
        <View style={styles.rowField}>
          <Field label="Max Attempts">
            <TextInput
              style={styles.input}
              value={maxAttempts}
              onChangeText={setMaxAttempts}
              keyboardType="number-pad"
            />
          </Field>
        </View>
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.primaryBtn} onPress={onNext} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Next: Add Questions →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onCancel} activeOpacity={0.85}>
          <Text style={styles.secondaryBtnText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.orText}>or</Text>
        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={() => Alert.alert('Coming Soon', 'CSV import will be available in a future update.')}
          activeOpacity={0.85}
        >
          <Text style={styles.outlineBtnText}>Import Questions from CSV</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────

function Step2Form({
  testTitle, numQuestions, questions, expandedIdx, qErrors,
  submitting, submitError, allComplete,
  onToggle, onUpdate, onUpdateOption, onSaveNext, onBack, onCreate, onEditDetails,
}: {
  testTitle: string;
  numQuestions: number;
  questions: QuestionDraft[];
  expandedIdx: number;
  qErrors: string[];
  submitting: boolean;
  submitError: string;
  allComplete: boolean;
  onToggle: (idx: number) => void;
  onUpdate: (idx: number, patch: Partial<QuestionDraft>) => void;
  onUpdateOption: (qIdx: number, optIdx: number, text: string) => void;
  onSaveNext: (idx: number) => void;
  onBack: () => void;
  onCreate: () => void;
  onEditDetails: () => void;
}) {
  return (
    <View>
      <View style={styles.step2Header}>
        <View>
          <Text style={styles.step2Title}>{testTitle}</Text>
          <Text style={styles.step2Sub}>
            Enter questions and select the correct answer for each. {numQuestions} questions
          </Text>
        </View>
        <TouchableOpacity style={styles.outlineBtn} onPress={onEditDetails} activeOpacity={0.85}>
          <Text style={styles.outlineBtnText}>← Edit Test Details</Text>
        </TouchableOpacity>
      </View>

      {questions.map((q, idx) => {
        const done = isComplete(q);
        const isOpen = expandedIdx === idx;
        return (
          <View key={idx} style={styles.qCard}>
            {/* Collapsed header */}
            <TouchableOpacity
              style={styles.qCardHeader}
              onPress={() => onToggle(idx)}
              activeOpacity={0.8}
            >
              <View style={styles.qCardHeaderLeft}>
                <Text style={done ? styles.qBadgeDone : styles.qBadgeEmpty}>
                  {done ? '✓' : '○'}
                </Text>
                <Text style={styles.qCardLabel} numberOfLines={1}>
                  {`Q${idx + 1}.`}{' '}
                  {done
                    ? q.questionText.slice(0, 55) + (q.questionText.length > 55 ? '…' : '')
                    : isOpen ? `Editing…` : 'Click to fill'}
                </Text>
              </View>
              <Text style={styles.qToggle}>{isOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {/* Expanded body */}
            {isOpen && (
              <View style={styles.qCardBody}>
                <Text style={styles.qHeading}>Question {idx + 1}</Text>

                <Field label="Question Text *">
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    placeholder="Enter your question here..."
                    placeholderTextColor={C.TEXT_SEC}
                    value={q.questionText}
                    onChangeText={v => onUpdate(idx, { questionText: v })}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </Field>

                <Text style={styles.optionsLabel}>Answer Options (select the correct answer)</Text>
                {q.options.map((opt, oi) => (
                  <View key={oi} style={styles.optionRow}>
                    <TouchableOpacity
                      style={styles.radio}
                      onPress={() => onUpdate(idx, { correctOptionNumber: oi + 1 })}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <View style={[
                        styles.radioOuter,
                        q.correctOptionNumber === oi + 1 && styles.radioOuterActive,
                      ]}>
                        {q.correctOptionNumber === oi + 1 && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.input, styles.optionInput]}
                      placeholder={`Option ${oi + 1}`}
                      placeholderTextColor={C.TEXT_SEC}
                      value={opt}
                      onChangeText={v => onUpdateOption(idx, oi, v)}
                    />
                  </View>
                ))}
                {q.correctOptionNumber === 0 && (
                  <Text style={styles.selectHint}>← Select the correct answer</Text>
                )}

                <Field label="Explanation (shown after submission)">
                  <TextInput
                    style={styles.input}
                    placeholder="Why is this the correct answer?"
                    placeholderTextColor={C.TEXT_SEC}
                    value={q.explanation}
                    onChangeText={v => onUpdate(idx, { explanation: v })}
                  />
                </Field>

                {!!qErrors[idx] && <Text style={styles.errorText}>{qErrors[idx]}</Text>}

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => onSaveNext(idx)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>
                    {idx < questions.length - 1 ? 'Save & Next →' : 'Done ✓'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      {!!submitError && <Text style={[styles.errorText, { marginTop: 16 }]}>{submitError}</Text>}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.primaryBtn, !allComplete && styles.primaryBtnDisabled]}
          onPress={onCreate}
          disabled={submitting || !allComplete}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.primaryBtnText}>Create Test</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onBack} activeOpacity={0.85}>
          <Text style={styles.secondaryBtnText}>Back</Text>
        </TouchableOpacity>
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

function StepBadge({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
  const filled = active || done;
  return (
    <View style={styles.stepBadgeWrap}>
      <View style={[styles.stepCircle, filled ? styles.stepCircleActive : styles.stepCircleInactive]}>
        <Text style={[styles.stepNum, filled ? styles.stepNumActive : styles.stepNumInactive]}>
          {num}
        </Text>
      </View>
      <Text style={[styles.stepLabel, filled ? styles.stepLabelActive : styles.stepLabelInactive]}>
        {label}
      </Text>
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

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    width: 220,
    backgroundColor: C.ELEVATED,
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
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12,
  },
  pageTitle: { fontSize: 24, fontWeight: '700', color: C.TEXT },
  backBtn: {
    borderWidth: 1, borderColor: C.BORDER_STRONG,
    borderRadius: 6, paddingHorizontal: 14, paddingVertical: 8,
  },
  backBtnText: { fontSize: 13, color: C.TEXT, fontWeight: '500' },

  // Step indicator
  stepRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 24,
  },
  stepBadgeWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  stepCircleActive: { backgroundColor: C.ACCENT },
  stepCircleInactive: { backgroundColor: C.SURFACE, borderWidth: 1, borderColor: C.BORDER_STRONG },
  stepNum: { fontSize: 13, fontWeight: '700' },
  stepNumActive: { color: '#fff' },
  stepNumInactive: { color: C.TEXT_SEC },
  stepLabel: { fontSize: 14, fontWeight: '500' },
  stepLabelActive: { color: C.TEXT },
  stepLabelInactive: { color: C.TEXT_SEC },
  stepLine: {
    flex: 1, height: 1,
    backgroundColor: C.BORDER,
    marginHorizontal: 16,
  },

  // Form card
  formCard: {
    backgroundColor: C.ELEVATED,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.BORDER,
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
  row4: {
    flexDirection: 'row', gap: 16, flexWrap: 'wrap', marginBottom: 4,
  },
  rowField: { flex: 1, minWidth: 120 },
  errorText: { color: C.DANGER, fontSize: 13, marginTop: 4, marginBottom: 8 },

  // Buttons
  buttonRow: {
    flexDirection: 'row', gap: 12, marginTop: 24,
    flexWrap: 'wrap', alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: C.ACCENT, borderRadius: 8,
    paddingHorizontal: 20, paddingVertical: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  secondaryBtn: {
    backgroundColor: C.SURFACE, borderRadius: 8,
    borderWidth: 1, borderColor: C.BORDER_STRONG,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  secondaryBtnText: { color: C.TEXT, fontSize: 14, fontWeight: '500' },
  outlineBtn: {
    borderWidth: 1, borderColor: C.ACCENT,
    borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10,
  },
  outlineBtnText: { color: C.ACCENT_LIGHT, fontSize: 13, fontWeight: '500' },
  orText: { color: C.TEXT_SEC, fontSize: 13 },

  // Step 2
  step2Header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20, gap: 12, flexWrap: 'wrap',
  },
  step2Title: { fontSize: 18, fontWeight: '700', color: C.TEXT, marginBottom: 4 },
  step2Sub: { fontSize: 13, color: C.TEXT_SEC },

  // Accordion question cards
  qCard: {
    borderWidth: 1, borderColor: C.BORDER,
    borderRadius: 8, marginBottom: 10, overflow: 'hidden',
  },
  qCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.SURFACE,
  },
  qCardHeaderLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1,
  },
  qBadgeDone: { fontSize: 16, color: C.SUCCESS, fontWeight: '700' },
  qBadgeEmpty: { fontSize: 16, color: C.TEXT_SEC },
  qCardLabel: { fontSize: 14, color: C.TEXT, flex: 1 },
  qToggle: { fontSize: 11, color: C.TEXT_SEC, marginLeft: 8 },
  qCardBody: {
    padding: 16,
    backgroundColor: C.ELEVATED,
    borderTopWidth: 1, borderTopColor: C.BORDER,
  },
  qHeading: {
    fontSize: 16, fontWeight: '700', color: C.ACCENT_LIGHT,
    marginBottom: 16,
  },

  // Options
  optionsLabel: { fontSize: 13, color: C.TEXT, fontWeight: '500', marginBottom: 10 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10,
  },
  radio: { padding: 4 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: C.BORDER_STRONG,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: C.ACCENT },
  radioInner: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: C.ACCENT,
  },
  optionInput: { flex: 1 },
  selectHint: {
    fontSize: 12, color: C.ACCENT_LIGHT,
    fontStyle: 'italic', marginBottom: 8,
  },
});
