import Fuse from "fuse.js";
import { createLogger } from "./logger";
import { createRequestId } from "./requestProtocol";
import {
  JARGON_DEFAULT_CATEGORIES,
  JARGON_STORAGE_KEY,
  type JargonCategory,
  type JargonExportData,
  type JargonImportResult,
  type JargonInput,
  type JargonItem,
} from "./jargonTypes";

export type { JargonCategory, JargonInput, JargonItem } from "./jargonTypes";

const logger = createLogger("jargon-storage", "📚");

export const JARGON_VAULT_STORAGE_KEY = JARGON_STORAGE_KEY;
export const JARGON_CATEGORIES = JARGON_DEFAULT_CATEGORIES;
export const JARGON_FILTER_CATEGORIES = [
  "全部",
  "⭐ 星标",
  ...JARGON_CATEGORIES,
] as const;
export type JargonFilterCategory = (typeof JARGON_FILTER_CATEGORIES)[number];

const CATEGORY_ALIASES: Record<string, JargonCategory> = {
  职场暗语: "职场",
};

function getBrowserStorage(): any {
  const globalObject = globalThis as any;
  return (
    globalObject.browser?.storage?.local ||
    globalObject.chrome?.storage?.local ||
    null
  );
}

let memoryJargonStorage: JargonItem[] = [];

function cleanOptionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
        .filter(Boolean)
    )
  );
}

export function normalizeJargonCategory(value: unknown): JargonCategory {
  const category = cleanOptionalText(value);
  if (!category) return "通用";
  if (CATEGORY_ALIASES[category]) return CATEGORY_ALIASES[category];
  return (JARGON_CATEGORIES as readonly string[]).includes(category)
    ? (category as JargonCategory)
    : "其它";
}

/** 将两代字段和分类归一为唯一可持久化模型。 */
export function normalizeJargonItem(
  raw: unknown,
  now = Date.now()
): JargonItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const term = cleanOptionalText(item.term);
  const explanation = cleanOptionalText(item.explanation);
  if (!term || !explanation) return null;

  const createdAt =
    typeof item.createdAt === "number" && item.createdAt > 0
      ? item.createdAt
      : now;
  const updatedAt =
    typeof item.updatedAt === "number" && item.updatedAt > 0
      ? item.updatedAt
      : createdAt;

  return {
    id: cleanOptionalText(item.id) || createRequestId(),
    term,
    explanation,
    analogy: cleanOptionalText(item.analogy) || cleanOptionalText(item.metaphor),
    category: normalizeJargonCategory(item.category),
    tags: cleanTags(item.tags),
    isStarred:
      typeof item.isStarred === "boolean"
        ? item.isStarred
        : Boolean(item.starred),
    createdAt,
    updatedAt,
    sourceUrl: cleanOptionalText(item.sourceUrl),
    sourceContext: cleanOptionalText(item.sourceContext),
  };
}

async function persistJargonList(items: JargonItem[]): Promise<void> {
  const storage = getBrowserStorage();
  if (storage) {
    await storage.set({ [JARGON_STORAGE_KEY]: items });
  } else {
    memoryJargonStorage = items;
  }
}

/** 读取时自动迁移旧版 starred/metaphor/职场暗语 数据。 */
export async function getJargonList(): Promise<JargonItem[]> {
  try {
    const storage = getBrowserStorage();
    const rawItems = storage
      ? (await storage.get(JARGON_STORAGE_KEY))[JARGON_STORAGE_KEY]
      : memoryJargonStorage;
    if (!Array.isArray(rawItems)) return [];

    const normalized = rawItems
      .map((item) => normalizeJargonItem(item))
      .filter((item): item is JargonItem => Boolean(item));

    if (JSON.stringify(rawItems) !== JSON.stringify(normalized)) {
      await persistJargonList(normalized);
    }
    return normalized;
  } catch (error) {
    logger.error("获取生词本失败:", error);
    return [...memoryJargonStorage];
  }
}

function normalizeInput(itemData: JargonInput): Omit<JargonItem, "id" | "createdAt" | "updatedAt"> {
  const term = itemData.term.trim();
  const explanation = itemData.explanation.trim();
  if (!term) throw new Error("术语名称 (term) 不能为空");
  if (!explanation) throw new Error("人话释义 (explanation) 不能为空");

  return {
    term,
    explanation,
    analogy:
      cleanOptionalText(itemData.analogy) || cleanOptionalText(itemData.metaphor),
    category: normalizeJargonCategory(itemData.category),
    tags: cleanTags(itemData.tags),
    isStarred:
      typeof itemData.isStarred === "boolean"
        ? itemData.isStarred
        : Boolean(itemData.starred),
    sourceUrl: cleanOptionalText(itemData.sourceUrl),
    sourceContext: cleanOptionalText(itemData.sourceContext),
  };
}

/** 新增或按 ID/term 合并。持久化结果永远只包含规范字段。 */
export async function saveJargonItem(itemData: JargonInput): Promise<JargonItem> {
  const currentList = await getJargonList();
  const normalized = normalizeInput(itemData);
  const now = Date.now();
  const existingIndex = itemData.id
    ? currentList.findIndex((item) => item.id === itemData.id)
    : currentList.findIndex(
        (item) => item.term.toLowerCase() === normalized.term.toLowerCase()
      );

  let savedItem: JargonItem;
  if (existingIndex >= 0) {
    const existing = currentList[existingIndex];
    savedItem = {
      ...existing,
      ...normalized,
      id: existing.id,
      analogy: normalized.analogy ?? existing.analogy,
      sourceUrl: normalized.sourceUrl ?? existing.sourceUrl,
      sourceContext: normalized.sourceContext ?? existing.sourceContext,
      category:
        itemData.category !== undefined
          ? normalized.category
          : existing.category,
      tags: Array.from(new Set([...existing.tags, ...normalized.tags])),
      isStarred:
        itemData.isStarred !== undefined || itemData.starred !== undefined
          ? normalized.isStarred
          : existing.isStarred,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
    currentList.splice(existingIndex, 1);
    currentList.unshift(savedItem);
  } else {
    savedItem = {
      ...normalized,
      id: itemData.id || createRequestId(),
      createdAt: itemData.createdAt || now,
      updatedAt: itemData.updatedAt || now,
    };
    currentList.unshift(savedItem);
  }

  await persistJargonList(currentList);
  return savedItem;
}

export async function toggleStarJargon(id: string): Promise<boolean> {
  const items = await getJargonList();
  const target = items.find((item) => item.id === id);
  if (!target) return false;
  target.isStarred = !target.isStarred;
  target.updatedAt = Date.now();
  await persistJargonList(items);
  return target.isStarred;
}

export async function deleteJargonItem(id: string): Promise<boolean> {
  const items = await getJargonList();
  const filtered = items.filter((item) => item.id !== id);
  if (filtered.length === items.length) return false;
  await persistJargonList(filtered);
  return true;
}

export async function updateJargonItem(
  id: string,
  updates: Partial<Omit<JargonInput, "id" | "createdAt">>
): Promise<JargonItem | null> {
  const items = await getJargonList();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;

  const existing = items[index];
  const mergedInput: JargonInput = {
    ...existing,
    ...updates,
    term: updates.term ?? existing.term,
    explanation: updates.explanation ?? existing.explanation,
    id,
  };
  if (updates.analogy === undefined && updates.metaphor !== undefined) {
    mergedInput.analogy = undefined;
  }
  if (updates.isStarred === undefined && updates.starred !== undefined) {
    mergedInput.isStarred = undefined;
  }
  const normalized = normalizeInput(mergedInput);
  const updated: JargonItem = {
    ...existing,
    ...normalized,
    id,
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  };
  items[index] = updated;
  await persistJargonList(items);
  return updated;
}

export async function isTermSavedInVault(term: string): Promise<boolean> {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return false;
  return (await getJargonList()).some(
    (item) => item.term.toLowerCase() === normalized
  );
}

export const MAX_JARGON_TERM_LENGTH = 60;

export function extractJargonTerm(rawTerm: string): string {
  let term = rawTerm
    .trim()
    .replace(/^什么是/g, "")
    .replace(/^请解释/g, "")
    .replace(/^帮我通读/g, "")
    .replace(/^通读网页[:：]?\s*/g, "")
    .replace(/^《|》$/g, "")
    .replace(/[？?！!。，,]+$/g, "")
    .trim();
  if (!term) return "黑话词条";

  term = term.split(/\r?\n/).find((line) => line.trim())?.trim() || term;
  if (term.length <= MAX_JARGON_TERM_LENGTH) return term;

  const prefix = term.slice(0, MAX_JARGON_TERM_LENGTH);
  const boundary = Math.max(
    prefix.lastIndexOf("。"),
    prefix.lastIndexOf("？"),
    prefix.lastIndexOf("！"),
    prefix.lastIndexOf("；"),
    prefix.lastIndexOf("，"),
    prefix.lastIndexOf(" ")
  );
  const concise = boundary >= 20 ? prefix.slice(0, boundary) : prefix;
  return `${concise.trim()}…`;
}

export function inferJargonDetails(
  rawTerm: string,
  rawExplanation: string,
  _sourceUrl?: string
): {
  term: string;
  explanation: string;
  analogy?: string;
  category: JargonCategory;
  tags: string[];
} {
  const term = extractJargonTerm(rawTerm);
  const explanation = rawExplanation.trim();
  let analogy: string | undefined;
  const patterns = [
    /(?:💡?\s*(?:生活)?比喻[:：]\s*)([^\n]+(?:\n[^\n]+)*?)(?=\n\n|\n[#*-]|$)/i,
    /(?:【(?:生活)?比喻】[:：]?\s*)([^\n]+(?:\n[^\n]+)*?)(?=\n\n|\n[#*-]|$)/i,
    /(?:> ?💡?\s*(?:生活)?比喻[:：]\s*)([^\n]+)/i,
  ];
  for (const pattern of patterns) {
    const match = explanation.match(pattern);
    if (match?.[1]) {
      analogy = match[1].trim();
      break;
    }
  }

  const fullText = `${term} ${explanation}`.toLowerCase();
  const has = (keywords: string[]) => keywords.some((word) => fullText.includes(word));
  let category: JargonCategory = "大厂黑话";
  if (
    has(["ai", "llm", "agent", "prompt", "rag", "大模型", "向量", "幻觉", "微调", "transformer", "token", "思维链", "蒸馏", "预训练", "神经网络", "机器学习", "深度学习", "上下文"])
  ) {
    category = "AI技术";
  } else if (
    has(["基金", "股票", "投资", "理财", "现金流", "安全金", "收益率", "复利", "资产", "财富", "金融"])
  ) {
    category = "金融";
  } else if (
    has(["okr", "kpi", "pip", "述职", "晋升", "绩效", "汇报", "职级", "年终奖", "试用期", "薪酬", "向上管理", "裁员", "hr", "背锅", "职场"])
  ) {
    category = "职场";
  } else if (
    has(["架构", "接口", "微服务", "高并发", "中间件", "容器", "k8s", "缓存", "消息队列", "数据库", "容灾"])
  ) {
    category = "AI技术";
  }

  return {
    term,
    explanation,
    analogy,
    category,
    tags: analogy ? [category, "含生活比喻"] : [category],
  };
}

export function filterJargonItems(
  items: JargonItem[],
  query?: string,
  category?: string,
  starredOnly?: boolean
): JargonItem[] {
  let filtered = [...items];
  if (category?.trim()) {
    const normalizedCategory = normalizeJargonCategory(category);
    filtered = filtered.filter((item) => item.category === normalizedCategory);
  }
  if (starredOnly) filtered = filtered.filter((item) => item.isStarred);
  if (query?.trim()) {
    const fuse = new Fuse(filtered, {
      keys: ["term", "explanation", "tags", "analogy", "sourceContext"],
      threshold: 0.35,
      minMatchCharLength: 1,
      shouldSort: true,
    });
    return fuse.search(query.trim()).map((result) => result.item);
  }
  return filtered.sort((a, b) =>
    Number(b.isStarred) - Number(a.isStarred) ||
    (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)
  );
}

export function exportJargonAsMarkdown(items: JargonItem[]): string {
  if (!items.length) return "# 📚 人话生词本 (Jargon Vault)\n\n暂无收藏词条。";
  const lines = [
    "# 📚 人话翻译器 · 黑话生词本与收藏",
    `> 共收录 ${items.length} 个黑话词条 · 导出时间: ${new Date().toLocaleString()}`,
    "",
    "---",
    "",
  ];
  items.forEach((item, index) => {
    lines.push(`## ${index + 1}. ${item.term}${item.isStarred ? " ⭐" : ""}`);
    lines.push(`- **分类**: \`${item.category}\``);
    if (item.tags.length) lines.push(`- **标签**: ${item.tags.map((tag) => `\`#${tag}\``).join(" ")}`);
    if (item.analogy) lines.push(`- **💡 生活比喻**: > ${item.analogy}`);
    if (item.sourceContext) lines.push(`- **使用上下文**: ${item.sourceContext}`);
    if (item.sourceUrl) lines.push(`- **来源**: [${item.sourceUrl}](${item.sourceUrl})`);
    lines.push("", "### 📖 人话解释", item.explanation, "", "---", "");
  });
  return lines.join("\n");
}

export function createJargonExportData(items: JargonItem[]): JargonExportData {
  return {
    version: "2.0",
    exportedAt: new Date().toISOString(),
    count: items.length,
    items: items.map((item) => ({ ...item })),
  };
}

export function exportJargonAsJson(items: JargonItem[]): string {
  return JSON.stringify(createJargonExportData(items), null, 2);
}

export function downloadJargonJsonFile(items: JargonItem[]): void {
  const blob = new Blob([exportJargonAsJson(items)], {
    type: "application/json;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `human-text-jargon-vault-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function extractImportList(parsed: any): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.items)) return parsed.items;
  if (parsed && Array.isArray(parsed.jargonList)) return parsed.jargonList;
  return null;
}

export async function importJargonItems(
  rawInput: unknown
): Promise<JargonImportResult & { count: number; error?: string }> {
  try {
    const parsed = typeof rawInput === "string" ? JSON.parse(rawInput) : rawInput;
    const incoming = extractImportList(parsed);
    if (!incoming) {
      return {
        success: false,
        count: 0,
        importedCount: 0,
        updatedCount: 0,
        totalCount: (await getJargonList()).length,
        error: "导入的数据不是有效的数组、items 或 jargonList 格式",
      };
    }

    const items = await getJargonList();
    let importedCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];
    for (const raw of incoming) {
      const normalized = normalizeJargonItem(raw);
      if (!normalized) {
        errors.push("跳过缺少 term 或 explanation 的词条");
        continue;
      }
      const index = items.findIndex(
        (item) => item.term.toLowerCase() === normalized.term.toLowerCase()
      );
      if (index >= 0) {
        const rawItem = raw as Record<string, unknown>;
        const hasStar =
          typeof rawItem.isStarred === "boolean" ||
          typeof rawItem.starred === "boolean";
        items[index] = {
          ...items[index],
          ...normalized,
          id: items[index].id,
          analogy: normalized.analogy ?? items[index].analogy,
          category:
            rawItem.category !== undefined
              ? normalized.category
              : items[index].category,
          isStarred: hasStar
            ? normalized.isStarred
            : items[index].isStarred,
          sourceUrl: normalized.sourceUrl ?? items[index].sourceUrl,
          sourceContext:
            normalized.sourceContext ?? items[index].sourceContext,
          createdAt: items[index].createdAt,
          tags: Array.from(new Set([...items[index].tags, ...normalized.tags])),
          updatedAt: Date.now(),
        };
        updatedCount++;
      } else {
        items.unshift(normalized);
        importedCount++;
      }
    }

    const count = importedCount + updatedCount;
    if (!count) {
      return {
        success: false,
        count: 0,
        importedCount,
        updatedCount,
        totalCount: items.length,
        errors,
        error: "未找到符合格式的黑话词条（需包含 term 与 explanation）",
      };
    }
    await persistJargonList(items);
    return {
      success: true,
      count,
      importedCount,
      updatedCount,
      totalCount: items.length,
      errors: errors.length ? errors : undefined,
    };
  } catch (error: any) {
    logger.error("导入生词本失败:", error);
    return {
      success: false,
      count: 0,
      importedCount: 0,
      updatedCount: 0,
      totalCount: (await getJargonList()).length,
      error: error?.message || "解析导入文件失败",
    };
  }
}

export async function clearJargonItems(): Promise<void> {
  await persistJargonList([]);
}
