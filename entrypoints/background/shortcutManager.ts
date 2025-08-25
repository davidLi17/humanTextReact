/**
 * 快捷键管理器
 * 负责处理快捷键相关的功能
 */
export class ShortcutManager {
  /**
   * 保存当前快捷键到存储
   */
  static async saveCurrentShortcut() {
    try {
      const commands = await browser.commands.getAll();
      const translateCommand = commands.find(
        (command: any) => command.name === "translate-selection"
      );
      const shortcut =
        translateCommand && translateCommand.shortcut
          ? translateCommand.shortcut
          : "";

      // 保存到本地存储
      browser.storage.local.set({ saved_shortcut: shortcut }, () => {
        console.log("快捷键已保存:", shortcut);
      });
    } catch (error) {
      console.error("保存快捷键信息失败:", error);
    }
  }

  /**
   * 快捷键翻译功能执行函数
   */
  static async executeTranslation() {
    try {
      console.log("快捷键翻译被触发");
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tab = tabs[0];

      if (tab?.id) {
        console.log("向content script发送获取选中文本的消息");
        // 向content script发送获取选中文本的消息
        await browser.tabs.sendMessage(tab.id, { action: "getSelectedText" });
      }
    } catch (error) {
      console.error("执行快捷键翻译失败:", error);
    }
  }
}
