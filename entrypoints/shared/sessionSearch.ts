import Fuse from "fuse.js";
import type { ChatRole, ChatSession } from "./chatTypes";

const DEFAULT_LIMIT = 30;
const MAX_SNIPPET_LENGTH = 136;
const MATCH_RELEVANCE_TOLERANCE = 0.08;

export interface SessionSearchHit {
  sessionId: string;
  sessionTitle: string;
  messageId?: string;
  role: ChatRole | "title";
  snippet: string;
  updatedAt: number;
}

interface SessionSearchDocument {
  kind: "title" | "message";
  sessionId: string;
  sessionTitle: string;
  messageId?: string;
  role: ChatRole | "title";
  text: string;
  updatedAt: number;
}

export interface SessionSearchIndex {
  readonly documents: readonly SessionSearchDocument[];
  readonly fuse: Fuse<SessionSearchDocument>;
}

function finiteTimestamp(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeText(value: unknown): string {
  if (typeof value !== "string") return "";

  // Chat messages keep image data separately. This also protects malformed
  // imported records that put a data URL directly in content.
  return value
    .replace(/data:image\/[\w.+-]+;base64,[A-Za-z0-9+/=]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeLimit(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_LIMIT;
  }
  return Math.max(0, Math.floor(value));
}

function snippetFor(
  text: string,
  query: string,
  matches: readonly { indices: readonly [number, number][] }[] | undefined
): string {
  if (text.length <= MAX_SNIPPET_LENGTH) return text;

  const indices = matches?.flatMap((match) => match.indices) ?? [];
  const firstMatch = [...indices].sort(
    ([leftStart, leftEnd], [rightStart, rightEnd]) =>
      leftStart - rightStart || leftEnd - rightEnd
  )[0];
  const exactMatchStart = text.toLowerCase().indexOf(query.toLowerCase());
  const matchStart = exactMatchStart >= 0 ? exactMatchStart : firstMatch?.[0] ?? 0;
  const matchEnd =
    exactMatchStart >= 0
      ? exactMatchStart + query.length
      : firstMatch
        ? firstMatch[1] + 1
        : Math.min(text.length, MAX_SNIPPET_LENGTH);
  const matchLength = Math.min(
    MAX_SNIPPET_LENGTH,
    Math.max(1, matchEnd - matchStart)
  );
  const availableContext = MAX_SNIPPET_LENGTH - matchLength;
  let start = Math.max(0, matchStart - Math.floor(availableContext / 2));
  start = Math.min(start, text.length - MAX_SNIPPET_LENGTH);
  const end = Math.min(text.length, start + MAX_SNIPPET_LENGTH);

  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${
    end < text.length ? "…" : ""
  }`;
}

function messageRole(value: unknown): Extract<ChatRole, "user" | "assistant"> | null {
  return value === "user" || value === "assistant" ? value : null;
}

export function createSessionSearchIndex(
  sessions: ChatSession[]
): SessionSearchIndex {
  const documents: SessionSearchDocument[] = [];
  const seenSessions = new Set<string>();
  const seenMessages = new Set<string>();

  if (!Array.isArray(sessions)) {
    return createIndex(documents);
  }

  for (const rawSession of sessions) {
    if (!rawSession || typeof rawSession !== "object") continue;
    const session = rawSession as unknown as Record<string, unknown>;
    const sessionId = safeText(session.id);
    if (!sessionId || seenSessions.has(sessionId)) continue;

    seenSessions.add(sessionId);
    const sessionTitle = safeText(session.title);
    const createdAt = finiteTimestamp(session.createdAt);
    const updatedAt = finiteTimestamp(session.updatedAt, createdAt);

    if (sessionTitle) {
      documents.push({
        kind: "title",
        sessionId,
        sessionTitle,
        role: "title",
        text: sessionTitle,
        updatedAt,
      });
    }

    if (!Array.isArray(session.messages)) continue;
    for (const rawMessage of session.messages) {
      if (!rawMessage || typeof rawMessage !== "object") continue;
      const message = rawMessage as Record<string, unknown>;
      const role = messageRole(message.role);
      const messageId = safeText(message.id);
      const content = safeText(message.content);
      if (!role || !messageId || !content) continue;

      const messageKey = `${sessionId}\u0000${messageId}`;
      if (seenMessages.has(messageKey)) continue;
      seenMessages.add(messageKey);
      documents.push({
        kind: "message",
        sessionId,
        sessionTitle,
        messageId,
        role,
        text: content,
        updatedAt,
      });
    }
  }

  return createIndex(documents);
}

function createIndex(documents: SessionSearchDocument[]): SessionSearchIndex {
  return {
    documents,
    fuse: new Fuse(documents, {
      keys: [{ name: "text", weight: 1 }],
      threshold: 0.38,
      distance: 1_000,
      ignoreLocation: true,
      includeMatches: true,
      includeScore: true,
      minMatchCharLength: 1,
      shouldSort: true,
    }),
  };
}

export function searchSessionMessages(
  index: SessionSearchIndex,
  query: string,
  limit = DEFAULT_LIMIT
): SessionSearchHit[] {
  if (typeof query !== "string" || !query.trim()) return [];
  if (!index || !index.fuse || typeof index.fuse.search !== "function") return [];

  const resultLimit = safeLimit(limit);
  if (resultLimit === 0) return [];

  try {
    const results = index.fuse.search(query.trim());
    return results
      .map((result, position) => ({
        result,
        position,
        score: result.score ?? 1,
      }))
      .sort((a, b) => {
        const scoreDifference = a.score - b.score;
        if (Math.abs(scoreDifference) > MATCH_RELEVANCE_TOLERANCE) {
          return scoreDifference;
        }
        return (
          b.result.item.updatedAt - a.result.item.updatedAt ||
          a.position - b.position
        );
      })
      .slice(0, resultLimit)
      .map(({ result }) => {
        const document = result.item;
        return {
          sessionId: document.sessionId,
          sessionTitle: document.sessionTitle,
          ...(document.messageId ? { messageId: document.messageId } : {}),
          role: document.role,
          snippet: snippetFor(document.text, query.trim(), result.matches),
          updatedAt: document.updatedAt,
        };
      });
  } catch {
    return [];
  }
}
