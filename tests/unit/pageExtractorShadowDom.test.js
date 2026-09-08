import { beforeEach, describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import {
  evaluateVirtualListState,
  extractComposedText,
  extractMainContent,
  extractPageData,
  findPrimaryScrollContainer,
} from "../../entrypoints/content/pageExtractor.ts";

GlobalRegistrator.register();

describe("Page Extractor Shadow DOM & Composed Tree Integration", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("1. 深度穿透基础 Open Shadow DOM 组件提取正文与标题", () => {
    const host = document.createElement("custom-article");
    const shadow = host.attachShadow({ mode: "open" });

    const h2 = document.createElement("h2");
    h2.textContent = "Shadow DOM 核心架构";
    shadow.appendChild(h2);

    const p = document.createElement("p");
    p.textContent = "这是封装在 Web Component 内部的核心正文段落。";
    shadow.appendChild(p);

    document.body.appendChild(host);

    const content = extractMainContent(document);
    expect(content).toContain("## Shadow DOM 核心架构");
    expect(content).toContain("这是封装在 Web Component 内部的核心正文段落。");
  });

  test("2. 支持多层嵌套 Shadow DOM (Outer Component -> Inner Component)", () => {
    const outer = document.createElement("outer-wrapper");
    const outerShadow = outer.attachShadow({ mode: "open" });

    const inner = document.createElement("inner-card");
    const innerShadow = inner.attachShadow({ mode: "open" });

    const p = document.createElement("p");
    p.textContent = "位于第二层嵌套 Shadow DOM 中的文本内容。";
    innerShadow.appendChild(p);

    outerShadow.appendChild(inner);
    document.body.appendChild(outer);

    const content = extractMainContent(document);
    expect(content).toContain("位于第二层嵌套 Shadow DOM 中的文本内容。");
  });

  test("3. 正确处理 Slot 内容分发与未分发节点的排他性隔离", () => {
    const host = document.createElement("slotted-layout");
    const shadow = host.attachShadow({ mode: "open" });

    const slot = document.createElement("slot");
    slot.name = "content";
    shadow.appendChild(slot);

    // 有效分发节点 (Light DOM)
    const slottedNode = document.createElement("p");
    slottedNode.slot = "content";
    slottedNode.textContent = "成功被 Slot 接收渲染的正文。";
    host.appendChild(slottedNode);

    // 未分发节点 (Light DOM，由于无匹配 slot，屏幕上不渲染)
    const unslottedNode = document.createElement("p");
    unslottedNode.textContent = "未被任何 slot 分发的游离孤立文本。";
    host.appendChild(unslottedNode);

    document.body.appendChild(host);

    const content = extractMainContent(document);
    expect(content).toContain("成功被 Slot 接收渲染的正文。");
    // 关键校验：未投射内容绝不被提取
    expect(content).not.toContain("未被任何 slot 分发的游离孤立文本。");
  });

  test("4. 当 Slot 无分发内容时，正确提取 Fallback 备用内容", () => {
    const host = document.createElement("fallback-layout");
    const shadow = host.attachShadow({ mode: "open" });

    const slot = document.createElement("slot");
    slot.name = "optional-section";

    const fallbackP = document.createElement("p");
    fallbackP.textContent = "Slot 内部默认注脚备用文字。";
    slot.appendChild(fallbackP);

    shadow.appendChild(slot);
    document.body.appendChild(host);

    const content = extractMainContent(document);
    expect(content).toContain("Slot 内部默认注脚备用文字。");
  });

  test("5. CSS 隔离与行内/属性隐藏节点过滤", () => {
    const host = document.createElement("styled-component");
    const shadow = host.attachShadow({ mode: "open" });

    const visibleP = document.createElement("p");
    visibleP.textContent = "真正可见的章节正文。";
    shadow.appendChild(visibleP);

    const hiddenP = document.createElement("p");
    hiddenP.hidden = true;
    hiddenP.textContent = "通过 hidden 属性隐藏的推广文案。";
    shadow.appendChild(hiddenP);

    const ariaHiddenP = document.createElement("p");
    ariaHiddenP.setAttribute("aria-hidden", "true");
    ariaHiddenP.textContent = "通过 aria-hidden 隐藏的辅助信息。";
    shadow.appendChild(ariaHiddenP);

    document.body.appendChild(host);

    const content = extractMainContent(document);
    expect(content).toContain("真正可见的章节正文。");
    expect(content).not.toContain("通过 hidden 属性隐藏的推广文案。");
    expect(content).not.toContain("通过 aria-hidden 隐藏的辅助信息。");
  });

  test("6. Shadow DOM 内部噪声节点 (.ad, nav, style) 干净过滤", () => {
    const host = document.createElement("noise-test-host");
    const shadow = host.attachShadow({ mode: "open" });

    const ad = document.createElement("div");
    ad.className = "ad";
    ad.textContent = "组件内部赞助商广告条目";
    shadow.appendChild(ad);

    const nav = document.createElement("nav");
    nav.textContent = "组件内部页内导航";
    shadow.appendChild(nav);

    const p = document.createElement("p");
    p.textContent = "有效核心内容文本。";
    shadow.appendChild(p);

    document.body.appendChild(host);

    const content = extractMainContent(document);
    expect(content).toContain("有效核心内容文本。");
    expect(content).not.toContain("组件内部赞助商广告条目");
    expect(content).not.toContain("组件内部页内导航");
  });

  test("7. 虚拟列表与长文档启发式检测 (evaluateVirtualListState)", () => {
    // 模拟一个总高 8000px，视口 800px（10 屏高），但当前只有 300 字符的虚拟滚动文档
    const fakeContainer = {
      scrollHeight: 8000,
      clientHeight: 800,
    };

    const state = evaluateVirtualListState(document, 300, fakeContainer);
    expect(state.totalScreens).toBe(10);
    expect(state.density).toBe(30);
    expect(state.isLikelyVirtualList).toBe(true);
    expect(state.hasMoreContent).toBe(true);

    // 正常短文：2 屏高，1200 字符
    const normalContainer = {
      scrollHeight: 1600,
      clientHeight: 800,
    };
    const normalState = evaluateVirtualListState(document, 1200, normalContainer);
    expect(normalState.totalScreens).toBe(2);
    expect(normalState.isLikelyVirtualList).toBe(false);
    expect(normalState.hasMoreContent).toBe(false);
  });

  test("8. extractPageData 端到端输出元数据与虚拟长文检测标志", async () => {
    const host = document.createElement("full-page-host");
    const shadow = host.attachShadow({ mode: "open" });

    const h1 = document.createElement("h1");
    h1.textContent = "Web Components 架构深度解析 - 少数派";
    document.body.appendChild(h1);

    const p = document.createElement("p");
    p.textContent =
      "人话翻译器扩展实现了原位组合扁平树（Composed Tree）遍历，全面打通 Web Components 与 Shadow DOM。";
    shadow.appendChild(p);

    document.body.appendChild(host);

    const pageData = await extractPageData(document, window);
    expect(pageData.title).toBe("Web Components 架构深度解析");
    expect(pageData.content).toContain(
      "人话翻译器扩展实现了原位组合扁平树（Composed Tree）遍历"
    );
    expect(pageData.wordCount).toBeGreaterThan(15);
    expect(pageData.excerpt).toContain("人话翻译器扩展实现了");
    expect(typeof pageData.isLikelyVirtualList).toBe("boolean");
  });
});
