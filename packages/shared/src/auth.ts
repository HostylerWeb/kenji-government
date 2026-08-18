import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const userRoleSchema = z.enum([
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
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}
