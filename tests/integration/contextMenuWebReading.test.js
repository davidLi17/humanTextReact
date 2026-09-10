import { afterEach, describe, expect, test } from "bun:test";
import { ContextMenuHandler } from "../../entrypoints/background/contextMenuHandler.ts";
import { MESSAGE_TYPES } from "../../entrypoints/shared/constants/index.ts";
import {
  preserveGlobals,
  setTestGlobal,
} from "../helpers/testEnvironment.js";

const restoreGlobals = preserveGlobals("browser", "chrome");

describe("右键菜单「通读当前网页」的通知通道", () => {
  afterEach(() => {
    restoreGlobals();
  });

  test("发出的 action 必须与侧边栏监听的常量一致", async () => {
    const runtimeMessages = [];
    const localWrites = [];
    let sidePanelOpened = null;

    setTestGlobal("browser", {
      sidePanel: {
        open: async (options) => {
          sidePanelOpened = options;
        },
      },
      storage: {
        local: {
          set: async (items) => {
            localWrites.push(structuredClone(items));
          },
        },
      },
      runtime: {
        sendMessage: async (message) => {
          runtimeMessages.push(structuredClone(message));
        },
      },
    });

    await ContextMenuHandler.handleContextMenuClick(
      { menuItemId: "readPageInSidepanel" },
      { id: 7, windowId: 3 }
    );

    // 侧边栏被打开，且落了待办键（侧边栏冷启动时靠它补偿触发）
    expect(sidePanelOpened).toEqual({ windowId: 3 });
    expect(localWrites).toHaveLength(1);
    expect(localWrites[0].pendingWebPageRead.tabId).toBe(7);

    // 核心断言：侧边栏已打开时，唯一能触达它的就是这条 runtime 消息。
    // 历史 bug：这里曾写成字面量 "readCurrentWebPage"，而侧边栏比对的是
    // MESSAGE_TYPES.READ_WEB_PAGE（"readWebPage"），消息被静默丢弃，
    // 表现为「侧边栏已打开时右键通读毫无反应」。
    expect(runtimeMessages).toHaveLength(1);
    expect(runtimeMessages[0].action).toBe(MESSAGE_TYPES.READ_WEB_PAGE);
    expect(runtimeMessages[0].action).toBe("readWebPage");
    expect(runtimeMessages[0].tabId).toBe(7);
  });
});
