export type PlatformKey = "tmall" | "taobao" | "jd" | "pdd" | "douyin";

var VALID_PLATFORMS: PlatformKey[] = ["tmall", "taobao", "jd", "pdd", "douyin"];

export function normalizePlatform(value?: string | null): PlatformKey | "" {
  if (!value) return "";
  var v = String(value).trim().toLowerCase();
  if (v === "天猫" || v === "tmall") return "tmall";
  if (v === "淘宝" || v === "taobao") return "taobao";
  if (v === "京东" || v === "jd") return "jd";
  if (v === "拼多多" || v === "pdd") return "pdd";
  if (v === "抖音" || v === "douyin") return "douyin";
  return VALID_PLATFORMS.indexOf(v as PlatformKey) >= 0 ? (v as PlatformKey) : "";
}

/**
 * 从平台持久化值和列名检测电商平台。
 *
 * 注意："买家会员"、"买家实际支付" 等是阿里系通用字段，不能默认归为天猫，
 * 否则淘宝数据会套用天猫费率模型。
 */
export function detectPlatform(columns: string[], persistedPlatform?: string | null): PlatformKey | "" {
  var persisted = normalizePlatform(persistedPlatform);
  if (persisted) return persisted;

  var joined = (columns || []).join(" ");
  if (/tmall|天猫/i.test(joined)) return "tmall";
  if (/taobao|淘宝|宝贝/i.test(joined)) return "taobao";
  if (/京东|\bjd\b|自营|pop/i.test(joined)) return "jd";
  if (/拼多多|\bpdd\b|拼团|百亿补贴/i.test(joined)) return "pdd";
  if (/抖音|douyin|达人|直播|千川|罗盘/i.test(joined)) return "douyin";

  return "";
}

export function getPlatformLabel(platform?: string | null): string {
  var p = normalizePlatform(platform);
  if (p === "tmall") return "天猫";
  if (p === "taobao") return "淘宝";
  if (p === "jd") return "京东";
  if (p === "pdd") return "拼多多";
  if (p === "douyin") return "抖音";
  return platform || "";
}
