/**
 * M1 Trusted Input — Auth API contracts
 *
 * 职责：定义登录/注册请求的校验 schema，
 * 防止空值、超长字符串、非法邮箱格式等非法输入进入 Supabase。
 */

import { z } from "zod";

// ═══ Email validation ═══

export const EmailSchema = z
  .string()
  .min(1, "邮箱不能为空")
  .max(256, "邮箱过长")
  .refine(function (v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }, "请输入有效的邮箱地址")
  .transform(function (v) { return v.trim().toLowerCase(); });

// ═══ Password validation ═══

export const PasswordSchema = z
  .string()
  .min(8, "密码至少 8 位")
  .max(128, "密码过长")
  .refine(function (v) {
    return /[A-Za-z]/.test(v) && /\d/.test(v);
  }, "密码需包含字母和数字");

// ═══ Login request ═══

export const LoginRequestBodySchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});

export type LoginRequestBody = z.infer<typeof LoginRequestBodySchema>;

// ═══ Register request ═══

export const RegisterRequestBodySchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: z
    .string()
    .max(100, "姓名过长")
    .optional()
    .transform(function (v) { return v?.trim(); }),
});

export type RegisterRequestBody = z.infer<typeof RegisterRequestBodySchema>;

// ═══ Helpers ═══

export function validateLoginRequest(raw: unknown): LoginRequestBody {
  return LoginRequestBodySchema.parse(raw);
}

export function validateRegisterRequest(raw: unknown): RegisterRequestBody {
  return RegisterRequestBodySchema.parse(raw);
}
