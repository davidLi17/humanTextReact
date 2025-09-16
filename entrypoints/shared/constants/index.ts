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
  UPDATE_TRANSLATION: "updateTranslation", // 保留用于兼容
  UPDATE_CONTENT_TRANSLATION: "updateContentTranslation", // content弹窗专用
  UPDATE_POPUP_TRANSLATION: "updatePopupTranslation", // popup页面专用
  SHOW_TRANSLATION_POPUP: "showTranslationPopup",
  GET_SELECTED_TEXT: "getSelectedText",
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

/**
 * 日志级别定义
 */
export const LOG_LEVELS = {
  OFF: "off",
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
} as const;

export type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];

/**
 * 默认设置
 */
export const DEFAULT_SETTINGS = {
  baseUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
  model: "kimi-k2-250711",
  temperature: 0.7,
  promptTemplate:
    "System Prompt(系统提示词): 1. 用通俗易懂的中文解释以下内容(就是说人话,如果遇到英文缩写记得解释,比如OKR说成OKR(Object Key Value))。" +
    "2. 而且输出内容一定要带合乎情理的 Emoji 优化我的阅读体验。",
  apiKey: "your_api_key",
  thinkingEnabled: false,
  logLevel: LOG_LEVELS.OFF as LogLevel,
} as const;

/**
 * 思考模式配置
 */
export const THINKING_CONFIG = {
  ENABLED: { type: "enabled" },
  DISABLED: { type: "disabled" },
} as const;

/**
 * 图片处理常量
 */
export const IMAGE_CONFIG = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_FORMATS: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ],
  COMPRESSION_QUALITY: 0.8,
  MAX_DIMENSION: 2048, // 最大尺寸
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
