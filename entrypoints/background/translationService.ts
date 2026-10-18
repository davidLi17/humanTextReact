import {
  DEFAULT_SETTINGS,
  MESSAGE_TYPES,
} from "@/entrypoints/shared/constants";
import {
  CodedError,
  createApiError,
  resolveUserErrorMessage,
} from "@/entrypoints/shared/errors";
import { createLogger } from "@/entrypoints/shared/logger";
import { SettingsUtils } from "@/entrypoints/shared/settingsUtils";
import {
  buildContextualSystemPrompt,
  buildContextualUserText,
  normalizeSelectionContext,
  type SelectionContext,
} from "@/entrypoints/shared/selectionContext";
import { HistoryManager } from "./historyManager";
import { MessageUtils } from "./messageUtils";
import { RequestManager, type RequestContext } from "./requestManager";
import {
  getRequestTimeoutRuntime,
  isRequestTimeoutError,
  RequestTimeoutGuard,
} from "@/entrypoints/shared/requestTimeout";
import type { TranslationResultSource } from "@/entrypoints/shared/jargonReuse";
import {
  getJargonReuseTerm,
  JARGON_VAULT_RESULT_SOURCE,
} from "@/entrypoints/shared/jargonReuse";
import { findExactJargonItem } from "@/entrypoints/shared/jargonStorage";
import { buildPrismSystemPrompt } from "@/entrypoints/shared/prismPrompt";
import { buildModelParams } from "@/entrypoints/shared/modelCatalog";
import { stripGroundedEvidenceBlock } from "@/entrypoints/shared/groundedGoal";
import { checkChatRequestBudget } from "@/entrypoints/shared/pageContext";

import { GENUI_SYSTEM_PROMPT } from "@/entrypoints/shared/genui/prompt";
import type { GenUiAttachment } from "@/entrypoints/shared/genui/types";
import { AUTO_GENUI_TOO_LARGE_TEXT, GenUiOutputBuffer, GENUI_FAILURE_TEXT, validateGenUiRequest, describeGenUiValidationError, readableSpecSummary, type GenUiRequest } from "./genUiOutput";
import {
  AUTO_GENUI_CAPABILITY_PROMPT,
  RENDER_INTERACTIVE_EXPLANATION_TOOL_NAME,
  renderInteractiveExplanationTool,
} from "@/entrypoints/shared/genui/tool";
import { createGenUiPreview } from "@/entrypoints/shared/genui/streamPreview";
import { AUTO_GENUI_FALLBACK_MAX_CHARS } from "@/entrypoints/shared/genui/parse";

const logger = createLogger("translation-service", "🌐");

export const LOCAL_RESULT_DELIVERY_TIMEOUT_MS = 5_000;
let localResultDeliveryTimeoutMs = LOCAL_RESULT_DELIVERY_TIMEOUT_MS;

/** 仅供自动化测试缩短本地终态消息等待；传空值恢复生产默认值。 */
export function setLocalResultDeliveryTimeoutForTests(timeoutMs?: number): void {
  localResultDeliveryTimeoutMs =
    timeoutMs ?? LOCAL_RESULT_DELIVERY_TIMEOUT_MS;
}

async function waitForLocalResultDelivery(
  operation: Promise<boolean>,
  signal: AbortSignal
): Promise<boolean> {
  const clock = getRequestTimeoutRuntime().clock;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let handleAbort: (() => void) | undefined;

  const interrupted = new Promise<false>((resolve) => {
    if (signal.aborted) {
      resolve(false);
      return;
    }
    handleAbort = () => resolve(false);
    signal.addEventListener("abort", handleAbort, { once: true });
    timeoutId = clock.setTimeout(
      () => resolve(false),
      localResultDeliveryTimeoutMs
    );
  });

  try {
    return await Promise.race([operation, interrupted]);
  } finally {
    if (timeoutId !== undefined) clock.clearTimeout(timeoutId);
    if (handleAbort) signal.removeEventListener("abort", handleAbort);
  }
}

export interface ImageContent {
  data: string;
  mimeType: string;
  fileName?: string;
}

export interface ChatRoleMessage {
  role: "system" | "user" | "assistant";
  content: string | any[];
  images?: ImageContent[];
  selectionContext?: SelectionContext;
}

export interface TranslationParams {
  text?: string;
  messages?: ChatRoleMessage[];
  images?: ImageContent[];
  thinkingEnabled?: boolean;
  temperature?: number;
  promptTemplate?: string;
  apiKey?: string;
  selectionContext?: SelectionContext;
  bypassJargonVault?: boolean;
  prismMode?: boolean;
  responseMode?: "text" | "genui-v1";
  genUiRequest?: GenUiRequest;
  /** Let a normal sidepanel answer optionally attach a validated interactive explanation. */
  autoGenUi?: boolean;
}

interface StreamChunk {
  content: string;
  reasoningContent: string;
  done: boolean;
  /** 末帧携带的 finish_reason（stop/length/…）；整个流未出现时为 null */
  finishReason: string | null;
  meaningfulOutput: boolean;
  toolCalls: ToolCallDelta[];
}

interface ToolCallDelta {
  index: number;
  id?: string;
  name?: string;
  arguments?: string;
}

interface ToolCallState {
  id?: string;
  name?: string;
}

const GENUI_WARNING_TEXT = "交互讲解未通过校验，已保留文字回答。";
const GENUI_TOOL_UNAVAILABLE_WARNING = "当前模型未提供交互讲解，已保留文字回答。";

function readToolFallbackText(argumentsText: string): string | undefined {
  try {
    const value = JSON.parse(argumentsText);
    const fallbackText = value?.fallbackText;
    return typeof fallbackText === "string" && fallbackText.trim() && fallbackText.length <= AUTO_GENUI_FALLBACK_MAX_CHARS
      ? fallbackText
      : undefined;
  } catch {
    return undefined;
  }
}

function isToolParameterRejected(status: number, body: string): boolean {
  if (![400, 404, 422, 501].includes(status)) return false;
  const message = body.toLowerCase();
  return message.includes("tool") &&
    ["unsupported", "not support", "unknown parameter", "unrecognized", "invalid parameter", "not allowed"].some(
      (phrase) => message.includes(phrase)
    );
}

/**
 * 流式异常终止：连接在生成中途断开，或模型因长度上限被截断。
 * 两者都必须保留已收到内容并走错误路径，而不是当作完整结果交付或写进历史。
 */
function isStreamTerminationError(
  error: unknown
): error is CodedError & { code: "TRUNCATED" | "INTERRUPTED" } {
  return (
    error instanceof CodedError &&
    (error.code === "TRUNCATED" || error.code === "INTERRUPTED")
  );
}

function releaseStreamReader(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  cancel: boolean,
  silent = false
): void {
  if (cancel) {
    try {
      void Promise.resolve(reader.cancel()).catch((error) =>
        silent ? undefined : logger.warn("取消响应流失败:", error)
      );
    } catch (error) {
      silent ? undefined : logger.warn("取消响应流失败:", error);
    }
  }
  try {
    reader.releaseLock();
  } catch {
    // read/cancel 尚未结算时可能无法释放锁；已挂接拒绝处理，不阻塞上层结束。
  }
}

/**
 * 格式化单条消息内容为符合多模态 API 要求的结构
 */
export function formatMultimodalContent(
  content: string | any[],
  images?: ImageContent[]
): string | any[] {
  if (Array.isArray(content)) {
    // 若已有数组结构且传入了额外的 images，则补充尚未包含的图片
    if (images && images.length > 0) {
      const existingUrls = new Set(
        content
          .filter((item) => item?.type === "image_url")
          .map((item) => item?.image_url?.url)
      );
      const newImageItems = images
        .filter((img) => !existingUrls.has(img.data))
        .map((img) => ({
          type: "image_url" as const,
          image_url: { url: img.data },
        }));
      return [...newImageItems, ...content];
    }
    return content;
  }

  const text = typeof content === "string" ? content : "";
  if (!images || images.length === 0) {
    return text;
  }

  const userContent: any[] = [];
  images.forEach((image) => {
    userContent.push({
      type: "image_url",
      image_url: { url: image.data },
    });
  });
  userContent.push({ type: "text", text });

  return userContent;
}

/**
 * 组装发送给 LLM 的 messages 数组
 */
export function buildMessagesPayload(
  params: {
    text?: string;
    messages?: ChatRoleMessage[];
    images?: ImageContent[];
    promptTemplate?: string;
    selectionContext?: SelectionContext;
    prismMode?: boolean;
  }
): any[] {
  const {
    text = "",
    messages: chatMessages,
    images = [],
    promptTemplate = DEFAULT_SETTINGS.promptTemplate,
    selectionContext,
    prismMode = false,
  } = params;

  const normalizedTopLevelContext = normalizeSelectionContext(selectionContext);
  const normalizedMessageContexts =
    chatMessages?.map((message) =>
      message.role === "user"
        ? normalizeSelectionContext(message.selectionContext)
        : undefined
    ) || [];
  const hasContext = Boolean(
    normalizedTopLevelContext || normalizedMessageContexts.some(Boolean)
  );
  let systemPrompt = hasContext
    ? buildContextualSystemPrompt(promptTemplate)
    : promptTemplate;

  if (prismMode) {
    systemPrompt = buildPrismSystemPrompt(systemPrompt);
  }

  if (chatMessages && chatMessages.length > 0) {
    const hasSystem = chatMessages.some((m) => m.role === "system");
    const formattedMessages: any[] = [];

    // 找到最后一条 user 消息的索引（用于注入 params.images）
    let lastUserIndex = -1;
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      if (chatMessages[i].role === "user") {
        lastUserIndex = i;
        break;
      }
    }

    chatMessages.forEach((msg, idx) => {
      const isLastUser = idx === lastUserIndex;
      const messageContext =
        normalizedMessageContexts[idx] ||
        (isLastUser ? normalizedTopLevelContext : undefined);
      let contextualContent = msg.content;
      if (messageContext && typeof msg.content === "string") {
        contextualContent = buildContextualUserText(msg.content, messageContext);
      } else if (messageContext && Array.isArray(msg.content)) {
        let contextApplied = false;
        contextualContent = msg.content.map((item) => {
          if (
            !contextApplied &&
            item?.type === "text" &&
            typeof item.text === "string"
          ) {
            contextApplied = true;
            return {
              ...item,
              text: buildContextualUserText(item.text, messageContext),
            };
          }
          return item;
        });
        if (!contextApplied) {
          contextualContent = [
            ...contextualContent,
            {
              type: "text",
              text: buildContextualUserText("", messageContext),
            },
          ];
        }
      }
      // 合并当前轮次自身的 msg.images 和顶层传入的 params.images（如果是最后一条 user 消息）
      const combinedImages: ImageContent[] = [
        ...(msg.images || []),
        ...(isLastUser && images.length > 0 ? images : []),
      ];

      // 去重图片数据（避免同一图片被重复添加）
      const uniqueImages = combinedImages.filter(
        (img, index, self) =>
          index === self.findIndex((t) => t.data === img.data)
      );

      formattedMessages.push({
        role: msg.role,
        content: formatMultimodalContent(contextualContent, uniqueImages),
      });
    });

    if (hasContext || prismMode) {
      const existingSystem = formattedMessages.find(
        (message) => message.role === "system" && typeof message.content === "string"
      );
      if (existingSystem) {
        if (hasContext) {
          existingSystem.content = buildContextualSystemPrompt(existingSystem.content);
        }
        if (prismMode && !existingSystem.content.includes("网页全文通读")) {
          existingSystem.content = buildPrismSystemPrompt(existingSystem.content);
        }
      }
    }

    return hasSystem
      ? formattedMessages
      : [{ role: "system", content: systemPrompt }, ...formattedMessages];
  }

  const userText = normalizedTopLevelContext
    ? buildContextualUserText(text, normalizedTopLevelContext)
    : text;
  const formattedUserContent = formatMultimodalContent(userText, images);
  return [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: formattedUserContent,
    },
  ];
}

/**
 * 翻译服务只消费已经登记的请求上下文，不自行推断请求归属。
 */
export class TranslationService {
  /**
   * 将本地结果按与模型流相同的请求归属、消息和历史协议交付给界面。
   */
  private static async deliverLocalResult(
    original: string,
    content: string,
    resultSource: TranslationResultSource,
    requestContext: RequestContext
  ): Promise<string | void> {
    const { requestId, controller } = requestContext;
    if (!RequestManager.isActiveRequest(requestId)) return;

    const delivered = await waitForLocalResultDelivery(
      this.sendTranslationUpdate(
        requestContext,
        content,
        "",
        true,
        resultSource
      ),
      controller.signal
    );
    if (!delivered || !RequestManager.isActiveRequest(requestId)) return;

    // 成功终态已经交付，历史落盘不再阻塞请求进入 finally 完成清理。
    void HistoryManager.saveTranslationHistory(
      original,
      stripGroundedEvidenceBlock(content),
      "",
      resultSource
    )
      .catch((error) =>
        logger.error("保存本地生词本结果历史失败:", error)
      );
    return content;
  }

  static async translateText(
    params: TranslationParams,
    requestContext: RequestContext
  ): Promise<string | void> {
    const genUiMode = params.responseMode === "genui-v1";
    let autoGenUi = params.responseMode === "text" && params.autoGenUi === true;
    const genUiOutput = genUiMode ? new GenUiOutputBuffer() : undefined;
    const autoGenUiOutput = autoGenUi ? new GenUiOutputBuffer() : undefined;
    let genUiRequest: GenUiRequest | undefined;
    const {
      text = "",
      messages: chatMessages,
      images = [],
      thinkingEnabled = false,
    } = params;
    const { requestId, target, controller } = requestContext;
    const timeoutGuard = new RequestTimeoutGuard(controller, {
      thinkingEnabled,
    });
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let streamFinished = false;
    let result = "";
    let reasoningContent = "";
    let localResultSelected = false;
    let autoToolState: ToolCallState | undefined;
    let autoToolInvalid = false;
    let autoToolTooLarge = false;
    let autoToolBytes = 0;
    let autoToolParsed = false;
    let toolsRejectedByProvider = false;
    const autoPreviewId = `${requestId}:genui-preview`;
    let lastPreviewSignature: string | undefined;
    let latestGenUiPreview: GenUiAttachment | undefined;
    let streamFinishReason: string | null = null;

    logger.log("🚀 [TranslationService] 开始翻译", {
      requestId,
      target,
      textLength: text.length,
      chatMessagesCount: chatMessages?.length || 0,
      imagesCount: images.length,
      thinkingEnabled,
      timestamp: new Date().toISOString(),
    });

    try {
      if (params.responseMode !== undefined && params.responseMode !== "text" && !genUiMode) {
        throw new Error("不支持的响应模式");
      }
      if (genUiMode) {
        if (target.kind !== "sidepanel" || !target.sessionId) throw new Error(GENUI_FAILURE_TEXT);
        genUiRequest = validateGenUiRequest(params.genUiRequest);
      }
      const jargonTerm = genUiMode ? undefined : getJargonReuseTerm(params);
      if (jargonTerm) {
        let savedItem;
        try {
          savedItem = await findExactJargonItem(jargonTerm);
        } catch (error) {
          logger.warn("读取生词本自动复用项失败，继续正常翻译:", error);
        }

        // 本地读取期间可能发生停止或同目标替换，旧请求不得继续调用模型。
        if (!RequestManager.isActiveRequest(requestId)) return;

        if (savedItem) {
          localResultSelected = true;
          // 与模型流保持相同终态顺序：先停止首输出、总时长与保活计时器。
          timeoutGuard.completeStream();
          return await this.deliverLocalResult(
            jargonTerm,
            savedItem.explanation,
            JARGON_VAULT_RESULT_SOURCE,
            requestContext
          );
        }
      }

      const config = await timeoutGuard.run(SettingsUtils.getSettings());
      const apiKey = params.apiKey || config.apiKey;
      if (!SettingsUtils.isApiKeyConfigured(apiKey)) {
        throw new Error("请先在设置中配置 API Key");
      }

      const promptTemplate =
        params.promptTemplate ||
        config.promptTemplate ||
        DEFAULT_SETTINGS.promptTemplate;

      const prismMode = genUiMode ? false : params.prismMode ?? config.prismModeEnabled ?? false;
      // Prism answers have a fixed readable format, so leave that flow text-only.
      if (prismMode) autoGenUi = false;
      if (autoGenUi) {
        if (target.kind !== "sidepanel" || !target.sessionId) throw new Error(GENUI_FAILURE_TEXT);
        genUiRequest = validateGenUiRequest(params.genUiRequest);
      }
      const messagesPayload = buildMessagesPayload({
        text,
        messages: genUiMode ? chatMessages?.filter((message) => message.role !== "system") : chatMessages,
        images,
        promptTemplate: genUiMode ? GENUI_SYSTEM_PROMPT : promptTemplate,
        selectionContext: params.selectionContext,
        prismMode,
      });

      if (genUiMode) messagesPayload[0] = { role: "system", content: GENUI_SYSTEM_PROMPT };

      // A separate system segment preserves the user's own prompt verbatim and
      // can be removed together with tools for incompatible providers.
      const requestMessages = autoGenUi
        ? [{ role: "system", content: AUTO_GENUI_CAPABILITY_PROMPT }, ...messagesPayload]
        : messagesPayload;

      if (autoGenUi) {
        const budget = checkChatRequestBudget(requestMessages, {
          systemPrompt: promptTemplate,
          prismMode,
        });
        const chars = budget.chars + JSON.stringify(renderInteractiveExplanationTool).length;
        if (!budget.ok || chars > budget.maxChars) {
          throw new Error(
            `本次请求约 ${chars} 个字符，超过 ${budget.maxChars} 个字符的保守上限。请缩减所选网页段落或新建会话后再试。`
          );
        }
      }

      // 模型/提供商相关字段统一由 modelCatalog 决策（temperature 也在其中，
      // Kimi 等不认 temperature 的提供商会自行省略，不要在这里再写一遍）。
      const requestBody: any = {
        model: config.model || DEFAULT_SETTINGS.model,
        messages: requestMessages,
        stream: true,
        ...buildModelParams({
          baseUrl: config.baseUrl || DEFAULT_SETTINGS.baseUrl,
          model: config.model || DEFAULT_SETTINGS.model,
          thinkingEnabled,
          temperature:
            params.temperature ??
            config.temperature ??
            DEFAULT_SETTINGS.temperature,
        }),
      };
      if (autoGenUi) {
        requestBody.tools = [renderInteractiveExplanationTool];
        requestBody.tool_choice = "auto";
      }

      timeoutGuard.startFetchHeadersTimeout();
      let response: Response;
      let responseErrorBody: string | undefined;
      try {
        response = await timeoutGuard.run(
          fetch(config.baseUrl || DEFAULT_SETTINGS.baseUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          })
        );
        if (autoGenUi && !response.ok) {
          const body = await timeoutGuard.runStage(response.text(), "error-body");
          if (isToolParameterRejected(response.status, body)) {
            toolsRejectedByProvider = true;
            const { tools: _tools, tool_choice: _toolChoice, ...textRequestBody } = requestBody;
            textRequestBody.messages = messagesPayload;
            response = await timeoutGuard.run(
              fetch(config.baseUrl || DEFAULT_SETTINGS.baseUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify(textRequestBody),
                signal: controller.signal,
              })
            );
          } else {
            responseErrorBody = body;
          }
        }
      } finally {
        timeoutGuard.markFetchHeadersReceived();
      }

      if (!response.ok) {
        if (genUiMode) {
          void response.body?.cancel().catch(() => {});
          throw new Error(GENUI_FAILURE_TEXT);
        }
        // 走到这里时响应体尚未被流式读取消费，可安全读取；
        // 用服务商返回的具体原因（如"余额不足""模型无权限"）构造带错误码的错误
        const errorBodyText = responseErrorBody ?? await timeoutGuard
          .runStage(response.text(), "error-body")
          .catch((error) => {
            if (isRequestTimeoutError(error) || error?.name === "AbortError") {
              throw error;
            }
            return "";
          });
        timeoutGuard.completeStream();
        throw createApiError(response.status, errorBodyText, "API 请求失败");
      }
      if (!response.body) {
        timeoutGuard.completeStream();
        throw new Error("API 响应为空，请检查接口兼容性");
      }

      const streamReader = response.body.getReader();
      reader = streamReader;
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      // 正常终止的两种凭据：data: [DONE] 标记，或任意一帧带 finish_reason。
      // 两者都没有却读到 EOF，即为中途断流。
      let sawDoneMarker = false;
      while (!streamFinished) {
        const { value, done } = await timeoutGuard.run(streamReader.read());

        if (value) {
          buffer += decoder.decode(value, { stream: true });
        }
        if (done) {
          buffer += decoder.decode();
        }

        if (genUiMode && new TextEncoder().encode(buffer).byteLength > 262_144) {
          throw new Error(GENUI_FAILURE_TEXT);
        }
        const lines = buffer.split(/\r?\n/);
        buffer = done ? "" : lines.pop() || "";
        const currentChunk = this.parseStreamLines(lines, genUiMode);

        if (autoGenUi && currentChunk.toolCalls.length) {
          for (const toolCall of currentChunk.toolCalls) {
            if (toolCall.index !== 0) {
              autoToolInvalid = true;
              continue;
            }
            if (!autoToolState) autoToolState = {};
            if (toolCall.id) {
              if (autoToolState.id && autoToolState.id !== toolCall.id) autoToolInvalid = true;
              autoToolState.id = toolCall.id;
            }
            if (toolCall.name) {
              if (autoToolState.name && autoToolState.name !== toolCall.name) autoToolInvalid = true;
              autoToolState.name = toolCall.name;
            }
            if (toolCall.arguments) {
              autoToolBytes += new TextEncoder().encode(toolCall.arguments).byteLength;
              if (autoToolInvalid) continue;
              try {
                autoGenUiOutput?.append(toolCall.arguments);
              } catch {
                autoToolInvalid = true;
                autoToolTooLarge = true;
              }
            }
          }
        }

        let previewChanged = false;
        if (
          autoGenUi &&
          genUiRequest &&
          autoToolState?.name === RENDER_INTERACTIVE_EXPLANATION_TOOL_NAME
        ) {
          const preview = createGenUiPreview(
            autoGenUiOutput?.getRaw() || "",
            genUiRequest,
            autoPreviewId
          );
          if (preview) {
            const signature = JSON.stringify(preview.spec);
            if (signature !== lastPreviewSignature) {
              lastPreviewSignature = signature;
              latestGenUiPreview = preview;
              previewChanged = true;
            }
          }
        }

        if (currentChunk.done) {
          sawDoneMarker = true;
        }
        if (currentChunk.finishReason) {
          streamFinishReason = currentChunk.finishReason;
          if (genUiMode && streamFinishReason !== "stop") throw new Error(GENUI_FAILURE_TEXT);
        }

        if (currentChunk.content || currentChunk.reasoningContent || currentChunk.meaningfulOutput) {
          if (genUiOutput) genUiOutput.append(currentChunk.content);
          else {
            result += currentChunk.content;
            reasoningContent += currentChunk.reasoningContent;
          }

          if (
            currentChunk.meaningfulOutput
          ) {
            timeoutGuard.markMeaningfulOutput();
          }

          const delivered = genUiMode ? RequestManager.isActiveRequest(requestId) : await timeoutGuard.run(
            this.sendTranslationUpdate(
              requestContext,
              result,
              reasoningContent,
              false,
              undefined,
              autoGenUi && genUiRequest
                ? {
                    assistantMessageId: genUiRequest.assistantMessageId,
                    genUiPending: Boolean(autoToolState),
                    ...(previewChanged ? { genUiPreview: latestGenUiPreview } : {}),
                  }
                : undefined
            )
          );
          if (!delivered) {
            logger.log("翻译接收端已关闭或请求已过期", { requestId });
            RequestManager.cleanupRequest(requestId);
            return;
          }
        }

        streamFinished = done || currentChunk.done;
        if (currentChunk.done && !done) {
          releaseStreamReader(streamReader, true, genUiMode);
          reader = undefined;
        }
      }

      timeoutGuard.completeStream();

      if (!genUiMode && !autoGenUi && !result.trim()) {
        throw new Error("模型未返回可显示内容，请检查模型或接口兼容性");
      }

      // 读到 EOF 却没有任何终止凭据，说明连接在生成中途被断开
      // （代理或网关超时、服务端崩溃、进程被杀）。
      // 此时 result 只是残片，既不能当完整结果交付，也不能写进历史。
      if (!sawDoneMarker && streamFinishReason === null) {
        throw new CodedError(
          "连接在生成过程中中断，已显示的内容可能不完整，请重试",
          "INTERRUPTED"
        );
      }
      if (streamFinishReason === "length") {
        throw new CodedError(
          "模型输出达到长度上限，内容可能不完整，请重试或缩短输入",
          "TRUNCATED"
        );
      }

      // Never parse an incomplete/cancelled stream, even if its prefix is valid JSON.
      if (!RequestManager.isActiveRequest(requestId) || controller.signal.aborted) return;
      if (autoGenUi && autoToolState && streamFinishReason !== "tool_calls") {
        autoToolInvalid = true;
      }
      const generated = genUiOutput && genUiRequest ? genUiOutput.finish(genUiRequest) : undefined;
      if (generated) result = generated.fallbackText;
      let autoGenerated: ReturnType<GenUiOutputBuffer["finish"]> | undefined;
      let genUiWarning: string | undefined;
      let genUiValidationFailure: string | undefined;
      if (autoGenUi && genUiRequest) {
        const toolArguments = autoGenUiOutput?.getRaw();
        if (autoToolTooLarge) {
          genUiWarning = "交互讲解内容过长，已保留文字回答。";
        } else if (autoToolState && autoToolState.name === RENDER_INTERACTIVE_EXPLANATION_TOOL_NAME && !autoToolInvalid && toolArguments) {
          try {
            autoGenerated = autoGenUiOutput!.finishAuto(genUiRequest, autoPreviewId);
            autoToolParsed = true;
          } catch (error) {
            genUiValidationFailure = describeGenUiValidationError(error);
            logger.warn("交互讲解最终校验失败", { reason: genUiValidationFailure });
            genUiWarning = `${GENUI_WARNING_TEXT}原因：${genUiValidationFailure}。`;
          }
        } else if (autoToolState) {
          genUiWarning = GENUI_WARNING_TEXT;
        }
        const fallbackText = autoToolTooLarge ? undefined
          : (toolArguments ? readToolFallbackText(toolArguments) : undefined)
            // Keep readable preview text only. A chart preview may have shortened arrays;
            // never persist those as a successfully validated final chart or numeric answer.
            || (genUiValidationFailure && latestGenUiPreview ? readableSpecSummary(latestGenUiPreview.spec, false) : undefined);
        if (!result.trim() && autoGenerated) result = autoGenerated.fallbackText;
        if (!result.trim() && fallbackText) result = fallbackText;
        if (!result.trim()) {
          throw new Error(autoToolTooLarge ? AUTO_GENUI_TOO_LARGE_TEXT : genUiValidationFailure ? `交互讲解未能渲染：${genUiValidationFailure}，请重试。` : "模型未返回可显示内容，请检查模型或接口兼容性");
        }
        if (!genUiWarning && toolsRejectedByProvider) genUiWarning = GENUI_TOOL_UNAVAILABLE_WARNING;
      }
      const finalDelivered = await this.sendTranslationUpdate(
        requestContext,
        result,
        reasoningContent,
        true,
        undefined,
        generated
          ? { genUi: generated.attachment, assistantMessageId: genUiRequest!.assistantMessageId }
          : autoGenUi && genUiRequest
            ? {
                assistantMessageId: genUiRequest.assistantMessageId,
                genUiPending: false,
                genUiWarning,
                ...(autoGenerated
                  ? {
                      genUi: autoGenerated.attachment,
                    }
                  : {}),
              }
            : undefined
      );
      if (!finalDelivered) {
        RequestManager.cleanupRequest(requestId);
        return;
      }

      if (autoGenUi) {
        logger.log("自动交互工具流结束", {
          requestId,
          finishReason: streamFinishReason,
          toolBytes: autoToolBytes,
          toolName: autoToolState?.name || "none",
          previewExists: Boolean(latestGenUiPreview),
          parsed: autoToolParsed,
          tooLarge: autoToolTooLarge,
        });
      }

      if (RequestManager.isActiveRequest(requestId)) {
        try {
          await HistoryManager.saveTranslationHistory(
            text,
            stripGroundedEvidenceBlock(result),
            reasoningContent
          );
        } catch (error) {
          logger.error("保存翻译历史失败:", error);
        }
      }

      return result;
    } catch (error: any) {
      if (genUiMode) {
        if (error?.name === "AbortError" || !RequestManager.isActiveRequest(requestId)) return;
        await this.sendTranslationError(requestContext, GENUI_FAILURE_TEXT, "", "", genUiRequest?.assistantMessageId);
        // Provider/parser errors can quote raw model data: never log or propagate them.
        throw new Error(GENUI_FAILURE_TEXT);
      }
      if (isRequestTimeoutError(error)) {
        const message = this.normalizeErrorMessage(error);
        logger.error("🚀lhg[TranslationService][请求超时]", {
          requestId,
          stage: error.stage,
          target,
        });
        if (RequestManager.isActiveRequest(requestId)) {
          await this.sendTranslationError(
            requestContext,
            message,
            result,
            reasoningContent,
            autoGenUi ? genUiRequest?.assistantMessageId : undefined
          );
        }
        throw error;
      }
      if (isStreamTerminationError(error)) {
        const message = this.normalizeErrorMessage(error);
        logger.error("🚀lhg[TranslationService][流式异常终止]", {
          requestId,
          code: error.code,
          receivedChars: result.length,
          target,
        });
        if (RequestManager.isActiveRequest(requestId)) {
          // 与超时路径一致：把已收到的正文与思考内容一并交付，
          // 用户仍能看到中断前的内容，只是不会被当成完整结果。
          await this.sendTranslationError(
            requestContext,
            message,
            result,
            reasoningContent,
            autoGenUi ? genUiRequest?.assistantMessageId : undefined
          );
        }
        throw error;
      }
      if (error.name === "AbortError") {
        logger.log("翻译请求已中止", { requestId });
        return;
      }

      const message = this.normalizeErrorMessage(error);
      logger.error("翻译过程中出现错误:", error, {
        requestId,
        finishReason: streamFinishReason,
        toolBytes: autoToolBytes,
        toolName: autoToolState?.name || "none",
        previewExists: Boolean(latestGenUiPreview),
        parsed: autoToolParsed,
        tooLarge: autoToolTooLarge,
      });
      if (localResultSelected) {
        // 本地终态交付失败时直接结束，避免再次发送消息或误入模型流程。
        throw new Error(message);
      }
      if (RequestManager.isActiveRequest(requestId)) {
        await this.sendTranslationError(
          requestContext,
          message,
          result,
          reasoningContent,
          autoGenUi ? genUiRequest?.assistantMessageId : undefined
        );
      }
      throw new Error(message);
    } finally {
      if (reader) {
        releaseStreamReader(reader, !streamFinished, genUiMode);
      }
      genUiOutput?.clear();
      autoGenUiOutput?.clear();
      timeoutGuard.dispose();
      RequestManager.completeRequest(requestId);
    }
  }

  private static parseStreamLines(lines: string[], genUiMode = false): StreamChunk {
    const chunk: StreamChunk = {
      content: "",
      reasoningContent: "",
      done: false,
      finishReason: null,
      meaningfulOutput: false,
      toolCalls: [],
    };

    for (const line of lines) {
      const normalizedLine = line.trim();
      if (!normalizedLine.startsWith("data:")) continue;

      const data = normalizedLine.slice(5).trimStart();
      if (!data) continue;
      if (data === "[DONE]") {
        chunk.done = true;
        if (genUiMode) break;
        continue;
      }

      try {
        const parsed = JSON.parse(data);
        const choice = parsed?.choices?.[0];
        // finish_reason 只出现在末帧，而该帧的 delta 通常是空对象，
        // 因此必须在下面的 delta 判空之前捕获。
        if (typeof choice?.finish_reason === "string" && choice.finish_reason) {
          if (genUiMode && choice.finish_reason !== "stop") throw new Error(GENUI_FAILURE_TEXT);
          chunk.finishReason = choice.finish_reason;
        }
        const delta = choice?.delta;
        if (!delta) continue;

        if (Array.isArray(delta.tool_calls)) {
          for (const toolCall of delta.tool_calls) {
            if (typeof toolCall?.index !== "number") continue;
            chunk.toolCalls.push({
              index: toolCall.index,
              ...(typeof toolCall.id === "string" ? { id: toolCall.id } : {}),
              ...(typeof toolCall.function?.name === "string"
                ? { name: toolCall.function.name }
                : {}),
              ...(typeof toolCall.function?.arguments === "string"
                ? { arguments: toolCall.function.arguments }
                : {}),
            });
          }
        }

        if (typeof delta.content === "string") {
          chunk.content += delta.content;
        }
        chunk.meaningfulOutput ||= Boolean(
          (typeof delta.content === "string" && delta.content.trim()) ||
          (typeof delta.reasoning_content === "string" && delta.reasoning_content.trim()) ||
          chunk.toolCalls.some((toolCall) => Boolean(toolCall.name || toolCall.arguments))
        );
        if (!genUiMode && typeof delta.reasoning_content === "string") {
          chunk.reasoningContent += delta.reasoning_content;
        }
      } catch (error) {
        if (genUiMode) throw new Error(GENUI_FAILURE_TEXT);
        logger.error("解析流式响应失败:", error, {
          rawDataLength: line.length,
        });
      }
    }

    return chunk;
  }

  /**
   * 归一化错误文案：优先按 CodedError.code 映射友好提示，
   * 服务商返回的具体原因以"（服务商返回：…）"补充；
   * 非 CodedError 的旧式错误保留字符串兜底判断（见 shared/errors）。
   */
  private static normalizeErrorMessage(error: unknown): string {
    return resolveUserErrorMessage(error);
  }

  private static async sendTranslationError(
    requestContext: RequestContext,
    error: string,
    content = "",
    reasoningContent = "",
    assistantMessageId?: string
  ): Promise<boolean> {
    const { requestId, target } = requestContext;
    let action: string;
    if (target.kind === "tab") {
      action = MESSAGE_TYPES.UPDATE_CONTENT_TRANSLATION;
    } else if (target.kind === "sidepanel") {
      action = MESSAGE_TYPES.UPDATE_SIDEPANEL_TRANSLATION;
    } else {
      action = MESSAGE_TYPES.UPDATE_POPUP_TRANSLATION;
    }

    const message = {
      action,
      requestId,
      sessionId: target.kind === "sidepanel" ? target.sessionId : undefined,
      error,
      ...(assistantMessageId ? { assistantMessageId } : {}),
      ...(assistantMessageId ? { genUiPending: false } : {}),
      content: content || undefined,
      reasoningContent: reasoningContent || undefined,
      hasReasoning: reasoningContent.length > 0,
      done: true,
    };

    return target.kind === "tab"
      ? MessageUtils.safeSendMessage(target.tabId, message)
      : MessageUtils.sendRuntimeMessage(message);
  }

  private static async sendTranslationUpdate(
    requestContext: RequestContext,
    content: string,
    reasoningContent: string,
    done: boolean,
    resultSource?: TranslationResultSource,
    generated?: {
      genUi?: GenUiAttachment;
      genUiPreview?: GenUiAttachment;
      assistantMessageId: string;
      genUiPending?: boolean;
      genUiWarning?: string;
    }
  ): Promise<boolean> {
    const { requestId, target } = requestContext;
    if (!RequestManager.isActiveRequest(requestId)) {
      return false;
    }

    let action: string;
    if (target.kind === "tab") {
      action = MESSAGE_TYPES.UPDATE_CONTENT_TRANSLATION;
    } else if (target.kind === "sidepanel") {
      action = MESSAGE_TYPES.UPDATE_SIDEPANEL_TRANSLATION;
    } else {
      action = MESSAGE_TYPES.UPDATE_POPUP_TRANSLATION;
    }

    const message = {
      action,
      requestId,
      sessionId: target.kind === "sidepanel" ? target.sessionId : undefined,
      content,
      hasReasoning: reasoningContent.length > 0,
      reasoningContent,
      done,
      ...(resultSource ? { resultSource } : {}),
      ...generated,
    };

    if (done) {
      logger.log("📤 [TranslationService] 发送翻译完成", {
        requestId,
        target,
        contentLength: content.length,
        reasoningLength: reasoningContent.length,
      });
    }

    return target.kind === "tab"
      ? MessageUtils.safeSendMessage(target.tabId, message)
      : MessageUtils.sendRuntimeMessage(message);
  }
}
