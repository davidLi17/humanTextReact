/**
 * API 服务
 * 负责处理与外部 API 的交互
 */

// 定义错误处理策略接口
interface ErrorStrategy {
  match: (status: number) => boolean;
  handle: (errorText: string) => never;
}

// 各种状态码的处理策略
const errorStrategies: ErrorStrategy[] = [
  {
    match: (status) => status === 401,
    handle: () => {
      throw new Error("API Key无效或已过期");
    },
  },
  {
    match: (status) => status === 404,
    handle: () => {
      throw new Error("API地址或模型不存在");
    },
  },
  {
    match: (status) => status === 429,
    handle: () => {
      throw new Error("请求频率过高，请稍后重试");
    },
  },
  {
    match: (_status) => true, // 默认策略，建议放最后
    handle: (errorText: string) => {
      throw new Error(`API请求失败: ${errorText}`);
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
      throw new Error("API Key不能为空");
    }

    try {
      // 发送一个简单的测试请求
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
      });

      if (!response.ok) {
        const errorText = await response.text();
        // 使用策略模式处理错误
        const strategy = errorStrategies.find((s) => s.match(response.status));
        if (strategy) {
          strategy.handle(`${response.status} ${errorText}`);
        }
      }

      return true;
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error("请求超时");
      }
      if (error.message?.includes("Failed to fetch")) {
        throw new Error("网络连接失败，请检查API地址");
      }
      throw error;
    }
  }
}
