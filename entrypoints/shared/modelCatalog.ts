/**
 * 提供商 → 参数策略的唯一来源表
 *
 * 为什么需要它：六家 OpenAI 兼容网关对「思考模式」的表达并不统一，
 * 早先 translationService 对所有地址一刀切发 `thinking: { type }`，
 * 对不认这个字段的网关要么被忽略（思考模式静默失效），要么直接 400。
 *
 * 各家的真实差异（快速 = 用户关闭思考模式，深度 = 用户开启思考模式）：
 * - DeepSeek：官方接受 `thinking: { type: "enabled" | "disabled" }`，保持原样即可
 * - 智谱 GLM：`thinking.type` **只接受 `enabled`**（官方文档明确），
 *   快速模式发 `disabled` 可能 400，因此恒发 `enabled`，靠 `reasoning_effort` 降强度
 * - 火山引擎（方舟）：沿用今天的 `thinking: { type }`，参数待联调确认
 * - 月之暗面 Kimi：支持 `thinking: { type }`，但其官方参数表**未列出 temperature**，
 *   故一律省略该字段
 * - OpenRouter：标准字段是 `reasoning: { effort }`，`thinking` 不是它的字段
 * - 通义千问（百炼兼容模式）：顶层布尔 `enable_thinking`
 *
 * 注意：本文件的提供商数据与 `entrypoints/options/config/index.ts` 的 `API_HINTS`
 * 是**必须保持一致的两份副本**，已由 `tests/unit/modelCatalog.test.js` 钉死——
 * 任何一处漂移都会让测试变红。改模型 ID 或地址时必须同时改两处。
 * （后续可考虑让 options 直接 re-export 本文件，收敛为单一来源。）
 */
import { THINKING_CONFIG } from "./constants";

export type ProviderId =
  | "deepseek"
  | "zhipu"
  | "volcengine"
  | "moonshot"
  | "openrouter"
  | "qwen";

export interface ProviderProfile {
  id: ProviderId;
  /** UI 展示名，与 options/config/index.ts 的 API_HINTS[].name 一致 */
  label: string;
  /** 请求地址 */
  apiUrl: string;
  /** 推荐模型 */
  defaultModel: string;
  /** 平台取 key 地址 */
  platformUrl: string;
  /** 该提供商推荐模型清单 */
  models: readonly string[];
}

/**
 * 各提供商的域名白名单，用于按 baseUrl 反查提供商。
 * 用户也可能填带路径的完整地址（如 `/v1/chat/completions`），
 * 因此这里只比对 host，不比对 path。
 */
const PROVIDER_HOSTS: Record<ProviderId, readonly string[]> = {
  deepseek: ["api.deepseek.com"],
  zhipu: ["open.bigmodel.cn"],
  volcengine: ["ark.cn-beijing.volces.com"],
  moonshot: ["api.moonshot.cn"],
  openrouter: ["openrouter.ai"],
  qwen: ["dashscope.aliyuncs.com"],
};

export const PROVIDER_PROFILES: readonly ProviderProfile[] = [
  {
    id: "deepseek",
    label: "DeepSeek",
    apiUrl: "https://api.deepseek.com/v1/chat/completions",
    defaultModel: "deepseek-flash",
    platformUrl: "https://platform.deepseek.com/api_keys",
    models: ["deepseek-flash"],
  },
  {
    id: "zhipu",
    label: "智谱AI (GLM)",
    apiUrl: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    defaultModel: "glm-5.3-flash",
    platformUrl: "https://open.bigmodel.cn/apikey/platform",
    models: ["glm-5.3-flash"],
  },
  {
    id: "volcengine",
    label: "火山引擎",
    apiUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    defaultModel: "doubao-seed-2-1-turbo-260628",
    platformUrl:
      "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey",
    models: ["doubao-seed-2-1-turbo-260628"],
  },
  {
    id: "moonshot",
    label: "月之暗面",
    apiUrl: "https://api.moonshot.cn/v1/chat/completions",
    defaultModel: "kimi-k2.6",
    platformUrl: "https://platform.moonshot.cn/console/api-keys",
    models: ["kimi-k2.6"],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    apiUrl: "https://openrouter.ai/api/v1/chat/completions",
    defaultModel: "google/gemini-3-flash-preview",
    platformUrl: "https://openrouter.ai/keys",
    models: ["google/gemini-3-flash-preview"],
  },
  {
    id: "qwen",
    label: "通义千问",
    apiUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    defaultModel: "qwen3.8-flash",
    platformUrl: "https://bailian.console.aliyun.com/#/api-key",
    models: ["qwen3.8-flash"],
  },
];

/** 从 baseUrl 中提取小写 host；无法解析（空值、自建相对地址等）时返回 null。 */
function extractHost(baseUrl: string): string | null {
  const raw = typeof baseUrl === "string" ? baseUrl.trim() : "";
  if (!raw) return null;

  // 容忍省略协议头的写法（如 "api.deepseek.com/v1/chat/completions"）
  for (const candidate of [raw, `https://${raw}`]) {
    try {
      const host = new URL(candidate).hostname.trim().toLowerCase();
      if (host) return host;
    } catch {
      // 解析失败则尝试下一种写法，最终回落 null
    }
  }
  return null;
}

/**
 * 按 baseUrl 的 host 解析提供商；匹配不到返回 null（调用方必须回落改造前行为）。
 * 该函数对任何输入都不抛异常：自建/中转地址走未知分支即可。
 */
export function resolveProvider(baseUrl: string): ProviderProfile | null {
  const host = extractHost(baseUrl);
  if (!host) return null;

  for (const profile of PROVIDER_PROFILES) {
    const hosts = PROVIDER_HOSTS[profile.id];
    if (hosts.some((known) => host === known || host.endsWith(`.${known}`))) {
      return profile;
    }
  }
  return null;
}

export interface ModelCallContext {
  baseUrl: string;
  model: string;
  /** 用户设置里的「思考模式」开关 */
  thinkingEnabled: boolean;
  /** 调用方已解析好的温度（?? 链由调用方负责） */
  temperature: number;
}

/** 推理强度：快速=medium，深度=high（按产品要求固定，不随模型变化） */
const REASONING_EFFORT = {
  FAST: "medium",
  DEEP: "high",
} as const;

/**
 * 生成请求体里与模型/提供商相关的字段。
 *
 * 不变量：DeepSeek 与「未知端点」必须与改造前完全一致 ——
 * `{ temperature, thinking: THINKING_CONFIG.ENABLED | THINKING_CONFIG.DISABLED }`，
 * 且不得抛异常（自建/中转地址一律安全回落）。
 */
export function buildModelParams(ctx: ModelCallContext): Record<string, unknown> {
  const profile = resolveProvider(ctx.baseUrl);
  const thinking = ctx.thinkingEnabled
    ? THINKING_CONFIG.ENABLED
    : THINKING_CONFIG.DISABLED;

  switch (profile?.id) {
    case "zhipu":
      // 智谱的 thinking.type 只接受 "enabled"：快速模式不能发 disabled，
      // 否则可能 400；降强度改用 reasoning_effort。
      return {
        temperature: ctx.temperature,
        thinking: THINKING_CONFIG.ENABLED,
        reasoning_effort: ctx.thinkingEnabled
          ? REASONING_EFFORT.DEEP
          : REASONING_EFFORT.FAST,
      };
    case "moonshot":
      // Kimi 官方参数表未列出 temperature，省略以免请求被拒；
      // thinking 字段本身受支持，深度/快速照常切换。
      return { thinking };
    case "openrouter":
      // OpenRouter 的标准字段是 reasoning.effort，thinking 非其字段。
      return {
        temperature: ctx.temperature,
        reasoning: {
          effort: ctx.thinkingEnabled
            ? REASONING_EFFORT.DEEP
            : REASONING_EFFORT.FAST,
        },
      };
    case "qwen":
      // 百炼兼容模式用顶层布尔 enable_thinking 表达思考模式。
      return {
        temperature: ctx.temperature,
        enable_thinking: ctx.thinkingEnabled,
      };
    case "volcengine":
    // 参数待联调确认：方舟当前沿用 temperature + thinking:{type}，
    // 与 DeepSeek 同构；若联调发现需要私有字段再在此处单独分支。
    case "deepseek":
    default:
      // DeepSeek 与未知端点（自建/中转地址）：保持改造前行为，不做任何漂移。
      return { temperature: ctx.temperature, thinking };
  }
}

/** 连接测试用的温度：除 Kimi 外统一 0.1 */
const CONNECTION_TEST_TEMPERATURE = 0.1;

/**
 * 连接测试的输出预算：必须给足。
 * 六家当前推荐的都可能是思考型模型，若沿用历史上的 5 个 token，
 * 思考内容会把预算吃光导致正文为空、测试误判为失败。
 */
const CONNECTION_TEST_MAX_TOKENS = 512;

/** 连接测试用的参数（不含 model/messages） */
export function buildConnectionTestParams(ctx: {
  baseUrl: string;
  model: string;
}): { temperature?: number; max_tokens: number } {
  const providerId = resolveProvider(ctx.baseUrl)?.id;

  // 月之暗面官方参数表未列出 temperature，省略该字段。
  if (providerId === "moonshot") {
    return { max_tokens: CONNECTION_TEST_MAX_TOKENS };
  }

  return {
    temperature: CONNECTION_TEST_TEMPERATURE,
    max_tokens: CONNECTION_TEST_MAX_TOKENS,
  };
}
