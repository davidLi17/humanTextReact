/**
 * API 服务
 * 负责处理与外部 API 的交互
 */

import { CodedError, createApiError } from "@/entrypoints/shared/errors";
import { createLogger } from "@/entrypoints/shared/logger";
import { buildConnectionTestParams } from "@/entrypoints/shared/modelCatalog";
import { RequestTimeoutGuard } from "@/entrypoints/shared/requestTimeout";

const logger = createLogger("api-service", "🔌");

/**
 * 连接测试响应体的判定结果：
 * - `content`：模型返回了正文 —— 正常成功
 * - `reasoning-only`：只有思考内容（`reasoning_content`）而正文为空 ——
 *   链路与鉴权都没问题，仍算连接成功，但输出预算可能被思考过程吃光了
 * - `indeterminate`：解析失败 / 结构异常（或没有可判定的输出）——
 *   **不**据此判定连接失败，保持"只看 response.ok"的原有语义
 */
export type ConnectionTestOutcome =
  | "content"
  | "reasoning-only"
  | "indeterminate";

/**
 * 解析连接测试的 2xx 响应体，判定模型输出了什么。
 *
 * 任何解析失败、字段缺失或类型不符都返回 `indeterminate`（绝不抛异常）：
 * 连接测试的成功与否仍由 HTTP 状态码决定，这里的结果只影响日志。
 */
export function classifyConnectionTestResponse(
  bodyText: string
): ConnectionTestOutcome {
  if (typeof bodyText !== "string" || !bodyText.trim()) {
    return "indeterminate";
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return "indeterminate";
  }

  const choices = (parsed as { choices?: unknown } | null)?.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return "indeterminate";
  }

  const choice = choices[0] as {
    message?: unknown;
    reasoning_content?: unknown;
  } | null;
  const message = choice?.message as {
    content?: unknown;
    reasoning_content?: unknown;
    reasoning?: unknown;
  } | null;
  if (message === null || typeof message !== "object") {
    return "indeterminate";
  }

  const content = message.content;
  if (typeof content === "string" && content.trim()) {
    return "content";
  }

  // 思考内容各家字段不一：月之暗面 / DeepSeek 用 reasoning_content，
  // OpenRouter 风格用 reasoning，个别网关把思考挂在 choice 上。
  const reasoningCandidates = [
    message.reasoning_content,
    message.reasoning,
    choice?.reasoning_content,
  ];
  if (
    reasoningCandidates.some(
      (candidate) => typeof candidate === "string" && candidate.trim()
    )
  ) {
    return "reasoning-only";
  }

  return "indeterminate";
}

/** 按判定结果记录日志；连接测试的返回值不受这里影响。 */
function logConnectionTestOutcome(
  outcome: ConnectionTestOutcome,
  maxTokens: number
): void {
  if (outcome === "content") {
    logger.info("API 连接测试成功：模型已返回正文内容");
    return;
  }
  if (outcome === "reasoning-only") {
    // 预算数字写进消息文本：作为结构化字段会被 logger 按
    // SENSITIVE_KEY_PATTERN（键名含 token）脱敏成 [REDACTED]，反而看不到。
    logger.warn(
      `API 连接测试成功：模型有思考输出但正文为空，可能是 max_tokens 预算不足（当前 ${maxTokens}）`
    );
    return;
  }
  logger.info(
    "API 连接测试成功：响应体无法解析出正文或思考内容（结构异常或模型未输出），仅按 HTTP 状态判定"
  );
}

/**
 * 读取 2xx 响应体用于判定输出形态。
 * 读取失败（含响应对象缺少 text 方法）不应把连接测试判成失败，
 * 因此统一回落到空字符串 —— 由 classify 归入 `indeterminate`。
 * 真正的中止仍要抛出，交给外层转换成 ABORT。
 */
async function readResponseBodyText(
  response: Response,
  controller: AbortController
): Promise<string> {
  try {
    return await response.text();
  } catch (error) {
    if (controller.signal.aborted) throw error;
    return "";
  }
}

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
      // 发送一个简单的测试请求；输出预算与温度按提供商适配
      // （Kimi 省略 temperature，max_tokens 各家统一给足）
      const connectionTestParams = buildConnectionTestParams({
        baseUrl,
        model,
      });

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
              ...connectionTestParams,
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

          // 2xx 也要读一次响应体：只有"返回了正文"才算真正跑通。
          // 读取失败或结构异常不改变原有语义（只看 response.ok），
          // 仅记录日志，返回值恒为 true。
          const bodyText = await readResponseBodyText(response, controller);
          logConnectionTestOutcome(
            classifyConnectionTestResponse(bodyText),
            connectionTestParams.max_tokens
          );

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
