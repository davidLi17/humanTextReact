/**
 * AI 对话服务类型定义
 * 导出所有相关接口和类型
 */

export type {
  ImageContent,
  AIChatConfig,
  MessageContent,
  ChatMessage,
  StreamCallbacks,
  ChatCompletionRequest,
  StreamDelta,
  StreamChoice,
  StreamResponse,
} from './aiChatService';

/**
 * AI 服务提供商类型
 */
export type AIProvider =
  | 'OPENAI'
  | 'CLAUDE'
  | 'GEMINI'
  | 'OPENROUTER'
  | 'OLLAMA'
  | 'CUSTOM';

/**
 * 对话状态类型
 */
export type ChatStatus =
  | 'idle'
  | 'connecting'
  | 'streaming'
  | 'completed'
  | 'error'
  | 'cancelled';

/**
 * 图片详情级别
 */
export type ImageDetail = 'low' | 'high' | 'auto';

/**
 * 流式完成原因
 */
export type FinishReason =
  | 'stop'
  | 'length'
  | 'function_call'
  | 'content_filter'
  | 'tool_calls';

/**
 * 消息角色
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * 内容类型
 */
export type ContentType = 'text' | 'image_url';