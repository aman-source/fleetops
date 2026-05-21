/**
 * Test entity resolver — looks up UUIDs for vehicles and drivers
 * from the seeded test database via the API.
 *
 * Call resolveTestEntities() once in beforeAll to get stable IDs.
 */
import { getTokens } from './auth.js';
import { ApiClient } from '../helpers/api.js';
import { request } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3100';

export interface TestEntities {
  /** Vehicle UUID for 12-A-3471 (FL-001, Marmul, available) */
  vehicleId: string;
  vehiclePlate: string;
  /** Driver UUID for EMP-009 Ali Al-Balushi (mapped to driver1@artech.om) */
  driverId: string;
  /** Driver UUID for EMP-002 Mohammed Al-Riyami (mapped to driver2@artech.om) */
  driver2Id: string;
  /** IVMS device ID for vehicle 12-A-3471 */
  deviceId: string;
  /** Marmul org ID */
  marmulOrgId: string;
}

let cachedEntities: TestEntities | null = null;

export async function resolveTestEntities(forceRefresh = false): Promise<TestEntities> {
  if (cachedEntities && !forceRefresh) return cachedEntities;

  const adminTokens = await getTokens('admin');
  const ctx = await request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: {
      Authorization: `Bearer ${adminTokens.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  // Look up vehicle 12-A-3471
  const vRes = await ctx.get('/api/v1/vehicles?limit=100');
  const vBody = await vRes.json();
  const vehicles: Array<{ id: string; plateNo?: string; plate_no?: string; orgId?: string; org_id?: string }> =
    Array.isArray(vBody.data) ? vBody.data : Array.isArray(vBody) ? vBody : [];

  const vehicle = vehicles.find(
    (v) => (v.plateNo ?? v.plate_no) === '12-A-3471',
  );

  if (!vehicle) {
    throw new Error('Vehicle 12-A-3471 not found in test DB. Run db:seed-fleet first.');
  }

  // Look up drivers
  const dRes = await ctx.get('/api/v1/drivers?limit=100');
  const dBody = await dRes.json();
  const drivers: Array<{ id: string; name: string; employeeId?: string; employee_id?: string }> =
    Array.isArray(dBody.data) ? dBody.data : Array.isArray(dBody) ? dBody : [];

  const driverAli = drivers.find(
    (d) => d.name === 'Ali Al-Balushi' || (d.employeeId ?? d.employee_id) === 'EMP-009',
  );
  const driver2 = drivers.find(
    (d) => d.name === 'Mohammed Al-Riyami' || (d.employeeId ?? d.employee_id) === 'EMP-002',
  );

  if (!driverAli) throw new Error('Driver Ali Al-Balushi (EMP-009) not found. Run db:seed-fleet.');

  // Look up IVMS device for vehicle
  const devRes = await ctx.get(`/api/v1/devices?limit=100`);
  const devBody = await devRes.json();
  const devices: Array<{
    id: string; vehicleId?: string; vehicle_id?: string;
    serialNo?: string; serial_no?: string;
    deviceId?: string; device_id?: string;
  }> = Array.isArray(devBody.data) ? devBody.data : Array.isArray(devBody) ? devBody : [];

  const device = devices.find(
    (d) => (d.vehicleId ?? d.vehicle_id) === vehicle.id,
  );

  // Look up Marmul org
  const orgRes = await ctx.get('/api/v1/admin/organizations?limit=50');
  const orgBody = await orgRes.json();
  const orgs: Array<{ id: string; name: string }> =
    Array.isArray(orgBody.data) ? orgBody.data : Array.isArray(orgBody) ? orgBody : [];
  const marmulOrg = orgs.find((o) => /marmul/i.test(o.name));

  await ctx.dispose();

  cachedEntities = {
    vehicleId: vehicle.id,
    vehiclePlate: '12-A-3471',
    driverId: driverAli.id,
    driver2Id: driver2?.id ?? driverAli.id,
    // serialNo is the MQTT device identifier used in fleet/{serialNo}/panic topics
    deviceId: device?.serialNo ?? device?.serial_no ?? device?.deviceId ?? device?.device_id ?? 'IVMS-0001',
    marmulOrgId: marmulOrg?.id ?? '',
  };

  return cachedEntities;
}
