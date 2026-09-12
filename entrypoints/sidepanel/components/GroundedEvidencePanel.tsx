import { useLayoutEffect, useRef, useState } from "react";
import type { ParsedGroundedGoalResult } from "@/entrypoints/shared/groundedGoal";
import "./GroundedEvidencePanel.less";

export interface GroundedEvidencePanelProps {
  result: ParsedGroundedGoalResult;
  isComplete?: boolean;
}

function HighlightedQuote({ content, quote }: { content: string; quote: string }) {
  const index = content.indexOf(quote);
  if (index < 0) return <>{content}</>;
  return (
    <>
      {content.slice(0, index)}
      <mark>{content.slice(index, index + quote.length)}</mark>
      {content.slice(index + quote.length)}
    </>
  );
}

export default function GroundedEvidencePanel({
  result,
  isComplete = true,
}: GroundedEvidencePanelProps) {
  const [openCitation, setOpenCitation] = useState<string | null>(null);
  const preRefs = useRef<Record<string, HTMLPreElement | null>>({});

  useLayoutEffect(() => {
    if (!openCitation) return;
    const pre = preRefs.current[openCitation];
    const mark = pre?.querySelector("mark");
    if (!pre || !mark) return;

    const preRect = pre.getBoundingClientRect();
    const markRect = mark.getBoundingClientRect();
    const markCenter = markRect.top - preRect.top + markRect.height / 2;
    const targetScrollTop =
      pre.scrollTop + markCenter - pre.clientHeight / 2;
    pre.scrollTop = Math.max(
      0,
      Math.min(targetScrollTop, pre.scrollHeight - pre.clientHeight)
    );
  }, [openCitation]);

  if (result.citations.length === 0 && !isComplete) {
    return null;
  }

  return (
    <details className="grounded-evidence-panel" open>
      <summary>原文依据（{result.citations.length} 条）</summary>
      {result.source && (
        <div className="grounded-evidence-source">
          <span>{result.source.title}</span>
          {result.source.url && (
            <a href={result.source.url} target="_blank" rel="noreferrer">
              查看来源
            </a>
          )}
        </div>
      )}
      {isComplete && result.unverifiedCount > 0 && (
        <p className="grounded-evidence-warning" role="status">
          {result.unverifiedCount} 条引用未在所选原文中找到
        </p>
      )}
      {isComplete && result.citations.length === 0 && result.unverifiedCount === 0 && (
        <p className="grounded-evidence-empty" role="status">
          这次回答未提供可核对的原文依据
        </p>
      )}
      <div className="grounded-evidence-list">
        {result.citations.map((citation) => (
          <div className="grounded-evidence-item" key={citation.id}>
            <div className="grounded-evidence-quote">
              {citation.id}：{citation.quote}
            </div>
            <button
              type="button"
              onClick={() =>
                setOpenCitation((current) =>
                  current === citation.id ? null : citation.id
                )
              }
            >
              查看第 {citation.segmentIndex} 段原文
            </button>
            {openCitation === citation.id && (
              <pre ref={(node) => {
                preRefs.current[citation.id] = node;
              }}>
                <HighlightedQuote
                  content={citation.segmentContent}
                  quote={citation.quote}
                />
              </pre>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}
