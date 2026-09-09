import React, { useMemo, useState } from "react";
import {
  PRISM_TAB_KEYS,
  PRISM_TABS,
  type PrismTabKey,
} from "@/entrypoints/shared/prismTypes";
import {
  getPrismContentByTab,
  getPrismCopyText,
  parsePrismTranslation,
} from "@/entrypoints/shared/prismParser";
import { parseMarkdown } from "@/shared/utils/markdown";
import { Copy, CheckOne } from "@icon-park/react";
import "./PrismResultTabs.less";

interface PrismResultTabsProps {
  content: string;
  isStreaming?: boolean;
  onCopyCorporate?: (corporateText: string) => void;
}

export const PrismResultTabs: React.FC<PrismResultTabsProps> = ({
  content,
  isStreaming = false,
  onCopyCorporate,
}) => {
  const [activeTab, setActiveTab] = useState<PrismTabKey>(PRISM_TAB_KEYS.VERNACULAR);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const parsed = useMemo(() => {
    return parsePrismTranslation(content);
  }, [content]);

  // 如果并非三棱镜格式，直接展示常规 Markdown
  if (!parsed.isPrism) {
    return (
      <div
        className="markdown-content"
        dangerouslySetInnerHTML={{
          __html: parseMarkdown(content),
        }}
      />
    );
  }

  const activeContent = getPrismContentByTab(parsed, activeTab);

  const handleCopyCurrent = async () => {
    const text = getPrismCopyText(parsed, activeTab);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(activeTab);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch (err) {
      console.error("复制失败:", err);
    }
  };

  const handleCopyCorporate = async () => {
    const text = getPrismCopyText(parsed, PRISM_TAB_KEYS.CORPORATE);
    if (!text) return;
    if (onCopyCorporate) {
      onCopyCorporate(text);
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey("corporate-direct");
      setTimeout(() => setCopiedKey(null), 1800);
    } catch (err) {
      console.error("复制汇报版失败:", err);
    }
  };

  const tabs: PrismTabKey[] = [
    PRISM_TAB_KEYS.VERNACULAR,
    PRISM_TAB_KEYS.CORPORATE,
    PRISM_TAB_KEYS.TRUTH,
    PRISM_TAB_KEYS.RAW,
  ];

  return (
    <div className="prism-result-container">
      <div className="prism-tab-header">
        <div className="prism-tab-list" role="tablist">
          {tabs.map((key) => {
            const meta = PRISM_TABS[key];
            const isActive = activeTab === key;
            const isStreamingThis = parsed.activeStreamKey === key && isStreaming;

            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`prism-tab-item ${isActive ? "active" : ""}`}
                onClick={() => setActiveTab(key)}
                title={meta.description}
              >
                <span className="prism-tab-emoji">{meta.emoji}</span>
                <span className="prism-tab-label">{meta.shortLabel}</span>
                {isStreamingThis && <span className="prism-streaming-dot"></span>}
              </button>
            );
          })}
        </div>

        <div className="prism-header-actions">
          {parsed.corporate && (
            <button
              type="button"
              className="prism-copy-corporate-btn"
              title="一键复制向上汇报版至剪贴板，可直接粘贴到周报中"
              onClick={handleCopyCorporate}
            >
              {copiedKey === "corporate-direct" ? (
                <>
                  <CheckOne theme="outline" size="12" />
                  <span>已复制周报版</span>
                </>
              ) : (
                <>
                  <span>👔 复制周报版</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            className="prism-copy-current-btn"
            title={`复制${PRISM_TABS[activeTab].shortLabel}`}
            onClick={handleCopyCurrent}
          >
            {copiedKey === activeTab ? (
              <>
                <CheckOne theme="outline" size="12" />
                <span>已复制</span>
              </>
            ) : (
              <>
                <Copy theme="outline" size="12" />
                <span>复制</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="prism-tab-content">
        <div
          className="markdown-content"
          dangerouslySetInnerHTML={{
            __html: parseMarkdown(activeContent || (isStreaming ? "正在组织语言..." : "暂无内容")),
          }}
        />
      </div>
    </div>
  );
};

export default PrismResultTabs;
