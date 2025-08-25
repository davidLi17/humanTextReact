import { useState, useEffect, useRef } from "react";
import "./App.less";
import TranslationArea from "./components/TranslationArea";
import HistoryPanel from "./components/HistoryPanel";
import { TranslationState, HistoryItem, MessageRequest } from "./types";

function App() {
  const [translationState, setTranslationState] = useState<TranslationState>({
    sourceText: "",
    translatedText: "",
    reasoningText: "",
    isTranslating: false,
    hasReasoning: false,
    showResult: false,
  });

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const userHasScrolled = useRef(false);
  const resultAreaRef = useRef<HTMLDivElement>(null);

  // 监听来自background script的消息
  useEffect(() => {
    const messageListener = (
      request: MessageRequest,
      sender: any,
      sendResponse: (response?: any) => void
    ) => {
      if (request.action === "updateTranslation") {
        if (request.error) {
          setTranslationState((prev: TranslationState) => ({
            ...prev,
            isTranslating: false,
            translatedText: `错误: ${request.error}`,
          }));
        } else {
          setTranslationState((prev: TranslationState) => ({
            ...prev,
            translatedText: request.content || prev.translatedText,
            reasoningText: request.reasoningContent || prev.reasoningText,
            hasReasoning: request.hasReasoning || false,
            showResult: true,
            isTranslating: !request.done,
          }));

          // 自动滚动到底部（如果用户没有手动滚动）
          if (!userHasScrolled.current && resultAreaRef.current) {
            resultAreaRef.current.scrollTop =
              resultAreaRef.current.scrollHeight;
          }
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
  }, []);

  // 处理滚动事件
  const handleScroll = () => {
    if (resultAreaRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = resultAreaRef.current;
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 1;
      userHasScrolled.current = !isAtBottom;
    }
  };

  // 发送翻译请求
  const handleTranslate = async () => {
    const text = translationState.sourceText.trim();
    console.log("LHG:popup/App.tsx text:::", text);
    if (!text) {
      alert("请输入要翻译的文本");
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

    userHasScrolled.current = false;

    try {
      // 先发送清理请求
      if (browser?.runtime) {
        await browser.runtime.sendMessage({ action: "cleanup" });

        // 开始新的翻译
        await browser.runtime.sendMessage({
          action: "translate",
          text,
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
      console.error("复制失败:", error);
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
    setTranslationState({
      sourceText: item.original,
      translatedText: item.translated,
      reasoningText: item.reasoning || "",
      hasReasoning: item.hasReasoning || false,
      isTranslating: false,
      showResult: true,
    });
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
        console.error(error);
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
    <div className="container">
      {!showHistory ? (
        <TranslationArea
          translationState={translationState}
          setTranslationState={setTranslationState}
          onTranslate={handleTranslate}
          onCopy={copyToClipboard}
          onShowHistory={showHistoryPanel}
          onOpenSettings={openSettings}
          onScroll={handleScroll}
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
