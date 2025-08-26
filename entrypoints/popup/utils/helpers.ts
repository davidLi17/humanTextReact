import debounce from "lodash-es/debounce";
import throttle from "lodash-es/throttle";
import dayjs from "dayjs";

/**
 * 格式化日期时间
 * @param timestamp - 时间戳或日期对象
 * @returns 格式化后的日期字符串
 */
export function formatDateTime(timestamp: number | Date): string {
  return dayjs(timestamp).format("YYYY-MM-DD HH:mm");
}

// 导出 lodash-es 的 debounce 和 throttle 函数
export { debounce, throttle };

/**
 * 复制文本到剪贴板
 * @param text - 要复制的文本
 * @returns 复制是否成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("复制失败:", error);
    return false;
  }
}

/**
 * 安全的Chrome消息发送
 * @param message - 要发送的消息
 * @returns Promise<响应>
 */
export function sendChromeMessage(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const chromeRuntime = browser.runtime;
    if (chromeRuntime) {
      chromeRuntime.sendMessage(message, (response: any) => {
        if (chromeRuntime.lastError) {
          reject(new Error(chromeRuntime.lastError.message));
        } else {
          resolve(response);
        }
      });
    } else {
      reject(new Error("Chrome runtime not available"));
    }
  });
}
