import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { sendSuccess } from '../../shared/response.js';
import { geocodeForward } from '../../shared/mapbox.js';

export async function mapboxRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/mapbox/geocode', async (request, reply) => {
    const { q, lon, lat } = request.query as { q?: string; lon?: string; lat?: string };
    if (!q || q.trim().length < 2) return sendSuccess(reply, []);
    const results = await geocodeForward(
      q.trim(),
      lon ? Number(lon) : undefined,
      lat ? Number(lat) : undefined,
    );
    return sendSuccess(reply, results);
  });
}
