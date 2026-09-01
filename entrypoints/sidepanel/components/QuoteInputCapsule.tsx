import React from "react";
import { Quote } from "@icon-park/react";
import { extractQuotePreview } from "../utils/quoteUtils";

export interface QuoteInputCapsuleProps {
  quotedText: string;
  onClear: () => void;
}

export default function QuoteInputCapsule({
  quotedText,
  onClear,
}: QuoteInputCapsuleProps) {
  if (!quotedText || !quotedText.trim()) {
    return null;
  }

  const preview = extractQuotePreview(quotedText, 50);

  return (
    <div className="quote-input-capsule-bar">
      <div className="quote-capsule-content">
        <Quote theme="outline" size="13" className="capsule-quote-icon" />
        <span className="quote-capsule-tag">引用</span>
        <span className="quote-capsule-text" title={quotedText}>
          "{preview}"
        </span>
      </div>
      <button
        type="button"
        className="quote-capsule-clear-btn"
        title="取消引用 (Backspace 清空)"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClear();
        }}
      >
        ✕
      </button>
    </div>
  );
}
