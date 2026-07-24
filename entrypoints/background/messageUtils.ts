import { createLogger } from "@/entrypoints/shared/logger/index";

const logger = createLogger("MessageUtils");
/**
 * 消息工具类
 * 负责处理消息发送的工具函数
 */
export class MessageUtils {
  /**
   * 安全发送消息到指定标签页
   */
  static async safeSendMessage(
    tabId: number,
    message: any
  ): Promise<boolean> {
    try {
      await browser.tabs.sendMessage(tabId, message);
      return true;
    } catch (error) {
      logger.log("发送消息失败（可能是页面已关闭）:", error);
      return false;
    }
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
