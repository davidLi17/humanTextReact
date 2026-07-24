import {
  DEFAULT_SETTINGS,
  MESSAGE_TYPES,
  THINKING_CONFIG,
} from "@/entrypoints/shared/constants";
import { createLogger } from "@/entrypoints/shared/logger";
import { HistoryManager } from "./historyManager";
import { MessageUtils } from "./messageUtils";
import { RequestManager } from "./requestManager";
import { SettingsUtils } from "@/entrypoints/shared/settingsUtils";

const logger = createLogger("translation-service", "🌐");

/**
 * 图片内容接口
 */
interface ImageContent {
  data: string;
  mimeType: string;
  fileName?: string;
}

/**
 * 翻译参数接口
 */
interface TranslationParams {
  text: string;
  images?: ImageContent[];
  thinkingEnabled?: boolean;
  tabId?: number;
}

interface StreamChunk {
  content: string;
  reasoningContent: string;
  done: boolean;
}

/**
 * 翻译服务
 * 负责处理文本翻译的核心逻辑
 */
export class TranslationService {
  /**
   * 翻译文本函数 - 支持流式响应和多模态
   */
  static async translateText(
    params: TranslationParams | string,
    tabId?: number
  ): Promise<string | void> {
    logger.log("🚀 [TranslationService] 开始翻译", {
      paramsType: typeof params,
      isStringParams: typeof params === "string",
      tabIdParam: tabId,
      paramsTabId: typeof params === "object" ? params.tabId : "N/A",
      timestamp: new Date().toISOString(),
    });

    // 兼容旧的API调用方式
    const translationParams: TranslationParams =
      typeof params === "string" ? { text: params, tabId } : params;

    const { text, images = [], thinkingEnabled = false } = translationParams;
    const actualTabId = translationParams.tabId ?? tabId;

    logger.log("📋 [TranslationService] 翻译参数处理", {
      text: text.substring(0, 50) + "...",
      textLength: text.length,
      imagesCount: images.length,
      thinkingEnabled,
      actualTabId,
      paramsTabId: translationParams.tabId,
      fallbackTabId: tabId,
    });

    const controller = RequestManager.createRequest(actualTabId);

    try {
    // 获取设置，优先从云端获取，失败时从本地获取
    const config = await SettingsUtils.getSettings();

    if (!config.apiKey) {
      throw new Error("请先在设置中配置 API Key");
    }

    // 使用提示词模板
    const promptTemplate =
      config.promptTemplate || DEFAULT_SETTINGS.promptTemplate;

    // 构建消息内容
    const userContent: any[] = [];

    // 添加图片内容
    if (images.length > 0) {
      images.forEach((image) => {
        userContent.push({
          type: "image_url",
          image_url: {
            url: image.data,
          },
        });
      });
    }

    // 添加文本内容
    userContent.push({
      type: "text",
      text: text,
    });

    // 构建API请求体
    const requestBody: any = {
      model: config.model || DEFAULT_SETTINGS.model,
      messages: [
        { role: "system", content: promptTemplate },
        {
          role: "user",
          content: userContent.length === 1 ? text : userContent,
        },
      ],
      temperature: config.temperature || DEFAULT_SETTINGS.temperature,
      stream: true,
    };

    // 添加thinking参数
    if (thinkingEnabled) {
      requestBody.thinking = THINKING_CONFIG.ENABLED;
    } else {
      requestBody.thinking = THINKING_CONFIG.DISABLED;
    }

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

          logger.log("📤 [TranslationService] 发送流式更新", {
            actualTabId,
            resultLength: result.length,
            reasoningLength: reasoningContent.length,
          });

          const delivered = await this.sendTranslationUpdate(
            actualTabId,
            result,
            reasoningContent,
            false
          );
          if (!delivered) {
            logger.log("翻译接收端已关闭，停止当前请求");
            RequestManager.cleanupRequest(actualTabId);
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

      logger.log("✅ [TranslationService] 翻译完成，发送最终结果", {
        actualTabId,
        finalResultLength: result.length,
        finalReasoningLength: reasoningContent.length,
      });

      // 发送完成信号
      const finalDelivered = await this.sendTranslationUpdate(
        actualTabId,
        result,
        reasoningContent,
        true
      );
      if (!finalDelivered) {
        RequestManager.cleanupRequest(actualTabId);
        return;
      }

      // 在成功翻译完成后，保存翻译历史
      if (result) {
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

      // 清理已完成的请求
      RequestManager.completeRequest(actualTabId);
      return result;
    } catch (error: any) {
      // 区分错误类型
      if (error.name === "AbortError") {
        logger.log("翻译请求已中止");
        return;
      }
      if (error.message?.includes("Receiving end does not exist")) {
        logger.log("连接已断开，可能是页面已关闭");
        return;
      }
      const message = this.normalizeErrorMessage(error);
      logger.error("翻译过程中出现错误:", error);
      await this.sendTranslationError(actualTabId, message);
      RequestManager.completeRequest(actualTabId);
      throw new Error(message);
    }
  }

  /**
   * 解析一批 SSE 行，兼容 data: 后有无空格的响应格式
   */
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
        logger.error("解析流式响应失败:", error, "原始数据:", line);
      }
    }

    return chunk;
  }

  /**
   * 生成更适合展示给用户的错误信息
   */
  private static normalizeErrorMessage(error: any): string {
    const rawMessage = error?.message || "翻译失败，请稍后重试";

    if (rawMessage.includes("API Key")) return rawMessage;
    if (rawMessage.includes("Failed to fetch")) return "网络连接失败，请检查 API 地址或网络代理";
    if (rawMessage.includes("API 请求失败: 401")) return "API Key 无效或已过期，请到设置里更新";
    if (rawMessage.includes("API 请求失败: 404")) return "API 地址或模型不存在，请检查设置";
    if (rawMessage.includes("API 请求失败: 429") || rawMessage.includes("rate limit")) {
      return "请求频率过高，请稍后重试";
    }

    return rawMessage;
  }

  /**
   * 发送翻译错误消息
   */
  private static async sendTranslationError(
    tabId: number | undefined,
    error: string
  ): Promise<void> {
    const message = tabId
      ? {
          action: MESSAGE_TYPES.UPDATE_CONTENT_TRANSLATION,
          error,
          done: true,
        }
      : {
          action: MESSAGE_TYPES.UPDATE_POPUP_TRANSLATION,
          error,
          done: true,
        };

    if (tabId) {
      await MessageUtils.safeSendMessage(tabId, message);
    } else {
      await MessageUtils.sendRuntimeMessage(message);
    }
  }
  /**
   * 发送翻译更新消息
   */
  private static async sendTranslationUpdate(
    tabId: number | undefined,
    content: string,
    reasoningContent: string,
    done: boolean
  ): Promise<boolean> {
    logger.log("🔄 [TranslationService] 发送翻译更新", {
      tabId,
      hasContent: !!content,
      contentLength: content?.length || 0,
      hasReasoning: reasoningContent.length > 0,
      reasoningLength: reasoningContent.length,
      done,
      timestamp: new Date().toISOString(),
    });

    if (tabId) {
      // 有tabId：右键菜单或快捷键翻译，发送给content script
      const message = {
        action: MESSAGE_TYPES.UPDATE_CONTENT_TRANSLATION,
        content,
        hasReasoning: reasoningContent.length > 0,
        reasoningContent,
        done,
      };
      logger.log("📤 [TranslationService] 发送到content script", {
        tabId,
        messageType: message.action,
        messageData: {
          hasContent: !!message.content,
          hasReasoning: message.hasReasoning,
          done: message.done,
        },
      });
      return MessageUtils.safeSendMessage(tabId, message);
    } else {
      // 无tabId：popup翻译，发送给popup页面
      const message = {
        action: MESSAGE_TYPES.UPDATE_POPUP_TRANSLATION,
        content,
        hasReasoning: reasoningContent.length > 0,
        reasoningContent,
        done,
      };
      logger.log("📤 [TranslationService] 发送到popup页面", {
        messageType: message.action,
        messageData: {
          hasContent: !!message.content,
          hasReasoning: message.hasReasoning,
          done: message.done,
        },
      });
      return MessageUtils.sendRuntimeMessage(message);
    }
  }
}

