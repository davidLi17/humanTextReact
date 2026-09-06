/**
 * API 服务
 * 负责处理与外部 API 的交互
 */

import { CodedError, createApiError } from "@/entrypoints/shared/errors";
import { RequestTimeoutGuard } from "@/entrypoints/shared/requestTimeout";

// 定义错误处理策略接口
interface ErrorStrategy {
  match: (status: number) => boolean;
  handle: (status: number, bodyText: string) => never;
}

// 各种状态码的处理策略：统一交给共享错误模型解析为 CodedError，
// 状态码对应的中文文案与错误码映射由 shared/errors 的 describeApiStatus 维护（文案保持不变）
const errorStrategies: ErrorStrategy[] = [
  {
    match: (status) => status === 401,
    handle: (status, bodyText) => {
      throw createApiError(status, bodyText);
    },
  },
  {
    match: (status) => status === 404,
    handle: (status, bodyText) => {
      throw createApiError(status, bodyText);
    },
  },
  {
    match: (status) => status === 429,
    handle: (status, bodyText) => {
      throw createApiError(status, bodyText);
    },
  },
  {
    match: (_status) => true, // 默认策略，建议放最后
    handle: (status, bodyText) => {
      throw createApiError(status, bodyText);
    },
  },
];

export class ApiService {
  /**
   * API连接测试函数
   */
  static async testApiConnection(
    apiKey: string,
    baseUrl: string,
    model: string
  ): Promise<boolean> {
    if (!apiKey) {
      throw new CodedError("API Key不能为空", "AUTH");
    }

    const controller = new AbortController();
    const timeoutGuard = new RequestTimeoutGuard(controller, {
      armStreamingTimeouts: false,
    });
    try {
      // 发送一个简单的测试请求
      return await timeoutGuard.runStage(
        (async () => {
          const response = await fetch(baseUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: model,
              messages: [
                {
                  role: "user",
                  content: "test",
                },
              ],
              temperature: 0.1,
              max_tokens: 5,
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            // 连接测试的 15 秒总边界同时覆盖错误响应体读取。
            const errorBodyText = await response.text().catch((error) => {
              if (controller.signal.aborted) throw error;
              return "";
            });
            const strategy = errorStrategies.find((s) =>
              s.match(response.status)
            );
            if (strategy) {
              strategy.handle(response.status, errorBodyText);
            }
          }

          return true;
        })(),
        "connection-test"
      );
    } catch (error: any) {
      // 策略表抛出的 CodedError 直接透传，避免被下方字符串判断误归类
      if (error instanceof CodedError) {
        throw error;
      }
      if (error.name === "AbortError") {
        throw new CodedError("请求超时", "ABORT");
      }
      if (error.message?.includes("Failed to fetch")) {
        throw new CodedError("网络连接失败，请检查API地址", "NETWORK");
      }
      throw error;
    } finally {
      timeoutGuard.dispose();
    }
  }
}
