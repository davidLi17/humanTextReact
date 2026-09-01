import { createLogger } from "./logger";
import { createRequestId } from "./requestProtocol";

const logger = createLogger("jargon-storage", "📚");

export const JARGON_VAULT_STORAGE_KEY = "jargon_vault_items";

export const JARGON_CATEGORIES = [
  "大厂黑话",
  "AI技术",
  "职场",
  "其它",
] as const;

export type JargonCategory = (typeof JARGON_CATEGORIES)[number];

export const JARGON_FILTER_CATEGORIES = [
  "全部",
  "⭐ 星标",
  "大厂黑话",
  "AI技术",
  "职场",
  "其它",
] as const;

export type JargonFilterCategory = (typeof JARGON_FILTER_CATEGORIES)[number];

export interface JargonItem {
  id: string;
  term: string;
  explanation: string;
  analogy?: string;
  category: JargonCategory;
  tags: string[];
  isStarred: boolean;
  createdAt: number;
  updatedAt: number;
  sourceUrl?: string;
  sourceContext?: string;
}

function getBrowserStorage(): any {
  const g = globalThis as any;
  if (typeof g.browser !== "undefined" && g.browser?.storage?.local) {
    return g.browser.storage.local;
  }
  if (typeof g.chrome !== "undefined" && g.chrome?.storage?.local) {
    return g.chrome.storage.local;
  }
  return null;
}

/**
 * 内存后备存储（针对测试环境或无 storage API 环境）
 */
let memoryJargonStorage: JargonItem[] = [];

/**
 * 获取所有生词本词条
 */
export async function getJargonList(): Promise<JargonItem[]> {
  try {
    const storage = getBrowserStorage();
    if (!storage) {
      return [...memoryJargonStorage];
    }
    const result = await storage.get(JARGON_VAULT_STORAGE_KEY);
    const items = result[JARGON_VAULT_STORAGE_KEY];
    if (Array.isArray(items)) {
      return items;
    }
    return [];
  } catch (error) {
    logger.error("获取生词本失败:", error);
    return [...memoryJargonStorage];
  }
}

/**
 * 保存单个生词本词条（新增或按 ID 更新）
 */
export async function saveJargonItem(
  itemData: Partial<JargonItem> & { term: string; explanation: string }
): Promise<JargonItem> {
  const currentList = await getJargonList();
  const now = Date.now();

  const trimmedTerm = itemData.term.trim();
  const trimmedExplanation = itemData.explanation.trim();
  const cleanAnalogy = itemData.analogy?.trim() || undefined;

  let existingIndex = -1;
  if (itemData.id) {
    existingIndex = currentList.findIndex((item) => item.id === itemData.id);
  } else {
    // 检查是否有同名术语
    existingIndex = currentList.findIndex(
      (item) => item.term.toLowerCase() === trimmedTerm.toLowerCase()
    );
  }

  let savedItem: JargonItem;

  if (existingIndex >= 0) {
    const existing = currentList[existingIndex];
    savedItem = {
      ...existing,
      ...itemData,
      term: trimmedTerm,
      explanation: trimmedExplanation,
      analogy: cleanAnalogy !== undefined ? cleanAnalogy : existing.analogy,
      category: itemData.category || existing.category || "其它",
      tags: Array.isArray(itemData.tags) ? itemData.tags : existing.tags || [],
      isStarred:
        typeof itemData.isStarred === "boolean"
          ? itemData.isStarred
          : existing.isStarred,
      updatedAt: now,
    };
    currentList[existingIndex] = savedItem;
  } else {
    savedItem = {
      id: itemData.id || createRequestId(),
      term: trimmedTerm,
      explanation: trimmedExplanation,
      analogy: cleanAnalogy,
      category: itemData.category || "其它",
      tags: Array.isArray(itemData.tags) ? itemData.tags : [],
      isStarred: itemData.isStarred ?? false,
      createdAt: itemData.createdAt || now,
      updatedAt: now,
      sourceUrl: itemData.sourceUrl,
      sourceContext: itemData.sourceContext,
    };
    currentList.unshift(savedItem);
  }

  const storage = getBrowserStorage();
  if (storage) {
    await storage.set({ [JARGON_VAULT_STORAGE_KEY]: currentList });
  } else {
    memoryJargonStorage = currentList;
  }

  return savedItem;
}

/**
 * 切换星标状态
 */
export async function toggleStarJargon(id: string): Promise<boolean> {
  const currentList = await getJargonList();
  const target = currentList.find((item) => item.id === id);
  if (!target) return false;

  target.isStarred = !target.isStarred;
  target.updatedAt = Date.now();

  const storage = getBrowserStorage();
  if (storage) {
    await storage.set({ [JARGON_VAULT_STORAGE_KEY]: currentList });
  } else {
    memoryJargonStorage = currentList;
  }

  return target.isStarred;
}

/**
 * 删除单个词条
 */
export async function deleteJargonItem(id: string): Promise<boolean> {
  const currentList = await getJargonList();
  const filtered = currentList.filter((item) => item.id !== id);

  if (filtered.length === currentList.length) return false;

  const storage = getBrowserStorage();
  if (storage) {
    await storage.set({ [JARGON_VAULT_STORAGE_KEY]: filtered });
  } else {
    memoryJargonStorage = filtered;
  }

  return true;
}

/**
 * 更新词条内容
 */
export async function updateJargonItem(
  id: string,
  updates: Partial<Omit<JargonItem, "id" | "createdAt">>
): Promise<JargonItem | null> {
  const currentList = await getJargonList();
  const targetIndex = currentList.findIndex((item) => item.id === id);
  if (targetIndex < 0) return null;

  const existing = currentList[targetIndex];
  const updatedItem: JargonItem = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  };

  currentList[targetIndex] = updatedItem;

  const storage = getBrowserStorage();
  if (storage) {
    await storage.set({ [JARGON_VAULT_STORAGE_KEY]: currentList });
  } else {
    memoryJargonStorage = currentList;
  }

  return updatedItem;
}

/**
 * 检查术语是否已被保存在生词本中
 */
export async function isTermSavedInVault(term: string): Promise<boolean> {
  const trimmed = term.trim().toLowerCase();
  if (!trimmed) return false;
  const list = await getJargonList();
  return list.some((item) => item.term.toLowerCase() === trimmed);
}

/**
 * 智能提取与推断词条详情（从选中文本、用户提问与 AI 回复中提炼）
 */
export function inferJargonDetails(
  rawTerm: string,
  rawExplanation: string,
  sourceUrl?: string
): {
  term: string;
  explanation: string;
  analogy?: string;
  category: JargonCategory;
  tags: string[];
} {
  let term = rawTerm.trim();
  // 清洗 term 中的冗余提问词（如 "什么是赋能？" -> "赋能"）
  term = term
    .replace(/^什么是/g, "")
    .replace(/^请解释/g, "")
    .replace(/^帮我通读/g, "")
    .replace(/^通读网页[:：]?\s*/g, "")
    .replace(/^《|》$/g, "")
    .replace(/[？?！!。，,]+$/g, "")
    .trim();

  if (!term) {
    term = "黑话词条";
  }

  let explanation = rawExplanation.trim();
  let analogy: string | undefined = undefined;

  // 尝试提取生活比喻引用
  const analogyPatterns = [
    /(?:💡?\s*(?:生活)?比喻[:：]\s*)([^\n]+(?:\n[^\n]+)*?)(?=\n\n|\n[#*-]|$)/i,
    /(?:【(?:生活)?比喻】[:：]?\s*)([^\n]+(?:\n[^\n]+)*?)(?=\n\n|\n[#*-]|$)/i,
    /(?:> ?💡?\s*(?:生活)?比喻[:：]?\s*)([^\n]+)/i,
  ];

  for (const pattern of analogyPatterns) {
    const match = explanation.match(pattern);
    if (match && match[1]) {
      analogy = match[1].trim();
      break;
    }
  }

  // 智能推断分类
  const fullText = `${term} ${explanation}`.toLowerCase();
  let category: JargonCategory = "大厂黑话";

  const aiKeywords = [
    "ai",
    "llm",
    "agent",
    "prompt",
    "rag",
    "大模型",
    "向量",
    "幻觉",
    "微调",
    "transformer",
    "token",
    "思维链",
    "蒸馏",
    "预训练",
    "神经网络",
    "机器学习",
    "深度学习",
    "上下文",
  ];

  const workplaceKeywords = [
    "okr",
    "kpi",
    "pip",
    "述职",
    "晋升",
    "绩效",
    "汇报",
    "职级",
    "年终奖",
    "试用期",
    "薪酬",
    "扁平化",
    "向上管理",
    "裁员",
    "hr",
    "背锅",
  ];

  const techKeywords = [
    "架构",
    "接口",
    "微服务",
    "高并发",
    "中间件",
    "容器",
    "k8s",
    "缓存",
    "消息队列",
    "数据库",
    "容灾",
  ];

  if (aiKeywords.some((k) => fullText.includes(k))) {
    category = "AI技术";
  } else if (workplaceKeywords.some((k) => fullText.includes(k))) {
    category = "职场";
  } else if (techKeywords.some((k) => fullText.includes(k))) {
    category = "AI技术";
  } else {
    category = "大厂黑话";
  }

  // 提取初始标签
  const tags: string[] = [category];
  if (analogy) {
    tags.push("含生活比喻");
  }

  return {
    term,
    explanation,
    analogy,
    category,
    tags,
  };
}

/**
 * 导出为结构化 Markdown
 */
export function exportJargonAsMarkdown(items: JargonItem[]): string {
  if (!items || items.length === 0) {
    return "# 📚 人话生词本 (Jargon Vault)\n\n暂无收藏词条。";
  }

  const lines: string[] = [
    "# 📚 人话翻译器 · 黑话生词本与收藏",
    `> 共收录 ${items.length} 个黑话词条 · 导出时间: ${new Date().toLocaleString()}`,
    "",
    "---",
    "",
  ];

  items.forEach((item, index) => {
    const starMarker = item.isStarred ? " ⭐" : "";
    lines.push(`## ${index + 1}. ${item.term}${starMarker}`);
    lines.push(`- **分类**: \`${item.category}\``);
    if (item.tags && item.tags.length > 0) {
      lines.push(`- **标签**: ${item.tags.map((t) => `\`#${t}\``).join(" ")}`);
    }
    if (item.analogy) {
      lines.push(`- **💡 生活比喻**: > ${item.analogy}`);
    }
    lines.push("");
    lines.push("### 📖 人话解释");
    lines.push(item.explanation);
    lines.push("");
    lines.push("---");
    lines.push("");
  });

  return lines.join("\n");
}

/**
 * 导出为 JSON 字符串
 */
export function exportJargonAsJson(items: JargonItem[]): string {
  return JSON.stringify(items, null, 2);
}

/**
 * 触发 JSON 文件下载
 */
export function downloadJargonJsonFile(items: JargonItem[]): void {
  const jsonContent = exportJargonAsJson(items);
  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `human-text-jargon-vault-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 导入 JSON 词库
 */
export async function importJargonItems(
  rawInput: unknown
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    let parsed: any = rawInput;
    if (typeof rawInput === "string") {
      parsed = JSON.parse(rawInput);
    }

    if (!Array.isArray(parsed)) {
      return { success: false, count: 0, error: "导入的数据不是有效的数组格式" };
    }

    const currentList = await getJargonList();
    const existingTerms = new Set(
      currentList.map((i) => i.term.trim().toLowerCase())
    );

    let importedCount = 0;
    const now = Date.now();

    for (const raw of parsed) {
      if (
        !raw ||
        typeof raw !== "object" ||
        typeof raw.term !== "string" ||
        !raw.term.trim()
      ) {
        continue;
      }

      const term = raw.term.trim();
      const explanation =
        typeof raw.explanation === "string" ? raw.explanation.trim() : "";
      if (!explanation) continue;

      const category: JargonCategory = JARGON_CATEGORIES.includes(raw.category)
        ? raw.category
        : "其它";

      const newItem: JargonItem = {
        id: raw.id && typeof raw.id === "string" ? raw.id : createRequestId(),
        term,
        explanation,
        analogy: typeof raw.analogy === "string" ? raw.analogy.trim() : undefined,
        category,
        tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
        isStarred: Boolean(raw.isStarred),
        createdAt: typeof raw.createdAt === "number" ? raw.createdAt : now,
        updatedAt: now,
        sourceUrl: typeof raw.sourceUrl === "string" ? raw.sourceUrl : undefined,
        sourceContext:
          typeof raw.sourceContext === "string" ? raw.sourceContext : undefined,
      };

      const existingIdx = currentList.findIndex(
        (i) => i.term.toLowerCase() === term.toLowerCase()
      );

      if (existingIdx >= 0) {
        currentList[existingIdx] = {
          ...currentList[existingIdx],
          ...newItem,
          id: currentList[existingIdx].id,
          updatedAt: now,
        };
      } else {
        currentList.unshift(newItem);
        existingTerms.add(term.toLowerCase());
      }
      importedCount++;
    }

    if (importedCount === 0) {
      return {
        success: false,
        count: 0,
        error: "未找到符合格式的黑话词条（需包含 term 与 explanation）",
      };
    }

    const storage = getBrowserStorage();
    if (storage) {
      await storage.set({ [JARGON_VAULT_STORAGE_KEY]: currentList });
    } else {
      memoryJargonStorage = currentList;
    }

    return { success: true, count: importedCount };
  } catch (error: any) {
    logger.error("导入生词本失败:", error);
    return {
      success: false,
      count: 0,
      error: error?.message || "解析导入文件失败",
    };
  }
}
