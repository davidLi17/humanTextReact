/**
 * 全局共享常量定义
 * 所有模块统一使用此文件中的常量
 */
import { DEFAULT_FONT_SCALE_PERCENT } from "../fontScale";

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
  UPDATE_SIDEPANEL_TRANSLATION: "updateSidepanelTranslation", // sidepanel页面专用
  OPEN_SIDEPANEL: "openSidepanel", // 打开侧边栏
  TOGGLE_SIDEPANEL: "toggleSidepanel", // 快捷键切换侧边栏显示状态
  EXTRACT_PAGE_CONTENT: "extractPageContent", // 提取网页正文
  READ_PAGE_IN_SIDEPANEL: "readPageInSidepanel", // 侧边栏通读网页
  READ_WEB_PAGE: "readWebPage", // 触发通读
  SAVE_JARGON_ITEM: "saveJargonItem", // 保存黑话词条
  GET_JARGON_LIST: "getJargonList", // 获取黑话列表
  UPDATE_JARGON_ITEM: "updateJargonItem", // 更新黑话词条
  DELETE_JARGON_ITEM: "deleteJargonItem", // 删除黑话词条
  TOGGLE_JARGON_STAR: "toggleJargonStar", // 切换星标
  EXPORT_JARGON: "exportJargon", // 导出黑话
  IMPORT_JARGON: "importJargon", // 导入黑话
  SHOW_TRANSLATION_POPUP: "showTranslationPopup",
  GET_SELECTED_TEXT: "getSelectedText",
  APPEND_DIAGNOSTIC_LOGS: "appendDiagnosticLogs",
  GET_DIAGNOSTIC_LOGS: "getDiagnosticLogs",
  CLEAR_DIAGNOSTIC_LOGS: "clearDiagnosticLogs",
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
 * 主题模式定义
 */
export const THEME_MODES = {
  SYSTEM: "system",
  LIGHT: "light",
  DARK: "dark",
} as const;

export type ThemeMode = (typeof THEME_MODES)[keyof typeof THEME_MODES];

/**
 * 默认设置
 */
export const DEFAULT_SETTINGS = {
  baseUrl: "https://api.deepseek.com/v1/chat/completions",
  model: "deepseek-flash",
  temperature: 0.7,
  // 注意：promptTemplate 会被**原样**作为 system message 发送，代码里没有任何
  // 占位符替换逻辑。用户正文走独立的 user message，因此这里不要写 {text} 之类
  // 的占位符，否则会作为字面量发给模型。
  promptTemplate: `始终使用中文。

你的任务是把复杂、专业、抽象、晦涩的信息讲成人能快速理解的话。表达自然、直接、通俗、高信息密度，优先讲清结论、原因、机制、本质和实际作用。

回答先给用户最需要的信息，再根据问题复杂度动态展开。简单问题也回答很多的信息吧；复杂概念可结合现实例子、机制、术语、公式和实际场景。技术问题重点讲清输入、处理、输出。教程给出可直接执行的步骤和内容。

专业术语和英文缩写第一次出现时顺手解释。大厂黑话和抽象表达翻译成具体的人、动作、原因、结果和指标。总结长内容时提炼主线、关键事实、因果关系和最值得记住的信息，删除重复、铺垫和空话。

表达优先使用直接的正向陈述句。禁止使用先否定再转折建立观点的句式，包括：
"不是……而是……"
"并非……而是……"
"与其说……不如说……"
"A，而不是 B"
"不只是……更是……"
"重点/核心/关键不是……而是……"

需要强调时直接写"结论 + 原因"；需要比较时直接描述双方差异。

其他偏好：
- 不在结尾反问或主动抛问题
- 禁止"如果你愿意，我可以给你"及同义表达
- 不使用"拆"，改用"分析、梳理、分解"
- 少用模板化 AI 套话
- 少量 Emoji，排版清楚
- 删除重复和没有信息增量的句子

输出前自行检查并修正以上问题。
"禁止任何形式的先否定后肯定句式，包括'不是A而是B''并非A而是B''与其说A不如说B''A，而不是B''不是A，不是B，而是C'。需要澄清概念时，直接说正确结论。需要比较时，直接用'A是……，B是……'的并列结构，不要用'A不是……，B是……'。输出前检查一遍，发现这类句式就重写成直接陈述。"

你如果想先否定别人再说自己的，直接砍掉，只留后面的结论。这样就不会再绕弯子了。
最终目标：让复杂信息第一次阅读就能看懂。`,
  apiKey: "your_api_key",
  thinkingEnabled: false,
  showSelectionToolbar: true,
  contextualSelectionEnabled: true,
  prismModeEnabled: false,
  logLevel: LOG_LEVELS.OFF as LogLevel,
  theme: THEME_MODES.SYSTEM as ThemeMode,
  fontScalePercent: DEFAULT_FONT_SCALE_PERCENT,
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
  requestId?: string;
  text?: string;
  content?: string;
  reasoningContent?: string;
  hasReasoning?: boolean;
  done?: boolean;
  error?: string;
  selectionContext?: import("../selectionContext").SelectionContext;
  deferTranslation?: boolean;
  expectedSelectedText?: string;
  includeSelectionContext?: boolean;
  /** 本次结果由本地生词本直接提供。 */
  resultSource?: import("../jargonReuse").TranslationResultSource;
  /** 明确要求跳过生词本命中并重新调用模型。 */
  bypassJargonVault?: boolean;
}
