export const JARGON_STORAGE_KEY = "jargon_vault_items";

export const JARGON_DEFAULT_CATEGORIES = [
  "大厂黑话",
  "AI技术",
  "金融",
  "职场",
  "通用",
  "其它",
] as const;

export type JargonCategory = (typeof JARGON_DEFAULT_CATEGORIES)[number];

/** 黑话生词本唯一规范数据模型。 */
export interface JargonItem {
  id: string;
  term: string;
  explanation: string;
  analogy?: string;
  sourceContext?: string;
  sourceUrl?: string;
  category: JargonCategory;
  tags: string[];
  isStarred: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface JargonInput
  extends Partial<Omit<JargonItem, "term" | "explanation" | "category">> {
  term: string;
  explanation: string;
  category?: JargonCategory | "职场暗语" | string;
  /** @deprecated 旧版字段，仅在输入兼容层读取。 */
  metaphor?: string;
  /** @deprecated 旧版字段，仅在输入兼容层读取。 */
  starred?: boolean;
}

export interface JargonStorage {
  [JARGON_STORAGE_KEY]?: unknown[];
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
  version: "2.0";
  exportedAt: string;
  count: number;
  items: JargonItem[];
}
