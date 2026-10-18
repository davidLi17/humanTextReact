import React, { useId, useMemo, useState } from "react";
import type { z } from "zod";
import type { componentSchemas } from "@/entrypoints/shared/genui/catalog";
import { useElementViewState } from "../useGenUiState";
type Props<K extends keyof typeof componentSchemas> = z.infer<(typeof componentSchemas)[K]> & { elementId: string };

export function TreeInspector({ nodes, elementId }: Props<"TreeInspector">) {
  const [state, update] = useElementViewState(elementId);
  const index = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const selected = index.get(state.selectedNodeId ?? "") ?? nodes.find((node) => node.parentId === null)!;
  const children = nodes.filter((node) => node.parentId === selected.id);
  const parent = selected.parentId === null ? undefined : index.get(selected.parentId);
  const depth = (id: string) => {
    let node = index.get(id); let value = 0;
    while (node?.parentId && value < 100) { value++; node = index.get(node.parentId); }
    return value;
  };
  // Canonical DFS order keeps the hierarchy legible even when model data was unordered.
  const ordered: typeof nodes = [];
  const visit = (id: string) => { ordered.push(index.get(id)!); nodes.filter((n) => n.parentId === id).forEach((n) => visit(n.id)); };
  visit(nodes.find((node) => node.parentId === null)!.id);
  return <section className="genui-tree" aria-label="树节点检查器">
    <div className="genui-node-list" role="group" aria-label="选择节点">
      {ordered.map((node) => <button type="button" key={node.id} aria-pressed={node.id === selected.id}
        style={{ paddingInlineStart: `${Math.min(depth(node.id), 8) * 12 + 10}px` }}
        onClick={() => update({ selectedNodeId: node.id })}>{node.label}</button>)}
    </div>
    <div className="genui-node-detail" aria-live="polite">
      <strong>{selected.label}</strong>
      {selected.description && <p>{selected.description}</p>}
      <p>父节点：{parent ? <button type="button" onClick={() => update({ selectedNodeId: parent.id })}>{parent.label}</button> : "无（根节点）"}</p>
      <p>子节点：{children.length === 0 ? "无（叶节点）" : children.map((node) => <button type="button" key={node.id} onClick={() => update({ selectedNodeId: node.id })}>{node.label}</button>)}</p>
    </div>
  </section>;
}

export function ConceptTabs({ tabs, elementId }: Props<"ConceptTabs">) {
  const [state, update] = useElementViewState(elementId);
  const prefix = useId();
  const active = tabs.find((tab) => tab.id === state.activeTabId) ?? tabs[0];
  return <section className="genui-tabs">
    <div role="tablist" aria-label="解释角度">
      {tabs.map((tab, index) => <button type="button" role="tab" key={tab.id}
        id={`${prefix}-tab-${index}`} aria-controls={`${prefix}-panel`} aria-selected={tab.id === active.id}
        tabIndex={tab.id === active.id ? 0 : -1}
        onKeyDown={(event) => {
          const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : undefined;
          if (next !== undefined) { event.preventDefault(); update({ activeTabId: tabs[next].id }); document.getElementById(`${prefix}-tab-${next}`)?.focus(); }
        }} onClick={() => update({ activeTabId: tab.id })}>{tab.label}</button>)}
    </div>
    <p id={`${prefix}-panel`} role="tabpanel" aria-labelledby={`${prefix}-tab-${tabs.indexOf(active)}`} tabIndex={0}>{active.content}</p>
  </section>;
}

export function StepViewer({ steps, elementId }: Props<"StepViewer">) {
  const [state, update] = useElementViewState(elementId);
  const step = Math.min(Math.max(state.step ?? 0, 0), steps.length - 1);
  return <section className="genui-steps" aria-label="步骤讲解演示">
    <div className="genui-step-progress" aria-label="步骤进度">{steps.map((item, index) => <button type="button" key={item.id} aria-current={index === step ? "step" : undefined}
      aria-label={`第 ${index + 1} 步：${item.title}`} onClick={() => update({ step: index })}>{index + 1}</button>)}</div>
    <small>讲解演示 · {step + 1} / {steps.length}</small>
    <div aria-live="polite"><h4>{steps[step].title}</h4><p>{steps[step].description}</p></div>
    <div className="genui-controls"><button type="button" disabled={step === 0} onClick={() => update({ step: step - 1 })}>上一步</button>
      <button type="button" disabled={step === steps.length - 1} onClick={() => update({ step: step + 1 })}>下一步</button></div>
  </section>;
}

export function CompareTable({ columns, rows }: Props<"CompareTable">) {
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<{ id: string; reverse: boolean }>();
  const shown = rows.filter((row) => columns.some((column) => row.cells[column.id].toLocaleLowerCase().includes(filter.toLocaleLowerCase())));
  if (sort) shown.sort((a, b) => a.cells[sort.id].localeCompare(b.cells[sort.id], undefined, { numeric: true }) * (sort.reverse ? -1 : 1));
  return <section className="genui-comparison">
    <label>筛选表格<input type="search" value={filter} maxLength={200} onChange={(event) => setFilter(event.target.value)} placeholder="输入关键词" /></label>
    <div className="genui-table-scroll" tabIndex={0} role="region" aria-label="对比表格（可横向滚动）"><table><thead><tr>
      {columns.map((column) => <th key={column.id} aria-sort={sort?.id === column.id ? sort.reverse ? "descending" : "ascending" : "none"}>
        <button type="button" onClick={() => setSort({ id: column.id, reverse: sort?.id === column.id ? !sort.reverse : false })}>{column.label}{sort?.id === column.id ? sort.reverse ? " ↓" : " ↑" : " ↕"}</button>
      </th>)}
    </tr></thead><tbody>{shown.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column.id}>{row.cells[column.id]}</td>)}</tr>)}</tbody></table></div>
    <small role="status">显示 {shown.length} / {rows.length} 行</small>
  </section>;
}
