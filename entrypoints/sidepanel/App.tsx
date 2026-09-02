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
  ChatMessage,
  ChatSession,
} from "@/entrypoints/shared/chatTypes";
import {
  buildWebReadingUserPrompt,
  extractSuggestedQuestions,
  WEB_READING_SYSTEM_PROMPT,
  WebPageMetadata,
} from "@/entrypoints/shared/webReadingPrompt";
import {
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
import React, { useEffect, useRef, useState } from "react";
import "./App.less";

const logger = createLogger("sidepanel-app", "💬");

const SESSIONS_STORAGE_KEY = "sidepanel_chat_sessions";
const ACTIVE_SESSION_STORAGE_KEY = "sidepanel_active_session_id";

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

  const sidepanelContainerRef = useRef<HTMLDivElement>(null);
  const chatContentRef = useRef<HTMLElement>(null);
  const activeRequestIdRef = useRef<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editingTextareaRef = useRef<HTMLTextAreaElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
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

  // 加载存储的会话
  useEffect(() => {
    const loadSessions = async () => {
      try {
        if (!browser?.storage?.local) return;
        const stored = await browser.storage.local.get([
          SESSIONS_STORAGE_KEY,
          ACTIVE_SESSION_STORAGE_KEY,
        ]);
        const storedSessions = stored[SESSIONS_STORAGE_KEY] as
          | ChatSession[]
          | undefined;
        const storedActiveId = stored[ACTIVE_SESSION_STORAGE_KEY] as
          | string
          | undefined;

        if (storedSessions && storedSessions.length > 0) {
          setSessions(storedSessions);
          if (
            storedActiveId &&
            storedSessions.some((s) => s.id === storedActiveId)
          ) {
            setActiveSessionId(storedActiveId);
          } else {
            setActiveSessionId(storedSessions[0].id);
          }
        } else {
          const freshSession = createNewSession();
          setSessions([freshSession]);
          setActiveSessionId(freshSession.id);
        }
      } catch (error) {
        logger.error("加载会话失败:", error);
        const fallback = createNewSession();
        setSessions([fallback]);
        setActiveSessionId(fallback.id);
      }
    };

    void loadSessions();
  }, []);

  // 持久化保存会话
  const saveSessionsToStorage = async (updatedSessions: ChatSession[]) => {
    try {
      if (!browser?.storage?.local) return;
      await browser.storage.local.set({
        [SESSIONS_STORAGE_KEY]: updatedSessions,
      });
    } catch (error) {
      logger.error("保存会话失败:", error);
    }
  };

  const saveActiveSessionId = async (id: string) => {
    try {
      if (!browser?.storage?.local) return;
      await browser.storage.local.set({
        [ACTIVE_SESSION_STORAGE_KEY]: id,
      });
    } catch (error) {
      logger.error("保存激活会话ID失败:", error);
    }
  };

  // 检查是否有待翻译文本或通读请求
  useEffect(() => {
    const checkPendingActions = async () => {
      try {
        if (!browser?.storage?.local) return;
        const stored = await browser.storage.local.get([
          "pendingSidepanelText",
          "pendingWebPageRead",
        ]);

        const pendingText = stored.pendingSidepanelText as
          | { text: string; timestamp: number }
          | undefined;
        if (pendingText && Date.now() - pendingText.timestamp < 10000) {
          setActiveView("chat");
          setInputText(pendingText.text);
          await browser.storage.local.remove("pendingSidepanelText");
          inputRef.current?.focus();
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
  }, [sessions, activeSessionId]);

  // 监听后台消息与流式更新
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.action === "sendToSidepanel" && message.text) {
        setActiveView("chat");
        setInputText(message.text);
        inputRef.current?.focus();
        return;
      }

      if (message.action === MESSAGE_TYPES.READ_WEB_PAGE) {
        setActiveView("chat");
        void handleReadCurrentPage();
        return;
      }

      if (message.action === MESSAGE_TYPES.UPDATE_SIDEPANEL_TRANSLATION) {
        const { requestId, sessionId, content, reasoningContent, done, error } =
          message;

        if (
          !shouldAcceptRequestUpdate(requestId, activeRequestIdRef.current, true)
        ) {
          return;
        }

        setSessions((prevSessions) => {
          const targetSessionId = sessionId || activeSessionId;
          const updated = prevSessions.map((s) => {
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
              };
              messages[messages.length - 1] = updatedMsg;
            }

            return {
              ...s,
              messages,
              updatedAt: Date.now(),
            };
          });

          if (done) {
            void saveSessionsToStorage(updated);
          }
          return updated;
        });

        if (done) {
          setIsStreaming(false);
          activeRequestIdRef.current = undefined;
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
    userHasScrolledUpRef.current = false;
    setIsAtBottom(true);
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  };

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
        // 距离底部 40px 以内视作在底部，否则视作用户主动往上查看
        const atBottom = scrollHeight - scrollTop - clientHeight < 40;
        setIsAtBottom(atBottom);
        userHasScrolledUpRef.current = !atBottom;
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
    }
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      if (chatEl) {
        chatEl.removeEventListener("mouseup", handleMouseUp);
        chatEl.removeEventListener("keyup", handleKeyUp);
        chatEl.removeEventListener("scroll", handleScroll);
      }
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [activeView]);

  // 通读当前网页核心逻辑
  const handleReadCurrentPage = async () => {
    if (isStreaming || isExtractingPage) return;

    setActiveView("chat");
    setExtractError(null);
    setIsExtractingPage(true);

    try {
      const activeTab = await getActiveTab();
      logger.info("开始提取当前网页正文", {
        tabId: activeTab?.id,
        url: activeTab?.url,
      });

      const extractResult = await extractActiveTabContent();

      if (!extractResult.success || !extractResult.data) {
        setExtractError(
          extractResult.error || "无法提取当前网页正文，请确保网页已加载并重试。"
        );
        setIsExtractingPage(false);
        return;
      }

      const pageData: WebPageMetadata = extractResult.data;
      if (!pageData.content || pageData.content.trim().length < 15) {
        setExtractError(
          "当前网页正文内容过少或受到防盗链限制，未能提取到有效长文。"
        );
        setIsExtractingPage(false);
        return;
      }

      // 如果当前会话已有消息，为网页通读创建一个干净的新会话
      let targetSession = activeSession;
      if (activeSession && activeSession.messages.length > 0) {
        targetSession = createNewSession(
          `速读: ${pageData.title.slice(0, 12)}...`
        );
        const updatedSessions = [targetSession, ...sessions];
        setSessions(updatedSessions);
        setActiveSessionId(targetSession.id);
        void saveSessionsToStorage(updatedSessions);
        void saveActiveSessionId(targetSession.id);
      } else if (targetSession) {
        targetSession.title = `速读: ${pageData.title.slice(0, 12)}...`;
      }

      const userMessageId = createRequestId();
      const assistantMessageId = createRequestId();
      const currentRequestId = createRequestId();
      activeRequestIdRef.current = currentRequestId;

      // 组装代表“通读网页”的用户消息卡片
      const userMessage: ChatMessage = {
        id: userMessageId,
        role: "user",
        content: `通读网页: 《${pageData.title}》`,
        pageMeta: {
          title: pageData.title,
          url: pageData.url,
          wordCount: pageData.wordCount,
          isWebPageReading: true,
        },
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

      const nextSessions = sessions.map((s) =>
        s.id === targetSession.id ? updatedSession : s
      );
      if (!nextSessions.some((s) => s.id === targetSession.id)) {
        nextSessions.unshift(updatedSession);
      }
      setSessions(nextSessions);
      void saveSessionsToStorage(nextSessions);

      setIsExtractingPage(false);
      setIsStreaming(true);
      scrollToBottom(true);

      // 构建针对网页长文通读的高质量结构化 Prompt
      const userPrompt = buildWebReadingUserPrompt(pageData);
      const messagesPayload = [
        { role: "system" as const, content: WEB_READING_SYSTEM_PROMPT },
        { role: "user" as const, content: userPrompt },
      ];

      await browser.runtime.sendMessage({
        action: MESSAGE_TYPES.TRANSLATE,
        requestId: currentRequestId,
        targetKind: "sidepanel",
        source: "sidepanel",
        sessionId: targetSession.id,
        messages: messagesPayload,
        thinkingEnabled,
      });
    } catch (error: any) {
      logger.error("通读网页请求失败:", error);
      setIsExtractingPage(false);
      setIsStreaming(false);
      setExtractError(
        error?.message || "通读网页请求失败，请检查网络或 API 设置"
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
    activeRequestIdRef.current = currentRequestId;

    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: text,
      images: images && images.length > 0 ? images : undefined,
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

    const nextSessions = sessions.map((s) =>
      s.id === activeSession.id ? updatedSession : s
    );
    setSessions(nextSessions);
    void saveSessionsToStorage(nextSessions);

    const imagesToSend = images;
    setInputText("");
    setActiveQuotedText(null);
    setImages([]);
    setIsStreaming(true);
    setExtractError(null);
    scrollToBottom(true);

    try {
      const historyPayload = [
        ...activeSession.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user" as const, content: text },
      ];

      await browser.runtime.sendMessage({
        action: MESSAGE_TYPES.TRANSLATE,
        requestId: currentRequestId,
        targetKind: "sidepanel",
        source: "sidepanel",
        sessionId: activeSession.id,
        messages: historyPayload,
        images: imagesToSend,
        thinkingEnabled,
      });
    } catch (error: any) {
      logger.error("发送翻译请求失败:", error);
      setIsStreaming(false);
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== activeSession.id) return s;
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last && last.role === "assistant") {
            msgs[msgs.length - 1] = {
              ...last,
              status: "error",
              errorMessage:
                error?.message || "请求发送失败，请检查网络或设置",
            };
          }
          return { ...s, messages: msgs };
        })
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
    // 截断该消息之后的所有历史轮次
    const preservedHistory = activeSession.messages.slice(0, userMsgIndex);

    const assistantMessageId = createRequestId();
    const currentRequestId = createRequestId();
    activeRequestIdRef.current = currentRequestId;

    const updatedUserMsg: ChatMessage = {
      ...oldUserMsg,
      content: text,
      pageMeta: oldUserMsg.pageMeta,
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

    const nextSessions = sessions.map((s) =>
      s.id === activeSession.id ? updatedSession : s
    );
    setSessions(nextSessions);
    void saveSessionsToStorage(nextSessions);

    // 退出编辑状态并启动流式生成
    setEditingMessageId(null);
    setEditingText("");
    setIsStreaming(true);
    setExtractError(null);
    scrollToBottom(true);

    try {
      let messagesPayload: any[];
      if (updatedUserMsg.pageMeta?.isWebPageReading) {
        const userPrompt = buildWebReadingUserPrompt({
          title: updatedUserMsg.pageMeta.title,
          url: updatedUserMsg.pageMeta.url,
          content: updatedUserMsg.pageMeta.excerpt || text,
          wordCount: updatedUserMsg.pageMeta.wordCount,
        });
        messagesPayload = [
          { role: "system" as const, content: WEB_READING_SYSTEM_PROMPT },
          { role: "user" as const, content: userPrompt },
        ];
      } else {
        messagesPayload = [
          ...preservedHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          { role: "user" as const, content: text },
        ];
      }

      await browser.runtime.sendMessage({
        action: MESSAGE_TYPES.TRANSLATE,
        requestId: currentRequestId,
        targetKind: "sidepanel",
        source: "sidepanel",
        sessionId: activeSession.id,
        messages: messagesPayload,
        images: updatedUserMsg.images,
        thinkingEnabled,
      });
    } catch (error: any) {
      logger.error("重新发送编辑消息失败:", error);
      setIsStreaming(false);
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== activeSession.id) return s;
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last && last.role === "assistant") {
            msgs[msgs.length - 1] = {
              ...last,
              status: "error",
              errorMessage:
                error?.message || "请求发送失败，请检查网络或设置",
            };
          }
          return { ...s, messages: msgs };
        })
      );
    }
  };

  // 重新生成助手回答 / 重试错误卡片
  const handleRegenerateMessage = async (assistantMessageId: string) => {
    if (isStreaming || !activeSession) return;

    const assistantIndex = activeSession.messages.findIndex(
      (m) => m.id === assistantMessageId
    );
    if (assistantIndex === -1) return;

    // 截取该回答之前的所有上下文
    const historyMessages = activeSession.messages.slice(0, assistantIndex);
    if (historyMessages.length === 0) return;

    const prevUserMsg = historyMessages[historyMessages.length - 1];
    if (prevUserMsg.role !== "user") return;

    setRegeneratingId(assistantMessageId);
    setTimeout(() => setRegeneratingId(null), 800);

    const currentRequestId = createRequestId();
    activeRequestIdRef.current = currentRequestId;

    const newAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      reasoningContent: "",
      hasReasoning: false,
      createdAt: Date.now(),
      status: "streaming",
    };

    const nextMessages = [...historyMessages, newAssistantMessage];
    const updatedSession: ChatSession = {
      ...activeSession,
      messages: nextMessages,
      updatedAt: Date.now(),
    };

    const nextSessions = sessions.map((s) =>
      s.id === activeSession.id ? updatedSession : s
    );
    setSessions(nextSessions);
    void saveSessionsToStorage(nextSessions);

    setIsStreaming(true);
    setExtractError(null);
    scrollToBottom(true);

    try {
      let messagesPayload: any[];
      if (prevUserMsg.pageMeta?.isWebPageReading) {
        const userPrompt = buildWebReadingUserPrompt({
          title: prevUserMsg.pageMeta.title,
          url: prevUserMsg.pageMeta.url,
          content: prevUserMsg.pageMeta.excerpt || prevUserMsg.content,
          wordCount: prevUserMsg.pageMeta.wordCount,
        });
        messagesPayload = [
          { role: "system" as const, content: WEB_READING_SYSTEM_PROMPT },
          { role: "user" as const, content: userPrompt },
        ];
      } else {
        messagesPayload = historyMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));
      }

      await browser.runtime.sendMessage({
        action: MESSAGE_TYPES.TRANSLATE,
        requestId: currentRequestId,
        targetKind: "sidepanel",
        source: "sidepanel",
        sessionId: activeSession.id,
        messages: messagesPayload,
        images: prevUserMsg.images,
        thinkingEnabled,
      });
    } catch (error: any) {
      logger.error("重新生成回答失败:", error);
      setIsStreaming(false);
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== activeSession.id) return s;
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last && last.role === "assistant") {
            msgs[msgs.length - 1] = {
              ...last,
              status: "error",
              errorMessage:
                error?.message || "重新生成失败，请检查网络或设置",
            };
          }
          return { ...s, messages: msgs };
        })
      );
    }
  };

  // 中止当前生成
  const handleStopGenerating = async () => {
    if (activeRequestIdRef.current) {
      try {
        await browser.runtime.sendMessage({
          action: MESSAGE_TYPES.CLEANUP,
          requestId: activeRequestIdRef.current,
          source: "sidepanel",
        });
      } catch (error) {
        logger.error("清理请求失败:", error);
      }
      activeRequestIdRef.current = undefined;
      setIsStreaming(false);
    }
  };

  // 新建会话
  const handleCreateNewSession = () => {
    if (isStreaming) {
      void handleStopGenerating();
    }
    const fresh = createNewSession();
    const updated = [fresh, ...sessions];
    setSessions(updated);
    setActiveSessionId(fresh.id);
    void saveSessionsToStorage(updated);
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
    const filtered = sessions.filter((s) => s.id !== sessionId);
    if (filtered.length === 0) {
      const fresh = createNewSession();
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
      void saveSessionsToStorage([fresh]);
      void saveActiveSessionId(fresh.id);
    } else {
      setSessions(filtered);
      void saveSessionsToStorage(filtered);
      if (activeSessionId === sessionId) {
        setActiveSessionId(filtered[0].id);
        void saveActiveSessionId(filtered[0].id);
      }
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
                        setActiveSessionId(session.id);
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
                          {message.pageMeta?.isWebPageReading ? (
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
                              <div className="user-text">{message.content}</div>
                            </div>
                          )}

                          {/* 悬浮操作区：编辑按钮 */}
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
                        </div>
                      )
                    ) : (
                      <>
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
                              onClick={() => handleRegenerateMessage(message.id)}
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
                        <button
                          type="button"
                          className="action-link-btn regenerate-btn"
                          title="重新生成回答"
                          disabled={isStreaming}
                          onClick={() => handleRegenerateMessage(message.id)}
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
