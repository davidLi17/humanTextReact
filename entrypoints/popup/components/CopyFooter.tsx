import React, { useState } from "react";

interface CopyFooterProps {
  onCopyOriginal: () => Promise<boolean>;
  onCopyTranslation: () => Promise<boolean>;
  hasResult: boolean;
  hasInput: boolean;
}

const CopyFooter: React.FC<CopyFooterProps> = ({
  onCopyOriginal,
  onCopyTranslation,
  hasResult,
  hasInput,
}) => {
  const [copyOriginalText, setCopyOriginalText] = useState("复制原文");
  const [copyTranslationText, setCopyTranslationText] = useState("复制译文");
  const [isCopyingOriginal, setIsCopyingOriginal] = useState(false);
  const [isCopyingTranslation, setIsCopyingTranslation] = useState(false);

  const handleCopyOriginal = async () => {
    if (isCopyingOriginal) return; // 防止重复点击

    setIsCopyingOriginal(true);
    setCopyOriginalText("复制中...");

    try {
      const success = await onCopyOriginal();
      if (success) {
        setCopyOriginalText("已复制");
        setTimeout(() => setCopyOriginalText("复制原文"), 1500);
      } else {
        setCopyOriginalText("复制失败");
        setTimeout(() => setCopyOriginalText("复制原文"), 1500);
      }
    } catch (error) {
      setCopyOriginalText("复制失败");
      setTimeout(() => setCopyOriginalText("复制原文"), 1500);
    } finally {
      setIsCopyingOriginal(false);
    }
  };

  const handleCopyTranslation = async () => {
    if (isCopyingTranslation) return; // 防止重复点击

    setIsCopyingTranslation(true);
    setCopyTranslationText("复制中...");

    try {
      const success = await onCopyTranslation();
      if (success) {
        setCopyTranslationText("已复制");
        setTimeout(() => setCopyTranslationText("复制译文"), 1500);
      } else {
        setCopyTranslationText("复制失败");
        setTimeout(() => setCopyTranslationText("复制译文"), 1500);
      }
    } catch (error) {
      setCopyTranslationText("复制失败");
      setTimeout(() => setCopyTranslationText("复制译文"), 1500);
    } finally {
      setIsCopyingTranslation(false);
    }
  };

  return (
    <div className="copy-footer">
      <button
        className="copy-footer-btn copy-original-btn"
        onClick={handleCopyOriginal}
        disabled={!hasInput || isCopyingOriginal}
        title={hasInput ? "复制原文到剪贴板" : "请先输入文本"}
      >
        {copyOriginalText}
      </button>
      <button
        className="copy-footer-btn copy-translation-btn"
        onClick={handleCopyTranslation}
        disabled={!hasResult || isCopyingTranslation}
        title={hasResult ? "复制译文到剪贴板" : "请先进行翻译"}
      >
        {copyTranslationText}
      </button>
    </div>
  );
};

export default CopyFooter;