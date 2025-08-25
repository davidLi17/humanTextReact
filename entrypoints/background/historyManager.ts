import { MAX_HISTORY_COUNT } from "../shared/constants";

/**
 * 历史记录项的类型定义
 */
export interface HistoryItem {
  original: string;
  translated: string;
  reasoning?: string;
  hasReasoning: boolean;
  timestamp: number;
}

/**
 * 历史记录管理器
 * 负责管理翻译历史记录
 */
export class HistoryManager {
  /**
   * 保存翻译历史
   */
  static async saveTranslationHistory(
    original: string,
    translated: string,
    reasoning?: string
  ): Promise<void> {
    try {
      // 获取现有历史
      const result = await browser.storage.local.get(["translationHistory"]);
      let history: HistoryItem[] = result.translationHistory || [];

      // 创建新的历史记录项
      const newItem: HistoryItem = {
        original,
        translated,
        reasoning: reasoning || "",
        hasReasoning: Boolean(reasoning),
        timestamp: Date.now(),
      };

      // 添加到历史记录开头
      history.unshift(newItem);

      // 限制历史记录数量
      if (history.length > MAX_HISTORY_COUNT) {
        history = history.slice(0, MAX_HISTORY_COUNT);
      }

      // 保存到存储
      await browser.storage.local.set({ translationHistory: history });
    } catch (error) {
      console.error("保存翻译历史失败:", error);
      throw error;
    }
  }

  /**
   * 获取翻译历史
   */
  static async getTranslationHistory(): Promise<HistoryItem[]> {
    try {
      const result = await browser.storage.local.get(["translationHistory"]);
      return result.translationHistory || [];
    } catch (error) {
      console.error("获取翻译历史失败:", error);
      return [];
    }
  }

  /**
   * 删除历史记录项
   */
  static async deleteHistoryItem(original: string): Promise<boolean> {
    try {
      const result = await browser.storage.local.get(["translationHistory"]);
      let history: HistoryItem[] = result.translationHistory || [];

      history = history.filter((item) => item.original !== original);

      await browser.storage.local.set({ translationHistory: history });
      return true;
    } catch (error) {
      console.error("删除历史记录项失败:", error);
      throw error;
    }
  }

  /**
   * 清空历史记录
   */
  static async clearHistory(): Promise<boolean> {
    try {
      await browser.storage.local.set({ translationHistory: [] });
      return true;
    } catch (error) {
      console.error("清空历史记录失败:", error);
      throw error;
    }
  }

  /**
   * 导入历史记录
   */
  static async importHistory(newHistory: any[]): Promise<boolean> {
    try {
      if (!Array.isArray(newHistory)) {
        throw new Error("导入的数据格式不正确");
      }

      // 验证数据格式
      const validHistory = newHistory.filter(
        (item) =>
          item &&
          typeof item.original === "string" &&
          typeof item.translated === "string"
      );

      if (validHistory.length === 0) {
        throw new Error("没有有效的历史记录数据");
      }

      // 获取现有历史
      const result = await browser.storage.local.get(["translationHistory"]);
      let existingHistory: HistoryItem[] = result.translationHistory || [];

      // 合并历史记录（新导入的在前面）
      const mergedHistory = [...validHistory, ...existingHistory];

      // 限制总数量
      const finalHistory = mergedHistory.slice(0, MAX_HISTORY_COUNT);

      await browser.storage.local.set({ translationHistory: finalHistory });
      return true;
    } catch (error) {
      console.error("导入历史记录失败:", error);
      throw error;
    }
  }
}
