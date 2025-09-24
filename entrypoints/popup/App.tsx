import { createLogger, initializeLogger } from "@/entrypoints/shared/logger";
import { SettingsUtils } from "@/entrypoints/shared/settingsUtils";
import { useEffect, useState } from "react";
import "./App.less";
import HistoryPanel from "./components/HistoryPanel";
import TranslationArea from "./components/TranslationArea";
import { HistoryItem, MessageRequest, TranslationState } from "./types";

const logger = createLogger("popup-app", "🔽");

function App() {
  const [translationState, setTranslationState] = useState<TranslationState>({
    sourceText: "",
    translatedText: "",
    reasoningText: "",
    isTranslating: false,
    hasReasoning: false,
    showResult: false,
    thinkingEnabled: false,
    images: [], // 初始化图片数组
  });

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // 初始化日志系统（确保 popup 遵循最新日志级别）
  useEffect(() => {
    initializeLogger();
  }, []);

  // 监听来自background script的消息
  useEffect(() => {
    const messageListener = (
      request: MessageRequest,
      sender: any,
      sendResponse: (response?: any) => void
    ) => {
      logger.log("📨 [Popup App] 收到消息", {
        action: request.action,
        hasContent: !!request.content,
        contentLength: request.content?.length || 0,
        hasReasoning: !!request.reasoningContent,
        reasoningLength: request.reasoningContent?.length || 0,
        done: request.done,
        error: request.error,
        timestamp: new Date().toISOString(),
      });

      if (request.action === "updatePopupTranslation") {
        logger.log("🔄 [Popup App] 处理popup翻译更新");

        if (request.error) {
          logger.log("❌ [Popup App] 翻译错误:", request.error);
          setTranslationState((prev: TranslationState) => ({
            ...prev,
            isTranslating: false,
            translatedText: `错误: ${request.error}`,
          }));
        } else {
          logger.log("✅ [Popup App] 更新翻译状态", {
            hasNewContent: !!request.content,
            hasNewReasoning: !!request.reasoningContent,
            hasReasoning: request.hasReasoning,
            isComplete: request.done,
          });
          setTranslationState((prev: TranslationState) => ({
            ...prev,
            translatedText: request.content || prev.translatedText,
            reasoningText: request.reasoningContent || prev.reasoningText,
            hasReasoning: request.hasReasoning || false,
            showResult: true,
            isTranslating: !request.done,
          }));
        }

        sendResponse({ success: true });
      } else {
        logger.log("❓ [Popup App] 未处理的消息类型:", request.action);
      }
      return false;
    };

    if (browser.runtime.onMessage) {
      browser.runtime.onMessage.addListener(messageListener);

      return () => {
        browser.runtime.onMessage.removeListener(messageListener);
      };
    }
  }, []);

  // 组件初始化时加载设置和历史记录
  useEffect(() => {
    // 加载用户设置
    const loadSettings = async () => {
      try {
        // 每次进入 popup 时确保拿到最新设置
        SettingsUtils.clearCache();
        const settings = await SettingsUtils.getSettings();
        logger.log("⚙️ [Popup App] 初始化设置", {
          thinkingEnabled: settings.thinkingEnabled,
          hasApiKey: !!settings.apiKey,
        });

        setTranslationState((prev: TranslationState) => ({
          ...prev,
          thinkingEnabled: settings.thinkingEnabled,
        }));

        // 应用主题
        try {
          const root = document.documentElement;
          const media =
            window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)");
          const current =
            (settings as any).theme === "system"
              ? media?.matches
                ? "dark"
                : "light"
              : (settings as any).theme;
          root.setAttribute("data-theme", current);
        } catch {}
      } catch (error) {
        logger.error("❌ [Popup App] 加载设置失败:", error);
      }
    };

    loadSettings();
    loadHistory();

    // 监听设置变化
    const unsubscribeSettings = SettingsUtils.onSettingsChanged(
      (newSettings) => {
        logger.log("🔄 [Popup App] 设置已更新", {
          thinkingEnabled: newSettings.thinkingEnabled,
          previousState: translationState.thinkingEnabled,
        });

        setTranslationState((prev: TranslationState) => ({
          ...prev,
          thinkingEnabled: newSettings.thinkingEnabled,
        }));
      }
    );

    // 清理监听器
    return () => {
      unsubscribeSettings();
    };
  }, []);

  // 处理滚动事件（空函数，现在滚动在TranslationArea内部处理）
  const handleScroll = () => {};

  // 发送翻译请求
  const handleTranslate = async () => {
    const text = translationState.sourceText.trim();
    logger.log("LHG:popup/App.tsx text:::", text);
    if (!text) {
      alert("请输入要翻译的文本");
      return;
    }

    // 防止在翻译进行中重复触发
    if (translationState.isTranslating) {
      return;
    }

    setTranslationState((prev: TranslationState) => ({
      ...prev,
      isTranslating: true,
      showResult: true,
      translatedText: "",
      reasoningText: "",
      hasReasoning: false,
    }));

    try {
      // 获取完整设置，确保传递所有必要参数
      SettingsUtils.clearCache();
      const userSettings = await SettingsUtils.getSettings();
      logger.log("⚙️ [Popup App] 翻译时使用设置", {
        thinkingEnabled: userSettings.thinkingEnabled,
        temperature: userSettings.temperature,
        hasApiKey: !!userSettings.apiKey,
      });

      // 先发送清理请求
      if (browser?.runtime) {
        await browser.runtime.sendMessage({ action: "cleanup" });

        // 开始新的翻译，传递完整设置
        await browser.runtime.sendMessage({
          action: "translate",
          text,
          images: translationState.images,
          thinkingEnabled: userSettings.thinkingEnabled,
          temperature: userSettings.temperature,
          promptTemplate: userSettings.promptTemplate,
          apiKey: userSettings.apiKey,
          source: "popup",
        });
      }
    } catch (error: any) {
      if (!error.message?.includes("Receiving end does not exist")) {
        setTranslationState((prev: TranslationState) => ({
          ...prev,
          isTranslating: false,
          translatedText: `发生错误：${error.message}`,
        }));
      }
    }
  };

  // 复制文本到剪贴板
  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      logger.error("复制失败:", error);
      return false;
    }
  };

  // 加载历史记录
  const loadHistory = () => {
    if (browser?.runtime) {
      browser.runtime.sendMessage({ action: "getHistory" }, (response: any) => {
        if (response && response.success) {
          setHistory(response.history || []);
        }
      });
    }
  };

  // 显示历史记录面板
  const showHistoryPanel = () => {
    setShowHistory(true);
    setSearchTerm("");
    loadHistory();
  };

  // 隐藏历史记录面板
  const hideHistoryPanel = () => {
    setShowHistory(false);
  };

  // 恢复历史记录项
  const restoreHistoryItem = (item: HistoryItem) => {
    setTranslationState((prev) => ({
      ...prev,
      sourceText: item.original,
      translatedText: item.translated,
      reasoningText: item.reasoning || "",
      hasReasoning: item.hasReasoning || false,
      isTranslating: false,
      showResult: true,
    }));
    hideHistoryPanel();
  };

  // 删除历史记录项
  const deleteHistoryItem = (original: string) => {
    if (confirm("确定要删除这条历史记录吗？")) {
      if (browser?.runtime) {
        browser.runtime.sendMessage(
          {
            action: "deleteHistoryItem",
            original,
          },
          (response: any) => {
            if (response && response.success) {
              loadHistory(); // 重新加载历史记录
            } else {
              alert("删除失败：" + (response?.error || "未知错误"));
            }
          }
        );
      }
    }
  };

  // 清空历史记录
  const clearHistory = () => {
    if (confirm("确定要清空所有历史记录吗？此操作不可撤销。")) {
      if (browser?.runtime) {
        browser.runtime.sendMessage(
          { action: "clearHistory" },
          (response: any) => {
            if (response && response.success) {
              setHistory([]);
            } else {
              alert("清空历史记录失败：" + (response?.error || "未知错误"));
            }
          }
        );
      }
    }
  };

  // 导出历史记录
  const exportHistory = () => {
    if (browser?.runtime) {
      browser.runtime.sendMessage({ action: "getHistory" }, (response: any) => {
        if (response && response.success && response.history.length > 0) {
          const historyData = JSON.stringify(response.history, null, 2);
          const blob = new Blob([historyData], { type: "application/json" });
          const url = URL.createObjectURL(blob);

          const a = document.createElement("a");
          a.href = url;
          a.download = `translation_history_${new Date()
            .toISOString()
            .slice(0, 10)}.json`;
          a.click();

          setTimeout(() => URL.revokeObjectURL(url), 100);
        } else {
          alert("暂无历史记录可导出");
        }
      });
    }
  };

  // 导入历史记录
  const importHistory = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const history = JSON.parse(e.target?.result as string);
        if (Array.isArray(history)) {
          if (browser?.runtime) {
            browser.runtime.sendMessage(
              {
                action: "importHistory",
                history,
              },
              (response: any) => {
                if (response && response.success) {
                  alert("历史记录导入成功");
                  loadHistory();
                } else {
                  alert("导入失败：" + (response?.error || "未知错误"));
                }
              }
            );
          }
        } else {
          alert("导入的文件格式不正确");
        }
      } catch (error) {
        alert("导入失败：文件解析错误");
        logger.error(error);
      }
    };
    reader.readAsText(file);
  };

  // 打开设置页面
  const openSettings = () => {
    if (browser?.runtime) {
      browser.runtime.openOptionsPage();
    }
  };

  // 窗口卸载时清理
  useEffect(() => {
    const handleUnload = () => {
      if (browser?.runtime) {
        browser.runtime.sendMessage({ action: "cleanup" });
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      if (browser?.runtime) {
        browser.runtime.sendMessage({ action: "cleanup" });
      }
    };
  }, []);

  return (
    <div className="container" onScroll={handleScroll}>
      {!showHistory ? (
        <TranslationArea
          translationState={translationState}
          setTranslationState={setTranslationState}
          onTranslate={handleTranslate}
          onCopy={copyToClipboard}
          onShowHistory={showHistoryPanel}
          onOpenSettings={openSettings}
          onScroll={() => {}}
          history={history}
        />
      ) : (
        <HistoryPanel
          history={history}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onBack={hideHistoryPanel}
          onRestore={restoreHistoryItem}
          onDelete={deleteHistoryItem}
          onClear={clearHistory}
          onExport={exportHistory}
          onImport={importHistory}
        />
      )}
    </div>
  );
}

export default App;
