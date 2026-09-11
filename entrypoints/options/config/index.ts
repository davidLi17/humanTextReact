export interface ApiHint {
  name: string;
  url: string;
  defaultModel?: string;
  platformUrl?: string;
}

export interface ApiPlatformHint {
  name: string;
  url: string;
}

export const MODEL_HINTS = [
  "deepseek-flash",
  "glm-5.3-flash",
  "doubao-seed-2-1-turbo-260628",
  "kimi-k2.6",
  "google/gemini-3-flash-preview",
  "qwen3.8-flash",
];

export const API_HINTS: ApiHint[] = [
  {
    name: "DeepSeek",
    url: "https://api.deepseek.com/v1/chat/completions",
    defaultModel: "deepseek-flash",
    platformUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    name: "智谱AI (GLM)",
    url: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    defaultModel: "glm-5.3-flash",
    platformUrl: "https://open.bigmodel.cn/apikey/platform",
  },
  {
    name: "火山引擎",
    url: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    defaultModel: "doubao-seed-2-1-turbo-260628",
    platformUrl: "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey",
  },
  {
    name: "月之暗面",
    url: "https://api.moonshot.cn/v1/chat/completions",
    defaultModel: "kimi-k2.6",
    platformUrl: "https://platform.moonshot.cn/console/api-keys",
  },
  {
    name: "OpenRouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    defaultModel: "google/gemini-3-flash-preview",
    platformUrl: "https://openrouter.ai/keys",
  },
  {
    name: "通义千问",
    url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    defaultModel: "qwen3.8-flash",
    platformUrl: "https://bailian.console.aliyun.com/#/api-key",
  },
  { name: "自定义地址", url: "" },
];

export const API_PLACEHOLDERS = [
  "https://api.deepseek.com/v1/chat/completions",
  "https://open.bigmodel.cn/api/paas/v4/chat/completions",
  "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
  "",
];

export const API_PLATFORM_HINTS: ApiPlatformHint[] = [
  {
    name: "DeepSeek平台",
    url: "https://platform.deepseek.com/api_keys",
  },
  {
    name: "智谱开放平台",
    url: "https://open.bigmodel.cn/apikey/platform",
  },
  {
    name: "火山引擎平台",
    url: "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey",
  },
  {
    name: "月之暗面(Kimi)",
    url: "https://platform.moonshot.cn/console/api-keys",
  },
  {
    name: "OpenRouter平台",
    url: "https://openrouter.ai/keys",
  },
  {
    name: "通义千问(百炼)",
    url: "https://bailian.console.aliyun.com/#/api-key",
  },
  { name: "自定义地址", url: "" },
];
