import {
  DEFAULT_SETTINGS,
  MESSAGE_TYPES,
  THINKING_CONFIG,
} from "@/entrypoints/shared/constants";
import {
  createApiError,
  resolveUserErrorMessage,
} from "@/entrypoints/shared/errors";
import { createLogger } from "@/entrypoints/shared/logger";
import { SettingsUtils } from "@/entrypoints/shared/settingsUtils";
import {
  buildContextualSystemPrompt,
  buildContextualUserText,
  normalizeSelectionContext,
  type SelectionContext,
} from "@/entrypoints/shared/selectionContext";
import { HistoryManager } from "./historyManager";
import { MessageUtils } from "./messageUtils";
import { RequestManager, type RequestContext } from "./requestManager";
import {
  isRequestTimeoutError,
  RequestTimeoutGuard,
} from "@/entrypoints/shared/requestTimeout";

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
  selectionContext?: SelectionContext;
}

export interface TranslationParams {
  text?: string;
  messages?: ChatRoleMessage[];
  images?: ImageContent[];
  thinkingEnabled?: boolean;
  temperature?: number;
  promptTemplate?: string;
  apiKey?: string;
  selectionContext?: SelectionContext;
}

interface StreamChunk {
  content: string;
  reasoningContent: string;
  done: boolean;
}

function releaseStreamReader(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  cancel: boolean
): void {
  if (cancel) {
    try {
      void Promise.resolve(reader.cancel()).catch((error) =>
        logger.warn("取消响应流失败:", error)
      );
    } catch (error) {
      logger.warn("取消响应流失败:", error);
    }
  }
  try {
    reader.releaseLock();
  } catch {
    // read/cancel 尚未结算时可能无法释放锁；已挂接拒绝处理，不阻塞上层结束。
  }
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
    selectionContext?: SelectionContext;
  }
): any[] {
  const {
    text = "",
    messages: chatMessages,
    images = [],
    promptTemplate = DEFAULT_SETTINGS.promptTemplate,
    selectionContext,
  } = params;

  const normalizedTopLevelContext = normalizeSelectionContext(selectionContext);
  const normalizedMessageContexts =
    chatMessages?.map((message) =>
      message.role === "user"
        ? normalizeSelectionContext(message.selectionContext)
        : undefined
    ) || [];
  const hasContext = Boolean(
    normalizedTopLevelContext || normalizedMessageContexts.some(Boolean)
  );
  const systemPrompt = hasContext
    ? buildContextualSystemPrompt(promptTemplate)
    : promptTemplate;

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
      const messageContext =
        normalizedMessageContexts[idx] ||
        (isLastUser ? normalizedTopLevelContext : undefined);
      let contextualContent = msg.content;
      if (messageContext && typeof msg.content === "string") {
        contextualContent = buildContextualUserText(msg.content, messageContext);
      } else if (messageContext && Array.isArray(msg.content)) {
        let contextApplied = false;
        contextualContent = msg.content.map((item) => {
          if (
            !contextApplied &&
            item?.type === "text" &&
            typeof item.text === "string"
          ) {
            contextApplied = true;
            return {
              ...item,
              text: buildContextualUserText(item.text, messageContext),
            };
          }
          return item;
        });
        if (!contextApplied) {
          contextualContent = [
            ...contextualContent,
            {
              type: "text",
              text: buildContextualUserText("", messageContext),
            },
          ];
        }
      }
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
        content: formatMultimodalContent(contextualContent, uniqueImages),
      });
    });

    if (hasContext) {
      const existingSystem = formattedMessages.find(
        (message) => message.role === "system" && typeof message.content === "string"
      );
      if (existingSystem) {
        existingSystem.content = buildContextualSystemPrompt(existingSystem.content);
      }
    }

    return hasSystem
      ? formattedMessages
      : [{ role: "system", content: systemPrompt }, ...formattedMessages];
  }

  const userText = normalizedTopLevelContext
    ? buildContextualUserText(text, normalizedTopLevelContext)
    : text;
  const formattedUserContent = formatMultimodalContent(userText, images);
  return [
    { role: "system", content: systemPrompt },
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
    const timeoutGuard = new RequestTimeoutGuard(controller, {
      thinkingEnabled,
    });
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let streamFinished = false;
    let result = "";
    let reasoningContent = "";

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
      const config = await timeoutGuard.run(SettingsUtils.getSettings());
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
        selectionContext: params.selectionContext,
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

      timeoutGuard.startFetchHeadersTimeout();
      let response: Response;
      try {
        response = await timeoutGuard.run(
          fetch(config.baseUrl || DEFAULT_SETTINGS.baseUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          })
        );
      } finally {
        timeoutGuard.markFetchHeadersReceived();
      }

      if (!response.ok) {
        // 走到这里时响应体尚未被流式读取消费，可安全读取；
        // 用服务商返回的具体原因（如"余额不足""模型无权限"）构造带错误码的错误
        const errorBodyText = await timeoutGuard
          .runStage(response.text(), "error-body")
          .catch((error) => {
            if (isRequestTimeoutError(error) || error?.name === "AbortError") {
              throw error;
            }
            return "";
          });
        timeoutGuard.completeStream();
        throw createApiError(response.status, errorBodyText, "API 请求失败");
      }
      if (!response.body) {
        timeoutGuard.completeStream();
        throw new Error("API 响应为空，请检查接口兼容性");
      }

      const streamReader = response.body.getReader();
      reader = streamReader;
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (!streamFinished) {
        const { value, done } = await timeoutGuard.run(streamReader.read());

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

          if (
            currentChunk.content.trim() ||
            currentChunk.reasoningContent.trim()
          ) {
            timeoutGuard.markMeaningfulOutput();
          }

          const delivered = await timeoutGuard.run(
            this.sendTranslationUpdate(
              requestContext,
              result,
              reasoningContent,
              false
            )
          );
          if (!delivered) {
            logger.log("翻译接收端已关闭或请求已过期", { requestId });
            RequestManager.cleanupRequest(requestId);
            return;
          }
        }

        streamFinished = done || currentChunk.done;
        if (currentChunk.done && !done) {
          releaseStreamReader(streamReader, true);
          reader = undefined;
        }
      }

      timeoutGuard.completeStream();

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
      if (isRequestTimeoutError(error)) {
        const message = this.normalizeErrorMessage(error);
        logger.error("🚀lhg[TranslationService][请求超时]", {
          requestId,
          stage: error.stage,
          target,
        });
        if (RequestManager.isActiveRequest(requestId)) {
          await this.sendTranslationError(
            requestContext,
            message,
            result,
            reasoningContent
          );
        }
        throw error;
      }
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
      if (reader) {
        releaseStreamReader(reader, !streamFinished);
      }
      timeoutGuard.dispose();
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

  /**
   * 归一化错误文案：优先按 CodedError.code 映射友好提示，
   * 服务商返回的具体原因以"（服务商返回：…）"补充；
   * 非 CodedError 的旧式错误保留字符串兜底判断（见 shared/errors）。
   */
  private static normalizeErrorMessage(error: unknown): string {
    return resolveUserErrorMessage(error);
  }

  private static async sendTranslationError(
    requestContext: RequestContext,
    error: string,
    content = "",
    reasoningContent = ""
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
      content: content || undefined,
      reasoningContent: reasoningContent || undefined,
      hasReasoning: reasoningContent.length > 0,
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
