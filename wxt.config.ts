import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "人话翻译器",
    description: "借助 AI 的力量将专业术语翻译成通俗易懂的人话",
    permissions: ["contextMenus", "storage", "activeTab"],
    commands: {
      "translate-selection": {
        suggested_key: {
          default: "Alt+H",
        },
        description: "翻译选中的文本",
      },
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["content-scripts/content.js"],
      },
    ],
    action: {
      default_popup: "entrypoints/popup/index.html",
      default_title: "人话翻译器"
    }
  },
});
