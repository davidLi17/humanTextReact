import { afterEach, describe, expect, test } from "bun:test";
import { PopupManager } from "../../entrypoints/content/popupManager.ts";
import { SelectionActionBar } from "../../entrypoints/content/selectionActionBar.ts";
import {
  preserveGlobals,
  setTestGlobal,
} from "../helpers/testEnvironment.js";

const restoreGlobals = preserveGlobals("browser", "document", "window");

afterEach(() => {
  restoreGlobals();
});

function createDomEnvironment() {
  let mediaAdds = 0;
  let mediaRemoves = 0;
  let resolveTwoMediaAdds;
  const twoMediaAdds = new Promise((resolve) => {
    resolveTwoMediaAdds = resolve;
  });
  const media = {
    matches: false,
    addEventListener: () => {
      mediaAdds += 1;
      if (mediaAdds === 2) resolveTwoMediaAdds();
    },
    removeEventListener: () => {
      mediaRemoves += 1;
    },
  };
  const doc = {
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  const win = {
    addEventListener: () => {},
    removeEventListener: () => {},
    getSelection: () => null,
    matchMedia: () => media,
  };
  setTestGlobal("document", doc);
  setTestGlobal("window", win);
  return {
    doc,
    win,
    getMediaCounts: () => ({ mediaAdds, mediaRemoves }),
    twoMediaAdds,
  };
}

function createBrowserWithSettings(getSync, getLocal = async () => ({})) {
  const listeners = [];
  const browser = {
    storage: {
      sync: { get: getSync },
      local: { get: getLocal },
      onChanged: {
        addListener: (listener) => listeners.push(listener),
        removeListener: (listener) => {
          const index = listeners.indexOf(listener);
          if (index >= 0) listeners.splice(index, 1);
        },
      },
    },
  };
  setTestGlobal("browser", browser);
  return {
    listeners,
    emitSettingsChange: () =>
      [...listeners].forEach((listener) =>
        listener({ settings: { newValue: { theme: "system" } } })
      ),
  };
}

describe("Content 字体设置生命周期", () => {
  test("初始化读取完成前销毁两个对象，不会迟到注册系统主题监听", async () => {
    const dom = createDomEnvironment();
    let resolveSettings;
    const pendingSettings = new Promise((resolve) => {
      resolveSettings = resolve;
    });
    createBrowserWithSettings(() => pendingSettings);

    const popup = new PopupManager();
    const bar = new SelectionActionBar();
    bar.init(dom.doc, dom.win);
    popup.destroy();
    popup.destroy();
    bar.destroy();
    bar.destroy();

    resolveSettings({ settings: { theme: "system", fontScalePercent: 130 } });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(dom.getMediaCounts()).toEqual({ mediaAdds: 0, mediaRemoves: 0 });
  });

  test("设置变化读取开始后销毁，不会重新挂载已清理的主题监听", async () => {
    const dom = createDomEnvironment();
    let syncReadCount = 0;
    let resolveChangedSettings;
    const changedSettings = new Promise((resolve) => {
      resolveChangedSettings = resolve;
    });
    let localReadCount = 0;
    let resolveChangedLocalReads;
    const changedLocalReads = new Promise((resolve) => {
      resolveChangedLocalReads = resolve;
    });
    const browserState = createBrowserWithSettings(
      () => {
        syncReadCount += 1;
        return syncReadCount <= 2
          ? Promise.resolve({
              settings: { theme: "system", fontScalePercent: 100 },
            })
          : changedSettings;
      },
      async () => {
        localReadCount += 1;
        if (localReadCount === 4) resolveChangedLocalReads();
        return { fontScalePercent: 100 };
      }
    );

    const popup = new PopupManager();
    const bar = new SelectionActionBar();
    bar.init(dom.doc, dom.win);
    await dom.twoMediaAdds;
    expect(dom.getMediaCounts().mediaAdds).toBe(2);

    browserState.emitSettingsChange();
    popup.destroy();
    bar.destroy();
    expect(dom.getMediaCounts().mediaRemoves).toBe(2);

    resolveChangedSettings({
      settings: { theme: "system", fontScalePercent: 140 },
    });
    await changedLocalReads;
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(dom.getMediaCounts()).toEqual({ mediaAdds: 2, mediaRemoves: 2 });
  });
});
