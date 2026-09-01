import React from "react";
import { Quote } from "@icon-park/react";

export interface SidepanelQuoteActionBarProps {
  visible: boolean;
  position: {
    left: number;
    top: number;
    placement?: "top" | "bottom";
  };
  selectedText: string;
  onQuote: (text: string) => void;
}

export default function SidepanelQuoteActionBar({
  visible,
  position,
  selectedText,
  onQuote,
}: SidepanelQuoteActionBarProps) {
  if (!visible || !selectedText) {
    return null;
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // 阻止 mousedown 默认事件，避免选区被立即提前清空
    e.preventDefault();
    e.stopPropagation();
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onQuote(selectedText);
  };

  return (
    <div
      className={`sidepanel-quote-action-bar placement-${
        position.placement || "top"
      }`}
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      role="toolbar"
      aria-label="划词追问"
    >
      <button
        type="button"
        className="quote-action-capsule-btn"
        title="引用选中内容追问"
      >
        <Quote theme="filled" size="13" className="quote-icon" />
        <span className="quote-label">追问</span>
      </button>
    </div>
  );
}
