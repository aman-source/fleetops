/**
 * Fleet seed script — run with: pnpm tsx src/infra/db/seed-fleet.ts
 * Creates 20 vehicles, 15 drivers, 20 devices with realistic Omani data.
 * Requires base seed (seed.ts) to run first for organizations.
 */
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { organizations } from './schema/organizations.js';
import { vehicles } from './schema/vehicles.js';
import { drivers } from './schema/drivers.js';
import { devices } from './schema/devices.js';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://fleetops:fleetops_secret@localhost:5432/fleetops';
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

async function seedFleet() {
  console.log('Seeding fleet data...\n');

  // Find orgs
  const orgs = await db.select().from(organizations);
  const marmul = orgs.find((o) => o.name === 'Marmul Operations');
  const nimr = orgs.find((o) => o.name === 'Nimr-2 Operations');
  const arTech = orgs.find((o) => o.type === 'company');
  const workshop = orgs.find((o) => o.type === 'workshop');

  if (!marmul || !nimr || !arTech || !workshop) {
    throw new Error('Run base seed first: pnpm db:seed');
  }

  // ── Vehicles ──
  console.log('Creating 20 vehicles...');
  const vehicleData = [
    { plateNo: '12-A-3471', fleetNo: 'FL-001', make: 'Toyota', model: 'Land Cruiser 300', year: 2024, type: 'light', seatCount: 5, status: 'available', projectId: marmul.id },
    { plateNo: '8-B-1290', fleetNo: 'FL-002', make: 'Toyota', model: 'Land Cruiser 300', year: 2024, type: 'light', seatCount: 5, status: 'available', projectId: marmul.id },
    { plateNo: '15-C-4521', fleetNo: 'FL-003', make: 'Toyota', model: 'Hilux', year: 2023, type: 'light', seatCount: 5, status: 'available', projectId: marmul.id },
    { plateNo: '3-A-7891', fleetNo: 'FL-004', make: 'Toyota', model: 'Hilux', year: 2023, type: 'light', seatCount: 5, status: 'conditional', projectId: marmul.id },
    { plateNo: '22-D-1156', fleetNo: 'FL-005', make: 'Nissan', model: 'Patrol', year: 2024, type: 'light', seatCount: 7, status: 'available', projectId: marmul.id },
    { plateNo: '7-A-3322', fleetNo: 'FL-006', make: 'Toyota', model: 'Coaster', year: 2022, type: 'bus', seatCount: 26, status: 'available', projectId: marmul.id },
    { plateNo: '11-B-5567', fleetNo: 'FL-007', make: 'Toyota', model: 'Coaster', year: 2022, type: 'bus', seatCount: 26, status: 'under_maintenance', projectId: marmul.id },
    { plateNo: '4-C-8901', fleetNo: 'FL-008', make: 'Mitsubishi', model: 'Rosa', year: 2023, type: 'bus', seatCount: 32, status: 'available', projectId: marmul.id },
    { plateNo: '19-A-2345', fleetNo: 'FL-009', make: 'MAN', model: 'TGS 33.400', year: 2021, type: 'truck', seatCount: 3, status: 'available', projectId: marmul.id },
    { plateNo: '6-D-6789', fleetNo: 'FL-010', make: 'MAN', model: 'TGS 33.400', year: 2021, type: 'truck', seatCount: 3, status: 'no_go', projectId: marmul.id },
    { plateNo: '14-A-1122', fleetNo: 'FL-011', make: 'Toyota', model: 'Land Cruiser 300', year: 2024, type: 'light', seatCount: 5, status: 'available', projectId: nimr.id },
    { plateNo: '9-B-3344', fleetNo: 'FL-012', make: 'Toyota', model: 'Land Cruiser 300', year: 2023, type: 'light', seatCount: 5, status: 'available', projectId: nimr.id },
    { plateNo: '21-C-5566', fleetNo: 'FL-013', make: 'Toyota', model: 'Hilux', year: 2023, type: 'light', seatCount: 5, status: 'available', projectId: nimr.id },
    { plateNo: '2-A-7788', fleetNo: 'FL-014', make: 'Nissan', model: 'Patrol', year: 2024, type: 'light', seatCount: 7, status: 'expired_documents', projectId: nimr.id },
    { plateNo: '16-D-9900', fleetNo: 'FL-015', make: 'Toyota', model: 'Coaster', year: 2022, type: 'bus', seatCount: 26, status: 'available', projectId: nimr.id },
    { plateNo: '5-B-1234', fleetNo: 'FL-016', make: 'Toyota', model: 'Coaster', year: 2021, type: 'bus', seatCount: 26, status: 'ivms_fault', projectId: nimr.id },
    { plateNo: '18-C-5678', fleetNo: 'FL-017', make: 'CAT', model: '320 GC', year: 2022, type: 'excavator', seatCount: 1, status: 'available', projectId: marmul.id },
    { plateNo: '10-A-9012', fleetNo: 'FL-018', make: 'CAT', model: '950 GC', year: 2023, type: 'excavator', seatCount: 1, status: 'available', projectId: marmul.id },
    { plateNo: '1-D-3456', fleetNo: 'FL-019', make: 'Hino', model: '700 Series', year: 2022, type: 'tanker', seatCount: 3, status: 'available', projectId: marmul.id },
    { plateNo: '20-B-7890', fleetNo: 'FL-020', make: 'Hino', model: '500 Series', year: 2023, type: 'tanker', seatCount: 3, status: 'hse_hold', projectId: nimr.id },
  ];

  const insertedVehicles = await db.insert(vehicles).values(
    vehicleData.map((v) => ({
      ...v,
      orgId: arTech.id,
      odometer: 10000 + Math.floor(Math.random() * 90000),
      engineHours: 500 + Math.floor(Math.random() * 4500),
      conditionalExpiry: v.status === 'conditional' ? new Date(Date.now() + 72 * 60 * 60 * 1000) : null,
    })),
  ).returning();

  console.log(`  Created ${insertedVehicles.length} vehicles`);

  // ── Drivers ──
  console.log('Creating 15 drivers...');
  const driverData = [
    { name: 'Salim Al-Harthi', employeeId: 'EMP-001', licenseNo: 'OM-DL-45891', licenseClass: 'D', authorizedTypes: ['light', 'bus'] },
    { name: 'Mohammed Al-Riyami', employeeId: 'EMP-002', licenseNo: 'OM-DL-33201', licenseClass: 'D', authorizedTypes: ['light', 'bus'] },
    { name: 'Hamad Al-Wahaibi', employeeId: 'EMP-003', licenseNo: 'OM-DL-78123', licenseClass: 'E', authorizedTypes: ['light', 'bus', 'truck'] },
    { name: 'Abdullah Al-Hinai', employeeId: 'EMP-004', licenseNo: 'OM-DL-55678', licenseClass: 'C', authorizedTypes: ['light'] },
    { name: 'Nasser Al-Mashani', employeeId: 'EMP-005', licenseNo: 'OM-DL-91234', licenseClass: 'E', authorizedTypes: ['light', 'truck', 'tanker'] },
    { name: 'Khalfan Al-Amri', employeeId: 'EMP-006', licenseNo: 'OM-DL-12567', licenseClass: 'D', authorizedTypes: ['light', 'bus'] },
    { name: 'Rashid Al-Ghafri', employeeId: 'EMP-007', licenseNo: 'OM-DL-67890', licenseClass: 'C', authorizedTypes: ['light'] },
    { name: 'Sultan Al-Maawali', employeeId: 'EMP-008', licenseNo: 'OM-DL-23456', licenseClass: 'E', authorizedTypes: ['light', 'truck', 'excavator'] },
    { name: 'Ali Al-Balushi', employeeId: 'EMP-009', licenseNo: 'OM-DL-89012', licenseClass: 'D', authorizedTypes: ['light', 'bus'] },
    { name: 'Omar Al-Siyabi', employeeId: 'EMP-010', licenseNo: 'OM-DL-34567', licenseClass: 'C', authorizedTypes: ['light'] },
    { name: 'Yousef Al-Jabri', employeeId: 'EMP-011', licenseNo: 'OM-DL-56789', licenseClass: 'E', authorizedTypes: ['light', 'truck', 'tanker'] },
    { name: 'Hamed Al-Busaidi', employeeId: 'EMP-012', licenseNo: 'OM-DL-01234', licenseClass: 'D', authorizedTypes: ['light', 'bus'] },
    { name: 'Majid Al-Lawati', employeeId: 'EMP-013', licenseNo: 'OM-DL-45678', licenseClass: 'C', authorizedTypes: ['light', 'excavator'] },
    { name: 'Badr Al-Kindi', employeeId: 'EMP-014', licenseNo: 'OM-DL-90123', licenseClass: 'D', authorizedTypes: ['light', 'bus'] },
    { name: 'Faisal Al-Zadjali', employeeId: 'EMP-015', licenseNo: 'OM-DL-67801', licenseClass: 'E', authorizedTypes: ['light', 'truck', 'tanker'] },
  ];

  const futureDate = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  };

  const insertedDrivers = await db.insert(drivers).values(
    driverData.map((d) => ({
      ...d,
      licenseExpiry: futureDate(6 + Math.floor(Math.random() * 18)),
      ddcExpiry: futureDate(3 + Math.floor(Math.random() * 12)),
      medicalExpiry: futureDate(6 + Math.floor(Math.random() * 12)),
      nfcCardUid: `04:${rand2()}:${rand2()}:${rand2()}`,
      nfcIssuedAt: new Date(),
      score: (70 + Math.random() * 30).toFixed(2),
      orgId: arTech.id,
    })),
  ).returning();

  console.log(`  Created ${insertedDrivers.length} drivers`);

  // ── Devices ──
  console.log('Creating 20 IVMS devices...');
  const insertedDevices = await db.insert(devices).values(
    insertedVehicles.map((v, i) => ({
      type: 'ivms' as const,
      serialNo: `IVMS-${String(i + 1).padStart(4, '0')}`,
      imei: `35${String(1000000000000 + Math.floor(Math.random() * 9000000000000))}`.slice(0, 15),
      simNo: `+968 7${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`,
      vehicleId: v.id,
      firmware: 'v2.4.1',
      healthStatus: v.status === 'ivms_fault' ? 'fault' : 'online',
      lastSeen: new Date(),
      gpsQuality: 80 + Math.floor(Math.random() * 20),
      batteryPct: 60 + Math.floor(Math.random() * 40),
      orgId: arTech.id,
    })),
  ).returning();

  console.log(`  Created ${insertedDevices.length} devices`);

  console.log('\nFleet seed complete.');
  await pool.end();
  process.exit(0);
}

function rand2(): string {
  return Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, '0');
}

seedFleet().catch((err) => {
  console.error('Fleet seed failed:', err);
  process.exit(1);
});
