import React, { useState, useEffect, useRef } from "react";
import { parseMarkdown } from "../../../shared/utils/markdown";

interface CollapsibleThinkingChainProps {
  reasoningText: string;
  isTranslating: boolean;
}

const CollapsibleThinkingChain: React.FC<CollapsibleThinkingChainProps> = ({
  reasoningText,
  isTranslating,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 检查内容是否超出限制高度
  useEffect(() => {
    if (contentRef.current && containerRef.current) {
      const contentHeight = contentRef.current.scrollHeight;
      const containerHeight = containerRef.current.clientHeight;
      setHasOverflow(contentHeight > containerHeight);
    }
  }, [reasoningText]);

  // 自动滚动到底部（当有新内容且处于折叠状态时）
  useEffect(() => {
    if (!isExpanded && containerRef.current && reasoningText) {
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      });
    }
  }, [reasoningText, isExpanded]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getPreviewText = () => {
    // 显示最后一部分内容作为预览
    const lines = reasoningText.split('\n');
    if (lines.length > 5) {
      return lines.slice(-5).join('\n');
    }
    return reasoningText;
  };

  return (
    <div className="collapsible-thinking-chain">
      <div className="result-label">
        思维链
        {!isExpanded && hasOverflow && (
          <span className="expand-indicator"> (点击展开查看完整内容)</span>
        )}
        {isExpanded && (
          <span className="expand-indicator"> (点击收起)</span>
        )}
      </div>
      
      <div 
        ref={containerRef}
        className={`thinking-chain-container ${isExpanded ? 'expanded' : 'collapsed'}`}
        onClick={!isExpanded && hasOverflow ? toggleExpanded : undefined}
      >
        <div 
          ref={contentRef}
          className="thinking-chain-content markdown-content"
          dangerouslySetInnerHTML={{
            __html: parseMarkdown(isExpanded ? reasoningText : getPreviewText()),
          }}
        />
      </div>

      {isExpanded && (
        <button 
          className="collapse-btn"
          onClick={toggleExpanded}
        >
          收起思维链 ↑
        </button>
      )}

      {isTranslating && (
        <div className="thinking-indicator">
          <span className="thinking-dot"></span>
          <span className="thinking-dot"></span>
          <span className="thinking-dot"></span>
          思考中...
        </div>
      )}
    </div>
  );
};

export default CollapsibleThinkingChain;