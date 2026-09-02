/**
 * 旧调用入口的兼容门面。
 *
 * Popup、Content Script 与 Background 仍可沿用 JargonVault API，但所有读写
 * 已统一委托给 jargonStorage，存储中只会出现 analogy/isStarred 规范字段。
 */
import {
  clearJargonItems,
  exportJargonAsJson,
  exportJargonAsMarkdown,
  filterJargonItems,
  getJargonList,
  importJargonItems,
  saveJargonItem,
  toggleStarJargon,
  updateJargonItem,
  deleteJargonItem,
} from "./jargonStorage";
import type {
  JargonImportResult,
  JargonInput,
  JargonItem,
} from "./jargonTypes";

export class JargonVault {
  static async getJargonList(
    query?: string,
    category?: string,
    starredOnly?: boolean
  ): Promise<JargonItem[]> {
    return filterJargonItems(
      await getJargonList(),
      query,
      category,
      starredOnly
    );
  }

  static async addJargon(item: JargonInput): Promise<JargonItem> {
    return saveJargonItem(item);
  }

  static async updateJargon(
    id: string,
    updates: Partial<Omit<JargonInput, "id" | "createdAt">>
  ): Promise<JargonItem> {
    if (!id) throw new Error("缺少词条 ID");
    const item = await updateJargonItem(id, updates);
    if (!item) throw new Error(`未找到指定词条 (ID: ${id})`);
    return item;
  }

  static async deleteJargon(id: string): Promise<boolean> {
    if (!id) throw new Error("缺少词条 ID");
    return deleteJargonItem(id);
  }

  static async toggleStar(id: string): Promise<JargonItem> {
    if (!id) throw new Error("缺少词条 ID");
    const exists = (await getJargonList()).some((item) => item.id === id);
    if (!exists) throw new Error(`未找到指定词条 (ID: ${id})`);
    await toggleStarJargon(id);
    return (await getJargonList()).find((item) => item.id === id)!;
  }

  static async exportJargonAsMarkdown(): Promise<string> {
    return exportJargonAsMarkdown(await getJargonList());
  }

  static async exportJargonAsJson(): Promise<string> {
    return exportJargonAsJson(await getJargonList());
  }

  static async importJargonFromJson(
    json: string | object
  ): Promise<JargonImportResult> {
    const result = await importJargonItems(json);
    if (!result.success && result.error) throw new Error(result.error);
    return result;
  }

  static async clearAll(): Promise<void> {
    await clearJargonItems();
  }
}
