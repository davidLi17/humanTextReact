import React, { useState } from "react";
import { JargonVault } from "@/entrypoints/shared/jargonVault";

interface CopyFooterProps {
  onCopyOriginal: () => Promise<boolean>;
  onCopyTranslation: () => Promise<boolean>;
  hasResult: boolean;
  hasInput: boolean;
  originalText?: string;
  translationText?: string;
}

const CopyFooter: React.FC<CopyFooterProps> = ({
  onCopyOriginal,
  onCopyTranslation,
  hasResult,
  hasInput,
  originalText = "",
  translationText = "",
}) => {
  const [copyOriginalText, setCopyOriginalText] = useState("复制原文");
  const [copyTranslationText, setCopyTranslationText] = useState("复制译文");
  const [saveVaultText, setSaveVaultText] = useState("⭐ 存入生词本");
  const [isCopyingOriginal, setIsCopyingOriginal] = useState(false);
  const [isCopyingTranslation, setIsCopyingTranslation] = useState(false);
  const [isSavingVault, setIsSavingVault] = useState(false);

  const handleSaveToVault = async () => {
    if (!hasResult || isSavingVault || !originalText.trim()) return;

    setIsSavingVault(true);
    setSaveVaultText("保存中...");
    try {
      await JargonVault.addJargon({
        term: originalText.trim().slice(0, 30),
        explanation: translationText.trim(),
        category: "通用",
      });
      setSaveVaultText("已存入生词本 ✓");
      setTimeout(() => setSaveVaultText("⭐ 存入生词本"), 2000);
    } catch (error) {
      setSaveVaultText("保存失败");
      setTimeout(() => setSaveVaultText("⭐ 存入生词本"), 2000);
    } finally {
      setIsSavingVault(false);
    }
  };

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
      {hasResult && (
        <button
          className="copy-footer-btn copy-vault-btn"
          onClick={handleSaveToVault}
          disabled={isSavingVault}
          title="将本条黑话翻译存入生词本"
        >
          {saveVaultText}
        </button>
      )}
    </div>
  );
};

export default CopyFooter;
