export default defineBackground(() => {
  console.log("人话翻译器 background script 启动", { id: browser.runtime.id });

  // 导入配置常量
  const MESSAGE_TYPES = {
    TRANSLATE: "translate",
    CLEANUP: "cleanup",
    GET_HISTORY: "getHistory",
    CLEAR_HISTORY: "clearHistory",
    DELETE_HISTORY_ITEM: "deleteHistoryItem",
    IMPORT_HISTORY: "importHistory",
    UPDATE_TRANSLATION: "updateTranslation",
    SHOW_TRANSLATION_POPUP: "showTranslationPopup",
  };

  // 创建右键菜单
  browser.runtime.onInstalled.addListener(() => {
    // 初始化快捷键信息到存储
    saveCurrentShortcut();

    // 创建右键菜单
    createContextMenu();
  });

  // 保存当前快捷键到存储
  async function saveCurrentShortcut() {
    try {
      const commands = await browser.commands.getAll();
      const translateCommand = commands.find(
        (command: any) => command.name === "translate-selection"
      );
      const shortcut =
        translateCommand && translateCommand.shortcut
          ? translateCommand.shortcut
          : "";

      // 保存到本地存储
      browser.storage.local.set({ saved_shortcut: shortcut }, () => {
        console.log("快捷键已保存:", shortcut);
      });
    } catch (error) {
      console.error("保存快捷键信息失败:", error);
    }
  }

  // 监听扩展安装或更新事件，创建右键菜单
  browser.runtime.onStartup.addListener(() => {
    // 创建右键菜单
    createContextMenu();
  });

  // 简化的创建菜单函数
  function createContextMenu() {
    try {
      // 先移除现有菜单
      browser.contextMenus.removeAll(() => {
        browser.contextMenus.create({
          id: "translateSelection",
          title: "翻译成人话",
          contexts: ["selection"],
        });
      });
    } catch (error) {
      console.error("创建右键菜单时出错:", error);

      // 出错时创建不带快捷键的菜单作为备用
      browser.contextMenus.create({
        id: "translateSelection",
        title: "翻译成人话",
        contexts: ["selection"],
      });
    }
  }

  // 添加一个 Map 来跟踪每个标签页的请求状态
  const activeRequests = new Map();

  // 默认设置
  const defaultSettings = {
    baseUrl: "https://api.deepseek.com/v1/chat/completions",
    model: "deepseek-reasoner",
    temperature: 0.7,
    promptTemplate:
      "请用通俗易懂的中文解释用户提供的内容。如果是英文，请翻译成中文并解释；如果是中文，请用更简单的语言重新表达。",
    apiKey: "",
  };

  // 获取设置，优先从云端获取，失败时从本地获取
  async function getSettings() {
    try {
      // 尝试从云端获取设置
      const syncSettings = await browser.storage.sync.get([
        "apiKey",
        "baseUrl",
        "model",
        "temperature",
        "promptTemplate",
      ]);

      // 如果成功获取到云端设置，同时保存到本地作为备份
      if (Object.keys(syncSettings).length > 0) {
        browser.storage.local.set(syncSettings);
        return { ...defaultSettings, ...syncSettings };
      }

      // 如果云端没有设置，尝试从本地获取
      console.log("云端没有设置，尝试从本地获取");
      const localSettings = await browser.storage.local.get([
        "apiKey",
        "baseUrl",
        "model",
        "temperature",
        "promptTemplate",
      ]);

      if (Object.keys(localSettings).length > 0) {
        return { ...defaultSettings, ...localSettings };
      }

      // 如果本地也没有，返回默认设置
      console.log("使用默认设置");
      return { ...defaultSettings };
    } catch (error) {
      console.error("获取云端设置失败，尝试从本地获取:", error);

      try {
        const localSettings = await browser.storage.local.get([
          "apiKey",
          "baseUrl",
          "model",
          "temperature",
          "promptTemplate",
        ]);
        return { ...defaultSettings, ...localSettings };
      } catch (localError) {
        console.error("获取本地设置也失败:", localError);
      }

      // 如果都失败了，返回默认设置
      console.log("使用默认设置");
      return { ...defaultSettings };
    }
  }

  // 翻译文本函数 - 支持流式响应
  async function translateText(text: string, tabId?: number) {
    // 如果存在旧的请求，则中止它
    if (activeRequests.has(tabId)) {
      const oldController = activeRequests.get(tabId);
      oldController.abort();
      activeRequests.delete(tabId);
    }

    // 创建新的 AbortController
    const controller = new AbortController();
    activeRequests.set(tabId, controller);

    // 获取设置，优先从云端获取，失败时从本地获取
    const config = await getSettings();

    if (!config.apiKey) {
      throw new Error("请先在设置中配置 API Key");
    }

    // 使用提示词模板
    const promptTemplate =
      config.promptTemplate || defaultSettings.promptTemplate;

    try {
      const response = await fetch(config.baseUrl || defaultSettings.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || defaultSettings.model,
          messages: [
            { role: "system", content: promptTemplate },
            {
              role: "user",
              content: text, // 直接使用原文本
            },
          ],
          temperature: config.temperature || defaultSettings.temperature,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let result = "";
      let reasoningContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentChunk = "";
        let currentReasoningChunk = "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);

              // 增强调试，记录实际响应格式

              // 检查delta内容是否存在
              if (
                parsed.choices &&
                parsed.choices.length > 0 &&
                parsed.choices[0].delta &&
                parsed.choices[0].delta.content !== undefined
              ) {
                const content = parsed.choices[0].delta.content;

                // 处理空内容和表情符号
                if (content !== null && content !== undefined) {
                  currentChunk += content;
                }

                // 添加解析的思维链内容（如果有）
                const hasReasoning =
                  parsed.choices[0].delta.reasoning_content !== undefined;
                if (hasReasoning) {
                  const reasoning = parsed.choices[0].delta.reasoning_content;
                  if (reasoning !== null && reasoning !== undefined) {
                    currentReasoningChunk += reasoning;
                  }
                }
              }
            } catch (e) {
              console.error("解析错误:", e, "原始数据:", line);
            }
          }
        }

        if (currentChunk || currentReasoningChunk) {
          result += currentChunk;
          reasoningContent += currentReasoningChunk;
          if (tabId) {
            // 右键菜单翻译使用 safeSendMessage
            await safeSendMessage(tabId, {
              action: MESSAGE_TYPES.UPDATE_TRANSLATION,
              content: result,
              hasReasoning: reasoningContent.length > 0,
              reasoningContent: reasoningContent,
              done: false,
            });
          } else {
            // popup 翻译直接使用 runtime.sendMessage
            let popupClosed = false;
            browser.runtime.sendMessage(
              {
                action: MESSAGE_TYPES.UPDATE_TRANSLATION,
                content: result,
                hasReasoning: reasoningContent.length > 0,
                reasoningContent: reasoningContent,
                done: false,
              },
              () => {
                if (browser.runtime.lastError) {
                  popupClosed = true;
                }
              }
            );

            // 如果 popup 已关闭，中止翻译
            if (popupClosed) {
              controller.abort();
              return;
            }
          }
        }
      }

      // 发送完成信号
      if (tabId) {
        await safeSendMessage(tabId, {
          action: MESSAGE_TYPES.UPDATE_TRANSLATION,
          content: result,
          hasReasoning: reasoningContent.length > 0,
          reasoningContent: reasoningContent,
          done: true,
        });
      } else {
        // popup 翻译的完成信号
        browser.runtime.sendMessage(
          {
            action: MESSAGE_TYPES.UPDATE_TRANSLATION,
            content: result,
            hasReasoning: reasoningContent.length > 0,
            reasoningContent: reasoningContent,
            done: true,
          },
          () => {
            if (browser.runtime.lastError) {
              console.log("popup 已关闭");
            }
          }
        );
      }

      // 在成功翻译完成后，保存翻译历史
      if (result) {
        try {
          await saveTranslationHistory(text, result, reasoningContent);
        } catch (error) {
          console.error("保存翻译历史失败:", error);
        }
      }

      // 清理已完成的请求
      activeRequests.delete(tabId);
      return result;
    } catch (error: any) {
      // 区分错误类型
      if (error.name === "AbortError") {
        console.log("翻译请求已中止");
        return;
      }
      if (error.message.includes("Receiving end does not exist")) {
        console.log("连接已断开，可能是页面已关闭");
        return;
      }
      // 只有真正需要用户知道的错误才抛出
      if (
        error.message.includes("API Key") ||
        error.message.includes("API 请求失败") ||
        error.message.includes("rate limit")
      ) {
        throw error;
      }
      // 其他错误只记录不抛出
      console.error("翻译过程中出现错误:", error);
    }
  }

  // 添加保存翻译历史的函数
  async function saveTranslationHistory(
    original: string,
    translated: string,
    reasoning?: string
  ) {
    try {
      // 获取现有历史
      const result = await browser.storage.local.get(["translationHistory"]);
      let history = result.translationHistory || [];

      // 创建新的历史记录项
      const newItem = {
        original,
        translated,
        reasoning: reasoning || "",
        hasReasoning: Boolean(reasoning),
        timestamp: Date.now(),
      };

      // 添加到历史记录开头
      history.unshift(newItem);

      // 限制历史记录数量（最多100条）
      if (history.length > 100) {
        history = history.slice(0, 100);
      }

      // 保存到存储
      await browser.storage.local.set({ translationHistory: history });
    } catch (error) {
      console.error("保存翻译历史失败:", error);
    }
  }

  // 添加获取翻译历史的函数
  async function getTranslationHistory() {
    try {
      const result = await browser.storage.local.get(["translationHistory"]);
      return result.translationHistory || [];
    } catch (error) {
      console.error("获取翻译历史失败:", error);
      return [];
    }
  }

  // 修改 safeSendMessage 函数
  async function safeSendMessage(tabId: number, message: any) {
    try {
      await browser.tabs.sendMessage(tabId, message);
    } catch (error) {
      console.log("发送消息失败（可能是popup已关闭）:", error);
    }
  }

  // 修改右键菜单点击处理
  browser.contextMenus.onClicked.addListener(async (info: any, tab: any) => {
    if (info.menuItemId === "translateSelection" && tab?.id) {
      try {
        const selectedText = info.selectionText;
        if (selectedText) {
          // 先显示弹框
          await safeSendMessage(tab.id, {
            action: MESSAGE_TYPES.SHOW_TRANSLATION_POPUP,
            text: selectedText,
          });
          // 然后开始翻译
          await translateText(selectedText, tab.id);
        }
      } catch (error: any) {
        console.error("翻译失败:", error);
        await safeSendMessage(tab.id, {
          action: MESSAGE_TYPES.UPDATE_TRANSLATION,
          error: error.message,
          done: true,
        });
      }
    }
  });

  // 修改消息监听器
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 处理options页面发来的快捷键更改消息
    if (request.action === "shortcutChanged") {
      createContextMenu();
      sendResponse({ success: true });
      return false;
    }

    if (request.action === MESSAGE_TYPES.GET_HISTORY) {
      getTranslationHistory()
        .then((history) => {
          sendResponse({ success: true, history });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }

    if (request.action === MESSAGE_TYPES.TRANSLATE) {
      const tabId = sender.tab?.id;
      translateText(request.text, tabId)
        .then((result) => {
          sendResponse({ success: true, result });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }

    if (request.action === MESSAGE_TYPES.SHOW_TRANSLATION_POPUP) {
      // 这个消息类型现在主要用于右键菜单
      sendResponse({ success: true });
      return false;
    }

    if (request.action === MESSAGE_TYPES.CLEANUP) {
      const tabId = sender.tab?.id;
      if (tabId) {
        cleanupRequest(tabId);
      }
      sendResponse({ success: true });
      return false;
    }

    if (request.action === MESSAGE_TYPES.DELETE_HISTORY_ITEM) {
      deleteHistoryItem(request.original)
        .then((success) => {
          sendResponse({ success });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }

    if (request.action === MESSAGE_TYPES.CLEAR_HISTORY) {
      clearHistory()
        .then((success) => {
          sendResponse({ success });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }

    if (request.action === MESSAGE_TYPES.IMPORT_HISTORY) {
      importHistory(request.history)
        .then((success) => {
          sendResponse({ success });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }

    if (request.action === "testApiConnection") {
      testApiConnection(request.apiKey, request.baseUrl, request.model)
        .then((success) => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }

    return false;
  });

  // 删除历史记录项
  async function deleteHistoryItem(original: string) {
    try {
      const result = await browser.storage.local.get(["translationHistory"]);
      let history = result.translationHistory || [];

      history = history.filter((item: any) => item.original !== original);

      await browser.storage.local.set({ translationHistory: history });
      return true;
    } catch (error) {
      console.error("删除历史记录项失败:", error);
      throw error;
    }
  }

  // 清空历史记录
  async function clearHistory() {
    try {
      await browser.storage.local.set({ translationHistory: [] });
      return true;
    } catch (error) {
      console.error("清空历史记录失败:", error);
      throw error;
    }
  }

  // 导入历史记录
  async function importHistory(newHistory: any[]) {
    try {
      if (!Array.isArray(newHistory)) {
        throw new Error("导入的数据格式不正确");
      }

      // 验证数据格式
      const validHistory = newHistory.filter(
        (item) =>
          item &&
          typeof item.original === "string" &&
          typeof item.translated === "string"
      );

      if (validHistory.length === 0) {
        throw new Error("没有有效的历史记录数据");
      }

      // 获取现有历史
      const result = await browser.storage.local.get(["translationHistory"]);
      let existingHistory = result.translationHistory || [];

      // 合并历史记录（新导入的在前面）
      const mergedHistory = [...validHistory, ...existingHistory];

      // 限制总数量
      const finalHistory = mergedHistory.slice(0, 100);

      await browser.storage.local.set({ translationHistory: finalHistory });
      return true;
    } catch (error) {
      console.error("导入历史记录失败:", error);
      throw error;
    }
  }

  // API连接测试函数
  async function testApiConnection(
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

  // 修改清理函数
  async function cleanupRequest(tabId: number) {
    if (activeRequests.has(tabId)) {
      const controller = activeRequests.get(tabId);
      controller.abort();
      activeRequests.delete(tabId);
    }
  }

  // 监听标签页关闭事件
  browser.tabs.onRemoved.addListener((tabId: number) => {
    cleanupRequest(tabId);
  });

  // 监听快捷键命令
  if (browser.commands?.onCommand) {
    browser.commands.onCommand.addListener((command: string) => {
      if (command === "translate-selection") {
        executeTranslation();
      }
    });
  }

  // 快捷键翻译功能执行函数
  async function executeTranslation() {
    try {
      console.log("快捷键翻译被触发");
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tab = tabs[0];

      if (tab?.id) {
        console.log("向content script发送获取选中文本的消息");
        // 向content script发送获取选中文本的消息
        await browser.tabs.sendMessage(tab.id, { action: "getSelectedText" });
      }
    } catch (error) {
      console.error("执行快捷键翻译失败:", error);
    }
  }
});
