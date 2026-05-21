import nodemailer from 'nodemailer';
import { env } from '../../../env.js';

interface SendEmailResult {
  success: boolean;
  providerId?: string;
  error?: string;
}

let transport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter | null {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transport;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<SendEmailResult> {
  const t = getTransport();
  if (!t) return { success: false, error: 'SMTP not configured' };

  try {
    const info = await t.sendMail({ from: env.SMTP_FROM, to, subject, html, text });
    return { success: true, providerId: info.messageId };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
