import {
  getTranslationTargetKey,
  isTranslationTargetForTab,
  type TranslationTarget,
} from "@/entrypoints/shared/requestProtocol";

export interface RequestContext {
  requestId: string;
  target: TranslationTarget;
  targetKey: string;
  controller: AbortController;
  createdAt: number;
  startedAt?: number;
}

/**
 * 以 requestId 管理请求，并记录每个展示目标当前正在显示的请求。
 */
export class RequestManager {
  private static requestsById = new Map<string, RequestContext>();
  private static activeByTarget = new Map<string, string>();

  static createRequest(
    requestId: string,
    target: TranslationTarget
  ): RequestContext {
    const targetKey = getTranslationTargetKey(target);
    const existingRequest = this.requestsById.get(requestId);

    if (existingRequest?.targetKey === targetKey) {
      return existingRequest;
    }
    if (existingRequest) {
      this.cleanupRequest(requestId);
    }

    const activeRequestId = this.activeByTarget.get(targetKey);
    if (activeRequestId && activeRequestId !== requestId) {
      this.cleanupRequest(activeRequestId);
    }

    const context: RequestContext = {
      requestId,
      target,
      targetKey,
      controller: new AbortController(),
      createdAt: Date.now(),
    };

    this.requestsById.set(requestId, context);
    this.activeByTarget.set(targetKey, requestId);
    return context;
  }

  /**
   * 原子地领取一次待执行请求，避免新后台和旧 Content Script 重复调用 API。
   */
  static claimRequest(requestId: string): RequestContext | undefined {
    const context = this.requestsById.get(requestId);
    if (!context || !this.isActiveRequest(requestId) || context.startedAt) {
      return undefined;
    }

    context.startedAt = Date.now();
    return context;
  }

  static cleanupRequest(requestId: string): boolean {
    const context = this.requestsById.get(requestId);
    if (!context) return false;

    context.controller.abort();
    this.requestsById.delete(requestId);
    if (this.activeByTarget.get(context.targetKey) === requestId) {
      this.activeByTarget.delete(context.targetKey);
    }
    return true;
  }

  static cleanupTarget(target: TranslationTarget): number {
    const targetKey = getTranslationTargetKey(target);
    const requestIds = Array.from(this.requestsById.values())
      .filter((context) => context.targetKey === targetKey)
      .map((context) => context.requestId);

    requestIds.forEach((requestId) => this.cleanupRequest(requestId));
    return requestIds.length;
  }

  static cleanupTab(tabId: number): number {
    const requestIds = Array.from(this.requestsById.values())
      .filter((context) => isTranslationTargetForTab(context.target, tabId))
      .map((context) => context.requestId);

    requestIds.forEach((requestId) => this.cleanupRequest(requestId));
    return requestIds.length;
  }

  static completeRequest(requestId: string): boolean {
    const context = this.requestsById.get(requestId);
    if (!context) return false;

    this.requestsById.delete(requestId);
    if (this.activeByTarget.get(context.targetKey) === requestId) {
      this.activeByTarget.delete(context.targetKey);
    }
    return true;
  }

  static isActiveRequest(requestId: string): boolean {
    const context = this.requestsById.get(requestId);
    return Boolean(
      context && this.activeByTarget.get(context.targetKey) === requestId
    );
  }

  static getActiveRequestId(
    target: TranslationTarget
  ): string | undefined {
    return this.activeByTarget.get(getTranslationTargetKey(target));
  }

  static getRequestContext(requestId: string): RequestContext | undefined {
    return this.requestsById.get(requestId);
  }
}
