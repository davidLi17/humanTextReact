import { expect, test } from "bun:test";
import {
  ApiService,
  classifyConnectionTestResponse,
} from "../../entrypoints/background/apiService.ts";
import { CodedError } from "../../entrypoints/shared/errors.ts";
import { initializeLogger } from "../../entrypoints/shared/logger/index.ts";
import {
  createMemoryBrowserStorage,
  preserveGlobals,
  setTestGlobal,
} from "../helpers/testEnvironment.js";

const restoreGlobals = preserveGlobals("fetch", "browser", "chrome");

const KIMI_URL = "https://api.moonshot.cn/v1/chat/completions";
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
/** 自建 / 中转地址：resolveProvider 匹配不到，走默认分支 */
const CUSTOM_URL = "https://my-proxy.example.com/v1/chat/completions";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** 用给定的响应工厂替换 fetch，并记录每次请求解析后的请求体。 */
function mockFetch(responseFactory) {
  const requests = [];
  setTestGlobal("fetch", async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) });
    return responseFactory(requests.length, url);
  });
  return requests;
}

const contentResponse = () =>
  jsonResponse({ choices: [{ message: { content: "你好" } }] });

test("Kimi（api.moonshot.cn）的请求体省略 temperature，max_tokens 给足 512", async () => {
  const requests = mockFetch(contentResponse);

  await expect(
    ApiService.testApiConnection("test-key", KIMI_URL, "kimi-k2.6")
  ).resolves.toBe(true);

  const { url, options, body } = requests[0];
  expect(url).toBe(KIMI_URL);
  expect(options.method).toBe("POST");
  expect(options.headers.Authorization).toBe("Bearer test-key");
  expect(options.headers["Content-Type"]).toBe("application/json");
  // 月之暗面官方参数表没有 temperature，带上可能被拒
  expect("temperature" in body).toBe(false);
  expect(body.max_tokens).toBe(512);
  // 模型与消息体保持原有形态
  expect(body.model).toBe("kimi-k2.6");
  expect(body.messages).toEqual([{ role: "user", content: "test" }]);
});

test("非 Kimi（DeepSeek 与自建地址）带 temperature 0.1、max_tokens 512", async () => {
  const requests = mockFetch(contentResponse);

  for (const baseUrl of [DEEPSEEK_URL, CUSTOM_URL]) {
    await expect(
      ApiService.testApiConnection("test-key", baseUrl, "some-model")
    ).resolves.toBe(true);
  }

  expect(requests).toHaveLength(2);
  for (const { body } of requests) {
    expect(body.temperature).toBe(0.1);
    expect(body.max_tokens).toBe(512);
    expect(body.model).toBe("some-model");
    expect(body.messages).toEqual([{ role: "user", content: "test" }]);
  }
});

test("只有思考内容、正文为空时仍算连接成功（返回 true）", async () => {
  mockFetch(() =>
    jsonResponse({
      choices: [
        { message: { content: "", reasoning_content: "让我先想想这个问题…" } },
      ],
    })
  );

  await expect(
    ApiService.testApiConnection("test-key", DEEPSEEK_URL, "deepseek-flash")
  ).resolves.toBe(true);
});

test("正文只有空白字符时按「正文为空」处理，仍算连接成功", async () => {
  mockFetch(() =>
    jsonResponse({
      choices: [{ message: { content: "   ", reasoning_content: "思考" } }],
    })
  );

  await expect(
    ApiService.testApiConnection("test-key", DEEPSEEK_URL, "deepseek-flash")
  ).resolves.toBe(true);
});

test("响应体非 JSON 或结构异常时不把解析失败误判为连接失败", async () => {
  const responses = [
    () => new Response("<html>502 Bad Gateway</html>", { status: 200 }),
    () => new Response("", { status: 200 }),
    () => jsonResponse({}),
    () => jsonResponse({ choices: [] }),
    () => jsonResponse({ choices: [{ message: null }] }),
  ];
  const requests = mockFetch(
    (callIndex) => responses[callIndex - 1]()
  );

  for (let index = 0; index < responses.length; index += 1) {
    await expect(
      ApiService.testApiConnection("test-key", CUSTOM_URL, "some-model")
    ).resolves.toBe(true);
  }
  expect(requests).toHaveLength(responses.length);
});

test("2xx 响应体缺 text 方法时仍然按连接成功返回（保持只看 response.ok 的语义）", async () => {
  setTestGlobal("fetch", async () => ({ ok: true, status: 200 }));

  await expect(
    ApiService.testApiConnection("test-key", CUSTOM_URL, "some-model")
  ).resolves.toBe(true);
});

test("非 2xx 走 CodedError，错误码与文案沿用既有策略表", async () => {
  const cases = [
    [401, "AUTH"],
    [404, "NOT_FOUND"],
    [429, "RATE_LIMIT"],
    [500, "SERVER"],
  ];

  for (const [status, code] of cases) {
    mockFetch(() =>
      jsonResponse({ error: { message: `provider says ${status}` } }, status)
    );

    let caught;
    try {
      await ApiService.testApiConnection("test-key", CUSTOM_URL, "some-model");
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(CodedError);
    expect(caught.code).toBe(code);
    expect(caught.message).toContain(`provider says ${status}`);
  }
});

test("API Key 为空时直接抛 AUTH，且不发请求", async () => {
  const requests = mockFetch(contentResponse);

  let caught;
  try {
    await ApiService.testApiConnection("", CUSTOM_URL, "some-model");
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(CodedError);
  expect(caught.code).toBe("AUTH");
  expect(requests).toHaveLength(0);
});

test("Failed to fetch 仍然映射为 NETWORK 错误码", async () => {
  setTestGlobal("fetch", async () => {
    throw new TypeError("Failed to fetch");
  });

  let caught;
  try {
    await ApiService.testApiConnection("test-key", CUSTOM_URL, "some-model");
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(CodedError);
  expect(caught.code).toBe("NETWORK");
  expect(caught.message).toBe("网络连接失败，请检查API地址");
});

test("classifyConnectionTestResponse 区分正文 / 只有思考 / 无法判定", () => {
  expect(
    classifyConnectionTestResponse(
      JSON.stringify({ choices: [{ message: { content: "正文" } }] })
    )
  ).toBe("content");

  expect(
    classifyConnectionTestResponse(
      JSON.stringify({
        choices: [{ message: { content: "", reasoning_content: "思考" } }],
      })
    )
  ).toBe("reasoning-only");

  // OpenRouter 风格把思考放在 reasoning 字段
  expect(
    classifyConnectionTestResponse(
      JSON.stringify({ choices: [{ message: { reasoning: "思考" } }] })
    )
  ).toBe("reasoning-only");

  for (const bodyText of [
    "",
    "   ",
    "not-json",
    JSON.stringify({}),
    JSON.stringify({ choices: [] }),
    JSON.stringify({ choices: [{ message: {} }] }),
    JSON.stringify({ choices: [{ message: { content: "" } }] }),
  ]) {
    expect(classifyConnectionTestResponse(bodyText)).toBe("indeterminate");
  }

  // 非字符串入参也不抛异常
  expect(classifyConnectionTestResponse(undefined)).toBe("indeterminate");
});

// 该用例会把全局 logger 初始化到 debug 级（logger 是模块内单例，初始化后
// 同文件后续用例都会真的往 console 输出），因此放在文件最后。
test("有正文与只有思考两种情况在日志里可区分", async () => {
  const { browser } = createMemoryBrowserStorage({
    local: { settings: { logLevel: "debug" } },
    sync: {},
  });
  setTestGlobal("browser", browser);
  setTestGlobal("chrome", browser);

  const logged = [];
  const originalWarn = console.warn;
  const originalInfo = console.info;
  const formatArgs = (args) =>
    args
      .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
      .join(" ");
  console.warn = (...args) => logged.push(`warn ${formatArgs(args)}`);
  console.info = (...args) => logged.push(`info ${formatArgs(args)}`);

  try {
    await initializeLogger("background");

    mockFetch(() =>
      jsonResponse({ choices: [{ message: { content: "你好" } }] })
    );
    await ApiService.testApiConnection("test-key", DEEPSEEK_URL, "deepseek-flash");

    mockFetch(() =>
      jsonResponse({
        choices: [{ message: { content: "", reasoning_content: "思考中" } }],
      })
    );
    await ApiService.testApiConnection("test-key", KIMI_URL, "kimi-k2.6");
  } finally {
    console.warn = originalWarn;
    console.info = originalInfo;
    restoreGlobals();
  }

  const apiServiceLogs = logged.filter((line) => line.includes("api-service"));
  expect(
    apiServiceLogs.some(
      (line) => line.startsWith("info") && line.includes("已返回正文内容")
    )
  ).toBe(true);
  expect(
    apiServiceLogs.some(
      (line) =>
        line.startsWith("warn") &&
        line.includes("正文为空") &&
        line.includes("512")
    )
  ).toBe(true);
});
