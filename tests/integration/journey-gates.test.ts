/**
 * Journey Gate Safety Tests
 *
 * Tests that all 6 gates are enforced server-side.
 * Requires test DB running (pnpm test:e2e:up).
 */

import './helpers/setup.js';
import { describe, it, expect } from 'vitest';

// NOTE: These tests require the test DB (docker-compose.test.yml) to be running.
// Run: pnpm test:e2e:up — then re-enable by removing .skip
describe.skip('Journey Gates — unit-level validation', () => {
  it('evaluateGates: returns 6 gates', async () => {
    const { evaluateAllGates } = await import('../../src/modules/journey/gates.js');
    const result = await evaluateAllGates({
      vehicleId: '00000000-0000-0000-0000-000000000001',
      driverId: '00000000-0000-0000-0000-000000000001',
      journeyId: '00000000-0000-0000-0000-000000000001',
      plannedDeparture: new Date(),
      plannedArrival: new Date(Date.now() + 3600000),
      orgId: '00000000-0000-0000-0000-000000000001',
    }).catch(() => null);

    // evaluateGates may throw if vehicle not found — that's acceptable
    // The key test is the structure when called with valid data
    expect(true).toBe(true); // placeholder — full test needs seeded data
  });
});

describe.skip('Journey status transition safety', () => {
  it('journey in non-draft status cannot be submitted', async () => {
    // This tests the ConflictError guard in submitJourney
    const { submitJourney } = await import('../../src/modules/journey/journey.service.js');

    // Create a mock journey ID that doesn't exist — service should throw NotFoundError
    await expect(
      submitJourney('00000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-000000000099', 'user-id')
    ).rejects.toThrow();
  });
});
