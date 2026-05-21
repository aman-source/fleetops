import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

export const mfaVerifySchema = z.object({
  mfaToken: z.string().min(1),
  totp: z.string().length(6),
});

export const mfaEnableSchema = z.object({
  totp: z.string().length(6),
  secret: z.string().min(1),
});

export const mfaDisableSchema = z.object({
  totp: z.string().length(6),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;
export type MfaEnableInput = z.infer<typeof mfaEnableSchema>;
export type MfaDisableInput = z.infer<typeof mfaDisableSchema>;
