/**
 * Operations seed — run with: pnpm tsx src/infra/db/seed-operations.ts
 * Creates journeys, documents, work orders, events, incidents, tires, driver scores.
 * Requires base seed (seed.ts) + fleet seed (seed-fleet.ts) first.
 */
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import { organizations } from './schema/organizations';
import { vehicles } from './schema/vehicles';
import { drivers } from './schema/drivers';
import { users } from './schema/users';
import { journeys, journeyPassengers, journeyWaypoints, journeyApprovals } from './schema/journeys';
import { documents } from './schema/documents';
import { workOrders, workOrderParts, workOrderActivity, tires } from './schema/maintenance';
import { events } from './schema/events';
import { incidents, incidentSteps, driverScores } from './schema/hse';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://fleetops:fleetops_secret@localhost:5432/fleetops';
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

// ── Helpers ──
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000);
const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000);
const futureDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};
const pastDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

async function seedOperations() {
  console.log('Seeding operations data...\n');

  // ── Clean previous operations data (order matters for FK) ──
  console.log('Cleaning previous operations data...');
  await db.execute(sql`DELETE FROM incident_steps`);
  await db.execute(sql`DELETE FROM incidents`);
  await db.execute(sql`DELETE FROM driver_scores`);
  await db.execute(sql`DELETE FROM work_order_activity`);
  await db.execute(sql`DELETE FROM work_order_photos`);
  await db.execute(sql`DELETE FROM work_order_parts`);
  await db.execute(sql`DELETE FROM tires`);
  await db.execute(sql`DELETE FROM work_orders`);
  await db.execute(sql`DELETE FROM events`);
  await db.execute(sql`DELETE FROM journey_approvals`);
  await db.execute(sql`DELETE FROM journey_passengers`);
  await db.execute(sql`DELETE FROM journey_waypoints`);
  await db.execute(sql`DELETE FROM journeys`);
  await db.execute(sql`DELETE FROM documents`);
  console.log('  Cleaned.\n');

  // ── Fetch existing records ──
  const orgs = await db.select().from(organizations);
  const arTech = orgs.find(o => o.type === 'company')!;
  const marmul = orgs.find(o => o.name === 'Marmul Operations')!;
  const nimr = orgs.find(o => o.name === 'Nimr-2 Operations')!;

  const allVehicles = await db.select().from(vehicles);
  const allDrivers = await db.select().from(drivers);
  const allUsers = await db.select().from(users);

  const adminUser = allUsers.find(u => u.email === 'admin@artech.om')!;
  const jmUser = allUsers.find(u => u.email === 'jm@artech.om')!;
  const hseUser = allUsers.find(u => u.email === 'hse@artech.om')!;
  const maintUser = allUsers.find(u => u.email === 'maint@artech.om')!;

  if (!arTech || allVehicles.length === 0 || allDrivers.length === 0) {
    throw new Error('Run base seed + fleet seed first');
  }

  console.log(`  Found ${allVehicles.length} vehicles, ${allDrivers.length} drivers, ${allUsers.length} users\n`);

  // ═══════════════════════════════════════════════════════════════
  // 1. DOCUMENTS — vehicle + driver documents
  // ═══════════════════════════════════════════════════════════════
  console.log('Creating documents...');
  const vehicleDocs = allVehicles.flatMap(v => [
    { entityType: 'vehicle', entityId: v.id, documentType: 'mulkia', referenceNo: `MUL-${rand(10000, 99999)}`, issuedDate: pastDate(180), expiryDate: futureDate(rand(15, 365)), status: 'valid', orgId: arTech.id },
    { entityType: 'vehicle', entityId: v.id, documentType: 'insurance', referenceNo: `INS-${rand(10000, 99999)}`, issuedDate: pastDate(300), expiryDate: futureDate(rand(30, 200)), status: 'valid', orgId: arTech.id },
    { entityType: 'vehicle', entityId: v.id, documentType: 'ras', referenceNo: `RAS-${rand(10000, 99999)}`, issuedDate: pastDate(90), expiryDate: futureDate(rand(60, 270)), status: 'valid', orgId: arTech.id },
    { entityType: 'vehicle', entityId: v.id, documentType: 'site_permit', referenceNo: `PDO-${rand(10000, 99999)}`, issuedDate: pastDate(60), expiryDate: futureDate(rand(20, 180)), status: 'valid', orgId: arTech.id },
    { entityType: 'vehicle', entityId: v.id, documentType: 'fire_extinguisher', referenceNo: `FE-${rand(1000, 9999)}`, issuedDate: pastDate(45), expiryDate: futureDate(rand(90, 365)), status: 'valid', orgId: arTech.id },
  ]);

  // Mark some as expiring/expired
  vehicleDocs[2].expiryDate = futureDate(18); vehicleDocs[2].status = 'expiring';
  vehicleDocs[7].expiryDate = pastDate(5); vehicleDocs[7].status = 'expired';
  vehicleDocs[12].expiryDate = futureDate(6); vehicleDocs[12].status = 'expiring';
  vehicleDocs[22].expiryDate = pastDate(2); vehicleDocs[22].status = 'expired';

  const driverDocs = allDrivers.flatMap(d => [
    { entityType: 'driver', entityId: d.id, documentType: 'license', referenceNo: d.licenseNo, issuedDate: pastDate(365), expiryDate: futureDate(rand(60, 540)), status: 'valid', orgId: arTech.id },
    { entityType: 'driver', entityId: d.id, documentType: 'ddc', referenceNo: `DDC-${rand(1000, 9999)}`, issuedDate: pastDate(200), expiryDate: futureDate(rand(30, 365)), status: 'valid', orgId: arTech.id },
    { entityType: 'driver', entityId: d.id, documentType: 'medical', referenceNo: `MED-${rand(1000, 9999)}`, issuedDate: pastDate(150), expiryDate: futureDate(rand(60, 365)), status: 'valid', orgId: arTech.id },
  ]);

  driverDocs[4].expiryDate = futureDate(12); driverDocs[4].status = 'expiring';
  driverDocs[10].expiryDate = futureDate(5); driverDocs[10].status = 'expiring';

  await db.insert(documents).values([...vehicleDocs, ...driverDocs]);
  console.log(`  Created ${vehicleDocs.length} vehicle docs + ${driverDocs.length} driver docs`);

  // ═══════════════════════════════════════════════════════════════
  // 2. JOURNEYS — mix of statuses
  // ═══════════════════════════════════════════════════════════════
  console.log('Creating journeys...');

  const PURPOSES = [
    'Crew change - Marmul to Nimr', 'Material transport - Workshop to Field',
    'Well visit - Nimr-2 site inspection', 'Passenger transfer - Camp to airstrip',
    'Equipment delivery - Fahud to Bahja', 'HSE audit - Saih Rawl facilities',
    'Night crew rotation - Base camp', 'Emergency response drill - Block 6',
    'Geologist survey - Interior road', 'Supply run - Lekhwair depot',
    'VIP escort - Marmul HQ', 'Tire replacement run - Mobile workshop',
    'Water tanker - Camp 12 supply', 'Fuel delivery - Remote wellpad',
    'Medical evacuation drill - Nimr', 'Pipeline inspection - Sector 4',
  ];

  const WAYPOINT_NAMES = [
    'Marmul Base Camp', 'Nimr-2 Main Gate', 'Fahud Junction', 'Bahja Camp',
    'Saih Rawl Gate', 'Lekhwair Depot', 'Camp 12', 'Airstrip Alpha',
    'Well Pad 7', 'Pipeline Km 42', 'Workshop Bay', 'Medical Centre',
  ];

  const PASSENGER_NAMES = [
    'Yaqoob Al-Hinai', 'Saeed Al-Maskari', 'Tariq Al-Rashdi', 'Waleed Al-Shukri',
    'Aziz Al-Farsi', 'Hamood Al-Kalbani', 'Ismail Al-Hajri', 'Munir Al-Wahaibi',
    'Qasim Al-Riyami', 'Naif Al-Ghafri', 'Adil Al-Balushi', 'Saud Al-Mahrouqi',
  ];

  const journeyData = [];
  for (let i = 0; i < 30; i++) {
    const v = allVehicles[i % allVehicles.length];
    const d = allDrivers[i % allDrivers.length];
    const daysBack = i < 4 ? 0 : rand(1, 45); // first 4 are today
    const hourOffset = rand(6, 18);
    const dep = new Date(daysAgo(daysBack)); dep.setHours(hourOffset, rand(0, 59));
    const arr = new Date(dep.getTime() + rand(2, 8) * 3600_000);

    let status: string;
    if (i === 0) status = 'active';
    else if (i === 1) status = 'delayed';
    else if (i === 2) status = 'deviated';
    else if (i === 3) status = 'approved';
    else if (i < 7) status = 'completed';
    else if (i < 10) status = 'pending_approval';
    else if (i < 12) status = 'draft';
    else if (i < 14) status = 'rejected';
    else status = 'completed';

    journeyData.push({
      journeyNo: `JM-26-${String(4000 + i).padStart(5, '0')}`,
      vehicleId: v.id,
      driverId: d.id,
      purpose: PURPOSES[i % PURPOSES.length],
      plannedDeparture: dep,
      plannedArrival: arr,
      actualDeparture: ['active', 'delayed', 'deviated', 'completed'].includes(status) ? new Date(dep.getTime() + rand(0, 30) * 60_000) : null,
      actualArrival: status === 'completed' ? new Date(arr.getTime() + rand(-30, 60) * 60_000) : null,
      riskLevel: pick(['L', 'L', 'L', 'M', 'M', 'H']),
      riskScore: String((Math.random() * 10).toFixed(2)),
      status,
      emergencyContact: `+968 9${rand(1000000, 9999999)}`,
      vehicleStatusSnapshot: v.status,
      orgId: i < 15 ? marmul.id : nimr.id,
      createdBy: jmUser.id,
    });
  }

  const insertedJourneys = await db.insert(journeys).values(journeyData).returning();
  console.log(`  Created ${insertedJourneys.length} journeys`);

  // Waypoints for first 10 journeys
  const waypointData = [];
  for (let j = 0; j < 10; j++) {
    const jId = insertedJourneys[j].id;
    const wpCount = rand(2, 4);
    for (let w = 0; w < wpCount; w++) {
      waypointData.push({
        journeyId: jId,
        sequence: w + 1,
        name: WAYPOINT_NAMES[(j + w) % WAYPOINT_NAMES.length],
        lat: String((18.0 + Math.random() * 4).toFixed(7)),
        lon: String((55.0 + Math.random() * 2).toFixed(7)),
        status: w === 0 ? 'done' : w === 1 && j < 3 ? 'current' : 'pending',
      });
    }
  }
  await db.insert(journeyWaypoints).values(waypointData);

  // Passengers for first 15 journeys
  const passengerData = [];
  for (let j = 0; j < 15; j++) {
    const paxCount = rand(1, 5);
    for (let p = 0; p < paxCount; p++) {
      passengerData.push({
        journeyId: insertedJourneys[j].id,
        passengerName: PASSENGER_NAMES[(j + p) % PASSENGER_NAMES.length],
        employeeId: `EMP-${rand(100, 999)}`,
        department: pick(['Operations', 'Drilling', 'HSE', 'Logistics', 'Engineering', 'Admin']),
        boardingStatus: j < 5 ? pick(['manifested', 'boarded']) : 'manifested',
      });
    }
  }
  await db.insert(journeyPassengers).values(passengerData);

  // Approvals for submitted journeys
  const approvalData = [];
  for (const j of insertedJourneys.filter(j => ['pending_approval', 'approved', 'completed', 'rejected'].includes(j.status))) {
    approvalData.push(
      { journeyId: j.id, step: 'submitter', userId: jmUser.id, decision: 'approved', decidedAt: hoursAgo(rand(2, 48)) },
      { journeyId: j.id, step: 'journey_mgr', userId: jmUser.id, decision: j.status === 'rejected' ? 'rejected' : j.status === 'pending_approval' ? 'pending' : 'approved', reason: j.status === 'rejected' ? 'Insufficient documentation' : null, decidedAt: j.status === 'pending_approval' ? null : hoursAgo(rand(1, 24)) },
    );
    if (['approved', 'completed'].includes(j.status) && j.riskLevel === 'H') {
      approvalData.push({ journeyId: j.id, step: 'hse', userId: hseUser.id, decision: 'approved', reason: null, decidedAt: hoursAgo(rand(1, 12)) });
    }
  }
  await db.insert(journeyApprovals).values(approvalData);
  console.log(`  Created ${waypointData.length} waypoints, ${passengerData.length} passengers, ${approvalData.length} approvals`);

  // ═══════════════════════════════════════════════════════════════
  // 3. WORK ORDERS — mix of statuses, bays assigned
  // ═══════════════════════════════════════════════════════════════
  console.log('Creating work orders...');

  const WO_TITLES = [
    'Oil change and filter replacement', 'Brake pad replacement - front axle',
    'AC compressor repair', 'Tire rotation and balancing',
    'Battery replacement', 'IVMS device recalibration',
    'Suspension inspection and repair', 'Windshield crack repair',
    'Engine coolant flush', 'Transmission fluid change',
    'Power steering pump replacement', 'Alternator replacement',
    'Pre-PDO inspection - full vehicle', 'Exhaust system repair',
    'Differential oil change', 'Wheel bearing replacement',
  ];

  const woData = [];
  for (let i = 0; i < 20; i++) {
    const v = allVehicles[i % allVehicles.length];
    let status: string;
    let bay: string | null = null;
    let releaseDecision: string | null = null;

    if (i < 3) { status = 'in_bay'; bay = String(i + 1); }
    else if (i === 3) { status = 'in_bay'; bay = '4'; releaseDecision = 'conditional'; }
    else if (i === 4) { status = 'hse_review'; bay = '5'; }
    else if (i === 5) { status = 'ready'; bay = '6'; releaseDecision = 'go'; }
    else if (i < 10) { status = 'inbound'; }
    else if (i < 14) { status = 'awaiting_parts'; }
    else if (i < 17) { status = 'closed'; releaseDecision = pick(['go', 'go', 'conditional']); }
    else { status = 'closed'; releaseDecision = 'no_go'; }

    woData.push({
      woNumber: `WO-26-${String(300 + i).padStart(4, '0')}`,
      vehicleId: v.id,
      issueType: pick(['preventive', 'corrective', 'breakdown', 'tire', 'battery', 'ivms']),
      priority: i < 2 ? 'critical' : i < 5 ? 'high' : i < 12 ? 'medium' : 'low',
      title: WO_TITLES[i % WO_TITLES.length],
      description: `Work order for ${v.plateNo} - ${WO_TITLES[i % WO_TITLES.length].toLowerCase()}`,
      status,
      bay,
      releaseDecision,
      releaseReason: releaseDecision === 'conditional' ? 'Minor oil leak — monitor 48h' : releaseDecision === 'no_go' ? 'Structural damage found' : null,
      releaseExpiry: releaseDecision === 'conditional' ? new Date(Date.now() + 48 * 3600_000) : null,
      openedBy: maintUser.id,
      openedAt: daysAgo(rand(0, 30)),
      closedAt: status === 'closed' ? daysAgo(rand(0, 5)) : null,
      odometerAt: v.odometer,
      orgId: arTech.id,
    });
  }

  const insertedWOs = await db.insert(workOrders).values(woData).returning();
  console.log(`  Created ${insertedWOs.length} work orders`);

  // Parts for some WOs
  const partsData = [];
  for (let i = 0; i < 8; i++) {
    partsData.push({
      woId: insertedWOs[i].id,
      partNumber: `P-${rand(10000, 99999)}`,
      partName: pick(['Oil filter', 'Brake pad set', 'Air filter', 'Spark plugs', 'Coolant 5L', 'Wiper blades', 'Belt tensioner', 'Radiator hose']),
      quantity: rand(1, 4),
      costBaisa: rand(5000, 120000),
    });
  }
  await db.insert(workOrderParts).values(partsData);

  // Activity for WOs
  const activityData = insertedWOs.slice(0, 10).flatMap(wo => [
    { woId: wo.id, userId: maintUser.id, action: 'opened', details: { note: 'Work order created' }, timestamp: wo.openedAt },
    ...(wo.bay ? [{ woId: wo.id, userId: maintUser.id, action: 'assigned', details: { bay: wo.bay } as Record<string, unknown>, timestamp: new Date(wo.openedAt.getTime() + 3600_000) }] : []),
  ]);
  await db.insert(workOrderActivity).values(activityData);
  console.log(`  Created ${partsData.length} parts, ${activityData.length} activity entries`);

  // ═══════════════════════════════════════════════════════════════
  // 4. TIRES — 4 per vehicle for first 10 vehicles
  // ═══════════════════════════════════════════════════════════════
  console.log('Creating tires...');

  const tireData = [];
  for (let vi = 0; vi < 10; vi++) {
    const v = allVehicles[vi];
    const positions = ['P1', 'P2', 'P3', 'P4'];
    for (const pos of positions) {
      const tread = (2 + Math.random() * 8).toFixed(1);
      tireData.push({
        serialNo: `TR-${String(vi * 4 + positions.indexOf(pos) + 1).padStart(4, '0')}`,
        brand: pick(['Bridgestone', 'Michelin', 'Dunlop', 'Yokohama']),
        model: pick(['Dueler H/T', 'LTX M/S', 'Grandtrek AT3', 'Geolandar G015']),
        size: v.type === 'truck' || v.type === 'tanker' ? '315/80R22.5' : '265/70R17',
        vehicleId: v.id,
        axlePosition: pos,
        installDate: pastDate(rand(30, 365)),
        installOdometer: rand(10000, 60000),
        treadDepthMm: tread,
        pressurePsi: String(rand(32, 42)),
        status: Number(tread) > 4 ? 'active' : Number(tread) > 2 ? 'worn' : 'damaged',
        orgId: arTech.id,
      });
    }
  }
  await db.insert(tires).values(tireData);
  console.log(`  Created ${tireData.length} tires`);

  // ═══════════════════════════════════════════════════════════════
  // 5. EVENTS — realistic telemetry events
  // ═══════════════════════════════════════════════════════════════
  console.log('Creating events...');

  const eventData = [];
  for (let i = 0; i < 80; i++) {
    const v = allVehicles[i % allVehicles.length];
    const d = allDrivers[i % allDrivers.length];
    const eventType = pick(['overspeed', 'overspeed', 'harsh_braking', 'harsh_accel', 'idle', 'deviation', 'geofence_entry', 'geofence_exit', 'night_driving']);
    const severity = eventType === 'overspeed' ? pick(['critical', 'warning']) :
                     eventType === 'deviation' ? 'critical' :
                     eventType === 'idle' ? 'info' :
                     pick(['warning', 'info']);

    const details: Record<string, unknown> = {};
    if (eventType === 'overspeed') { details.speed = rand(100, 140); details.limit = pick([80, 100, 120]); }
    if (eventType === 'harsh_braking') { details.decel = (0.3 + Math.random() * 0.3).toFixed(2) + 'g'; }
    if (eventType === 'idle') { details.duration = rand(15, 60) + 'm'; }
    if (eventType === 'deviation') { details.distance = (0.5 + Math.random() * 3).toFixed(1) + 'km'; }

    eventData.push({
      vehicleId: v.id,
      driverId: d.id,
      journeyId: i < 10 ? insertedJourneys[i % insertedJourneys.length].id : null,
      eventType,
      severity,
      lat: String((18.0 + Math.random() * 4).toFixed(7)),
      lon: String((55.0 + Math.random() * 2).toFixed(7)),
      speed: String(rand(0, 140)),
      details,
      actionStatus: i < 20 ? 'open' : i < 40 ? 'acknowledged' : pick(['resolved', 'escalated']),
      recordedAt: hoursAgo(rand(0, 720)), // up to 30 days
      orgId: arTech.id,
    });
  }

  // Add 2 panic events
  for (let p = 0; p < 2; p++) {
    eventData.push({
      vehicleId: allVehicles[p].id,
      driverId: allDrivers[p].id,
      journeyId: insertedJourneys[p].id,
      eventType: 'panic',
      severity: 'critical',
      lat: String((18.0 + Math.random() * 2).toFixed(7)),
      lon: String((55.0 + Math.random() * 1).toFixed(7)),
      speed: String(rand(0, 80)),
      details: { source: 'button', note: p === 0 ? 'Driver pressed panic button' : 'Automatic collision detection' },
      actionStatus: p === 0 ? 'open' : 'resolved',
      recordedAt: hoursAgo(p === 0 ? 2 : 168),
      orgId: arTech.id,
    });
  }

  const insertedEvents = await db.insert(events).values(eventData).returning();
  console.log(`  Created ${insertedEvents.length} events (incl. 2 panic)`);

  // ═══════════════════════════════════════════════════════════════
  // 6. INCIDENTS — from panic events + some manual
  // ═══════════════════════════════════════════════════════════════
  console.log('Creating incidents...');

  const SITUATIONS = [
    'Vehicle rollover reported — driver unresponsive',
    'Panic button activated — possible medical emergency',
    'Collision with stationary object at well pad',
    'Near-miss — wrong-way vehicle on access road',
    'HSE violation — unauthorized passenger in cab',
    'Environmental spill — hydraulic fluid leak',
  ];

  const PLAYBOOK = ['Acknowledge alarm', 'Assess situation', 'Contain & secure', 'Notify stakeholders', 'Investigate root cause', 'Close & document'];

  const incidentData = [];
  for (let i = 0; i < 6; i++) {
    const v = allVehicles[i];
    const d = allDrivers[i];
    const isClosed = i >= 3;
    incidentData.push({
      eventId: insertedEvents[insertedEvents.length - 2 + (i < 2 ? i : 0)].id,
      vehicleId: v.id,
      driverId: d.id,
      journeyId: i < 4 ? insertedJourneys[i].id : null,
      tier: i < 2 ? 3 : i < 4 ? 2 : 1,
      status: isClosed ? 'closed' : i === 0 ? 'active' : i === 1 ? 'responding' : 'escalated',
      situation: SITUATIONS[i],
      lat: String((18.0 + Math.random() * 2).toFixed(7)),
      lon: String((55.0 + Math.random() * 1).toFixed(7)),
      startedAt: hoursAgo(isClosed ? rand(72, 720) : rand(1, 48)),
      closedAt: isClosed ? hoursAgo(rand(2, 48)) : null,
      closedBy: isClosed ? hseUser.id : null,
      closureReport: isClosed ? 'Incident resolved. Root cause identified and corrective actions implemented.' : null,
      orgId: arTech.id,
    });
  }

  const insertedIncidents = await db.insert(incidents).values(incidentData).returning();

  // Steps for each incident
  const stepData = [];
  for (const inc of insertedIncidents) {
    const isClosed = inc.status === 'closed';
    const currentStepNum = isClosed ? 6 : inc.tier === 3 ? rand(1, 3) : rand(2, 5);

    for (let s = 0; s < 6; s++) {
      stepData.push({
        incidentId: inc.id,
        stepNumber: s + 1,
        description: PLAYBOOK[s],
        status: s < currentStepNum ? 'done' : s === currentStepNum ? 'active' : 'pending',
        completedBy: s < currentStepNum ? hseUser.id : null,
        completedAt: s < currentStepNum ? new Date(inc.startedAt.getTime() + (s + 1) * 3600_000) : null,
      });
    }
  }
  await db.insert(incidentSteps).values(stepData);
  console.log(`  Created ${insertedIncidents.length} incidents, ${stepData.length} steps`);

  // ═══════════════════════════════════════════════════════════════
  // 7. DRIVER SCORES — monthly scores for all drivers
  // ═══════════════════════════════════════════════════════════════
  console.log('Creating driver scores...');

  const scoreData = [];
  for (const d of allDrivers) {
    // Current month
    const overspeed = rand(0, 8);
    const harsh = rand(0, 5);
    const accel = rand(0, 4);
    const idle = rand(0, 10);
    const incCount = rand(0, 2);
    const total = Math.max(40, 100 - overspeed * 3 - harsh * 4 - accel * 2 - idle * 1 - incCount * 10 + rand(-5, 5));

    scoreData.push({
      driverId: d.id,
      period: '2026-05',
      overspeedCount: overspeed,
      harshBrakingCount: harsh,
      harshAccelCount: accel,
      idleCount: idle,
      incidentCount: incCount,
      complianceScore: String(Math.min(100, total + rand(0, 10)).toFixed(2)),
      totalScore: String(total.toFixed(2)),
      orgId: arTech.id,
    });

    // Previous month
    const prevTotal = Math.max(40, total + rand(-8, 8));
    scoreData.push({
      driverId: d.id,
      period: '2026-04',
      overspeedCount: rand(0, 10),
      harshBrakingCount: rand(0, 6),
      harshAccelCount: rand(0, 5),
      idleCount: rand(0, 12),
      incidentCount: rand(0, 2),
      complianceScore: String(Math.min(100, prevTotal + rand(0, 10)).toFixed(2)),
      totalScore: String(prevTotal.toFixed(2)),
      orgId: arTech.id,
    });
  }

  await db.insert(driverScores).values(scoreData);
  console.log(`  Created ${scoreData.length} driver score records`);

  // ═══════════════════════════════════════════════════════════════
  console.log('\n✓ Operations seed complete.');
  console.log(`  Summary:
    Documents:    ${vehicleDocs.length + driverDocs.length}
    Journeys:     ${insertedJourneys.length} (+ ${waypointData.length} WPs, ${passengerData.length} pax)
    Work Orders:  ${insertedWOs.length} (+ ${partsData.length} parts)
    Tires:        ${tireData.length}
    Events:       ${insertedEvents.length}
    Incidents:    ${insertedIncidents.length}
    Driver Scores:${scoreData.length}
  `);

  await pool.end();
  process.exit(0);
}

seedOperations().catch(err => {
  console.error('Operations seed failed:', err);
  process.exit(1);
});
