import { pgTable, uuid, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { journeys } from './journeys';

export const GEOFENCE_TYPES = ['red_zone', 'site', 'camp', 'corridor', 'refuel'] as const;
export type GeofenceType = (typeof GEOFENCE_TYPES)[number];

/**
 * Geofences — spatial polygons checked on every telemetry point.
 * The `geom` column is GEOMETRY(Polygon, 4326) managed via raw SQL migrations;
 * Drizzle does not have a native PostGIS type, so we exclude it from the schema
 * and query it directly with sql`...` where needed.
 */
export const geofences = pgTable('geofences', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(), // GeofenceType
  // geom GEOMETRY(Polygon, 4326) — managed via migration, queried via sql``
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  projectId: uuid('project_id'),
  active: boolean('active').default(true).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Route corridor generated when a journey is approved.
 * corridor = ST_Buffer(waypoints_linestring, buffer_meters).
 * The `corridor` column is GEOMETRY(Polygon, 4326) managed via raw SQL migrations.
 */
export const journeyRouteCorridors = pgTable('journey_route_corridors', {
  id: uuid('id').primaryKey().defaultRandom(),
  journeyId: uuid('journey_id').references(() => journeys.id).notNull(),
  bufferMeters: integer('buffer_meters').default(500).notNull(),
  // corridor GEOMETRY(Polygon, 4326) — managed via migration, queried via sql``
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
