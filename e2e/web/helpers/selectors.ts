/**
 * Central testid map — single source of truth for all data-testid values.
 *
 * Rules:
 * - kebab-case, scope-prefixed
 * - For lists, use deterministic keys: vehicle-row-12-A-3471
 * - Tests use page.getByTestId(...) exclusively for interactive flows
 */

// ── Auth ──────────────────────────────────────────────────────────────────────
export const AUTH = {
  emailInput: 'auth-email-input',
  passwordInput: 'auth-password-input',
  submitButton: 'auth-submit-button',
  mfaCodeInput: 'auth-mfa-code-input',
  mfaSubmitButton: 'auth-mfa-submit-button',
  errorMessage: 'auth-error-message',
} as const;

// ── Journey Composer (Screen 02) ──────────────────────────────────────────────
export const JOURNEY_COMPOSER = {
  vehicleSelect: 'journey-composer-vehicle-select',
  driverSelect: 'journey-composer-driver-select',
  routeSelect: 'journey-composer-route-select',
  departureDateInput: 'journey-composer-departure-date',
  departureTimeInput: 'journey-composer-departure-time',
  arrivalDateInput: 'journey-composer-arrival-date',
  arrivalTimeInput: 'journey-composer-arrival-time',
  purposeInput: 'journey-composer-purpose-input',
  saveDraftButton: 'journey-composer-save-draft',
  submitButton: 'journey-composer-submit',
  passengerCountInput: 'journey-composer-passenger-count',
} as const;

// ── Journey Gates ─────────────────────────────────────────────────────────────
export const GATES = {
  gate1Status: 'gate-1-status',
  gate2Status: 'gate-2-status',
  gate3Status: 'gate-3-status',
  gate4Status: 'gate-4-status',
  gate5Status: 'gate-5-status',
  gate6Status: 'gate-6-status',
  gatePanel: (n: number) => `gate-${n}-panel`,
  submitButton: 'gates-submit-button',
  canSubmitBadge: 'gates-can-submit-badge',
} as const;

// ── Journey List ──────────────────────────────────────────────────────────────
export const JOURNEY_LIST = {
  row: (id: string) => `journey-row-${id}`,
  statusBadge: (id: string) => `journey-status-${id}`,
  newButton: 'journey-list-new-button',
} as const;

// ── Journey Detail ────────────────────────────────────────────────────────────
export const JOURNEY_DETAIL = {
  statusBadge: 'journey-detail-status',
  approveButton: 'journey-detail-approve-button',
  rejectButton: 'journey-detail-reject-button',
  activateButton: 'journey-detail-activate-button',
  closeButton: 'journey-detail-close-button',
  vehicleMarker: 'journey-live-vehicle-marker',
  routeLine: 'journey-live-route-line',
  etaDisplay: 'journey-live-eta',
} as const;

// ── Checklist (Driver Pre-trip) ───────────────────────────────────────────────
export const CHECKLIST = {
  startButton: 'checklist-start-pretrip',
  itemRow: (n: number) => `checklist-item-${n}`,
  itemPassButton: (n: number) => `checklist-item-${n}-pass`,
  itemFailButton: (n: number) => `checklist-item-${n}-fail`,
  itemNoteInput: (n: number) => `checklist-item-${n}-note`,
  itemPhotoButton: (n: number) => `checklist-item-${n}-photo`,
  submitButton: 'checklist-submit',
  offlineBanner: 'checklist-offline-banner',
  syncQueueBadge: 'checklist-sync-queue',
} as const;

// ── Vehicle ───────────────────────────────────────────────────────────────────
export const VEHICLE = {
  row: (plate: string) => `vehicle-row-${plate.replace(/\s/g, '-')}`,
  statusBadge: (plate: string) => `vehicle-status-${plate.replace(/\s/g, '-')}`,
  releaseButton: 'vehicle-release-button',
} as const;

// ── Work Order ────────────────────────────────────────────────────────────────
export const WORK_ORDER = {
  row: (id: string) => `wo-row-${id}`,
  statusBadge: (id: string) => `wo-status-${id}`,
  hseApproveButton: 'wo-hse-approve-button',
  releaseGoButton: 'wo-release-go-button',
  releaseConditionalButton: 'wo-release-conditional-button',
  releaseNoGoButton: 'wo-release-nogo-button',
  expiryInput: 'wo-conditional-expiry-input',
} as const;

// ── Incident / HSE Console ────────────────────────────────────────────────────
export const INCIDENT = {
  row: (id: string) => `incident-row-${id}`,
  paniBanner: 'panic-banner',
  step: (n: number) => `incident-step-${n}`,
  stepCompleteButton: (n: number) => `incident-step-${n}-complete`,
  closeButton: 'incident-close-button',
  closureReportInput: 'incident-closure-report',
  releaseVehicleButton: 'incident-release-vehicle-button',
} as const;

// ── Passengers ────────────────────────────────────────────────────────────────
export const PASSENGER = {
  requestPickupButton: 'passenger-request-pickup-button',
  fromInput: 'passenger-request-from',
  toInput: 'passenger-request-to',
  timeInput: 'passenger-request-time',
  submitButton: 'passenger-request-submit',
  requestRow: (id: string) => `passenger-request-row-${id}`,
  boardingQrInput: 'passenger-boarding-qr-input',
  myTripVehicleMarker: 'passenger-mytrip-vehicle-marker',
  myTripEta: 'passenger-mytrip-eta',
} as const;

// ── Analytics / Dashboard ─────────────────────────────────────────────────────
export const ANALYTICS = {
  fleetUtilizationTile: 'analytics-fleet-utilization',
  onTimeTile: 'analytics-on-time',
  noGoRateTile: 'analytics-nogo-rate',
  incidentsTile: 'analytics-incidents',
  driverScoreTile: 'analytics-driver-score',
  ltiDaysTile: 'analytics-lti-days',
  generateReportButton: 'analytics-generate-report',
  exportCsvButton: 'analytics-export-csv',
} as const;

// ── Notifications ─────────────────────────────────────────────────────────────
export const NOTIFICATIONS = {
  bell: 'notifications-bell',
  list: 'notifications-list',
  item: (id: string) => `notification-item-${id}`,
} as const;
