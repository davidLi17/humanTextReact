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
import { FontScaleControl } from "@/entrypoints/shared/FontScaleControl";
import { useFontScale } from "@/entrypoints/shared/useFontScale";
import {
  applyTheme,
  normalizeThemeMode,
  watchSystemTheme,
} from "@/entrypoints/shared/theme";
import {
  type ChatPayloadMessage,
  ChatMessage,
  ChatSession,
} from "@/entrypoints/shared/chatTypes";
import {
  checkChatRequestBudget,
  createAttachedPageMeta,
  getAttachedPageSnapshot,
  MAX_TOTAL_ATTACHED_PAGE_CHARS,
  selectAttachedPageSegments,
} from "@/entrypoints/shared/pageContext";
import { retryAssistantMessageAndTruncate } from "@/entrypoints/shared/chatEditRetry";
import {
  buildWebReadingContinuationPrompt,
  classifyWebReadExtractError,
  describeWebReadFailure,
  extractSuggestedQuestions,
  MAX_PAGE_CONTENT_CHARS,
  MIN_PAGE_CONTENT_CHARS,
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
import {
  createSessionSearchIndex,
  searchSessionMessages,
  type SessionSearchHit,
} from "@/entrypoints/shared/sessionSearch";
import { ImageUtils } from "@/entrypoints/popup/utils/imageUtils";
import CollapsibleThinkingChain from "@/entrypoints/popup/components/CollapsibleThinkingChain";
import ThemeModeSelector from "@/entrypoints/popup/components/ThemeModeSelector";
import JargonVaultPanel from "./components/JargonVaultPanel";
import PrismResultTabs from "./components/PrismResultTabs";
import PageContextCard from "./components/PageContextCard";
import SidepanelQuoteActionBar from "./components/SidepanelQuoteActionBar";
import QuoteInputCapsule from "./components/QuoteInputCapsule";
import PromptQueueBar, {
  type QueuedPrompt,
} from "./components/PromptQueueBar";
import SessionSearchResults from "./components/SessionSearchResults";
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
import React, {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./App.less";
import {
  BOTTOM_THRESHOLD_PX,
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

interface PendingSessionJump {
  sessionId: string;
  messageId: string;
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
  const {
    fontScalePercent,
    performFontScaleAction,
    fontScaleSaveStatus,
  } = useFontScale();
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
  const [sessionSearchQuery, setSessionSearchQuery] = useState("");
  const [pendingSessionJump, setPendingSessionJump] =
    useState<PendingSessionJump | null>(null);

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

  // 提示词排队队列状态 (Prompt Queue System)
  const [promptQueue, setPromptQueue] = useState<QueuedPrompt[]>([]);
  const [queueBlocked, setQueueBlocked] = useState(false);
  const [isManualDispatching, setIsManualDispatching] = useState(false);
  const queueBlockedSessionIdRef = useRef<string | null>(null);
  const manualDispatchRef = useRef(false);
  const requestSettingsRef = useRef<{
    systemPrompt: string;
    prismMode: boolean;
  }>({
    systemPrompt: DEFAULT_SETTINGS.promptTemplate,
    prismMode: DEFAULT_SETTINGS.prismModeEnabled,
  });

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
  const composerSnapshot = useMemo(
    () => ({
      sessionId: activeSessionId,
      inputText,
      images,
      selectionContext: pendingSelectionContext,
      quotedText: activeQuotedText,
    }),
    [
      activeSessionId,
      inputText,
      images,
      pendingSelectionContext,
      activeQuotedText,
    ]
  );
  const composerSnapshotRef = useRef(composerSnapshot);
  composerSnapshotRef.current = composerSnapshot;

  // 虚拟长文与截断检测提示
  const [virtualScrollNotice, setVirtualScrollNotice] = useState<{
    totalScreens: number;
    url: string;
  } | null>(null);

  // 智能滚动与回到底部/流式指示器状态 (对标 GPT 交互)
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);
  const userHasScrolledUpRef = useRef<boolean>(false);
  const programmaticScrollRef = useRef<boolean>(false);
  const programmaticScrollTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const searchHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const searchHighlightedElementRef = useRef<HTMLElement | null>(null);

  const sidepanelContainerRef = useRef<HTMLDivElement>(null);
  const chatContentRef = useRef<HTMLElement>(null);
  const activeRequestIdRef = useRef<string | undefined>(undefined);
  const activeRequestOwnerRef = useRef<ActiveSidepanelRequest | undefined>(
    undefined
  );
  const overviewRequestIdRef = useRef<string | undefined>(undefined);
  const sessionsRef = useRef<ChatSession[]>([]);
  const activeSessionIdRef = useRef("");
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
  const deferredSessionSearchQuery = useDeferredValue(sessionSearchQuery);
  const sessionSearchIndex = useMemo(
    () =>
      showDrawer && drawerTab === "history"
        ? createSessionSearchIndex(sessions)
        : null,
    [showDrawer, drawerTab, sessions]
  );
  const sessionSearchResults = useMemo(() => {
    if (!sessionSearchIndex || !deferredSessionSearchQuery.trim()) return [];
    return searchSessionMessages(
      sessionSearchIndex,
      deferredSessionSearchQuery
    );
  }, [deferredSessionSearchQuery, sessionSearchIndex]);
  const currentSessionQueue = activeSession
    ? promptQueue.filter((prompt) => prompt.sessionId === activeSession.id)
    : [];
  const currentQueueBlocked = Boolean(
    activeSession &&
      queueBlocked &&
      queueBlockedSessionIdRef.current === activeSession.id
  );

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
        requestSettingsRef.current = {
          systemPrompt: settings.promptTemplate,
          prismMode: settings.prismModeEnabled,
        };
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
      requestSettingsRef.current = {
        systemPrompt: newSettings.promptTemplate ?? requestSettingsRef.current.systemPrompt,
        prismMode: newSettings.prismModeEnabled ?? requestSettingsRef.current.prismMode,
      };
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

  const validateRequestBudget = (payload: ChatPayloadMessage[]) => {
    const result = checkChatRequestBudget(payload, {
      systemPrompt: requestSettingsRef.current.systemPrompt,
      prismMode: requestSettingsRef.current.prismMode,
    });
    if (!result.ok) {
      const error = result.error || "请求内容超过当前字符预算，请缩减网页范围后重试。";
      setExtractError(error);
      showToast("请求已暂停，请缩减网页段落后重试");
      return false;
    }
    return true;
  };

  const prepareRegularRequest = (
    currentMessage?: Parameters<typeof buildWebReadingHistoryPayload>[1],
    sessionId = activeSessionIdRef.current
  ) => {
    const currentSession = sessionsRef.current.find(
      (session) => session.id === sessionId
    );
    if (!currentSession) return undefined;
    const payload = buildWebReadingHistoryPayload(
      currentSession.messages,
      currentMessage
    );
    return { session: currentSession, payload };
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
        // 与 storage 通道保持一致：消费掉待办，避免 10 秒新鲜度窗口内重载侧边栏
        // 时被 storage 通道重复触发一次通读
        if (browser?.storage?.local) {
          void browser.storage.local.remove("pendingWebPageRead");
        }
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
    if (chatContentRef.current) {
      if (smooth) {
        chatContentRef.current.scrollTo({
          top: chatContentRef.current.scrollHeight,
          behavior: "smooth",
        });
      } else {
        chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
      }
    }
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
      if (searchHighlightTimerRef.current) {
        clearTimeout(searchHighlightTimerRef.current);
      }
      searchHighlightedElementRef.current?.removeAttribute(
        "data-search-highlighted"
      );
    },
    []
  );

  // 搜索命中优先于会话切换后的“回到底部”：它会接管本次滚动并锁定自动跟随。
  useEffect(() => {
    if (
      !pendingSessionJump ||
      pendingSessionJump.sessionId !== activeSessionId ||
      activeView !== "chat"
    ) {
      return;
    }

    if (programmaticScrollTimerRef.current) {
      clearTimeout(programmaticScrollTimerRef.current);
      programmaticScrollTimerRef.current = null;
    }
    programmaticScrollRef.current = false;
    userHasScrolledUpRef.current = true;
    setIsAtBottom(false);

    const frame = requestAnimationFrame(() => {
      const target = Array.from(
        chatContentRef.current?.querySelectorAll<HTMLElement>(
          "[data-message-id]"
        ) || []
      ).find((element) => element.dataset.messageId === pendingSessionJump.messageId);

      if (!target) {
        setPendingSessionJump(null);
        showToast("未找到原消息，已打开会话");
        return;
      }

      target.scrollIntoView({ block: "center", behavior: "smooth" });
      if (searchHighlightTimerRef.current) {
        clearTimeout(searchHighlightTimerRef.current);
      }
      searchHighlightedElementRef.current?.removeAttribute(
        "data-search-highlighted"
      );
      target.dataset.searchHighlighted = "true";
      searchHighlightedElementRef.current = target;
      searchHighlightTimerRef.current = setTimeout(() => {
        target.removeAttribute("data-search-highlighted");
        if (searchHighlightedElementRef.current === target) {
          searchHighlightedElementRef.current = null;
        }
        searchHighlightTimerRef.current = null;
      }, 1800);
      setPendingSessionJump(null);
    });

    return () => cancelAnimationFrame(frame);
  }, [activeSessionId, activeView, pendingSessionJump]);

  // 自动滚动到消息流底部 (遵循 GPT 交互: 仅在用户未主动往上滑时紧贴底部，零动画惯性，绝不抢占用户滚轮控制权)
  useEffect(() => {
    if (
      activeView === "chat" &&
      !userHasScrolledUpRef.current &&
      chatContentRef.current
    ) {
      chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
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

    const handleWheel = (e: WheelEvent) => {
      // 只要用户向上滚动滚轮 (deltaY < 0)，立即判定用户正在往上看，
      // 瞬间停止自动跟随，绝对不跟用户抢控制权
      if (e.deltaY < 0) {
        programmaticScrollRef.current = false;
        userHasScrolledUpRef.current = true;
        setIsAtBottom(false);
      } else {
        markUserScrollIntent();
      }
    };

    const handleTouchMove = () => {
      if (chatContentRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = chatContentRef.current;
        if (scrollHeight - scrollTop - clientHeight > BOTTOM_THRESHOLD_PX) {
          programmaticScrollRef.current = false;
          userHasScrolledUpRef.current = true;
          setIsAtBottom(false);
        }
      }
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
      chatEl.addEventListener("wheel", handleWheel, { passive: true });
      chatEl.addEventListener("touchstart", markUserScrollIntent, {
        passive: true,
      });
      chatEl.addEventListener("pointerdown", markUserScrollIntent, {
        passive: true,
      });
      chatEl.addEventListener("touchmove", handleTouchMove, { passive: true });
      chatEl.addEventListener("keydown", handleScrollKeyDown);
    }
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      if (chatEl) {
        chatEl.removeEventListener("mouseup", handleMouseUp);
        chatEl.removeEventListener("keyup", handleKeyUp);
        chatEl.removeEventListener("scroll", handleScroll);
        chatEl.removeEventListener("wheel", handleWheel);
        chatEl.removeEventListener("touchstart", markUserScrollIntent);
        chatEl.removeEventListener("pointerdown", markUserScrollIntent);
        chatEl.removeEventListener("touchmove", handleTouchMove);
        chatEl.removeEventListener("keydown", handleScrollKeyDown);
      }
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [activeView]);

  // 通读当前网页核心逻辑
  const handleReadCurrentPage = async (options?: { deepScan?: boolean }) => {
    if (
      !webReadingProgressHydratedRef.current ||
      isStreaming ||
      isExtractingPage
    ) {
      return;
    }
    const isDeepScan = options?.deepScan || false;
    const extractionSessionId = activeSessionIdRef.current;
    if (!extractionSessionId) return;

    setActiveView("chat");
    setExtractError(null);
    setIsExtractingPage(true);

    try {
      const activeTab = await getActiveTab();
      logger.info("开始提取当前网页正文", {
        tabId: activeTab?.id,
        url: activeTab?.url,
        deepScan: isDeepScan,
      });

      // 失败路径：提取消息无响应/超时（标记环节 cs-inject），避免“正在提取”永久悬挂
      // deepScan 包含多步滚动采集合并，适当延长超时保护窗口
      const timeoutLimitMs = isDeepScan ? 15000 : WEB_READING_EXTRACT_TIMEOUT_MS;
      let extractTimeoutId: ReturnType<typeof setTimeout> | undefined;
      const extractResult = await Promise.race([
        extractActiveTabContent({ deepScan: isDeepScan }),
        new Promise<ExtractActiveTabResult>((resolve) => {
          extractTimeoutId = setTimeout(() => {
            resolve({
              success: false,
              error: WEB_READING_EXTRACT_TIMEOUT_MARKER,
              stage: "cs-inject",
            });
          }, timeoutLimitMs);
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

      // 诊断虚拟滚动与长文截断状态
      if (pageData.isLikelyVirtualList && pageData.hasMoreContent && !isDeepScan) {
        setVirtualScrollNotice({
          totalScreens: pageData.totalEstimatedScreens || 4,
          url: pageData.url,
        });
      } else {
        setVirtualScrollNotice(null);
      }

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

      // 只把正文作为上下文附加到当前会话：
      // 不新建会话、不创建助手占位、不发起模型请求——用户随后自己决定问什么。
      const existingAttachment = extractionSession.messages.find((message) => {
        const meta = message.pageMeta;
        const attached = meta ? getAttachedPageSnapshot(meta) : undefined;
        return (
          meta?.contextOnly === true &&
          meta.url === pageData.url &&
          Boolean(attached) &&
          attached?.capturedChars === pageData.content.length &&
          attached.content === pageData.content.slice(0, attached.content.length)
        );
      });
      const existingAttachedChars = existingAttachment?.pageMeta
        ? getAttachedPageSnapshot(existingAttachment.pageMeta)?.content.length ?? 0
        : 0;

      const usedAttachedChars = latestSessions.reduce(
        (total, session) =>
          total +
          session.messages.reduce(
            (messageTotal, message) =>
              messageTotal +
                (message.pageMeta
                  ? getAttachedPageSnapshot(message.pageMeta)?.content.length ?? 0
                  : 0) -
                (session.id === extractionSession.id &&
                message.id === existingAttachment?.id
                  ? existingAttachedChars
                  : 0),
            0
          ),
        0
      );
      const remainingAttachedChars =
        MAX_TOTAL_ATTACHED_PAGE_CHARS - usedAttachedChars;
      if (remainingAttachedChars <= 0) {
        const error =
          "网页正文附加空间已用完，请删除不再需要的旧网页会话后再试。";
        setExtractError(error);
        showToast("网页正文附加空间已用完，请删除旧网页会话后重试");
        setIsExtractingPage(false);
        return;
      }

      const attachedPageMeta = createAttachedPageMeta(
        pageData,
        remainingAttachedChars
      );

      if (existingAttachment) {
        const newContentLength = attachedPageMeta.attachedPage?.content.length ?? 0;
        if (newContentLength <= existingAttachedChars) {
          setIsExtractingPage(false);
          showToast("该网页正文已在当前对话中，无需重复附加");
          return;
        }
        const previousSelected = existingAttachment.pageMeta
          ? getAttachedPageSnapshot(existingAttachment.pageMeta)?.selectedSegments ?? [1]
          : [1];
        const expandedMeta = selectAttachedPageSegments(
          attachedPageMeta,
          previousSelected
        );
        const updatedSession: ChatSession = {
          ...extractionSession,
          messages: extractionSession.messages.map((message) =>
            message.id === existingAttachment.id
              ? { ...message, pageMeta: expandedMeta }
              : message
          ),
          updatedAt: Date.now(),
        };
        const nextSessions = latestSessions.map((session) =>
          session.id === extractionSession.id ? updatedSession : session
        );
        sessionsRef.current = nextSessions;
        setSessions(nextSessions);
        void saveSessionsToStorage(nextSessions);
        setIsExtractingPage(false);
        scrollToBottom(true);
        showToast("已补充网页正文快照，可调整参与回答的范围");
        return;
      }

      const userMessage: ChatMessage = {
        id: createRequestId(),
        role: "user",
        content: `附加网页正文: 《${pageData.title}》`,
        pageMeta: attachedPageMeta,
        createdAt: Date.now(),
        status: "completed",
      };

      const updatedSession: ChatSession = {
        ...extractionSession,
        // 仅空会话按网页命名；已有对话保持原标题，别打断用户正在进行的话题
        title:
          extractionSession.messages.length === 0
            ? `网页资料: ${pageData.title.slice(0, 12)}...`
            : extractionSession.title,
        messages: [...extractionSession.messages, userMessage],
        updatedAt: Date.now(),
      };

      const nextSessions = latestSessions.map((session) =>
        session.id === extractionSession.id ? updatedSession : session
      );
      sessionsRef.current = nextSessions;
      setSessions(nextSessions);
      void saveSessionsToStorage(nextSessions);

      setIsExtractingPage(false);
      scrollToBottom(true);
      showToast("已附加网页正文，可在下方继续追问");
    } catch (error: any) {
      // 提取链路失败均已提前 return，走到这里的是会话组装环节的异常
      logger.error("附加网页正文失败:", {
        stage: "attach-context",
        detail: error?.message,
      });
      setIsExtractingPage(false);
      setExtractError(error?.message || "附加网页正文失败，请重试");
    }
  };

  const handlePageContextSelectionChange = (
    sessionId: string,
    messageId: string,
    segments: number[]
  ) => {
    if (isStreaming || isExtractingPage) return;
    const currentSessions = sessionsRef.current;
    const currentSession = currentSessions.find(
      (session) => session.id === sessionId
    );
    if (!currentSession) return;
    let changed = false;
    const nextSessions = currentSessions.map((session) => {
      if (session.id !== sessionId) return session;
      const messages = session.messages.map((message) => {
        if (
          message.id !== messageId ||
          message.pageMeta?.contextOnly !== true
        ) {
          return message;
        }
        changed = true;
        return {
          ...message,
          pageMeta: selectAttachedPageSegments(message.pageMeta, segments),
        };
      });
      return changed ? { ...session, messages, updatedAt: Date.now() } : session;
    });
    if (!changed) return;
    sessionsRef.current = nextSessions;
    setSessions(nextSessions);
    void saveSessionsToStorage(nextSessions);
    setExtractError(null);
    queueBlockedSessionIdRef.current = null;
    setQueueBlocked(false);
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

    const currentSession = sessionsRef.current.find(
      (session) => session.id === activeSession.id
    );
    if (!currentSession) return;

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
        next.delete(currentSession.id);
        return next;
      }, currentSession.id);
      return;
    }

    const historyPayload = buildWebReadingHistoryPayload(
      currentSession.messages
    );
    const hasSystem = historyPayload.some((message) => message.role === "system");
    const messagesPayload: ChatPayloadMessage[] = [
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
    if (!validateRequestBudget(messagesPayload)) return;

    const userMessageId = createRequestId();
    const assistantMessageId = createRequestId();
    const currentRequestId = createRequestId();
    registerActiveRequest({
      requestId: currentRequestId,
      sessionId: currentSession.id,
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
      ...currentSession,
      messages: [...currentSession.messages, userMessage, assistantMessage],
      updatedAt: Date.now(),
    };

    const nextSessions = sessionsRef.current.map((s) =>
      s.id === currentSession.id ? updatedSession : s
    );
    sessionsRef.current = nextSessions;
    setSessions(nextSessions);

    // 请求期间只记录 pending，不提前推进，避免失败后跳段或末段入口消失。
    commitWebReadingProgress((prev) => {
      const current = prev.get(currentSession.id);
      if (!current) return prev;
      const next = new Map(prev);
      next.set(
        currentSession.id,
        beginWebReadingSegment(current, {
          requestId: currentRequestId,
          segmentIndex,
          nextStart: segmentEnd,
          assistantMessageId,
        })
      );
      return next;
    }, currentSession.id);

    setIsStreaming(true);
    setExtractError(null);
    scrollToBottom(true);

    try {
      const response = (await browser.runtime.sendMessage({
        action: MESSAGE_TYPES.TRANSLATE,
        requestId: currentRequestId,
        targetKind: "sidepanel",
        source: "sidepanel",
        sessionId: currentSession.id,
        messages: messagesPayload,
        thinkingEnabled,
      })) as WebReadingResponse;
      if (!isSuccessfulWebReadingResponse(response)) {
        markAssistantMessageAsError(
          currentSession.id,
          assistantMessageId,
          response?.error || "续读未返回有效结果，请重试当前分段",
          currentRequestId
        );
      }
      settleSessionWebReadingProgress(
        currentSession.id,
        progress.readingRunId,
        currentRequestId,
        response
      );
    } catch (error: any) {
      logger.error("发送续读请求失败:", error);
      markAssistantMessageAsError(
        currentSession.id,
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
    if (!validateRequestBudget(prepared.messages)) {
      overviewRequestIdRef.current = undefined;
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

  // 自动串联调度 (Auto-dispatch)：当上一个问题流式输出结束，自动取出队列中下一项发送
  useEffect(() => {
    if (
      !isStreaming &&
      !(queueBlocked && queueBlockedSessionIdRef.current === activeSession?.id) &&
      !manualDispatchRef.current &&
      !isManualDispatching &&
      promptQueue.length > 0 &&
      activeSession &&
      !isExtractingPage
    ) {
      const nextPrompt = promptQueue.find(
        (prompt) => prompt.sessionId === activeSession.id
      );
      // 先校验并派发，只有真正接受后才移除队首。
      if (nextPrompt) {
        const accepted = executeSendMessage(
          nextPrompt.text,
          nextPrompt.images,
          nextPrompt.selectionContext
        );
        if (accepted) {
          setPromptQueue((prev) =>
            prev.filter((prompt) => prompt.id !== nextPrompt.id)
          );
        } else {
          queueBlockedSessionIdRef.current = activeSession.id;
          setQueueBlocked(true);
        }
      }
    }
  }, [
    isStreaming,
    promptQueue,
    queueBlocked,
    activeSession?.id,
    isExtractingPage,
    isManualDispatching,
  ]);

  // 底层实际执行消息发送与后台流式通信
  const executeSendMessage = (
    text: string,
    imagesToSend?: ChatMessage["images"],
    contextToSend?: SelectionContext,
    options: { allowDuringManualDispatch?: boolean } = {}
  ): boolean => {
    if (manualDispatchRef.current && !options.allowDuringManualDispatch) {
      return false;
    }
    const currentSession = sessionsRef.current.find(
      (session) => session.id === activeSessionIdRef.current
    );
    if (!currentSession || !text.trim()) return false;

    const userMessagePreview: ChatPayloadMessage = {
      role: "user",
      content: text,
      images: imagesToSend && imagesToSend.length > 0 ? imagesToSend : undefined,
      selectionContext: contextToSend,
    };
    const prepared = prepareRegularRequest(userMessagePreview, currentSession.id);
    if (!prepared || !validateRequestBudget(prepared.payload)) return false;

    setActiveView("chat");
    const userMessageId = createRequestId();
    const assistantMessageId = createRequestId();
    const currentRequestId = createRequestId();
    registerActiveRequest({
      requestId: currentRequestId,
      sessionId: currentSession.id,
      assistantMessageId,
    });

    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: text,
      images: imagesToSend && imagesToSend.length > 0 ? imagesToSend : undefined,
      selectionContext: contextToSend,
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
      currentSession.messages.filter((m) => m.role === "user").length === 0;
    const newTitle =
      isFirstUserMessage && !currentSession.title.startsWith("速读:")
        ? text.slice(0, 18) + (text.length > 18 ? "..." : "")
        : currentSession.title;

    const updatedSession: ChatSession = {
      ...currentSession,
      title: newTitle,
      messages: [...currentSession.messages, userMessage, assistantMessage],
      updatedAt: Date.now(),
    };

    const nextSessions = sessionsRef.current.map((s) =>
      s.id === currentSession.id ? updatedSession : s
    );
    sessionsRef.current = nextSessions;
    setSessions(nextSessions);
    void saveSessionsToStorage(nextSessions);

    setIsStreaming(true);
    setExtractError(null);
    scrollToBottom(true);

    void browser.runtime.sendMessage({
        action: MESSAGE_TYPES.TRANSLATE,
        requestId: currentRequestId,
        targetKind: "sidepanel",
        source: "sidepanel",
        sessionId: currentSession.id,
        messages: prepared.payload,
        thinkingEnabled,
      }).catch((error: any) => {
      logger.error("发送翻译请求失败:", error);
      markAssistantMessageAsError(
        currentSession.id,
        assistantMessageId,
        error?.message || "请求发送失败，请检查网络或设置",
        currentRequestId
      );
      });
    return true;
  };

  // 发送常规消息或进入排队队列（忙碌态允许排队）
  const handleSendMessage = async (textToSend?: string) => {
    if (manualDispatchRef.current) return;
    const text = (textToSend ?? inputText).trim();
    if (!text || isExtractingPage || !activeSession) return;

    // 忙碌态允许排队：当正在流式输出时，将问题存入 promptQueue（先进先出队列）
    if (isStreaming) {
      const prepared = prepareRegularRequest(
        {
          role: "user",
          content: text,
          images: images && images.length > 0 ? images : undefined,
          selectionContext: pendingSelectionContext,
        },
        activeSession.id
      );
      if (!prepared || !validateRequestBudget(prepared.payload)) return;
      const queuedItem: QueuedPrompt = {
        id: createRequestId(),
        sessionId: activeSession.id,
        text,
        images: images && images.length > 0 ? images : undefined,
        selectionContext: pendingSelectionContext,
        createdAt: Date.now(),
      };
      setPromptQueue((prev) => [...prev, queuedItem]);
      queueBlockedSessionIdRef.current = null;
      setQueueBlocked(false);
      setInputText("");
      setActiveQuotedText(null);
      setImages([]);
      setPendingSelectionContext(undefined);
      composerDraftsRef.current.delete(activeSession.id);
      setToastMessage("问题已加入排队队列，AI 回答完毕后将自动作答");
      setTimeout(() => setToastMessage(null), 2200);
      return;
    }

    // 空闲态直接执行发送
    const imagesToSend = images;
    const contextToSend = pendingSelectionContext;
    const accepted = executeSendMessage(text, imagesToSend, contextToSend);
    if (!accepted) return;
    setInputText("");
    setActiveQuotedText(null);
    setImages([]);
    setPendingSelectionContext(undefined);
    composerDraftsRef.current.delete(activeSession.id);
  };

  // 快捷键 ⌘+Enter (Mac) / Ctrl+Enter (Win/Linux) 或点击提升按钮：直接打断当前流式输出并立即发送
  const handleInterruptAndSendImmediate = async (textToSend?: string) => {
    if (!activeSession || isExtractingPage) return;
    if (manualDispatchRef.current) return;
    manualDispatchRef.current = true;
    setIsManualDispatching(true);
    const initialComposerSnapshot = composerSnapshotRef.current;
    try {
    const currentInput = (textToSend ?? inputText).trim();

    let targetText = currentInput;
    let targetImages = images;
    let targetContext = pendingSelectionContext;
    let queuedId: string | undefined;

    // 如果输入框没有新文字，但队列中有排队项，直接取队首
    if (!targetText && promptQueue.length > 0) {
      const head = promptQueue.find(
        (prompt) => prompt.sessionId === activeSession.id
      );
      if (!head) return;
      targetText = head.text;
      targetImages = head.images;
      targetContext = head.selectionContext;
      queuedId = head.id;
    }

    if (!targetText) return;

    const sessionId = activeSessionIdRef.current;
    const prepared = prepareRegularRequest(
      {
        role: "user",
        content: targetText,
        images: targetImages && targetImages.length > 0 ? targetImages : undefined,
        selectionContext: targetContext,
      },
      sessionId
    );
    if (!prepared || !validateRequestBudget(prepared.payload)) return;

    // 打断当前生成
    if (isStreaming) {
      await handleStopGenerating();
    }
    if (activeSessionIdRef.current !== sessionId) return;
    const accepted = executeSendMessage(
      targetText,
      targetImages,
      targetContext,
      { allowDuringManualDispatch: true }
    );
    if (!accepted) return;
    queueBlockedSessionIdRef.current = null;
    setQueueBlocked(false);
    if (queuedId) {
      setPromptQueue((prev) => prev.filter((item) => item.id !== queuedId));
    } else if (composerSnapshotRef.current === initialComposerSnapshot) {
      setInputText("");
      setActiveQuotedText(null);
      setImages([]);
      setPendingSelectionContext(undefined);
      composerDraftsRef.current.delete(sessionId);
    }
    } finally {
      manualDispatchRef.current = false;
      setIsManualDispatching(false);
    }
  };

  // 队列条操作：提升/优先发送
  const handlePromoteQueuedPrompt = async (id: string) => {
    const target = promptQueue.find((p) => p.id === id);
    if (!target || !activeSession) return;
    if (manualDispatchRef.current) return;
    manualDispatchRef.current = true;
    setIsManualDispatching(true);
    try {

    const sessionId = activeSessionIdRef.current;
    if (target.sessionId !== sessionId) {
      showToast("请回到该问题所属会话后发送");
      return;
    }
    const prepared = prepareRegularRequest(
      {
        role: "user",
        content: target.text,
        images: target.images,
        selectionContext: target.selectionContext,
      },
      sessionId
    );
    if (!prepared || !validateRequestBudget(prepared.payload)) return;

    if (isStreaming) {
      await handleStopGenerating();
    }
    if (activeSessionIdRef.current !== sessionId) return;
    const accepted = executeSendMessage(
      target.text,
      target.images,
      target.selectionContext,
      { allowDuringManualDispatch: true }
    );
    if (accepted) {
      setPromptQueue((prev) => prev.filter((p) => p.id !== id));
      queueBlockedSessionIdRef.current = null;
      setQueueBlocked(false);
    }
    } finally {
      manualDispatchRef.current = false;
      setIsManualDispatching(false);
    }
  };

  // 队列条操作：移除单项
  const handleRemoveQueuedPrompt = (id: string) => {
    setPromptQueue((prev) => prev.filter((p) => p.id !== id));
    if (queueBlockedSessionIdRef.current === activeSessionIdRef.current) {
      queueBlockedSessionIdRef.current = null;
    }
    setQueueBlocked(false);
  };

  // 队列条操作：清空全部
  const handleClearAllQueue = () => {
    const sessionId = activeSessionIdRef.current;
    setPromptQueue((prev) =>
      prev.filter((prompt) => prompt.sessionId !== sessionId)
    );
    if (queueBlockedSessionIdRef.current === sessionId) {
      queueBlockedSessionIdRef.current = null;
      setQueueBlocked(false);
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
    const currentSession = sessionsRef.current.find(
      (session) => session.id === activeSessionIdRef.current
    );
    if (!text || isStreaming || !currentSession) return;

    const userMsgIndex = currentSession.messages.findIndex(
      (m) => m.id === messageId
    );
    if (userMsgIndex === -1) return;

    const oldUserMsg = currentSession.messages[userMsgIndex];
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
    const preservedHistory = currentSession.messages.slice(0, userMsgIndex);

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

    let messagesPayload: ChatPayloadMessage[];
    if (replayPrompt?.success) {
      const historyPayload = buildWebReadingHistoryPayload(preservedHistory);
      const hasSystem = historyPayload.some((message) => message.role === "system");
      const needsReadingSystem = oldUserMsg.pageMeta?.contextOnly !== true;
      messagesPayload = [
        ...(needsReadingSystem && !hasSystem
          ? [{ role: "system" as const, content: WEB_READING_SYSTEM_PROMPT }]
          : []),
        ...historyPayload,
        { role: "user" as const, content: replayPrompt.prompt },
      ];
    } else {
      messagesPayload = buildWebReadingHistoryPayload(
        preservedHistory,
        updatedUserMsg
      );
    }
    if (!validateRequestBudget(messagesPayload)) return;

    const assistantMessageId = createRequestId();
    const currentRequestId = createRequestId();
    const replayReadingRunId = replayPrompt?.success
      ? oldUserMsg.pageMeta?.readingRunId
      : undefined;
    const ownedReplayRunId =
      replayReadingRunId &&
      webReadingProgressRef.current.get(currentSession.id)?.readingRunId ===
        replayReadingRunId
        ? replayReadingRunId
        : undefined;
    registerActiveRequest({
      requestId: currentRequestId,
      sessionId: currentSession.id,
      assistantMessageId,
      readingRunId: ownedReplayRunId,
    });

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
      isFirstUserMessage && !currentSession.title.startsWith("速读:")
        ? text.slice(0, 18) + (text.length > 18 ? "..." : "")
        : currentSession.title;

    const nextMessages = [
      ...preservedHistory,
      updatedUserMsg,
      assistantMessage,
    ];
    const updatedSession: ChatSession = {
      ...currentSession,
      title: newTitle,
      messages: nextMessages,
      updatedAt: Date.now(),
    };

    const nextSessions = sessionsRef.current.map((s) =>
      s.id === currentSession.id ? updatedSession : s
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
        currentSession.id,
        updatedUserMsg,
        currentRequestId,
        assistantMessageId
        )
      : false;
    if (!savedWithReadingProgress) {
      void saveSessionsToStorage(nextSessions);
    }

    try {
      const response = (await browser.runtime.sendMessage({
        action: MESSAGE_TYPES.TRANSLATE,
        requestId: currentRequestId,
        targetKind: "sidepanel",
        source: "sidepanel",
        sessionId: currentSession.id,
        messages: messagesPayload,
        thinkingEnabled,
      })) as WebReadingResponse;
      if (replayPrompt?.success) {
        if (!isSuccessfulWebReadingResponse(response)) {
          markAssistantMessageAsError(
            currentSession.id,
            assistantMessageId,
            response?.error || "网页通读未返回有效结果，请重试",
            currentRequestId
          );
        }
        settleSessionWebReadingProgress(
          currentSession.id,
          oldUserMsg.pageMeta?.readingRunId,
          currentRequestId,
          response
        );
      }
    } catch (error: any) {
      logger.error("重新发送编辑消息失败:", error);
      markAssistantMessageAsError(
        currentSession.id,
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
    if (!validateRequestBudget(prepared.messages)) {
      overviewRequestIdRef.current = undefined;
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
    const currentSession = sessionsRef.current.find(
      (session) => session.id === activeSessionIdRef.current
    );
    if (isStreaming || !currentSession) return;

    const targetAssistantIndex = currentSession.messages.findIndex(
      (message) =>
        message.id === assistantMessageId && message.role === "assistant"
    );
    const precedingUserMessage =
      targetAssistantIndex > 0
        ? currentSession.messages[targetAssistantIndex - 1]
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
      currentSession.messages,
      assistantMessageId
    );
    const { assistantIndex } = retryResult;

    // 截取该回答之前的所有上下文
    const historyMessages = currentSession.messages.slice(0, assistantIndex);
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

    let messagesPayload: ChatPayloadMessage[];
    if (replayPrompt?.success) {
      const earlierHistoryPayload = buildWebReadingHistoryPayload(
        historyMessages.slice(0, -1)
      );
      const hasSystem = earlierHistoryPayload.some(
        (message) => message.role === "system"
      );
      const needsReadingSystem = prevUserMsg.pageMeta?.contextOnly !== true;
      messagesPayload = [
        ...(needsReadingSystem && !hasSystem
          ? [{ role: "system" as const, content: WEB_READING_SYSTEM_PROMPT }]
          : []),
        ...earlierHistoryPayload,
        { role: "user" as const, content: replayPrompt.prompt },
      ];
    } else {
      messagesPayload = buildWebReadingHistoryPayload(historyMessages);
    }
    if (!validateRequestBudget(messagesPayload)) return;

    setRegeneratingId(assistantMessageId);
    setTimeout(() => setRegeneratingId(null), 800);

    const currentRequestId = createRequestId();
    const replayReadingRunId = replayPrompt?.success
      ? prevUserMsg.pageMeta?.readingRunId
      : undefined;
    const ownedReplayRunId =
      replayReadingRunId &&
      webReadingProgressRef.current.get(currentSession.id)?.readingRunId ===
        replayReadingRunId
        ? replayReadingRunId
        : undefined;
    registerActiveRequest({
      requestId: currentRequestId,
      sessionId: currentSession.id,
      assistantMessageId,
      readingRunId: ownedReplayRunId,
    });

    const updatedSession: ChatSession = {
      ...currentSession,
      messages: retryResult.updatedMessages,
      updatedAt: Date.now(),
    };

    const nextSessions = sessionsRef.current.map((s) =>
      s.id === currentSession.id ? updatedSession : s
    );
    sessionsRef.current = nextSessions;
    setSessions(nextSessions);

    setIsStreaming(true);
    setExtractError(null);
    scrollToBottom(true);

    const savedWithReadingProgress = replayPrompt?.success
      ? rewindSessionWebReadingProgress(
        currentSession.id,
        prevUserMsg,
        currentRequestId,
        assistantMessageId
        )
      : false;
    if (!savedWithReadingProgress) {
      void saveSessionsToStorage(nextSessions);
    }

    try {
      const response = (await browser.runtime.sendMessage({
        action: MESSAGE_TYPES.TRANSLATE,
        requestId: currentRequestId,
        targetKind: "sidepanel",
        source: "sidepanel",
        sessionId: currentSession.id,
        messages: messagesPayload,
        thinkingEnabled,
        bypassJargonVault,
      })) as WebReadingResponse;
      if (replayPrompt?.success) {
        if (!isSuccessfulWebReadingResponse(response)) {
          markAssistantMessageAsError(
            currentSession.id,
            assistantMessageId,
            response?.error || "网页通读未返回有效结果，请重试",
            currentRequestId
          );
        }
        settleSessionWebReadingProgress(
          currentSession.id,
          prevUserMsg.pageMeta?.readingRunId,
          currentRequestId,
          response
        );
      }
    } catch (error: any) {
      logger.error("重新生成回答失败:", error);
      markAssistantMessageAsError(
        currentSession.id,
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
    setPromptQueue((prev) =>
      prev.filter((prompt) => prompt.sessionId !== sessionId)
    );
    if (queueBlockedSessionIdRef.current === sessionId) {
      queueBlockedSessionIdRef.current = null;
      setQueueBlocked(false);
    }
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

  const handleSessionSearchResultSelect = (result: SessionSearchHit) => {
    if (result.messageId) {
      setPendingSessionJump({
        sessionId: result.sessionId,
        messageId: result.messageId,
      });
    }
    if (result.sessionId !== activeSessionId) {
      activateSessionWithDraft(result.sessionId);
    }
    void saveActiveSessionId(result.sessionId);
    setActiveView("chat");
    setSessionSearchQuery("");
    setShowDrawer(false);
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

    if (e.key === "Enter") {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl) {
        // ⌘+Enter (Mac) / Ctrl+Enter (Windows/Linux): 直接打断当前生成并立即发送
        e.preventDefault();
        void handleInterruptAndSendImmediate();
        return;
      }

      if (!e.shiftKey) {
        e.preventDefault();
        void handleSendMessage();
      }
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
              aria-label="切换到对话"
              className={`view-pill ${activeView === "chat" ? "active" : ""}`}
              onClick={() => setActiveView("chat")}
            >
              <Message theme="outline" size="13" />
              <span>对话</span>
            </button>
            <button
              type="button"
              aria-label="切换到生词本"
              className={`view-pill ${activeView === "vault" ? "active" : ""}`}
              onClick={() => setActiveView("vault")}
            >
              <BookOne theme="outline" size="13" />
              <span>生词本</span>
            </button>
          </div>
        </div>

        <div className="header-bar-right">
          <FontScaleControl
            compact
            value={fontScalePercent}
            saveStatus={fontScaleSaveStatus}
            onDecrease={() => performFontScaleAction("decrease")}
            onReset={() => performFontScaleAction("reset")}
            onIncrease={() => performFontScaleAction("increase")}
          />
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
              title="将当前网页正文加入对话"
              disabled={isStreaming || isExtractingPage}
              onClick={() => void handleReadCurrentPage()}
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

      {/* 虚拟长文/未完全渲染提示条与一键深度通读入口 */}
      {virtualScrollNotice && activeView === "chat" && (
        <div className="notification-bar virtual-scroll-banner">
          <Tips theme="outline" size="16" />
          <span className="banner-text">
            检测到当前页面疑似超长虚拟文档（预估约 {virtualScrollNotice.totalScreens} 屏），当前已采集已渲染的前段。
          </span>
          <button
            type="button"
            className="deep-scan-btn"
            disabled={isStreaming || isExtractingPage}
            onClick={() => void handleReadCurrentPage({ deepScan: true })}
          >
            一键深度通读
          </button>
          <button
            type="button"
            className="banner-close-btn"
            onClick={() => setVirtualScrollNotice(null)}
            title="忽略"
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
                <div className="session-search-box">
                  <label className="session-search-label" htmlFor="session-search-input">
                    搜索会话和消息
                  </label>
                  <div className="session-search-input-wrap">
                    <input
                      id="session-search-input"
                      data-testid="session-search-input"
                      type="search"
                      value={sessionSearchQuery}
                      onChange={(event) => setSessionSearchQuery(event.target.value)}
                      placeholder="输入关键词"
                      aria-label="搜索会话和消息"
                    />
                    {sessionSearchQuery && (
                      <button
                        type="button"
                        className="session-search-clear"
                        data-testid="session-search-clear"
                        aria-label="清空会话搜索"
                        onClick={() => setSessionSearchQuery("")}
                      >
                        <Clear theme="outline" size="14" />
                      </button>
                    )}
                  </div>
                </div>
                {sessionSearchQuery.trim() ? (
                  sessionSearchResults.length > 0 ? (
                    <SessionSearchResults
                      results={sessionSearchResults}
                      onSelect={handleSessionSearchResultSelect}
                    />
                  ) : (
                    <div className="session-search-empty" role="status">
                      没有找到相关会话或消息
                    </div>
                  )
                ) : (
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
                          title={
                            session.id === activeSessionId
                              ? "删除会话"
                              : `删除会话：${session.title}`
                          }
                          onClick={(e) => handleDeleteSession(session.id, e)}
                        >
                          <Delete theme="outline" size="14" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                  将当前网页正文附加到对话，选择参与回答的范围，再输入问题。
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
                    提取正文后，你可以在网页上下文卡片中选择范围，再围绕原文提问。
                  </p>
                  <button
                    type="button"
                    className="hero-action-btn"
                    disabled={isStreaming || isExtractingPage}
                    onClick={() => void handleReadCurrentPage()}
                  >
                    {isExtractingPage ? (
                      <>
                        <LoadingOne
                          theme="outline"
                          size="16"
                          className="spin-icon"
                        />
                        <span>正在采集网页正文...</span>
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
                data-message-id={message.id}
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
                          ) :
                            message.pageMeta?.contextOnly ? (
                            <PageContextCard
                              meta={message.pageMeta}
                              disabled={isStreaming || isExtractingPage}
                              onSelectionChange={(segments) =>
                                handlePageContextSelectionChange(
                                  activeSession.id,
                                  message.id,
                                  segments
                                )
                              }
                            />
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
                          <PrismResultTabs
                            content={message.content}
                            isStreaming={message.status === "streaming"}
                            onCopyCorporate={() => {
                              showToast("已复制向上汇报版，可直接粘贴进周报！");
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
                          fontSize:
                            "calc(12px * var(--ht-font-scale, 1))",
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
                            fontSize:
                              "calc(12px * var(--ht-font-scale, 1))",
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

            {/* 提示词排队队列卡片条 (Prompt Queue Bar) */}
            {currentSessionQueue.length > 0 && (
              <>
                <PromptQueueBar
                  queue={currentSessionQueue}
                  onPromote={handlePromoteQueuedPrompt}
                  onRemove={handleRemoveQueuedPrompt}
                  onClearAll={handleClearAllQueue}
                />
                {currentQueueBlocked && (
                  <div className="prompt-queue-blocked" role="status">
                    <span>排队已暂停，请减少网页段落后重试</span>
                    <button
                      type="button"
                      onClick={() => {
                        queueBlockedSessionIdRef.current = null;
                        setQueueBlocked(false);
                      }}
                    >
                      重试队首
                    </button>
                  </div>
                )}
              </>
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
                placeholder="输入追问、黑话术语或指令 (Enter 发送/排队，⌘+Enter 打断发送，Shift+Enter 换行)..."
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
                    <>
                      <button
                        type="button"
                        className="stop-btn"
                        onClick={handleStopGenerating}
                      >
                        <span>停止生成</span>
                      </button>
                      {inputText.trim() && (
                        <button
                          type="button"
                          className="send-btn queue-send-btn"
                          onClick={() => handleSendMessage()}
                          title="加入排队队列 (Enter)"
                        >
                          <Send theme="outline" size="16" />
                          <span>排队发送</span>
                        </button>
                      )}
                    </>
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
