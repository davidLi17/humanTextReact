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
  Bug,
  Clear,
  Copy,
  Download,
  PauseOne,
  PreviewClose,
  PreviewCloseOne,
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

function Options() {
  const {
    fontScalePercent,
    performFontScaleAction,
    fontScaleSaveStatus,
  } = useFontScale();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

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

  const handleSave = async () => {
    if (saveStatus === "saving") return; // 防止重复提交

    setSaveStatus("saving");

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

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      optionsLogger.error("保存设置失败:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
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
      setDiagnosticMessage(`已复制 ${records.length} 条诊断日志`);
    } catch (error) {
      setDiagnosticMessage("复制日志失败");
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
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `human-text-diagnostics-${Date.now()}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setDiagnosticMessage(`已下载 ${records.length} 条诊断日志`);
    } catch (error) {
      setDiagnosticMessage("下载日志失败");
      optionsLogger.error("下载诊断日志失败:", error);
    } finally {
      setDiagnosticBusy(false);
    }
  };

  // ========== 数据备份与恢复 ==========

  const handleExportBackup = async () => {
    if (backupBusy) return;
    setBackupBusy(true);
    setBackupFeedback(null);
    try {
      const backup = await buildBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = createBackupFileName();
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);

      setBackupFeedback({
        type: "success",
        text: `备份已导出：翻译历史 ${backup.data.history.length} 条 · 生词本 ${backup.data.jargon.length} 条 · 侧边栏会话 ${backup.data.sessions.sessions.length} 个 · 设置 ${Object.keys(backup.data.settings).length} 项（不包含 API Key）`,
      });
      optionsLogger.info("数据备份导出成功");
    } catch (error: any) {
      optionsLogger.error("数据备份导出失败:", error);
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

  // 测试API密钥连接
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
        setTestMessage("✅ API连接测试成功，已自动保存！");
        // 测试成功后自动持久化，避免用户在测试通过后遗漏点击底部的“保存设置”按钮
        try {
          const settingsWithoutFontScale = { ...settings } as Partial<Settings>;
          delete settingsWithoutFontScale.fontScalePercent;
          await SettingsUtils.setSettings(settingsWithoutFontScale);
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } catch (saveErr) {
          optionsLogger.warn("自动保存测试通过的设置失败:", saveErr);
        }
      } else {
        setTestStatus("error");
        setTestMessage(`❌ 连接失败: ${response.error}`);
      }
    } catch (error: any) {
      setTestStatus("error");
      setTestMessage(`❌ 测试失败: ${error.message || "未知错误"}`);
    }

    // 3秒后自动重置状态
    setTimeout(() => {
      setTestStatus("idle");
      setTestMessage("");
    }, 3000);
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

  return (
    <div className="options-container">
      <div className="options-header">
        <h1>人话翻译器 - 设置</h1>
        <p>配置你的翻译服务和偏好设置</p>
      </div>

      <div className="options-content">
        <div className="settings-section">
          <h2>API 设置</h2>

          <div className="setting-item">
            <label htmlFor="apiKey">API Key *</label>
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
              >
                {showApiKey ? (
                  <PreviewClose
                    theme="outline"
                    size="20"
                    fill="#06A17E"
                    strokeLinejoin="bevel"
                    strokeLinecap="square"
                  />
                ) : (
                  <PreviewCloseOne
                    theme="outline"
                    size="20"
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
              获取API Key:{" "}
              {API_PLATFORM_HINTS.map((platform, index) => (
                <span key={platform.name}>
                  <a
                    className="api-platform-hint"
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {platform.name}
                  </a>
                  {index < API_PLATFORM_HINTS.length - 1 && ", "}
                </span>
              ))}
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
              支持的API服务:
              {API_HINTS.map((api, index) => (
                <span key={api.name}>
                  <span
                    className="api-hint"
                    onClick={() => handleInputChange("baseUrl", api.url)}
                  >
                    {api.name}
                  </span>
                  {index < API_HINTS.length - 1 && ", "}
                </span>
              ))}
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
              常用模型ID:
              <div className="model-hint-container">
                {MODEL_HINTS.map((hint, index) => (
                  <span key={hint}>
                    <span
                      key={hint}
                      className="model-hint"
                      onClick={() => handleInputChange("model", hint)}
                    >
                      {hint}
                    </span>
                    {index < MODEL_HINTS.length - 1 && ", "}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="setting-item">
            <label htmlFor="temperature">
              Temperature ({settings.temperature})
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
              控制回答的创造性，值越小回答越确定
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>提示词设置</h2>

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
        </div>

        <div className="settings-section">
          <h2>功能设置</h2>

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
              开启后将显示AI的思考过程，让你了解翻译背后的逻辑
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
              划选网页文本时，在选区附近显示快捷操作条（人话翻译、追问、收藏）
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
              字），并在你确认发送时交给已配置的 AI 服务。页面标题和 URL
              仅用于本地来源预览。
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
              <option value={LOG_LEVELS.ERROR}>仅错误</option>
              <option value={LOG_LEVELS.WARN}>警告及以上</option>
              <option value={LOG_LEVELS.INFO}>信息及以上</option>
              <option value={LOG_LEVELS.DEBUG}>全部日志</option>
            </select>
            <div className="setting-hint">
              控制控制台中显示的日志级别，便于开发调试和问题排查
            </div>
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
              <option value={THEME_MODES.LIGHT}>浅色</option>
              <option value={THEME_MODES.DARK}>深色</option>
            </select>
            <div className="setting-hint">
              选择界面颜色风格；选择“跟随系统”将随系统设置自动切换
            </div>
          </div>
        </div>

        <div className="settings-section diagnostics-section">
          <h2>问题诊断</h2>

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
                <PauseOne theme="outline" size="18" />
                停止诊断
              </button>
            ) : (
              <button
                type="button"
                className="diagnostic-btn start"
                onClick={beginDiagnostics}
                disabled={diagnosticBusy}
              >
                <Bug theme="outline" size="18" />
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
              <Copy theme="outline" size="18" />
              复制日志
            </button>
            <button
              type="button"
              className="diagnostic-btn secondary"
              onClick={downloadDiagnostics}
              disabled={diagnosticBusy || diagnosticSummary.total === 0}
            >
              <Download theme="outline" size="18" />
              下载 JSON
            </button>
            <button
              type="button"
              className="diagnostic-btn clear"
              onClick={clearDiagnostics}
              disabled={diagnosticBusy || diagnosticSummary.total === 0}
            >
              <Clear theme="outline" size="18" />
              清空日志
            </button>
          </div>

          {diagnosticMessage && (
            <div className="diagnostic-message" role="status">
              {diagnosticMessage}
            </div>
          )}
          <div className="setting-hint">
            诊断记录仅保存在当前浏览器会话，API Key、原文、译文和图片会自动脱敏。
          </div>
        </div>

        <div className="settings-section">
          <h2>数据备份</h2>

          <div className="setting-hint">
            将翻译历史、生词本、侧边栏会话与用户设置聚合导出为一个 JSON
            文件，换机或重装扩展时可一键恢复。备份不包含 API Key。
          </div>

          <div className="diagnostic-actions">
            <button
              type="button"
              className="diagnostic-btn secondary"
              onClick={handleExportBackup}
              disabled={backupBusy}
            >
              <Download theme="outline" size="18" />
              导出备份
            </button>
            <button
              type="button"
              className="diagnostic-btn secondary"
              onClick={() => backupFileInputRef.current?.click()}
              disabled={backupBusy}
            >
              <Upload theme="outline" size="18" />
              导入备份
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
            <div className={`backup-message ${backupFeedback.type}`} role="status">
              {backupFeedback.text}
            </div>
          )}
          <div className="setting-hint">
            导入备份会覆盖当前的全部历史、生词本、会话与设置（API Key
            不会被覆盖）；恢复后已打开的页面可能需要刷新才会生效。
          </div>
        </div>

        <div className="settings-section">
          <h2>快捷键设置</h2>

          <div className="setting-item">
            <label>当前快捷键</label>
            <div className="shortcut-display">{shortcut || "未设置"}</div>
            <button className="shortcut-btn" onClick={openShortcutSettings}>
              修改快捷键
            </button>
            <div className="setting-hint">
              点击按钮打开Chrome扩展快捷键设置页面
            </div>
          </div>
        </div>
      </div>

      <div className="options-footer">
        <div className="button-group">
          <button className="reset-btn" onClick={handleReset}>
            重置默认
          </button>

          <button
            className={`save-btn ${saveStatus}`}
            onClick={handleSave}
            disabled={saveStatus === "saving"}
          >
            {saveStatus === "saving" && "保存中..."}
            {saveStatus === "saved" && "已保存"}
            {saveStatus === "error" && "保存失败"}
            {saveStatus === "idle" && "保存设置"}
          </button>
        </div>

        {saveStatus === "saved" && (
          <div className="save-success">设置已保存成功！</div>
        )}

        {saveStatus === "error" && (
          <div className="save-error">保存失败，请重试</div>
        )}
      </div>
    </div>
  );
}

export default Options;
