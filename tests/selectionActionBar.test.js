import { describe, expect, test } from "bun:test";
import {
  calculateActionBarPosition,
  isValidSelectionText,
  isEditableElement,
  isInsideTranslatorElement,
  isSelectionInsideExcludedElement,
  SelectionActionBar,
  DEFAULT_BAR_DIMENSIONS,
} from "../entrypoints/content/selectionActionBar.ts";

// 构造简易 Mock DOM 节点
function createMockElement(tagName = "div", attributes = {}, className = "") {
  const children = [];
  const attrs = new Map(Object.entries(attributes));
  const classes = new Set(className ? className.split(/\s+/) : []);
  const eventListeners = new Map();

  const el = {
    tagName: tagName.toUpperCase(),
    nodeType: 1,
    parentElement: null,
    parentNode: null,
    isContentEditable: false,
    style: {},
    className: className,
    classList: {
      contains: (c) => classes.has(c),
      add: (c) => {
        classes.add(c);
        el.className = Array.from(classes).join(" ");
      },
      remove: (c) => {
        classes.delete(c);
        el.className = Array.from(classes).join(" ");
      },
    },
    getAttribute: (key) => attrs.get(key) || null,
    setAttribute: (key, val) => {
      attrs.set(key, String(val));
    },
    hasAttribute: (key) => attrs.has(key),
    removeAttribute: (key) => {
      attrs.delete(key);
    },
    appendChild: (child) => {
      child.parentElement = el;
      child.parentNode = el;
      children.push(child);
      return child;
    },
    remove: () => {
      if (el.parentElement) {
        const idx = el.parentElement.children?.indexOf(el);
        if (idx !== undefined && idx >= 0) {
          el.parentElement.children.splice(idx, 1);
        }
      }
    },
    contains: (target) => {
      let cur = target;
      while (cur) {
        if (cur === el) return true;
        cur = cur.parentElement || cur.parentNode;
      }
      return false;
    },
    querySelector: (selector) => {
      // 简单选择器支持
      const match = (node) => {
        if (!node || node.nodeType !== 1) return null;
        if (selector.startsWith(".")) {
          const cls = selector.slice(1);
          if (node.classList?.contains(cls)) return node;
        } else if (selector.startsWith("[") && selector.endsWith("]")) {
          const attr = selector.slice(1, -1).split("=")[0];
          if (node.hasAttribute?.(attr)) return node;
        } else if (node.tagName?.toLowerCase() === selector.toLowerCase()) {
          return node;
        }
        for (const ch of node.children || []) {
          const res = match(ch);
          if (res) return res;
        }
        return null;
      };
      return match(el);
    },
    querySelectorAll: (selector) => {
      const results = [];
      const traverse = (node) => {
        if (!node || node.nodeType !== 1) return;
        if (selector.startsWith(".")) {
          const cls = selector.slice(1);
          if (node.classList?.contains(cls)) results.push(node);
        } else if (selector.startsWith("[") && selector.endsWith("]")) {
          const attr = selector.slice(1, -1).split("=")[0];
          if (node.hasAttribute?.(attr)) results.push(node);
        }
        for (const ch of node.children || []) {
          traverse(ch);
        }
      };
      for (const ch of children) traverse(ch);
      return results;
    },
    children,
    addEventListener: (type, handler) => {
      if (!eventListeners.has(type)) eventListeners.set(type, []);
      eventListeners.get(type).push(handler);
    },
    removeEventListener: (type, handler) => {
      const list = eventListeners.get(type) || [];
      const idx = list.indexOf(handler);
      if (idx >= 0) list.splice(idx, 1);
    },
    dispatchEvent: (event) => {
      const list = eventListeners.get(event.type) || [];
      for (const handler of list) {
        handler(event);
      }
      return true;
    },
    set innerHTML(html) {
      // 简易解析测试所需结构
      children.length = 0;
      if (html.includes("translator-action-btn-popup")) {
        const popupBtn = createMockElement(
          "button",
          { title: "在悬浮窗中人话翻译", "aria-label": "浮窗翻译" },
          "translator-action-btn translator-action-btn-popup"
        );
        el.appendChild(popupBtn);
      }
      if (html.includes("translator-action-divider")) {
        const divider = createMockElement(
          "div",
          { "aria-hidden": "true" },
          "translator-action-divider"
        );
        el.appendChild(divider);
      }
      if (html.includes("translator-action-btn-sidepanel")) {
        const sidepanelBtn = createMockElement(
          "button",
          { title: "在侧边栏中继续人话追问", "aria-label": "侧边栏人话" },
          "translator-action-btn translator-action-btn-sidepanel"
        );
        el.appendChild(sidepanelBtn);
      }
    },
  };
  return el;
}

function createMockTextNode(text) {
  return {
    nodeType: 3,
    textContent: text,
    parentElement: null,
    parentNode: null,
  };
}

function createMockDocument() {
  const body = createMockElement("body");
  const doc = {
    body,
    createElement: (tag) => createMockElement(tag),
    createTextNode: (text) => createMockTextNode(text),
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  return doc;
}

function createMockWindow(width = 1024, height = 768) {
  return {
    innerWidth: width,
    innerHeight: height,
    addEventListener: () => {},
    removeEventListener: () => {},
    getSelection: () => null,
  };
}

describe("Selection Action Bar - Position Calculations", () => {
  const defaultViewport = { width: 1024, height: 768 };
  const barDimensions = { width: 190, height: 34 };

  test("positions above selection centered horizontally when there is enough space", () => {
    const selectionRect = {
      top: 200,
      bottom: 220,
      left: 400,
      right: 500,
      width: 100,
      height: 20,
    };

    const result = calculateActionBarPosition({
      selectionRect,
      barDimensions,
      viewport: defaultViewport,
      offset: 8,
      edgePadding: 8,
    });

    expect(result.placement).toBe("top");
    // top = 200 - 34 - 8 = 158
    expect(result.top).toBe(158);
    // centerLeft = 400 + (100 - 190) / 2 = 400 - 45 = 355
    expect(result.left).toBe(355);
  });

  test("flips below selection when near top of viewport", () => {
    const selectionRect = {
      top: 20,
      bottom: 40,
      left: 300,
      right: 400,
      width: 100,
      height: 20,
    };

    const result = calculateActionBarPosition({
      selectionRect,
      barDimensions,
      viewport: defaultViewport,
      offset: 8,
      edgePadding: 8,
    });

    // topAbove would be 20 - 34 - 8 = -22 < 8 (edgePadding)
    // topBelow = 40 + 8 = 48
    expect(result.placement).toBe("bottom");
    expect(result.top).toBe(48);
    expect(result.left).toBe(255);
  });

  test("clamps left coordinate when selection is near the left edge", () => {
    const selectionRect = {
      top: 150,
      bottom: 170,
      left: 10,
      right: 60,
      width: 50,
      height: 20,
    };

    const result = calculateActionBarPosition({
      selectionRect,
      barDimensions,
      viewport: defaultViewport,
      edgePadding: 8,
    });

    // centerLeft would be 10 + (50 - 190) / 2 = -60 < 8
    expect(result.left).toBe(8);
    expect(result.top).toBe(150 - 34 - 8);
  });

  test("clamps right coordinate when selection is near the right edge", () => {
    const selectionRect = {
      top: 150,
      bottom: 170,
      left: 950,
      right: 1010,
      width: 60,
      height: 20,
    };

    const result = calculateActionBarPosition({
      selectionRect,
      barDimensions,
      viewport: defaultViewport,
      edgePadding: 8,
    });

    // maxLeft = 1024 - 190 - 8 = 826
    expect(result.left).toBe(826);
  });

  test("adds scroll offset when scrollX and scrollY are passed", () => {
    const selectionRect = {
      top: 300,
      bottom: 320,
      left: 400,
      right: 500,
      width: 100,
      height: 20,
    };

    const result = calculateActionBarPosition({
      selectionRect,
      barDimensions,
      viewport: defaultViewport,
      scrollX: 100,
      scrollY: 250,
    });

    expect(result.placement).toBe("top");
    expect(result.top).toBe(300 - 34 - 8 + 250);
    expect(result.left).toBe(355 + 100);
  });
});

describe("Selection Action Bar - Text Validity Validation", () => {
  test("returns true for valid text selections", () => {
    expect(isValidSelectionText("hello")).toBe(true);
    expect(isValidSelectionText("行业黑话对齐颗粒度")).toBe(true);
    expect(isValidSelectionText("  leading and trailing whitespace  ")).toBe(true);
    expect(isValidSelectionText("Special characters: !@#$%^&*()")).toBe(true);
  });

  test("returns false for empty or whitespace-only inputs", () => {
    expect(isValidSelectionText("")).toBe(false);
    expect(isValidSelectionText("   ")).toBe(false);
    expect(isValidSelectionText("\n\t  \r")).toBe(false);
    expect(isValidSelectionText(null)).toBe(false);
    expect(isValidSelectionText(undefined)).toBe(false);
    expect(isValidSelectionText(123)).toBe(false);
  });
});

describe("Selection Action Bar - Editable and Exclusion Element Detection", () => {
  test("identifies input, textarea and select elements as editable", () => {
    const input = createMockElement("input");
    const textarea = createMockElement("textarea");
    const select = createMockElement("select");
    const div = createMockElement("div");

    expect(isEditableElement(input)).toBe(true);
    expect(isEditableElement(textarea)).toBe(true);
    expect(isEditableElement(select)).toBe(true);
    expect(isEditableElement(div)).toBe(false);
  });

  test("identifies contenteditable elements and their descendants", () => {
    const editableDiv = createMockElement("div", { contenteditable: "true" });

    const innerSpan = createMockElement("span");
    const textNode = createMockTextNode("Editing here");
    innerSpan.appendChild(textNode);
    editableDiv.appendChild(innerSpan);

    expect(isEditableElement(editableDiv)).toBe(true);
    expect(isEditableElement(innerSpan)).toBe(true);
    expect(isEditableElement(textNode)).toBe(true);
  });

  test("identifies translator popup and action bar elements", () => {
    const popup = createMockElement("div", {}, "translator-popup");
    const popupChild = createMockElement("button");
    popup.appendChild(popupChild);

    const actionBar = createMockElement("div", {}, "translator-action-bar");
    const barChild = createMockElement("span");
    actionBar.appendChild(barChild);

    const taggedElement = createMockElement("div", {
      "data-translator-element": "true",
    });
    const taggedChild = createMockElement("p");
    taggedElement.appendChild(taggedChild);

    const regularDiv = createMockElement("div");

    expect(isInsideTranslatorElement(popup)).toBe(true);
    expect(isInsideTranslatorElement(popupChild)).toBe(true);
    expect(isInsideTranslatorElement(actionBar)).toBe(true);
    expect(isInsideTranslatorElement(barChild)).toBe(true);
    expect(isInsideTranslatorElement(taggedElement)).toBe(true);
    expect(isInsideTranslatorElement(taggedChild)).toBe(true);
    expect(isInsideTranslatorElement(regularDiv)).toBe(false);
  });

  test("isSelectionInsideExcludedElement checks selection ranges", () => {
    expect(isSelectionInsideExcludedElement(null)).toBe(true);

    const mockDoc = createMockDocument();

    const collapsedSelection = {
      rangeCount: 1,
      isCollapsed: true,
      getRangeAt: () => ({
        startContainer: mockDoc.body,
        endContainer: mockDoc.body,
        commonAncestorContainer: mockDoc.body,
      }),
    };
    expect(isSelectionInsideExcludedElement(collapsedSelection)).toBe(true);

    const input = createMockElement("input");
    const inputSelection = {
      rangeCount: 1,
      isCollapsed: false,
      getRangeAt: () => ({
        startContainer: input,
        endContainer: input,
        commonAncestorContainer: input,
      }),
    };
    expect(isSelectionInsideExcludedElement(inputSelection)).toBe(true);

    const normalParagraph = createMockElement("p");
    const textNode1 = createMockTextNode("Normal content");
    normalParagraph.appendChild(textNode1);
    const validSelection = {
      rangeCount: 1,
      isCollapsed: false,
      getRangeAt: () => ({
        startContainer: textNode1,
        endContainer: textNode1,
        commonAncestorContainer: normalParagraph,
      }),
    };
    expect(isSelectionInsideExcludedElement(validSelection)).toBe(false);
  });
});

describe("Selection Action Bar - Lifecycle and State Transitions", () => {
  test("initializes with hidden state and toggles visibility via show and hide", () => {
    const bar = new SelectionActionBar();
    expect(bar.getIsVisible()).toBe(false);
    expect(bar.getSelectedText()).toBe("");

    const mockDoc = createMockDocument();
    const mockWin = createMockWindow(1024, 768);

    const mockRect = {
      top: 300,
      bottom: 320,
      left: 200,
      right: 350,
      width: 150,
      height: 20,
    };

    bar.show("待翻译的黑话词汇", mockRect, mockWin, mockDoc);

    expect(bar.getIsVisible()).toBe(true);
    expect(bar.getSelectedText()).toBe("待翻译的黑话词汇");

    const container = bar.getContainer();
    expect(container).not.toBeNull();
    expect(container?.style.display).toBe("inline-flex");
    expect(container?.getAttribute("role")).toBe("toolbar");
    expect(container?.getAttribute("data-translator-element")).toBe("true");

    bar.hide();
    expect(bar.getIsVisible()).toBe(false);
    expect(bar.getSelectedText()).toBe("");
    expect(container?.style.display).toBe("none");

    bar.destroy();
    expect(bar.getContainer()).toBeNull();
  });

  test("triggers popup translation callback when clicking popup button", async () => {
    let popupCalledWith = "";
    const callbacks = {
      onTranslatePopup: (text) => {
        popupCalledWith = text;
      },
    };

    const bar = new SelectionActionBar(undefined, callbacks);
    const mockDoc = createMockDocument();
    const mockWin = createMockWindow(1024, 768);

    const mockRect = {
      top: 100,
      bottom: 120,
      left: 100,
      right: 200,
      width: 100,
      height: 20,
    };

    bar.show("业务赋能打法", mockRect, mockWin, mockDoc);
    const container = bar.getContainer();
    const popupBtn = container?.querySelector(".translator-action-btn-popup");

    expect(popupBtn).not.toBeNull();
    popupBtn?.dispatchEvent({
      type: "click",
      preventDefault: () => {},
      stopPropagation: () => {},
    });

    // Wait microtask
    await Promise.resolve();

    expect(popupCalledWith).toBe("业务赋能打法");
    expect(bar.getIsVisible()).toBe(false);

    bar.destroy();
  });

  test("triggers sidepanel callback when clicking sidepanel button", async () => {
    let sidepanelCalledWith = "";
    const callbacks = {
      onOpenSidepanel: (text) => {
        sidepanelCalledWith = text;
      },
    };

    const bar = new SelectionActionBar(undefined, callbacks);
    const mockDoc = createMockDocument();
    const mockWin = createMockWindow(1024, 768);

    const mockRect = {
      top: 100,
      bottom: 120,
      left: 100,
      right: 200,
      width: 100,
      height: 20,
    };

    bar.show("心智闭环沉淀", mockRect, mockWin, mockDoc);
    const container = bar.getContainer();
    const sidepanelBtn = container?.querySelector(".translator-action-btn-sidepanel");

    expect(sidepanelBtn).not.toBeNull();
    sidepanelBtn?.dispatchEvent({
      type: "click",
      preventDefault: () => {},
      stopPropagation: () => {},
    });

    // Wait microtask
    await Promise.resolve();

    expect(sidepanelCalledWith).toBe("心智闭环沉淀");
    expect(bar.getIsVisible()).toBe(false);

    bar.destroy();
  });
});
