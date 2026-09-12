import type {
  ChatImageContent,
  ChatMessage,
  ChatRole,
  MultimodalContentItem,
} from "./chatTypes";
import { DEFAULT_SETTINGS } from "./constants";
import { buildPrismSystemPrompt } from "./prismPrompt";
import {
  buildContextualSystemPrompt,
  buildContextualUserText,
  normalizeSelectionContext,
  type SelectionContext,
} from "./selectionContext";
import type { WebPageMetadata } from "./webReadingPrompt";

/** 单篇网页正文快照的保存上限。 */
export const MAX_ATTACHED_PAGE_CHARS = 160_000;
/** 全部会话共享的网页正文快照总额度。 */
export const MAX_TOTAL_ATTACHED_PAGE_CHARS = 500_000;
/** 网页范围选择器每段的字符数。 */
export const ATTACHED_PAGE_SEGMENT_CHARS = 16_000;
/** 发送模型前保守估算的默认字符上限。 */
export const DEFAULT_CHAT_REQUEST_MAX_CHARS = 48_000;

type PageMeta = NonNullable<ChatMessage["pageMeta"]>;
type AttachedPage = NonNullable<PageMeta["attachedPage"]>;

export type AttachedPageSnapshot = Omit<AttachedPage, "capturedChars"> & {
  /** 旧记录没有整页采集总量时保持未知。 */
  capturedChars?: number;
};

export interface AttachedPageSegment {
  /** 从 1 开始的段序号。 */
  index: number;
  /** 在快照中的 0 基起始下标。 */
  start: number;
  /** 在快照中的开区间结束下标。 */
  end: number;
  content: string;
  charCount: number;
  selected: boolean;
}

export interface ChatRequestBudgetMessage {
  role: ChatRole;
  content: string | MultimodalContentItem[] | Array<Record<string, unknown>>;
  images?: ChatImageContent[];
  selectionContext?: SelectionContext;
}

export interface ChatRequestBudgetOptions {
  systemPrompt?: string;
  maxChars?: number;
  selectionContext?: SelectionContext;
  prismMode?: boolean;
}

function createAttachedPage(
  page: WebPageMetadata,
  remainingChars: number
): AttachedPage {
  const rawContent = typeof page.content === "string" ? page.content : "";
  const snapshotLimit = Math.max(
    0,
    Math.min(MAX_ATTACHED_PAGE_CHARS, Math.floor(remainingChars))
  );
  const content = rawContent.slice(0, snapshotLimit);
  return {
    version: 1,
    content,
    capturedChars: rawContent.length,
    hasMoreContent: page.hasMoreContent === true,
    selectedSegments: content ? [1] : [],
  };
}

/**
 * 创建网页背景消息的持久化元数据。sourceContent 始终保留首段以兼容旧记录。
 */
export function createAttachedPageMeta(
  page: WebPageMetadata,
  remainingChars = MAX_TOTAL_ATTACHED_PAGE_CHARS
): PageMeta {
  const attachedPage = createAttachedPage(page, remainingChars);
  const sourceContent = attachedPage.content.slice(0, ATTACHED_PAGE_SEGMENT_CHARS);
  return {
    title: page.title,
    url: page.url,
    wordCount: page.wordCount,
    excerpt: page.excerpt ?? sourceContent.replace(/\s+/g, " ").trim().slice(0, 180),
    isWebPageReading: true,
    contextOnly: true,
    sourceContent,
    attachedPage,
    segmentIndex: 1,
    totalSegments: Math.max(1, Math.ceil(attachedPage.content.length / ATTACHED_PAGE_SEGMENT_CHARS)),
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeCapturedChars(
  value: unknown,
  contentLength: number
): number | undefined {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < contentLength
  ) {
    return undefined;
  }
  return value;
}

function normalizeSelectedIndices(
  indices: readonly unknown[],
  segmentCount: number
): number[] {
  const safeIndices = Array.isArray(indices) ? indices : [];
  return [
    ...new Set(
      safeIndices.filter(
        (index): index is number =>
          typeof index === "number" &&
          Number.isInteger(index) &&
          index >= 1 &&
          index <= segmentCount
      )
    ),
  ].sort((left, right) => left - right);
}

function normalizeAttachedPage(value: unknown): AttachedPageSnapshot | undefined {
  if (!isPlainObject(value) || value.version !== 1 || typeof value.content !== "string") {
    return undefined;
  }

  const content = value.content.slice(0, MAX_ATTACHED_PAGE_CHARS);
  const segmentCount = Math.ceil(content.length / ATTACHED_PAGE_SEGMENT_CHARS);
  const selectedSegments = Array.isArray(value.selectedSegments)
    ? normalizeSelectedIndices(value.selectedSegments, segmentCount)
    : [];
  const capturedChars = normalizeCapturedChars(value.capturedChars, content.length);

  return {
    version: 1,
    content,
    ...(capturedChars === undefined ? {} : { capturedChars }),
    hasMoreContent: value.hasMoreContent === true,
    selectedSegments,
    ...(value.legacyPartial === true ? { legacyPartial: true as const } : {}),
  };
}

function upgradeLegacyAttachedPage(meta: PageMeta): AttachedPageSnapshot | undefined {
  const sourceContent = meta?.sourceContent;
  if (typeof sourceContent !== "string" || !sourceContent) return undefined;
  return {
    version: 1,
    content: sourceContent.slice(0, ATTACHED_PAGE_SEGMENT_CHARS),
    hasMoreContent: false,
    selectedSegments: [1],
    legacyPartial: true,
  };
}

/** 读取并规范化网页正文快照；无效新结构才回退到有效的旧首段。 */
export function getAttachedPageSnapshot(
  meta: PageMeta
): AttachedPageSnapshot | undefined {
  return normalizeAttachedPage(meta?.attachedPage) ?? upgradeLegacyAttachedPage(meta);
}

/** 返回快照中的全部段及其当前选择状态。 */
export function getAttachedPageSegments(meta: PageMeta): AttachedPageSegment[] {
  const attachedPage = getAttachedPageSnapshot(meta);
  if (!attachedPage?.content) return [];
  const selected = new Set(attachedPage.selectedSegments);
  const segments: AttachedPageSegment[] = [];
  for (let start = 0, index = 1; start < attachedPage.content.length; start += ATTACHED_PAGE_SEGMENT_CHARS, index += 1) {
    const end = Math.min(start + ATTACHED_PAGE_SEGMENT_CHARS, attachedPage.content.length);
    const content = attachedPage.content.slice(start, end);
    segments.push({ index, start, end, content, charCount: content.length, selected: selected.has(index) });
  }
  return segments;
}

/**
 * 返回新元数据，不修改会话中原有消息。空数组表示用户本轮不带入该网页。
 * 旧 sourceContent 记录在首次调整选择时会升级为标注 legacyPartial 的快照。
 */
export function selectAttachedPageSegments(
  meta: PageMeta,
  indices: readonly number[]
): PageMeta {
  const attachedPage = getAttachedPageSnapshot(meta);
  if (!attachedPage) return { ...meta };
  const segmentCount = Math.ceil(attachedPage.content.length / ATTACHED_PAGE_SEGMENT_CHARS);
  const selectedSegments = normalizeSelectedIndices(indices, segmentCount);
  return {
    ...meta,
    attachedPage: { ...attachedPage, selectedSegments } as PageMeta["attachedPage"],
  };
}

function getRangeLabel(segment: AttachedPageSegment): string {
  return `第 ${segment.index} 段（字符 ${segment.start + 1}-${segment.end}）`;
}

/**
 * 重建网页背景 Prompt。已选段不会再次按 16k 截断；空选明确表示本轮禁用网页资料。
 */
export function buildAttachedPageReplayPrompt(meta: PageMeta): string {
  const attachedPage = getAttachedPageSnapshot(meta);
  if (!attachedPage) {
    return "该网页没有可用的背景资料，请仅根据用户接下来的问题作答。";
  }
  const selectedSegments = getAttachedPageSegments(meta).filter((segment) => segment.selected);
  if (selectedSegments.length === 0) {
    return "该网页当前未选入正文范围，已禁用此网页背景资料。请仅根据用户接下来的问题作答。";
  }
  const title =
    typeof meta.title === "string" ? meta.title.trim() || "未知网页标题" : "未知网页标题";
  const url = typeof meta.url === "string" ? meta.url.trim() : "";
  const content = selectedSegments
    .map((segment) => `【${getRangeLabel(segment)}】\n${segment.content}`)
    .join("\n\n");
  const captureNote = attachedPage.legacyPartial
    ? "这条历史记录只保留了当时的首段正文，未声明整页完整性。"
    : attachedPage.capturedChars === undefined
      ? "已采集正文数量未知。"
      : `已采集正文 ${attachedPage.capturedChars} 字符。`;
  const hasMoreNote = attachedPage.hasMoreContent
    ? "页面可能还有未加载的内容。"
    : "";
  return [
    `【网页标题】: ${title}`,
    url ? `【来源链接】: ${url}` : "",
    `【本次选入范围】: ${selectedSegments.map(getRangeLabel).join("、")}`,
    `【网页采集情况】: ${captureNote}${hasMoreNote ? ` ${hasMoreNote}` : ""}`,
    "",
    "【网页正文内容】：",
    "```text",
    content,
    "```",
    "",
    "以上内容已作为背景资料附加到本次对话。请结合后续提问作答；除非用户明确要求，不要主动输出摘要或速读报告。",
  ].filter(Boolean).join("\n");
}

function textFromContent(content: ChatRequestBudgetMessage["content"]): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((item): item is { type: string; text: string } =>
      typeof item === "object" && item !== null && item.type === "text" && typeof item.text === "string"
    )
    .map((item) => item.text)
    .join("");
}

function countMessageContent(
  message: ChatRequestBudgetMessage,
  context?: SelectionContext
): number {
  const baseText = textFromContent(message.content);
  return context && message.role === "user"
    ? buildContextualUserText(baseText, context).length
    : baseText.length;
}

/**
 * 估算实际请求中的文本字符数。图片 data URL / base64 不计入字符预算。
 */
export function countChatRequestChars(
  messages: readonly ChatRequestBudgetMessage[],
  options: ChatRequestBudgetOptions = {}
): number {
  const normalizedTopLevelContext = normalizeSelectionContext(options.selectionContext);
  const normalizedMessageContexts = messages.map((message) =>
    message.role === "user" ? normalizeSelectionContext(message.selectionContext) : undefined
  );
  const lastUserIndex = messages.map((message) => message.role).lastIndexOf("user");
  const hasContext = Boolean(normalizedTopLevelContext || normalizedMessageContexts.some(Boolean));
  const hasSystemMessage = messages.some((message) => message.role === "system");
  let chars = 0;

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    const context = normalizedMessageContexts[index] || (index === lastUserIndex ? normalizedTopLevelContext : undefined);
    let textLength = countMessageContent(message, context);
    if (message.role === "system" && typeof message.content === "string") {
      let systemText = message.content;
      if (hasContext) systemText = buildContextualSystemPrompt(systemText);
      if (options.prismMode && !systemText.includes("网页全文通读")) {
        systemText = buildPrismSystemPrompt(systemText);
      }
      textLength = systemText.length;
    }
    chars += textLength;
  }

  if (!hasSystemMessage) {
    let systemText = options.systemPrompt || DEFAULT_SETTINGS.promptTemplate;
    if (hasContext) systemText = buildContextualSystemPrompt(systemText);
    if (options.prismMode) systemText = buildPrismSystemPrompt(systemText);
    chars += systemText.length;
  }
  return chars;
}

export function checkChatRequestBudget(
  messages: readonly ChatRequestBudgetMessage[],
  options: ChatRequestBudgetOptions = {}
): { ok: boolean; chars: number; maxChars: number; error?: string } {
  const maxChars = options.maxChars ?? DEFAULT_CHAT_REQUEST_MAX_CHARS;
  const chars = countChatRequestChars(messages, options);
  if (chars <= maxChars) return { ok: true, chars, maxChars };
  return {
    ok: false,
    chars,
    maxChars,
    error: `本次请求约 ${chars} 个字符，超过 ${maxChars} 个字符的保守上限。请缩减所选网页段落或新建会话后再试。`,
  };
}
