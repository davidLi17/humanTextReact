/**
 * 格式化日期时间
 * @param timestamp - 时间戳或日期对象
 * @returns 格式化后的日期字符串
 */
export function formatDateTime(timestamp: number | Date): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")} ${date
    .getHours()
    .toString()
    .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

/**
 * 防抖函数
 * @param func - 要执行的函数
 * @param wait - 等待时间(ms)
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * 节流函数
 * @param func - 要执行的函数
 * @param wait - 等待时间(ms)
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), wait);
    }
  };
}

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
