import { createLogger } from "@/entrypoints/shared/logger/index";

const logger = createLogger("MessageUtils");

interface MessageDelivery<T = any> {
  delivered: boolean;
  response?: T;
}

/**
 * 消息工具类
 * 负责处理消息发送的工具函数
 */
export class MessageUtils {
  static async safeSendMessageWithResponse<T = any>(
    tabId: number,
    message: any
  ): Promise<MessageDelivery<T>> {
    try {
      const response = await browser.tabs.sendMessage(tabId, message);
      return { delivered: true, response };
    } catch (error) {
      logger.log("发送消息失败（可能是页面已关闭）:", error);
      return { delivered: false };
    }
  }

  /**
   * 安全发送消息到指定标签页
   */
  static async safeSendMessage(
    tabId: number,
    message: any
  ): Promise<boolean> {
    const result = await this.safeSendMessageWithResponse(tabId, message);
    return result.delivered;
  }

  /**
   * 发送消息到运行时（通常是popup）
   */
  static async sendRuntimeMessage(message: any): Promise<boolean> {
    try {
      await browser.runtime.sendMessage(message);
      return true;
    } catch (error) {
      logger.log("runtime消息发送失败（可能是popup已关闭）:", error);
      return false;
    }
  }
}
