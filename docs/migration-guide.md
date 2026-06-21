# JS → React Native Migration Guide
## TestCreator

**Source:** `test-creator` (Spring Boot static assets — vanilla JS + HTML)  
**Target:** `test-creator-reactnative/frontend` (Expo 55 / React Native 0.83)  
**Last Updated:** 2026-05-10

---

## Table of Contents

1. [Migration Scope](#1-migration-scope)
2. [Architecture Comparison](#2-architecture-comparison)
3. [Technology Mapping](#3-technology-mapping)
4. [Screen-by-Screen Status](#4-screen-by-screen-status)
5. [Foundation Layer Changes](#5-foundation-layer-changes)
6. [Key Patterns Translated](#6-key-patterns-translated)
7. [What Was Deliberately Left Out](#7-what-was-deliberately-left-out)
8. [Known Divergences](#8-known-divergences)
9. [Running the Apps Side-by-Side](#9-running-the-apps-side-by-side)

---

## 1. Migration Scope

The source app is a single-page web application served as static files by Spring Boot. It consists of one HTML entry point, five shared JavaScript modules, and ten page-specific HTML files. All API communication goes to the same Spring Boot backend.

The target is a React Native app built with Expo that runs on iOS, Android, and web from a single codebase. It talks to the **same backend** — no backend changes are required for the migration.

**What is being migrated:**

| Source path | Target path |
|---|---|
| `pages/login.html` + `js/auth.js` | `app/(auth)/login.tsx` |
| `pages/register.html` + `js/auth.js` | `app/(auth)/register.tsx` |
| `pages/student/dashboard.html` | `app/(student)/dashboard.tsx` |
| `pages/student/take-test.html` + `js/proctoring.js` | `app/(student)/take-test.tsx` |
| `pages/student/result.html` | `app/(student)/result.tsx` |
| `pages/student/my-attempts.html` | `app/(student)/my-attempts.tsx` |
| `pages/teacher/dashboard.html` | `app/(teacher)/dashboard.tsx` |
| `pages/teacher/create-test.html` + `js/create.js` + `js/csv-import.js` | `app/(teacher)/create-test.tsx` |
| `pages/teacher/edit-test.html` | `app/(teacher)/edit-test.tsx` |
| `pages/teacher/analytics.html` | `app/(teacher)/analytics.tsx` |
| `pages/guest/enter-code.html` | `app/(guest)/enter-code.tsx` |
| `pages/guest/take-test.html` | `app/(guest)/take-test.tsx` |
| `pages/guest/result.html` | `app/(guest)/result.tsx` |
| `js/api.js` (ApiClient class) | `src/lib/api.ts` |
| `js/auth.js` (Auth object) | `src/lib/auth.tsx` |
| `js/config.js` (CONFIG object) | `src/lib/config.ts` + `src/lib/theme.ts` |
| `js/app.js` (UI helpers, App init) | `src/lib/utils.ts` (planned) |

**What is not being migrated:**

- `index.html` → replaced by a new, fully custom landing page (`src/screens/LandingPage.tsx`)
- `css/styles.css` → replaced by `StyleSheet` per screen
- Browser-specific proctoring (copy/paste detection, right-click blocking, F12 detection) → deferred post-MVP

---

## 2. Architecture Comparison

### Source (Vanilla JS)

```
index.html
├── js/config.js       — global CONFIG object (frozen)
├── js/api.js          — ApiClient class + API namespace objects
├── js/auth.js         — Auth object + login/register handlers
├── js/app.js          — App.init(), UI helpers (UI.showAlert, etc.)
├── js/create.js       — Create test wizard logic
├── js/csv-import.js   — CSV file import handler
└── js/proctoring.js   — Proctoring event listeners

pages/
├── login.html
├── register.html
├── student/dashboard.html
├── student/take-test.html
├── student/result.html
├── student/my-attempts.html
├── teacher/dashboard.html
├── teacher/create-test.html
├── teacher/edit-test.html
├── teacher/analytics.html
├── guest/enter-code.html
├── guest/take-test.html
└── guest/result.html
```

Navigation is handled by `window.location.href` assignments. Auth state lives in `localStorage`. Each page re-runs its own initialization on load.

### Target (React Native / Expo)

```
app/
├── _layout.tsx            — Root layout (AuthProvider, Stack screens)
├── index.tsx              — Landing page redirect
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx
│   └── register.tsx
├── (student)/
│   ├── _layout.tsx        — requireStudent guard
│   ├── dashboard.tsx
│   ├── take-test.tsx
│   ├── result.tsx
│   └── my-attempts.tsx
├── (teacher)/
│   ├── _layout.tsx        — requireTeacher guard
│   ├── dashboard.tsx
│   ├── create-test.tsx
│   ├── edit-test.tsx
│   └── analytics.tsx
└── (guest)/
    ├── enter-code.tsx
    ├── take-test.tsx
    └── result.tsx

src/lib/
├── theme.ts               — Design tokens (replaces CSS variables)
├── config.ts              — API URL, storage keys, timer constants
├── storage.ts             — Platform-aware storage adapter
├── api.ts                 — ApiClient + API namespaces (typed)
└── auth.tsx               — AuthProvider / useAuth context

src/components/            — Shared UI (StatusBadge, etc.) — planned
src/hooks/                 — Shared logic (usePagination, etc.) — planned
```

Navigation uses `expo-router` (file-based, like Next.js). Auth state lives in React Context backed by `expo-secure-store` (native) or `localStorage` (web).

---

## 3. Technology Mapping

| Concern | Source (JS) | Target (React Native) |
|---|---|---|
| Routing | `window.location.href` | `expo-router` (`router.push`, `router.replace`) |
| Auth persistence | `localStorage` | `expo-secure-store` (native) / `localStorage` (web) via `src/lib/storage.ts` |
| Auth state | Module-level `Auth` object | React Context (`AuthProvider` / `useAuth`) |
| HTTP | `fetch` (class wrapper) | `fetch` (same wrapper, now typed TypeScript) |
| Styling | CSS classes + `styles.css` | `StyleSheet.create` per screen |
| Responsive layout | CSS media queries | `useWindowDimensions` + breakpoint booleans |
| Platform shadows | CSS `box-shadow` | `Platform.select({ web: ..., default: ... })` |
| Modals | DOM-created `<div class="modal">` | `<Modal>` from react-native |
| Forms | HTML `<form>` + `addEventListener('submit')` | `TextInput` + `onPress` handlers |
| Timers | `setInterval` (browser) | `setInterval` (same API in RN) |
| File picker (CSV) | `<input type="file">` | `expo-document-picker` |
| File download | `<a download>` + `URL.createObjectURL` | `expo-file-system` + `expo-sharing` |
| Tab/focus detection | `document.visibilitychange` + `window.blur` | `AppState.addEventListener('change')` |
| Back button guard | `window.onbeforeunload` | `BackHandler.addEventListener` (Android) |
| Date/time input | `<input type="datetime-local">` | `@react-native-community/datetimepicker` |
| Pagination | Previous/Next buttons | `FlatList` `onEndReached` or Previous/Next buttons |

---

## 4. Screen-by-Screen Status

| Screen | Source file | Target file | Status |
|--------|------------|-------------|--------|
| Login | `pages/login.html` | `app/(auth)/login.tsx` | ✅ Done |
| Register | `pages/register.html` | `app/(auth)/register.tsx` | ✅ Done |
| Student Dashboard | `pages/student/dashboard.html` | `app/(student)/dashboard.tsx` | 🔲 Pending |
| Student Take Test | `pages/student/take-test.html` | `app/(student)/take-test.tsx` | 🔲 Pending |
| Student Result | `pages/student/result.html` | `app/(student)/result.tsx` | 🔲 Pending |
| Student My Attempts | `pages/student/my-attempts.html` | `app/(student)/my-attempts.tsx` | 🔲 Pending |
| Teacher Dashboard | `pages/teacher/dashboard.html` | `app/(teacher)/dashboard.tsx` | 🔲 Pending |
| Teacher Create Test | `pages/teacher/create-test.html` | `app/(teacher)/create-test.tsx` | 🔲 Pending |
| Teacher Edit Test | `pages/teacher/edit-test.html` | `app/(teacher)/edit-test.tsx` | 🔲 Pending |
| Teacher Analytics | `pages/teacher/analytics.html` | `app/(teacher)/analytics.tsx` | 🔲 Pending |
| Guest Enter Code | `pages/guest/enter-code.html` | `app/(guest)/enter-code.tsx` | 🔲 Pending |
| Guest Take Test | `pages/guest/take-test.html` | `app/(guest)/take-test.tsx` | 🔲 Pending |
| Guest Result | `pages/guest/result.html` | `app/(guest)/result.tsx` | 🔲 Pending |

---

## 5. Foundation Layer Changes

### Config (`js/config.js` → `src/lib/config.ts` + `src/lib/theme.ts`)

The original `CONFIG` object combined API settings, storage keys, timer values, and UI routes in one frozen object. In the target, these are split:

- **`src/lib/config.ts`** — runtime values: `API_BASE_URL`, `STORAGE_KEYS`, timer thresholds (`TIMER_WARNING`, `TIMER_DANGER`), intervals
- **`src/lib/theme.ts`** — visual design tokens (`C.BG`, `C.ACCENT`, etc.) — no equivalent in source; the source used CSS custom properties

Routes are no longer needed as string constants — `expo-router` provides typed navigation via `router.push('/(auth)/login')`.

### API Client (`js/api.js` → `src/lib/api.ts`)

**Preserved:**
- Same HTTP methods (`get`, `post`, `put`, `patch`, `delete`)
- Same 401 handler (clear token, call `onUnauthorized` callback)
- Same API namespace objects (`AuthAPI`, `StudentTestAPI`, etc.)
- Same base URL pattern (`/api` prefix)

**Changed:**
- Full TypeScript types on all request/response shapes
- Token operations are now `async` (SecureStore is async; `localStorage` is sync but the wrapper is async for consistency)
- `window.location` redirect on 401 replaced by a registered `onUnauthorized` callback (framework-agnostic)
- `download()` method not migrated — replaced by `expo-file-system` + `expo-sharing` when needed

### Auth (`js/auth.js` → `src/lib/auth.tsx`)

**Preserved:**
- `login(email, password)` — calls API, stores token + user
- `register(firstName, lastName, email, password, role)` — same shape
- `logout()` — clears both keys
- `isLoggedIn`, `isTeacher`, `isStudent` checks
- `loadFromStorage()` — restores session on app startup (replaces `Auth.requireAuth()` page guards)

**Changed:**
- Module-level object → React Context with hooks (`useAuth`)
- `window.location.href` redirects → `router.replace()` called from the screen component after `await login()`
- `localStorage` → `src/lib/storage.ts` adapter (SecureStore on native, localStorage on web)
- Route guards moved to `app/(student)/_layout.tsx` and `app/(teacher)/_layout.tsx`

### Storage (`localStorage` → `src/lib/storage.ts`)

The source uses `localStorage` directly. On React Native, `localStorage` is not available. The fix is a thin adapter:

```ts
// Web: localStorage  |  Native: expo-secure-store
getItem(key)    → localStorage.getItem / SecureStore.getItemAsync
setItem(key)    → localStorage.setItem / SecureStore.setItemAsync
deleteItem(key) → localStorage.removeItem / SecureStore.deleteItemAsync
```

This keeps all other code identical between web and native targets.

---

## 6. Key Patterns Translated

### Navigation

```js
// Source
window.location.href = '/pages/student/dashboard.html';
window.location.href = `take-test.html?id=${attempt.id}`;
```

```ts
// Target
router.replace('/(student)/dashboard');
router.push({ pathname: '/(student)/take-test', params: { id: attempt.id } });
```

### URL parameters

```js
// Source
const params = new URLSearchParams(window.location.search);
const attemptId = params.get('id');
```

```ts
// Target
import { useLocalSearchParams } from 'expo-router';
const { id: attemptId } = useLocalSearchParams<{ id: string }>();
```

### Auth guard

```js
// Source (top of each protected page)
document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireStudent()) return;
  loadTests();
});
```

```tsx
// Target (app/(student)/_layout.tsx — runs once for entire group)
export default function StudentLayout() {
  const { isLoggedIn, isStudent } = useAuth();
  if (!isLoggedIn || !isStudent) return <Redirect href="/(auth)/login" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

### Modals

```js
// Source
UI.showModal('deleteModal');   // adds .show class to a hidden div
UI.hideModal('deleteModal');
```

```tsx
// Target
const [deleteModalVisible, setDeleteModalVisible] = useState(false);
<Modal visible={deleteModalVisible} transparent animationType="fade">
  ...
  <TouchableOpacity onPress={() => setDeleteModalVisible(false)} />
</Modal>
```

### Alerts / Toasts

```js
// Source
UI.showAlert('Test published!', 'success');  // injects div, auto-removes after 5s
```

```tsx
// Target — simple actions
Alert.alert('Success', 'Test published!');

// Target — non-blocking toast (implement as a lightweight component)
// src/components/Toast.tsx — planned
```

### Timers

```js
// Source (identical in target — setInterval works the same in RN)
timerInterval = setInterval(() => {
  remainingSeconds--;
  if (remainingSeconds <= 0) forceSubmit();
}, 1000);
```

```ts
// Target (identical API, just typed)
const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
timerRef.current = setInterval(() => { ... }, 1000);
// cleanup: clearInterval(timerRef.current)
```

### Proctoring events

```js
// Source
document.addEventListener('visibilitychange', handler);  // tab switch
window.addEventListener('blur', handler);                 // window focus loss
document.addEventListener('copy', handler);               // clipboard
document.addEventListener('contextmenu', handler);        // right-click
document.addEventListener('keydown', handler);            // F12, Ctrl+C, etc.
```

```ts
// Target (MVP — AppState only, rest deferred)
import { AppState } from 'react-native';
AppState.addEventListener('change', (nextState) => {
  if (nextState === 'background' || nextState === 'inactive') {
    // show banner warning — violation reporting deferred post-MVP
  }
});
// Copy/paste, right-click, keyboard shortcuts: not applicable on mobile
```

---

## 7. What Was Deliberately Left Out

### Proctoring (post-MVP)
The source has a full `Proctoring` module covering tab switches, copy/paste, right-click, keyboard shortcuts, window blur, and dev tools detection. On mobile, most of these events don't exist. The MVP ships with:
- `AppState` background detection → show a warning banner
- No `POST .../violation` calls until the proctoring phase is explicitly scoped

### `UI.showAlert` toast system
The source injects DOM nodes that auto-dismiss. The target currently uses `Alert.alert` for important confirmations. A proper non-blocking toast component is planned but not required for functional correctness.

### Attempt recovery
`GET /api/student/attempts/{id}/recover` exists in the source but the UI doesn't actively use it. Deferred.

### Analytics CSV export
Requires `expo-file-system` + `expo-sharing`. The UI button will exist but the handler is a no-op until post-MVP.

---

## 8. Known Divergences

| Behaviour | Source | Target | Reason |
|---|---|---|---|
| Dark theme | Light (white cards, light BG) | Dark (`#07091a` BG, `#0d1128` cards) | New design direction for RN app |
| Landing page | Static HTML hero | Animated React Native landing page | Full redesign |
| Role selector on Register | `<select>` dropdown | Two card-style toggle buttons | Better mobile UX |
| CSV import feedback | `UI.showAlert` inline | `Alert.alert` (temporary) | Toast component pending |
| Guest token in URL | `?token=guest_xxx` passed via URL | Passed via `router.params` | No query string manipulation in RN |
| 401 redirect | `window.location.href` to login | `onUnauthorized` callback → `router.replace` | Framework-agnostic handler |

---

## 9. Running the Apps Side-by-Side

### Source (original JS app)

The original app is served by the Spring Boot backend:

```
http://167.233.130.104:8080/pages/login.html
http://167.233.130.104:8080/pages/student/dashboard.html
http://167.233.130.104:8080/pages/teacher/dashboard.html
```

### Target (React Native / Expo dev server)

```bash
# From frontend/ directory
source ~/.nvm/nvm.sh && nvm use 22
~/.bun/bin/bun --bun x expo start --web --port 8081
```

Then open:

```
http://localhost:8081              — Landing page
http://localhost:8081/(auth)/login
http://localhost:8081/(auth)/register
```

Both apps talk to the same backend (`http://167.233.130.104:8080`). You can test the same user account in both.

---

*Update the Status column in Section 4 as each screen is completed.*
