import { API_BASE_URL, STORAGE_KEYS } from './config';
import { deleteItem, getItem, setItem } from './storage';

type OnUnauthorized = () => void;

class ApiClient {
  private baseUrl: string;
  private onUnauthorized: OnUnauthorized | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setOnUnauthorized(cb: OnUnauthorized) {
    this.onUnauthorized = cb;
  }

  async getToken(): Promise<string | null> {
    return getItem(STORAGE_KEYS.TOKEN);
  }

  async setToken(token: string): Promise<void> {
    await setItem(STORAGE_KEYS.TOKEN, token);
  }

  async removeToken(): Promise<void> {
    await deleteItem(STORAGE_KEYS.TOKEN);
  }

  private async buildHeaders(includeAuth = true): Promise<Record<string, string>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (includeAuth) {
      const token = await this.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private buildUrl(endpoint: string, params: Record<string, string | number> = {}): string {
    const url = new URL(this.baseUrl + endpoint);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
    });
    return url.toString();
  }

  private async handleResponse(response: Response): Promise<unknown> {
    if (response.status === 204) return null;

    const contentType = response.headers.get('content-type') ?? '';
    const data = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      if (response.status === 401) {
        await this.removeToken();
        await deleteItem(STORAGE_KEYS.USER);
        this.onUnauthorized?.();
      }
      const msg =
        (data as { message?: string; error?: string })?.message ??
        (data as { message?: string; error?: string })?.error ??
        'An error occurred';
      const err = new Error(msg) as Error & { status: number; data: unknown };
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  async get(endpoint: string, params: Record<string, string | number> = {}, includeAuth = true): Promise<unknown> {
    const response = await fetch(this.buildUrl(endpoint, params), {
      method: 'GET',
      headers: await this.buildHeaders(includeAuth),
    });
    return this.handleResponse(response);
  }

  async post(endpoint: string, body: unknown = {}, includeAuth = true): Promise<unknown> {
    const response = await fetch(this.baseUrl + endpoint, {
      method: 'POST',
      headers: await this.buildHeaders(includeAuth),
      body: JSON.stringify(body),
    });
    return this.handleResponse(response);
  }

  async put(endpoint: string, body: unknown = {}, includeAuth = true): Promise<unknown> {
    const response = await fetch(this.baseUrl + endpoint, {
      method: 'PUT',
      headers: await this.buildHeaders(includeAuth),
      body: JSON.stringify(body),
    });
    return this.handleResponse(response);
  }

  async patch(endpoint: string, body: unknown = {}, includeAuth = true): Promise<unknown> {
    const response = await fetch(this.baseUrl + endpoint, {
      method: 'PATCH',
      headers: await this.buildHeaders(includeAuth),
      body: JSON.stringify(body),
    });
    return this.handleResponse(response);
  }

  async delete(endpoint: string, includeAuth = true): Promise<unknown> {
    const response = await fetch(this.baseUrl + endpoint, {
      method: 'DELETE',
      headers: await this.buildHeaders(includeAuth),
    });
    return this.handleResponse(response);
  }
}

export const api = new ApiClient(API_BASE_URL);

export const AuthAPI = {
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data, false) as Promise<{ token: string; user: { id: number; email: string; name: string; role: 'TEACHER' | 'STUDENT' } }>,
  register: (data: { name: string; email: string; password: string; role: string }) =>
    api.post('/auth/register', data, false) as Promise<{ token: string; user: { id: number; email: string; name: string; role: 'TEACHER' | 'STUDENT' } }>,
  getCurrentUser: () =>
    api.get('/auth/me') as Promise<{ id: number; email: string; name: string; role: 'TEACHER' | 'STUDENT' }>,
};

export type TestListItem = {
  id: number;
  title: string;
  totalQuestions: number;
  durationMinutes: number;
  testDate: string | null;
  status: string;
  accessCode: string | null;
  createdAt: string;
  attemptCount: number;
};

export type QuestionForm = {
  questionNumber: number;
  questionText: string;
  explanation: string;
  correctOptionNumber: number;
  options: { optionNumber: number; optionText: string }[];
};

export type CreateTestPayload = {
  title: string;
  description: string;
  totalQuestions: number;
  passingScore: number;
  durationMinutes: number;
  testDate?: string | null;
  questions: QuestionForm[];
};

export type TestDetail = {
  id: number;
  title: string;
  description: string;
  totalQuestions: number;
  passingScore: number;
  durationMinutes: number;
  status: string;
  accessCode: string | null;
  testDate: string | null;
  createdAt: string;
  questions: QuestionForm[];
};

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  last: boolean;
};

export const TeacherTestAPI = {
  getTests: (page = 0, size = 10, status?: string) => {
    const params: Record<string, string | number> = { page, size };
    if (status) params.status = status;
    return api.get('/tests', params) as Promise<PageResponse<TestListItem>>;
  },
  getTestDetail: (testId: number) =>
    api.get(`/tests/${testId}`) as Promise<TestDetail>,
  createTest: (payload: CreateTestPayload) =>
    api.post('/tests', payload) as Promise<TestListItem>,
  updateTest: (testId: number, payload: CreateTestPayload) =>
    api.put(`/tests/${testId}`, payload) as Promise<TestListItem>,
  generateAccessCode: (testId: number) =>
    api.post(`/tests/${testId}/access-code`) as Promise<TestListItem>,
  publishTest: (testId: number) =>
    api.post(`/tests/${testId}/publish`) as Promise<TestListItem>,
  archiveTest: (testId: number) =>
    api.post(`/tests/${testId}/archive`) as Promise<TestListItem>,
  deleteTest: (testId: number) =>
    api.delete(`/tests/${testId}`) as Promise<null>,
};

export type AvailableTest = {
  id: number;
  title: string;
  description: string | null;
  totalQuestions: number;
  durationMinutes: number;
  passingScore: number;
  testDate: string | null;
  alreadyAttempted: boolean;
  teacherName: string;
  previousScore: number | null;
  previousResult: 'PASS' | 'FAIL' | null;
};

export type QuestionOption = {
  id: number;
  optionNumber: number;
  optionText: string;
};

export type QuestionWithOptionsDTO = {
  id: number;
  questionNumber: number;
  questionText: string;
  options: QuestionOption[];
};

export type StudentAnswerRecord = {
  questionId: number;
  selectedOption: number;
};

export type TestAttemptDTO = {
  id: number;
  testId: number;
  testTitle: string;
  studentId: number | null;
  guestName: string | null;
  startedAt: string;
  expiresAt: string;
  remainingMinutes: number;
  totalQuestions: number;
  answeredQuestions: number;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
  submitted: boolean;
  questions: QuestionWithOptionsDTO[];
  answers: StudentAnswerRecord[];
};

export type SubmitAnswerRequest = {
  questionId: number;
  selectedOption: number;
};

export type CachedAnswerDTO = {
  questionId: number;
  selectedOption: number;
  cachedAt: string;
};

export type ReviewOption = {
  optionNumber: number;
  optionText: string;
  isCorrect: boolean;
  wasSelected: boolean;
};

export type ReviewQuestion = {
  id: number;
  questionNumber: number;
  questionText: string;
  explanation: string;
  correctOption: number;
  selectedOption: number | null;
  isCorrect: boolean;
  options: ReviewOption[];
};

export type TestResultDTO = {
  attemptId: number;
  testId: number;
  testTitle: string;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedQuestions: number;
  score: number;
  result: 'PASS' | 'FAIL';
  passingScore: number;
  submittedAt: string;
  timeTakenSeconds: number;
  reviewQuestions: ReviewQuestion[];
};

export type GuestTestAccessDTO = {
  guestToken: string;
  testId: number;
  testTitle: string;
  guestAccessUrl: string;
  expirationMinutes: number;
};

export type GuestTestDetailDTO = {
  guestToken: string;
  testId: number;
  title: string;
  description: string;
  totalQuestions: number;
  durationMinutes: number;
  passingScore: number;
};

export type StudentResult = {
  attemptId: number;
  testId: number;
  testTitle: string;
  score: number;
  result: 'PASS' | 'FAIL';
  submittedAt: string;
};

export type StudentResultsSummary = {
  results: StudentResult[];
  totalAttempts: number;
  averageScore: number;
  passCount: number;
  failCount: number;
};

export const StudentAPI = {
  getAvailableTests: (page = 0, size = 20) =>
    api.get('/student/tests/available', { page, size }) as Promise<PageResponse<AvailableTest>>,
  getResults: () =>
    api.get('/student/results') as Promise<StudentResultsSummary>,
  startAttempt: (testId: number) =>
    api.post(`/student/tests/${testId}/start`) as Promise<TestAttemptDTO>,
  getAttemptProgress: (attemptId: number) =>
    api.get(`/student/attempts/${attemptId}`) as Promise<TestAttemptDTO>,
  submitAnswer: (attemptId: number, request: SubmitAnswerRequest) =>
    api.post(`/student/attempts/${attemptId}/answer`, request) as Promise<void>,
  autoSaveAnswer: (attemptId: number, request: SubmitAnswerRequest) =>
    api.post(`/student/attempts/${attemptId}/autosave`, request) as Promise<void>,
  sendHeartbeat: (attemptId: number) =>
    api.post(`/student/attempts/${attemptId}/heartbeat`) as Promise<void>,
  recoverCachedAnswers: (attemptId: number) =>
    api.get(`/student/attempts/${attemptId}/recover`) as Promise<CachedAnswerDTO[]>,
  submitTest: (attemptId: number) =>
    api.post(`/student/attempts/${attemptId}/submit`) as Promise<TestResultDTO>,
  getDetailedResult: (attemptId: number) =>
    api.get(`/student/results/${attemptId}`) as Promise<TestResultDTO>,
};

export const GuestAPI = {
  validateAccessCode: (accessCode: string) =>
    api.get(`/guest/access/${accessCode}`, {}, false) as Promise<GuestTestAccessDTO>,
  getTestDetail: (guestToken: string) =>
    api.get(`/guest/tests/${guestToken}`, {}, false) as Promise<GuestTestDetailDTO>,
  startAttempt: (guestToken: string, guestName: string) =>
    api.post(`/guest/tests/${guestToken}/start`, { guestName }, false) as Promise<TestAttemptDTO>,
  getAttemptState: (attemptId: number) =>
    api.get(`/guest/attempts/${attemptId}`, {}, false) as Promise<TestAttemptDTO>,
  submitAnswer: (attemptId: number, questionId: number, selectedOptionId: number) =>
    api.post(`/guest/attempts/${attemptId}/answer`, { questionId, selectedOptionId }, false) as Promise<void>,
  submitTest: (attemptId: number) =>
    api.post(`/guest/attempts/${attemptId}/submit`, {}, false) as Promise<TestResultDTO>,
  invalidateSession: (guestToken: string) =>
    api.delete(`/guest/sessions/${guestToken}`, false) as Promise<null>,
};
