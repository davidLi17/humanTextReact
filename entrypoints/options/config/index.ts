export const MODEL_HINTS = [
  "deepseek-v4-flash-vision-exp",
  "deepseek-v4-flash",
  "deepseek-v4-pro",
  "glm-5.3",
  "glm-5.3-flash",
];
export const API_HINTS = [
  {
    name: "DeepSeek",
    url: "https://api.deepseek.com/v1/chat/completions",
  },
  {
    name: "智谱AI (GLM)",
    url: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
  },
  {
    name: "火山引擎",
    url: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
  },
  {
    name: "月之暗面",
    url: "https://api.moonshot.cn/v1/chat/completions",
  },
  {
    name: "OpenRouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
  },
  {
    name: "通义千问",
    url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  },
  { name: "自定义地址", url: "" },
];
export const API_PLACEHOLDERS = [
  "https://api.deepseek.com/v1/chat/completions",
  "https://open.bigmodel.cn/api/paas/v4/chat/completions",
  "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
  "",
];
export const API_PLATFORM_HINTS = [
  {
    name: "DeepSeek平台",
    url: "https://platform.deepseek.com/api_keys",
  },
  {
    name: "智谱开放平台",
    url: "https://open.bigmodel.cn/usercenter/apikeys",
  },
  {
    name: "火山引擎平台",
    url: "https://console.volcengine.com/ark/region:ark+cn-beijing/model?vendor=Bytedance&view=CARD_VIEW&projectName=default",
  },
  { name: "自定义地址", url: "" },
];
