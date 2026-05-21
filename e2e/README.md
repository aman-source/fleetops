# Fleetops E2E Test Suite

## Quick Start

```bash
# 1. Start test environment (fresh Postgres, Redis, MQTT, MinIO, app)
pnpm test:e2e:up

# 2. Run all suites
pnpm test:e2e

# 3. Run specific tiers
pnpm test:e2e:journeys     # Tier 1 — full workflows
pnpm test:e2e:safety       # Tier 2 — safety & RBAC
pnpm test:e2e:tier3        # Tier 3 — focused paths

# 4. Run by keyword
pnpm test:e2e -- --grep "panic"

# 5. Tear down
pnpm test:e2e:down
```

## Architecture

- **Backend:** Real Postgres + Redis + MQTT + MinIO (no mocks) via `docker-compose.test.yml`
- **Test DB:** `fleetops_test` on port 5433 (isolated from dev DB on 5432)
- **App:** `app-test` on port 3100
- **Tier 1:** Journey-based serial specs — each file is one full workflow
- **Tier 2:** Safety paths — bypass attempts, status blocking, RBAC
- **Tier 3:** Focused unit-of-functionality paths

## The No-Weakening Rule

**NEVER weaken an assertion to make a failing test pass.**

- ❌ Do NOT add `.skip()` to make failures go away
- ❌ Do NOT lower a threshold (e.g. `toBe(3)` → `toBeGreaterThan(0)`)
- ❌ Do NOT loosen a selector just to find an element
- ❌ Do NOT mock the backend response
- ❌ Do NOT swallow failures with `try { } catch {}`

If a test fails:
- ✅ The **functionality** is wrong — fix the functionality
- ✅ If spec is ambiguous → STOP, report, ask
- ✅ If functionality is missing → STOP, report, ask (use `test.fixme()` with blocker comment)
- ✅ If selector missing → ADD a `data-testid` attribute, then use it
- ✅ If flaky timing → use `waitFor` / `expect().toPass()` retries

## Test User Personas

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@artech.om | Test1234! |
| Journey Manager (Marmul) | jm.marmul@artech.om | Test1234! |
| Journey Manager (Nimr-2) | jm.nimr@artech.om | Test1234! |
| HSE Officer | hse@artech.om | Test1234! |
| GM | gm@artech.om | Test1234! |
| Maintenance | maint@artech.om | Test1234! |
| Driver Ali | ali@artech.om | Test1234! |
| Driver Khalid | khalid@artech.om | Test1234! |
| Passenger Amal | passenger.amal@artech.om | Test1234! |
| Passenger Zaid (no entitlement) | passenger.zaid@artech.om | Test1234! |

## Directory Structure

```
e2e/
├── web/
│   ├── playwright.config.ts
│   ├── fixtures/
│   │   ├── seed.ts          — fullSeed(), reset(), resetTenant()
│   │   ├── auth.ts          — getTokens(), apiAs(), test fixture
│   │   ├── mqtt-publisher.ts — publishTelemetry, publishPanic, publishNfc
│   │   └── ws-listener.ts   — subscribeRoom() for WebSocket assertions
│   ├── helpers/
│   │   ├── api.ts           — ApiClient wrapper
│   │   ├── db.ts            — Read-only DB helpers
│   │   ├── time.ts          — omanTime(), futureDateString()
│   │   └── selectors.ts     — Central data-testid map
│   ├── journeys/            — Tier 1: full role workflows
│   ├── safety/              — Tier 2: safety & RBAC
│   └── happy-and-negative/  — Tier 3: focused paths
└── mobile/
    ├── maestro/             — Maestro YAML flows (preferred for Expo)
    └── playwright/          — Playwright on Expo web build (fallback)
```

## Adding a New Test

1. **Add `data-testid`** to the component being tested
2. **Register** the testid in `helpers/selectors.ts`
3. **Write the test** using `page.getByTestId(SELECTORS.xxx)` for interactive flows
4. **Verify** the test fails with a deliberately broken backend before merging

## Debugging Failed Tests

```bash
# Run with UI mode
cd e2e/web && pnpm exec playwright test --ui

# View HTML report
pnpm exec playwright show-report

# Run with trace
cd e2e/web && pnpm exec playwright test --trace on
```

Playwright HTML report + DB state snapshot at failure time is attached as CI artifact.

## Mobile Tests (Maestro)

```bash
# Install Maestro
curl -fsSL "https://get.maestro.mobile.dev" | bash

# Run a flow
maestro test e2e/mobile/maestro/driver-today.yaml

# Run all flows
maestro test e2e/mobile/maestro/
```

Maestro flows use the same `data-testid` convention via the `testID` prop on React Native components.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `E2E_BASE_URL` | `http://localhost:3100` | App-test URL |
| `TEST_DATABASE_URL` | `postgresql://...@localhost:5433/fleetops_test` | Test DB |
| `TEST_MQTT_URL` | `mqtt://localhost:1884` | Mosquitto test |
| `TEST_WS_URL` | `ws://localhost:3100` | WebSocket |
