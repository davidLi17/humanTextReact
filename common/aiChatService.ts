/**
 * 通用 AI 对话服务
 * 支持流式响应、多模态输入和多种 AI 服务提供商
 */

/**
 * 图片内容接口
 */
export interface ImageContent {
  data: string; // base64 编码的图片数据
  mimeType: string; // MIME 类型，如 'image/jpeg', 'image/png'
  fileName?: string; // 可选的文件名
}

/**
 * 🤖 AI 对话配置接口
 *
 * 统一的 AI 服务配置标准，兼容 OpenAI、Claude、Gemini、OpenRouter、Ollama 等主流 AI 服务商
 *
 * @example
 * ```typescript
 * // 基础配置
 * const basicConfig: AIChatConfig = {
 *   apiKey: 'your-api-key',
 *   baseUrl: 'https://api.openai.com/v1/chat/completions',
 *   model: 'gpt-4',
 *   temperature: 0.7,
 *   systemPrompt: '你是一个专业的翻译助手'
 * };
 *
 * // 高级配置
 * const advancedConfig: AIChatConfig = {
 *   apiKey: 'your-api-key',
 *   baseUrl: 'https://api.anthropic.com/v1/messages',
 *   model: 'claude-3-5-sonnet-20241022',
 *   temperature: 0.3,
 *   maxTokens: 4000,
 *   systemPrompt: '你是一个逻辑推理专家，请详细分析问题。',
 *   thinkingEnabled: true  // 启用思考模式，展示推理过程
 * };
 * ```
 */
export interface AIChatConfig {
  /** 必需：API 访问密钥，用于身份验证 */
  apiKey: string;

  /** 必需：API 端点 URL，指定 AI 服务的访问地址 */
  baseUrl: string;

  /** 必需：模型名称，指定使用的具体 AI 模型 */
  model: string;

  /** 可选：温度参数，控制输出的随机性（0.0-2.0，默认 0.7） */
  temperature?: number;

  /** 可选：最大令牌数，限制生成内容的长度 */
  maxTokens?: number;

  /** 可选：系统提示词，设置 AI 的角色和行为准则 */
  systemPrompt?: string;

  /** 可选：思考模式开关，启用时会显示 AI 的推理过程（Claude 等模型支持） */
  thinkingEnabled?: boolean;
}

/**
 * 对话消息内容接口
 */
export interface MessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
    detail?: "low" | "high" | "auto";
  };
}

/**
 * 对话消息接口
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | MessageContent[];
}

/**
 * 流式响应回调接口
 */
export interface StreamCallbacks {
  onContent?: (content: string, reasoningContent?: string) => void;
  onComplete?: (finalContent: string, reasoningContent?: string) => void;
  onError?: (error: Error) => void;
  onAbort?: () => void;
}

/**
 * AI 对话 API 请求体接口
 *
 * 基于 OpenAI Chat Completions API 标准格式，兼容大多数 AI 服务提供商
 *
 * @example
 * ```typescript
 * const request: ChatCompletionRequest = {
 *   model: "gpt-4",
 *   messages: [
 *     { role: "system", content: "你是一个翻译助手" },
 *     { role: "user", content: "翻译这句话" }
 *   ],
 *   temperature: 0.7,
 *   max_tokens: 1000,
 *   stream: true
 * };
 * ```
 */
export interface ChatCompletionRequest {
  /** 必需：使用的模型名称 */
  model: string;

  /** 必需：对话消息列表，包含系统、用户和助手的对话历史 */
  messages: ChatMessage[];

  /** 可选：控制输出随机性，范围 0.0-2.0，默认 1.0 */
  temperature?: number;

  /** 可选：生成文本的最大令牌数 */
  max_tokens?: number;

  /** 可选：是否启用流式响应，默认 false */
  stream?: boolean;

  /** 可选：是否启用思考模式，用于 Claude 等支持推理过程的模型 */
  thinking?: boolean;

  /** 可选：核采样参数，控制考虑的令牌范围，默认 1.0 */
  top_p?: number;

  /** 可选：频率惩罚系数，减少重复内容，范围 -2.0-2.0 */
  frequency_penalty?: number;

  /** 可选：存在惩罚系数，鼓励讨论新话题，范围 -2.0-2.0 */
  presence_penalty?: number;

  /** 可选：停止序列，当生成这些内容时停止生成 */
  stop?: string | string[];

  /** 可选：用户标识符，用于 API 监控和限流 */
  user?: string;
}

/**
 * 流式响应 Delta 接口
 */
export interface StreamDelta {
  role?: string;
  content?: string;
  reasoning_content?: string;
  function_call?: {
    name?: string;
    arguments?: string;
  };
  tool_calls?: Array<{
    index?: number;
    id?: string;
    type?: string;
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
}

/**
 * 流式响应选择接口
 */
export interface StreamChoice {
  index: number;
  delta: StreamDelta;
  finish_reason?:
    | "stop"
    | "length"
    | "function_call"
    | "content_filter"
    | "tool_calls";
}

/**
 * 流式响应数据接口
 */
export interface StreamResponse {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: StreamChoice[];
  system_fingerprint?: string;
}

/**
 * 请求管理器
 */
class RequestManager {
  private static controllers = new Map<string, AbortController>();

  static createController(requestId: string): AbortController {
    // 取消之前的请求
    if (this.controllers.has(requestId)) {
      const oldController = this.controllers.get(requestId);
      oldController?.abort();
    }

    const controller = new AbortController();
    this.controllers.set(requestId, controller);
    return controller;
  }

  static cancelRequest(requestId: string): void {
    const controller = this.controllers.get(requestId);
    controller?.abort();
    this.controllers.delete(requestId);
  }

  static completeRequest(requestId: string): void {
    this.controllers.delete(requestId);
  }
}

/**
 * 通用 AI 对话服务类
 */
export class AIChatService {
  /**
   * 发起 AI 对话请求（支持流式响应）
   *
   * @param config - AI 配置
   * @param messages - 对话消息列表
   * @param callbacks - 流式响应回调函数
   * @param requestId - 请求唯一标识，用于管理请求生命周期
   * @returns Promise<string> - 最终响应内容
   */
  static async chat(
    config: AIChatConfig,
    messages: ChatMessage[],
    callbacks: StreamCallbacks = {},
    requestId: string = `chat_${Date.now()}`
  ): Promise<string> {
    const controller = RequestManager.createController(requestId);

    try {
      const response = await this.makeRequest(
        config,
        messages,
        controller.signal
      );

      if (!response.ok) {
        throw new Error(
          `AI 服务请求失败: ${response.status} ${response.statusText}`
        );
      }

      return await this.handleStreamResponse(response, callbacks, requestId);
    } catch (error: any) {
      if (error.name === "AbortError") {
        callbacks.onAbort?.();
        return "";
      }
      callbacks.onError?.(error);
      throw error;
    } finally {
      RequestManager.completeRequest(requestId);
    }
  }

  /**
   * 简化的对话接口（文本输入）
   */
  static async chatText(
    config: AIChatConfig,
    prompt: string,
    callbacks: StreamCallbacks = {},
    requestId?: string
  ): Promise<string> {
    const messages: ChatMessage[] = [
      ...(config.systemPrompt
        ? [{ role: "system" as const, content: config.systemPrompt }]
        : []),
      { role: "user", content: prompt },
    ];

    return this.chat(config, messages, callbacks, requestId);
  }

  /**
   * 多模态对话（支持图片）
   */
  static async chatWithImages(
    config: AIChatConfig,
    text: string,
    images: ImageContent[],
    callbacks: StreamCallbacks = {},
    requestId?: string
  ): Promise<string> {
    const userContent: Array<{
      type: "text" | "image_url";
      text?: string;
      image_url?: { url: string };
    }> = [{ type: "text", text }];

    // 添加图片内容
    images.forEach((image) => {
      userContent.push({
        type: "image_url",
        image_url: { url: image.data },
      });
    });

    const messages: ChatMessage[] = [
      ...(config.systemPrompt
        ? [{ role: "system" as const, content: config.systemPrompt }]
        : []),
      { role: "user", content: userContent },
    ];

    return this.chat(config, messages, callbacks, requestId);
  }

  /**
   * 取消请求
   */
  static cancelChat(requestId: string): void {
    RequestManager.cancelRequest(requestId);
  }

  /**
   * 构建 HTTP 请求
   */
  private static makeRequest(
    config: AIChatConfig,
    messages: ChatMessage[],
    signal: AbortSignal
  ): Promise<Response> {
    const requestBody: ChatCompletionRequest = {
      model: config.model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: config.temperature || 0.7,
      stream: true,
    };

    // 添加可选参数
    if (config.maxTokens) {
      requestBody.max_tokens = config.maxTokens;
    }

    // 添加思考模式配置（如果支持）
    if (config.thinkingEnabled !== undefined) {
      requestBody.thinking = config.thinkingEnabled;
    }

    return fetch(config.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal,
    });
  }

  /**
   * 处理AI服务的流式响应
   *
   * 🔍 数据流处理流程：
   * 1. 接收HTTP响应流 → 2. 逐块读取数据 → 3. 解析JSON格式 → 4. 累积内容 → 5. 实时回调更新
   *
   * @param response - HTTP响应对象，包含可读流
   * @param callbacks - 流式回调函数集合，用于实时更新UI
   * @param _requestId - 请求ID（当前未使用，保留用于未来扩展）
   * @returns 最终累积的完整响应文本
   *
   * 💡 核心特性：
   * - 支持实时流式输出，提升用户体验
   * - 同时处理主内容和推理内容（thinking模式）
   * - 自动处理数据分块和缓冲区管理
   * - 完善的错误处理和资源清理
   */
  private static async handleStreamResponse(
    response: Response,
    callbacks: StreamCallbacks,
    _requestId: string
  ): Promise<string> {
    // 🎯 初始化流读取器和文本解码器
    const reader = response.body!.getReader();
    const decoder = new TextDecoder("utf-8");

    // 📦 数据缓冲区：处理不完整的数据行
    let buffer = "";
    // 📝 主内容累积器：存储AI返回的最终文本
    let result = "";
    // 🧠 推理内容累积器：存储AI的思考过程（如果启用thinking模式）
    let reasoningContent = "";

    try {
      // 🔄 循环读取流数据，直到流结束
      while (true) {
        // 📥 读取下一个数据块
        const { done, value } = await reader.read();
        if (done) break; // 流结束，退出循环

        // 🔄 解码二进制数据并添加到缓冲区
        buffer += decoder.decode(value, { stream: true });

        // 📊 按换行符分割数据，处理完整的数据行
        const lines = buffer.split("\n");
        // 🎯 保留最后一行不完整数据到缓冲区
        buffer = lines.pop() || "";

        // 🔍 处理每一行完整的数据
        for (const line of lines) {
          // ✅ 检查是否为有效的数据行（Server-Sent Events格式）
          if (line.startsWith("data: ")) {
            const data = line.slice(6); // 移除"data: "前缀
            if (data === "[DONE]") continue; // 跳过结束标记

            try {
              // 🎯 解析JSON数据为结构化对象
              const parsed: StreamResponse = JSON.parse(data);

              // 💬 处理主内容增量（AI返回的文本）
              if (parsed.choices?.[0]?.delta?.content !== undefined) {
                const content = parsed.choices[0].delta.content;
                if (content) {
                  result += content; // 累积主内容
                }
              }

              // 🧠 处理推理内容（AI的思考过程，如果支持）
              if (parsed.choices?.[0]?.delta?.reasoning_content !== undefined) {
                const reasoning = parsed.choices[0].delta.reasoning_content;
                if (reasoning) {
                  reasoningContent += reasoning; // 累积推理内容
                }
              }

              // 📞 实时回调：通知UI内容更新
              if (result || reasoningContent) {
                callbacks.onContent?.(result, reasoningContent);
              }
            } catch (e) {
              // ⚠️ 解析错误处理：记录警告但不中断流程
              console.warn("解析流式数据失败:", e, "原始数据:", line);
            }
          }
        }
      }

      // ✅ 流处理完成，调用完成回调
      callbacks.onComplete?.(result, reasoningContent);
      return result; // 返回最终累积的文本
    } finally {
      // 🧹 资源清理：释放读取器锁，防止内存泄漏
      reader.releaseLock();
    }
  }
}

/**
 * 预定义的 AI 服务配置
 */
export const AI_CONFIGS = {
  // OpenAI
  OPENAI: {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o",
  } as const,

  // Anthropic Claude
  CLAUDE: {
    baseUrl: "https://api.anthropic.com/v1/messages",
    model: "claude-3-5-sonnet-20241022",
  } as const,

  // Google Gemini
  GEMINI: {
    baseUrl:
      "https://generativelanguage.googleapis.com/v1beta/chat/completions",
    model: "gemini-1.5-pro",
  } as const,

  // OpenRouter (兼容多种模型)
  OPENROUTER: {
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    model: "anthropic/claude-3.5-sonnet",
  } as const,

  // 本地 Ollama
  OLLAMA: {
    baseUrl: "http://localhost:11434/v1/chat/completions",
    model: "llama3.1:8b",
  } as const,
} as const;

/**
 * 🏭 AI 配置工厂函数
 *
 * 设计目的：简化 AI 服务配置的创建过程，提供统一的配置接口
 *
 * 💡 为什么需要这个函数：
 * 1. 类型安全 - 避免手动配置时拼写错误
 * 2. 默认值管理 - 自动设置合理的默认参数
 * 3. 配置复用 - 预定义常用服务商的配置模板
 * 4. 灵活扩展 - 支持覆盖任何默认配置
 *
 * @example
 * ```typescript
 * // 快速创建 OpenAI 配置
 * const openaiConfig = createAIChatConfig('OPENAI', 'sk-xxx', {
 *   temperature: 0.5,
 *   maxTokens: 2000
 * });
 *
 * // 创建本地 Ollama 配置（无需 apiKey）
 * const ollamaConfig = createAIChatConfig('OLLAMA', '', {
 *   model: 'qwen2.5:7b',
 *   temperature: 0.8
 * });
 * ```
 */
export const createAIChatConfig = (
  provider: keyof typeof AI_CONFIGS,
  apiKey: string,
  overrides: Partial<AIChatConfig> = {}
): AIChatConfig => {
  const baseConfig = AI_CONFIGS[provider];
  return {
    ...baseConfig,
    apiKey,
    temperature: 0.7,
    ...overrides,
  };
};
