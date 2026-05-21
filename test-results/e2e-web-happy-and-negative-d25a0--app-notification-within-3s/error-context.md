# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\web\happy-and-negative\notification-delivery.spec.ts >> 3.4.1 — Panic triggers in-app notification within 3s
- Location: e2e\web\happy-and-negative\notification-delivery.spec.ts:48:1

# Error details

```
TypeError: apiRequestContext.post: Invalid URL
```

# Test source

```ts
  1  | /**
  2  |  * Direct API client for E2E verification reads.
  3  |  * Returns parsed response bodies; throws on non-2xx.
  4  |  */
  5  | import { APIRequestContext } from '@playwright/test';
  6  | 
  7  | export class ApiClient {
  8  |   constructor(
  9  |     private readonly req: APIRequestContext,
  10 |     private readonly token: string,
  11 |   ) {}
  12 | 
  13 |   private headers() {
  14 |     return { Authorization: `Bearer ${this.token}` };
  15 |   }
  16 | 
  17 |   async get<T = unknown>(path: string): Promise<T> {
  18 |     const res = await this.req.get(path, { headers: this.headers() });
  19 |     if (!res.ok()) throw new Error(`GET ${path} → ${res.status()}: ${await res.text()}`);
  20 |     const body = await res.json();
  21 |     return body.data ?? body;
  22 |   }
  23 | 
  24 |   async post<T = unknown>(path: string, data?: unknown): Promise<T> {
> 25 |     const res = await this.req.post(path, {
     |                                ^ TypeError: apiRequestContext.post: Invalid URL
  26 |       headers: this.headers(),
  27 |       data: data ?? {},
  28 |     });
  29 |     if (!res.ok()) throw new Error(`POST ${path} → ${res.status()}: ${await res.text()}`);
  30 |     const body = await res.json();
  31 |     return body.data ?? body;
  32 |   }
  33 | 
  34 |   async patch<T = unknown>(path: string, data?: unknown): Promise<T> {
  35 |     const res = await this.req.patch(path, {
  36 |       headers: this.headers(),
  37 |       data: data ?? {},
  38 |     });
  39 |     if (!res.ok()) throw new Error(`PATCH ${path} → ${res.status()}: ${await res.text()}`);
  40 |     const body = await res.json();
  41 |     return body.data ?? body;
  42 |   }
  43 | 
  44 |   /** Returns the raw Response so caller can inspect status code. */
  45 |   async postRaw(path: string, data?: unknown) {
  46 |     return this.req.post(path, {
  47 |       headers: this.headers(),
  48 |       data: data ?? {},
  49 |     });
  50 |   }
  51 | 
  52 |   async getRaw(path: string) {
  53 |     return this.req.get(path, { headers: this.headers() });
  54 |   }
  55 | }
  56 | 
```