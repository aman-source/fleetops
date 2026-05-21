import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { env } from '../../../env.js';

interface SendPushResult {
  success: boolean;
  providerId?: string;
  error?: string;
}

let expo: Expo | null = null;

function getExpo(): Expo {
  if (!expo) {
    expo = new Expo({ accessToken: env.EXPO_ACCESS_TOKEN });
  }
  return expo;
}

export async function sendPush(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<SendPushResult> {
  if (!Expo.isExpoPushToken(expoPushToken)) {
    return { success: false, error: `Invalid Expo push token: ${expoPushToken}` };
  }

  const message: ExpoPushMessage = { to: expoPushToken, title, body, data };

  try {
    const [ticket] = await getExpo().sendPushNotificationsAsync([message]);
    if (ticket.status === 'error') {
      return { success: false, error: ticket.message };
    }
    return { success: true, providerId: 'id' in ticket ? ticket.id : undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
