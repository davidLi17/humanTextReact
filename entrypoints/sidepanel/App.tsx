import {
  DEFAULT_SETTINGS,
  MESSAGE_TYPES,
  THEME_MODES,
  ThemeMode,
} from "@/entrypoints/shared/constants";
import { createLogger, initializeLogger } from "@/entrypoints/shared/logger";
import {
  createRequestId,
  shouldAcceptRequestUpdate,
} from "@/entrypoints/shared/requestProtocol";
import { SettingsUtils } from "@/entrypoints/shared/settingsUtils";
import {
  applyTheme,
  normalizeThemeMode,
  watchSystemTheme,
} from "@/entrypoints/shared/theme";
import {
  buildHistoryPayload,
  ChatMessage,
  ChatSession,
} from "@/entrypoints/shared/chatTypes";
import { retryAssistantMessageAndTruncate } from "@/entrypoints/shared/chatEditRetry";
import {
  buildWebReadingContinuationPrompt,
  buildWebReadingUserPrompt,
  classifyWebReadExtractError,
  describeWebReadFailure,
  extractSuggestedQuestions,
  getWebReadingSegmentCount,
  MAX_PAGE_CONTENT_CHARS,
  MIN_PAGE_CONTENT_CHARS,
  WEB_READ_STAGE_LABELS,
  WEB_READING_EXTRACT_TIMEOUT_MARKER,
  WEB_READING_EXTRACT_TIMEOUT_MS,
  WEB_READING_SYSTEM_PROMPT,
  WebPageMetadata,
  webReadFailureKindFromStage,
  WebReadExtractStage,
} from "@/entrypoints/shared/webReadingPrompt";
import {
  beginWebReadingSegment,
  buildReplayableWebReadingPrompt,
  buildWebReadingHistoryPayload,
  cancelWebReadingProgressByRequest,
  createInitialWebReadingProgress,
  createWebReadingPageMeta,
  getActiveSidepanelRequestOwner,
  hasMatchingWebReadingProgress,
  hydrateWebReadingProgress,
  invalidateActiveSidepanelRequest,
  isSuccessfulWebReadingResponse,
  isWebReadingContinueReady,
  rewindWebReadingProgressForReplay,
  settleWebReadingSegment,
  shouldShowWebReadingContinue,
  type ActiveSidepanelRequest,
  type WebReadingProgressState,
  type WebReadingResponse,
} from "@/entrypoints/shared/webReadingState";
import {
  getWebReadingOverviewActions,
  prepareWebReadingOverviewRequest,
  type WebReadingOverviewAction,
} from "@/entrypoints/shared/webReadingOverview";
import {
  ExtractActiveTabResult,
  extractActiveTabContent,
  getActiveTab,
} from "@/entrypoints/shared/sidepanelUtils";
import {
  inferJargonDetails,
  saveJargonItem,
} from "@/entrypoints/shared/jargonStorage";
import {
  downloadSessionJsonFile,
  downloadSessionMarkdownFile,
  formatSessionAsMarkdown,
  formatSessionAsPlainText,
} from "@/entrypoints/shared/sessionExport";
import { ImageUtils } from "@/entrypoints/popup/utils/imageUtils";
import CollapsibleThinkingChain from "@/entrypoints/popup/components/CollapsibleThinkingChain";
import ThemeModeSelector from "@/entrypoints/popup/components/ThemeModeSelector";
import JargonVaultPanel from "./components/JargonVaultPanel";
import SidepanelQuoteActionBar from "./components/SidepanelQuoteActionBar";
import QuoteInputCapsule from "./components/QuoteInputCapsule";
import {
  calculateQuotePosition,
  formatQuoteMarkdown,
  isValidMessageSelection,
  removeQuoteFromInputText,
} from "./utils/quoteUtils";
import {
  initializeCodeCopy,
  parseMarkdown,
} from "@/shared/utils/markdown";
import {
  Add,
  Clear,
  Copy,
  Delete,
  DocDetail,
  Export,
  FileCode,
  FileText,
  History,
  Message,
  Send,
  SettingTwo,
  Thunderbolt,
  Brain,
  LinkOne,
  Topic,
  BookOne,
  Tips,
  LoadingOne,
  CheckOne,
  Star,
  Edit,
  Refresh,
  Down,
} from "@icon-park/react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.less";
import {
  getResetScrollFollowState,
  getScrollFollowState,
} from "./scrollState";
import {
  getSafeHttpUrl,
  getSafeSourceHostname,
  normalizeSelectionContext,
  type SelectionContext,
} from "@/entrypoints/shared/selectionContext";
import {
  restoreComposerDraft,
  saveComposerDraft,
  type SidepanelComposerDraft,
} from "./composerDraft";
import {
  WebReadingProgressStorage,
  WebReadingProgressFailureGate,
  WebReadingPendingActionGate,
  loadWebReadingHydrationSnapshot,
  prepareWebReadingProgressCheckpoint,
  type WebReadingProgressWriteResult,
} from "./webReadingProgressStorage";

const logger = createLogger("sidepanel-app", "💬");

interface PendingSidepanelEnvelope {
  text: string;
  selectionContext?: SelectionContext;
  envelopeId?: string;
  timestamp?: number;
}

function SelectionContextDetails({
  context,
  compact = false,
  onClear,
}: {
  context: SelectionContext;
  compact?: boolean;
  onClear?: () => void;
}) {
  const safeUrl = getSafeHttpUrl(context.source?.url);
  const hostname = getSafeSourceHostname(safeUrl);
  return (
    <div className={`selection-context-card ${compact ? "compact" : ""}`}>
      <div className="selection-context-header">
        <span>当前段落上下文</span>
        {onClear && (
          <button type="button" onClick={onClear} aria-label="移除段落上下文">
            ✕
          </button>
        )}
      </div>
      {(context.source?.title || safeUrl) && (
        <div className="selection-context-source">
          {context.source?.title && <span>{context.source.title}</span>}
          {safeUrl && (
            <a href={safeUrl} target="_blank" rel="noreferrer">
              {hostname || "查看来源"}
            </a>
          )}
        </div>
      )}
      <details open={!compact}>
        <summary>查看段落</summary>
        <div className="selection-context-text">{context.paragraph}</div>
      </details>
    </div>
  );
}

function createNewSession(initialTitle = "新对话"): ChatSession {
  const now = Date.now();
  return {
    id: createRequestId(),
    title: initialTitle,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

const QUICK_PROMPTS = [
  "用大白话解释这个概念，并举一个生活中的生动比喻",
  "这段话太黑话了，帮我提炼出最核心的行动点和结论",
  "把这段大白话改写为高阶专业职场汇报语言（大厂黑话版）",
  "指出这段描述中有哪些容易踩坑或含糊不清的地方",
];

export default function SidePanelApp() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(THEME_MODES.SYSTEM);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [inputText, setInputText] = useState<string>("");
  const [images, setImages] = useState<ChatMessage["images"]>([]);
  const [pendingSelectionContext, setPendingSelectionContext] =
    useState<SelectionContext>();
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isExtractingPage, setIsExtractingPage] = useState<boolean>(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [copySuccessId, setCopySuccessId] = useState<string | null>(null);
  const [copyAllSuccess, setCopyAllSuccess] = useState<boolean>(false);
  const [thinkingEnabled, setThinkingEnabled] = useState<boolean>(false);
  const [showDrawer, setShowDrawer] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  // 界面 Tab 切换："chat"（对话）与 "vault"（黑话生词本）
  const [activeView, setActiveView] = useState<"chat" | "vault">("chat");
  // 抽屉内部 Tab 切换
  const [drawerTab, setDrawerTab] = useState<"history" | "vault">("history");
  // 已存入生词本的消息 ID 集合
  const [savedVaultMessageIds, setSavedVaultMessageIds] = useState<Set<string>>(
    new Set()
  );
  // 全局 Toast 提示
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 用户消息行内编辑状态
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // 划词追问浮动胶囊状态
  const [quoteBarVisible, setQuoteBarVisible] = useState<boolean>(false);
  const [quoteBarPosition, setQuoteBarPosition] = useState<{
    left: number;
    top: number;
    placement?: "top" | "bottom";
  }>({ left: 0, top: 0, placement: "top" });
  const [selectedQuoteText, setSelectedQuoteText] = useState<string>("");
  const [activeQuotedText, setActiveQuotedText] = useState<string | null>(null);

  // 智能滚动与回到底部/流式指示器状态 (对标 GPT 交互)
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);
  const userHasScrolledUpRef = useRef<boolean>(false);
  const programmaticScrollRef = useRef<boolean>(false);
  const programmaticScrollTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const sidepanelContainerRef = useRef<HTMLDivElement>(null);
  const chatContentRef = useRef<HTMLElement>(null);
  const activeRequestIdRef = useRef<string | undefined>(undefined);
  const activeRequestOwnerRef = useRef<ActiveSidepanelRequest | undefined>(
    undefined
  );
  const overviewRequestIdRef = useRef<string | undefined>(undefined);
  const sessionsRef = useRef<ChatSession[]>([]);
  const activeSessionIdRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editingTextareaRef = useRef<HTMLTextAreaElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const composerDraftsRef = useRef<Map<string, SidepanelComposerDraft>>(
    new Map()
  );
  const consumedEnvelopeIdsRef = useRef<Set<string>>(new Set());
  const webReadingProgressRef = useRef<
    Map<string, WebReadingProgressState>
  >(new Map());
  const webReadingProgressHydratedRef = useRef(false);
  const webReadingProgressStorageRef = useRef<WebReadingProgressStorage | null>(
    null
  );
  const progressSaveFailureGateRef = useRef(
    new WebReadingProgressFailureGate()
  );
  const nonRestorableProgressSessionsRef = useRef<Set<string>>(new Set());
  const pendingActionGateRef = useRef(new WebReadingPendingActionGate());
  if (!webReadingProgressStorageRef.current) {
    webReadingProgressStorageRef.current = new WebReadingProgressStorage();
  }

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const activateSessionWithDraft = (
    nextSessionId: string,
    saveCurrent = true
  ) => {
    if (saveCurrent && activeSessionId) {
      saveComposerDraft(composerDraftsRef.current, activeSessionId, {
        inputText,
        images,
        selectionContext: pendingSelectionContext,
      });
    }
    const nextDraft = restoreComposerDraft(
      composerDraftsRef.current,
      nextSessionId
    );
    activeSessionIdRef.current = nextSessionId;
    setActiveSessionId(nextSessionId);
    setInputText(nextDraft.inputText);
    setImages(nextDraft.images);
    setPendingSelectionContext(nextDraft.selectionContext);
    setActiveQuotedText(null);
  };

  const consumeSidepanelEnvelope = (envelope: PendingSidepanelEnvelope) => {
    if (
      envelope.envelopeId &&
      consumedEnvelopeIdsRef.current.has(envelope.envelopeId)
    ) {
      return false;
    }
    if (envelope.envelopeId) {
      consumedEnvelopeIdsRef.current.add(envelope.envelopeId);
      if (consumedEnvelopeIdsRef.current.size > 50) {
        const oldest = consumedEnvelopeIdsRef.current.values().next().value;
        if (oldest) consumedEnvelopeIdsRef.current.delete(oldest);
      }
    }
    setActiveView("chat");
    setInputText(envelope.text);
    setImages([]);
    setPendingSelectionContext(
      normalizeSelectionContext(envelope.selectionContext)
    );
    inputRef.current?.focus();
    return true;
  };

  const removePendingEnvelopeIfMatches = async (envelopeId?: string) => {
    if (!envelopeId || !browser?.storage?.local) return;
    const stored = (await browser.storage.local.get(
      "pendingSidepanelText"
    )) as { pendingSidepanelText?: PendingSidepanelEnvelope };
    if (stored.pendingSidepanelText?.envelopeId === envelopeId) {
      await browser.storage.local.remove("pendingSidepanelText");
    }
  };

  // 长文分段续读进度（按会话 ID 隔离；会话切换后各自状态互不影响）
  const [
    webReadingProgressMap,
    setWebReadingProgressMap,
  ] = useState<Map<string, WebReadingProgressState>>(new Map());
  const [webReadingProgressHydrated, setWebReadingProgressHydrated] =
    useState(false);
  const activeWebReadingProgress = activeSession
    ? webReadingProgressMap.get(activeSession.id)
    : undefined;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleProgressWriteResult = (
    result: WebReadingProgressWriteResult,
    prioritySessionId?: string
  ) => {
    progressSaveFailureGateRef.current.recordSuccess();
    for (const sessionId of result.persistedSessionIds) {
      nonRestorableProgressSessionsRef.current.delete(sessionId);
    }
    const newlyOmitted = result.omittedSessionIds.filter((sessionId) => {
      if (nonRestorableProgressSessionsRef.current.has(sessionId)) return false;
      nonRestorableProgressSessionsRef.current.add(sessionId);
      return true;
    });
    if (newlyOmitted.length === 0) return;

    showToast(
      newlyOmitted.includes(prioritySessionId || "")
        ? "正文超过断点保存容量，本次当前会话仍可继续；关闭侧边栏后不保证恢复。"
        : "部分较早阅读断点超过本地容量；对应会话当前可继续，关闭后不保证恢复。"
    );
  };

  const persistWebReadingProgress = (
    progressMap: Map<string, WebReadingProgressState>,
    prioritySessionId?: string,
    checkpoint?: { sessions?: ChatSession[]; activeSessionId?: string }
  ) => {
    void webReadingProgressStorageRef.current!
      .enqueueCheckpoint({
        progressMap,
        prioritySessionId,
        sessions: checkpoint?.sessions,
        activeSessionId: checkpoint?.activeSessionId,
      })
      .then((result) => handleProgressWriteResult(result, prioritySessionId))
      .catch((error) => {
        logger.error("保存网页阅读断点失败:", error);
        if (!progressSaveFailureGateRef.current.recordFailure()) return;
        showToast(
          "阅读进度保存失败，本次当前会话仍可继续；关闭侧边栏后可能无法恢复。"
        );
      });
  };

  const commitWebReadingProgress = (
    updater: (
      previous: Map<string, WebReadingProgressState>
    ) => Map<string, WebReadingProgressState>,
    prioritySessionId?: string
  ) => {
    if (!webReadingProgressHydratedRef.current) return false;
    const previous = webReadingProgressRef.current;
    const checkpoint = prepareWebReadingProgressCheckpoint(
      previous,
      updater,
      sessionsRef.current,
      prioritySessionId
    );
    if (!checkpoint) return false;
    webReadingProgressRef.current = checkpoint.progressMap;
    setWebReadingProgressMap(checkpoint.progressMap);
    persistWebReadingProgress(
      checkpoint.progressMap,
      checkpoint.prioritySessionId,
      {
        sessions: checkpoint.sessions,
      }
    );
    return true;
  };

  const registerActiveRequest = (owner: ActiveSidepanelRequest) => {
    activeRequestIdRef.current = owner.requestId;
    activeRequestOwnerRef.current = owner;
  };

  const clearActiveRequest = (requestId: string): boolean => {
    const transition = invalidateActiveSidepanelRequest(
      {
        activeRequestId: activeRequestIdRef.current,
        owner: activeRequestOwnerRef.current,
      },
      requestId
    );
    if (!transition.invalidated) return false;
    activeRequestIdRef.current = transition.activeRequestId;
    activeRequestOwnerRef.current = transition.owner;
    if (overviewRequestIdRef.current === requestId) {
      overviewRequestIdRef.current = undefined;
    }
    return transition.invalidated;
  };

  const settleSessionWebReadingProgress = (
    sessionId: string,
    readingRunId: string | undefined,
    requestId: string,
    response?: WebReadingResponse
  ) => {
    commitWebReadingProgress((prev) => {
      const current = prev.get(sessionId);
      if (!current) return prev;
      const settled = settleWebReadingSegment(
        current,
        requestId,
        response,
        Date.now(),
        readingRunId
      );
      if (settled === current) return prev;
      const next = new Map(prev);
      if (settled) next.set(sessionId, settled);
      else next.delete(sessionId);
      return next;
    }, sessionId);
  };

  const rewindSessionWebReadingProgress = (
    sessionId: string,
    message: ChatMessage,
    requestId: string,
    assistantMessageId: string
  ) => {
    const meta = message.pageMeta;
    if (!meta?.isWebPageReading) return false;
    return commitWebReadingProgress((prev) => {
      const current = prev.get(sessionId);
      if (!current) return prev;
      const rewound = rewindWebReadingProgressForReplay(current, {
        title: meta.title,
        url: meta.url,
        segmentIndex: meta.segmentIndex || 1,
        requestId,
        assistantMessageId,
        readingRunId: meta.readingRunId,
      });
      if (rewound === current) return prev;
      const next = new Map(prev);
      next.set(sessionId, rewound);
      return next;
    }, sessionId);
  };

  const markAssistantMessageAsError = (
    sessionId: string,
    assistantMessageId: string,
    errorMessage: string,
    requestId: string
  ) => {
    const requestOwner = getActiveSidepanelRequestOwner(
      requestId,
      activeRequestOwnerRef.current
    );
    if (!clearActiveRequest(requestId)) return;
    setIsStreaming(false);
    const updatedSessions = sessionsRef.current.map((session) => {
        if (session.id !== sessionId) return session;
        const messages = session.messages.map((message) =>
          message.id === assistantMessageId && message.role === "assistant"
            ? { ...message, status: "error" as const, errorMessage }
            : message
        );
        return { ...session, messages, updatedAt: Date.now() };
      });
    sessionsRef.current = updatedSessions;
    setSessions(updatedSessions);

    if (
      hasMatchingWebReadingProgress(
        webReadingProgressRef.current,
        requestOwner
      )
    ) {
      commitWebReadingProgress(
        (previous) =>
          cancelWebReadingProgressByRequest(previous, requestId),
        sessionId
      );
    } else {
      void saveSessionsToStorage(updatedSessions);
    }
  };

  // 初始化代码复制与日志
  useEffect(() => {
    void initializeLogger("sidepanel");
    initializeCodeCopy();
  }, []);

  // 监听进入编辑状态，自动 focus textarea 并自适应高度
  useEffect(() => {
    if (editingMessageId && editingTextareaRef.current) {
      const ta = editingTextareaRef.current;
      ta.focus();
      ta.selectionStart = ta.value.length;
      ta.selectionEnd = ta.value.length;
      ta.style.height = "auto";
      ta.style.height = `${Math.max(68, ta.scrollHeight)}px`;
    }
  }, [editingMessageId]);

  // 监听点击外部关闭导出菜单
  useEffect(() => {
    if (!showExportMenu) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      ) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showExportMenu]);

  // 主题管理
  useEffect(() => {
    const root = document.documentElement;
    applyTheme(root, themeMode);
    return watchSystemTheme(themeMode, (resolvedTheme) => {
      applyTheme(root, themeMode, resolvedTheme === THEME_MODES.DARK);
    });
  }, [themeMode]);

  // 从设置中同步默认配置与主题
  useEffect(() => {
    const initSettings = async () => {
      try {
        const settings = await SettingsUtils.getSettings();
        if (settings.theme) {
          setThemeMode(normalizeThemeMode(settings.theme));
        }
        if (typeof settings.thinkingEnabled === "boolean") {
          setThinkingEnabled(settings.thinkingEnabled);
        }
      } catch (error) {
        logger.error("加载设置失败:", error);
      }
    };
    void initSettings();

    const unsubscribe = SettingsUtils.onSettingsChanged((newSettings) => {
      if (newSettings.theme) {
        setThemeMode(normalizeThemeMode(newSettings.theme));
      }
      if (typeof newSettings.thinkingEnabled === "boolean") {
        setThinkingEnabled(newSettings.thinkingEnabled);
      }
    });
    return () => unsubscribe();
  }, []);

  // 联合加载会话与网页阅读断点；完成前禁止消费待办或写入初始空 Map。
  useEffect(() => {
    let cancelled = false;
    const loadSessions = async () => {
      try {
        const snapshot = await loadWebReadingHydrationSnapshot();
        if (cancelled) return;
        const storedSessions = Array.isArray(snapshot.sessions)
          ? (snapshot.sessions as ChatSession[])
          : [];
        const initialSessions =
          storedSessions.length > 0 ? storedSessions : [createNewSession()];
        const hydration = hydrateWebReadingProgress(
          snapshot.webReadingProgress,
          initialSessions,
          Date.now(),
          typeof snapshot.activeSessionId === "string"
            ? snapshot.activeSessionId
            : undefined
        );
        const nextActiveSessionId =
          typeof snapshot.activeSessionId === "string" &&
          hydration.sessions.some(
            (session) => session.id === snapshot.activeSessionId
          )
            ? snapshot.activeSessionId
            : hydration.sessions[0].id;

        sessionsRef.current = hydration.sessions;
        activeSessionIdRef.current = nextActiveSessionId;
        webReadingProgressRef.current = hydration.progressMap;
        setSessions(hydration.sessions);
        setActiveSessionId(nextActiveSessionId);
        setWebReadingProgressMap(hydration.progressMap);
        webReadingProgressHydratedRef.current = true;
        setWebReadingProgressHydrated(true);

        if (hydration.sessionsChanged || hydration.progressNeedsRewrite) {
          persistWebReadingProgress(hydration.progressMap, undefined, {
            sessions: hydration.sessionsChanged
              ? hydration.sessions
              : undefined,
            activeSessionId: nextActiveSessionId,
          });
        }
      } catch (error) {
        if (cancelled) return;
        logger.error("加载会话与网页阅读断点失败:", error);
        const fallback = createNewSession();
        sessionsRef.current = [fallback];
        activeSessionIdRef.current = fallback.id;
        webReadingProgressRef.current = new Map();
        setSessions([fallback]);
        setActiveSessionId(fallback.id);
        setWebReadingProgressMap(new Map());
        webReadingProgressHydratedRef.current = true;
        setWebReadingProgressHydrated(true);
        showToast("未能恢复上次阅读进度，当前不会自动续读。");
      }
    };

    void loadSessions();
    return () => {
      cancelled = true;
    };
  }, []);

  // 持久化保存会话
  const saveSessionsToStorage = async (updatedSessions: ChatSession[]) => {
    if (!webReadingProgressHydratedRef.current) return;
    sessionsRef.current = updatedSessions;
    persistWebReadingProgress(
      webReadingProgressRef.current,
      activeSessionIdRef.current || undefined,
      {
      sessions: updatedSessions,
      }
    );
  };

  const saveActiveSessionId = async (id: string) => {
    if (!webReadingProgressHydratedRef.current) return;
    activeSessionIdRef.current = id;
    persistWebReadingProgress(webReadingProgressRef.current, id, {
      activeSessionId: id,
    });
  };

  // 检查是否有待翻译文本或通读请求
  useEffect(() => {
    if (!pendingActionGateRef.current.tryClaim(webReadingProgressHydrated)) {
      return;
    }
    const checkPendingActions = async () => {
      try {
        if (!browser?.storage?.local) return;
        const stored = await browser.storage.local.get([
          "pendingSidepanelText",
          "pendingWebPageRead",
        ]);

        const pendingText = stored.pendingSidepanelText as
          | PendingSidepanelEnvelope
          | undefined;
        if (
          pendingText &&
          typeof pendingText.timestamp === "number" &&
          Date.now() - pendingText.timestamp < 10000
        ) {
          consumeSidepanelEnvelope(pendingText);
          await browser.storage.local.remove("pendingSidepanelText");
        }

        const pendingRead = stored.pendingWebPageRead as
          | { timestamp: number; tabId?: number }
          | undefined;
        if (pendingRead && Date.now() - pendingRead.timestamp < 10000) {
          setActiveView("chat");
          await browser.storage.local.remove("pendingWebPageRead");
          void handleReadCurrentPage();
        }
      } catch (error) {
        logger.error("检查待处理操作失败:", error);
      }
    };

    void checkPendingActions();
  }, [webReadingProgressHydrated]);

  // 监听后台消息与流式更新
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.action === "sendToSidepanel" && message.text) {
        if (!webReadingProgressHydratedRef.current) return;
        if (consumeSidepanelEnvelope(message)) {
          void removePendingEnvelopeIfMatches(message.envelopeId);
        }
        return;
      }

      if (message.action === MESSAGE_TYPES.READ_WEB_PAGE) {
        if (!webReadingProgressHydratedRef.current) return;
        setActiveView("chat");
        void handleReadCurrentPage();
        return;
      }

      if (message.action === MESSAGE_TYPES.UPDATE_SIDEPANEL_TRANSLATION) {
        const {
          requestId,
          sessionId,
          content,
          reasoningContent,
          resultSource,
          done,
          error,
        } = message;

        if (
          !shouldAcceptRequestUpdate(requestId, activeRequestIdRef.current, true)
        ) {
          return;
        }

        const targetSessionId = sessionId || activeSessionIdRef.current;
        const updatedSessions = sessionsRef.current.map((s) => {
            if (s.id !== targetSessionId) return s;

            const messages = [...s.messages];
            const lastMsg = messages[messages.length - 1];

            if (lastMsg && lastMsg.role === "assistant") {
              const updatedContent = content ?? lastMsg.content;
              const suggestedQuestions =
                done && updatedContent
                  ? extractSuggestedQuestions(updatedContent)
                  : lastMsg.suggestedQuestions;

              const updatedMsg: ChatMessage = {
                ...lastMsg,
                content: updatedContent,
                reasoningContent:
                  reasoningContent ?? lastMsg.reasoningContent,
                hasReasoning:
                  Boolean(reasoningContent) || lastMsg.hasReasoning,
                suggestedQuestions,
                status: error
                  ? "error"
                  : done
                  ? "completed"
                  : "streaming",
                errorMessage: error || undefined,
                resultSource: resultSource ?? lastMsg.resultSource,
              };
              messages[messages.length - 1] = updatedMsg;
            }

            return {
              ...s,
              messages,
              updatedAt: Date.now(),
            };
          });
        sessionsRef.current = updatedSessions;
        setSessions(updatedSessions);

        if (done) {
          const completedRequestId = requestId || activeRequestIdRef.current;
          const completedOwner = getActiveSidepanelRequestOwner(
            completedRequestId,
            activeRequestOwnerRef.current
          );
          // 网页阅读等待 response 结算时把完成态与进度放进同一检查点。
          if (
            !hasMatchingWebReadingProgress(
              webReadingProgressRef.current,
              completedOwner
            )
          ) {
            void saveSessionsToStorage(updatedSessions);
          }
          if (
            completedRequestId &&
            clearActiveRequest(completedRequestId)
          ) {
            setIsStreaming(false);
          }
        }
      }
    };

    browser.runtime.onMessage.addListener(messageListener);
    return () => {
      browser.runtime.onMessage.removeListener(messageListener);
    };
  }, [activeSessionId]);

  // 平滑滚动到底部
  const scrollToBottom = (smooth = true) => {
    const resetState = getResetScrollFollowState();
    programmaticScrollRef.current = true;
    userHasScrolledUpRef.current = resetState.userHasScrolledUp;
    setIsAtBottom(resetState.isAtBottom);
    if (programmaticScrollTimerRef.current) {
      clearTimeout(programmaticScrollTimerRef.current);
    }
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
    programmaticScrollTimerRef.current = setTimeout(() => {
      programmaticScrollRef.current = false;
      programmaticScrollTimerRef.current = null;
    }, smooth ? 750 : 0);
  };

  // 切换会话时始终显示该会话的最新消息，清理上一个会话留下的上翻状态。
  useEffect(() => {
    if (activeView === "chat" && activeSessionId) {
      scrollToBottom(false);
    }
  }, [activeSessionId, activeView]);

  useEffect(
    () => () => {
      if (programmaticScrollTimerRef.current) {
        clearTimeout(programmaticScrollTimerRef.current);
      }
    },
    []
  );

  // 自动滚动到消息流底部 (遵循 GPT 交互: 仅在用户未主动往上滑时跟随，绝不跟用户抢夺滚动控制权)
  useEffect(() => {
    if (activeView === "chat" && !userHasScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeSession?.messages, isStreaming, isExtractingPage, activeView]);

  // 划词浮动“追问”胶囊定位与监听
  useEffect(() => {
    if (activeView !== "chat") {
      setQuoteBarVisible(false);
      return;
    }

    const checkSelection = () => {
      const selection = window.getSelection();
      if (
        !selection ||
        !chatContentRef.current ||
        !sidepanelContainerRef.current
      ) {
        setQuoteBarVisible(false);
        return;
      }

      if (!isValidMessageSelection(selection, chatContentRef.current)) {
        setQuoteBarVisible(false);
        return;
      }

      const text = selection.toString().trim();
      if (!text) {
        setQuoteBarVisible(false);
        return;
      }

      try {
        const range = selection.getRangeAt(0);
        const selectionRect = range.getBoundingClientRect();
        const containerRect =
          sidepanelContainerRef.current.getBoundingClientRect();

        const pos = calculateQuotePosition({
          selectionRect,
          containerRect,
        });

        setSelectedQuoteText(text);
        setQuoteBarPosition(pos);
        setQuoteBarVisible(true);
      } catch (err) {
        logger.error("计算划词追问位置出错:", err);
        setQuoteBarVisible(false);
      }
    };

    const handleMouseUp = () => {
      setTimeout(checkSelection, 10);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.shiftKey) {
        setTimeout(checkSelection, 10);
      }
    };

    const handleScroll = () => {
      setQuoteBarVisible(false);
      if (chatContentRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = chatContentRef.current;
        const nextState = getScrollFollowState(
          { scrollTop, scrollHeight, clientHeight },
          programmaticScrollRef.current
        );
        setIsAtBottom(nextState.isAtBottom);
        userHasScrolledUpRef.current = nextState.userHasScrolledUp;
        if (nextState.isAtBottom) {
          programmaticScrollRef.current = false;
        }
      }
    };

    const markUserScrollIntent = () => {
      programmaticScrollRef.current = false;
    };

    const handleScrollKeyDown = (event: KeyboardEvent) => {
      if (
        ["ArrowUp", "PageUp", "Home", "ArrowDown", "PageDown", "End"].includes(
          event.key
        )
      ) {
        markUserScrollIntent();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest?.(".sidepanel-quote-action-bar")) {
        return;
      }
      setQuoteBarVisible(false);
    };

    const chatEl = chatContentRef.current;
    if (chatEl) {
      chatEl.addEventListener("mouseup", handleMouseUp);
      chatEl.addEventListener("keyup", handleKeyUp);
      chatEl.addEventListener("scroll", handleScroll, { passive: true });
      chatEl.addEventListener("wheel", markUserScrollIntent, { passive: true });
      chatEl.addEventListener("touchstart", markUserScrollIntent, {
        passive: true,
      });
      chatEl.addEventListener("pointerdown", markUserScrollIntent, {
        passive: true,
      });
      chatEl.addEventListener("keydown", handleScrollKeyDown);
    }
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      if (chatEl) {
        chatEl.removeEventListener("mouseup", handleMouseUp);
        chatEl.removeEventListener("keyup", handleKeyUp);
        chatEl.removeEventListener("scroll", handleScroll);
        chatEl.removeEventListener("wheel", markUserScrollIntent);
        chatEl.removeEventListener("touchstart", markUserScrollIntent);
        chatEl.removeEventListener("pointerdown", markUserScrollIntent);
        chatEl.removeEventListener("keydown", handleScrollKeyDown);
      }
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [activeView]);

  // 通读当前网页核心逻辑
  const handleReadCurrentPage = async () => {
    if (
      !webReadingProgressHydratedRef.current ||
      isStreaming ||
      isExtractingPage
    ) {
      return;
    }
    const extractionSessionId = activeSessionIdRef.current;
    if (!extractionSessionId) return;

    let activeWebRequest:
      | {
          sessionId: string;
          requestId: string;
          assistantMessageId: string;
          readingRunId: string;
          hasProgress: boolean;
        }
      | undefined;

    setActiveView("chat");
    setExtractError(null);
    setIsExtractingPage(true);

    try {
      const activeTab = await getActiveTab();
      logger.info("开始提取当前网页正文", {
        tabId: activeTab?.id,
        url: activeTab?.url,
      });

      // 失败路径：提取消息无响应/超时（标记环节 cs-inject），避免“正在提取”永久悬挂
      let extractTimeoutId: ReturnType<typeof setTimeout> | undefined;
      const extractResult = await Promise.race([
        extractActiveTabContent(),
        new Promise<ExtractActiveTabResult>((resolve) => {
          extractTimeoutId = setTimeout(() => {
            resolve({
              success: false,
              error: WEB_READING_EXTRACT_TIMEOUT_MARKER,
              stage: "cs-inject",
            });
          }, WEB_READING_EXTRACT_TIMEOUT_MS);
        }),
      ]);
      if (extractTimeoutId) clearTimeout(extractTimeoutId);

      if (!extractResult.success || !extractResult.data) {
        // 失败分类与环节定位：stage 缺失时退回按错误文案归类（防御性，正常链路 stage 恒有值）
        const failureDetail = extractResult.error;
        const isTimeout = failureDetail === WEB_READING_EXTRACT_TIMEOUT_MARKER;
        const failureStage: WebReadExtractStage =
          extractResult.stage ?? "fallback-extract";
        const failureKind = isTimeout
          ? "extract-timeout"
          : extractResult.stage
          ? webReadFailureKindFromStage(extractResult.stage)
          : classifyWebReadExtractError(failureDetail);
        const shouldEmbedDetail =
          failureKind === "cs-extract-failed" ||
          failureKind === "script-blocked" ||
          failureKind === "unknown";
        setExtractError(
          describeWebReadFailure(
            failureKind,
            !isTimeout && shouldEmbedDetail ? failureDetail : undefined,
            failureStage
          )
        );
        logger.error("网页通读提取正文失败:", {
          stage: failureStage,
          kind: failureKind,
          detail: failureDetail,
        });
        setIsExtractingPage(false);
        return;
      }

      const pageData: WebPageMetadata = extractResult.data;

      // 失败路径：正文为空或过短，视为无效提取（环节 content-too-short）
      if (
        !pageData.content ||
        pageData.content.trim().length < MIN_PAGE_CONTENT_CHARS
      ) {
        setExtractError(
          describeWebReadFailure("empty-content", undefined, "content-too-short")
        );
        logger.error("网页通读提取正文失败:", {
          stage: "content-too-short",
          contentLength: pageData.content?.trim().length ?? 0,
        });
        setIsExtractingPage(false);
        return;
      }

      const latestSessions = sessionsRef.current;
      const extractionSession = latestSessions.find(
        (session) => session.id === extractionSessionId
      );
      if (
        !extractionSession ||
        activeSessionIdRef.current !== extractionSessionId
      ) {
        setExtractError(
          "提取期间当前会话已变化，本次通读已取消，请重新点击「通读当前网页」。"
        );
        setIsExtractingPage(false);
        return;
      }

      // 如果当前会话已有消息，为网页通读创建一个干净的新会话
      let targetSession = extractionSession;
      if (extractionSession.messages.length > 0) {
        targetSession = createNewSession(
          `速读: ${pageData.title.slice(0, 12)}...`
        );
        const updatedSessions = [targetSession, ...latestSessions];
        sessionsRef.current = updatedSessions;
        setSessions(updatedSessions);
        activateSessionWithDraft(targetSession.id);
        void saveSessionsToStorage(updatedSessions);
        void saveActiveSessionId(targetSession.id);
      } else {
        targetSession = {
          ...targetSession,
          title: `速读: ${pageData.title.slice(0, 12)}...`,
        };
      }

      const userMessageId = createRequestId();
      const assistantMessageId = createRequestId();
      const currentRequestId = createRequestId();
      const readingRunId = createRequestId();
      const totalSegments = getWebReadingSegmentCount(pageData.content.length);
      registerActiveRequest({
        requestId: currentRequestId,
        sessionId: targetSession.id,
        assistantMessageId,
        readingRunId: totalSegments > 1 ? readingRunId : undefined,
      });
      activeWebRequest = {
        sessionId: targetSession.id,
        requestId: currentRequestId,
        assistantMessageId,
        readingRunId,
        hasProgress: totalSegments > 1,
      };

      // 组装代表“通读网页”的用户消息卡片
      const userMessage: ChatMessage = {
        id: userMessageId,
        role: "user",
        content: `通读网页: 《${pageData.title}》`,
        pageMeta: createWebReadingPageMeta(pageData, {
          segmentIndex: 1,
          totalSegments,
          readingRunId,
        }),
        createdAt: Date.now(),
        status: "completed",
      };

      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        reasoningContent: "",
        hasReasoning: false,
        createdAt: Date.now(),
        status: "streaming",
      };

      const updatedSession: ChatSession = {
        ...targetSession,
        title: `速读: ${pageData.title.slice(0, 12)}...`,
        messages: [...targetSession.messages, userMessage, assistantMessage],
        updatedAt: Date.now(),
      };

      const currentSessions = sessionsRef.current;
      const nextSessions = currentSessions.map((s) =>
        s.id === targetSession.id ? updatedSession : s
      );
      if (!nextSessions.some((s) => s.id === targetSession.id)) {
        nextSessions.unshift(updatedSession);
      }
      sessionsRef.current = nextSessions;
      setSessions(nextSessions);

      // 首段先登记为 pending；只有业务成功且结果非空后，才开放第二段续读。
      if (totalSegments > 1) {
        const progressState = createInitialWebReadingProgress({
          page: pageData,
          totalSegments,
          requestId: currentRequestId,
          assistantMessageId,
          readingRunId,
        });
        commitWebReadingProgress((prev) => {
          const next = new Map(prev);
          next.set(targetSession.id, progressState);
          return next;
        }, targetSession.id);
      } else {
        void saveSessionsToStorage(nextSessions);
      }

      setIsExtractingPage(false);
      setIsStreaming(true);
      scrollToBottom(true);

      // 构建针对网页长文通读的高质量结构化 Prompt
      const userPrompt = buildWebReadingUserPrompt(pageData);
      const messagesPayload = [
        { role: "system" as const, content: WEB_READING_SYSTEM_PROMPT },
        { role: "user" as const, content: userPrompt },
      ];

      const response = (await browser.runtime.sendMessage({
        action: MESSAGE_TYPES.TRANSLATE,
        requestId: currentRequestId,
        targetKind: "sidepanel",
        source: "sidepanel",
        sessionId: targetSession.id,
        messages: messagesPayload,
        thinkingEnabled,
      })) as WebReadingResponse;
      if (!isSuccessfulWebReadingResponse(response)) {
        markAssistantMessageAsError(
          activeWebRequest.sessionId,
          activeWebRequest.assistantMessageId,
          response?.error || "网页通读未返回有效结果，请重试",
          activeWebRequest.requestId
        );
      }
      if (activeWebRequest.hasProgress) {
        settleSessionWebReadingProgress(
          activeWebRequest.sessionId,
          activeWebRequest.readingRunId,
          activeWebRequest.requestId,
          response
        );
      } else {
        void saveSessionsToStorage(sessionsRef.current);
      }
    } catch (error: any) {
      // 提取链路失败均已提前 return，走到这里的异常属于会话组装或 AI 请求发送环节
      logger.error("通读网页请求失败:", {
        stage: "ai-request",
        detail: error?.message,
      });
      if (
        !activeWebRequest ||
        activeRequestIdRef.current === activeWebRequest.requestId
      ) {
        setIsExtractingPage(false);
        setExtractError(
          `${error?.message || "通读网页请求失败，请检查网络或 API 设置"}（${
            WEB_READ_STAGE_LABELS["ai-request"]
          }）`
        );
      }
      if (activeWebRequest) {
        markAssistantMessageAsError(
          activeWebRequest.sessionId,
          activeWebRequest.assistantMessageId,
          error?.message || "通读网页请求失败，请检查网络或 API 设置",
          activeWebRequest.requestId
        );
        if (activeWebRequest.hasProgress) {
          settleSessionWebReadingProgress(
            activeWebRequest.sessionId,
            activeWebRequest.readingRunId,
            activeWebRequest.requestId
          );
        }
      }
    }
  };

  // 继续解读网页长文的剩余分段（同会话上下文顺序解读，直至读完）
  const handleContinueWebReading = async () => {
    if (
      !webReadingProgressHydratedRef.current ||
      isStreaming ||
      isExtractingPage ||
      !activeSession
    ) {
      return;
    }
    const progress = webReadingProgressMap.get(activeSession.id);
    if (!isWebReadingContinueReady(progress)) return;

    const segmentIndex = progress.segmentIndex;
    const segmentEnd = Math.min(
      progress.nextStart + MAX_PAGE_CONTENT_CHARS,
      progress.fullContent.length
    );
    const segmentContent = progress.fullContent.slice(
      progress.nextStart,
      segmentEnd
    );
    if (!segmentContent.trim()) {
      commitWebReadingProgress((prev) => {
        const next = new Map(prev);
        next.delete(activeSession.id);
        return next;
      }, activeSession.id);
      return;
    }

    const userMessageId = createRequestId();
    const assistantMessageId = createRequestId();
    const currentRequestId = createRequestId();
    registerActiveRequest({
      requestId: currentRequestId,
      sessionId: activeSession.id,
      assistantMessageId,
      readingRunId: progress.readingRunId,
    });

    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: `继续解读《${progress.title}》第 ${segmentIndex} 段 / 共约 ${progress.totalSegments} 段`,
      pageMeta: createWebReadingPageMeta(
        {
          title: progress.title,
          url: progress.url,
          content: segmentContent,
          wordCount: progress.wordCount,
        },
        {
          segmentIndex,
          totalSegments: progress.totalSegments,
          readingRunId: progress.readingRunId,
        }
      ),
      createdAt: Date.now(),
      status: "completed",
    };

    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      reasoningContent: "",
      hasReasoning: false,
      createdAt: Date.now(),
      status: "streaming",
    };

    const updatedSession: ChatSession = {
      ...activeSession,
      messages: [...activeSession.messages, userMessage, assistantMessage],
      updatedAt: Date.now(),
    };

    const nextSessions = sessionsRef.current.map((s) =>
      s.id === activeSession.id ? updatedSession : s
    );
    sessionsRef.current = nextSessions;
    setSessions(nextSessions);

    // 请求期间只记录 pending，不提前推进，避免失败后跳段或末段入口消失。
    commitWebReadingProgress((prev) => {
      const current = prev.get(activeSession.id);
      if (!current) return prev;
      const next = new Map(prev);
      next.set(
        activeSession.id,
        beginWebReadingSegment(current, {
          requestId: currentRequestId,
          segmentIndex,
          nextStart: segmentEnd,
          assistantMessageId,
        })
      );
      return next;
    }, activeSession.id);

    setIsStreaming(true);
    setExtractError(null);
    scrollToBottom(true);

    try {
      const historyPayload = buildWebReadingHistoryPayload(
        activeSession.messages
      );
      const hasSystem = historyPayload.some(
        (message) => message.role === "system"
      );
      const messagesPayload = [
        ...(hasSystem
          ? []
          : [{ role: "system" as const, content: WEB_READING_SYSTEM_PROMPT }]),
        ...historyPayload,
        {
          role: "user" as const,
          content: buildWebReadingContinuationPrompt({
            title: progress.title,
            segmentContent,
            segmentIndex,
            totalSegments: progress.totalSegments,
          }),
        },
      ];

      const response = (await browser.runtime.sendMessage({
        action: MESSAGE_TYPES.TRANSLATE,
        requestId: currentRequestId,
        targetKind: "sidepanel",
        source: "sidepanel",
        sessionId: activeSession.id,
        messages: messagesPayload,
        thinkingEnabled,
      })) as WebReadingResponse;
      if (!isSuccessfulWebReadingResponse(response)) {
        markAssistantMessageAsError(
          activeSession.id,
          assistantMessageId,
          response?.error || "续读未返回有效结果，请重试当前分段",
          currentRequestId
        );
      }
      settleSessionWebReadingProgress(
        activeSession.id,
        progress.readingRunId,
        currentRequestId,
        response
      );
    } catch (error: any) {
      logger.error("发送续读请求失败:", error);
      markAssistantMessageAsError(
        activeSession.id,
        assistantMessageId,
        error?.message || "续读请求发送失败，请检查网络或设置",
        currentRequestId
      );
      settleSessionWebReadingProgress(
        activeSession.id,
        progress.readingRunId,
        currentRequestId
      );
    }
  };

  // 用户主动生成网页全文总览；资格、内容和 48K 边界都在点击时重新校验。
  const handleGenerateWebReadingOverview = async (readingRunId: string) => {
    if (
      isStreaming ||
      isExtractingPage ||
      activeRequestIdRef.current ||
      overviewRequestIdRef.current
    ) {
      return;
    }
    overviewRequestIdRef.current = "starting";

    const sessionId = activeSessionIdRef.current;
    const currentSession = sessionsRef.current.find(
      (session) => session.id === sessionId
    );
    if (!currentSession) {
      overviewRequestIdRef.current = undefined;
      const error = "当前会话不存在，无法生成全文总览。";
      setExtractError(error);
      showToast(error);
      return;
    }
    const prepared = prepareWebReadingOverviewRequest(
      currentSession.messages,
      readingRunId
    );
    if (!prepared.success) {
      overviewRequestIdRef.current = undefined;
      setExtractError(prepared.error);
      showToast(prepared.error);
      return;
    }

    const userMessageId = createRequestId();
    const assistantMessageId = createRequestId();
    const currentRequestId = createRequestId();
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: `生成《${prepared.run.title}》的全文总览（第 1-${prepared.run.totalSegments} 段）`,
      overviewMeta: prepared.meta,
      createdAt: Date.now(),
      status: "completed",
    };
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      reasoningContent: "",
      hasReasoning: false,
      createdAt: Date.now(),
      status: "streaming",
    };
    const updatedSession: ChatSession = {
      ...currentSession,
      messages: [...currentSession.messages, userMessage, assistantMessage],
      updatedAt: Date.now(),
    };
    const nextSessions = sessionsRef.current.map((session) =>
      session.id === sessionId ? updatedSession : session
    );

    overviewRequestIdRef.current = currentRequestId;
    registerActiveRequest({
      requestId: currentRequestId,
      sessionId,
      assistantMessageId,
    });
    sessionsRef.current = nextSessions;
    setSessions(nextSessions);
    void saveSessionsToStorage(nextSessions);
    setIsStreaming(true);
    setExtractError(null);
    scrollToBottom(true);

    try {
      const response = (await browser.runtime.sendMessage({
        action: MESSAGE_TYPES.TRANSLATE,
        requestId: currentRequestId,
        targetKind: "sidepanel",
        source: "sidepanel",
        sessionId,
        messages: prepared.messages,
        thinkingEnabled,
        bypassJargonVault: true,
      })) as WebReadingResponse;
      if (!isSuccessfulWebReadingResponse(response)) {
        markAssistantMessageAsError(
          sessionId,
          assistantMessageId,
          response?.error || "全文总览未返回有效结果，请重试",
          currentRequestId
        );
      }
    } catch (error: any) {
      logger.error("生成网页全文总览失败:", error);
      markAssistantMessageAsError(
        sessionId,
        assistantMessageId,
        error?.message || "全文总览请求发送失败，请检查网络或设置",
        currentRequestId
      );
    }
  };

  // 发送常规消息或追问
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || isStreaming || isExtractingPage || !activeSession) return;

    setActiveView("chat");
    const userMessageId = createRequestId();
    const assistantMessageId = createRequestId();
    const currentRequestId = createRequestId();
    registerActiveRequest({
      requestId: currentRequestId,
      sessionId: activeSession.id,
      assistantMessageId,
    });

    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: text,
      images: images && images.length > 0 ? images : undefined,
      selectionContext: pendingSelectionContext,
      createdAt: Date.now(),
      status: "completed",
    };

    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      reasoningContent: "",
      hasReasoning: false,
      createdAt: Date.now(),
      status: "streaming",
    };

    // 自动更新会话标题（若为第一条消息且非网页速读）
    const isFirstUserMessage =
      activeSession.messages.filter((m) => m.role === "user").length === 0;
    const newTitle =
      isFirstUserMessage && !activeSession.title.startsWith("速读:")
        ? text.slice(0, 18) + (text.length > 18 ? "..." : "")
        : activeSession.title;

    const updatedSession: ChatSession = {
      ...activeSession,
      title: newTitle,
      messages: [...activeSession.messages, userMessage, assistantMessage],
      updatedAt: Date.now(),
    };

    const nextSessions = sessionsRef.current.map((s) =>
      s.id === activeSession.id ? updatedSession : s
    );
    sessionsRef.current = nextSessions;
    setSessions(nextSessions);
    void saveSessionsToStorage(nextSessions);

    setInputText("");
    setActiveQuotedText(null);
    setImages([]);
    setPendingSelectionContext(undefined);
    composerDraftsRef.current.delete(activeSession.id);
    setIsStreaming(true);
    setExtractError(null);
    scrollToBottom(true);

    try {
      const historyPayload = buildHistoryPayload(activeSession.messages, {
        role: "user",
        content: text,
        images: userMessage.images,
        selectionContext: userMessage.selectionContext,
      });

      await browser.runtime.sendMessage({
        action: MESSAGE_TYPES.TRANSLATE,
        requestId: currentRequestId,
        targetKind: "sidepanel",
        source: "sidepanel",
        sessionId: activeSession.id,
        messages: historyPayload,
        thinkingEnabled,
      });
    } catch (error: any) {
      logger.error("发送翻译请求失败:", error);
      markAssistantMessageAsError(
        activeSession.id,
        assistantMessageId,
        error?.message || "请求发送失败，请检查网络或设置",
        currentRequestId
      );
    }
  };

  // 开启用户消息行内编辑
  const handleStartEditMessage = (message: ChatMessage) => {
    if (isStreaming) return;
    setEditingMessageId(message.id);
    setEditingText(message.content);
  };

  // 取消行内编辑
  const handleCancelEditMessage = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  // 编辑框内容变动自动调整高度
  const handleEditingTextChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setEditingText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.max(68, e.target.scrollHeight)}px`;
  };

  // 编辑框按键处理 (Enter 提交，Shift+Enter 换行，Esc 取消)
  const handleEditKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    messageId: string
  ) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEditMessage();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editingText.trim() && !isStreaming) {
        void handleSaveAndResendMessage(messageId);
      }
    }
  };

  // 保存用户编辑后的内容并重新发起生成
  const handleSaveAndResendMessage = async (messageId: string) => {
    const text = editingText.trim();
    if (!text || isStreaming || !activeSession) return;

    const userMsgIndex = activeSession.messages.findIndex(
      (m) => m.id === messageId
    );
    if (userMsgIndex === -1) return;

    const oldUserMsg = activeSession.messages[userMsgIndex];
    const isWebReadingMessage = oldUserMsg.pageMeta?.isWebPageReading === true;
    const userInstruction =
      isWebReadingMessage && text !== oldUserMsg.content
        ? text
        : oldUserMsg.pageMeta?.userInstruction;
    const replayPrompt = isWebReadingMessage
      ? buildReplayableWebReadingPrompt(oldUserMsg, userInstruction)
      : undefined;
    if (replayPrompt && !replayPrompt.success) {
      setExtractError(replayPrompt.error);
      showToast(replayPrompt.error);
      return;
    }

    // 截断该消息之后的所有历史轮次
    const preservedHistory = activeSession.messages.slice(0, userMsgIndex);

    const assistantMessageId = createRequestId();
    const currentRequestId = createRequestId();
    const replayReadingRunId = replayPrompt?.success
      ? oldUserMsg.pageMeta?.readingRunId
      : undefined;
    const ownedReplayRunId =
      replayReadingRunId &&
      webReadingProgressRef.current.get(activeSession.id)?.readingRunId ===
        replayReadingRunId
        ? replayReadingRunId
        : undefined;
    registerActiveRequest({
      requestId: currentRequestId,
      sessionId: activeSession.id,
      assistantMessageId,
      readingRunId: ownedReplayRunId,
    });

    const updatedUserMsg: ChatMessage = {
      ...oldUserMsg,
      content: text,
      pageMeta: oldUserMsg.pageMeta
        ? {
            ...oldUserMsg.pageMeta,
            userInstruction: userInstruction?.trim() || undefined,
          }
        : undefined,
      createdAt: Date.now(),
      status: "completed",
    };

    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      reasoningContent: "",
      hasReasoning: false,
      createdAt: Date.now(),
      status: "streaming",
    };

    // 如果这是第一条用户消息且非网页速读，更新会话标题
    const isFirstUserMessage =
      preservedHistory.filter((m) => m.role === "user").length === 0;
    const newTitle =
      isFirstUserMessage && !activeSession.title.startsWith("速读:")
        ? text.slice(0, 18) + (text.length > 18 ? "..." : "")
        : activeSession.title;

    const nextMessages = [
      ...preservedHistory,
      updatedUserMsg,
      assistantMessage,
    ];
    const updatedSession: ChatSession = {
      ...activeSession,
      title: newTitle,
      messages: nextMessages,
      updatedAt: Date.now(),
    };

    const nextSessions = sessionsRef.current.map((s) =>
      s.id === activeSession.id ? updatedSession : s
    );
    sessionsRef.current = nextSessions;
    setSessions(nextSessions);

    // 退出编辑状态并启动流式生成
    setEditingMessageId(null);
    setEditingText("");
    setIsStreaming(true);
    setExtractError(null);
    scrollToBottom(true);

    const savedWithReadingProgress = replayPrompt?.success
      ? rewindSessionWebReadingProgress(
        activeSession.id,
        updatedUserMsg,
        currentRequestId,
        assistantMessageId
        )
      : false;
    if (!savedWithReadingProgress) {
      void saveSessionsToStorage(nextSessions);
    }

    try {
      let messagesPayload: any[];
      if (replayPrompt?.success) {
        const historyPayload = buildWebReadingHistoryPayload(preservedHistory);
        const hasSystem = historyPayload.some(
          (message) => message.role === "system"
        );
        messagesPayload = [
          ...(hasSystem
            ? []
            : [
                {
                  role: "system" as const,
                  content: WEB_READING_SYSTEM_PROMPT,
                },
              ]),
          ...historyPayload,
          { role: "user" as const, content: replayPrompt.prompt },
        ];
      } else {
        messagesPayload = buildHistoryPayload(
          preservedHistory,
          updatedUserMsg
        );
      }

      const response = (await browser.runtime.sendMessage({
        action: MESSAGE_TYPES.TRANSLATE,
        requestId: currentRequestId,
        targetKind: "sidepanel",
        source: "sidepanel",
        sessionId: activeSession.id,
        messages: messagesPayload,
        thinkingEnabled,
      })) as WebReadingResponse;
      if (replayPrompt?.success) {
        if (!isSuccessfulWebReadingResponse(response)) {
          markAssistantMessageAsError(
            activeSession.id,
            assistantMessageId,
            response?.error || "网页通读未返回有效结果，请重试",
            currentRequestId
          );
        }
        settleSessionWebReadingProgress(
          activeSession.id,
          oldUserMsg.pageMeta?.readingRunId,
          currentRequestId,
          response
        );
      }
    } catch (error: any) {
      logger.error("重新发送编辑消息失败:", error);
      markAssistantMessageAsError(
        activeSession.id,
        assistantMessageId,
        error?.message || "请求发送失败，请检查网络或设置",
        currentRequestId
      );
      if (replayPrompt?.success) {
        settleSessionWebReadingProgress(
          activeSession.id,
          oldUserMsg.pageMeta?.readingRunId,
          currentRequestId
        );
      }
    }
  };

  const handleRetryWebReadingOverview = async (
    assistantMessageId: string,
    overviewUserMessage: ChatMessage
  ) => {
    if (
      isStreaming ||
      !activeSession ||
      activeRequestIdRef.current ||
      overviewRequestIdRef.current ||
      !overviewUserMessage.overviewMeta
    ) {
      return;
    }
    overviewRequestIdRef.current = "starting";

    const prepared = prepareWebReadingOverviewRequest(
      activeSession.messages,
      overviewUserMessage.overviewMeta.readingRunId,
      overviewUserMessage.overviewMeta.sourceFingerprint
    );
    if (!prepared.success) {
      overviewRequestIdRef.current = undefined;
      setExtractError(prepared.error);
      showToast(prepared.error);
      return;
    }

    const retryResult = retryAssistantMessageAndTruncate(
      activeSession.messages,
      assistantMessageId
    );
    const currentRequestId = createRequestId();
    overviewRequestIdRef.current = currentRequestId;
    registerActiveRequest({
      requestId: currentRequestId,
      sessionId: activeSession.id,
      assistantMessageId,
    });

    const updatedSession: ChatSession = {
      ...activeSession,
      messages: retryResult.updatedMessages,
      updatedAt: Date.now(),
    };
    const nextSessions = sessionsRef.current.map((session) =>
      session.id === activeSession.id ? updatedSession : session
    );
    sessionsRef.current = nextSessions;
    setSessions(nextSessions);
    void saveSessionsToStorage(nextSessions);
    setRegeneratingId(assistantMessageId);
    setTimeout(() => setRegeneratingId(null), 800);
    setIsStreaming(true);
    setExtractError(null);
    scrollToBottom(true);

    try {
      const response = (await browser.runtime.sendMessage({
        action: MESSAGE_TYPES.TRANSLATE,
        requestId: currentRequestId,
        targetKind: "sidepanel",
        source: "sidepanel",
        sessionId: activeSession.id,
        messages: prepared.messages,
        thinkingEnabled,
        bypassJargonVault: true,
      })) as WebReadingResponse;
      if (!isSuccessfulWebReadingResponse(response)) {
        markAssistantMessageAsError(
          activeSession.id,
          assistantMessageId,
          response?.error || "全文总览未返回有效结果，请重试",
          currentRequestId
        );
      }
    } catch (error: any) {
      logger.error("重试网页全文总览失败:", error);
      markAssistantMessageAsError(
        activeSession.id,
        assistantMessageId,
        error?.message || "全文总览重试失败，请检查网络或设置",
        currentRequestId
      );
    }
  };

  // 重新生成助手回答 / 重试错误卡片
  const handleRegenerateMessage = async (
    assistantMessageId: string,
    bypassJargonVault = false
  ) => {
    if (isStreaming || !activeSession) return;

    const targetAssistantIndex = activeSession.messages.findIndex(
      (message) =>
        message.id === assistantMessageId && message.role === "assistant"
    );
    const precedingUserMessage =
      targetAssistantIndex > 0
        ? activeSession.messages[targetAssistantIndex - 1]
        : undefined;
    if (
      precedingUserMessage?.role === "user" &&
      precedingUserMessage.overviewMeta?.kind === "web-reading-overview"
    ) {
      await handleRetryWebReadingOverview(
        assistantMessageId,
        precedingUserMessage
      );
      return;
    }

    const retryResult = retryAssistantMessageAndTruncate(
      activeSession.messages,
      assistantMessageId
    );
    const { assistantIndex } = retryResult;

    // 截取该回答之前的所有上下文
    const historyMessages = activeSession.messages.slice(0, assistantIndex);
    if (historyMessages.length === 0) return;

    const prevUserMsg = historyMessages[historyMessages.length - 1];
    if (prevUserMsg.role !== "user") return;

    const replayPrompt = prevUserMsg.pageMeta?.isWebPageReading
      ? buildReplayableWebReadingPrompt(prevUserMsg)
      : undefined;
    if (replayPrompt && !replayPrompt.success) {
      setExtractError(replayPrompt.error);
      showToast(replayPrompt.error);
      return;
    }

    setRegeneratingId(assistantMessageId);
    setTimeout(() => setRegeneratingId(null), 800);

    const currentRequestId = createRequestId();
    const replayReadingRunId = replayPrompt?.success
      ? prevUserMsg.pageMeta?.readingRunId
      : undefined;
    const ownedReplayRunId =
      replayReadingRunId &&
      webReadingProgressRef.current.get(activeSession.id)?.readingRunId ===
        replayReadingRunId
        ? replayReadingRunId
        : undefined;
    registerActiveRequest({
      requestId: currentRequestId,
      sessionId: activeSession.id,
      assistantMessageId,
      readingRunId: ownedReplayRunId,
    });

    const updatedSession: ChatSession = {
      ...activeSession,
      messages: retryResult.updatedMessages,
      updatedAt: Date.now(),
    };

    const nextSessions = sessionsRef.current.map((s) =>
      s.id === activeSession.id ? updatedSession : s
    );
    sessionsRef.current = nextSessions;
    setSessions(nextSessions);

    setIsStreaming(true);
    setExtractError(null);
    scrollToBottom(true);

    const savedWithReadingProgress = replayPrompt?.success
      ? rewindSessionWebReadingProgress(
        activeSession.id,
        prevUserMsg,
        currentRequestId,
        assistantMessageId
        )
      : false;
    if (!savedWithReadingProgress) {
      void saveSessionsToStorage(nextSessions);
    }

    try {
      let messagesPayload: any[];
      if (replayPrompt?.success) {
        const earlierHistoryPayload = buildWebReadingHistoryPayload(
          historyMessages.slice(0, -1)
        );
        const hasSystem = earlierHistoryPayload.some(
          (message) => message.role === "system"
        );
        messagesPayload = [
          ...(hasSystem
            ? []
            : [
                {
                  role: "system" as const,
                  content: WEB_READING_SYSTEM_PROMPT,
                },
              ]),
          ...earlierHistoryPayload,
          { role: "user" as const, content: replayPrompt.prompt },
        ];
      } else {
        messagesPayload = buildHistoryPayload(historyMessages);
      }

      const response = (await browser.runtime.sendMessage({
        action: MESSAGE_TYPES.TRANSLATE,
        requestId: currentRequestId,
        targetKind: "sidepanel",
        source: "sidepanel",
        sessionId: activeSession.id,
        messages: messagesPayload,
        thinkingEnabled,
        bypassJargonVault,
      })) as WebReadingResponse;
      if (replayPrompt?.success) {
        if (!isSuccessfulWebReadingResponse(response)) {
          markAssistantMessageAsError(
            activeSession.id,
            assistantMessageId,
            response?.error || "网页通读未返回有效结果，请重试",
            currentRequestId
          );
        }
        settleSessionWebReadingProgress(
          activeSession.id,
          prevUserMsg.pageMeta?.readingRunId,
          currentRequestId,
          response
        );
      }
    } catch (error: any) {
      logger.error("重新生成回答失败:", error);
      markAssistantMessageAsError(
        activeSession.id,
        assistantMessageId,
        error?.message || "重新生成失败，请检查网络或设置",
        currentRequestId
      );
      if (replayPrompt?.success) {
        settleSessionWebReadingProgress(
          activeSession.id,
          prevUserMsg.pageMeta?.readingRunId,
          currentRequestId
        );
      }
    }
  };

  // 中止当前生成
  const handleStopGenerating = async () => {
    const stoppedRequestId = activeRequestIdRef.current;
    if (!stoppedRequestId) return;
    const stoppedOwner = getActiveSidepanelRequestOwner(
      stoppedRequestId,
      activeRequestOwnerRef.current
    );

    // 先同步失效本地归属和 pending；后台清理完成后不再改动任何前台状态。
    clearActiveRequest(stoppedRequestId);
    setIsStreaming(false);
    if (stoppedOwner) {
      const updatedSessions = sessionsRef.current.map((session) => {
        if (session.id !== stoppedOwner.sessionId) return session;
        const messages = session.messages.map((message) =>
          message.id === stoppedOwner.assistantMessageId &&
          message.role === "assistant" &&
          message.status === "streaming"
            ? {
                ...message,
                status: "error" as const,
                errorMessage: "生成已停止，可点击重试继续当前内容。",
              }
            : message
        );
        return { ...session, messages, updatedAt: Date.now() };
      });
      sessionsRef.current = updatedSessions;
      setSessions(updatedSessions);
      const hasPendingWebReading = Array.from(
        webReadingProgressRef.current.values()
      ).some((progress) => progress.pendingRequestId === stoppedRequestId);
      commitWebReadingProgress(
        (previous) =>
          cancelWebReadingProgressByRequest(previous, stoppedRequestId),
        stoppedOwner.sessionId
      );
      if (!hasPendingWebReading) {
        void saveSessionsToStorage(updatedSessions);
      }
    }

    try {
      await browser.runtime.sendMessage({
        action: MESSAGE_TYPES.CLEANUP,
        requestId: stoppedRequestId,
        source: "sidepanel",
      });
    } catch (error) {
      logger.error("清理请求失败:", error);
    }
  };

  // 新建会话
  const handleCreateNewSession = () => {
    if (isStreaming) {
      void handleStopGenerating();
    }
    const fresh = createNewSession();
    const updatedSessions = [fresh, ...sessionsRef.current];
    sessionsRef.current = updatedSessions;
    setSessions(updatedSessions);
    void saveSessionsToStorage(updatedSessions);
    activateSessionWithDraft(fresh.id);
    void saveActiveSessionId(fresh.id);
    setActiveView("chat");
    setShowDrawer(false);
    setExtractError(null);
    inputRef.current?.focus();
    showToast("已新建对话");
  };

  // 删除会话
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ownedRequest = getActiveSidepanelRequestOwner(
      activeRequestIdRef.current,
      activeRequestOwnerRef.current
    );
    const requestIdToCancel =
      ownedRequest?.sessionId === sessionId ? ownedRequest.requestId : undefined;
    if (requestIdToCancel) {
      clearActiveRequest(requestIdToCancel);
      setIsStreaming(false);
      void browser.runtime
        .sendMessage({
          action: MESSAGE_TYPES.CLEANUP,
          requestId: requestIdToCancel,
          source: "sidepanel",
        })
        .catch((error) => logger.error("删除会话时清理请求失败:", error));
    }
    const hadWebReadingProgress = webReadingProgressRef.current.has(sessionId);
    const filtered = sessionsRef.current.filter((s) => s.id !== sessionId);
    composerDraftsRef.current.delete(sessionId);
    if (filtered.length === 0) {
      const fresh = createNewSession();
      sessionsRef.current = [fresh];
      setSessions([fresh]);
      activateSessionWithDraft(fresh.id, false);
      void saveActiveSessionId(fresh.id);
    } else {
      sessionsRef.current = filtered;
      setSessions(filtered);
      if (activeSessionIdRef.current === sessionId) {
        activateSessionWithDraft(filtered[0].id, false);
        void saveActiveSessionId(filtered[0].id);
      }
    }
    commitWebReadingProgress((prev) => {
      if (!prev.has(sessionId)) return prev;
      const next = new Map(prev);
      next.delete(sessionId);
      return next;
    }, sessionId);
    if (!hadWebReadingProgress) {
      void saveSessionsToStorage(sessionsRef.current);
    }
  };

  // 复制文本
  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccessId(id);
      setTimeout(() => setCopySuccessId(null), 2000);
      return true;
    } catch (err) {
      logger.error("复制失败:", err);
      return false;
    }
  };

  // 复制整场会话全文 (Markdown 格式)
  const handleCopyAllSession = async () => {
    if (!activeSession || activeSession.messages.length === 0) {
      showToast("当前会话暂无对话内容");
      return;
    }
    const fullText = formatSessionAsMarkdown(activeSession);
    try {
      await navigator.clipboard.writeText(fullText);
      setCopyAllSuccess(true);
      showToast("📋 已复制整场会话全文 (Markdown 格式)");
      setTimeout(() => setCopyAllSuccess(false), 2000);
    } catch (err) {
      logger.error("复制全文失败:", err);
      showToast("复制失败，请重试");
    }
  };

  // 导出 Markdown 文件
  const handleExportSessionMarkdown = () => {
    if (!activeSession || activeSession.messages.length === 0) {
      showToast("当前会话暂无对话内容");
      setShowExportMenu(false);
      return;
    }
    downloadSessionMarkdownFile(activeSession);
    showToast(`已导出《${activeSession.title}》Markdown 文件`);
    setShowExportMenu(false);
  };

  // 导出 JSON 文件
  const handleExportSessionJson = () => {
    if (!activeSession || activeSession.messages.length === 0) {
      showToast("当前会话暂无对话内容");
      setShowExportMenu(false);
      return;
    }
    downloadSessionJsonFile(activeSession);
    showToast(`已导出《${activeSession.title}》JSON 会话数据`);
    setShowExportMenu(false);
  };

  // 存入黑话生词本
  const handleSaveMessageToVault = async (
    message: ChatMessage,
    session?: ChatSession
  ) => {
    if (!message.content) return;

    // 寻找上一条 user 消息作为黑话术语
    const msgIdx =
      session?.messages.findIndex((m) => m.id === message.id) ?? -1;
    let term = "黑话词条";
    let sourceUrl: string | undefined;

    if (msgIdx > 0 && session) {
      const prevUserMsg = session.messages[msgIdx - 1];
      if (prevUserMsg && prevUserMsg.role === "user") {
        if (prevUserMsg.pageMeta?.title) {
          term = prevUserMsg.pageMeta.title;
          sourceUrl = prevUserMsg.pageMeta.url;
        } else {
          term = prevUserMsg.content;
        }
      }
    }

    const inferred = inferJargonDetails(term, message.content, sourceUrl);
    const sourceContext =
      term.trim() !== inferred.term.trim() ? term.trim() : undefined;

    try {
      await saveJargonItem({
        term: inferred.term,
        explanation: inferred.explanation,
        analogy: inferred.analogy,
        category: inferred.category,
        tags: inferred.tags,
        isStarred: true,
        sourceUrl,
        sourceContext,
      });

      setSavedVaultMessageIds((prev) => {
        const next = new Set(prev);
        next.add(message.id);
        return next;
      });
      showToast(`⭐ 已将 "${inferred.term}" 存入黑话生词本！`);
    } catch (err) {
      logger.error("存入生词本失败:", err);
    }
  };

  // 处理剪贴板图片粘贴
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    try {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf("image") !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            if (!ImageUtils.isValidImageSize(file.size)) {
              alert("图片大小超过限制 (10MB)");
              return;
            }
            const compressed = await ImageUtils.compressImage(file);
            setImages((prev) => [
              ...(prev || []),
              {
                data: compressed,
                mimeType: file.type,
                fileName: `paste-${Date.now()}`,
              },
            ]);
            showToast("已添加图片 🖼️");
          }
        }
      }
    } catch (err: any) {
      logger.error("粘贴图片失败:", err);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => (prev || []).filter((_, i) => i !== index));
  };

  // 划词追问处理逻辑：格式化引用并注入输入框
  const handleQuoteAction = (textToQuote: string) => {
    const rawQuote = (textToQuote || selectedQuoteText || "").trim();
    if (!rawQuote) return;

    const formatted = formatQuoteMarkdown(rawQuote);

    // 如果之前已有引用，先将旧引用前缀剥离
    let baseText = inputText;
    if (activeQuotedText) {
      baseText = removeQuoteFromInputText(baseText, activeQuotedText);
    } else {
      baseText = removeQuoteFromInputText(baseText);
    }

    // 拼接成新引用
    const nextInput = `${formatted}${baseText.trimStart()}`;

    setInputText(nextInput);
    setActiveQuotedText(rawQuote);
    setQuoteBarVisible(false);

    // 清除页面选区
    window.getSelection()?.removeAllRanges();

    // 自动聚焦输入框并将光标移至末尾，方便用户直接键入问题
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }, 30);
  };

  // 取消或清除引用
  const handleClearQuote = () => {
    if (activeQuotedText) {
      const stripped = removeQuoteFromInputText(inputText, activeQuotedText);
      setInputText(stripped);
      setActiveQuotedText(null);
    } else {
      const stripped = removeQuoteFromInputText(inputText);
      setInputText(stripped);
      setActiveQuotedText(null);
    }
    inputRef.current?.focus();
  };

  // 监听输入内容变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    // 若用户手动删空文本，自动重置引用胶囊状态
    if (!val.trim() && activeQuotedText) {
      setActiveQuotedText(null);
    }
  };

  // 快捷按键处理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Backspace" && activeQuotedText) {
      const formatted = formatQuoteMarkdown(activeQuotedText);
      if (inputText.trim() === formatted.trim() || !inputText.trim()) {
        setActiveQuotedText(null);
        setInputText("");
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const webReadingOverviewViewState = useMemo(() => {
    if (!activeSession || isStreaming || isExtractingPage) {
      return {
        actions: new Map<string, WebReadingOverviewAction>(),
        staleAssistantIds: new Set<string>(),
      };
    }

    const actions = getWebReadingOverviewActions(activeSession.messages);
    const fingerprintByRun = new Map(
      Array.from(actions.values()).map((action) => [
        action.readingRunId,
        action.sourceFingerprint,
      ])
    );
    const staleAssistantIds = new Set<string>();
    activeSession.messages.forEach((message, index) => {
      if (message.role !== "user" || !message.overviewMeta) return;
      const assistant = activeSession.messages[index + 1];
      if (assistant?.role !== "assistant") return;
      const currentFingerprint = fingerprintByRun.get(
        message.overviewMeta.readingRunId
      );
      if (currentFingerprint !== message.overviewMeta.sourceFingerprint) {
        staleAssistantIds.add(assistant.id);
      }
    });
    return { actions, staleAssistantIds };
  }, [activeSession?.messages, isStreaming, isExtractingPage]);
  const webReadingOverviewActions = webReadingOverviewViewState.actions;

  return (
    <div className="sidepanel-container" ref={sidepanelContainerRef}>
      {/* 顶部重构布局：第一层 核心顶栏 (Header Bar) */}
      <header className="sidepanel-header-bar">
        <div className="header-bar-left">
          <button
            type="button"
            className="icon-btn drawer-toggle-btn"
            title="会话与生词本抽屉"
            onClick={() => setShowDrawer((prev) => !prev)}
          >
            <History theme="outline" size="18" />
          </button>

          <div className="header-brand-group">
            <span className="brand-title">人话翻译器</span>
            <span
              className="brand-sub-title"
              title={
                activeView === "vault"
                  ? "黑话生词本"
                  : activeSession?.title || "新对话"
              }
            >
              {activeView === "vault"
                ? "黑话生词本"
                : activeSession?.title || "新对话"}
            </span>
          </div>

          {/* 顶栏视图切换药丸 (对话 / 生词本) */}
          <div className="view-switch-pills">
            <button
              type="button"
              className={`view-pill ${activeView === "chat" ? "active" : ""}`}
              onClick={() => setActiveView("chat")}
            >
              <Message theme="outline" size="13" />
              <span>对话</span>
            </button>
            <button
              type="button"
              className={`view-pill ${activeView === "vault" ? "active" : ""}`}
              onClick={() => setActiveView("vault")}
            >
              <BookOne theme="outline" size="13" />
              <span>生词本</span>
            </button>
          </div>
        </div>

        <div className="header-bar-right">
          <button
            type="button"
            className="icon-btn new-chat-btn"
            title="新建对话"
            onClick={handleCreateNewSession}
          >
            <Add theme="outline" size="18" />
          </button>

          {/* 复制整场会话全文 */}
          <button
            type="button"
            className={`icon-btn copy-all-btn ${copyAllSuccess ? "success" : ""}`}
            title="复制整场会话全文 (Markdown)"
            onClick={handleCopyAllSession}
          >
            {copyAllSuccess ? (
              <CheckOne theme="filled" size="18" fill="#10b981" />
            ) : (
              <Copy theme="outline" size="18" />
            )}
          </button>

          {/* 会话导出下拉菜单 */}
          <div className="header-export-wrapper" ref={exportMenuRef}>
            <button
              type="button"
              className={`icon-btn export-btn ${showExportMenu ? "active" : ""}`}
              title="导出会话记录"
              onClick={() => setShowExportMenu((prev) => !prev)}
            >
              <Export theme="outline" size="18" />
            </button>

            {showExportMenu && (
              <div className="header-export-dropdown" role="menu">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={handleExportSessionMarkdown}
                >
                  <FileText theme="outline" size="14" />
                  <span>导出为 Markdown 文件 (.md)</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={handleExportSessionJson}
                >
                  <FileCode theme="outline" size="14" />
                  <span>导出为 JSON 会话数据 (.json)</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    void handleCopyAllSession();
                    setShowExportMenu(false);
                  }}
                >
                  <Copy theme="outline" size="14" />
                  <span>复制会话全文到剪贴板</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="icon-btn settings-btn"
            title="设置"
            onClick={() => browser.runtime.openOptionsPage()}
          >
            <SettingTwo theme="outline" size="18" />
          </button>
        </div>
      </header>

      {/* 顶部重构布局：第二层 二级快捷工具条 (Quick Bar - 仅在对话视图展示) */}
      {activeView === "chat" && (
        <div className="sidepanel-quick-bar">
          <div className="quick-bar-left">
            <button
              type="button"
              className={`web-read-btn ${isExtractingPage ? "loading" : ""}`}
              title="一键提取并人话通读当前打开的网页正文"
              disabled={isStreaming || isExtractingPage}
              onClick={handleReadCurrentPage}
            >
              {isExtractingPage ? (
                <LoadingOne theme="outline" size="14" className="spin-icon" />
              ) : (
                <BookOne theme="outline" size="14" />
              )}
              <span>通读当前网页</span>
            </button>

            <button
              type="button"
              className={`thinking-toggle-btn ${thinkingEnabled ? "active" : ""}`}
              title={thinkingEnabled ? "深度思考已开启 (思维链模式)" : "开启深度思考 (思维链模式)"}
              onClick={() => setThinkingEnabled((prev) => !prev)}
            >
              <Brain theme="outline" size="14" />
              <span>深度思考</span>
            </button>
          </div>

          <div className="quick-bar-right">
            <ThemeModeSelector
              value={themeMode}
              onChange={(mode) => setThemeMode(mode)}
            />
          </div>
        </div>
      )}

      {/* 提取网页错误提示条 */}
      {extractError && (
        <div className="notification-bar error-banner">
          <Tips theme="outline" size="16" />
          <span className="banner-text">{extractError}</span>
          <button
            type="button"
            className="banner-close-btn"
            onClick={() => setExtractError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* 抽屉通知 Toast */}
      {toastMessage && (
        <div className="vault-toast-banner">
          <Tips theme="outline" size="14" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 顶部抽屉（包含对话历史与生词本双 Tab） */}
      {showDrawer && (
        <div className="drawer-overlay" onClick={() => setShowDrawer(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-tabs-header">
              <button
                type="button"
                className={`drawer-tab-btn ${
                  drawerTab === "history" ? "active" : ""
                }`}
                onClick={() => setDrawerTab("history")}
              >
                <Message theme="outline" size="14" />
                <span>💬 对话历史</span>
              </button>
              <button
                type="button"
                className={`drawer-tab-btn ${
                  drawerTab === "vault" ? "active" : ""
                }`}
                onClick={() => setDrawerTab("vault")}
              >
                <BookOne theme="outline" size="14" />
                <span>📚 黑话生词本</span>
              </button>
            </div>

            {drawerTab === "history" ? (
              <>
                <div className="drawer-header">
                  <span className="drawer-title">历史会话</span>
                  <button
                    type="button"
                    className="new-session-cta"
                    onClick={handleCreateNewSession}
                  >
                    <Add theme="outline" size="14" />
                    <span>新建会话</span>
                  </button>
                </div>
                <div className="drawer-list">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`drawer-item ${
                        session.id === activeSessionId && activeView === "chat"
                          ? "active"
                          : ""
                      }`}
                      onClick={() => {
                        if (session.id !== activeSessionId) {
                          activateSessionWithDraft(session.id);
                        }
                        void saveActiveSessionId(session.id);
                        setActiveView("chat");
                        setShowDrawer(false);
                      }}
                    >
                      <Message
                        theme="outline"
                        size="16"
                        className="item-icon"
                      />
                      <span className="item-title" title={session.title}>
                        {session.title}
                      </span>
                      <button
                        type="button"
                        className="delete-item-btn"
                        title="删除会话"
                        onClick={(e) => handleDeleteSession(session.id, e)}
                      >
                        <Delete theme="outline" size="14" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="drawer-vault-shortcut">
                <BookOne
                  theme="two-tone"
                  size="36"
                  fill={["#6366f1", "#e0e7ff"]}
                  className="vault-shortcut-icon"
                />
                <span className="vault-shortcut-desc">
                  收录收藏的大厂黑话、AI技术与职场通俗人话解释。
                </span>
                <button
                  type="button"
                  className="vault-open-btn"
                  onClick={() => {
                    setActiveView("vault");
                    setShowDrawer(false);
                  }}
                >
                  <BookOne theme="outline" size="14" />
                  <span>打开完整生词本</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 主视图展示：如果处于生词本视图，渲染 JargonVaultPanel */}
      {activeView === "vault" ? (
        <JargonVaultPanel onSwitchToChat={() => setActiveView("chat")} />
      ) : (
        <>
          {/* 消息对话主区域 */}
          <main className="chat-content" ref={chatContentRef}>
            {/* 划词浮动“追问”胶囊按钮 */}
            <SidepanelQuoteActionBar
              visible={quoteBarVisible}
              position={quoteBarPosition}
              selectedText={selectedQuoteText}
              onQuote={handleQuoteAction}
            />

            {/* 空状态展示 */}
            {(!activeSession || activeSession.messages.length === 0) && (
              <div className="empty-state">
                <div className="empty-icon">
                  <Thunderbolt theme="filled" size="32" />
                </div>
                <h2 className="empty-title">人话翻译与长文通读</h2>
                <p className="empty-desc">
                  一键提取网页长文输出接地气速读报告，支持多轮深度追问与黑话生词沉淀。
                </p>

                {/* 突出展示的一键通读当前网页卡片 */}
                <div className="web-read-hero-card">
                  <div className="hero-card-header">
                    <div className="hero-badge">
                      <BookOne theme="filled" size="14" />
                      <span>核心功能</span>
                    </div>
                    <h3 className="hero-title">📄 一键人话通读当前网页</h3>
                  </div>
                  <p className="hero-desc">
                    智能提取正文并一键输出：
                    <strong>💡大白话总览</strong> +{" "}
                    <strong>📖核心黑话速查表</strong> +{" "}
                    <strong>🎯要点与行动项</strong> +{" "}
                    <strong>💬深度追问指引</strong>。
                  </p>
                  <button
                    type="button"
                    className="hero-action-btn"
                    disabled={isStreaming || isExtractingPage}
                    onClick={handleReadCurrentPage}
                  >
                    {isExtractingPage ? (
                      <>
                        <LoadingOne
                          theme="outline"
                          size="16"
                          className="spin-icon"
                        />
                        <span>正在提取网页正文并生成人话速读...</span>
                      </>
                    ) : (
                      <>
                        <BookOne theme="outline" size="16" />
                        <span>立即通读当前网页</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="quick-prompts-divider">
                  <span>或从常用黑话翻译开始</span>
                </div>

                <div className="quick-prompts-grid">
                  {QUICK_PROMPTS.map((prompt, index) => (
                    <button
                      type="button"
                      key={index}
                      className="quick-prompt-card"
                      onClick={() => handleSendMessage(prompt)}
                    >
                      <DocDetail theme="outline" size="14" />
                      <span>{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 正在提取正文时的加载提示 */}
            {isExtractingPage && (
              <div className="extract-loading-card">
                <LoadingOne theme="outline" size="20" className="spin-icon" />
                <div className="loading-text-group">
                  <span className="loading-title">
                    正在提取网页正文与元数据...
                  </span>
                  <span className="loading-sub">
                    已去除导航、侧边栏和广告干扰
                  </span>
                </div>
              </div>
            )}

            {/* 对话消息流 */}
            {activeSession?.messages.map((message) => (
              <div
                key={message.id}
                className={`chat-bubble-row ${
                  message.role === "user" ? "user-row" : "assistant-row"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="assistant-avatar">人</div>
                )}

                <div className="bubble-content-wrapper">
                  {/* 思维链展示 */}
                  {message.role === "assistant" &&
                    message.hasReasoning &&
                    Boolean(message.reasoningContent) && (
                      <CollapsibleThinkingChain
                        reasoningText={message.reasoningContent || ""}
                        isTranslating={message.status === "streaming"}
                      />
                    )}

                  {/* 主内容卡片 */}
                  <div
                    className={`bubble-card ${
                      message.role === "user" ? "user-card" : "assistant-card"
                    } ${message.status === "error" ? "error-card" : ""} ${
                      message.role === "user" && editingMessageId === message.id
                        ? "editing-card"
                        : ""
                    }`}
                  >
                    {message.role === "user" ? (
                      editingMessageId === message.id ? (
                        <div className="user-inline-editor">
                          <textarea
                            ref={editingTextareaRef}
                            className="inline-edit-textarea"
                            value={editingText}
                            rows={2}
                            placeholder="输入修改后的消息..."
                            onChange={handleEditingTextChange}
                            onKeyDown={(e) => handleEditKeyDown(e, message.id)}
                          />
                          <div className="inline-edit-footer">
                            <span className="inline-edit-hint">
                              Esc 取消 · Enter 提交 · Shift+Enter 换行
                            </span>
                            <div className="inline-edit-actions">
                              <button
                                type="button"
                                className="inline-edit-btn cancel-btn"
                                onClick={handleCancelEditMessage}
                              >
                                取消
                              </button>
                              <button
                                type="button"
                                className="inline-edit-btn submit-btn"
                                disabled={!editingText.trim() || isStreaming}
                                onClick={() =>
                                  handleSaveAndResendMessage(message.id)
                                }
                              >
                                <Send theme="outline" size="12" />
                                <span>保存并重新发送</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="user-bubble-wrapper">
                          {message.overviewMeta ? (
                            <div className="webpage-user-card overview-user-card">
                              <div className="webpage-badge">
                                <DocDetail theme="filled" size="13" />
                                <span>全文总览</span>
                              </div>
                              <div
                                className="webpage-title"
                                title={
                                  typeof message.overviewMeta.title === "string"
                                    ? message.overviewMeta.title
                                    : "网页全文总览"
                                }
                              >
                                {typeof message.overviewMeta.title === "string"
                                  ? message.overviewMeta.title
                                  : "网页全文总览"}
                              </div>
                              <div className="webpage-meta-row">
                                <span className="webpage-words-tag">
                                  {Number.isInteger(
                                    message.overviewMeta.totalSegments
                                  )
                                    ? `来源范围：第 1-${message.overviewMeta.totalSegments} 段`
                                    : "来源范围：全部已读分段"}
                                </span>
                              </div>
                            </div>
                          ) : message.pageMeta?.isWebPageReading ? (
                            <div className="webpage-user-card">
                              <div className="webpage-badge">
                                <BookOne theme="filled" size="13" />
                                <span>网页通读</span>
                              </div>
                              <div
                                className="webpage-title"
                                title={message.pageMeta.title}
                              >
                                {message.pageMeta.title}
                              </div>
                              <div className="webpage-meta-row">
                                {message.pageMeta.url && (
                                  <a
                                    href={message.pageMeta.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="webpage-url-link"
                                    title={message.pageMeta.url}
                                  >
                                    <LinkOne theme="outline" size="12" />
                                    <span>
                                      {new URL(message.pageMeta.url).hostname}
                                    </span>
                                  </a>
                                )}
                                {Boolean(message.pageMeta.wordCount) && (
                                  <span className="webpage-words-tag">
                                    约 {message.pageMeta.wordCount} 字
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="user-message-body">
                              {message.images && message.images.length > 0 && (
                                <div className="message-images-grid">
                                  {message.images.map((img, imgIdx) => (
                                    <img
                                      key={imgIdx}
                                      src={img.data}
                                      alt="用户上传图片"
                                      className="message-attached-image"
                                    />
                                  ))}
                                </div>
                              )}
                              {message.selectionContext && (
                                <SelectionContextDetails
                                  context={message.selectionContext}
                                  compact
                                />
                              )}
                              <div className="user-text">{message.content}</div>
                            </div>
                          )}

                          {/* 悬浮操作区：编辑按钮 */}
                          {!message.overviewMeta && (
                            <div className="user-bubble-actions">
                              <button
                                type="button"
                                className="user-action-btn edit-msg-btn"
                                title="编辑消息"
                                disabled={isStreaming}
                                onClick={() => handleStartEditMessage(message)}
                              >
                                <Edit theme="outline" size="13" />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    ) : (
                      <>
                        {webReadingOverviewViewState.staleAssistantIds.has(
                          message.id
                        ) && (
                          <div className="overview-stale-notice">
                            此总览基于旧分段结果，当前已失效，请重新生成全文总览。
                          </div>
                        )}
                        {message.content ? (
                          <div
                            className="markdown-content"
                            dangerouslySetInnerHTML={{
                              __html: parseMarkdown(message.content),
                            }}
                          />
                        ) : message.status === "streaming" ? (
                          <div className="streaming-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                            正在提炼人话速读报告...
                          </div>
                        ) : null}

                        {message.status === "error" && (
                          <div className="error-card-body">
                            <div className="error-message">
                              <Tips theme="outline" size="14" />
                              <span>
                                {message.errorMessage ||
                                  "生成出现错误，请重试"}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="error-retry-btn"
                              title="重试生成"
                              disabled={isStreaming}
                              onClick={() =>
                                handleRegenerateMessage(message.id, false)
                              }
                            >
                              <Refresh
                                theme="outline"
                                size="13"
                                className={
                                  regeneratingId === message.id
                                    ? "spin-icon"
                                    : ""
                                }
                              />
                              <span>重试</span>
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {/* 卡片底部操作 */}
                    {message.content && message.role === "assistant" && (
                      <div className="bubble-footer">
                        {message.resultSource === "jargon-vault" && (
                          <span className="vault-result-badge">
                            来自生词本
                          </span>
                        )}
                        <button
                          type="button"
                          className="action-link-btn regenerate-btn"
                          title="重新生成回答"
                          disabled={isStreaming}
                          onClick={() =>
                            handleRegenerateMessage(message.id, true)
                          }
                        >
                          <Refresh
                            theme="outline"
                            size="13"
                            className={
                              regeneratingId === message.id ? "spin-icon" : ""
                            }
                          />
                          <span>重新生成</span>
                        </button>

                        <button
                          type="button"
                          className="action-link-btn"
                          title="存入黑话生词本"
                          onClick={() =>
                            handleSaveMessageToVault(message, activeSession)
                          }
                        >
                          {savedVaultMessageIds.has(message.id) ? (
                            <>
                              <CheckOne
                                theme="filled"
                                size="13"
                                fill="#10b981"
                              />
                              <span style={{ color: "#10b981" }}>
                                已存入生词本
                              </span>
                            </>
                          ) : (
                            <>
                              <Star theme="outline" size="13" />
                              <span>⭐ 存入生词本</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          className="action-link-btn"
                          title="复制通读报告"
                          onClick={() => handleCopy(message.id, message.content)}
                        >
                          {copySuccessId === message.id ? (
                            <>
                              <CheckOne
                                theme="filled"
                                size="13"
                                fill="#10b981"
                              />
                              <span style={{ color: "#10b981" }}>已复制</span>
                            </>
                          ) : (
                            <>
                              <Copy theme="outline" size="13" />
                              <span>复制报告</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 长文分段续读：进度提示与“继续解读剩余部分”入口 */}
                  {message.role === "assistant" &&
                    activeWebReadingProgress &&
                    shouldShowWebReadingContinue(
                      activeWebReadingProgress,
                      message
                    ) && (
                      <div
                        className="web-reading-continue-bar"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: 8,
                          margin: "8px 0 4px",
                          padding: "8px 12px",
                          borderRadius: 10,
                          border: "1px dashed var(--color-primary)",
                          background: "var(--color-primary-light)",
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        <span>
                          📄 长文已分段解读：已读至第{" "}
                          {activeWebReadingProgress.segmentIndex - 1} 段 / 共约{" "}
                          {activeWebReadingProgress.totalSegments} 段
                        </span>
                        <button
                          type="button"
                          className="continue-reading-btn"
                          disabled={
                            isStreaming ||
                            isExtractingPage ||
                            Boolean(activeWebReadingProgress.pendingRequestId)
                          }
                          style={{
                            border: "none",
                            borderRadius: 999,
                            padding: "5px 12px",
                            fontSize: 12,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            cursor:
                              isStreaming ||
                              isExtractingPage ||
                              activeWebReadingProgress.pendingRequestId
                                ? "not-allowed"
                                : "pointer",
                            opacity:
                              isStreaming ||
                              isExtractingPage ||
                              activeWebReadingProgress.pendingRequestId
                                ? 0.55
                                : 1,
                            background: "var(--color-primary)",
                            color: "#ffffff",
                          }}
                          onClick={handleContinueWebReading}
                        >
                          继续解读剩余部分（第{" "}
                          {activeWebReadingProgress.segmentIndex} 段）
                        </button>
                      </div>
                    )}

                  {/* 阅读完成后仅提供用户主动触发的全文总览入口。 */}
                  {message.role === "assistant" &&
                    !activeWebReadingProgress &&
                    webReadingOverviewActions.has(message.id) && (
                      <div className="web-reading-overview-bar">
                        <span>
                          📚 全部分段已解读，可综合查看全文主线与关键结论
                        </span>
                        <button
                          type="button"
                          className="overview-reading-btn"
                          disabled={isStreaming || isExtractingPage}
                          onClick={() => {
                            const action = webReadingOverviewActions.get(
                              message.id
                            );
                            if (action) {
                              void handleGenerateWebReadingOverview(
                                action.readingRunId
                              );
                            }
                          }}
                        >
                          {webReadingOverviewActions.get(message.id)?.label}
                        </button>
                      </div>
                    )}

                  {/* 深度追问指引 Pills */}
                  {message.role === "assistant" &&
                    message.status === "completed" &&
                    message.suggestedQuestions &&
                    message.suggestedQuestions.length > 0 && (
                      <div className="suggested-questions-container">
                        <div className="suggested-header">
                          <Topic theme="outline" size="13" />
                          <span>继续深度追问：</span>
                        </div>
                        <div className="suggested-pills-list">
                          {message.suggestedQuestions.map(
                            (question: string, qIdx: number) => (
                              <button
                                type="button"
                                key={qIdx}
                                className="suggested-pill-btn"
                                disabled={isStreaming}
                                onClick={() => handleSendMessage(question)}
                              >
                                <span>{question}</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </main>

          {/* 底部输入控制台 */}
          <footer className="chat-input-footer">
            {/* 浮动回到底部 / 正在生成指示器胶囊按钮 (对标 GPT 交互) */}
            {activeView === "chat" &&
              !isAtBottom &&
              activeSession &&
              activeSession.messages.length > 0 && (
                <button
                  type="button"
                  className={`scroll-bottom-indicator-btn ${
                    isStreaming ? "is-streaming" : ""
                  }`}
                  title={isStreaming ? "AI 正在生成中，点击直达底部" : "回到底部"}
                  onClick={() => scrollToBottom(true)}
                >
                  {isStreaming ? (
                    <div className="streaming-dots-indicator">
                      <span className="indicator-dot" />
                      <span className="indicator-dot" />
                      <span className="indicator-dot" />
                    </div>
                  ) : (
                    <Down theme="outline" size="14" />
                  )}
                </button>
              )}

            {/* 划词引用胶囊预览条 */}
            {activeQuotedText && (
              <QuoteInputCapsule
                quotedText={activeQuotedText}
                onClear={handleClearQuote}
              />
            )}

            {pendingSelectionContext && (
              <SelectionContextDetails
                context={pendingSelectionContext}
                onClear={() => setPendingSelectionContext(undefined)}
              />
            )}

            {images && images.length > 0 && (
              <div className="input-images-preview">
                {images.map((img, idx) => (
                  <div key={idx} className="preview-image-item">
                    <img src={img.data} alt="待发送图片" />
                    <button
                      type="button"
                      className="remove-img-btn"
                      onClick={() => handleRemoveImage(idx)}
                      title="移除图片"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="input-box-wrapper">
              <textarea
                ref={inputRef}
                className="chat-textarea"
                placeholder="输入追问、黑话术语或指令，支持 Ctrl+V 粘贴图片 (Enter 发送，Shift+Enter 换行)..."
                value={inputText}
                rows={2}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
              />

              <div className="input-controls-bar">
                <div className="input-tip-left">
                  {inputText.trim() && (
                    <button
                      type="button"
                      className="clear-input-btn"
                      onClick={handleClearQuote}
                    >
                      <Clear theme="outline" size="14" />
                      <span>清空</span>
                    </button>
                  )}
                </div>

                <div className="input-actions-right">
                  {isStreaming ? (
                    <button
                      type="button"
                      className="stop-btn"
                      onClick={handleStopGenerating}
                    >
                      <span>停止生成</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="send-btn"
                      disabled={!inputText.trim()}
                      onClick={() => handleSendMessage()}
                    >
                      <Send theme="outline" size="16" />
                      <span>发送</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
