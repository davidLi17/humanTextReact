import type { ChatMessage, ChatSession } from "./chatTypes";
import {
  extractJargonTerm,
  inferJargonDetails,
  type JargonInput,
  type JargonItem,
} from "./jargonStorage";
import { getSafeHttpUrl, type SelectionContext } from "./selectionContext";
import { parsePrismTranslation } from "./prismParser";
import { stripGroundedEvidenceBlock } from "./groundedGoal";

export interface JargonSaveDraft {
  item: JargonInput;
  explanationSource: "vernacular" | "full";
}

interface JargonDraftInput {
  rawTerm: string;
  rawExplanation: string;
  selectionContext?: SelectionContext;
  sourceContext?: string;
  sourceUrl?: string;
}

const MAX_SOURCE_CONTEXT_CHARS = 2000;

function cleanText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function boundedSourceContext(value: unknown): string | undefined {
  const cleaned = cleanText(value);
  return cleaned?.slice(0, MAX_SOURCE_CONTEXT_CHARS);
}

function resolveSourceUrl(
  selectionContext?: SelectionContext,
  sourceUrl?: string
): string | undefined {
  return (
    getSafeHttpUrl(selectionContext?.source?.url) || getSafeHttpUrl(sourceUrl)
  );
}

export function createJargonDraft({
  rawTerm,
  rawExplanation,
  selectionContext,
  sourceContext,
  sourceUrl,
}: JargonDraftInput): JargonSaveDraft {
  const raw = stripGroundedEvidenceBlock(
    typeof rawExplanation === "string" ? rawExplanation : ""
  );
  const parsed = parsePrismTranslation(raw);
  const vernacular = parsed.vernacular.trim();
  const explanation = vernacular || raw.trim();
  const explanationSource =
    parsed.isPrism && vernacular ? "vernacular" : "full";
  const preferredTerm =
    cleanText(selectionContext?.selectedText) || cleanText(rawTerm) || "黑话词条";
  const inferred = inferJargonDetails(preferredTerm, explanation);
  const normalizedSourceContext = selectionContext?.paragraph
    ? boundedSourceContext(selectionContext.paragraph)
    : cleanText(sourceContext);
  const item: JargonInput = {
    term: extractJargonTerm(preferredTerm),
    explanation,
    category: inferred.category,
    tags: inferred.tags,
    ...(inferred.analogy ? { analogy: inferred.analogy } : {}),
    ...(normalizedSourceContext
      ? {
          sourceContext: normalizedSourceContext,
        }
      : {}),
    ...(resolveSourceUrl(selectionContext, sourceUrl)
      ? { sourceUrl: resolveSourceUrl(selectionContext, sourceUrl) }
      : {}),
  };

  return { item, explanationSource };
}

function getImmediatePreviousUser(
  message: ChatMessage,
  session?: ChatSession
): ChatMessage | undefined {
  if (!session) return undefined;
  const index = session.messages.findIndex((candidate) => candidate.id === message.id);
  if (index <= 0) return undefined;
  const previous = session.messages[index - 1];
  return previous?.role === "user" ? previous : undefined;
}

export function createJargonDraftFromMessage(
  message: ChatMessage,
  session?: ChatSession
): JargonSaveDraft {
  const previousUser = getImmediatePreviousUser(message, session);
  const selectionContext = message.selectionContext || previousUser?.selectionContext;
  const pageMeta = previousUser?.pageMeta;
  const pageSourceContext = boundedSourceContext(pageMeta?.excerpt);
  const sourceContext = pageMeta
    ? selectionContext?.paragraph || pageSourceContext
    : selectionContext?.paragraph || previousUser?.content;
  const sourceUrl = pageMeta?.url;
  const rawTerm = pageMeta?.title || previousUser?.content || "黑话词条";

  return createJargonDraft({
    rawTerm,
    rawExplanation: message.content,
    selectionContext,
    sourceContext,
    sourceUrl,
  });
}

export function buildJargonFollowUpPrompt(item: JargonItem): string {
  const sections = [
    "请继续围绕下面的生词本词条回答我的问题。",
    `术语：${item.term}`,
    `人话释义：${item.explanation}`,
  ];
  if (item.sourceContext?.trim()) {
    sections.push(`原句或提问：${item.sourceContext.trim()}`);
  }
  const safeUrl = getSafeHttpUrl(item.sourceUrl);
  if (safeUrl) sections.push(`来源链接：${safeUrl}`);
  sections.push("我的问题：请结合这个语境说明它的实际用法和注意事项。", "");
  return sections.join("\n");
}
