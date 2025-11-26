/**
 * Popup 主应用组件
 *
 * 重构亮点：
 * - 使用 Zustand 进行状态管理
 * - 状态与 UI 分离，组件更简洁
 * - 使用 ahooks 的 useMemoizedFn 保持函数引用稳定
 */
import React, { useEffect, useRef, useCallback, useState } from "react";
import { useMemoizedFn } from "ahooks";
import "./App.less";
import TranslationArea from "./components/TranslationArea";
import HistoryPanel from "./components/HistoryPanel";
import { useTranslationStore } from "../shared/store/translationStore";
import { useHistoryStore, HistoryItem } from "../shared/store/historyStore";
import { MessageRequest } from "./types";

function App() {
  // 使用 Zustand store
  const {
    sourceText,
    translatedText,
    reasoningText,
    isTranslating,
    hasReasoning,
    showResult,
    setSourceText,
    startTranslation,
    updateFromMessage,
  } = useTranslationStore();

  const { history, searchTerm, setHistory, setSearchTerm } = useHistoryStore();

  // UI 状态
  const [showHistory, setShowHistory] = useState(false);
  const userHasScrolled = useRef(false);
  const resultAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 监听来自 background script 的消息
  useEffect(() => {
    const messageListener = (
      request: MessageRequest,
      _sender: any,
      sendResponse: (response?: any) => void
    ) => {
      if (request.action === "updateTranslation") {
        updateFromMessage({
          content: request.content,
          reasoningContent: request.reasoningContent,
          hasReasoning: request.hasReasoning,
          done: request.done,
          error: request.error,
        });

        if (!userHasScrolled.current && containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }

        sendResponse({ success: true });
      }
      return false;
    };

    if (browser.runtime.onMessage) {
      browser.runtime.onMessage.addListener(messageListener);
      return () => {
        browser.runtime.onMessage.removeListener(messageListener);
      };
    }
  }, [updateFromMessage]);

  // 处理滚动事件
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = containerRef.current;
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 1;
      userHasScrolled.current = !isAtBottom;
    }
  }, []);

  // 发送翻译请求
  const handleTranslate = useMemoizedFn(async () => {
    const text = sourceText.trim();
    if (!text) {
      alert("请输入要翻译的文本");
      return;
    }

    startTranslation();
    userHasScrolled.current = false;

    try {
      if (browser?.runtime) {
        await browser.runtime.sendMessage({ action: "cleanup" });
        await browser.runtime.sendMessage({
          action: "translate",
          text,
          source: "popup",
        });
      }
    } catch (error: any) {
      if (!error.message?.includes("Receiving end does not exist")) {
        updateFromMessage({ error: error.message });
      }
    }
  });

  // 复制文本到剪贴板
  const copyToClipboard = useMemoizedFn(
    async (text: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        console.error("复制失败:", error);
        return false;
      }
    }
  );

  // 加载历史记录
  const loadHistory = useMemoizedFn(() => {
    if (browser?.runtime) {
      browser.runtime.sendMessage({ action: "getHistory" }, (response: any) => {
        if (response?.success) {
          setHistory(response.history || []);
        }
      });
    }
  });

  // 显示历史记录面板
  const showHistoryPanel = useMemoizedFn(() => {
    setShowHistory(true);
    setSearchTerm("");
    loadHistory();
  });

  // 隐藏历史记录面板
  const hideHistoryPanel = useMemoizedFn(() => {
    setShowHistory(false);
  });

  // 恢复历史记录项
  const restoreHistoryItem = useMemoizedFn((item: HistoryItem) => {
    setSourceText(item.original);
    updateFromMessage({
      content: item.translated,
      reasoningContent: item.reasoning,
      hasReasoning: item.hasReasoning,
      done: true,
    });
    hideHistoryPanel();
  });

  // 删除历史记录项
  const deleteHistoryItem = useMemoizedFn((original: string) => {
    if (confirm("确定要删除这条历史记录吗？")) {
      if (browser?.runtime) {
        browser.runtime.sendMessage(
          { action: "deleteHistoryItem", original },
          (response: any) => {
            if (response?.success) {
              loadHistory();
            } else {
              alert("删除失败：" + (response?.error || "未知错误"));
            }
          }
        );
      }
    }
  });

  // 清空历史记录
  const clearHistory = useMemoizedFn(() => {
    if (confirm("确定要清空所有历史记录吗？此操作不可撤销。")) {
      if (browser?.runtime) {
        browser.runtime.sendMessage(
          { action: "clearHistory" },
          (response: any) => {
            if (response?.success) {
              setHistory([]);
            } else {
              alert("清空历史记录失败：" + (response?.error || "未知错误"));
            }
          }
        );
      }
    }
  });

  // 导出历史记录
  const exportHistory = useMemoizedFn(() => {
    if (browser?.runtime) {
      browser.runtime.sendMessage({ action: "getHistory" }, (response: any) => {
        if (response?.success && response.history.length > 0) {
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
  });

  // 导入历史记录
  const importHistory = useMemoizedFn((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedHistory = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedHistory)) {
          if (browser?.runtime) {
            browser.runtime.sendMessage(
              { action: "importHistory", history: importedHistory },
              (response: any) => {
                if (response?.success) {
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
        console.error(error);
      }
    };
    reader.readAsText(file);
  });

  // 打开设置页面
  const openSettings = useMemoizedFn(() => {
    if (browser?.runtime) {
      browser.runtime.openOptionsPage();
    }
  });

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

  // 构造兼容现有组件接口的对象
  const translationState = {
    sourceText,
    translatedText,
    reasoningText,
    isTranslating,
    hasReasoning,
    showResult,
  };

  const setTranslationState = useMemoizedFn(
    (updater: React.SetStateAction<typeof translationState>) => {
      const newState =
        typeof updater === "function" ? updater(translationState) : updater;

      if (newState.sourceText !== sourceText) {
        setSourceText(newState.sourceText);
      }
    }
  );

  return (
    <div className="container" ref={containerRef} onScroll={handleScroll}>
      {!showHistory ? (
        <TranslationArea
          translationState={translationState}
          setTranslationState={setTranslationState}
          onTranslate={handleTranslate}
          onCopy={copyToClipboard}
          onShowHistory={showHistoryPanel}
          onOpenSettings={openSettings}
          onScroll={() => {}}
          resultAreaRef={resultAreaRef}
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
