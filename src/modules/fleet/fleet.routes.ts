import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { tenantScope } from '../../shared/middleware/tenant.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/response.js';
import { exportCsv } from '../../shared/csv.js';
import {
  createVehicleSchema, updateVehicleSchema, updateVehicleStatusSchema, vehicleQuerySchema,
  createDriverSchema, updateDriverSchema, assignNfcSchema, driverQuerySchema,
  createDeviceSchema, updateDeviceSchema, deviceQuerySchema,
} from './fleet.schema.js';
import * as service from './fleet.service.js';
import { getVehicleChecklistTemplate } from '../admin/checklists.service.js';

export async function fleetRoutes(app: FastifyInstance) {
  // All fleet routes require auth + tenant scoping
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', tenantScope);

  // ═══════════════════════════════════════
  // VEHICLES
  // ═══════════════════════════════════════

  app.get('/vehicles', async (request, reply) => {
    const q = request.query as Record<string, string>;
    if (q.format === 'csv') {
      const query = vehicleQuerySchema.parse({ ...q, limit: 50000 });
      const result = await service.listVehicles(request.tenantId, query);
      return exportCsv(reply, ['Plate No', 'Fleet No', 'Make', 'Model', 'Year', 'Status', 'Type'],
        result.items as Record<string, unknown>[],
        'vehicles.csv',
        { 'Plate No': 'plateNo', 'Fleet No': 'fleetNo', 'Make': 'make', 'Model': 'model', 'Year': 'year', 'Status': 'status', 'Type': 'type' });
    }
    const query = vehicleQuerySchema.parse(request.query);
    const result = await service.listVehicles(request.tenantId, query);
    return sendSuccess(reply, result.items, 200, result.meta);
  });

  app.get('/vehicles/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const vehicle = await service.getVehicle(request.tenantId, id);
    return sendSuccess(reply, vehicle);
  });

  app.post('/vehicles', { preHandler: [authorize('fleet:create')] }, async (request, reply) => {
    const input = createVehicleSchema.parse(request.body);
    const vehicle = await service.createVehicle(request.tenantId, input);
    return sendCreated(reply, vehicle);
  });

  app.patch('/vehicles/:id', { preHandler: [authorize('fleet:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateVehicleSchema.parse(request.body);
    const vehicle = await service.updateVehicle(request.tenantId, id, input);
    return sendSuccess(reply, vehicle);
  });

  app.patch('/vehicles/:id/status', { preHandler: [authorize('fleet:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateVehicleStatusSchema.parse(request.body);
    const vehicle = await service.updateVehicleStatus(request.tenantId, id, input);
    return sendSuccess(reply, vehicle);
  });

  // ═══════════════════════════════════════
  // DRIVERS
  // ═══════════════════════════════════════

  app.get('/drivers', async (request, reply) => {
    const q = request.query as Record<string, string>;
    if (q.format === 'csv') {
      const query = driverQuerySchema.parse({ ...q, limit: 50000 });
      const result = await service.listDrivers(request.tenantId, query);
      return exportCsv(reply, ['Name', 'Employee ID', 'License No', 'Status', 'Phone'],
        result.items as Record<string, unknown>[],
        'drivers.csv',
        { 'Name': 'name', 'Employee ID': 'employeeId', 'License No': 'licenseNo', 'Status': 'status', 'Phone': 'phone' });
    }
    const query = driverQuerySchema.parse(request.query);
    const result = await service.listDrivers(request.tenantId, query);
    return sendSuccess(reply, result.items, 200, result.meta);
  });

  app.get('/drivers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const driver = await service.getDriver(request.tenantId, id);
    return sendSuccess(reply, driver);
  });

  app.post('/drivers', { preHandler: [authorize('fleet:create')] }, async (request, reply) => {
    const input = createDriverSchema.parse(request.body);
    const driver = await service.createDriver(request.tenantId, input);
    return sendCreated(reply, driver);
  });

  app.patch('/drivers/:id', { preHandler: [authorize('fleet:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateDriverSchema.parse(request.body);
    const driver = await service.updateDriver(request.tenantId, id, input);
    return sendSuccess(reply, driver);
  });

  app.post('/drivers/:id/nfc', { preHandler: [authorize('fleet:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { nfcCardUid } = assignNfcSchema.parse(request.body);
    const driver = await service.assignNfc(request.tenantId, id, nfcCardUid);
    return sendSuccess(reply, driver);
  });

  app.delete('/drivers/:id/nfc', { preHandler: [authorize('fleet:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.revokeNfc(request.tenantId, id);
    return sendNoContent(reply);
  });

  app.get('/drivers/:id/nfc-history', async (request, reply) => {
    const { id } = request.params as { id: string };
    const history = await service.getNfcHistory(request.tenantId, id);
    return sendSuccess(reply, history);
  });

  // ═══════════════════════════════════════
  // DEVICES
  // ═══════════════════════════════════════

  app.get('/devices', async (request, reply) => {
    const query = deviceQuerySchema.parse(request.query);
    const result = await service.listDevices(request.tenantId, query);
    return sendSuccess(reply, result.items, 200, result.meta);
  });

  app.get('/devices/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const device = await service.getDevice(request.tenantId, id);
    return sendSuccess(reply, device);
  });

  app.post('/devices', { preHandler: [authorize('fleet:create')] }, async (request, reply) => {
    const input = createDeviceSchema.parse(request.body);
    const device = await service.createDevice(request.tenantId, input);
    return sendCreated(reply, device);
  });

  app.patch('/devices/:id', { preHandler: [authorize('fleet:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateDeviceSchema.parse(request.body);
    const device = await service.updateDevice(request.tenantId, id, input);
    return sendSuccess(reply, device);
  });

  // GET /vehicles/:id/checklist-template — active published checklist for this vehicle's project/org
  app.get('/vehicles/:id/checklist-template', async (request, reply) => {
    const { id } = request.params as { id: string };
    const template = await getVehicleChecklistTemplate(id);
    return sendSuccess(reply, template);
  });
}
