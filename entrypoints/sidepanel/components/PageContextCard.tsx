import { useId, useMemo, useState } from "react";
import type { ChatMessage } from "@/entrypoints/shared/chatTypes";
import {
  getAttachedPageSegments,
  getAttachedPageSnapshot,
} from "@/entrypoints/shared/pageContext";
import {
  getSafeHttpUrl,
  getSafeSourceHostname,
} from "@/entrypoints/shared/selectionContext";
import "./PageContextCard.less";

type PageMeta = NonNullable<ChatMessage["pageMeta"]>;

export interface PageContextCardProps {
  meta: PageMeta;
  disabled: boolean;
  onSelectionChange: (segments: number[]) => void;
  onExtractGoal?: (goal: string) => boolean;
}

function formatChars(chars: number) {
  return Math.max(0, chars).toLocaleString("zh-CN");
}

/**
 * 只展示已持久化的网页快照，并将“预览哪段”留在本地 UI 状态。
 * 勾选变化由父组件保存到消息元数据，避免卡片自身产生任何网络请求。
 */
export default function PageContextCard({
  meta,
  disabled,
  onSelectionChange,
  onExtractGoal,
}: PageContextCardProps) {
  const attachedPage = useMemo(() => getAttachedPageSnapshot(meta), [meta]);
  const segments = useMemo(() => getAttachedPageSegments(meta), [meta]);
  const [previewSegmentIndex, setPreviewSegmentIndex] = useState(
    segments[0]?.index ?? 1
  );

  const selectedSegments = useMemo(
    () =>
      segments
        .filter((segment) => segment.selected)
        .map((segment) => segment.index),
    [segments]
  );
  const selectedSegmentSet = useMemo(
    () => new Set(selectedSegments),
    [selectedSegments]
  );
  const selectedChars = useMemo(
    () =>
      segments.reduce(
        (total, segment) =>
          segment.selected ? total + segment.charCount : total,
        0
      ),
    [segments]
  );
  const savedChars = attachedPage?.content.length ?? 0;
  const capturedChars = attachedPage?.capturedChars;
  const legacyRecord =
    meta.contextOnly === true &&
    (!attachedPage || attachedPage.legacyPartial === true);
  const displayTitle = typeof meta.title === "string" && meta.title.trim()
    ? meta.title
    : "未命名网页";
  const safeUrl = getSafeHttpUrl(meta.url);
  const hostname = getSafeSourceHostname(safeUrl);
  const previewSegment =
    segments.find((segment) => segment.index === previewSegmentIndex) ??
    segments[0];
  const [extractGoal, setExtractGoal] = useState("");
  const extractGoalId = `${useId()}-page-context-extract-goal`;

  const updateSelection = (segmentIndex: number, checked: boolean) => {
    if (disabled) return;
    const next = checked
      ? [...new Set([...selectedSegments, segmentIndex])]
      : selectedSegments.filter((index) => index !== segmentIndex);
    onSelectionChange(next.sort((left, right) => left - right));
  };

  const handleExtractGoal = () => {
    const goal = extractGoal.trim();
    if (
      !onExtractGoal ||
      disabled ||
      selectedSegments.length === 0 ||
      !goal
    ) {
      return;
    }
    if (onExtractGoal(goal)) {
      setExtractGoal("");
    }
  };

  return (
    <section className="page-context-card" aria-label="网页上下文">
      <header className="page-context-card__header">
        <div className="page-context-card__heading">
          <span className="page-context-card__badge">网页上下文</span>
          <strong title={displayTitle}>{displayTitle}</strong>
        </div>
        {safeUrl && (
          <a
            className="page-context-card__source"
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`打开来源：${hostname || "网页来源"}`}
            title={safeUrl}
          >
            {hostname || "查看来源"}
          </a>
        )}
      </header>

      <div className="page-context-card__metrics" aria-live="polite">
        <span>
          已采集：
          {legacyRecord || capturedChars === undefined
            ? "未知（旧记录）"
            : `${formatChars(capturedChars)} 字符`}
        </span>
        <span>已保存：{formatChars(savedChars)} 字符</span>
        <span>下次提问带入：{formatChars(selectedChars)} 字符</span>
      </div>

      {attachedPage?.hasMoreContent && (
        <p className="page-context-card__notice">页面可能还有未加载内容。</p>
      )}
      {capturedChars !== undefined && capturedChars > savedChars && (
        <p className="page-context-card__notice">
          保存空间不足，未保存 {formatChars(capturedChars - savedChars)} 字符。
        </p>
      )}
      {legacyRecord && (
        <p className="page-context-card__notice">
          旧记录只保存首段，请重新加入网页以使用完整上下文。
        </p>
      )}
      {disabled && (
        <p className="page-context-card__notice" role="status">
          正在生成回答，暂时不能修改参与回答的段落。
        </p>
      )}

      {onExtractGoal && (
        <div className="page-context-card__goal">
          <label htmlFor={extractGoalId}>
            这次想解决什么问题？
          </label>
          <textarea
            id={extractGoalId}
            value={extractGoal}
            maxLength={500}
            rows={2}
            placeholder="例如：找出这篇文章对我的工作最有用的三点"
            disabled={disabled}
            onChange={(event) => setExtractGoal(event.target.value)}
          />
          <button
            type="button"
            disabled={
              disabled || selectedSegments.length === 0 || !extractGoal.trim()
            }
            onClick={handleExtractGoal}
          >
            提取对我有用的信息
          </button>
        </div>
      )}

      {segments.length > 0 ? (
        <details className="page-context-card__details">
          <summary>预览已保存原文</summary>
          <div className="page-context-card__preview-tabs" role="group" aria-label="选择预览段落">
            {segments.map((segment) => (
              <button
                type="button"
                key={segment.index}
                aria-pressed={previewSegment?.index === segment.index}
                onClick={() => setPreviewSegmentIndex(segment.index)}
              >
                预览第 {segment.index} 段
              </button>
            ))}
          </div>
          {previewSegment && (
            <pre className="page-context-card__preview" aria-label={`第 ${previewSegment.index} 段原文`}>
              {previewSegment.content}
            </pre>
          )}
          <fieldset className="page-context-card__selection">
            <legend>选择参与回答的网页段落</legend>
            <div className="page-context-card__selection-actions">
              <span>已选 {selectedSegments.length} 段</span>
              <button
                type="button"
                disabled={disabled || selectedSegments.length === 0}
                onClick={() => onSelectionChange([])}
              >
                清空参与回答的段落
              </button>
            </div>
            {segments.map((segment) => (
              <label key={segment.index} className="page-context-card__segment-option">
                <input
                  type="checkbox"
                  checked={selectedSegmentSet.has(segment.index)}
                  disabled={disabled}
                  aria-label={`第 ${segment.index} 段参与回答`}
                  onChange={(event) => updateSelection(segment.index, event.target.checked)}
                />
                <span>第 {segment.index} 段参与回答</span>
                <em>{formatChars(segment.charCount)} 字符</em>
              </label>
            ))}
          </fieldset>
        </details>
      ) : (
        <p className="page-context-card__notice" role="status">
          没有可用的网页正文，请重新加入网页。
        </p>
      )}
    </section>
  );
}
