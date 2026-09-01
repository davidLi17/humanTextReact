import {
  DEFAULT_SETTINGS,
  MESSAGE_TYPES,
  THINKING_CONFIG,
} from "@/entrypoints/shared/constants";
import { createLogger } from "@/entrypoints/shared/logger";
import { SettingsUtils } from "@/entrypoints/shared/settingsUtils";
import { HistoryManager } from "./historyManager";
import { MessageUtils } from "./messageUtils";
import { RequestManager, type RequestContext } from "./requestManager";

const logger = createLogger("translation-service", "🌐");

export interface ImageContent {
  data: string;
  mimeType: string;
  fileName?: string;
}

export interface ChatRoleMessage {
  role: "system" | "user" | "assistant";
  content: string | any[];
  images?: ImageContent[];
}

export interface TranslationParams {
  text?: string;
  messages?: ChatRoleMessage[];
  images?: ImageContent[];
  thinkingEnabled?: boolean;
  temperature?: number;
  promptTemplate?: string;
  apiKey?: string;
}

interface StreamChunk {
  content: string;
  reasoningContent: string;
  done: boolean;
}

/**
 * 格式化单条消息内容为符合多模态 API 要求的结构
 */
export function formatMultimodalContent(
  content: string | any[],
  images?: ImageContent[]
): string | any[] {
  if (Array.isArray(content)) {
    // 若已有数组结构且传入了额外的 images，则补充尚未包含的图片
    if (images && images.length > 0) {
      const existingUrls = new Set(
        content
          .filter((item) => item?.type === "image_url")
          .map((item) => item?.image_url?.url)
      );
      const newImageItems = images
        .filter((img) => !existingUrls.has(img.data))
        .map((img) => ({
          type: "image_url" as const,
          image_url: { url: img.data },
        }));
      return [...newImageItems, ...content];
    }
    return content;
  }

  const text = typeof content === "string" ? content : "";
  if (!images || images.length === 0) {
    return text;
  }

  const userContent: any[] = [];
  images.forEach((image) => {
    userContent.push({
      type: "image_url",
      image_url: { url: image.data },
    });
  });
  userContent.push({ type: "text", text });

  return userContent;
}

/**
 * 组装发送给 LLM 的 messages 数组
 */
export function buildMessagesPayload(
  params: {
    text?: string;
    messages?: ChatRoleMessage[];
    images?: ImageContent[];
    promptTemplate?: string;
  }
): any[] {
  const {
    text = "",
    messages: chatMessages,
    images = [],
    promptTemplate = DEFAULT_SETTINGS.promptTemplate,
  } = params;

  if (chatMessages && chatMessages.length > 0) {
    const hasSystem = chatMessages.some((m) => m.role === "system");
    const formattedMessages: any[] = [];

    // 找到最后一条 user 消息的索引（用于注入 params.images）
    let lastUserIndex = -1;
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      if (chatMessages[i].role === "user") {
        lastUserIndex = i;
        break;
      }
    }

    chatMessages.forEach((msg, idx) => {
      const isLastUser = idx === lastUserIndex;
      // 合并当前轮次自身的 msg.images 和顶层传入的 params.images（如果是最后一条 user 消息）
      const combinedImages: ImageContent[] = [
        ...(msg.images || []),
        ...(isLastUser && images.length > 0 ? images : []),
      ];

      // 去重图片数据（避免同一图片被重复添加）
      const uniqueImages = combinedImages.filter(
        (img, index, self) =>
          index === self.findIndex((t) => t.data === img.data)
      );

      formattedMessages.push({
        role: msg.role,
        content: formatMultimodalContent(msg.content, uniqueImages),
      });
    });

    return hasSystem
      ? formattedMessages
      : [{ role: "system", content: promptTemplate }, ...formattedMessages];
  }

  const formattedUserContent = formatMultimodalContent(text, images);
  return [
    { role: "system", content: promptTemplate },
    {
      role: "user",
      content: formattedUserContent,
    },
  ];
}

/**
 * 翻译服务只消费已经登记的请求上下文，不自行推断请求归属。
 */
export class TranslationService {
  static async translateText(
    params: TranslationParams,
    requestContext: RequestContext
  ): Promise<string | void> {
    const {
      text = "",
      messages: chatMessages,
      images = [],
      thinkingEnabled = false,
    } = params;
    const { requestId, target, controller } = requestContext;

    logger.log("🚀 [TranslationService] 开始翻译", {
      requestId,
      target,
      textLength: text.length,
      chatMessagesCount: chatMessages?.length || 0,
      imagesCount: images.length,
      thinkingEnabled,
      timestamp: new Date().toISOString(),
    });

    try {
      const config = await SettingsUtils.getSettings();
      const apiKey = params.apiKey || config.apiKey;
      if (!apiKey) {
        throw new Error("请先在设置中配置 API Key");
      }

      const promptTemplate =
        params.promptTemplate ||
        config.promptTemplate ||
        DEFAULT_SETTINGS.promptTemplate;

      const messagesPayload = buildMessagesPayload({
        text,
        messages: chatMessages,
        images,
        promptTemplate,
      });

      const requestBody: any = {
        model: config.model || DEFAULT_SETTINGS.model,
        messages: messagesPayload,
        temperature:
          params.temperature ??
          config.temperature ??
          DEFAULT_SETTINGS.temperature,
        stream: true,
        thinking: thinkingEnabled
          ? THINKING_CONFIG.ENABLED
          : THINKING_CONFIG.DISABLED,
      };

      const response = await fetch(config.baseUrl || DEFAULT_SETTINGS.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }
      if (!response.body) {
        throw new Error("API 响应为空，请检查接口兼容性");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let result = "";
      let reasoningContent = "";
      let streamFinished = false;

      while (!streamFinished) {
        const { value, done } = await reader.read();

        if (value) {
          buffer += decoder.decode(value, { stream: true });
        }
        if (done) {
          buffer += decoder.decode();
        }

        const lines = buffer.split(/\r?\n/);
        buffer = done ? "" : lines.pop() || "";
        const currentChunk = this.parseStreamLines(lines);

        if (currentChunk.content || currentChunk.reasoningContent) {
          result += currentChunk.content;
          reasoningContent += currentChunk.reasoningContent;

          const delivered = await this.sendTranslationUpdate(
            requestContext,
            result,
            reasoningContent,
            false
          );
          if (!delivered) {
            logger.log("翻译接收端已关闭或请求已过期", { requestId });
            RequestManager.cleanupRequest(requestId);
            return;
          }
        }

        streamFinished = done || currentChunk.done;
        if (currentChunk.done && !done) {
          try {
            await reader.cancel();
          } catch (error) {
            logger.warn("关闭已完成的响应流失败:", error);
          }
        }
      }

      if (!result.trim()) {
        throw new Error("模型未返回可显示内容，请检查模型或接口兼容性");
      }

      const finalDelivered = await this.sendTranslationUpdate(
        requestContext,
        result,
        reasoningContent,
        true
      );
      if (!finalDelivered) {
        RequestManager.cleanupRequest(requestId);
        return;
      }

      if (RequestManager.isActiveRequest(requestId)) {
        try {
          await HistoryManager.saveTranslationHistory(
            text,
            result,
            reasoningContent
          );
        } catch (error) {
          logger.error("保存翻译历史失败:", error);
        }
      }

      return result;
    } catch (error: any) {
      if (error.name === "AbortError") {
        logger.log("翻译请求已中止", { requestId });
        return;
      }

      const message = this.normalizeErrorMessage(error);
      logger.error("翻译过程中出现错误:", error);
      if (RequestManager.isActiveRequest(requestId)) {
        await this.sendTranslationError(requestContext, message);
      }
      throw new Error(message);
    } finally {
      RequestManager.completeRequest(requestId);
    }
  }

  private static parseStreamLines(lines: string[]): StreamChunk {
    const chunk: StreamChunk = {
      content: "",
      reasoningContent: "",
      done: false,
    };

    for (const line of lines) {
      const normalizedLine = line.trim();
      if (!normalizedLine.startsWith("data:")) continue;

      const data = normalizedLine.slice(5).trimStart();
      if (!data) continue;
      if (data === "[DONE]") {
        chunk.done = true;
        continue;
      }

      try {
        const parsed = JSON.parse(data);
        const delta = parsed?.choices?.[0]?.delta;
        if (!delta) continue;

        if (typeof delta.content === "string") {
          chunk.content += delta.content;
        }
        if (typeof delta.reasoning_content === "string") {
          chunk.reasoningContent += delta.reasoning_content;
        }
      } catch (error) {
        logger.error("解析流式响应失败:", error, {
          rawDataLength: line.length,
        });
      }
    }

    return chunk;
  }

  private static normalizeErrorMessage(error: any): string {
    const rawMessage = error?.message || "翻译失败，请稍后重试";

    if (rawMessage.includes("API Key")) return rawMessage;
    if (rawMessage.includes("Failed to fetch")) {
      return "网络连接失败，请检查 API 地址或网络代理";
    }
    if (rawMessage.includes("API 请求失败: 401")) {
      return "API Key 无效或已过期，请到设置里更新";
    }
    if (rawMessage.includes("API 请求失败: 404")) {
      return "API 地址或模型不存在，请检查设置";
    }
    if (
      rawMessage.includes("API 请求失败: 429") ||
      rawMessage.includes("rate limit")
    ) {
      return "请求频率过高，请稍后重试";
    }

    return rawMessage;
  }

  private static async sendTranslationError(
    requestContext: RequestContext,
    error: string
  ): Promise<boolean> {
    const { requestId, target } = requestContext;
    let action: string;
    if (target.kind === "tab") {
      action = MESSAGE_TYPES.UPDATE_CONTENT_TRANSLATION;
    } else if (target.kind === "sidepanel") {
      action = MESSAGE_TYPES.UPDATE_SIDEPANEL_TRANSLATION;
    } else {
      action = MESSAGE_TYPES.UPDATE_POPUP_TRANSLATION;
    }

    const message = {
      action,
      requestId,
      sessionId: target.kind === "sidepanel" ? target.sessionId : undefined,
      error,
      done: true,
    };

    return target.kind === "tab"
      ? MessageUtils.safeSendMessage(target.tabId, message)
      : MessageUtils.sendRuntimeMessage(message);
  }

  private static async sendTranslationUpdate(
    requestContext: RequestContext,
    content: string,
    reasoningContent: string,
    done: boolean
  ): Promise<boolean> {
    const { requestId, target } = requestContext;
    if (!RequestManager.isActiveRequest(requestId)) {
      return false;
    }

    let action: string;
    if (target.kind === "tab") {
      action = MESSAGE_TYPES.UPDATE_CONTENT_TRANSLATION;
    } else if (target.kind === "sidepanel") {
      action = MESSAGE_TYPES.UPDATE_SIDEPANEL_TRANSLATION;
    } else {
      action = MESSAGE_TYPES.UPDATE_POPUP_TRANSLATION;
    }

    const message = {
      action,
      requestId,
      sessionId: target.kind === "sidepanel" ? target.sessionId : undefined,
      content,
      hasReasoning: reasoningContent.length > 0,
      reasoningContent,
      done,
    };

    logger.log("📤 [TranslationService] 发送翻译更新", {
      requestId,
      target,
      contentLength: content.length,
      reasoningLength: reasoningContent.length,
      done,
    });

    return target.kind === "tab"
      ? MessageUtils.safeSendMessage(target.tabId, message)
      : MessageUtils.sendRuntimeMessage(message);
  }
}
