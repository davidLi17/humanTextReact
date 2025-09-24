import { TranslationAreaProps } from "@/entrypoints/popup/types";
import { ImageUtils } from "@/entrypoints/popup/utils/imageUtils";
import { createLogger } from "@/entrypoints/shared/logger";
import { SettingsUtils } from "@/entrypoints/shared/settingsUtils";
import { injectMarkdownStyles } from "@/shared/styles/markdown";
import { initializeCodeCopy, parseMarkdown } from "@/shared/utils/markdown";
import throttle from "lodash-es/throttle";
import React, { useCallback, useEffect, useRef } from "react";
import CollapsibleThinkingChain from "./CollapsibleThinkingChain";
import CopyFooter from "./CopyFooter";
import SmartInput from "./SmartInput";

const logger = createLogger("popup-translation-area", "📝");

const TranslationArea: React.FC<TranslationAreaProps> = ({
  translationState,
  setTranslationState,
  onTranslate,
  onCopy,
  onShowHistory,
  onOpenSettings,
  history, // 添加 history 属性
}) => {
  const userHasScrolledRef = useRef(false);
  const resultSectionWrapperRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 注入 Markdown 样式和初始化复制功能
  useEffect(() => {
    injectMarkdownStyles("popup-markdown-styles");
    initializeCodeCopy();
  }, []);

  // 处理结果区域的滚动事件
  const handleResultScroll = useCallback(() => {
    if (resultSectionWrapperRef.current) {
      const { scrollHeight, scrollTop, clientHeight } =
        resultSectionWrapperRef.current;
      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
      userHasScrolledRef.current = !isAtBottom;

      // 如果用户滚动离开底部，设置一个延迟重置定时器
      if (!isAtBottom) {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
          if (resultSectionWrapperRef.current) {
            const { scrollHeight, scrollTop, clientHeight } =
              resultSectionWrapperRef.current;
            const stillAtBottom =
              Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
            if (stillAtBottom) {
              userHasScrolledRef.current = false;
            }
          }
        }, 1000); // 1秒后如果还在底部就重置状态
      }
    }
  }, []);

  // 节流的滚动处理函数
  const throttledScrollHandler = useCallback(
    throttle(handleResultScroll, 16), // 16ms ≈ 60fps
    [handleResultScroll]
  );

  // 自动滚动到底部（当有新内容且用户没有手动滚动时）
  useEffect(() => {
    if (
      !userHasScrolledRef.current &&
      resultSectionWrapperRef.current &&
      (translationState.translatedText || translationState.reasoningText)
    ) {
      // 使用 requestAnimationFrame 优化滚动性能
      requestAnimationFrame(() => {
        if (resultSectionWrapperRef.current) {
          resultSectionWrapperRef.current.scrollTop =
            resultSectionWrapperRef.current.scrollHeight;
        }
      });
    }
  }, [translationState.translatedText, translationState.reasoningText]);

  // 翻译开始时重置滚动状态
  useEffect(() => {
    if (translationState.isTranslating) {
      userHasScrolledRef.current = false;
      // 清除可能存在的滚动重置定时器
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    }
  }, [translationState.isTranslating]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      // Ctrl+Enter (Windows) 或 Cmd+Enter (Mac) 发送
      e.preventDefault();
      // 防止在翻译进行中重复触发
      if (!translationState.isTranslating) {
        onTranslate();
      }
    }
    // Enter 键保持换行功能
  };

  // 复制翻译结果
  const handleCopyTranslation = async (): Promise<boolean> => {
    const success = await onCopy(translationState.translatedText);
    return success;
  };

  // 复制输入文本
  const handleCopyInput = async (): Promise<boolean> => {
    if (!translationState.sourceText.trim()) {
      alert("请输入要复制的文本");
      return false;
    }
    const success = await onCopy(translationState.sourceText);
    return success;
  };

  // 处理思考模式切换（写入到 SettingsUtils -> storage，保证后台能读取到最新设置）
  const handleThinkingToggle = async () => {
    const next = !translationState.thinkingEnabled;
    setTranslationState((prev) => ({ ...prev, thinkingEnabled: next }));
    try {
      await SettingsUtils.setSetting("thinkingEnabled", next);
    } catch (e) {
      logger.error("更新思考模式失败:", e);
    }
  };

  // 初始化思考模式设置（从 SettingsUtils 获取）
  useEffect(() => {
    SettingsUtils.getSettings()
      .then((s) => {
        setTranslationState((prev) => ({
          ...prev,
          thinkingEnabled: s.thinkingEnabled,
        }));
      })
      .catch((e) => logger.error("读取思考模式失败:", e));
  }, [setTranslationState]);

  // 处理剪贴板粘贴
  const handlePaste = async (e: ClipboardEvent) => {
    try {
      const imageContent = await ImageUtils.getImageFromClipboard();
      if (imageContent) {
        setTranslationState((prev) => ({
          ...prev,
          images: [...prev.images, imageContent],
        }));
      }
    } catch (error) {
      logger.error("粘贴图片失败:", error);
      alert("粘贴图片失败: " + (error as Error).message);
    }
  };

  // 删除图片
  const handleRemoveImage = (index: number) => {
    setTranslationState((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  // 监听粘贴事件
  useEffect(() => {
    const handleDocumentPaste = (e: ClipboardEvent) => {
      // 只在焦点在翻译区域时处理
      if (document.activeElement?.closest(".translation-area")) {
        handlePaste(e);
      }
    };

    document.addEventListener("paste", handleDocumentPaste);
    return () => {
      document.removeEventListener("paste", handleDocumentPaste);
    };
  }, []);

  return (
    <div className="translation-area">
      <div className="header-section">
        <h1>人话翻译器</h1>
        <div className="header-buttons">
          <button
            className={`thinking-toggle-btn ${
              translationState.thinkingEnabled ? "enabled" : "disabled"
            }`}
            onClick={handleThinkingToggle}
            title={
              translationState.thinkingEnabled
                ? "点击关闭深度思考"
                : "点击开启深度思考"
            }
          >
            🧠 {translationState.thinkingEnabled ? "深度思考" : "快速回复"}
          </button>
          <button className="text-btn" onClick={onShowHistory}>
            历史记录
          </button>
          <button className="text-btn" onClick={onOpenSettings}>
            设置
          </button>
        </div>
      </div>

      {/* 图片预览区域 */}
      {translationState.images.length > 0 && (
        <div className="image-preview-section">
          <div className="image-preview-header">
            <span>已选择的图片 ({translationState.images.length})</span>
            <span className="image-hint">💡 支持 Ctrl+V 粘贴剪贴板图片</span>
          </div>
          <div className="image-preview-list">
            {translationState.images.map((image, index) => (
              <div key={index} className="image-preview-item">
                <img src={image.data} alt={`预览图 ${index + 1}`} />
                <button
                  className="remove-image-btn"
                  onClick={() => handleRemoveImage(index)}
                  title="删除图片"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="translation-content">
        <div className="input-section">
          <div className="input-area">
            <SmartInput
              value={translationState.sourceText}
              onChange={(text) =>
                setTranslationState((prev) => ({ ...prev, sourceText: text }))
              }
              onKeyDown={handleKeyDown}
              placeholder={`请输入要翻译的文本... ${
                translationState.images.length > 0
                  ? "(已选择" + translationState.images.length + "张图片) "
                  : ""
              }Ctrl+V可粘贴图片，Ctrl+Enter发送`}
              rows={3}
              history={history}
              disabled={translationState.isTranslating}
            />
          </div>

          <div className="translate-btn-wrapper">
            <button
              className="primary-btn"
              onClick={onTranslate}
              disabled={translationState.isTranslating}
            >
              {translationState.isTranslating ? "翻译中..." : "翻译"}
            </button>
          </div>
        </div>

        {translationState.showResult && (
          <div
            className="result-section-wrapper"
            ref={resultSectionWrapperRef}
            onScroll={throttledScrollHandler}
          >
            <div className="result-area">
              <div className="result-header">
                <span>翻译结果</span>
              </div>

              <div className="result-wrapper">
                {translationState.hasReasoning &&
                  translationState.reasoningText && (
                    <CollapsibleThinkingChain
                      reasoningText={translationState.reasoningText}
                      isTranslating={translationState.isTranslating}
                    />
                  )}

                <div className="result-section">
                  <div className="result-label">译文</div>
                  <div
                    className="result-content markdown-content"
                    dangerouslySetInnerHTML={{
                      __html: parseMarkdown(translationState.translatedText),
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <CopyFooter
        onCopyOriginal={handleCopyInput}
        onCopyTranslation={handleCopyTranslation}
        hasResult={translationState.showResult}
        hasInput={translationState.sourceText.trim().length > 0}
      />
    </div>
  );
};

export default TranslationArea;
