import { env } from '../../../env.js';

interface SendWhatsAppResult {
  success: boolean;
  providerId?: string;
  error?: string;
}

export async function sendWhatsApp(
  to: string,
  body: string,
  _mediaUrl?: string,
): Promise<SendWhatsAppResult> {
  if (env.WHATSAPP_PROVIDER === 'none' || !env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM) {
    return { success: false, error: 'WhatsApp not configured' };
  }

  try {
    const twilio = await import('twilio');
    const client = twilio.default(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    const msg = await client.messages.create({
      body,
      from: `whatsapp:${env.TWILIO_FROM}`,
      to: `whatsapp:${to}`,
    });
    return { success: true, providerId: msg.sid };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
