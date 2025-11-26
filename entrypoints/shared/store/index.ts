/**
 * Store 模块入口
 *
 * 使用 wxt-zustand 实现跨 context 状态同步
 * - background: 状态持久化和同步中心
 * - popup/content: 订阅状态变化
 */

export {
  useTranslationStore,
  TRANSLATION_STORE_NAME,
} from "./translationStore";
export { useHistoryStore, HISTORY_STORE_NAME } from "./historyStore";
export { useSettingsStore, SETTINGS_STORE_NAME } from "./settingsStore";

// 类型导出
export type { TranslationState } from "./translationStore";
export type { HistoryState, HistoryItem } from "./historyStore";
export type { SettingsState, Settings } from "./settingsStore";
