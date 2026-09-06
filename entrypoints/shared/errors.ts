/**
 * 统一错误模型
 *
 * 提供 CodedError 与"HTTP 状态码 + 响应体 → 错误码/文案"的解析工具，
 * 取代各处通过中文字符串 includes 反向解析错误来源的脆弱耦合。
 */

export type ErrorCode =
  | "AUTH" // 鉴权/权限/额度问题（401/402/403）
  | "NOT_FOUND" // API 地址或模型不存在（404）
  | "RATE_LIMIT" // 请求频率受限（429）
  | "NETWORK" // 网络不通
  | "SERVER" // 服务端错误或其他 HTTP 错误
  | "ABORT" // 请求被主动中止
  | "TIMEOUT" // 请求超过阶段或总时限
  | "UNKNOWN"; // 未归类错误

/**
 * 各错误码对应的用户可读中文文案。
 * SERVER/UNKNOWN 留空：其 message 已包含状态码与服务商原因，直接透出。
 */
export const ERROR_CODE_MESSAGES: Record<ErrorCode, string> = {
  AUTH: "API Key 无效或已过期，请到设置里更新",
  NOT_FOUND: "API 地址或模型不存在，请检查设置",
  RATE_LIMIT: "请求频率过高，请稍后重试",
  NETWORK: "网络连接失败，请检查 API 地址或网络代理",
  SERVER: "",
  ABORT: "请求已取消",
  TIMEOUT: "",
  UNKNOWN: "",
};

/**
 * 携带错误码的自定义 Error。
 * - code：供程序按类型分支判断，避免字符串 includes 反向解析
 * - userMessage：用户可读中文文案（默认与 message 一致）
 * - detail：服务商返回的原始错误原因（可能为空）
 */
export class CodedError extends Error {
  readonly code: ErrorCode;
  readonly userMessage: string;
  readonly detail?: string;

  constructor(
    message: string,
    code: ErrorCode = "UNKNOWN",
    userMessage?: string,
    detail?: string
  ) {
    super(message);
    this.name = "CodedError";
    this.code = code;
    this.userMessage = userMessage ?? message;
    if (detail) {
      this.detail = detail;
    }
  }
}

/** 非 JSON 响应体兜底时的最大截断长度 */
const MAX_RAW_DETAIL_LENGTH = 200;

/** 拼接"服务商返回：xxx"后缀 */
function withProviderDetail(text: string, detail?: string): string {
  return detail ? `${text}（服务商返回：${detail}）` : text;
}

/**
 * 从响应体中安全提取服务商返回的错误原因（error.message / message / error.msg 字段）。
 * 响应体为空或非 JSON 时返回 null，调用方自行决定兜底策略。
 */
export function extractApiErrorMessage(
  bodyText: string | null | undefined
): string | null {
  if (typeof bodyText !== "string") {
    return null;
  }
  const trimmed = bodyText.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed === null || typeof parsed !== "object") {
      return null;
    }
    const candidates = [
      parsed.error?.message,
      parsed.error?.msg,
      parsed.message,
      parsed.msg,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * HTTP 状态码 → 错误码与基础文案（文案沿用 apiService 既有提示，保持行为兼容）。
 * 未匹配（含 5xx 与其他状态码）返回 null，由调用方按通用 HTTP 错误处理。
 */
export function describeApiStatus(
  status: number
): { code: ErrorCode; text: string } | null {
  if (status === 401) {
    return { code: "AUTH", text: "API Key无效或已过期" };
  }
  if (status === 402) {
    return { code: "AUTH", text: "API 账户余额不足或套餐已过期" };
  }
  if (status === 403) {
    return { code: "AUTH", text: "无权访问该 API 或模型，请检查账号权限" };
  }
  if (status === 404) {
    return { code: "NOT_FOUND", text: "API地址或模型不存在" };
  }
  if (status === 429) {
    return { code: "RATE_LIMIT", text: "请求频率过高，请稍后重试" };
  }
  return null;
}

/**
 * 将"状态码 + 响应体"解析为 CodedError。
 *
 * - 已知状态码：沿用既有中文文案，响应体能提取到原因时追加"（服务商返回：…）"
 * - 其他状态码（含 5xx）：`${prefix}: ${status}`，可提取原因时追加；
 *   非 JSON 响应体则回退为截断后的原始文本
 *
 * @param prefix 通用 HTTP 错误前缀；翻译链路传 "API 请求失败"（带空格，
 *   与内容脚本 popupManager 的展示判断兼容），连接测试等其他场景用默认值
 */
export function createApiError(
  status: number,
  bodyText?: string | null,
  prefix = "API请求失败"
): CodedError {
  const descriptor = describeApiStatus(status);
  const reason = extractApiErrorMessage(bodyText);

  if (descriptor) {
    const detail = reason ?? undefined;
    const message = withProviderDetail(descriptor.text, detail);
    return new CodedError(message, descriptor.code, message, detail);
  }

  const rawText = typeof bodyText === "string" ? bodyText.trim() : "";
  const detail = reason ?? (rawText ? rawText.slice(0, MAX_RAW_DETAIL_LENGTH) : "");
  const message = `${prefix}: ${status}${detail ? ` - ${detail}` : ""}`;
  return new CodedError(message, "SERVER", message, detail || undefined);
}

/**
 * 把错误转换为最终展示给用户的文案：
 * - CodedError 按 code 映射友好文案，SERVER/UNKNOWN 直接透出原始 message（已含状态码与服务商原因）
 * - 携带 detail 时在文案后补充"（服务商返回：…）"
 * - 非 CodedError 的旧式错误保留字符串兜底判断，行为与历史版本一致
 */
export function resolveUserErrorMessage(error: unknown): string {
  if (error instanceof CodedError) {
    const friendly = ERROR_CODE_MESSAGES[error.code];
    if (!friendly) {
      return error.message || error.userMessage || "翻译失败，请稍后重试";
    }
    return withProviderDetail(friendly, error.detail);
  }

  const rawMessage =
    (error as { message?: string } | null | undefined)?.message ||
    "翻译失败，请稍后重试";
  if (rawMessage.includes("API Key")) {
    return rawMessage;
  }
  if (rawMessage.includes("Failed to fetch")) {
    return "网络连接失败，请检查 API 地址或网络代理";
  }
  if (rawMessage.includes("rate limit")) {
    return "请求频率过高，请稍后重试";
  }
  return rawMessage;
}
