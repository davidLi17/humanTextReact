import React, { useEffect, useRef, useCallback } from "react";
import throttle from "lodash-es/throttle";
import { TranslationAreaProps } from "../types";
import { parseMarkdown } from "../../../shared/utils/markdown";
import { injectMarkdownStyles } from "../../../shared/styles/markdown";
import CopyFooter from "./CopyFooter";

const TranslationArea: React.FC<TranslationAreaProps> = ({
  translationState,
  setTranslationState,
  onTranslate,
  onCopy,
  onShowHistory,
  onOpenSettings,
}) => {
  const userHasScrolledRef = useRef(false);
  const resultSectionWrapperRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 注入 Markdown 样式
  useEffect(() => {
    injectMarkdownStyles("popup-markdown-styles");
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

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setTranslationState((prev) => ({ ...prev, sourceText: text }));
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      // Ctrl+Enter (Windows) 或 Cmd+Enter (Mac) 发送
      e.preventDefault();
      onTranslate();
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

  return (
    <div className="translation-area">
      <div className="header-section">
        <h1>人话翻译器</h1>
        <div className="header-buttons">
          <button className="text-btn" onClick={onShowHistory}>
            历史记录
          </button>
          <button className="text-btn" onClick={onOpenSettings}>
            设置
          </button>
        </div>
      </div>

      <div className="translation-content">
        <div className="input-section">
          <div className="input-area">
            <textarea
              value={translationState.sourceText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="请输入要翻译的文本... Ctrl+Enter (Windows) / Cmd+Enter (Mac) 发送，Enter换行"
              rows={5}
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
                    <div className="result-section result-section-reasoning">
                      <div className="result-label">思维链</div>
                      <div
                        className="result-content markdown-content"
                        dangerouslySetInnerHTML={{
                          __html: parseMarkdown(translationState.reasoningText),
                        }}
                      />
                    </div>
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
