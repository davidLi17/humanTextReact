import { createLogger } from "@/entrypoints/shared/logger";

const logger = createLogger("context-menu-manager", "🖱️");

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
          title: "翻译成人话 (浮窗)",
          contexts: ["selection"],
        });
        browser.contextMenus.create({
          id: "openSidepanelTranslate",
          title: "在侧边栏中人话对话",
          contexts: ["selection"],
        });
        browser.contextMenus.create({
          id: "openSidepanel",
          title: "打开人话侧边栏",
          contexts: ["page", "action"],
        });
      });
    } catch (error) {
      logger.error("创建右键菜单时出错:", error);

      // 出错时创建备用菜单
      browser.contextMenus.create({
        id: "translateSelection",
        title: "翻译成人话",
        contexts: ["selection"],
      });
    }
  }
}
