/**
 * 右键菜单管理器
 * 负责创建和管理右键菜单
 */
export class ContextMenuManager {
  /**
   * 创建右键菜单
   */
  static createContextMenu() {
    try {
      // 先移除现有菜单
      browser.contextMenus.removeAll(() => {
        browser.contextMenus.create({
          id: "translateSelection",
          title: "翻译成人话",
          contexts: ["selection"],
        });
      });
    } catch (error) {
      console.error("创建右键菜单时出错:", error);

      // 出错时创建不带快捷键的菜单作为备用
      browser.contextMenus.create({
        id: "translateSelection",
        title: "翻译成人话",
        contexts: ["selection"],
      });
    }
  }
}
