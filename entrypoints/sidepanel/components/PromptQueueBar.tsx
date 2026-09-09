import React, { useState } from "react";
import {
  Close,
  Down,
  ListNumbers,
  Time,
  ToTop,
  Up,
} from "@icon-park/react";
import type { ChatMessage } from "@/entrypoints/shared/chatTypes";
import type { SelectionContext } from "@/entrypoints/shared/selectionContext";

export interface QueuedPrompt {
  id: string;
  sessionId: string;
  text: string;
  images?: ChatMessage["images"];
  selectionContext?: SelectionContext;
  createdAt: number;
}

export interface PromptQueueBarProps {
  queue: QueuedPrompt[];
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
  onClearAll?: () => void;
}

export default function PromptQueueBar({
  queue,
  onPromote,
  onRemove,
  onClearAll,
}: PromptQueueBarProps) {
  const [expanded, setExpanded] = useState(false);

  if (!queue || queue.length === 0) {
    return null;
  }

  const head = queue[0];
  const remainingCount = queue.length - 1;

  return (
    <div className="prompt-queue-bar" role="region" aria-label="排队中的提示词队列">
      <div className="queue-main-row">
        <div className="queue-left-info">
          <div className="queue-badge" title="AI 正在处理前一个问题，当前问题已进入待发送队列">
            <span className="queue-pulse-dot" />
            <Time theme="outline" size="12" className="queue-badge-icon" />
            <span className="queue-badge-text">
              排队中 {queue.length > 1 ? `(1/${queue.length})` : ""}
            </span>
          </div>

          <div className="queue-snippet" title={head.text}>
            <span className="queue-text-content">{head.text}</span>
            {head.images && head.images.length > 0 && (
              <span className="queue-media-tag">[{head.images.length}张图片]</span>
            )}
            {head.selectionContext && (
              <span className="queue-media-tag">[网页上下文]</span>
            )}
          </div>

          {remainingCount > 0 && (
            <button
              type="button"
              className={`queue-expand-btn ${expanded ? "expanded" : ""}`}
              onClick={() => setExpanded(!expanded)}
              title={expanded ? "收起排队列表" : `查看更多 ${remainingCount} 条排队中的问题`}
            >
              <span>+{remainingCount} 条待发</span>
              <Down theme="outline" size="11" />
            </button>
          )}
        </div>

        <div className="queue-right-actions">
          <button
            type="button"
            className="queue-action-btn promote-btn"
            title="优先发送：打断当前生成并立即发送该问题 (快捷键: ⌘+Enter / Ctrl+Enter)"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPromote(head.id);
            }}
          >
            <ToTop theme="outline" size="13" />
            <span className="btn-label">优先发送</span>
          </button>

          <button
            type="button"
            className="queue-action-btn remove-btn"
            title="取消排队并移除"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove(head.id);
            }}
          >
            <Close theme="outline" size="12" />
          </button>
        </div>
      </div>

      {/* 展开的排队列表 */}
      {expanded && queue.length > 1 && (
        <div className="queue-expanded-list">
          <div className="queue-expanded-header">
            <span className="expanded-title">
              <ListNumbers theme="outline" size="12" />
              <span>后续排队列表（流式结束后依次自动回答）</span>
            </span>
            {onClearAll && (
              <button
                type="button"
                className="clear-all-queue-btn"
                onClick={onClearAll}
                title="清空所有排队问题"
              >
                清空队列
              </button>
            )}
          </div>

          <div className="queue-items-container">
            {queue.slice(1).map((item, index) => (
              <div key={item.id} className="queue-item-row">
                <span className="item-order">#{index + 2}</span>
                <span className="item-text" title={item.text}>
                  {item.text}
                </span>
                <div className="item-actions">
                  <button
                    type="button"
                    className="item-action-btn promote"
                    title="立即打断并优先发送此问题"
                    onClick={() => onPromote(item.id)}
                  >
                    <Up theme="outline" size="12" />
                    <span>置顶发送</span>
                  </button>
                  <button
                    type="button"
                    className="item-action-btn remove"
                    title="移除此项"
                    onClick={() => onRemove(item.id)}
                  >
                    <Close theme="outline" size="11" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
