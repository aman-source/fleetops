/**
 * MQTT publisher for E2E tests.
 * Publishes test messages to mosquitto-test on port 1884.
 */
import mqtt, { MqttClient } from 'mqtt';

const MQTT_URL = process.env.TEST_MQTT_URL ?? 'mqtt://localhost:1884';

let client: MqttClient | null = null;

function getClient(): Promise<MqttClient> {
  return new Promise((resolve, reject) => {
    if (client?.connected) {
      resolve(client);
      return;
    }

    const c = mqtt.connect(MQTT_URL, {
      clientId: `e2e-publisher-${Date.now()}`,
      clean: true,
      connectTimeout: 5000,
    });

    c.once('connect', () => {
      client = c;
      resolve(c);
    });

    c.once('error', (err) => reject(err));
  });
}

export async function disconnectMqtt(): Promise<void> {
  if (client) {
    await new Promise<void>((resolve) => client!.end(false, {}, resolve as () => void));
    client = null;
  }
}

function publish(topic: string, payload: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    getClient().then((c) => {
      c.publish(topic, JSON.stringify(payload), { qos: 1 }, (err?: Error) => {
        if (err) reject(err);
        else resolve();
      });
    }).catch(reject);
  });
}

export interface TelemetryPoint {
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  timestamp: string;
  altitude?: number;
}

export interface PanicPayload {
  lat: number;
  lon: number;
  timestamp: string;
  driverId?: string;
}

export async function publishTelemetry(deviceId: string, point: TelemetryPoint): Promise<void> {
  await publish(`fleet/${deviceId}/telemetry`, point);
}

export async function publishPanic(deviceId: string, data: PanicPayload): Promise<void> {
  await publish(`fleet/${deviceId}/panic`, data);
}

export async function publishNfc(
  deviceId: string,
  cardUid: string,
  authorized: boolean,
): Promise<void> {
  await publish(`fleet/${deviceId}/nfc`, { cardUid, authorized, timestamp: new Date().toISOString() });
}

/** Simulate vehicle driving a route at given interval. */
export async function simulateRoute(
  deviceId: string,
  route: Array<{ lat: number; lon: number }>,
  intervalMs: number,
): Promise<void> {
  for (let i = 0; i < route.length; i++) {
    const point = route[i];
    await publishTelemetry(deviceId, {
      lat: point.lat,
      lon: point.lon,
      speed: 60,
      heading: 0,
      timestamp: new Date().toISOString(),
    });

    if (i < route.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}

/** Generate N interpolated points between start and end. */
export function interpolateRoute(
  start: { lat: number; lon: number },
  end: { lat: number; lon: number },
  n: number,
): Array<{ lat: number; lon: number }> {
  const points: Array<{ lat: number; lon: number }> = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    points.push({
      lat: start.lat + (end.lat - start.lat) * t,
      lon: start.lon + (end.lon - start.lon) * t,
    });
  }
  return points;
}
