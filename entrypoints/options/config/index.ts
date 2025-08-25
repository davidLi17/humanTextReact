export const MODEL_HINTS = [
  "deepseek-reasoner",
  "deepseek-chat",
  "deepseek-r1-250528",
  "deepseek-v3-250324",
  "deepseek-v3-1-250821",
  "kimi-k2-250711",
  "doubao-seed-1-6-thinking-250715",
  "doubao-seed-1-6-flash-250715",
  "doubao-seed-1-6-250615",
  "doubao-embedding-large-text-240915",
];
export const API_HINTS = [
  {
    name: "DeepSeek",
    url: "https://api.deepseek.com/v1/chat/completions",
  },
  {
    name: "火山引擎",
    url: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
  },
  { name: "自定义地址", url: "" },
];
export const API_PLACEHOLDERS = [
  "https://api.deepseek.com/v1/chat/completions",
  "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
  "",
];
export const API_PLATFORM_HINTS = [
  {
    name: "DeepSeek平台",
    url: "https://platform.deepseek.com/api_keys",
  },
  {
    name: "火山引擎平台",
    url: "https://console.volcengine.com/ark/region:ark+cn-beijing/model?vendor=Bytedance&view=CARD_VIEW&projectName=default",
  },
  { name: "自定义地址", url: "" },
];
