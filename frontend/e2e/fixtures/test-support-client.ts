import { APIRequestContext, request } from '@playwright/test';
import { env } from '../support/env';

export type Role = 'TEACHER' | 'STUDENT';

export interface CreateUserRequest {
  email: string;
  name?: string;
  password?: string;
}

export interface CreateUserResponse {
  id: number;
  email: string;
  name: string;
  role: Role;
  jwt: string;
}

export interface QuestionSeed {
  questionText: string;
  options: [string, string, string];
  correctOptionNumber: 1 | 2 | 3;
}

export interface CreateTestRequest {
  teacherId: number;
  title?: string;
  durationMinutes?: number;
  passingScore?: number;
  publish?: boolean;
  generateAccessCode?: boolean;
  questions?: QuestionSeed[];
}

export interface QuestionDescriptor {
  questionId: number;
  questionNumber: number;
  optionIds: number[];
}

export interface CreateTestResponse {
  testId: number;
  title: string;
  accessCode: string | null;
  testDate: string;
  questions: QuestionDescriptor[];
}

export interface CreateGuestAccessResponse {
  guestSessionId: number;
  guestToken: string;
  expiresAt: string;
  accessCode: string | null;
}

export interface LoginAsResponse {
  jwt: string;
  role: Role;
}

/**
 * Thin client around /api/test-support/** — only registered on the backend
 * when the `e2e` Spring profile is active. Never reachable in production.
 *
 * Phase 2: client lives here, ready for use. Wiring into `hooks/world.ts`
 * happens in Phase 3 when the first fixture-requiring scenarios land.
 */
export class TestSupportClient {
  private constructor(private readonly api: APIRequestContext) {}

  static async create(): Promise<TestSupportClient> {
    const api = await request.newContext({ baseURL: env.backendURL });
    return new TestSupportClient(api);
  }

  async dispose() {
    await this.api.dispose();
  }

  private url(path: string) {
    return `${env.testSupportPath}${path}`;
  }

  async createScenario(): Promise<string> {
    const res = await this.api.post(this.url('/scenarios'));
    if (!res.ok()) throw new Error(`createScenario failed: ${res.status()} ${await res.text()}`);
    const body = await res.json();
    return body.scenarioId as string;
  }

  async createTeacher(scenarioId: string, req: CreateUserRequest): Promise<CreateUserResponse> {
    return this.post(`/scenarios/${scenarioId}/teachers`, req);
  }

  async createStudent(scenarioId: string, req: CreateUserRequest): Promise<CreateUserResponse> {
    return this.post(`/scenarios/${scenarioId}/students`, req);
  }

  async createTest(scenarioId: string, req: CreateTestRequest): Promise<CreateTestResponse> {
    return this.post(`/scenarios/${scenarioId}/tests`, req);
  }

  async createGuestAccess(
    scenarioId: string,
    req: { testId: number; expiresInHours?: number }
  ): Promise<CreateGuestAccessResponse> {
    return this.post(`/scenarios/${scenarioId}/guest-access`, req);
  }

  async loginAs(scenarioId: string, userId: number): Promise<LoginAsResponse> {
    return this.post(`/scenarios/${scenarioId}/login-as`, { userId });
  }

  async deleteScenario(scenarioId: string): Promise<void> {
    const res = await this.api.delete(this.url(`/scenarios/${scenarioId}`));
    if (!res.ok() && res.status() !== 404) {
      throw new Error(`deleteScenario failed: ${res.status()} ${await res.text()}`);
    }
  }

  private async post<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
    const res = await this.api.post(this.url(path), { data: body });
    if (!res.ok()) {
      throw new Error(`POST ${path} failed: ${res.status()} ${await res.text()}`);
    }
    return (await res.json()) as TRes;
  }
}
