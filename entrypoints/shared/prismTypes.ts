/**
 * 多维视角三棱镜（Translation Prism）核心类型定义
 */

export const PRISM_TAB_KEYS = {
  VERNACULAR: "vernacular", // 🍼 直白人话版
  CORPORATE: "corporate",   // 👔 向上汇报版
  TRUTH: "truth",           // 🔪 犀利真相版
  RAW: "raw",               // 📋 完整版
} as const;

export type PrismTabKey = (typeof PRISM_TAB_KEYS)[keyof typeof PRISM_TAB_KEYS];

export interface PrismTabMeta {
  key: PrismTabKey;
  label: string;
  shortLabel: string;
  emoji: string;
  description: string;
}

export const PRISM_TABS: Record<PrismTabKey, PrismTabMeta> = {
  vernacular: {
    key: "vernacular",
    label: "直白人话版",
    shortLabel: "直白人话",
    emoji: "🍼",
    description: "通俗易懂、撕碎形式主义、生活化打比方",
  },
  corporate: {
    key: "corporate",
    label: "向上汇报版",
    shortLabel: "向上汇报",
    emoji: "👔",
    description: "高情商职场神器，大白话秒变周报述职范本",
  },
  truth: {
    key: "truth",
    label: "犀利真相版",
    shortLabel: "犀利真相",
    emoji: "🔪",
    description: "幽默解构潜台词，看穿职场内耗与伪装",
  },
  raw: {
    key: "raw",
    label: "完整输出",
    shortLabel: "全文",
    emoji: "📋",
    description: "查看三合一完整 Markdown 输出",
  },
};

export interface PrismParsedResult {
  /** 是否命中了三棱镜多维输出标记 */
  isPrism: boolean;
  /** 🍼 直白人话版内容 */
  vernacular: string;
  /** 👔 向上汇报版内容 */
  corporate: string;
  /** 🔪 犀利真相版内容 */
  truth: string;
  /** 完整原始内容 */
  raw: string;
  /** 当前正在流式接收的分段（可选） */
  activeStreamKey?: PrismTabKey;
}
