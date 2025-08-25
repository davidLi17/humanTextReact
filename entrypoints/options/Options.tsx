import { useState, useEffect } from "react";
import "./Options.css";

interface Settings {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  promptTemplate: string;
}

function Options() {
  const [settings, setSettings] = useState<Settings>({
    apiKey: "",
    baseUrl: "https://api.deepseek.com/v1/chat/completions",
    model: "deepseek-reasoner",
    temperature: 0.7,
    promptTemplate: "用通俗易懂的中文解释以下内容：\n\n{text}",
  });

  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [shortcut, setShortcut] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  // 加载设置
  useEffect(() => {
    loadSettings();
    loadShortcut();
  }, []);

  const loadSettings = async () => {
    try {
      // 优先从云端获取
      let result = await browser.storage.sync.get([
        "apiKey",
        "baseUrl",
        "model",
        "temperature",
        "promptTemplate",
      ]);

      // 如果云端没有，从本地获取
      if (Object.keys(result).length === 0) {
        result = await browser.storage.local.get([
          "apiKey",
          "baseUrl",
          "model",
          "temperature",
          "promptTemplate",
        ]);
      }

      if (Object.keys(result).length > 0) {
        setSettings((prev) => ({ ...prev, ...result }));
      }
    } catch (error) {
      console.error("加载设置失败:", error);
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
      console.error("加载快捷键失败:", error);
    }
  };

  const handleSave = async () => {
    setSaveStatus("saving");

    try {
      // 同时保存到云端和本地
      await Promise.all([
        browser.storage.sync.set(settings),
        browser.storage.local.set(settings),
      ]);

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("保存设置失败:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  };

  const handleInputChange = (field: keyof Settings, value: string | number) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const openShortcutSettings = () => {
    browser.tabs.create({ url: "chrome://extensions/shortcuts" });
  };

  // 测试API密钥连接
  const testApiKey = async () => {
    setTestStatus("testing");
    setTestMessage("正在测试API连接...");

    try {
      // 发送测试请求到background script
      const response = await browser.runtime.sendMessage({
        action: "testApiConnection",
        apiKey: settings.apiKey,
        baseUrl: settings.baseUrl || "https://api.deepseek.com/v1/chat/completions",
        model: settings.model || "deepseek-reasoner"
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
  };

  const handleReset = () => {
    if (confirm("确定要重置所有设置为默认值吗？")) {
      setSettings({
        apiKey: "",
        baseUrl: "https://api.deepseek.com/v1/chat/completions",
        model: "deepseek-reasoner",
        temperature: 0.7,
        promptTemplate: "用通俗易懂的中文解释以下内容：\n\n{text}",
      });
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
                type="password"
                id="apiKey"
                value={settings.apiKey}
                onChange={(e) => handleInputChange("apiKey", e.target.value)}
                placeholder="请输入你的 API Key"
              />
              <button
                className="test-api-btn"
                onClick={testApiKey}
                disabled={!settings.apiKey.trim()}
              >
                测试连接
              </button>
            </div>
            <div className="setting-hint">
              获取API Key:{" "}
              <a
                href="https://platform.deepseek.com/api_keys"
                target="_blank"
                rel="noopener noreferrer"
              >
                DeepSeek平台
              </a>
            </div>
            {testStatus !== "idle" && (
              <div className={`test-status ${testStatus}`}>
                {testMessage}
              </div>
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
              <span className="api-hint" onClick={() => handleInputChange("baseUrl", "https://api.deepseek.com/v1/chat/completions")}>
DeepSeek</span>, 
              <span className="api-hint" onClick={() => handleInputChange("baseUrl", "https://api.openai.com/v1/chat/completions")}>
OpenAI</span>, 
              <span className="api-hint" onClick={() => handleInputChange("baseUrl", "")}>
自定义地址</span>
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
              <span className="model-hint" onClick={() => handleInputChange("model", "deepseek-reasoner")}>
deepseek-reasoner</span>, 
              <span className="model-hint" onClick={() => handleInputChange("model", "deepseek-chat")}>
deepseek-chat</span>
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
