import { TranslationAreaProps } from "@/entrypoints/popup/types";
import { useAutoScroll } from "@/entrypoints/popup/hooks/useAutoScroll";
import { ImageUtils } from "@/entrypoints/popup/utils/imageUtils";
import { createLogger } from "@/entrypoints/shared/logger";
import { SettingsUtils } from "@/entrypoints/shared/settingsUtils";
import { injectMarkdownStyles } from "@/shared/styles/markdown";
import { initializeCodeCopy, parseMarkdown } from "@/shared/utils/markdown";
import React, { useEffect } from "react";
import { useAutoScrollToBottom } from "../hooks/useAutoScrollToBottom";
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
  onClearDraft,
  onRetry,
  onCancel,
  history,
}) => {
  // 使用 useAutoScrollToBottom hook 管理滚动
  const {
    containerRef: resultSectionWrapperRef,
    onScroll: handleResultScroll,
    userHasScrolledRef,
  } = useAutoScrollToBottom<HTMLDivElement>({
    enabled: translationState.showResult,
    watch: [translationState.translatedText, translationState.reasoningText],
    bottomThresholdPx: 10,
    throttleMs: 16,
    resetDelayMs: 1000,
    resetWhen: translationState.isTranslating,
  });

  // ========== Markdown 样式注入 ==========
  useEffect(() => {
    injectMarkdownStyles("popup-markdown-styles");
    initializeCodeCopy();
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
            {(translationState.sourceText.trim().length > 0 ||
              translationState.images.length > 0) && (
              <button
                className="secondary-btn clear-draft-btn"
                onClick={onClearDraft}
                disabled={translationState.isTranslating}
                title="清空当前输入和图片"
              >
                清空
              </button>
            )}
            {translationState.isTranslating && (
              <button
                className="secondary-btn stop-translate-btn"
                onClick={onCancel}
                title="停止当前翻译"
              >
                停止
              </button>
            )}
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
            onScroll={handleResultScroll}
          >
            <div className="result-area">
              <div className="result-header">
                <span>翻译结果</span>
              </div>

              <div className="result-wrapper">
                {translationState.errorMessage && (
                  <div className="error-card">
                    <div className="error-card-title">翻译没有完成</div>
                    <div className="error-card-message">
                      {translationState.errorMessage}
                    </div>
                    <div className="error-card-actions">
                      <button
                        className="secondary-btn"
                        onClick={onRetry}
                        disabled={translationState.isTranslating}
                      >
                        重试
                      </button>
                      {translationState.errorMessage.includes("API Key") && (
                        <button className="secondary-btn" onClick={onOpenSettings}>
                          去设置
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {translationState.hasReasoning &&
                  translationState.reasoningText && (
                    <CollapsibleThinkingChain
                      reasoningText={translationState.reasoningText}
                      isTranslating={translationState.isTranslating}
                    />
                  )}

                {translationState.translatedText && (
                  <div className="result-section">
                    <div className="result-label">译文</div>
                    <div
                      className="result-content markdown-content"
                      dangerouslySetInnerHTML={{
                        __html: parseMarkdown(translationState.translatedText),
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <CopyFooter
        onCopyOriginal={handleCopyInput}
        onCopyTranslation={handleCopyTranslation}
        hasResult={translationState.translatedText.trim().length > 0}
        hasInput={translationState.sourceText.trim().length > 0}
      />
    </div>
  );
};

export default TranslationArea;


