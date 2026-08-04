/**
 * API 请求工具函数
 */

import { NextRequest, NextResponse } from "next/server";

/** 最大请求体大小（字节） */
export const MAX_BODY_SIZE = 512 * 1024; // 512 KB

/**
 * 安全读取 JSON 请求体，限制大小防止内存溢出
 *
 * @returns 解析后的对象，或 null（超出大小限制 / 解析失败）
 */
export async function readJsonBody(request: NextRequest): Promise<any> {
  // 检查 Content-Length 头（如果存在）
  var contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_SIZE) {
    return NextResponse.json(
      { error: "请求体过大，最大支持 512KB" },
      { status: 413 }
    );
  }

  // 读取并限制实际字节数
  var buffer = await request.arrayBuffer().catch(function () { return null; });
  if (!buffer) {
    return NextResponse.json(
      { error: "无法读取请求体" },
      { status: 400 }
    );
  }

  if (buffer.byteLength > MAX_BODY_SIZE) {
    return NextResponse.json(
      { error: "请求体过大，最大支持 512KB" },
      { status: 413 }
    );
  }

  var text = new TextDecoder().decode(buffer);
  try {
    return JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: "无效的 JSON 格式" },
      { status: 400 }
    );
  }
}
