import {
  DEFAULT_SETTINGS,
  LOG_LEVELS,
  MESSAGE_TYPES,
  LogLevel,
  THEME_MODES,
  ThemeMode,
} from "@/entrypoints/shared/constants";
import { initializeLogger, optionsLogger } from "@/entrypoints/shared/logger";
import {
  DIAGNOSTIC_STATE_KEY,
  isDiagnosticSessionActive,
  startDiagnosticSession,
  stopDiagnosticSession,
} from "@/entrypoints/shared/logger/diagnostics";
import type {
  DiagnosticLogRecord,
  DiagnosticLogSummary,
  DiagnosticSessionState,
} from "@/entrypoints/shared/logger/types";
import { SettingsUtils } from "@/entrypoints/shared/settingsUtils";
import { FontScaleControl } from "@/entrypoints/shared/FontScaleControl";
import { useFontScale } from "@/entrypoints/shared/useFontScale";
import {
  buildBackup,
  createBackupFileName,
  formatSectionNames,
  restoreBackup,
  validateBackup,
} from "@/entrypoints/shared/dataBackup";
import {
  AllApplication,
  Api,
  Bug,
  Caution,
  Check,
  CheckCorrect,
  Clear,
  Copy,
  Download,
  OpenOne,
  PauseOne,
  Platte,
  PreviewClose,
  PreviewCloseOne,
  Protect,
  Refresh,
  SaveOne,
  SettingTwo,
  Upload,
} from "@icon-park/react";
import { useEffect, useRef, useState } from "react";
import { API_HINTS, API_PLATFORM_HINTS, MODEL_HINTS } from "./config";
import "./Options.less";

interface Settings {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  promptTemplate: string;
  thinkingEnabled: boolean;
  showSelectionToolbar: boolean;
  contextualSelectionEnabled: boolean;
  logLevel: LogLevel;
  theme: ThemeMode;
  fontScalePercent: number;
}

export type TabCategory =
  | "all"
  | "api"
  | "interaction"
  | "appearance"
  | "diagnostics";

interface TabItem {
  id: TabCategory;
  label: string;
  icon: typeof Api;
}

const TABS: TabItem[] = [
  { id: "all", label: "全部展开", icon: AllApplication },
  { id: "api", label: "API 与模型", icon: Api },
  { id: "interaction", label: "划词与交互", icon: SettingTwo },
  { id: "appearance", label: "外观显示", icon: Platte },
  { id: "diagnostics", label: "备份与诊断", icon: Protect },
];

function Options() {
  const {
    fontScalePercent,
    performFontScaleAction,
    fontScaleSaveStatus,
  } = useFontScale();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<TabCategory>("all");

  const [showApiKey, setShowApiKey] = useState(false);

  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [shortcut, setShortcut] = useState("");
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [testMessage, setTestMessage] = useState("");
  const [diagnosticState, setDiagnosticState] =
    useState<DiagnosticSessionState | null>(null);
  const [diagnosticSummary, setDiagnosticSummary] =
    useState<DiagnosticLogSummary>({
      total: 0,
      errors: 0,
    });
  const [diagnosticMessage, setDiagnosticMessage] = useState("");
  const [diagnosticBusy, setDiagnosticBusy] = useState(false);
  const [diagnosticNow, setDiagnosticNow] = useState(Date.now());
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupFeedback, setBackupFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  const manifestVersion =
    browser?.runtime?.getManifest?.()?.version || "1.4.0";

  const [isStandalone, setIsStandalone] = useState(false);

  // 检测是否已经在独立全屏标签页中打开
  useEffect(() => {
    const checkStandalone = () => {
      try {
        const inIframe = window.self !== window.top;
        const isWide = window.innerWidth >= 800;
        setIsStandalone(!inIframe && isWide);
      } catch {
        setIsStandalone(false);
      }
    };
    checkStandalone();
    window.addEventListener("resize", checkStandalone);
    return () => window.removeEventListener("resize", checkStandalone);
  }, []);

  // 加载设置
  useEffect(() => {
    void initializeLogger("options").then(() =>
      optionsLogger.info("设置页面加载")
    );

    loadSettings();
    loadShortcut();
    void loadDiagnosticState();
    void refreshDiagnosticSummary();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setDiagnosticNow(Date.now());
      if (
        diagnosticState &&
        !isDiagnosticSessionActive(diagnosticState, Date.now())
      ) {
        setDiagnosticState(null);
      }
    }, 1000);

    const storageListener = (changes: any, areaName: string) => {
      if (areaName !== "local" || !changes[DIAGNOSTIC_STATE_KEY]) return;
      const nextState = changes[DIAGNOSTIC_STATE_KEY]
        .newValue as DiagnosticSessionState | undefined;
      setDiagnosticState(
        isDiagnosticSessionActive(nextState) ? nextState : null
      );
    };
    browser.storage.onChanged.addListener(storageListener);

    return () => {
      window.clearInterval(intervalId);
      browser.storage.onChanged.removeListener(storageListener);
    };
  }, [diagnosticState]);

  useEffect(() => {
    if (!isDiagnosticSessionActive(diagnosticState)) return;

    const intervalId = window.setInterval(
      () => void refreshDiagnosticSummary(),
      3000
    );
    return () => window.clearInterval(intervalId);
  }, [diagnosticState?.expiresAt]);

  // 根据设置应用主题（支持系统跟随）
  useEffect(() => {
    const cleanup = applyTheme(settings.theme);
    return cleanup;
  }, [settings.theme]);

  useEffect(() => {
    setSettings((previous) =>
      previous.fontScalePercent === fontScalePercent
        ? previous
        : { ...previous, fontScalePercent }
    );
  }, [fontScalePercent]);

  const applyTheme = (mode: ThemeMode) => {
    const root = document.documentElement;
    const media =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");

    const setDataTheme = (val: "light" | "dark" | "system") => {
      if (val === "system") {
        root.removeAttribute("data-theme");
        // 同步一次系统当前主题
        root.setAttribute("data-theme", media?.matches ? "dark" : "light");
      } else {
        root.setAttribute("data-theme", val);
      }
    };

    setDataTheme(mode as any);

    // 当选择系统时，监听系统主题变化
    const listener = () => {
      if (mode === THEME_MODES.SYSTEM) {
        root.setAttribute("data-theme", media?.matches ? "dark" : "light");
      }
    };
    media?.addEventListener?.("change", listener);
    return () => media?.removeEventListener?.("change", listener);
  };

  const loadSettings = async () => {
    try {
      const s = await SettingsUtils.getSettings();
      setSettings((prev) => ({ ...prev, ...s }));
    } catch (error) {
      optionsLogger.error("加载设置失败:", error);
    }
  };

  const loadShortcut = async () => {
    try {
      const commands = await browser.commands.getAll();
      const translateCommand = commands.find(
        (cmd: any) => cmd.name === "translate-selection"
      );
      if (translateCommand && translateCommand.shortcut) {
        setShortcut(translateCommand.shortcut);
      }
    } catch (error) {
      optionsLogger.error("加载快捷键失败:", error);
    }
  };

  const handleOpenInTab = () => {
    try {
      const url =
        typeof browser?.runtime?.getURL === "function"
          ? browser.runtime.getURL("/options.html")
          : window.location.href;
      window.open(url, "_blank");
    } catch {
      window.open(window.location.href, "_blank");
    }
  };

  const handleSave = async (showStatus = true): Promise<boolean> => {
    if (saveStatus === "saving") return false; // 防止重复提交

    if (showStatus) {
      setSaveStatus("saving");
    }

    try {
      // 使用 SettingsUtils 统一保存
      const settingsWithoutFontScale = { ...settings } as Partial<Settings>;
      delete settingsWithoutFontScale.fontScalePercent;
      await SettingsUtils.setSettings(settingsWithoutFontScale);

      // 重新初始化日志系统以应用新的日志级别
      await initializeLogger("options");
      optionsLogger.info("设置保存成功", {
        logLevel: settings.logLevel,
        thinkingEnabled: settings.thinkingEnabled,
      });

      if (showStatus) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
      return true;
    } catch (error) {
      optionsLogger.error("保存设置失败:", error);
      if (showStatus) {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
      return false;
    }
  };

  const loadDiagnosticState = async () => {
    try {
      const stored = await browser.storage.local.get(DIAGNOSTIC_STATE_KEY);
      const nextState = stored?.[
        DIAGNOSTIC_STATE_KEY
      ] as DiagnosticSessionState | undefined;
      setDiagnosticState(
        isDiagnosticSessionActive(nextState) ? nextState : null
      );
    } catch (error) {
      optionsLogger.error("读取诊断状态失败:", error);
    }
  };

  const getDiagnosticLogs = async (): Promise<DiagnosticLogRecord[]> => {
    const response = await browser.runtime.sendMessage({
      action: MESSAGE_TYPES.GET_DIAGNOSTIC_LOGS,
    });
    if (!response?.success) {
      throw new Error(response?.error || "读取诊断日志失败");
    }
    if (response.summary) {
      setDiagnosticSummary(response.summary);
    }
    return response.records || [];
  };

  const refreshDiagnosticSummary = async () => {
    try {
      await getDiagnosticLogs();
    } catch (error) {
      optionsLogger.error("刷新诊断日志摘要失败:", error);
    }
  };

  const beginDiagnostics = async () => {
    if (diagnosticBusy) return;
    setDiagnosticBusy(true);
    setDiagnosticMessage("");
    try {
      const state = await startDiagnosticSession();
      setDiagnosticState(state);
      setDiagnosticNow(Date.now());
      setDiagnosticSummary({ total: 0, errors: 0 });
      setDiagnosticMessage("诊断已开启");
      await initializeLogger("options");
      optionsLogger.info("诊断模式已开启", { expiresAt: state.expiresAt });
    } catch (error) {
      setDiagnosticMessage("开启诊断失败");
      optionsLogger.error("开启诊断模式失败:", error);
    } finally {
      setDiagnosticBusy(false);
    }
  };

  const endDiagnostics = async () => {
    if (diagnosticBusy) return;
    setDiagnosticBusy(true);
    try {
      await stopDiagnosticSession();
      setDiagnosticState(null);
      setDiagnosticMessage("诊断已停止，已有日志仍可导出");
    } catch (error) {
      setDiagnosticMessage("停止诊断失败");
      optionsLogger.error("停止诊断模式失败:", error);
    } finally {
      setDiagnosticBusy(false);
    }
  };

  const clearDiagnostics = async () => {
    if (diagnosticBusy) return;
    setDiagnosticBusy(true);
    try {
      const response = await browser.runtime.sendMessage({
        action: MESSAGE_TYPES.CLEAR_DIAGNOSTIC_LOGS,
      });
      if (!response?.success) throw new Error(response?.error);
      setDiagnosticSummary({ total: 0, errors: 0 });
      setDiagnosticMessage("诊断日志已清空");
    } catch (error) {
      setDiagnosticMessage("清空日志失败");
      optionsLogger.error("清空诊断日志失败:", error);
    } finally {
      setDiagnosticBusy(false);
    }
  };

  const createDiagnosticExport = (records: DiagnosticLogRecord[]) => ({
    exportedAt: new Date().toISOString(),
    extension: browser.runtime.getManifest().name,
    version: browser.runtime.getManifest().version,
    records,
  });

  const copyDiagnostics = async () => {
    if (diagnosticBusy) return;
    setDiagnosticBusy(true);
    try {
      const records = await getDiagnosticLogs();
      await navigator.clipboard.writeText(
        JSON.stringify(createDiagnosticExport(records), null, 2)
      );
      setDiagnosticMessage("诊断日志已复制到剪贴板");
    } catch (error: any) {
      setDiagnosticMessage(`复制日志失败: ${error?.message || "未知错误"}`);
      optionsLogger.error("复制诊断日志失败:", error);
    } finally {
      setDiagnosticBusy(false);
    }
  };

  const downloadDiagnostics = async () => {
    if (diagnosticBusy) return;
    setDiagnosticBusy(true);
    try {
      const records = await getDiagnosticLogs();
      const blob = new Blob(
        [JSON.stringify(createDiagnosticExport(records), null, 2)],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `human-text-diagnostics-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setDiagnosticMessage("诊断日志已开始下载");
    } catch (error: any) {
      setDiagnosticMessage(`下载日志失败: ${error?.message || "未知错误"}`);
      optionsLogger.error("下载诊断日志失败:", error);
    } finally {
      setDiagnosticBusy(false);
    }
  };

  const handleExportBackup = async () => {
    if (backupBusy) return;
    setBackupBusy(true);
    setBackupFeedback(null);
    try {
      const backup = await buildBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = createBackupFileName();
      link.click();
      URL.revokeObjectURL(url);
      optionsLogger.info("数据备份已导出", {
        history: backup.data.history.length,
        jargon: backup.data.jargon.length,
        sessions: backup.data.sessions.sessions.length,
      });
      setBackupFeedback({
        type: "success",
        text: `导出成功：已下载包含 ${backup.data.history.length} 条历史、${backup.data.jargon.length} 条生词、${backup.data.sessions.sessions.length} 个会话的备份文件。`,
      });
    } catch (error: any) {
      optionsLogger.error("导出备份失败:", error);
      setBackupFeedback({
        type: "error",
        text: `导出备份失败：${error?.message || "未知错误"}`,
      });
    } finally {
      setBackupBusy(false);
    }
  };

  const handleImportBackupFile = async (file: File) => {
    if (backupBusy) return;
    setBackupBusy(true);
    setBackupFeedback(null);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        throw new Error("所选文件不是有效的 JSON 文件");
      }

      const validation = validateBackup(parsed);
      if (!validation.valid || !validation.backup) {
        throw new Error(validation.error || "备份文件格式不正确");
      }
      const backup = validation.backup;

      const confirmed = window.confirm(
        `导入备份将覆盖当前全部数据：\n\n` +
          `· 翻译历史 ${backup.data.history.length} 条\n` +
          `· 生词本 ${backup.data.jargon.length} 条\n` +
          `· 侧边栏会话 ${backup.data.sessions.sessions.length} 个\n` +
          `· 用户设置（API Key 不受影响，备份中也不包含 API Key）\n\n` +
          `当前的历史、生词本、会话与设置将被替换，且无法撤销。确定要继续吗？`
      );
      if (!confirmed) return;

      const result = await restoreBackup(backup);
      if (result.failed.length === 0) {
        setBackupFeedback({
          type: "success",
          text: `恢复成功：${formatSectionNames(result.restored)} 已覆盖导入。侧边栏如已打开，请关闭后重新打开即可看到恢复的会话；其他页面如未生效请刷新页面。`,
        });
      } else if (result.restored.length > 0) {
        setBackupFeedback({
          type: "error",
          text: `部分恢复成功：${formatSectionNames(result.restored)} 已导入，但 ${formatSectionNames(result.failed)} 失败。${(result.errors || []).join(" ")}`,
        });
      } else {
        throw new Error(
          (result.errors || ["所有数据均写入失败，请重试"]).join(" ")
        );
      }
      optionsLogger.info("数据备份恢复完成", {
        restored: result.restored,
        failed: result.failed,
      });
    } catch (error: any) {
      optionsLogger.error("导入备份失败:", error);
      setBackupFeedback({
        type: "error",
        text: `导入备份失败：${error?.message || "未知错误"}`,
      });
    } finally {
      setBackupBusy(false);
    }
  };

  const handleBackupFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    // 重置 input，允许用户连续选择同一个文件
    event.target.value = "";
    if (!file) return;
    await handleImportBackupFile(file);
  };

  const handleInputChange = (
    field: keyof Settings,
    value: string | number | boolean
  ) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const openShortcutSettings = () => {
    browser.tabs.create({ url: "chrome://extensions/shortcuts" });
  };

  // 测试API密钥连接并自动持久化
  const testApiKey = async () => {
    if (testStatus === "testing") return; // 防止重复提交

    setTestStatus("testing");
    setTestMessage("正在测试API连接...");

    try {
      // 发送测试请求到background script
      const response = await browser.runtime.sendMessage({
        action: "testApiConnection",
        apiKey: settings.apiKey,
        baseUrl:
          settings.baseUrl || "https://api.deepseek.com/v1/chat/completions",
        model: settings.model || "deepseek-reasoner",
      });

      if (response.success) {
        setTestStatus("success");
        // 测试成功后自动持久化当前设置
        const saved = await handleSave(false);
        if (saved) {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
          setTestMessage("✅ API连接测试成功，设置已自动保存！");
        } else {
          setTestMessage("✅ API连接测试成功！");
        }
      } else {
        setTestStatus("error");
        setTestMessage(`❌ 连接失败: ${response.error || "未知错误"}`);
      }
    } catch (error: any) {
      setTestStatus("error");
      setTestMessage(`❌ 测试失败: ${error.message || "未知错误"}`);
    }

    // 3.5秒后自动重置状态
    setTimeout(() => {
      setTestStatus("idle");
      setTestMessage("");
    }, 3500);
  };

  const handleReset = () => {
    if (confirm("确定要重置所有设置为默认值吗？")) {
      setSettings(DEFAULT_SETTINGS);
      performFontScaleAction("reset");
    }
  };

  const diagnosticsActive = isDiagnosticSessionActive(
    diagnosticState,
    diagnosticNow
  );
  const diagnosticRemainingSeconds = diagnosticsActive
    ? Math.max(
        0,
        Math.ceil((diagnosticState.expiresAt - diagnosticNow) / 1000)
      )
    : 0;
  const diagnosticRemainingLabel = `${Math.floor(
    diagnosticRemainingSeconds / 60
  )
    .toString()
    .padStart(2, "0")}:${(diagnosticRemainingSeconds % 60)
    .toString()
    .padStart(2, "0")}`;

  const showApiSection = activeTab === "all" || activeTab === "api";
  const showInteractionSection =
    activeTab === "all" || activeTab === "interaction";
  const showAppearanceSection =
    activeTab === "all" || activeTab === "appearance";
  const showDiagnosticsSection =
    activeTab === "all" || activeTab === "diagnostics";

  return (
    <div className="options-container">
      {/* 顶部 Header */}
      <header className="options-header">
        <div className="header-brand">
          <img
            src="/icon/48.png"
            alt="人话翻译器 Logo"
            className="header-logo"
            width={48}
            height={48}
          />
          <div className="header-title-group">
            <div className="header-title-row">
              <h1 className="header-title">人话翻译器</h1>
              <span className="header-version">v{manifestVersion}</span>
            </div>
            <p className="header-subtitle">
              借助 AI 的力量，将专业术语与行业黑话翻译成通俗易懂的「人话」
            </p>
          </div>
        </div>

        <div className="header-actions">
          {/* 在新标签页打开按钮 / 已在独立标签页 */}
          {isStandalone ? (
            <span
              className="tab-mode-badge"
              title="当前页面已在浏览器独立全屏标签页中运行"
            >
              <CheckCorrect theme="outline" size="14" />
              <span>已在独立标签页</span>
            </span>
          ) : (
            <button
              type="button"
              className="header-action-btn open-tab-btn"
              onClick={handleOpenInTab}
              title="在新标签页中打开完整设置页"
            >
              <OpenOne theme="outline" size="15" />
              <span>新标签页打开</span>
            </button>
          )}

          {/* 顶栏重置默认快捷按钮 */}
          <button
            type="button"
            className="header-action-btn"
            onClick={handleReset}
            title="重置所有设置项为初始默认值"
          >
            <Refresh theme="outline" size="15" />
            <span>重置默认</span>
          </button>

          {/* 全局保存状态指示器 */}
          <div className={`global-save-status ${saveStatus}`}>
            <span className="status-dot" />
            <span className="status-text">
              {saveStatus === "saving" && "正在保存..."}
              {saveStatus === "saved" && "设置已自动保存"}
              {saveStatus === "error" && "保存失败，请检查"}
              {saveStatus === "idle" && "设置就绪"}
            </span>
          </div>

          {/* 顶部快速保存 */}
          <button
            type="button"
            className={`header-action-btn primary-save ${saveStatus}`}
            onClick={() => void handleSave(true)}
            disabled={saveStatus === "saving"}
          >
            <SaveOne theme="outline" size="15" />
            <span>{saveStatus === "saving" ? "保存中" : "保存设置"}</span>
          </button>
        </div>
      </header>

      {/* 分类导航栏 */}
      <nav className="options-nav" aria-label="设置类别导航">
        {TABS.map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`nav-tab ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <IconComp theme="outline" size="16" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 设置内容卡片 */}
      <main className="options-content">
        {/* API 设置卡片 */}
        {showApiSection && (
          <>
            <section className="settings-section" data-category="api">
              <div className="section-header">
                <h2>API 设置</h2>
                <p className="section-desc">
                  配置 OpenAI 兼容格式的大语言模型服务接入点与认证密钥
                </p>
              </div>

              <div className="setting-item">
                <div className="api-key-header-row">
                  <label htmlFor="apiKey">API Key *</label>
                  <div className="api-key-status-group">
                    {settings.apiKey.trim() ? (
                      <span className="api-key-badge configured">
                        <Check theme="outline" size="12" />
                        已配置
                      </span>
                    ) : (
                      <span className="api-key-badge missing">
                        <Caution theme="outline" size="12" />
                        未配置
                      </span>
                    )}
                  </div>
                </div>
                <div className="api-key-input-group">
                  <input
                    type={showApiKey ? "text" : "password"}
                    id="apiKey"
                    value={settings.apiKey}
                    onChange={(e) => handleInputChange("apiKey", e.target.value)}
                    placeholder="请输入你的 API Key"
                  />
                  <button
                    type="button"
                    className="toggle-api-key-btn"
                    onClick={() => setShowApiKey(!showApiKey)}
                    title={showApiKey ? "隐藏 API Key" : "显示 API Key"}
                  >
                    {showApiKey ? (
                      <PreviewClose
                        theme="outline"
                        size="18"
                        fill="#06A17E"
                        strokeLinejoin="bevel"
                        strokeLinecap="square"
                      />
                    ) : (
                      <PreviewCloseOne
                        theme="outline"
                        size="18"
                        fill="#06A17E"
                        strokeLinejoin="bevel"
                        strokeLinecap="square"
                      />
                    )}
                  </button>
                  <button
                    className="test-api-btn"
                    onClick={testApiKey}
                    disabled={!settings.apiKey.trim() || testStatus === "testing"}
                  >
                    {testStatus === "testing" ? "测试中..." : "测试连接"}
                  </button>
                </div>
                <div className="setting-hint">
                  <span className="hint-label">获取 API Key 官方控制台:</span>
                  <div className="chip-container">
                    {API_PLATFORM_HINTS.filter((p) => p.url).map((platform) => (
                      <a
                        key={platform.name}
                        className="api-platform-hint chip link"
                        href={platform.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {platform.name}
                        <span className="chip-external">↗</span>
                      </a>
                    ))}
                  </div>
                </div>
                {testStatus !== "idle" && (
                  <div className={`test-status ${testStatus}`}>{testMessage}</div>
                )}
              </div>

              <div className="setting-item">
                <label htmlFor="baseUrl">API 地址</label>
                <input
                  type="text"
                  id="baseUrl"
                  value={settings.baseUrl}
                  onChange={(e) => handleInputChange("baseUrl", e.target.value)}
                  placeholder="https://api.deepseek.com/v1/chat/completions"
                />
                <div className="setting-hint">
                  <span className="hint-label">支持的 API 服务 (点击快速填入):</span>
                  <div className="chip-container">
                    {API_HINTS.map((api) => {
                      const isSelected = api.url
                        ? settings.baseUrl.trim() === api.url.trim()
                        : Boolean(settings.baseUrl.trim()) &&
                          !API_HINTS.some(
                            (h) => h.url && h.url.trim() === settings.baseUrl.trim()
                          );
                      return (
                        <button
                          type="button"
                          key={api.name}
                          className={`api-hint chip ${isSelected ? "active" : ""}`}
                          onClick={() => {
                            if (api.url) {
                              handleInputChange("baseUrl", api.url);
                            } else {
                              const input = document.getElementById("baseUrl");
                              input?.focus();
                            }
                          }}
                          title={api.url ? `点击填入: ${api.url}` : "聚焦输入自定义地址"}
                        >
                          {api.name}
                          {isSelected && <span className="chip-check">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="setting-item">
                <label htmlFor="model">模型 ID</label>
                <input
                  type="text"
                  id="model"
                  value={settings.model}
                  onChange={(e) => handleInputChange("model", e.target.value)}
                  placeholder="请输入模型ID，如：deepseek-reasoner"
                />
                <div className="setting-hint">
                  <span className="hint-label">常用模型推荐 (点击快速填入):</span>
                  <div className="model-hint-container chip-container">
                    {MODEL_HINTS.map((hint) => {
                      const isSelected = settings.model === hint;
                      return (
                        <button
                          type="button"
                          key={hint}
                          className={`model-hint chip ${isSelected ? "active" : ""}`}
                          onClick={() => handleInputChange("model", hint)}
                          title={`点击填入: ${hint}`}
                        >
                          {hint}
                          {isSelected && <span className="chip-check">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="setting-item">
                <label htmlFor="temperature">
                  Temperature 创造性 ({settings.temperature})
                </label>
                <input
                  type="range"
                  id="temperature"
                  min="0"
                  max="2"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) =>
                    handleInputChange("temperature", parseFloat(e.target.value))
                  }
                />
                <div className="setting-hint">
                  控制模型回答的创造性与确定性，值越小越严谨，推荐值 0.3 ~ 0.7。
                </div>
              </div>
            </section>

            {/* 提示词设置卡片 */}
            <section className="settings-section" data-category="api">
              <div className="section-header">
                <h2>提示词设置</h2>
                <p className="section-desc">
                  定制 AI 的人话翻译风格、解释方式与受众表达要求
                </p>
              </div>

              <div className="setting-item">
                <label htmlFor="promptTemplate">提示词模板</label>
                <textarea
                  id="promptTemplate"
                  value={settings.promptTemplate}
                  onChange={(e) =>
                    handleInputChange("promptTemplate", e.target.value)
                  }
                  placeholder="请输入 AI 的解释方式和表达要求"
                  rows={4}
                />
                <div className="setting-hint">
                  提示词将作为系统指令发送给 AI，待翻译文本会自动作为用户消息发送，无需填写占位符。
                </div>
              </div>
            </section>
          </>
        )}

        {/* 交互偏好卡片 */}
        {showInteractionSection && (
          <>
            <section className="settings-section" data-category="interaction">
              <div className="section-header">
                <h2>交互偏好设置</h2>
                <p className="section-desc">
                  个性化定制划选文字浮窗操作条、思考过程与上下文理解
                </p>
              </div>

              <div className="setting-item">
                <label htmlFor="thinkingEnabled">思考模式</label>
                <div className="switch-container">
                  <input
                    type="checkbox"
                    id="thinkingEnabled"
                    checked={settings.thinkingEnabled}
                    onChange={(e) =>
                      handleInputChange("thinkingEnabled", e.target.checked)
                    }
                    className="switch-input"
                  />
                  <label htmlFor="thinkingEnabled" className="switch-label"></label>
                </div>
                <div className="setting-hint">
                  开启后将折叠展示 AI 的推理思考链，清晰了解黑话翻译背后的拆解逻辑。
                </div>
              </div>

              <div className="setting-item">
                <label htmlFor="showSelectionToolbar">划词快捷操作条</label>
                <div className="switch-container">
                  <input
                    type="checkbox"
                    id="showSelectionToolbar"
                    checked={settings.showSelectionToolbar}
                    onChange={(e) =>
                      handleInputChange("showSelectionToolbar", e.target.checked)
                    }
                    className="switch-input"
                  />
                  <label htmlFor="showSelectionToolbar" className="switch-label"></label>
                </div>
                <div className="setting-hint">
                  划选网页文本时，在光标附近智能呈现快捷工具条（人话翻译、追问、收藏）。
                </div>
              </div>

              <div className="setting-item">
                <label htmlFor="contextualSelectionEnabled">结合当前段落解释</label>
                <div className="switch-container">
                  <input
                    type="checkbox"
                    id="contextualSelectionEnabled"
                    checked={settings.contextualSelectionEnabled}
                    onChange={(e) =>
                      handleInputChange(
                        "contextualSelectionEnabled",
                        e.target.checked
                      )
                    }
                    className="switch-input"
                  />
                  <label
                    htmlFor="contextualSelectionEnabled"
                    className="switch-label"
                  ></label>
                </div>
                <div className="setting-hint">
                  默认关闭。开启后，划词时会提取选区所在的有限段落（最多约 2000
                  字），并在确认发送时交给已配置的 AI 服务。页面标题和 URL
                  仅用于本地来源预览。
                </div>
              </div>
            </section>

            <section className="settings-section" data-category="interaction">
              <div className="section-header">
                <h2>快捷键设置</h2>
                <p className="section-desc">
                  配置全局快速调起人话翻译的快捷键组合
                </p>
              </div>

              <div className="setting-item">
                <label>当前快捷键</label>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <div className="shortcut-display">{shortcut || "未设置"}</div>
                  <button className="shortcut-btn" onClick={openShortcutSettings}>
                    修改快捷键
                  </button>
                </div>
                <div className="setting-hint">
                  点击按钮打开 Chrome 扩展快捷键设置中心（支持自定义 Option+D / Alt+D 等快捷键）。
                </div>
              </div>
            </section>
          </>
        )}

        {/* 外观显示卡片 */}
        {showAppearanceSection && (
          <section className="settings-section" data-category="appearance">
            <div className="section-header">
              <h2>外观与显示</h2>
              <p className="section-desc">
                调整界面明暗色彩风格、全局字体显示比例与开发者调试日志
              </p>
            </div>

            <div className="setting-item">
              <label htmlFor="themeMode">主题模式</label>
              <select
                id="themeMode"
                value={settings.theme}
                onChange={(e) =>
                  handleInputChange("theme", e.target.value as ThemeMode)
                }
                className="log-level-select"
              >
                <option value={THEME_MODES.SYSTEM}>跟随系统</option>
                <option value={THEME_MODES.LIGHT}>浅色明亮</option>
                <option value={THEME_MODES.DARK}>深色沉浸</option>
              </select>
              <div className="setting-hint">
                选择界面色彩风格；选择“跟随系统”将随操作系统的暗黑模式自动切换。
              </div>
            </div>

            <div className="setting-item">
              <label>扩展字体大小</label>
              <FontScaleControl
                value={fontScalePercent}
                saveStatus={fontScaleSaveStatus}
                onDecrease={() => performFontScaleAction("decrease")}
                onReset={() => performFontScaleAction("reset")}
                onIncrease={() => performFontScaleAction("increase")}
              />
              <div className="setting-hint">
                同步调整侧边栏、Popup、设置页和网页内扩展浮窗文字；也可使用 Command/Ctrl + 加号、减号或 0。
              </div>

              {/* 实时字号效果预览卡片 */}
              <div className="font-scale-preview-card">
                <div className="preview-header">
                  <span>实时字号效果预览</span>
                  <span className="preview-scale-tag">当前缩放: {fontScalePercent}%</span>
                </div>
                <div className="preview-original">
                  <strong>选中文本（黑话原文）：</strong>
                  <span>
                    “我们本次 Q3 主要是对核心模块进行心智对齐，打通底层链路并赋能上游协同生态，沉淀行业抓手……”
                  </span>
                </div>
                <div className="preview-translation">
                  <strong>人话翻译：</strong>
                  <span>
                    “我们第三季度主要把大家的想法统一一下，修好底层接口，让其他业务团队用起来更省心，总结一套成熟好用的做法。”
                  </span>
                </div>
              </div>
            </div>

            <div className="setting-item">
              <label htmlFor="logLevel">日志级别</label>
              <select
                id="logLevel"
                value={settings.logLevel}
                onChange={(e) =>
                  handleInputChange("logLevel", e.target.value as LogLevel)
                }
                className="log-level-select"
              >
                <option value={LOG_LEVELS.OFF}>关闭日志</option>
                <option value={LOG_LEVELS.ERROR}>仅错误 (Error)</option>
                <option value={LOG_LEVELS.WARN}>警告及以上 (Warn)</option>
                <option value={LOG_LEVELS.INFO}>信息及以上 (Info)</option>
                <option value={LOG_LEVELS.DEBUG}>全部详细调试 (Debug)</option>
              </select>
              <div className="setting-hint">
                控制控制台中显示的日志级别，便于开发调试和日常使用排查。
              </div>
            </div>
          </section>
        )}

        {/* 备份与诊断卡片 */}
        {showDiagnosticsSection && (
          <>
            <section className="settings-section diagnostics-section" data-category="diagnostics">
              <div className="section-header">
                <h2>问题诊断</h2>
                <p className="section-desc">
                  临时开启会话级诊断记录，排查接口异常并导出脱敏日志
                </p>
              </div>

              <div className="diagnostic-status-row">
                <div>
                  <div
                    className={`diagnostic-status ${
                      diagnosticsActive ? "active" : "inactive"
                    }`}
                  >
                    <span className="diagnostic-status-dot" />
                    {diagnosticsActive
                      ? `正在记录 · ${diagnosticRemainingLabel}`
                      : "诊断未开启"}
                  </div>
                  <div className="diagnostic-summary">
                    <span>记录 {diagnosticSummary.total}</span>
                    <span>错误 {diagnosticSummary.errors}</span>
                    <span>
                      最近{" "}
                      {diagnosticSummary.latestTimestamp
                        ? new Date(
                            diagnosticSummary.latestTimestamp
                          ).toLocaleTimeString()
                        : "暂无"}
                    </span>
                  </div>
                </div>

                {diagnosticsActive ? (
                  <button
                    type="button"
                    className="diagnostic-btn stop"
                    onClick={endDiagnostics}
                    disabled={diagnosticBusy}
                  >
                    <PauseOne theme="outline" size="16" />
                    停止诊断
                  </button>
                ) : (
                  <button
                    type="button"
                    className="diagnostic-btn start"
                    onClick={beginDiagnostics}
                    disabled={diagnosticBusy}
                  >
                    <Bug theme="outline" size="16" />
                    开启 30 分钟诊断
                  </button>
                )}
              </div>

              <div className="diagnostic-actions">
                <button
                  type="button"
                  className="diagnostic-btn secondary"
                  onClick={copyDiagnostics}
                  disabled={diagnosticBusy || diagnosticSummary.total === 0}
                >
                  <Copy theme="outline" size="16" />
                  复制日志
                </button>
                <button
                  type="button"
                  className="diagnostic-btn secondary"
                  onClick={downloadDiagnostics}
                  disabled={diagnosticBusy || diagnosticSummary.total === 0}
                >
                  <Download theme="outline" size="16" />
                  下载 JSON
                </button>
                <button
                  type="button"
                  className="diagnostic-btn clear"
                  onClick={clearDiagnostics}
                  disabled={diagnosticBusy || diagnosticSummary.total === 0}
                >
                  <Clear theme="outline" size="16" />
                  清空日志
                </button>
              </div>

              {diagnosticMessage && (
                <div className="diagnostic-message" role="status">
                  {diagnosticMessage}
                </div>
              )}
              <div className="setting-hint" style={{ marginTop: "16px" }}>
                诊断记录仅保存在当前浏览器会话，API Key、原文、译文和图片会自动脱敏。
              </div>
            </section>

            <section className="settings-section" data-category="diagnostics">
              <div className="section-header">
                <h2>数据备份</h2>
                <p className="section-desc">
                  一键聚合导出翻译历史、生词本、会话与设置，支持跨设备还原
                </p>
              </div>

              <div className="setting-hint" style={{ marginBottom: "16px" }}>
                将翻译历史、生词本、侧边栏会话与用户设置聚合导出为一个 JSON
                文件，换机或重装扩展时可一键恢复。备份绝不包含 API Key。
              </div>

              <div className="diagnostic-actions">
                <button
                  type="button"
                  className="diagnostic-btn secondary"
                  onClick={handleExportBackup}
                  disabled={backupBusy}
                >
                  <Download theme="outline" size="16" />
                  导出完整备份
                </button>
                <button
                  type="button"
                  className="diagnostic-btn secondary"
                  onClick={() => backupFileInputRef.current?.click()}
                  disabled={backupBusy}
                >
                  <Upload theme="outline" size="16" />
                  导入备份文件
                </button>
                <input
                  ref={backupFileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="backup-file-input"
                  onChange={handleBackupFileChange}
                />
              </div>

              {backupFeedback && (
                <div
                  className={`backup-message ${backupFeedback.type}`}
                  role="status"
                >
                  {backupFeedback.text}
                </div>
              )}
              <div className="setting-hint" style={{ marginTop: "16px" }}>
                导入备份会覆盖当前的历史记录、生词本、侧边栏会话与设置项（API Key
                不受影响，绝不会被覆盖）；恢复后其他页面可能需要刷新生效。
              </div>
            </section>
          </>
        )}
      </main>

      {/* 底部操作条 */}
      <footer className="options-footer">
        <div style={{ color: "#6b7280", fontSize: "calc(13px * var(--ht-font-scale, 1))" }}>
          人话翻译器 · 通俗易懂读懂大千世界
        </div>
        <div className="button-group">
          <button className="reset-btn" onClick={handleReset}>
            恢复默认配置
          </button>

          <button
            type="button"
            className={`save-btn ${saveStatus}`}
            onClick={() => void handleSave(true)}
            disabled={saveStatus === "saving"}
          >
            {saveStatus === "saving" && "保存中..."}
            {saveStatus === "saved" && "已保存"}
            {saveStatus === "error" && "保存失败"}
            {saveStatus === "idle" && "保存设置"}
          </button>
        </div>
      </footer>
    </div>
  );
}

export default Options;
