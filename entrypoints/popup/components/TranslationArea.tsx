import React, { useState, useEffect } from "react";
import { TranslationAreaProps } from "../types";
import { parseMarkdown } from "../../../shared/utils/markdown";
import { injectMarkdownStyles } from "../../../shared/styles/markdown";

const TranslationArea: React.FC<TranslationAreaProps> = ({
  translationState,
  setTranslationState,
  onTranslate,
  onCopy,
  onShowHistory,
  onOpenSettings,
  onScroll,
  resultAreaRef,
}) => {
  const [copyButtonText, setCopyButtonText] = useState("复制");
  const [copyInputButtonText, setCopyInputButtonText] = useState("复制输入");

  // 注入 Markdown 样式
  useEffect(() => {
    injectMarkdownStyles("popup-markdown-styles");
  }, []);

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setTranslationState((prev) => ({ ...prev, sourceText: text }));
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      onTranslate();
    }
  };

  // 复制翻译结果
  const handleCopyTranslation = async () => {
    const success = await onCopy(translationState.translatedText);
    if (success) {
      setCopyButtonText("已复制");
      setTimeout(() => setCopyButtonText("复制"), 1500);
    } else {
      alert("复制失败，请重试");
    }
  };

  // 复制输入文本
  const handleCopyInput = async () => {
    if (!translationState.sourceText.trim()) {
      alert("请输入要复制的文本");
      return;
    }

    const success = await onCopy(translationState.sourceText);
    if (success) {
      setCopyInputButtonText("已复制");
      setTimeout(() => setCopyInputButtonText("复制输入"), 1500);
    } else {
      alert("复制失败，请重试");
    }
  };

  return (
    <>
      <h1>人话翻译器</h1>

      <div className="input-area">
        <textarea
          value={translationState.sourceText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="请输入要翻译的文本... Enter发送，Shift+Enter换行"
          rows={5}
        />
        <button
          className="icon-btn input-copy-btn"
          onClick={handleCopyInput}
          title="复制输入文本"
        >
          {copyInputButtonText}
        </button>
      </div>

      <button
        className="primary-btn"
        onClick={onTranslate}
        disabled={translationState.isTranslating}
      >
        {translationState.isTranslating ? "翻译中..." : "翻译"}
      </button>

      {translationState.showResult && (
        <div className="result-area" ref={resultAreaRef} onScroll={onScroll}>
          <div className="result-header">
            <span>翻译结果</span>
            <button className="icon-btn" onClick={handleCopyTranslation}>
              {copyButtonText}
            </button>
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
      )}

      <div className="footer">
        <button className="text-btn" onClick={onShowHistory}>
          历史记录
        </button>
        <button className="text-btn" onClick={onOpenSettings}>
          设置
        </button>
      </div>
    </>
  );
};

export default TranslationArea;
