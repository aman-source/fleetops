# UI E2E Playwright Test Suite — Design

**Date:** 2026-05-21
**Scope:** Full browser UI automation across all 6 roles, 13 pages, ~65 use cases
**Approach:** `data-testid`-driven, functional-first, loose screenshots as evidence
**Execution:** Manual headed (`--headed`), isolated test environment

---

## Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Backend target | Test env `:3100` | No production data contamination |
| Frontend target | New container `:3101` | Isolated, clean DB on every run |
| Selector strategy | `data-testid` exclusively | Survives CSS/text changes, Arabic RTL ready |
| Visual testing | Screenshots as evidence only | No pixel-diff false positives across machines |
| Assertion focus | Functional (click → state change) | Production readiness, not cosmetics |
| Execution | Manual `--headed` | User watches real browser clicks |
| Role coverage | All 6 roles | Complete persona coverage |

---

## Infrastructure Changes

### 1. `docker-compose.test.yml` — add frontend-test service
```yaml
frontend-test:
  build:
    context: ./frontend
    dockerfile: Dockerfile
  ports:
    - "3101:3000"
  environment:
    NEXT_PUBLIC_API_URL: http://localhost:3100
  depends_on:
    app-test:
      condition: service_healthy
```

### 2. `e2e/web/playwright.config.ts` — add `ui` project
```ts
{
  name: 'ui',
  testDir: './ui',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.FRONTEND_TEST_URL ?? 'http://localhost:3101',
    headless: false,
    video: 'on',
    screenshot: 'on',
    viewport: { width: 1440, height: 900 },
  },
}
```

### 3. Run command
```bash
npx playwright test --config e2e/web/playwright.config.ts --project=ui --headed
```

---

## Frontend Changes — `data-testid` Wiring

Every interactive element gets a `data-testid` matching `e2e/web/helpers/selectors.ts`.
Files to modify:

| File | Selectors to add |
|------|-----------------|
| `(auth)/login/page.tsx` | AUTH.emailInput, AUTH.passwordInput, AUTH.submitButton, AUTH.errorMessage |
| `(dashboard)/journeys/page.tsx` | JOURNEY_LIST.newButton, JOURNEY_LIST.row(id), JOURNEY_LIST.statusBadge(id) |
| `(dashboard)/journeys/[id]/page.tsx` | JOURNEY_DETAIL.*, GATES.* |
| `(dashboard)/journeys/[id]/live/page.tsx` | JOURNEY_DETAIL.vehicleMarker, JOURNEY_DETAIL.etaDisplay |
| `(dashboard)/fleet/page.tsx` | VEHICLE.row(plate), VEHICLE.statusBadge(plate) |
| `(dashboard)/fleet/[id]/page.tsx` | VEHICLE.releaseButton |
| `(dashboard)/hse/page.tsx` | INCIDENT.row(id), INCIDENT.panicBanner |
| `(dashboard)/hse/[id]/page.tsx` | INCIDENT.step(n), INCIDENT.stepCompleteButton(n), INCIDENT.closeButton, INCIDENT.closureReportInput, INCIDENT.releaseVehicleButton |
| `(dashboard)/maintenance/page.tsx` | WORK_ORDER.row(id), WORK_ORDER.statusBadge(id) |
| `(dashboard)/maintenance/[id]/page.tsx` | WORK_ORDER.releaseGoButton, WORK_ORDER.releaseConditionalButton, WORK_ORDER.releaseNoGoButton, WORK_ORDER.expiryInput |
| `(dashboard)/passenger/page.tsx` | PASSENGER.* |
| `(dashboard)/analytics/page.tsx` | ANALYTICS.* |
| `(dashboard)/admin/page.tsx` | custom testids for user list, create user form, workflow list |
| `components/layout/topbar.tsx` | NOTIFICATIONS.bell, NOTIFICATIONS.list |

---

## Test File Structure

```
e2e/web/ui/
├── fixtures/
│   └── page-login.ts         # shared: navigate /login, fill, submit, wait for redirect
├── 01-auth.spec.ts
├── 02-jm-journey-lifecycle.spec.ts
├── 03-driver-pretrip.spec.ts
├── 04-hse-incident.spec.ts
├── 05-maintenance-release.spec.ts
├── 06-passenger-request.spec.ts
├── 07-admin-config.spec.ts
└── 08-analytics-fleet.spec.ts
```

---

## Use Case Coverage (65 cases)

### 01-auth.spec.ts
| # | Persona | Action | Assert |
|---|---------|--------|--------|
| 1.1 | admin | fill email+password, click Sign In | redirects to /map |
| 1.2 | jm | login | redirects to /map |
| 1.3 | hse | login | redirects to /map |
| 1.4 | maint | login | redirects to /map |
| 1.5 | driver | login | redirects to /map |
| 1.6 | passenger | login | redirects to /map |
| 1.7 | any | wrong password | AUTH.errorMessage visible |
| 1.8 | any | wrong email format | form validation fires |
| 1.9 | jm | logout | redirects to /login |

### 02-jm-journey-lifecycle.spec.ts
| # | Action | Assert |
|---|--------|--------|
| 2.1 | login as jm | /map loads |
| 2.2 | navigate to /journeys | JOURNEY_LIST.newButton visible, rows load |
| 2.3 | filter by status=active | list updates |
| 2.4 | click JOURNEY_LIST.newButton | modal opens |
| 2.5 | type in vehicle combobox | dropdown filters |
| 2.6 | select vehicle | combobox value set |
| 2.7 | type in driver combobox | dropdown filters |
| 2.8 | select driver | combobox value set |
| 2.9 | fill purpose, departure, arrival | inputs populated |
| 2.10 | click Create Journey | modal closes, journey appears in list |
| 2.11 | click journey row | navigates to /journeys/[id] |
| 2.12 | verify all 6 gates rendered | GATES.gate1Status…gate6Status visible |
| 2.13 | click gates submit | status → pending_approval OR gates block shows |
| 2.14 | click approve | JOURNEY_DETAIL.statusBadge = approved |
| 2.15 | click reject on a different journey | status → rejected |
| 2.16 | navigate to /journeys/[id]/live | map renders, ETA visible |

### 03-driver-pretrip.spec.ts
| # | Action | Assert |
|---|--------|--------|
| 3.1 | login as driver | /map loads |
| 3.2 | navigate to /journeys | approved journey visible |
| 3.3 | click journey | detail page loads |
| 3.4 | click activate | status → active |
| 3.5 | close journey | status → closed |

### 04-hse-incident.spec.ts
| # | Action | Assert |
|---|--------|--------|
| 4.1 | login as hse | /map loads |
| 4.2 | navigate to /hse | incident list loads |
| 4.3 | trigger panic via API (MQTT) | INCIDENT.panicBanner appears in browser within 5s |
| 4.4 | click incident row | /hse/[id] loads |
| 4.5 | all 6 steps rendered | INCIDENT.step(1..6) visible |
| 4.6 | click step 1 complete | step 1 marks done |
| 4.7 | complete steps 2–6 | all done |
| 4.8 | click close button | INCIDENT.closureReportInput visible |
| 4.9 | fill closure report, submit | incident status → closed |
| 4.10 | click release vehicle | vehicle status → available |

### 05-maintenance-release.spec.ts
| # | Action | Assert |
|---|--------|--------|
| 5.1 | login as maint | /map loads |
| 5.2 | navigate to /maintenance | WO list loads |
| 5.3 | filter by status=inbound | list filters |
| 5.4 | click WO row | /maintenance/[id] loads |
| 5.5 | click NOGO release | vehicle status → no_go |
| 5.6 | click GO release on different WO | vehicle status → available |
| 5.7 | click Conditional | WORK_ORDER.expiryInput appears |
| 5.8 | fill expiry, submit | vehicle status → conditional |

### 06-passenger-request.spec.ts
| # | Action | Assert |
|---|--------|--------|
| 6.1 | login as passenger | /map loads |
| 6.2 | navigate to /passenger | request form visible |
| 6.3 | fill from/to/time | inputs populated |
| 6.4 | submit request | request appears in list with status |
| 6.5 | verify request row visible | PASSENGER.requestRow(id) visible |

### 07-admin-config.spec.ts
| # | Action | Assert |
|---|--------|--------|
| 7.1 | login as admin | /map loads |
| 7.2 | navigate to /admin | user list loads |
| 7.3 | click create user | form opens |
| 7.4 | fill name/email/role/password | inputs populated |
| 7.5 | submit | new user appears in list |
| 7.6 | click workflow config tab | workflow list loads |
| 7.7 | click edit on workflow | editor opens |
| 7.8 | save workflow | success state |

### 08-analytics-fleet.spec.ts
| # | Action | Assert |
|---|--------|--------|
| 8.1 | login as jm | /map loads |
| 8.2 | navigate to /analytics | all 6 KPI tiles render with numbers |
| 8.3 | ANALYTICS.fleetUtilizationTile visible | not blank/loading |
| 8.4 | ANALYTICS.incidentsTile visible | not blank/loading |
| 8.5 | click generate report | loading state → completes |
| 8.6 | click export CSV | download starts |
| 8.7 | navigate to /fleet | vehicle list loads |
| 8.8 | filter fleet by status | list updates |
| 8.9 | click vehicle row | /fleet/[id] loads |
| 8.10 | click documents tab | documents listed with expiry dates |
| 8.11 | click IVMS tab | device status, last seen visible |

### RBAC Negative Tests (in auth.spec.ts)
| # | Persona | Action | Assert |
|---|---------|--------|--------|
| 9.1 | driver | navigate to /admin | redirected away |
| 9.2 | passenger | navigate to /fleet | redirected away |
| 9.3 | passenger | navigate to /journeys | redirected away |

---

## Screenshot Convention

Every spec takes screenshots at key checkpoints:
```ts
await page.screenshot({ path: `screenshots/${specName}/${stepName}.png`, fullPage: true });
```

Stored in `e2e/web/screenshots/` — gitignored, reviewed manually.

---

## Shared Login Helper

```ts
// e2e/web/ui/fixtures/page-login.ts
export async function loginAs(page: Page, role: 'admin'|'jm'|'hse'|'maint'|'driver'|'passenger') {
  const creds = {
    admin:     { email: 'admin@artech.om',   password: 'Fleetops@2026' },
    jm:        { email: 'jm@artech.om',      password: 'Fleetops@2026' },
    hse:       { email: 'hse@artech.om',     password: 'Fleetops@2026' },
    maint:     { email: 'maint@artech.om',   password: 'Fleetops@2026' },
    driver:    { email: 'driver1@artech.om', password: 'Fleetops@2026' },
    passenger: { email: 'pax@artech.om',     password: 'Fleetops@2026' },
  };
  await page.goto('/login');
  await page.getByTestId('auth-email-input').fill(creds[role].email);
  await page.getByTestId('auth-password-input').fill(creds[role].password);
  await page.getByTestId('auth-submit-button').click();
  await page.waitForURL(/\/(map|journeys|hse|maintenance|passenger)/);
}
```

---

## Implementation Order

1. **Infrastructure** — docker-compose frontend-test service + playwright `ui` project config
2. **Selectors wiring** — add `data-testid` to all 14 frontend files
3. **Shared login fixture** — `page-login.ts`
4. **Test files** — 01 through 08, one at a time
5. **Run + fix loop** — `--headed` watch, fix testids/assertions, repeat

---

## Success Criteria

- All 65+ cases pass against test env
- Browser visibly clicks through every flow
- Screenshots saved for every key step
- Zero tests depend on text content (only testids + URL patterns + element visibility)
