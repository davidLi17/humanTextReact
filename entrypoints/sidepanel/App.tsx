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
import CollapsibleThinkingChain from "@/entrypoints/popup/components/CollapsibleThinkingChain";
import ThemeModeSelector from "@/entrypoints/popup/components/ThemeModeSelector";
import {
  copyCode,
  initializeCodeCopy,
  parseMarkdown,
} from "@/shared/utils/markdown";
import {
  Add,
  Clear,
  Copy,
  Delete,
  DocDetail,
  History,
  Message,
  Send,
  SettingTwo,
  Thunderbolt,
  Brain,
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
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [thinkingEnabled, setThinkingEnabled] = useState<boolean>(false);
  const [showDrawer, setShowDrawer] = useState<boolean>(false);

  const activeRequestIdRef = useRef<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];

  // 初始化代码复制与日志
  useEffect(() => {
    void initializeLogger("sidepanel");
    initializeCodeCopy();
  }, []);

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

  // 检查是否有来自右键菜单的待翻译文本
  useEffect(() => {
    const checkPendingText = async () => {
      try {
        if (!browser?.storage?.local) return;
        const stored = await browser.storage.local.get("pendingSidepanelText");
        const pending = stored.pendingSidepanelText as
          | { text: string; timestamp: number }
          | undefined;

        if (pending && Date.now() - pending.timestamp < 10000) {
          setInputText(pending.text);
          await browser.storage.local.remove("pendingSidepanelText");
          inputRef.current?.focus();
        }
      } catch (error) {
        logger.error("检查待翻译文本失败:", error);
      }
    };

    void checkPendingText();
  }, []);

  // 监听后台消息与流式更新
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.action === "sendToSidepanel" && message.text) {
        setInputText(message.text);
        inputRef.current?.focus();
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
              const updatedMsg: ChatMessage = {
                ...lastMsg,
                content: content ?? lastMsg.content,
                reasoningContent:
                  reasoningContent ?? lastMsg.reasoningContent,
                hasReasoning:
                  Boolean(reasoningContent) || lastMsg.hasReasoning,
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

  // 自动滚动到消息流底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, isStreaming]);

  // 发送消息处理
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || isStreaming || !activeSession) return;

    const userMessageId = createRequestId();
    const assistantMessageId = createRequestId();
    const currentRequestId = createRequestId();
    activeRequestIdRef.current = currentRequestId;

    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: text,
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

    // 自动更新会话标题（若为第一条消息）
    const isFirstUserMessage =
      activeSession.messages.filter((m) => m.role === "user").length === 0;
    const newTitle = isFirstUserMessage
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

    setInputText("");
    setIsStreaming(true);

    try {
      // 构建符合 OpenAI 标准的上下文 messages
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
              errorMessage: error?.message || "请求发送失败，请检查网络或设置",
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
    setShowDrawer(false);
    inputRef.current?.focus();
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
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      logger.error("复制失败:", err);
      return false;
    }
  };

  // 快捷按键处理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  return (
    <div className="sidepanel-container">
      {/* 顶部导航栏 */}
      <header className="sidepanel-header">
        <div className="header-left">
          <button
            type="button"
            className="icon-btn"
            title="会话列表"
            onClick={() => setShowDrawer((prev) => !prev)}
          >
            <History theme="outline" size="18" />
          </button>
          <div className="header-title-wrapper">
            <span className="header-title">人话翻译器</span>
            <span className="session-sub-title" title={activeSession?.title}>
              {activeSession?.title || "新对话"}
            </span>
          </div>
        </div>

        <div className="header-right">
          <button
            type="button"
            className={`thinking-toggle-btn ${thinkingEnabled ? "active" : ""}`}
            title={thinkingEnabled ? "深度思考已开启" : "开启深度思考 (思维链)"}
            onClick={() => setThinkingEnabled((prev) => !prev)}
          >
            <Brain theme="outline" size="16" />
            <span>深度思考</span>
          </button>

          <button
            type="button"
            className="icon-btn new-chat-btn"
            title="新建对话"
            onClick={handleCreateNewSession}
          >
            <Add theme="outline" size="18" />
          </button>

          <ThemeModeSelector
            value={themeMode}
            onChange={(mode) => setThemeMode(mode)}
          />

          <button
            type="button"
            className="icon-btn"
            title="设置"
            onClick={() => browser.runtime.openOptionsPage()}
          >
            <SettingTwo theme="outline" size="18" />
          </button>
        </div>
      </header>

      {/* 会话历史抽屉 */}
      {showDrawer && (
        <div className="drawer-overlay" onClick={() => setShowDrawer(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <span className="drawer-title">历史会话</span>
              <button
                type="button"
                className="new-session-cta"
                onClick={handleCreateNewSession}
              >
                <Add theme="outline" size="16" />
                <span>新建会话</span>
              </button>
            </div>
            <div className="drawer-list">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`drawer-item ${
                    session.id === activeSessionId ? "active" : ""
                  }`}
                  onClick={() => {
                    setActiveSessionId(session.id);
                    void saveActiveSessionId(session.id);
                    setShowDrawer(false);
                  }}
                >
                  <Message theme="outline" size="16" className="item-icon" />
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
          </div>
        </div>
      )}

      {/* 消息对话主区域 */}
      <main className="chat-content">
        {(!activeSession || activeSession.messages.length === 0) && (
          <div className="empty-state">
            <div className="empty-icon">
              <Thunderbolt theme="filled" size="36" />
            </div>
            <h2 className="empty-title">有啥黑话看不懂？</h2>
            <p className="empty-desc">
              在网页中划词或者直接输入，支持长难句解析、多轮追问与反向润色。
            </p>

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

              {/* 主内容 */}
              <div
                className={`bubble-card ${
                  message.role === "user" ? "user-card" : "assistant-card"
                } ${message.status === "error" ? "error-card" : ""}`}
              >
                {message.role === "user" ? (
                  <div className="user-text">{message.content}</div>
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
                        正在说人话...
                      </div>
                    ) : null}

                    {message.status === "error" && (
                      <div className="error-message">
                        ⚠️ {message.errorMessage || "生成出现错误，请重试"}
                      </div>
                    )}
                  </>
                )}

                {/* 卡片底部操作 */}
                {message.content && (
                  <div className="bubble-footer">
                    <button
                      type="button"
                      className="action-link-btn"
                      title="复制内容"
                      onClick={() => handleCopy(message.content)}
                    >
                      <Copy theme="outline" size="13" />
                      <span>复制</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </main>

      {/* 底部输入控制台 */}
      <footer className="chat-input-footer">
        <div className="input-box-wrapper">
          <textarea
            ref={inputRef}
            className="chat-textarea"
            placeholder="输入术语、长难句或继续追问 (Enter 发送，Shift+Enter 换行)..."
            value={inputText}
            rows={2}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <div className="input-controls-bar">
            <div className="input-tip-left">
              {inputText.trim() && (
                <button
                  type="button"
                  className="clear-input-btn"
                  onClick={() => setInputText("")}
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
    </div>
  );
}
