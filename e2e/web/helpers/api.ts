/**
 * Direct API client for E2E verification reads.
 * Returns parsed response bodies; throws on non-2xx.
 */
import { APIRequestContext } from '@playwright/test';

export class ApiClient {
  constructor(
    private readonly req: APIRequestContext,
    private readonly token: string,
  ) {}

  private headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async get<T = unknown>(path: string): Promise<T> {
    const res = await this.req.get(path, { headers: this.headers() });
    if (!res.ok()) throw new Error(`GET ${path} → ${res.status()}: ${await res.text()}`);
    const body = await res.json();
    return body.data ?? body;
  }

  async post<T = unknown>(path: string, data?: unknown): Promise<T> {
    const res = await this.req.post(path, {
      headers: this.headers(),
      data: data ?? {},
    });
    if (!res.ok()) throw new Error(`POST ${path} → ${res.status()}: ${await res.text()}`);
    const body = await res.json();
    return body.data ?? body;
  }

  async patch<T = unknown>(path: string, data?: unknown): Promise<T> {
    const res = await this.req.patch(path, {
      headers: this.headers(),
      data: data ?? {},
    });
    if (!res.ok()) throw new Error(`PATCH ${path} → ${res.status()}: ${await res.text()}`);
    const body = await res.json();
    return body.data ?? body;
  }

  /** Returns the raw Response so caller can inspect status code. */
  async postRaw(path: string, data?: unknown) {
    return this.req.post(path, {
      headers: this.headers(),
      data: data ?? {},
    });
  }

  async getRaw(path: string) {
    return this.req.get(path, { headers: this.headers() });
  }
}
