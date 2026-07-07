/**
 * 请求管理器
 * 负责管理翻译请求的生命周期
 */
export class RequestManager {
  private static readonly POPUP_REQUEST_KEY = 0;
  private static activeRequests = new Map<number, AbortController>();

  private static getRequestKey(tabId?: number): number {
    return tabId ?? this.POPUP_REQUEST_KEY;
  }

  /**
   * 创建新的请求控制器
   */
  static createRequest(tabId?: number): AbortController {
    const requestKey = this.getRequestKey(tabId);

    // 如果存在旧的请求，则中止它
    if (this.activeRequests.has(requestKey)) {
      const oldController = this.activeRequests.get(requestKey);
      oldController?.abort();
      this.activeRequests.delete(requestKey);
    }

    // 创建新的 AbortController
    const controller = new AbortController();
    this.activeRequests.set(requestKey, controller);

    return controller;
  }

  /**
   * 清理请求
   */
  static cleanupRequest(tabId?: number) {
    const requestKey = this.getRequestKey(tabId);
    if (this.activeRequests.has(requestKey)) {
      const controller = this.activeRequests.get(requestKey);
      controller?.abort();
      this.activeRequests.delete(requestKey);
    }
  }

  /**
   * 完成请求
   */
  static completeRequest(tabId?: number) {
    this.activeRequests.delete(this.getRequestKey(tabId));
  }

  /**
   * 检查请求是否活跃
   */
  static isRequestActive(tabId?: number): boolean {
    return this.activeRequests.has(this.getRequestKey(tabId));
  }
}
