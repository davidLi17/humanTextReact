/**
 * 请求管理器
 * 负责管理翻译请求的生命周期
 */
export class RequestManager {
  private static activeRequests = new Map<number, AbortController>();

  /**
   * 创建新的请求控制器
   */
  static createRequest(tabId?: number): AbortController {
    // 如果存在旧的请求，则中止它
    if (tabId && this.activeRequests.has(tabId)) {
      const oldController = this.activeRequests.get(tabId);
      oldController?.abort();
      this.activeRequests.delete(tabId);
    }

    // 创建新的 AbortController
    const controller = new AbortController();
    if (tabId) {
      this.activeRequests.set(tabId, controller);
    }

    return controller;
  }

  /**
   * 清理请求
   */
  static cleanupRequest(tabId: number) {
    if (this.activeRequests.has(tabId)) {
      const controller = this.activeRequests.get(tabId);
      controller?.abort();
      this.activeRequests.delete(tabId);
    }
  }

  /**
   * 完成请求
   */
  static completeRequest(tabId?: number) {
    if (tabId) {
      this.activeRequests.delete(tabId);
    }
  }

  /**
   * 检查请求是否活跃
   */
  static isRequestActive(tabId: number): boolean {
    return this.activeRequests.has(tabId);
  }
}
