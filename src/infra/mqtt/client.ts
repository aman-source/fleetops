import mqtt, { type MqttClient } from 'mqtt';
import { env } from '../../env.js';

let client: MqttClient | null = null;

export function getMqttClient(): MqttClient {
  if (!client) {
    throw new Error('MQTT client not initialized. Call connectMqtt() first.');
  }
  return client;
}

export async function connectMqtt(): Promise<MqttClient> {
  return new Promise((resolve, reject) => {
    client = mqtt.connect(env.MQTT_URL, {
      clientId: `fleetops-server-${process.pid}`,
      clean: true,
      reconnectPeriod: 5_000,
      connectTimeout: 10_000,
    });

    client.on('connect', () => {
      resolve(client!);
    });

    client.on('error', (err) => {
      if (!client?.connected) {
        reject(err);
      }
    });
  });
}

export function checkMqttHealth(): boolean {
  return client?.connected ?? false;
}

export async function closeMqtt(): Promise<void> {
  if (client) {
    await client.endAsync();
    client = null;
  }
}
