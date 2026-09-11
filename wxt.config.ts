import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "人话翻译器",
    version: "1.5.3",
    description: "借助 AI 的力量将专业术语翻译成通俗易懂的人话",
    minimum_chrome_version: "141",
    permissions: [
      "contextMenus",
      "storage",
      "activeTab",
      "tabs",
      "sidePanel",
    ],
    commands: {
      "translate-selection": {
        suggested_key: {
          default: "Alt+D",
          mac: "Option+D",
          windows: "Alt+D",
          linux: "Alt+D",
          chromeos: "Alt+D",
        },
        description: "翻译选中的文本",
      },
      "open-sidepanel": {
        suggested_key: {
          default: "Alt+S",
          mac: "Option+S",
          windows: "Alt+S",
          linux: "Alt+S",
          chromeos: "Alt+S",
        },
        description: "显示或隐藏人话翻译侧边栏",
      },
    },
    action: {
      default_popup: "entrypoints/popup/index.html",
      default_title: "人话翻译器",
    },
    options_page: "options.html",
    side_panel: {
      default_path: "entrypoints/sidepanel/index.html",
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
    },
  },
  hooks: {
    "build:manifestGenerated": (_wxt, manifest) => {
      // 彻底移除 options_ui 嵌入弹窗模式，强制让 Chrome 在全屏完整浏览器标签页中打开设置
      delete (manifest as any).options_ui;
      (manifest as any).options_page = "options.html";
    },
  },
});
