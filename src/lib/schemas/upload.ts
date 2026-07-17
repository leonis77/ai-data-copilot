/**
 * M1 Trusted Input — Upload API contracts
 *
 * 职责：定义 /api/upload 的请求/响应 schema，
 * 让前后端对“一份上传数据长什么样”有单一可信源。
 */

import { z } from "zod";

// ═══ Request ═══

export const UploadRequestBodySchema = z.object({
  fileName: z
    .string()
    .min(1, "fileName 不能为空")
    .max(1024, "fileName 过长")
    .refine(function (v) {
      return /^[^/\\]+\.(xlsx|xls|csv)$/i.test(v.trim());
    }, "仅支持 xlsx / xls / csv"),

  fileData: z
    .string({ required_error: "fileData 不能为空" })
    .min(1, "fileData 不能为空")
    .refine(function (v) {
      return /^[A-Za-z0-9+/=]+$/.test(v);
    }, "fileData 必须是 base64 字符串"),

  sheetName: z
    .string()
    .max(1024, "sheetName 过长")
    .optional(),

  // 未来扩展：用于模板回写、来源追踪等
  source: z.enum(["upload", "template", "reupload"]).optional(),
});

export type UploadRequestBody = z.infer<typeof UploadRequestBodySchema>;

// ═══ Response ═══

export const DatasetMetaSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  originalName: z.string().optional(),
  rowCount: z.number().int().nonnegative(),
  columns: z.array(z.string()),
  summary: z.string().optional(),
  semanticRoles: z.any().optional(),
  platform: z.string().optional(),
  sheets: z.array(z.any()).optional(),
});

export type DatasetMeta = z.infer<typeof DatasetMetaSchema>;

export const UploadSuccessSchema = z.object({
  id: z.string().min(1),
  columns: z.array(z.string()),
  rows: z.array(z.record(z.unknown())),
  rowCount: z.number().int().nonnegative(),
  summary: z.string().optional(),
  semanticRoles: z.any().optional(),
  platform: z.string().nullable().optional(),
  sheets: z.any().nullable().optional(),
});

export type UploadSuccess = z.infer<typeof UploadSuccessSchema>;

export const UploadErrorSchema = z.object({
  error: z.string(),
});

export type UploadError = z.infer<typeof UploadErrorSchema>;

export const UploadResponseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), data: UploadSuccessSchema }),
  z.object({ ok: z.literal(false), error: UploadErrorSchema }),
]);

export type UploadResponse = z.infer<typeof UploadResponseSchema>;

// ═══ Helpers ═══

const BASE64_MAX_BYTES = 70 * 1024 * 1024;

export function validateUploadRequest(raw: unknown): UploadRequestBody {
  const parsed = UploadRequestBodySchema.parse(raw);
  const byteLength = Buffer.byteLength(parsed.fileData, "base64");
  if (byteLength > BASE64_MAX_BYTES) {
    throw new Error(`文件过大：${byteLength} bytes，最大允许 ${BASE64_MAX_BYTES} bytes`);
  }
  return parsed;
}
