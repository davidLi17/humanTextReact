import type { SessionSearchHit } from "@/entrypoints/shared/sessionSearch";

const ROLE_LABELS: Record<SessionSearchHit["role"], string> = {
  title: "会话标题",
  user: "你的提问",
  assistant: "回答",
  system: "系统消息",
};

interface SessionSearchResultsProps {
  results: SessionSearchHit[];
  onSelect: (result: SessionSearchHit) => void;
}

export default function SessionSearchResults({
  results,
  onSelect,
}: SessionSearchResultsProps) {
  return (
    <div className="session-search-results" aria-label="会话搜索结果">
      {results.map((result, index) => (
        <button
          key={`${result.sessionId}-${result.messageId || "title"}-${index}`}
          type="button"
          className="session-search-result"
          data-testid="session-search-result"
          data-session-id={result.sessionId}
          {...(result.messageId ? { "data-message-id": result.messageId } : {})}
          onClick={() => onSelect(result)}
        >
          <span className="session-search-result-meta">
            <span className="session-search-result-title" title={result.sessionTitle}>
              {result.sessionTitle || "未命名会话"}
            </span>
            <span className="session-search-result-role">
              {ROLE_LABELS[result.role]}
            </span>
          </span>
          <span className="session-search-result-snippet">{result.snippet}</span>
        </button>
      ))}
    </div>
  );
}
