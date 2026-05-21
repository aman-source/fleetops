import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { tenantScope } from '../../shared/middleware/tenant.js';
import { sendSuccess } from '../../shared/response.js';
import { exportCsv } from '../../shared/csv.js';
import { incidentQuerySchema, completeStepSchema, closeIncidentSchema, driverScoreQuerySchema } from './hse.schema.js';
import * as service from './hse.service.js';

export async function hseRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', tenantScope);

  // GET /incidents
  app.get('/incidents', async (request, reply) => {
    const q = request.query as Record<string, string>;
    if (q.format === 'csv') {
      const query = incidentQuerySchema.parse({ ...q, limit: 50000 });
      const result = await service.listIncidents(request.tenantId, query);
      return exportCsv(reply, ['Incident No', 'Type', 'Severity', 'Status', 'Vehicle', 'Driver', 'Reported At'],
        result.items as Record<string, unknown>[],
        'incidents.csv',
        { 'Incident No': 'incidentNo', 'Type': 'incidentType', 'Severity': 'severity', 'Status': 'status', 'Vehicle': 'vehicleId', 'Driver': 'driverId', 'Reported At': 'reportedAt' });
    }
    const query = incidentQuerySchema.parse(request.query);
    const result = await service.listIncidents(request.tenantId, query);
    return sendSuccess(reply, result.items, 200, result.meta);
  });

  // GET /incidents/:id
  app.get('/incidents/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const incident = await service.getIncident(request.tenantId, id);
    const steps = await service.getSteps(request.tenantId, id);
    return sendSuccess(reply, { incident, steps });
  });

  // POST /incidents/:id/steps/:stepId/complete — stepId can be UUID or step number
  app.post('/incidents/:id/steps/:stepId/complete', { preHandler: [authorize('hse:update')] }, async (request, reply) => {
    const { id, stepId } = request.params as { id: string; stepId: string };
    const result = await service.completeStep(request.tenantId, id, stepId, request.user.sub);
    return sendSuccess(reply, result);
  });

  // POST /incidents/:id/escalate
  app.post('/incidents/:id/escalate', { preHandler: [authorize('hse:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const incident = await service.escalateIncident(request.tenantId, id);
    return sendSuccess(reply, incident);
  });

  // POST /incidents/:id/close
  app.post('/incidents/:id/close', { preHandler: [authorize('incident:close')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { closureReport } = closeIncidentSchema.parse(request.body);
    const incident = await service.closeIncident(request.tenantId, id, request.user.sub, closureReport);
    return sendSuccess(reply, incident);
  });

  // POST /incidents/:id/release-vehicle — release HSE hold
  app.post('/incidents/:id/release-vehicle', { preHandler: [authorize('hse:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await service.releaseVehicle(request.tenantId, id);
    return sendSuccess(reply, result);
  });

  // GET /driver-scores
  app.get('/driver-scores', async (request, reply) => {
    const query = driverScoreQuerySchema.parse(request.query);
    const result = await service.listDriverScores(request.tenantId, query);
    return sendSuccess(reply, result.items, 200, result.meta);
  });
}
