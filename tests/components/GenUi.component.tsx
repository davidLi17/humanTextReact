import React from "react";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import GenUiMessageCard from "../../entrypoints/sidepanel/genui/GenUiMessageCard";
import type { GenUiAttachment } from "../../entrypoints/shared/genui/types";

function attachment(id = "artifact-a"): GenUiAttachment {
  return { id, protocolVersion: 1, catalogVersion: "explanation-v1", revision: 1, sourceMessageIds: ["source"], contextFingerprint: "ctx-a", spec: {
    root: "card", elements: {
      card: { type: "Card", props: { title: "教学示例" }, children: ["tree", "tabs", "steps", "table", "text"] },
      tree: { type: "TreeInspector", props: { nodes: [{ id: "src", label: "src", parentId: null }, { id: "child", label: "Button.tsx", parentId: "src", description: "一个按钮组件" }] }, children: [] },
      tabs: { type: "ConceptTabs", props: { tabs: [{ id: "a", label: "概念 A", content: "解释 A" }, { id: "b", label: "概念 B", content: "解释 B" }] }, children: [] },
      steps: { type: "StepViewer", props: { steps: [{ id: "one", title: "第一步", description: "先读问题" }, { id: "two", title: "第二步", description: "再看答案" }] }, children: [] },
      table: { type: "CompareTable", props: { columns: [{ id: "name", label: "名称" }], rows: [{ id: "b", cells: { name: "Banana" } }, { id: "a", cells: { name: "Apple" } }] }, children: [] },
      text: { type: "Text", props: { text: '<img src=x onerror="alert(1)">此文字不会被当作 HTML' }, children: [] },
    },
  } };
}
const props = { content: "这是文字回退", sourceLabels: ["原文 · 第 1 段"], onFollowUp() {} };
afterEach(cleanup);
describe("GenUI local registry", () => {
  test("all controls render, work locally, and persist only bounded navigation state", () => {
    const changes: unknown[] = [];
    const { container } = render(<GenUiMessageCard {...props} attachment={attachment()} onStateChange={(state) => changes.push(state)} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Button.tsx" })[0]);
    expect(screen.getByText("一个按钮组件")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "概念 B" }));
    expect(screen.getByRole("tabpanel").textContent).toBe("解释 B");
    fireEvent.click(screen.getByRole("button", { name: "下一步" }));
    expect(screen.getByText("第二步")).toBeTruthy();
    expect(changes.at(-1)).toEqual({ tree: { selectedNodeId: "child" }, tabs: { activeTabId: "b" }, steps: { step: 1 } });
    fireEvent.click(screen.getByRole("button", { name: "名称 ↕" }));
    expect(screen.getAllByRole("cell")[0].textContent).toBe("Apple");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Ban" } });
    expect(screen.getAllByRole("cell")).toHaveLength(1);
    expect(screen.getByText("显示 1 / 2 行")).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "文字版本" }));
    expect(screen.getByText("这是文字回退")).toBeTruthy();
  });
  test("same element IDs in two artifacts stay isolated; restored state and keyboard tabs work", () => {
    const one = attachment(); one.viewState = { steps: { step: 1 } };
    render(<><GenUiMessageCard {...props} attachment={one} onStateChange={() => {}} /><GenUiMessageCard {...props} attachment={attachment("artifact-b")} onStateChange={() => {}} /></>);
    const [a, b] = screen.getAllByLabelText("交互讲解卡片");
    expect(within(a).getByText("第二步")).toBeTruthy();
    expect(within(b).getByText("第一步")).toBeTruthy();
    fireEvent.keyDown(within(b).getByRole("tab", { name: "概念 A" }), { key: "ArrowRight" });
    expect(within(b).getByRole("tabpanel").textContent).toBe("解释 B");
    expect(within(a).getByRole("tabpanel").textContent).toBe("解释 A");
  });
  test("invalid imported versions fall back without executing any spec", () => {
    const malicious = { ...attachment(), catalogVersion: "unknown", spec: { root: "x", elements: { x: { type: "iframe", props: { src: "https://evil.test" } } } } } as any;
    const { container } = render(<GenUiMessageCard {...props} attachment={malicious} onStateChange={() => {}} />);
    expect(screen.getByText("这是文字回退")).toBeTruthy();
    expect(container.querySelector("iframe")).toBeNull();
  });
});
