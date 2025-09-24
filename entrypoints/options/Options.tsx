import {
  DEFAULT_SETTINGS,
  LOG_LEVELS,
  LogLevel,
  THEME_MODES,
  ThemeMode,
} from "@/entrypoints/shared/constants";
import { initializeLogger, optionsLogger } from "@/entrypoints/shared/logger";
import { SettingsUtils } from "@/entrypoints/shared/settingsUtils";
import { PreviewClose, PreviewCloseOne } from "@icon-park/react";
import { useEffect, useState } from "react";
import { API_HINTS, API_PLATFORM_HINTS, MODEL_HINTS } from "./config";
import "./Options.less";

interface Settings {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  promptTemplate: string;
  thinkingEnabled: boolean;
  logLevel: LogLevel;
  theme: ThemeMode;
}

function Options() {
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

  // 加载设置
  useEffect(() => {
    // 初始化日志系统
    initializeLogger();
    optionsLogger.info("设置页面加载");

    loadSettings();
    loadShortcut();

    // 显示当前日志级别状态
    showCurrentLogLevelStatus();
  }, []);

  // 根据设置应用主题（支持系统跟随）
  useEffect(() => {
    const cleanup = applyTheme(settings.theme);
    return cleanup;
  }, [settings.theme]);

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
    // 使用 console.log 确保能看到日志
    console.log("[Options] 开始保存设置:", settings);

    try {
      // 使用 SettingsUtils 统一保存
      await SettingsUtils.setSettings(settings as any);

      // 重新初始化日志系统以应用新的日志级别
      console.log("[Options] 设置保存成功，重新初始化日志系统");
      await initializeLogger();

      // 测试新设置的日志级别
      await testLogLevel(settings.logLevel);

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("[Options] 保存设置失败:", error);
      optionsLogger.error("保存设置失败:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  };

  // 测试日志级别设置
  const testLogLevel = async (logLevel: LogLevel) => {
    console.log(`[Options] 测试日志级别: ${logLevel}`);

    // 测试不同级别的日志
    optionsLogger.trace("这是一条 trace 日志");
    optionsLogger.log("这是一条 log 日志");
    optionsLogger.info("这是一条 info 日志");
    optionsLogger.warn("这是一条 warn 日志");
    optionsLogger.error("这是一条 error 日志");
    optionsLogger.success("这是一条 success 日志");

    console.log(`[Options] 日志级别测试完成，当前级别: ${logLevel}`);
  };

  // 显示当前日志级别状态
  const showCurrentLogLevelStatus = async () => {
    try {
      const s = await SettingsUtils.getSettings();
      console.log(`[Options] 当前日志级别: ${s.logLevel}`);

      // 检查 localStorage 中的 debug 设置
      if (typeof localStorage !== "undefined") {
        const debugSetting = localStorage.getItem("debug");
        console.log(`[Options] localStorage debug 设置: ${debugSetting}`);
      }
    } catch (error) {
      console.error("[Options] 获取日志级别状态失败:", error);
    }
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
        setTestMessage("✅ API连接测试成功！");
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
    }
  };

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
              placeholder="请输入提示词模板，使用 {text} 作为占位符"
              rows={4}
            />
            <div className="setting-hint">
              使用 {"{text}"} 作为待翻译文本的占位符
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
