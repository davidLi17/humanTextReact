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

  const handleCopyOriginal = async () => {
    const success = await onCopyOriginal();
    if (success) {
      setCopyOriginalText("已复制");
      setTimeout(() => setCopyOriginalText("复制原文"), 1500);
    }
  };

  const handleCopyTranslation = async () => {
    const success = await onCopyTranslation();
    if (success) {
      setCopyTranslationText("已复制");
      setTimeout(() => setCopyTranslationText("复制译文"), 1500);
    }
  };

  return (
    <div className="copy-footer">
      <button
        className="copy-footer-btn copy-original-btn"
        onClick={handleCopyOriginal}
        disabled={!hasInput}
        title={hasInput ? "复制原文到剪贴板" : "请先输入文本"}
      >
        {copyOriginalText}
      </button>
      <button
        className="copy-footer-btn copy-translation-btn"
        onClick={handleCopyTranslation}
        disabled={!hasResult}
        title={hasResult ? "复制译文到剪贴板" : "请先进行翻译"}
      >
        {copyTranslationText}
      </button>
    </div>
  );
};

export default CopyFooter;