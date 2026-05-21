import { env } from '../../../env.js';

interface SendSmsResult {
  success: boolean;
  providerId?: string;
  error?: string;
}

export async function sendSms(to: string, body: string): Promise<SendSmsResult> {
  if (env.SMS_PROVIDER === 'none' || !env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM) {
    return { success: false, error: 'SMS not configured' };
  }

  try {
    // Dynamic import to avoid requiring twilio when not configured
    const twilio = await import('twilio');
    const client = twilio.default(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    const msg = await client.messages.create({ body, from: env.TWILIO_FROM, to });
    return { success: true, providerId: msg.sid };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
