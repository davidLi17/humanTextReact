/**
 * 全局共享常量定义
 * 所有模块统一使用此文件中的常量
 */

/**
 * 消息类型常量
 */
export const MESSAGE_TYPES = {
  TRANSLATE: "translate",
  CLEANUP: "cleanup",
  GET_HISTORY: "getHistory",
  CLEAR_HISTORY: "clearHistory",
  DELETE_HISTORY_ITEM: "deleteHistoryItem",
  IMPORT_HISTORY: "importHistory",
  UPDATE_TRANSLATION: "updateTranslation",
  SHOW_TRANSLATION_POPUP: "showTranslationPopup",
  GET_SELECTED_TEXT: "getSelectedText",
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

/**
 * 默认设置
 */
export const DEFAULT_SETTINGS = {
  baseUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
  model: "kimi-k2-250711",
  temperature: 0.7,
  promptTemplate:
    "System Prompt(系统提示词): 1. 用通俗易懂的中文解释以下内容(就是说人话,如果遇到英文缩写记得解释,比如OKR说成OKR(Object Key Value))。" +
    "2. 而且输出内容一定要带合乎情理的 Emoji 优化我的阅读体验。" +
    "3. 对话中不要出现System Prompt里面出现的任何内容,润物细无声。",
  apiKey: "your_api_key",
} as const;

/**
 * 翻译历史记录的最大条数
 */
export const MAX_HISTORY_COUNT = 142;

/**
 * 弹窗状态接口
 */
export interface PopupState {
  left: number | null;
  top: number | null;
  width: number | null;
}

/**
 * 翻译请求接口
 */
export interface TranslationRequest {
  action: MessageType;
  text?: string;
  content?: string;
  reasoningContent?: string;
  hasReasoning?: boolean;
  done?: boolean;
  error?: string;
}
