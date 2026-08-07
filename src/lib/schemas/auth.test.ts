/**
 * Auth Schema 单测
 *
 * 覆盖登录/注册请求的合法、非法、注入、边界值场景。
 */

import { describe, it, expect } from "vitest";
import {
  validateLoginRequest,
  validateRegisterRequest,
} from "@/lib/schemas";

describe("validateLoginRequest", () => {
  it("合法请求应通过并规范化邮箱", () => {
    const result = validateLoginRequest({
      email: "  User@Example.COM  ",
      password: "abc12345",
    });
    expect(result.email).toBe("user@example.com");
    expect(result.password).toBe("abc12345");
  });

  it("缺少 email 应抛出", () => {
    expect(function () {
      validateLoginRequest({ password: "abc12345" } as any);
    }).toThrow();
  });

  it("缺少 password 应抛出", () => {
    expect(function () {
      validateLoginRequest({ email: "a@b.com" } as any);
    }).toThrow();
  });

  it("email 过长应抛出", () => {
    expect(function () {
      validateLoginRequest({
        email: "a".repeat(257) + "@example.com",
        password: "abc12345",
      });
    }).toThrow();
  });

  it("非法邮箱格式应抛出", () => {
    expect(function () {
      validateLoginRequest({ email: "not-an-email", password: "abc12345" });
    }).toThrow();
  });

  it("密码过短应抛出", () => {
    expect(function () {
      validateLoginRequest({ email: "a@b.com", password: "abc1234" });
    }).toThrow();
  });

  it("密码过长应抛出", () => {
    expect(function () {
      validateLoginRequest({ email: "a@b.com", password: "a".repeat(129) });
    }).toThrow();
  });

  it("纯字母密码应抛出", () => {
    expect(function () {
      validateLoginRequest({ email: "a@b.com", password: "abcdefgh" });
    }).toThrow();
  });

  it("纯数字密码应抛出", () => {
    expect(function () {
      validateLoginRequest({ email: "a@b.com", password: "12345678" });
    }).toThrow();
  });
});

describe("validateRegisterRequest", () => {
  it("合法请求应通过并规范化邮箱与姓名", () => {
    const result = validateRegisterRequest({
      email: "  User@Example.COM  ",
      password: "abc12345",
      name: "  Zhang San  ",
    });
    expect(result.email).toBe("user@example.com");
    expect(result.name).toBe("Zhang San");
    expect(result.password).toBe("abc12345");
  });

  it("可选 name 缺失时应通过", () => {
    const result = validateRegisterRequest({
      email: "a@b.com",
      password: "abc12345",
    });
    expect(result.email).toBe("a@b.com");
    expect(result.name).toBeUndefined();
  });

  it("name 为空字符串时应视为空字符串", () => {
    const result = validateRegisterRequest({
      email: "a@b.com",
      password: "abc12345",
      name: "",
    });
    expect(result.email).toBe("a@b.com");
    expect(result.name).toBe("");
  });

  it("name 过长应抛出", () => {
    expect(function () {
      validateRegisterRequest({
        email: "a@b.com",
        password: "abc12345",
        name: "a".repeat(101),
      });
    }).toThrow();
  });

  it("email 含注入类字符但仍满足格式时应通过校验", () => {
    const result = validateRegisterRequest({
      email: "a'+OR+'1'='1@b.com",
      password: "abc12345",
    });
    expect(result.email).toBe("a'+or+'1'='1@b.com");
  });

  it("password 含特殊字符但满足字母+数字规则时应通过", () => {
    const result = validateRegisterRequest({
      email: "a@b.com",
      password: "Abc123!@#",
    });
    expect(result.password).toBe("Abc123!@#");
  });
});
