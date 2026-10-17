import React from "react";
import { createRenderer, type ComponentRegistry } from "@json-render/react";
import type { Spec } from "@json-render/core";
import { explanationCatalog } from "@/entrypoints/shared/genui/catalog";
import type { ExplanationSpec } from "@/entrypoints/shared/genui/types";
import { TreeInspector, ConceptTabs, CompareTable, StepViewer } from "./components/ExplanationControls";

// Host-only identity is added AFTER profile validation and never accepted from a model/import.
// No runtime action handler, browser object, settings, expression function or network API is passed.
export function toRuntimeSpec(spec: ExplanationSpec): Spec {
  return { root: spec.root, elements: Object.fromEntries(Object.entries(spec.elements).map(([id, element]) =>
    [id, { type: element.type, props: { ...element.props, __hostElementId: id }, children: [...element.children] }])) };
}
const registry = {
  Card: ({ element, children }) => <section className="genui-card-layout">{element.props.title && <h3>{element.props.title}</h3>}{children}</section>,
  Text: ({ element }) => <p className="genui-text">{element.props.text}</p>,
  TreeInspector: ({ element }) => <TreeInspector elementId={element.props.__hostElementId} nodes={element.props.nodes} />,
  ConceptTabs: ({ element }) => <ConceptTabs elementId={element.props.__hostElementId} tabs={element.props.tabs} />,
  CompareTable: ({ element }) => <CompareTable elementId={element.props.__hostElementId} columns={element.props.columns} rows={element.props.rows} />,
  StepViewer: ({ element }) => <StepViewer elementId={element.props.__hostElementId} steps={element.props.steps} />,
} satisfies ComponentRegistry;
export const ExplanationRenderer = createRenderer(explanationCatalog, registry);
