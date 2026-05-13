-- Fleetops PostgreSQL initialization
-- Runs once on first container start

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify PostGIS
SELECT PostGIS_Version();
