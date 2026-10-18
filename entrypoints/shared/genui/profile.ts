import { componentSchemas, idSchema } from './catalog';
import type { ExplanationElement, ExplanationSpec, GenUiAttachment, GenUiRequestIntent } from './types';

export const MAX_GENUI_BYTES = 65_536;
export const MAX_GENUI_STORAGE_BYTES = 1_048_576;
const unsafeKeys = new Set(['__proto__', 'prototype', 'constructor']);
function fail(reason?: string): never { throw new Error(reason ? `GenUI: ${reason}` : 'Invalid explanation UI data'); }
export function assertSafeJson(value: unknown): void {
  const seen = new Set<object>();
  let nodes = 0;
  function visit(item: unknown, depth: number) {
    if (++nodes > 20_000 || depth > 24) fail();
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return;
    if (typeof item === 'number' && Number.isFinite(item)) return;
    if (typeof item !== 'object' || !item || seen.has(item)) fail();
    const proto = Object.getPrototypeOf(item);
    if (Array.isArray(item) ? proto !== Array.prototype : proto !== Object.prototype && proto !== null) fail();
    seen.add(item);
    for (const key of Reflect.ownKeys(item)) {
      if (typeof key !== 'string' || unsafeKeys.has(key)) fail();
      const descriptor = Object.getOwnPropertyDescriptor(item, key)!;
      if (!('value' in descriptor)) fail();
      if (Array.isArray(item) && key === 'length') continue;
      visit(descriptor.value, depth + 1);
    }
    seen.delete(item);
  }
  visit(value, 0);
}
export function jsonByteLength(value: unknown): number { return new TextEncoder().encode(JSON.stringify(value)).length; }
function object(value: unknown, keys: string[]): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
  if (Object.keys(value).some(key => !keys.includes(key))) fail();
  return value as Record<string, any>;
}
function id(value: unknown): string { return idSchema.parse(value); }
function unique(values: string[]) { if (new Set(values).size !== values.length) fail(); }

export function validateExplanationSpec(value: unknown): ExplanationSpec {
  assertSafeJson(value);
  if (jsonByteLength(value) > MAX_GENUI_BYTES) fail();
  const raw = object(value, ['root', 'elements']);
  const root = id(raw.root);
  const source = object(raw.elements, Object.keys(raw.elements || {}));
  const entries = Object.entries(source);
  if (entries.length < 1 || entries.length > 100) fail();
  const elements: Record<string, ExplanationElement> = {};
  for (const [key, entry] of entries) {
    id(key);
    const element = object(entry, ['type', 'props', 'children']);
    if (typeof element.type !== 'string' || !Object.hasOwn(componentSchemas, element.type)) fail();
    const type = element.type as keyof typeof componentSchemas;
    const props = componentSchemas[type].parse(element.props);
    // json-render leaves may omit children; preview already treats omission as an empty list.
    const rawChildren = element.children === undefined ? [] : element.children;
    if (!Array.isArray(rawChildren) || rawChildren.length > 100) fail('组件 children 必须是数组且最多包含100项');
    const children = rawChildren.map(id);
    unique(children);
    if (type !== 'Card' && children.length) fail('只有 Card 组件可以包含子元素');
    if (type === 'TreeInspector') {
      const nodes = (props as typeof componentSchemas.TreeInspector._output).nodes;
      unique(nodes.map(node => node.id));
      if (nodes.filter(node => node.parentId === null).length !== 1) fail();
      const parents = new Map(nodes.map(node => [node.id, node.parentId]));
      for (const node of nodes) {
        const visited = new Set<string>();
        let current: string | null = node.id;
        while (current !== null) {
          if (!parents.has(current) || visited.has(current) || visited.size >= 100) fail();
          visited.add(current);
          current = parents.get(current)!;
        }
      }
    }
    if (type === 'ConceptTabs') unique((props as typeof componentSchemas.ConceptTabs._output).tabs.map(tab => tab.id));
    if (type === 'StepViewer') unique((props as typeof componentSchemas.StepViewer._output).steps.map(step => step.id));
    if (type === 'CompareTable') {
      const table = props as typeof componentSchemas.CompareTable._output;
      unique(table.columns.map(column => column.id)); unique(table.rows.map(row => row.id));
      const keys = table.columns.map(column => column.id);
      for (const row of table.rows) {
        if (Object.keys(row.cells).length !== keys.length || keys.some(key => !Object.hasOwn(row.cells, key))) fail();
      }
    }
    if (type === 'Chart') {
      const chart = props as typeof componentSchemas.Chart._output;
      if (chart.type === 'pie' && chart.series.length !== 1) fail('饼图必须只有一组数值');
      if (chart.series.some(series => series.values.length !== chart.categories.length)) fail('图表分类数量与数值数量不一致');
      if (chart.type === 'pie' && chart.series[0].values.some(value => value < 0)) fail('饼图不能包含负数');
    }
    elements[key] = { type, props, children } as ExplanationElement;
  }
  const visited = new Set<string>();
  function walk(key: string, depth: number) {
    if (depth > 8 || !Object.hasOwn(elements, key) || visited.has(key)) fail('交互元素引用缺失、重复、成环或层级过深');
    visited.add(key);
    elements[key].children.forEach(child => walk(child, depth + 1));
  }
  walk(root, 1);
  if (visited.size !== entries.length) fail('包含未连接到根节点的交互元素');
  return { root, elements };
}

export function normalizeGenUiAttachment(value: unknown): GenUiAttachment | undefined {
  try {
    assertSafeJson(value);
    if (jsonByteLength(value) > MAX_GENUI_BYTES) fail();
    const raw = object(value, ['id', 'protocolVersion', 'catalogVersion', 'revision', 'spec', 'sourceMessageIds', 'contextFingerprint', 'fallbackText', 'viewState']);
    if (raw.protocolVersion !== 1 || raw.catalogVersion !== 'explanation-v1' || !Number.isSafeInteger(raw.revision) || raw.revision < 1) fail();
    const spec = validateExplanationSpec(raw.spec);
    if (!Array.isArray(raw.sourceMessageIds) || !raw.sourceMessageIds.length || raw.sourceMessageIds.length > 100) fail();
    const sourceMessageIds = raw.sourceMessageIds.map(id); unique(sourceMessageIds);
    const result: GenUiAttachment = { id: id(raw.id), protocolVersion: 1, catalogVersion: 'explanation-v1', revision: raw.revision, spec, sourceMessageIds, contextFingerprint: id(raw.contextFingerprint) };
    if (raw.fallbackText !== undefined) {
      if (typeof raw.fallbackText !== 'string' || !raw.fallbackText.trim() || raw.fallbackText.length > 16_000) fail();
      result.fallbackText = raw.fallbackText;
    }
    if (raw.viewState !== undefined) {
      const state = object(raw.viewState, Object.keys(spec.elements));
      result.viewState = {};
      for (const [key, input] of Object.entries(state)) {
        const entry = object(input, ['selectedNodeId', 'activeTabId', 'step']);
        const element = spec.elements[key];
        const clean: NonNullable<GenUiAttachment['viewState']>[string] = {};
        if (entry.selectedNodeId !== undefined) {
          if (element.type !== 'TreeInspector' || !element.props.nodes.some(node => node.id === entry.selectedNodeId)) fail();
          clean.selectedNodeId = id(entry.selectedNodeId);
        }
        if (entry.activeTabId !== undefined) {
          if (element.type !== 'ConceptTabs' || !element.props.tabs.some(tab => tab.id === entry.activeTabId)) fail();
          clean.activeTabId = id(entry.activeTabId);
        }
        if (entry.step !== undefined) {
          if (element.type !== 'StepViewer' || !Number.isInteger(entry.step) || entry.step < 0 || entry.step >= element.props.steps.length) fail();
          clean.step = entry.step;
        }
        result.viewState[key] = clean;
      }
    }
    return result;
  } catch { return undefined; }
}

export function normalizeGenUiRequestIntent(value: unknown): GenUiRequestIntent | undefined {
  try {
    assertSafeJson(value);
    const raw = object(value, ['version', 'sourceMessageIds', 'contextFingerprint']);
    if (raw.version !== 1 || !Array.isArray(raw.sourceMessageIds) || !raw.sourceMessageIds.length || raw.sourceMessageIds.length > 100) fail();
    const sourceMessageIds = raw.sourceMessageIds.map(id); unique(sourceMessageIds);
    return { version: 1, sourceMessageIds, contextFingerprint: id(raw.contextFingerprint) };
  } catch { return undefined; }
}

/** Remove invalid UI only, retaining the original readable message and legacy fields. */
export function normalizeGenUiSessions<T extends { messages: any[] }>(sessions: T[]): T[] {
  const candidates: Array<{ message: Record<string, any>; bytes: number; time: number; order: number }> = [];
  const result = sessions.map(session => {
    const ids = new Set(session.messages.filter(message => message && typeof message.id === 'string').map(message => message.id));
    return { ...session, messages: session.messages.map(message => {
      if (!message || typeof message !== 'object') return message;
      // Streaming previews are transient. Only a finalized, validated attachment belongs in history.
      const { genUi: raw, genUiRequest: request, genUiPreview: _preview, genUiPending: _pending, ...rest } = message;
      const intent = message.role === 'user' ? normalizeGenUiRequestIntent(request) : undefined;
      // Restored intent is inert metadata, never permission. Drop dangling source references.
      if (intent && intent.sourceMessageIds.every(sourceId => ids.has(sourceId))) rest.genUiRequest = intent;
      const genUi = message.role === 'assistant' ? normalizeGenUiAttachment(raw) : undefined;
      if (genUi) {
        rest.genUi = genUi;
        candidates.push({ message: rest, bytes: jsonByteLength(genUi), time: Number.isFinite(message.createdAt) ? message.createdAt : 0, order: candidates.length });
      }
      return rest;
    }) };
  });
  let bytes = candidates.reduce((total, item) => total + item.bytes, 0);
  // Oldest first: expend transient navigation state before removing any explanation.
  candidates.sort((a, b) => a.time - b.time || a.order - b.order);
  for (const item of candidates) {
    if (bytes <= MAX_GENUI_STORAGE_BYTES) break;
    if (item.message.genUi.viewState !== undefined) {
      delete item.message.genUi.viewState;
      const next = jsonByteLength(item.message.genUi);
      bytes -= item.bytes - next;
      item.bytes = next;
    }
  }
  for (const item of candidates) {
    if (bytes <= MAX_GENUI_STORAGE_BYTES) break;
    delete item.message.genUi;
    bytes -= item.bytes;
  }
  return result;
}
