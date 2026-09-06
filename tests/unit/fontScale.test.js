import { describe, expect, test } from "bun:test";
import {
  DEFAULT_FONT_SCALE_PERCENT,
  FONT_SCALE_MAX_PERCENT,
  FONT_SCALE_MIN_PERCENT,
  FontScaleController,
  applyFontScale,
  getFontScaleShortcutAction,
  getNextFontScalePercent,
  handleScopedFontScaleShortcut,
  isFontScaleEventInside,
  normalizeFontScalePercent,
} from "../../entrypoints/shared/fontScale.ts";

describe("扩展字体缩放纯函数", () => {
  test("旧设置缺失或非法时恢复 100%，合法值吸附到 10% 档位并限制在 80%-160%", () => {
    expect(normalizeFontScalePercent(undefined)).toBe(DEFAULT_FONT_SCALE_PERCENT);
    expect(normalizeFontScalePercent("bad")).toBe(DEFAULT_FONT_SCALE_PERCENT);
    expect(normalizeFontScalePercent(79)).toBe(FONT_SCALE_MIN_PERCENT);
    expect(normalizeFontScalePercent(164)).toBe(FONT_SCALE_MAX_PERCENT);
    expect(normalizeFontScalePercent(134)).toBe(130);
    expect(normalizeFontScalePercent("136")).toBe(140);
  });

  test("步进不会越界，重置恒为 100%", () => {
    expect(getNextFontScalePercent(80, "decrease")).toBe(80);
    expect(getNextFontScalePercent(160, "increase")).toBe(160);
    expect(getNextFontScalePercent(120, "increase")).toBe(130);
    expect(getNextFontScalePercent(120, "decrease")).toBe(110);
    expect(getNextFontScalePercent(160, "reset")).toBe(100);
  });

  test("识别 Command/Ctrl 加减和 0，排除 Alt、合成输入与普通按键", () => {
    expect(getFontScaleShortcutAction({ metaKey: true, code: "Equal", key: "+" })).toBe("increase");
    expect(getFontScaleShortcutAction({ ctrlKey: true, code: "NumpadAdd" })).toBe("increase");
    expect(getFontScaleShortcutAction({ ctrlKey: true, code: "Minus" })).toBe("decrease");
    expect(getFontScaleShortcutAction({ metaKey: true, code: "NumpadSubtract" })).toBe("decrease");
    expect(getFontScaleShortcutAction({ ctrlKey: true, code: "Digit0" })).toBe("reset");
    expect(getFontScaleShortcutAction({ ctrlKey: true, altKey: true, code: "Equal" })).toBeNull();
    expect(getFontScaleShortcutAction({ ctrlKey: true, isComposing: true, code: "Equal" })).toBeNull();
    expect(getFontScaleShortcutAction({ code: "Equal" })).toBeNull();
  });

  test("网页内事件必须来自扩展容器 composedPath，普通网页目标不命中", () => {
    const root = { contains: (target) => target === child };
    const child = {};
    const pageBody = {};
    expect(
      isFontScaleEventInside(
        { target: child, composedPath: () => [child, root] },
        root
      )
    ).toBe(true);
    expect(
      isFontScaleEventInside(
        { target: pageBody, composedPath: () => [pageBody] },
        root
      )
    ).toBe(false);
  });

  test("网页普通 body 不拦截也不保存，浮窗路径内才阻止原生缩放并执行", () => {
    const root = { contains: (target) => target === child };
    const child = {};
    const pageBody = {};
    const performed = [];
    let prevented = 0;
    const makeEvent = (target, path) => ({
      ctrlKey: true,
      code: "Equal",
      target,
      composedPath: () => path,
      preventDefault: () => {
        prevented += 1;
      },
    });

    expect(
      handleScopedFontScaleShortcut(
        makeEvent(pageBody, [pageBody]),
        root,
        (action) => performed.push(action)
      )
    ).toBe(false);
    expect(prevented).toBe(0);
    expect(performed).toEqual([]);

    expect(
      handleScopedFontScaleShortcut(
        makeEvent(child, [child, root]),
        root,
        (action) => performed.push(action)
      )
    ).toBe(true);
    expect(prevented).toBe(1);
    expect(performed).toEqual(["increase"]);
  });

  test("只在目标扩展根节点写 CSS 变量", () => {
    const writes = [];
    const target = {
      style: { setProperty: (...args) => writes.push(args) },
    };
    expect(applyFontScale(target, 130)).toBe(130);
    expect(writes).toEqual([["--ht-font-scale", "1.3"]]);
  });
});

describe("字体缩放持久化控制器", () => {
  test("快速连按同步累加且保存严格按旧到新顺序执行", async () => {
    const applied = [];
    const persisted = [];
    let releaseFirst;
    const firstPending = new Promise((resolve) => {
      releaseFirst = resolve;
    });
    const controller = new FontScaleController({
      apply: (value) => applied.push(value),
      persist: async (value) => {
        persisted.push(value);
        if (value === 110) await firstPending;
      },
    });

    controller.perform("increase");
    controller.perform("increase");
    controller.perform("increase");
    expect(controller.getValue()).toBe(130);
    await Promise.resolve();
    expect(persisted).toEqual([110]);
    releaseFirst();
    await controller.flush();

    expect(applied).toEqual([100, 110, 120, 130]);
    expect(persisted).toEqual([110, 120, 130]);
  });

  test("晚到初始化和写入期间的旧同步值不会覆盖本地最新档位", async () => {
    let release;
    const pending = new Promise((resolve) => {
      release = resolve;
    });
    const controller = new FontScaleController({
      apply: () => {},
      persist: () => pending,
    });
    controller.perform("increase");
    expect(controller.hydrate(80)).toBe(110);
    expect(controller.syncExternal(90)).toBe(110);
    release();
    await controller.flush();
    expect(controller.syncExternal(140)).toBe(140);
  });
});
