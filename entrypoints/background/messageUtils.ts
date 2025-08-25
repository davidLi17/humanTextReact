/**
 * 消息工具类
 * 负责处理消息发送的工具函数
 */
export class MessageUtils {
  /**
   * 安全发送消息到指定标签页
   */
  static async safeSendMessage(tabId: number, message: any): Promise<void> {
    try {
      await browser.tabs.sendMessage(tabId, message);
    } catch (error) {
      console.log("发送消息失败（可能是popup已关闭）:", error);
    }
  }

  /**
   * 发送消息到运行时（通常是popup）
   */
  static sendRuntimeMessage(message: any, callback?: () => void): void {
    browser.runtime.sendMessage(message, () => {
      if (browser.runtime.lastError) {
        console.log("runtime消息发送失败:", browser.runtime.lastError);
        callback?.();
      }
    });
  }
}
