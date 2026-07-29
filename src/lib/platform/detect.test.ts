/**
 * Platform detection 单测
 */

import { describe, it, expect } from "vitest";
import { detectPlatform, normalizePlatform, getPlatformLabel } from "@/lib/platform/detect";

describe("normalizePlatform", () => {
  it("中文平台名应正确映射", () => {
    expect(normalizePlatform("天猫")).toBe("tmall");
    expect(normalizePlatform("淘宝")).toBe("taobao");
    expect(normalizePlatform("京东")).toBe("jd");
    expect(normalizePlatform("拼多多")).toBe("pdd");
    expect(normalizePlatform("抖音")).toBe("douyin");
  });

  it("英文 platform key 应正确映射", () => {
    expect(normalizePlatform("tmall")).toBe("tmall");
    expect(normalizePlatform("taobao")).toBe("taobao");
    expect(normalizePlatform("jd")).toBe("jd");
    expect(normalizePlatform("pdd")).toBe("pdd");
    expect(normalizePlatform("douyin")).toBe("douyin");
  });

  it("大小写不敏感", () => {
    expect(normalizePlatform("TMALL")).toBe("tmall");
    expect(normalizePlatform("Taobao")).toBe("taobao");
  });

  it("空值/未知值应返回空字符串", () => {
    expect(normalizePlatform("")).toBe("");
    expect(normalizePlatform(null as any)).toBe("");
    expect(normalizePlatform(undefined as any)).toBe("");
    expect(normalizePlatform("amazon")).toBe("");
  });
});

describe("detectPlatform", () => {
  it("列名含天猫应识别为 tmall", () => {
    expect(detectPlatform(["商品名称", "天猫订单号", "售价"])).toBe("tmall");
  });

  it("列名含淘宝/宝贝应识别为 taobao", () => {
    expect(detectPlatform(["宝贝标题", "淘宝订单号", "买家实付"])).toBe("taobao");
  });

  it("列名含京东/自营应识别为 jd", () => {
    expect(detectPlatform(["京东订单号", "自营", "POP店铺"])).toBe("jd");
  });

  it("列名含拼多多/百亿补贴应识别为 pdd", () => {
    expect(detectPlatform(["拼多多订单", "百亿补贴", "拼团"])).toBe("pdd");
  });

  it("列名含抖音/达人/千川应识别为 douyin", () => {
    expect(detectPlatform(["抖音订单", "达人佣金", "千川"])).toBe("douyin");
  });

  it("persisted platform 优先于列名检测", () => {
    expect(detectPlatform(["售价", "数量"], "tmall")).toBe("tmall");
  });

  it("通用阿里字段不应误判为天猫", () => {
    // "买家会员"、"买家实际支付" 是阿里系通用字段
    expect(detectPlatform(["买家会员号", "买家实际支付", "订单状态"])).toBe("");
  });

  it("空列名数组应返回空字符串", () => {
    expect(detectPlatform([])).toBe("");
    expect(detectPlatform(null as any)).toBe("");
  });
});

describe("getPlatformLabel", () => {
  it("应返回中文平台名", () => {
    expect(getPlatformLabel("tmall")).toBe("天猫");
    expect(getPlatformLabel("taobao")).toBe("淘宝");
    expect(getPlatformLabel("jd")).toBe("京东");
    expect(getPlatformLabel("pdd")).toBe("拼多多");
    expect(getPlatformLabel("douyin")).toBe("抖音");
  });

  it("未知平台应返回原值", () => {
    expect(getPlatformLabel("unknown")).toBe("unknown");
    expect(getPlatformLabel(null)).toBe("");
  });
});
