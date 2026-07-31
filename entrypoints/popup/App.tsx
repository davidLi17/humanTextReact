import {
  DEFAULT_SETTINGS,
  MESSAGE_TYPES,
  THEME_MODES,
  ThemeMode,
} from "@/entrypoints/shared/constants";
import { createLogger, initializeLogger } from "@/entrypoints/shared/logger";
import {
  createRequestId,
  shouldAcceptRequestUpdate,
} from "@/entrypoints/shared/requestProtocol";
import { SettingsUtils } from "@/entrypoints/shared/settingsUtils";
import {
  applyTheme,
  normalizeThemeMode,
  watchSystemTheme,
} from "@/entrypoints/shared/theme";
import { useEffect, useRef, useState } from "react";
import "./App.less";
import HistoryPanel from "./components/HistoryPanel";
import TranslationArea from "./components/TranslationArea";
import { HistoryItem, MessageRequest, TranslationState } from "./types";

const logger = createLogger("popup-app", "🔽");

const DRAFT_STORAGE_KEY = "popupDraft";

interface PopupDraft {
  sourceText: string;
  images: TranslationState["images"];
  updatedAt: number;
}

interface AppProps {
  initialThemeMode?: ThemeMode;
}

function App({ initialThemeMode = THEME_MODES.SYSTEM }: AppProps) {
  const activeRequestIdRef = useRef<string | undefined>(undefined);
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    normalizeThemeMode(initialThemeMode)
  );
  const [translationState, setTranslationState] = useState<TranslationState>({
    activeRequestId: undefined,
    sourceText: "",
    translatedText: "",
    reasoningText: "",
    isTranslating: false,
    errorMessage: "",
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
    void initializeLogger("popup");
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    applyTheme(root, themeMode);

    return watchSystemTheme(themeMode, (resolvedTheme) => {
      applyTheme(root, themeMode, resolvedTheme === THEME_MODES.DARK);
    });
  }, [themeMode]);

  // 恢复未提交草稿，避免 popup 关闭后丢失输入
  useEffect(() => {
    const loadDraft = async () => {
      try {
        if (!browser?.storage?.local) return;

        const stored = await browser.storage.local.get(DRAFT_STORAGE_KEY);
        const draft = stored?.[DRAFT_STORAGE_KEY] as PopupDraft | undefined;

        if (!draft || (!draft.sourceText?.trim() && !draft.images?.length)) {
          return;
        }

        setTranslationState((prev) => {
          if (prev.sourceText || prev.images.length > 0) return prev;

          return {
            ...prev,
            sourceText: draft.sourceText || "",
            images: draft.images || [],
          };
        });
      } catch (error) {
        logger.error("恢复草稿失败:", error);
      }
    };

    loadDraft();
  }, []);

  // 自动保存当前输入和图片草稿
  useEffect(() => {
    if (!browser?.storage?.local) return;

    const timeoutId = window.setTimeout(() => {
      const draft: PopupDraft = {
        sourceText: translationState.sourceText,
        images: translationState.images,
        updatedAt: Date.now(),
      };

      const hasDraft = draft.sourceText.trim().length > 0 || draft.images.length > 0;
      const action = hasDraft
        ? browser.storage.local.set({ [DRAFT_STORAGE_KEY]: draft })
        : browser.storage.local.remove(DRAFT_STORAGE_KEY);

      action.catch((error: unknown) => logger.error("保存草稿失败:", error));
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [translationState.sourceText, translationState.images]);

  // 监听来自background script的消息
  useEffect(() => {
    const messageListener = (
      request: MessageRequest,
      sender: any,
      sendResponse: (response?: any) => void
    ) => {
      if (request.action === MESSAGE_TYPES.APPEND_DIAGNOSTIC_LOGS) {
        return false;
      }

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

        if (
          !shouldAcceptRequestUpdate(
            request.requestId,
            activeRequestIdRef.current,
            true
          )
        ) {
          logger.log("忽略非当前请求的popup更新", {
            incomingRequestId: request.requestId,
            activeRequestId: activeRequestIdRef.current,
          });
          sendResponse({ success: true, ignored: true });
          return false;
        }

        if (request.error) {
          logger.log("❌ [Popup App] 翻译错误:", request.error);
          activeRequestIdRef.current = undefined;
          setTranslationState((prev: TranslationState) => ({
            ...prev,
            activeRequestId: undefined,
            isTranslating: false,
            showResult: true,
            errorMessage: request.error,
            translatedText: prev.translatedText,
          }));
        } else {
          logger.log("✅ [Popup App] 更新翻译状态", {
            hasNewContent: !!request.content,
            hasNewReasoning: !!request.reasoningContent,
            hasReasoning: request.hasReasoning,
            isComplete: request.done,
          });
          if (request.done) {
            activeRequestIdRef.current = undefined;
          }
          setTranslationState((prev: TranslationState) => ({
            ...prev,
            activeRequestId: request.done
              ? undefined
              : prev.activeRequestId,
            translatedText: request.content || prev.translatedText,
            reasoningText: request.reasoningContent || prev.reasoningText,
            hasReasoning: request.hasReasoning || false,
            showResult: true,
            isTranslating: !request.done,
            errorMessage: "",
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
        setThemeMode(normalizeThemeMode(settings.theme));
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
        setThemeMode(normalizeThemeMode(newSettings.theme));
      }
    );

    // 清理监听器
    return () => {
      unsubscribeSettings();
    };
  }, []);

  // 处理滚动事件（空函数，现在滚动在TranslationArea内部处理）
  const handleScroll = () => {};

  const isApiKeyConfigured = (apiKey?: string) =>
    Boolean(apiKey && apiKey.trim() && apiKey !== DEFAULT_SETTINGS.apiKey);

  const getErrorMessage = (error: any) =>
    error?.message || "翻译失败，请稍后重试";

  const cleanupActiveRequest = async (
    requestId = activeRequestIdRef.current
  ) => {
    if (!requestId || !browser?.runtime) return;

    await browser.runtime.sendMessage({
      action: "cleanup",
      requestId,
    });
  };

  // 发送翻译请求
  const handleTranslate = async (textOverride?: string) => {
    const text = (textOverride ?? translationState.sourceText).trim();
    logger.log("Popup 准备翻译", { textLength: text.length });
    if (!text) {
      alert("请输入要翻译的文本");
      return;
    }

    // 防止在翻译进行中重复触发
    if (translationState.isTranslating) {
      return;
    }

    const requestId = createRequestId();
    activeRequestIdRef.current = requestId;
    setTranslationState((prev: TranslationState) => ({
      ...prev,
      activeRequestId: requestId,
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

      if (!isApiKeyConfigured(userSettings.apiKey)) {
        activeRequestIdRef.current = undefined;
        setTranslationState((prev: TranslationState) => ({
          ...prev,
          activeRequestId: undefined,
          isTranslating: false,
          showResult: true,
          errorMessage: "请先在设置中配置 API Key",
          translatedText: "",
        }));
        return;
      }

      if (browser?.runtime) {
        // 开始新的翻译，传递完整设置
        const response = await browser.runtime.sendMessage({
          action: "translate",
          requestId,
          text,
          images: textOverride ? [] : translationState.images,
          thinkingEnabled: userSettings.thinkingEnabled,
          temperature: userSettings.temperature,
          promptTemplate: userSettings.promptTemplate,
          apiKey: userSettings.apiKey,
          source: "popup",
        });

        if (response && response.success === false) {
          throw new Error(response.error || "翻译失败，请稍后重试");
        }
      }
    } catch (error: any) {
      if (!error.message?.includes("Receiving end does not exist")) {
        if (activeRequestIdRef.current === requestId) {
          activeRequestIdRef.current = undefined;
        }
        setTranslationState((prev: TranslationState) => {
          if (prev.activeRequestId !== requestId) return prev;

          return {
            ...prev,
            activeRequestId: undefined,
            isTranslating: false,
            showResult: true,
            errorMessage: getErrorMessage(error),
          };
        });
      }
    }
  };

  const retryTranslate = () => {
    if (!translationState.isTranslating) {
      handleTranslate();
    }
  };

  const cancelTranslate = async () => {
    const requestId = activeRequestIdRef.current;
    try {
      await cleanupActiveRequest(requestId);
    } catch (error) {
      logger.error("取消翻译失败:", error);
    } finally {
      if (activeRequestIdRef.current === requestId) {
        activeRequestIdRef.current = undefined;
      }
      setTranslationState((prev: TranslationState) => ({
        ...prev,
        activeRequestId:
          prev.activeRequestId === requestId
            ? undefined
            : prev.activeRequestId,
        isTranslating: false,
        errorMessage: prev.translatedText ? "已停止继续生成" : "已取消翻译",
        showResult: true,
      }));
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

  // 清空当前草稿和结果
  const clearDraft = async () => {
    const activeRequestId = activeRequestIdRef.current;
    activeRequestIdRef.current = undefined;
    await cleanupActiveRequest(activeRequestId).catch((error) =>
      logger.error("清理当前翻译失败:", error)
    );

    setTranslationState((prev) => ({
      ...prev,
      activeRequestId: undefined,
      sourceText: "",
      translatedText: "",
      reasoningText: "",
      hasReasoning: false,
      isTranslating: false,
      showResult: false,
      errorMessage: "",
      images: [],
    }));

    try {
      if (browser?.storage?.local) {
        await browser.storage.local.remove(DRAFT_STORAGE_KEY);
      }
    } catch (error) {
      logger.error("清空草稿失败:", error);
    }
  };

  // 恢复历史记录项
  const restoreHistoryItem = (item: HistoryItem) => {
    const activeRequestId = activeRequestIdRef.current;
    activeRequestIdRef.current = undefined;
    cleanupActiveRequest(activeRequestId).catch((error) =>
      logger.error("恢复历史前清理翻译失败:", error)
    );

    setTranslationState((prev) => ({
      ...prev,
      activeRequestId: undefined,
      sourceText: item.original,
      translatedText: item.translated,
      reasoningText: item.reasoning || "",
      hasReasoning: item.hasReasoning || false,
      isTranslating: false,
      showResult: true,
      errorMessage: "",
      images: [],
    }));
    hideHistoryPanel();
  };

  const copyHistoryOriginal = (item: HistoryItem) => {
    return copyToClipboard(item.original);
  };

  const copyHistoryTranslation = (item: HistoryItem) => {
    return copyToClipboard(item.translated);
  };

  const retranslateHistoryItem = (item: HistoryItem) => {
    const activeRequestId = activeRequestIdRef.current;
    activeRequestIdRef.current = undefined;
    cleanupActiveRequest(activeRequestId).catch((error) =>
      logger.error("历史重译前清理翻译失败:", error)
    );

    setTranslationState((prev) => ({
      ...prev,
      activeRequestId: undefined,
      sourceText: item.original,
      translatedText: "",
      reasoningText: "",
      hasReasoning: false,
      isTranslating: false,
      showResult: true,
      errorMessage: "",
      images: [],
    }));
    hideHistoryPanel();
    window.setTimeout(() => handleTranslate(item.original), 0);
  };

  // 删除历史记录项
  const deleteHistoryItem = (original: string) => {
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

  const handleThemeChange = async (nextMode: ThemeMode) => {
    const normalizedMode = normalizeThemeMode(nextMode);
    const previousMode = themeMode;
    setThemeMode(normalizedMode);

    try {
      await SettingsUtils.setSetting("theme", normalizedMode);
    } catch (error) {
      setThemeMode(previousMode);
      logger.error("保存主题设置失败:", error);
    }
  };

  // 窗口卸载时清理
  useEffect(() => {
    const handleUnload = () => {
      const requestId = activeRequestIdRef.current;
      if (requestId) {
        cleanupActiveRequest(requestId);
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      const requestId = activeRequestIdRef.current;
      if (requestId) {
        cleanupActiveRequest(requestId);
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
          themeMode={themeMode}
          onThemeChange={handleThemeChange}
          onClearDraft={clearDraft}
          onRetry={retryTranslate}
          onCancel={cancelTranslate}
          onScroll={() => {}}
          history={history}
        />
      ) : (
        <HistoryPanel
          history={history}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onBack={hideHistoryPanel}
          themeMode={themeMode}
          onThemeChange={handleThemeChange}
          onRestore={restoreHistoryItem}
          onCopyOriginal={copyHistoryOriginal}
          onCopyTranslation={copyHistoryTranslation}
          onRetranslate={retranslateHistoryItem}
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



