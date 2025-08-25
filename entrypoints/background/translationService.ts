import { MESSAGE_TYPES, DEFAULT_SETTINGS } from "../shared/constants";
import { SettingsManager } from "./settingsManager";
import { RequestManager } from "./requestManager";
import { HistoryManager } from "./historyManager";
import { MessageUtils } from "./messageUtils";

/**
 * 翻译服务
 * 负责处理文本翻译的核心逻辑
 */
export class TranslationService {
  /**
   * 翻译文本函数 - 支持流式响应
   */
  static async translateText(
    text: string,
    tabId?: number
  ): Promise<string | void> {
    const controller = RequestManager.createRequest(tabId);

    // 获取设置，优先从云端获取，失败时从本地获取
    const config = await SettingsManager.getSettings();

    if (!config.apiKey) {
      throw new Error("请先在设置中配置 API Key");
    }

    // 使用提示词模板
    const promptTemplate =
      config.promptTemplate || DEFAULT_SETTINGS.promptTemplate;

    try {
      const response = await fetch(config.baseUrl || DEFAULT_SETTINGS.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || DEFAULT_SETTINGS.model,
          messages: [
            { role: "system", content: promptTemplate },
            {
              role: "user",
              content: text, // 直接使用原文本
            },
          ],
          temperature: config.temperature || DEFAULT_SETTINGS.temperature,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let result = "";
      let reasoningContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentChunk = "";
        let currentReasoningChunk = "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);

              // 检查delta内容是否存在
              if (
                parsed.choices &&
                parsed.choices.length > 0 &&
                parsed.choices[0].delta &&
                parsed.choices[0].delta.content !== undefined
              ) {
                const content = parsed.choices[0].delta.content;

                // 处理空内容和表情符号
                if (content !== null && content !== undefined) {
                  currentChunk += content;
                }

                // 添加解析的思维链内容（如果有）
                const hasReasoning =
                  parsed.choices[0].delta.reasoning_content !== undefined;
                if (hasReasoning) {
                  const reasoning = parsed.choices[0].delta.reasoning_content;
                  if (reasoning !== null && reasoning !== undefined) {
                    currentReasoningChunk += reasoning;
                  }
                }
              }
            } catch (e) {
              console.error("解析错误:", e, "原始数据:", line);
            }
          }
        }

        if (currentChunk || currentReasoningChunk) {
          result += currentChunk;
          reasoningContent += currentReasoningChunk;

          await this.sendTranslationUpdate(
            tabId,
            result,
            reasoningContent,
            false
          );
        }
      }

      // 发送完成信号
      await this.sendTranslationUpdate(tabId, result, reasoningContent, true);

      // 在成功翻译完成后，保存翻译历史
      if (result) {
        try {
          await HistoryManager.saveTranslationHistory(
            text,
            result,
            reasoningContent
          );
        } catch (error) {
          console.error("保存翻译历史失败:", error);
        }
      }

      // 清理已完成的请求
      RequestManager.completeRequest(tabId);
      return result;
    } catch (error: any) {
      // 区分错误类型
      if (error.name === "AbortError") {
        console.log("翻译请求已中止");
        return;
      }
      if (error.message.includes("Receiving end does not exist")) {
        console.log("连接已断开，可能是页面已关闭");
        return;
      }
      // 只有真正需要用户知道的错误才抛出
      if (
        error.message.includes("API Key") ||
        error.message.includes("API 请求失败") ||
        error.message.includes("rate limit")
      ) {
        throw error;
      }
      // 其他错误只记录不抛出
      console.error("翻译过程中出现错误:", error);
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
  ): Promise<void> {
    const message = {
      action: MESSAGE_TYPES.UPDATE_TRANSLATION,
      content,
      hasReasoning: reasoningContent.length > 0,
      reasoningContent,
      done,
    };

    if (tabId) {
      // 右键菜单翻译使用 safeSendMessage
      await MessageUtils.safeSendMessage(tabId, message);
    } else {
      // popup 翻译直接使用 runtime.sendMessage
      let popupClosed = false;
      MessageUtils.sendRuntimeMessage(message, () => {
        popupClosed = true;
      });

      // 如果 popup 已关闭，中止翻译
      if (popupClosed && !done) {
        RequestManager.cleanupRequest(tabId || 0);
        return;
      }
    }
  }
}
