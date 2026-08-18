import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  device_fingerprint: z.string().min(16).max(128).optional(),
  user_agent_label: z.string().max(256).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const mfaVerifySchema = z.object({
  challenge_token: z.string().min(1),
  code: z.string().min(6).max(8),
});

export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;

export const emailOtpVerifySchema = z.object({
  challenge_token: z.string().min(1),
  code: z.string().min(4).max(8),
});

export type EmailOtpVerifyInput = z.infer<typeof emailOtpVerifySchema>;

export const mfaConfirmSchema = z.object({
  challenge_token: z.string().min(1).optional(),
  code: z.string().min(6).max(8),
});

export type MfaConfirmInput = z.infer<typeof mfaConfirmSchema>;

export const mfaSetupSchema = z.object({
  challenge_token: z.string().min(1).optional(),
});

export type MfaSetupInput = z.infer<typeof mfaSetupSchema>;

export const securityPreferencesSchema = z.object({
  google_authenticator_enabled: z.boolean().optional(),
  email_otp_new_device_enabled: z.boolean().optional(),
});

export type SecurityPreferencesInput = z.infer<
  typeof securityPreferencesSchema
>;

export const userRoleSchema = z.enum([
  "super_admin",
  "admin",
  "supervisor",
  "analyst",
  "auditor",
]);

export type UserRole = z.infer<typeof userRoleSchema>;

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  mfa_enabled?: boolean;
  email_otp_new_device_enabled?: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthResponse extends AuthTokens {
  user: AuthUser;
}

export type LoginResponse =
  | {
      status: "mfa_required";
      challenge_token: string;
      user: AuthUser;
    }
  | {
      status: "email_otp_required";
      challenge_token: string;
      user: AuthUser;
      message?: string;
    }
  | {
      status: "mfa_setup_required";
      challenge_token: string;
      user: AuthUser;
    };

export interface MfaSetupResponse {
  otpauth_url: string;
  secret: string;
}

export interface SecurityPreferences {
  google_authenticator_enabled: boolean;
  email_otp_new_device_enabled: boolean;
}
