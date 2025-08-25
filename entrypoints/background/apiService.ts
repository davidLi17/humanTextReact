/**
 * API 服务
 * 负责处理与外部 API 的交互
 */
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
        if (response.status === 401) {
          throw new Error("API Key无效或已过期");
        } else if (response.status === 404) {
          throw new Error("API地址或模型不存在");
        } else if (response.status === 429) {
          throw new Error("请求频率过高，请稍后重试");
        } else {
          throw new Error(`API请求失败: ${response.status} ${errorText}`);
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
