# Screen Implementation Plan
## TestCreator — React Native Migration

**Status:** In Progress  
**Last Updated:** 2026-05-10  
**Total Screens:** 13  
**Completed:** 3 / 13

---

## Overview

This document tracks the migration of all screens from the vanilla JavaScript web app to the React Native (Expo) frontend. Each screen entry covers its purpose, file location, API dependencies, state, navigation, and implementation notes.

Screens are grouped into four flows: Auth, Student, Teacher, and Guest. The dependency order matters — the auth foundation must be in place before any protected screen can be built.

---

## Progress Tracker

| # | Screen | Route | Status | Branch |
|---|--------|-------|--------|--------|
| 1 | Login | `/(auth)/login` | ✅ Done | merged |
| 2 | Register | `/(auth)/register` | ✅ Done | merged |
| 3 | Student Dashboard | `/(student)/dashboard` | 🔲 Not started | — |
| 4 | Student Take Test | `/(student)/take-test` | 🔲 Not started | — |
| 5 | Student Result | `/(student)/result` | 🔲 Not started | — |
| 6 | Student My Attempts | `/(student)/my-attempts` | 🔲 Not started | — |
| 7 | Teacher Dashboard | `/(teacher)/dashboard` | ✅ Done | merged |
| 8 | Teacher Create Test | `/(teacher)/create-test` | 🔲 Not started | — |
| 9 | Teacher Edit Test | `/(teacher)/edit-test` | 🔲 Not started | — |
| 10 | Teacher Analytics | `/(teacher)/analytics` | 🔲 Not started | — |
| 11 | Guest Enter Code | `/(guest)/enter-code` | 🔲 Not started | — |
| 12 | Guest Take Test | `/(guest)/take-test` | 🔲 Not started | — |
| 13 | Guest Result | `/(guest)/result` | 🔲 Not started | — |

---

## Foundation (Shared Infrastructure)

All screens depend on the files below. These are complete and merged to `master`.

| File | Purpose |
|------|---------|
| `src/lib/theme.ts` | Design tokens (`C.BG`, `C.ACCENT`, etc.) |
| `src/lib/config.ts` | API base URL, storage keys, timer thresholds |
| `src/lib/storage.ts` | Platform-aware storage (`localStorage` on web, `SecureStore` on native) |
| `src/lib/api.ts` | Fetch-based `ApiClient` + all API namespace exports |
| `src/lib/auth.tsx` | `AuthProvider` / `useAuth` context |
| `app/_layout.tsx` | Root layout wrapping app in `AuthProvider` |
| `app/(auth)/_layout.tsx` | Headerless stack for the auth group |

**API namespaces available in `src/lib/api.ts`:**

```
AuthAPI        — login, register, getCurrentUser
StudentTestAPI — getAvailableTests, startTest, getAttempt, submitAnswer,
                 submitTest, heartbeat, saveAnswer, getMyAttempts, getAttemptResult
TeacherTestAPI — getTests, getTest, createTest, updateTest, deleteTest,
                 publishTest, archiveTest, generateAccessCode, importTestFromCsv
GuestTestAPI   — lookupByAccessCode, getTestDetails, startTest, getAttempt,
                 submitAnswer, submitTest, invalidateSession
AnalyticsAPI   — getTestSummaries, getTestAnalytics, getStudentAttempts,
                 getQuestionAnalytics, exportCSV
ProctoringAPI  — getViolations, getSummary, getTestViolations
```

---

## Phase 1 — Auth Screens ✅

### Screen 1: Login

**File:** `app/(auth)/login.tsx`  
**Status:** ✅ Complete

**Purpose:** Authenticates returning users (Teacher or Student) and redirects to their respective dashboard.

**Fields:**
- Email — `TextInput`, `keyboardType="email-address"`, `autoCapitalize="none"`
- Password — `TextInput`, `secureTextEntry`

**API calls:**
- `POST /api/auth/login` → `{ token, user }` — via `AuthAPI.login`

**On success:** `router.replace('/(teacher)/dashboard')` or `router.replace('/(student)/dashboard')` based on `user.role`

**On mount:** If already logged in (`isLoggedIn`), redirect immediately.

**State:** `email`, `password`, `error`, `loading`

---

### Screen 2: Register

**File:** `app/(auth)/register.tsx`  
**Status:** ✅ Complete

**Purpose:** Creates a new Teacher or Student account and redirects to the appropriate dashboard.

**Fields:**
- First Name, Last Name (side-by-side on `width > 768`)
- Email, Password, Confirm Password
- Role selector — two card-style `TouchableOpacity` buttons (Teacher / Student)

**API calls:**
- `POST /api/auth/register` → `{ token, user }` — via `AuthAPI.register`
- Note: `name` sent as `firstName + ' ' + lastName`

**Validation (client-side before API call):**
1. All fields required
2. Passwords must match
3. Password minimum 8 characters

**On success:** Redirect by role, same as Login.

**State:** `firstName`, `lastName`, `email`, `password`, `confirmPassword`, `role: 'TEACHER' | 'STUDENT' | ''`, `error`, `loading`

---

## Phase 2 — Student Flow

### Screen 3: Student Dashboard

**File:** `app/(student)/dashboard.tsx`  
**Guard:** `requireStudent` — redirect to `/(auth)/login` if not logged in or not a student  
**Status:** 🔲 Not started

**Purpose:** Shows all published tests available for the student to take.

**API calls:**
- `GET /api/student/tests/available?page=0&size=10` → paginated list of tests

**UI components:**
- `FlatList` of test cards, each showing: title, description, duration, question count, passing score, attempts left
- "Start Test" button (disabled if `canAttempt === false`, label changes to "No Attempts Left" or "Not Available")
- Pagination via `onEndReached` (infinite scroll) or Previous/Next buttons
- Empty state: "No tests available at the moment"

**On "Start Test":**
1. `Alert.alert` confirmation — "The timer will begin immediately"
2. `POST /api/student/tests/{testId}/start` → `{ id: attemptId }`
3. `router.push('/(student)/take-test?id=' + attemptId)`

**State:** `tests[]`, `page`, `totalPages`, `loading`, `refreshing`

**Sidebar navigation:** Available Tests (active), My Attempts

---

### Screen 4: Student Take Test ⚠️ Most Complex

**File:** `app/(student)/take-test.tsx`  
**Guard:** `requireStudent`  
**Status:** 🔲 Not started

**Purpose:** Full test-taking experience with countdown timer, per-question navigation, auto-save, and heartbeat.

**Route param:** `id` (attemptId)

**On mount sequence:**
1. `GET /api/student/attempts/{id}` — load attempt + questions + savedAnswers
2. If `attempt.status !== 'IN_PROGRESS'` → redirect to result
3. Restore `answers{}` from `savedAnswers`
4. Start countdown timer (`setInterval` 1s)
5. Start auto-save interval (30s)
6. Start heartbeat interval (60s)

**API calls:**
- `GET /api/student/attempts/{id}` — load attempt
- `POST /api/student/attempts/{id}/autosave` — `{ questionId, selectedOptionId }` every 30s for pending saves
- `POST /api/student/attempts/{id}/heartbeat` — every 60s
- `POST /api/student/attempts/{id}/answer` — flush pending answers before final submit
- `POST /api/student/attempts/{id}/submit` — finalize submission
- `POST /api/student/attempts/{id}/violation` — report proctoring events (deferred post-MVP)

**UI components:**
- Sticky test header: test title, auto-save status indicator, countdown timer (yellow at ≤300s, red at ≤60s), Submit button
- Question navigation bar: horizontal `ScrollView` of numbered bubbles (grey = unanswered, indigo = answered, outlined = current)
- Question card: question text, 3 option rows as `TouchableOpacity` (highlighted when selected)
- Previous / Next buttons; Next becomes "Submit" on last question

**Submit flow:**
1. Show Modal: questions answered count, unanswered count, time remaining
2. Flush all `pendingSaves` via `submitAnswer`
3. `POST .../submit`
4. Clear all intervals, `Proctoring.cleanup()`
5. `router.replace('/(student)/result?id=' + attemptId)`

**Force submit (timer = 0):** Same as above, show `Alert.alert("Time is up!")`

**Back button guard:** `BackHandler.addEventListener` on Android to prevent accidental exit

**State:** `attempt`, `questions[]`, `answers{}`, `currentQuestionIndex`, `remainingSeconds`, `pendingSaves: Set<number>`, `isSubmitting`, `autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error'`

**RN-specific notes:**
- No `beforeunload` — use `BackHandler` + `useNavigationContainerRef` focus listener
- Proctoring is **deferred** — `AppState` listener placeholder only

---

### Screen 5: Student Result

**File:** `app/(student)/result.tsx`  
**Guard:** `requireStudent`  
**Status:** 🔲 Not started

**Purpose:** Displays graded test results including score, pass/fail, stats, and optional answer review.

**Route param:** `id` (attemptId)

**API calls:**
- `GET /api/student/results/{attemptId}` → result object

**UI components:**
- Score display: large percentage text, green (`C.SUCCESS`) if PASS, red (`C.DANGER`) if FAIL
- Stats grid (4 cards): Correct Answers, Points Earned, Time Spent, Passing Score
- Answer review section (if `result.showAnswers === true`): `FlatList` of questions, each option highlighted (green = correct, red = selected wrong, neutral otherwise)
- Actions: "Back to Dashboard", "View All Attempts"

**Error state:** If result not yet available, show message with "Back to Dashboard" button

**State:** `result`, `loading`, `error`

---

### Screen 6: Student My Attempts

**File:** `app/(student)/my-attempts.tsx`  
**Guard:** `requireStudent`  
**Status:** 🔲 Not started

**Purpose:** Lists all of the student's past and in-progress test attempts.

**API calls:**
- `GET /api/student/results?page=0&size=10` → paginated attempts

**UI components:**
- `FlatList` of attempt rows: test title, status badge, score percentage, result badge (PASS/FAIL), started date, submitted date, action button
- Action button logic:
  - `IN_PROGRESS` → "Continue" → `/(student)/take-test?id=`
  - `GRADED` or `SUBMITTED` → "View Result" → `/(student)/result?id=`
  - Otherwise → "—"
- Empty state: "You haven't taken any tests yet"

**State:** `attempts[]`, `page`, `totalPages`, `loading`

**Sidebar navigation:** Available Tests, My Attempts (active)

---

## Phase 3 — Teacher Flow

### Screen 7: Teacher Dashboard

**File:** `app/(teacher)/dashboard.tsx`  
**Guard:** `isLoggedIn && isTeacher` in `app/(teacher)/_layout.tsx`  
**Status:** ✅ Complete

**Purpose:** Lists all tests the teacher has created with management actions.

**API calls:**
- `GET /api/tests?page=0&size=10` → paginated tests
- `POST /api/tests/{id}/publish`
- `POST /api/tests/{id}/archive`
- `DELETE /api/tests/{id}`

**UI components:**
- Stats row (3 cards): Total Tests, Published, Total Attempts (placeholder "—")
- `FlatList` of test rows: title + description snippet, status badge, question count, duration, access code (`<code>` style), created date, action buttons
- Per-row actions: Edit → `/(teacher)/edit-test?id=`, Publish (if DRAFT), Archive (if PUBLISHED), Analytics → `/(teacher)/analytics?id=`, Delete (confirm modal)
- Delete confirm: `Alert.alert` with "This action cannot be undone"

**State:** `tests[]`, `page`, `totalPages`, `loading`, `deleteTargetId`

**Sidebar navigation:** Dashboard (active), Create Test, Analytics

---

### Screen 8: Teacher Create Test

**File:** `app/(teacher)/create-test.tsx`  
**Guard:** `requireTeacher`  
**Status:** 🔲 Not started

**Purpose:** 2-step wizard to create a new test — first define metadata, then fill in all questions.

**Step 1 — Test Details fields:**
- Title (required, min 5 chars)
- Description (optional)
- Number of Questions (1–100, default 10)
- Duration in minutes (min 5, default 60)
- Passing Score % (0–100, default 60)
- Max Attempts (1–10, default 1)
- CSV import button → `expo-document-picker` → `POST /api/tests/import-csv?testName=&duration=` → skip to Step 2 with pre-filled questions

**Step 2 — Question forms:**
- `ScrollView` of N question cards (N = totalQuestions)
- Each card: question text `TextInput` (multiline), 3 option rows (text input + radio indicator for correct answer), explanation `TextInput`
- "Create Test" → validate all questions → `POST /api/tests` → `router.replace('/(teacher)/dashboard?created=' + test.id)`
- "Back" button returns to Step 1 preserving entered data

**API calls:**
- `POST /api/tests` — `{ title, description, totalQuestions, durationMinutes, passingScore, testDate, questions[] }`
- `POST /api/tests/import-csv?testName=&duration=` — multipart form with CSV file

**Validation (Step 2):**
- Every question must have non-empty question text
- All 3 options must be non-empty
- Explanation defaults to "Correct answer explanation" if left blank

**State:** `step: 1 | 2`, `testDetails{}`, `questions[]`, `loading`, `error`

**RN-specific notes:**
- Radio button implemented as custom `TouchableOpacity` (no native radio on RN)
- CSV file pick uses `expo-document-picker` (add to dependencies when implementing)

---

### Screen 9: Teacher Edit Test

**File:** `app/(teacher)/edit-test.tsx`  
**Guard:** `requireTeacher`  
**Status:** 🔲 Not started

**Purpose:** 3-tab interface to edit an existing test's details, questions, and settings.

**Route param:** `id` (testId)

**On mount:** `GET /api/tests/{id}` — loads test + embedded questions

**Tab 1 — Details:**
- Title, Description, Duration, Passing Score, Max Attempts
- Access code (read-only input + "Generate" button → `POST /api/tests/{id}/access-code`)
- Save → `PUT /api/tests/{id}` with full questions array

**Tab 2 — Questions:**
- `FlatList` of question rows: truncated text, points badge, Edit / Delete buttons
- "Add Question" → opens `Modal` editor (question text, points, 3 option rows with correct radio, dynamic add/remove options padded to exactly 3)
- Edit / Delete → modify local `questions[]` → `PUT /api/tests/{id}` (full update)

**Tab 3 — Settings:**
- Start Time, End Time — `DateTimePicker` (`@react-native-community/datetimepicker`, add to dependencies when implementing)
- Shuffle Questions — `Switch`
- Show Results to Students — `Switch`
- Publish Test button (visible if DRAFT)
- Archive Test button (visible if PUBLISHED)
- Delete Test button (always visible, confirm modal)

**API calls:**
- `GET /api/tests/{id}`
- `PUT /api/tests/{id}` — used for all changes (details, questions, settings)
- `POST /api/tests/{id}/publish`
- `POST /api/tests/{id}/archive`
- `DELETE /api/tests/{id}` → `router.replace('/(teacher)/dashboard')`
- `POST /api/tests/{id}/access-code` → `{ accessCode }`

**State:** `test{}`, `questions[]`, `activeTab: 'details' | 'questions' | 'settings'`, `editingQuestion`, `modalVisible`, `loading`

**RN-specific notes:**
- Tabs implemented with `TouchableOpacity` row + conditional render (no extra library needed)
- `DateTimePicker` requires `@react-native-community/datetimepicker`

---

### Screen 10: Teacher Analytics

**File:** `app/(teacher)/analytics.tsx`  
**Guard:** `requireTeacher`  
**Status:** 🔲 Not started

**Purpose:** 2-state screen — test selection list, then detailed analytics for the selected test.

**State 1 — Test list:**
- `GET /api/analytics/tests` → paginated summaries (title, status, totalAttempts, averageScore)
- Tap row → transition to analytics detail (update URL with `router.setParams`)

**State 2 — Analytics detail:**
- `GET /api/analytics/tests/{id}` → overview stats
- `GET /api/analytics/tests/{id}/questions` → per-question breakdown
- `GET /api/analytics/tests/{id}/students` → paginated student results
- `GET /api/proctoring/attempts/{id}/summary` → violations (opened in Modal per student row)
- Export CSV → `GET /api/analytics/tests/{id}/export/csv` → `expo-file-system` download + `expo-sharing`

**UI components:**
- Stats row (4 cards): Total Attempts, Average Score, Pass Rate, Median Score
- Score distribution: 10 horizontal bars (`0–10%` … `91–100%`) built from `View` widths (no charting library)
- Score range card: Highest, Lowest, Std Deviation
- Question analysis `FlatList`: question text (truncated 80 chars), correct % progress bar, difficulty badge (EASY/MEDIUM/HARD/VERY_HARD), attempt count
- Student results `FlatList`: name + email, score, result badge, time spent, submitted date, "Violations" button → Modal
- "Export CSV" button + "← Back" button in header

**State:** `view: 'list' | 'detail'`, `selectedTestId`, `analytics{}`, `questionStats[]`, `studentResults{}`, `testList{}`, `violationsModal: { visible, data }`

**RN-specific notes:**
- No `history.pushState` — use `router.setParams({ id: testId })` for deep-link support
- CSV export requires `expo-file-system` + `expo-sharing` (add to dependencies when implementing)

---

## Phase 4 — Guest Flow

### Screen 11: Guest Enter Code

**File:** `app/(guest)/enter-code.tsx`  
**No auth guard** — public screen  
**Status:** 🔲 Not started

**Purpose:** 2-state entry point for guests — enter access code, then preview test info and enter name before starting.

**State 1 — Enter code:**
- Single `TextInput` for access code (pattern `guest_XXXXXX` or full UUID token)
- "Find Test" button

**Token resolution logic:**
- If matches `/^guest_[0-9a-f]{6}$/i` → `GET /api/guest/access/{code}` → receive `guestToken` → `GET /api/guest/tests/{guestToken}` → show State 2
- Otherwise (full UUID) → `GET /api/guest/tests/{token}` directly → show State 2
- On error: inline error message, button re-enabled

**State 2 — Test preview + name entry:**
- Shows: test title, description, duration, question count, passing score %
- Instructions alert box (stable internet, timer starts on submit, no tab switches)
- Guest Name `TextInput` (required, shown on results)
- "Start Test" → `POST /api/guest/tests/{guestToken}/start` → `{ id: attemptId }` → `router.push('/(guest)/take-test?id=' + attemptId)`
- "← Different Code" button → `DELETE /api/guest/sessions/{guestToken}` (best-effort) → reset to State 1

**State:** `view: 'enterCode' | 'testInfo'`, `guestToken`, `testInfo{}`, `accessCode`, `guestName`, `loading`, `error`

**RN-specific notes:**
- No `sessionStorage` — `guestToken` held in component state and passed via router params
- Error for already-used token: "This link has already been used. Request a new code from your teacher."

---

### Screen 12: Guest Take Test

**File:** `app/(guest)/take-test.tsx`  
**No auth guard**  
**Status:** 🔲 Not started

**Purpose:** Same test-taking UX as Student Take Test but using guest APIs, with a simpler proctoring setup (no server-side violation reporting) and an explicit "Exit" button.

**Route param:** `id` (attemptId)

**Differences from Screen 4 (Student Take Test):**
- Uses `GuestTestAPI` throughout (no auth token in headers)
- No heartbeat interval
- No auto-save interval — answers saved immediately on each selection
- "Exit Test" button shown alongside "Submit Test" — opens a separate Exit confirm modal
- Basic proctoring: `AppState` tab-switch banner only, no `reportViolation` API call
- "Guest Mode" badge visible in top-right corner

**API calls:**
- `GET /api/guest/attempts/{id}` — load attempt + questions
- `POST /api/guest/attempts/{id}/answer` — `{ questionId, selectedOptionId }` on each selection
- `POST /api/guest/attempts/{id}/submit` — final submit

**On submit:** `router.replace('/(guest)/result?id=' + attemptId)`

**State:** Same shape as Screen 4 minus `pendingSaves`, `heartbeatInterval`, `autoSaveInterval`

---

### Screen 13: Guest Result

**File:** `app/(guest)/result.tsx`  
**No auth guard**  
**Status:** 🔲 Not started

**Purpose:** Displays the guest's test result with answer review and a prompt to create an account.

**Route param:** `id` (attemptId)

**API calls:**
- `GET /api/guest/attempts/{id}` — returns attempt with embedded `result` object
- If `attempt.status === 'IN_PROGRESS'` → redirect back to `/(guest)/take-test?id=`

**UI components:**
- "Guest Attempt" warning badge
- Score percentage (large, green/red by pass/fail)
- Result status badge (PASS / FAIL)
- "Completed by: `{guestName}`" label
- Stats grid (3 cards): Correct Answers, Points Earned, Submitted Time
- Pass/Fail message card ("Congratulations!" or "Keep Trying!")
- Answer review `FlatList`: per-question correct/incorrect highlight, explanation shown for wrong answers
- Actions: "Take Another Test" → `/(guest)/enter-code`, "Create an Account" → `/(auth)/register`
- Tip card: "Create an account to track your test history"

**State:** `result{}`, `loading`, `error`

---

## Implementation Guidelines

### Shared Patterns

**Route guards:** Each protected route group has a `_layout.tsx` that checks auth state and redirects if needed.

```
app/(student)/_layout.tsx  — checks isLoggedIn && isStudent
app/(teacher)/_layout.tsx  — checks isLoggedIn && isTeacher
```

**Status badges:** Extract a reusable `<StatusBadge status="PUBLISHED" />` component into `src/components/StatusBadge.tsx` when building Screen 7 (Teacher Dashboard) — used across 5+ screens.

**Pagination:** All paginated lists follow the same pattern. Extract a reusable `usePagination` hook into `src/hooks/usePagination.ts` when building Screen 3 (Student Dashboard).

**Date formatting:** Extract `formatDate`, `formatDuration`, `formatTimeRemaining`, `formatPercent` into `src/lib/utils.ts` when building Screen 3.

### Dependency Installation Checklist

Install these packages when reaching the screen that first needs them:

| Package | First needed at | Command |
|---------|----------------|---------|
| `@react-native-community/datetimepicker` | Screen 9 (Edit Test → Settings tab) | `npx expo install @react-native-community/datetimepicker` |
| `expo-document-picker` | Screen 8 (Create Test → CSV import) | `npx expo install expo-document-picker` |
| `expo-file-system` | Screen 10 (Analytics → CSV export) | `npx expo install expo-file-system` |
| `expo-sharing` | Screen 10 (Analytics → CSV export) | `npx expo install expo-sharing` |

### Git Workflow

Each screen is built on its own feature branch in an isolated git worktree (see merge history for Screens 1–2 as reference):

```bash
# Create branch + worktree
git branch feature/screen-N-name
git worktree add /tmp/wt-screen-N feature/screen-N-name

# Work in the worktree, commit, then merge back
git -C /tmp/wt-screen-N commit -m "feat: add screen N — <name>"
git merge feature/screen-N-name --no-ff
git worktree remove /tmp/wt-screen-N
```

Screens within the same phase that share no files can be built in parallel worktrees (e.g. Screen 3 and Screen 7 are independent).

---

## Deferred Features (Post-MVP)

The following are **excluded** from all screens until the MVP ships:

- Server-side proctoring violation reporting (`POST .../violation`)
- `AppState` violation detection in Take Test screens (placeholder only)
- Analytics CSV export (Screen 10)
- DateTimePicker schedule settings (Screen 9, Settings tab)
- Attempt recovery (`GET /api/student/attempts/{id}/recover`)

---

*This document is the living source of truth for the migration. Update the Progress Tracker table and each screen's Status field as work is completed.*
