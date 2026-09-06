import { describe, expect, test } from "bun:test";
import {
  CodedError,
  createApiError,
  extractApiErrorMessage,
  resolveUserErrorMessage,
} from "../../entrypoints/shared/errors.ts";

describe("createApiError: 状态码 + 响应体 → CodedError", () => {
  test("401 → AUTH，文案沿用既有提示并附服务商原因", () => {
    const error = createApiError(
      401,
      '{"error":{"message":"Invalid API key provided"}}'
    );

    expect(error).toBeInstanceOf(CodedError);
    expect(error.code).toBe("AUTH");
    expect(error.message).toBe(
      "API Key无效或已过期（服务商返回：Invalid API key provided）"
    );
    expect(error.userMessage).toBe(error.message);
    expect(error.detail).toBe("Invalid API key provided");
  });

  test("401 无响应体 → 保持旧版文案不变", () => {
    const error = createApiError(401, "");

    expect(error.code).toBe("AUTH");
    expect(error.message).toBe("API Key无效或已过期");
    expect(error.detail).toBeUndefined();
  });

  test("402 → AUTH，透出余额不足原因", () => {
    const error = createApiError(402, '{"error":{"message":"余额不足"}}');

    expect(error.code).toBe("AUTH");
    expect(error.message).toContain("余额不足或套餐已过期");
    expect(error.message).toContain("（服务商返回：余额不足）");
  });

  test("403 → AUTH，透出模型无权限原因", () => {
    const error = createApiError(403, '{"error":{"message":"无权限访问该模型"}}');

    expect(error.code).toBe("AUTH");
    expect(error.message).toContain("无权访问该 API 或模型");
    expect(error.message).toContain("（服务商返回：无权限访问该模型）");
  });

  test("429 → RATE_LIMIT，文案沿用既有提示", () => {
    const error = createApiError(429, "");

    expect(error.code).toBe("RATE_LIMIT");
    expect(error.message).toBe("请求频率过高，请稍后重试");
  });

  test("500 → SERVER，保留 'API请求失败: 状态码' 格式并透出原因", () => {
    const error = createApiError(
      500,
      '{"error":{"message":"Internal Server Error"}}'
    );

    expect(error.code).toBe("SERVER");
    expect(error.message).toBe("API请求失败: 500 - Internal Server Error");
  });

  test("翻译链路使用带空格前缀，兼容内容脚本 'API 请求失败' 的展示判断", () => {
    const error = createApiError(503, '{"message":"模型过载"}', "API 请求失败");

    expect(error.code).toBe("SERVER");
    expect(error.message).toBe("API 请求失败: 503 - 模型过载");
    expect(error.message.includes("API 请求失败")).toBe(true);
  });

  test("响应体非 JSON：已知状态码不附加原因", () => {
    const error = createApiError(401, "<html>Bad Gateway</html>");

    expect(error.code).toBe("AUTH");
    expect(error.message).toBe("API Key无效或已过期");
    expect(error.detail).toBeUndefined();
  });

  test("响应体非 JSON：未知状态码回退为截断后的原始文本", () => {
    const rawBody = "x".repeat(500);
    const error = createApiError(529, rawBody);

    expect(error.code).toBe("SERVER");
    const prefix = "API请求失败: 529 - ";
    expect(error.message.startsWith(prefix)).toBe(true);
    expect(error.message.length).toBe(prefix.length + 200);
  });

  test("响应体为空/读取失败：仅抛状态码", () => {
    const error = createApiError(500, "");

    expect(error.code).toBe("SERVER");
    expect(error.message).toBe("API请求失败: 500");
  });

  test("JSON 响应体无可识别字段：不附加原因", () => {
    const error = createApiError(429, '{"code":"timeout"}');

    expect(error.code).toBe("RATE_LIMIT");
    expect(error.message).toBe("请求频率过高，请稍后重试");
  });
});

describe("extractApiErrorMessage", () => {
  test("支持 error.message / message / error.msg 字段", () => {
    expect(
      extractApiErrorMessage('{"error":{"message":"a"},"message":"b"}')
    ).toBe("a");
    expect(extractApiErrorMessage('{"message":"  b  "}')).toBe("b");
    expect(extractApiErrorMessage('{"error":{"msg":"c"}}')).toBe("c");
  });

  test("空体 / 非 JSON / 无字符串字段返回 null", () => {
    expect(extractApiErrorMessage("")).toBeNull();
    expect(extractApiErrorMessage(null)).toBeNull();
    expect(extractApiErrorMessage(undefined)).toBeNull();
    expect(extractApiErrorMessage("not-json")).toBeNull();
    expect(extractApiErrorMessage('{"error":123}')).toBeNull();
  });
});

describe("resolveUserErrorMessage: 按 code 映射展示文案", () => {
  test("AUTH → 友好文案", () => {
    expect(resolveUserErrorMessage(new CodedError("x", "AUTH"))).toBe(
      "API Key 无效或已过期，请到设置里更新"
    );
  });

  test("AUTH + detail → 追加服务商原因", () => {
    const error = new CodedError("x", "AUTH", "x", "余额不足");
    expect(resolveUserErrorMessage(error)).toBe(
      "API Key 无效或已过期，请到设置里更新（服务商返回：余额不足）"
    );
  });

  test("NOT_FOUND / RATE_LIMIT / NETWORK / ABORT → 各自映射文案", () => {
    expect(resolveUserErrorMessage(new CodedError("x", "NOT_FOUND"))).toBe(
      "API 地址或模型不存在，请检查设置"
    );
    expect(resolveUserErrorMessage(new CodedError("x", "RATE_LIMIT"))).toBe(
      "请求频率过高，请稍后重试"
    );
    expect(resolveUserErrorMessage(new CodedError("x", "NETWORK"))).toBe(
      "网络连接失败，请检查 API 地址或网络代理"
    );
    expect(resolveUserErrorMessage(new CodedError("x", "ABORT"))).toBe(
      "请求已取消"
    );
  });

  test("TIMEOUT 保留分阶段超时说明", () => {
    const message = "模型输出空闲超时，已生成内容已保留，请手动重试。";
    expect(resolveUserErrorMessage(new CodedError(message, "TIMEOUT"))).toBe(
      message
    );
  });

  test("SERVER → 保留原始 message（含状态码与服务商原因）", () => {
    const error = createApiError(500, '{"error":{"message":"boom"}}');
    expect(resolveUserErrorMessage(error)).toBe("API请求失败: 500 - boom");
  });

  test("旧式非 CodedError 错误：Failed to fetch → 网络文案", () => {
    expect(
      resolveUserErrorMessage(new TypeError("Failed to fetch"))
    ).toBe("网络连接失败，请检查 API 地址或网络代理");
  });

  test("旧式非 CodedError 错误：含 API Key / rate limit 的兜底判断", () => {
    expect(
      resolveUserErrorMessage(new Error("请先在设置中配置 API Key"))
    ).toBe("请先在设置中配置 API Key");
    expect(
      resolveUserErrorMessage(new Error("too many requests, rate limit hit"))
    ).toBe("请求频率过高，请稍后重试");
  });

  test("空错误 → 默认文案", () => {
    expect(resolveUserErrorMessage(undefined)).toBe("翻译失败，请稍后重试");
    expect(resolveUserErrorMessage(new Error())).toBe("翻译失败，请稍后重试");
  });
});
