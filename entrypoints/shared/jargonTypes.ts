/**
 * 黑话生词本与收藏 (Jargon Vault) 数据模型与类型定义
 */

export interface JargonItem {
  id: string; // UUID
  term: string; // 核心黑话/术语（如 "颗粒度"、"RAG"）
  explanation: string; // 人话通俗解释
  metaphor?: string; // 生活比喻/类比
  sourceContext?: string; // 划词/提问上下文
  sourceUrl?: string; // 来源页面 URL
  category?: string; // 分类："大厂黑话" | "AI技术" | "金融" | "职场暗语" | "通用"
  tags?: string[]; // 自定义标签
  starred?: boolean; // 是否星标/置顶
  createdAt: number;
  updatedAt: number;
}

export const JARGON_STORAGE_KEY = "jargon_vault_items";

export const JARGON_DEFAULT_CATEGORIES = [
  "大厂黑话",
  "AI技术",
  "金融",
  "职场暗语",
  "通用",
] as const;

export type JargonCategory =
  | (typeof JARGON_DEFAULT_CATEGORIES)[number]
  | string;

export interface JargonInput {
  id?: string;
  term: string;
  explanation: string;
  metaphor?: string;
  sourceContext?: string;
  sourceUrl?: string;
  category?: string;
  tags?: string[];
  starred?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface JargonStorage {
  [JARGON_STORAGE_KEY]?: JargonItem[];
}

export interface JargonFilterOptions {
  query?: string;
  category?: string;
  starredOnly?: boolean;
}

export interface JargonImportResult {
  success: boolean;
  importedCount: number;
  updatedCount: number;
  totalCount: number;
  errors?: string[];
}

export interface JargonExportData {
  version: string;
  exportedAt: string;
  count: number;
  items: JargonItem[];
}
