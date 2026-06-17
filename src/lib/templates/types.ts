/**
 * 平台模板类型定义
 *
 * 支持两种模式：
 * 1. 旧版简单模板（fieldMap + columnTypes + cleanRules）— 向后兼容
 * 2. 新版增强模板（matchRules + fieldMap with roles + parseRules）— 模板匹配引擎
 */

import type { SemanticRole } from "@/lib/semantic/types";
import type { TableClass } from "@/lib/classifier";

// ============================================================================
// 旧版接口（向后兼容）
// ============================================================================

/** @deprecated 旧版简单模板，仅用于向后兼容 */
export interface LegacyTemplate {
  id: string;
  name: string;
  fieldMap: Record<string, string>;
  columnTypes: Record<string, "number" | "date" | "category" | "text">;
  cleanRules: Record<string, string>;
}

export interface ColumnMeta {
  name: string;
  standardName?: string;
  type: "number" | "date" | "category" | "text";
  selected: boolean;
}

// ============================================================================
// 新版增强模板
// ============================================================================

/** 支持的平台 */
export type Platform = "tmall" | "taobao" | "pdd" | "douyin" | "jd" | "alimama" | "qianchuan" | "generic";

/** 模板分类（映射到 TableClass） */
export type TemplateCategory = "order" | "marketing" | "aftersales" | "inventory" | "product" | "supply";

/** 字段映射条目 */
export interface FieldMapping {
  /** 标准字段名（跨平台统一） */
  standard: string;
  /** 语义角色 */
  role: SemanticRole;
  /** 业务概念（可选，更精细的语义） */
  businessConcept?: string;
  /** 该字段在各平台导出中的别名列表 */
  aliases: string[];
}

/** 匹配规则 */
export interface MatchRules {
  /** 必须匹配的列名（至少匹配 rate% 以上） */
  requiredColumns: string[];
  /** 必须匹配的比例（0-1），默认 0.6 */
  requiredMatchRate?: number;
  /** 加分列（匹配越多分数越高，但不是必须） */
  optionalColumns: string[];
  /** 列数范围 [min, max]，超出范围扣分 */
  columnCountRange: [number, number];
}

/** 解析规则 */
export interface ParseRules {
  /** 表头行策略 */
  headerRowStrategy: "first_row" | "auto_detect" | number;
  /** 需要跳过的行号（0-based，如平台导出首行常为大标题） */
  skipRows?: number[];
  /** 日期格式（用于解析时间列） */
  dateFormat?: string;
  /** 是否包含合并单元格 */
  hasMergedCells?: boolean;
}

/** 增强版平台模板 */
export interface PlatformTemplate {
  id: string;
  name: string;
  /** 平台 */
  platform: Platform;
  /** 模板分类 */
  category: TemplateCategory;
  /** 匹配规则 */
  matchRules: MatchRules;
  /** 字段映射：原始列名 → 字段定义 */
  fieldMap: Record<string, FieldMapping>;
  /** 解析规则 */
  parseRules: ParseRules;
  /** 模板版本号 */
  version: string;
  /** 模板描述 */
  description?: string;
}

/** 模板匹配结果 */
export interface TemplateMatchResult {
  /** 匹配到的模板 */
  template: PlatformTemplate;
  /** 匹配置信度 0-1 */
  confidence: number;
  /** 匹配到的列映射：原始列名 → 标准字段名 */
  columnMapping: Record<string, string>;
  /** 匹配详情（调试用） */
  details: {
    requiredMatched: number;
    requiredTotal: number;
    optionalMatched: number;
    optionalTotal: number;
  };
}
