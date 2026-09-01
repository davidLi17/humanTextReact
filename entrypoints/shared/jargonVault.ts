import Fuse from "fuse.js";
import {
  JargonItem,
  JargonInput,
  JargonStorage,
  JargonImportResult,
  JargonExportData,
  JARGON_STORAGE_KEY,
} from "./jargonTypes";
import { createLogger } from "./logger";

const logger = createLogger("jargon-vault", "📖");

/**
 * 安全生成 UUID
 */
function generateUUID(): string {
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  if (cryptoApi?.getRandomValues) {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (value) =>
      value.toString(16).padStart(2, "0")
    );
    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join(""),
    ].join("-");
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 生词本与黑话收藏管理器 (Jargon Vault)
 */
export class JargonVault {
  /**
   * 获取浏览器存储 API（兼容各环境）
   */
  private static getBrowserAPI() {
    return (globalThis as any).browser || browser;
  }

  /**
   * 读取存储中所有的生词列表
   */
  private static async getStoredItems(): Promise<JargonItem[]> {
    try {
      const browserAPI = this.getBrowserAPI();
      const result = (await browserAPI.storage.local.get(
        JARGON_STORAGE_KEY
      )) as JargonStorage;
      const items = result[JARGON_STORAGE_KEY];
      return Array.isArray(items) ? items : [];
    } catch (error) {
      logger.error("读取生词本存储失败:", error);
      return [];
    }
  }

  /**
   * 保存生词列表到存储
   */
  private static async saveStoredItems(items: JargonItem[]): Promise<void> {
    try {
      const browserAPI = this.getBrowserAPI();
      await browserAPI.storage.local.set({
        [JARGON_STORAGE_KEY]: items,
      });
    } catch (error) {
      logger.error("保存生词本存储失败:", error);
      throw error;
    }
  }

  /**
   * 获取生词列表（支持关键词/Fuse.js模糊检索、分类筛选、星标筛选）
   */
  static async getJargonList(
    query?: string,
    category?: string,
    starredOnly?: boolean
  ): Promise<JargonItem[]> {
    try {
      let items = await this.getStoredItems();

      // 1. 分类过滤
      if (category && category.trim()) {
        const targetCategory = category.trim();
        items = items.filter((item) => item.category === targetCategory);
      }

      // 2. 星标过滤
      if (starredOnly) {
        items = items.filter((item) => Boolean(item.starred));
      }

      // 3. 搜索过滤与排序
      const trimmedQuery = query?.trim();
      if (trimmedQuery) {
        const fuse = new Fuse(items, {
          keys: [
            { name: "term", weight: 0.5 },
            { name: "explanation", weight: 0.3 },
            { name: "tags", weight: 0.2 },
            { name: "metaphor", weight: 0.1 },
            { name: "sourceContext", weight: 0.1 },
          ],
          threshold: 0.35,
          minMatchCharLength: 1,
          includeScore: true,
          shouldSort: true,
        });

        const searchResults = fuse.search(trimmedQuery);
        return searchResults.map((res) => res.item);
      }

      // 无搜索词时，默认排序：星标优先置顶，其次按更新时间倒序
      return items.sort((a, b) => {
        const starA = a.starred ? 1 : 0;
        const starB = b.starred ? 1 : 0;
        if (starA !== starB) {
          return starB - starA;
        }
        return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
      });
    } catch (error) {
      logger.error("获取生词列表失败:", error);
      return [];
    }
  }

  /**
   * 添加或更新生词条目（自动按 term 去重并合并）
   */
  static async addJargon(item: JargonInput): Promise<JargonItem> {
    if (!item.term || !item.term.trim()) {
      throw new Error("术语名称 (term) 不能为空");
    }
    if (!item.explanation || !item.explanation.trim()) {
      throw new Error("人话释义 (explanation) 不能为空");
    }

    const items = await this.getStoredItems();
    const cleanTerm = item.term.trim();
    const normalizedTerm = cleanTerm.toLowerCase();

    // 查找是否已存在同名术语（忽略大小写与前后空格）
    const existingIndex = items.findIndex(
      (existing) => existing.term.trim().toLowerCase() === normalizedTerm
    );

    const now = Date.now();

    if (existingIndex >= 0) {
      const existing = items[existingIndex];

      // 合并标签（去重）
      let mergedTags = existing.tags || [];
      if (item.tags && item.tags.length > 0) {
        mergedTags = Array.from(
          new Set([
            ...mergedTags,
            ...item.tags.map((t) => t.trim()).filter(Boolean),
          ])
        );
      }

      const updatedItem: JargonItem = {
        ...existing,
        term: cleanTerm,
        explanation: item.explanation.trim(),
        metaphor:
          item.metaphor !== undefined
            ? item.metaphor.trim() || undefined
            : existing.metaphor,
        sourceContext:
          item.sourceContext !== undefined
            ? item.sourceContext.trim() || undefined
            : existing.sourceContext,
        sourceUrl:
          item.sourceUrl !== undefined
            ? item.sourceUrl.trim() || undefined
            : existing.sourceUrl,
        category:
          item.category !== undefined
            ? item.category.trim() || "通用"
            : existing.category,
        tags: mergedTags,
        starred:
          item.starred !== undefined ? Boolean(item.starred) : existing.starred,
        updatedAt: now,
      };

      // 从原位置移除并插入到列表头部
      items.splice(existingIndex, 1);
      items.unshift(updatedItem);

      await this.saveStoredItems(items);
      logger.info(`已更新同名生词条目: ${cleanTerm}`);
      return updatedItem;
    } else {
      // 创建新条目
      const newItem: JargonItem = {
        id: item.id || generateUUID(),
        term: cleanTerm,
        explanation: item.explanation.trim(),
        metaphor: item.metaphor?.trim() || undefined,
        sourceContext: item.sourceContext?.trim() || undefined,
        sourceUrl: item.sourceUrl?.trim() || undefined,
        category: item.category?.trim() || "通用",
        tags: item.tags
          ? Array.from(new Set(item.tags.map((t) => t.trim()).filter(Boolean)))
          : [],
        starred: Boolean(item.starred),
        createdAt: item.createdAt || now,
        updatedAt: item.updatedAt || now,
      };

      items.unshift(newItem);
      await this.saveStoredItems(items);
      logger.info(`已添加新生词条目: ${cleanTerm}`);
      return newItem;
    }
  }

  /**
   * 编辑修改词条
   */
  static async updateJargon(
    id: string,
    updates: Partial<Omit<JargonItem, "id" | "createdAt">>
  ): Promise<JargonItem> {
    if (!id) {
      throw new Error("缺少词条 ID");
    }

    const items = await this.getStoredItems();
    const index = items.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new Error(`未找到指定词条 (ID: ${id})`);
    }

    const existing = items[index];
    const updatedItem: JargonItem = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    };

    if (updates.tags) {
      updatedItem.tags = Array.from(
        new Set(updates.tags.map((t) => t.trim()).filter(Boolean))
      );
    }

    items[index] = updatedItem;
    await this.saveStoredItems(items);
    logger.info(`已更新词条 (ID: ${id})`);
    return updatedItem;
  }

  /**
   * 删除词条
   */
  static async deleteJargon(id: string): Promise<boolean> {
    if (!id) {
      throw new Error("缺少词条 ID");
    }

    const items = await this.getStoredItems();
    const filteredItems = items.filter((item) => item.id !== id);

    if (filteredItems.length === items.length) {
      return false;
    }

    await this.saveStoredItems(filteredItems);
    logger.info(`已删除词条 (ID: ${id})`);
    return true;
  }

  /**
   * 切换收藏/星标状态
   */
  static async toggleStar(id: string): Promise<JargonItem> {
    if (!id) {
      throw new Error("缺少词条 ID");
    }

    const items = await this.getStoredItems();
    const index = items.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new Error(`未找到指定词条 (ID: ${id})`);
    }

    items[index].starred = !items[index].starred;
    items[index].updatedAt = Date.now();

    await this.saveStoredItems(items);
    logger.info(`已切换词条星标状态: ${items[index].term} -> ${items[index].starred}`);
    return items[index];
  }

  /**
   * 导出为美观的 Markdown 词典格式
   */
  static async exportJargonAsMarkdown(): Promise<string> {
    const items = await this.getStoredItems();

    const dateStr = new Date().toLocaleString("zh-CN", {
      hour12: false,
    });

    const lines: string[] = [
      "# 黑话生词本与收藏 (Jargon Vault)",
      "",
      `> 导出时间：${dateStr} | 共 ${items.length} 条术语`,
      "",
    ];

    if (items.length === 0) {
      lines.push("*生词本当前为空。*");
      return lines.join("\n");
    }

    // 按分类分组
    const categoryGroups = new Map<string, JargonItem[]>();
    for (const item of items) {
      const category = item.category || "通用";
      if (!categoryGroups.has(category)) {
        categoryGroups.set(category, []);
      }
      categoryGroups.get(category)!.push(item);
    }

    for (const [category, groupItems] of categoryGroups.entries()) {
      lines.push(`## ${category}`);
      lines.push("");

      for (const item of groupItems) {
        const starPrefix = item.starred ? "⭐ " : "";
        lines.push(`### ${starPrefix}${item.term}`);
        lines.push(`- **人话释义**：${item.explanation}`);

        if (item.metaphor) {
          lines.push(`- **生活比喻**：${item.metaphor}`);
        }

        if (item.tags && item.tags.length > 0) {
          const tagsStr = item.tags.map((t) => `\`#${t}\``).join(" ");
          lines.push(`- **标签**：${tagsStr}`);
        }

        if (item.sourceContext) {
          lines.push(`- **使用上下文**：*“${item.sourceContext}”*`);
        }

        if (item.sourceUrl) {
          lines.push(`- **来源**：[${item.sourceUrl}](${item.sourceUrl})`);
        }

        lines.push("");
      }
    }

    return lines.join("\n");
  }

  /**
   * 导出标准 JSON 备份
   */
  static async exportJargonAsJson(): Promise<string> {
    const items = await this.getStoredItems();
    const exportData: JargonExportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      count: items.length,
      items,
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 批量导入并智能去重
   */
  static async importJargonFromJson(
    jsonStr: string | object
  ): Promise<JargonImportResult> {
    let parsed: any;
    if (typeof jsonStr === "string") {
      try {
        parsed = JSON.parse(jsonStr);
      } catch (error: any) {
        throw new Error(`JSON 解析失败: ${error.message}`);
      }
    } else {
      parsed = jsonStr;
    }

    let incomingList: any[] = [];
    if (Array.isArray(parsed)) {
      incomingList = parsed;
    } else if (parsed && Array.isArray(parsed.items)) {
      incomingList = parsed.items;
    } else if (parsed && Array.isArray(parsed.jargonList)) {
      incomingList = parsed.jargonList;
    } else {
      throw new Error("无效的数据格式：必须包含生词条目数组");
    }

    const items = await this.getStoredItems();
    const existingMap = new Map<string, number>();

    // 建立现有索引
    items.forEach((item, index) => {
      existingMap.set(item.term.trim().toLowerCase(), index);
    });

    let importedCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];
    const now = Date.now();

    for (const raw of incomingList) {
      if (!raw || typeof raw !== "object") {
        errors.push("跳过无效的词条数据对象");
        continue;
      }

      const term = typeof raw.term === "string" ? raw.term.trim() : "";
      const explanation =
        typeof raw.explanation === "string" ? raw.explanation.trim() : "";

      if (!term || !explanation) {
        errors.push(`跳过缺少术语名或人话释义的词条: ${JSON.stringify(raw)}`);
        continue;
      }

      const normalizedTerm = term.toLowerCase();

      if (existingMap.has(normalizedTerm)) {
        const index = existingMap.get(normalizedTerm)!;
        const existing = items[index];

        // 合并标签
        let mergedTags = existing.tags || [];
        if (Array.isArray(raw.tags)) {
          mergedTags = Array.from(
            new Set([
              ...mergedTags,
              ...raw.tags
                .map((t: any) => (typeof t === "string" ? t.trim() : ""))
                .filter(Boolean),
            ])
          );
        }

        items[index] = {
          ...existing,
          term,
          explanation,
          metaphor:
            typeof raw.metaphor === "string" && raw.metaphor.trim()
              ? raw.metaphor.trim()
              : existing.metaphor,
          sourceContext:
            typeof raw.sourceContext === "string" && raw.sourceContext.trim()
              ? raw.sourceContext.trim()
              : existing.sourceContext,
          sourceUrl:
            typeof raw.sourceUrl === "string" && raw.sourceUrl.trim()
              ? raw.sourceUrl.trim()
              : existing.sourceUrl,
          category:
            typeof raw.category === "string" && raw.category.trim()
              ? raw.category.trim()
              : existing.category,
          tags: mergedTags,
          starred:
            raw.starred !== undefined ? Boolean(raw.starred) : existing.starred,
          updatedAt: now,
        };
        updatedCount++;
      } else {
        const newItem: JargonItem = {
          id:
            typeof raw.id === "string" && raw.id.trim()
              ? raw.id.trim()
              : generateUUID(),
          term,
          explanation,
          metaphor:
            typeof raw.metaphor === "string" && raw.metaphor.trim()
              ? raw.metaphor.trim()
              : undefined,
          sourceContext:
            typeof raw.sourceContext === "string" && raw.sourceContext.trim()
              ? raw.sourceContext.trim()
              : undefined,
          sourceUrl:
            typeof raw.sourceUrl === "string" && raw.sourceUrl.trim()
              ? raw.sourceUrl.trim()
              : undefined,
          category:
            typeof raw.category === "string" && raw.category.trim()
              ? raw.category.trim()
              : "通用",
          tags: Array.isArray(raw.tags)
            ? Array.from(
                new Set(
                  raw.tags
                    .map((t: any) => (typeof t === "string" ? t.trim() : ""))
                    .filter(Boolean)
                )
              )
            : [],
          starred: Boolean(raw.starred),
          createdAt:
            typeof raw.createdAt === "number" && raw.createdAt > 0
              ? raw.createdAt
              : now,
          updatedAt:
            typeof raw.updatedAt === "number" && raw.updatedAt > 0
              ? raw.updatedAt
              : now,
        };

        items.unshift(newItem);
        // 更新现有索引
        existingMap.set(normalizedTerm, 0);
        // 之后的索引都后移
        for (const [key, idx] of existingMap.entries()) {
          if (key !== normalizedTerm) {
            existingMap.set(key, idx + 1);
          }
        }
        importedCount++;
      }
    }

    await this.saveStoredItems(items);
    logger.info(
      `生词本导入完成: 新增 ${importedCount} 条, 更新 ${updatedCount} 条, 当前总计 ${items.length} 条`
    );

    return {
      success: true,
      importedCount,
      updatedCount,
      totalCount: items.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 清空生词本（主要用于测试与重置）
   */
  static async clearAll(): Promise<void> {
    await this.saveStoredItems([]);
  }
}
