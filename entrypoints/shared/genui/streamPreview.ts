import { Allow, parse } from "partial-json";
import { componentSchemas, idSchema } from "./catalog";
import { normalizeGenUiAttachment, normalizeGeneratedProps } from "./profile";
import type { GenUiAttachment, ExplanationElement } from "./types";

export interface GenUiPreviewProvenance {
  sourceMessageIds: string[];
  contextFingerprint: string;
}

const partialAllow = Allow.STR | Allow.OBJ | Allow.ARR;
const schemas = componentSchemas as Record<string, {
  safeParse(value: unknown): { success: boolean; data?: unknown };
}>;

function validId(value: unknown): value is string {
  return typeof value === "string" && idSchema.safeParse(value).success;
}

/**
 * A tool argument is still incomplete while it streams. partial-json preserves
 * completed values and omits unfinished numbers, then the catalog schemas trim
 * any incomplete trailing array entry. This is a preview only, never persisted.
 */
function validProps(type: string, value: unknown): unknown | undefined {
  const schema = schemas[type];
  if (!schema || !value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const props = value as Record<string, unknown>;
  const initial = schema.safeParse(props);
  if (initial.success && type !== "Chart" && type !== "CompareTable") return initial.data;

  const withValidItems = (field: string, isValid: (item: unknown) => boolean) => {
    const items = props[field];
    if (!Array.isArray(items)) return undefined;
    const parsed = schema.safeParse({ ...props, [field]: items.filter(isValid) });
    return parsed.success ? parsed.data : undefined;
  };

  if (type === "StepViewer") {
    return withValidItems("steps", (item) => componentSchemas.StepViewer.shape.steps.element.safeParse(item).success);
  }
  if (type === "ConceptTabs") {
    return withValidItems("tabs", (item) => componentSchemas.ConceptTabs.shape.tabs.element.safeParse(item).success);
  }
  if (type === "TreeInspector") {
    return withValidItems("nodes", (item) => componentSchemas.TreeInspector.shape.nodes.element.safeParse(item).success);
  }

  if (type === "CompareTable") {
    const columns = props.columns;
    const rows = props.rows;
    if (!Array.isArray(columns) || !Array.isArray(rows)) return undefined;
    const validColumns = columns.filter((column) =>
      componentSchemas.CompareTable.shape.columns.element.safeParse(column).success
    );
    const columnIds = validColumns.map((column) => (column as { id: string }).id);
    const validRows = rows.filter((row) => {
      if (!componentSchemas.CompareTable.shape.rows.element.safeParse(row).success) return false;
      const cells = (row as { cells: Record<string, string> }).cells;
      return Object.keys(cells).length === columnIds.length && columnIds.every((id) => Object.hasOwn(cells, id));
    });
    const parsed = schema.safeParse({ ...props, columns: validColumns, rows: validRows });
    return parsed.success ? parsed.data : undefined;
  }

  if (type === "Chart") {
    const categories = props.categories;
    const sourceSeries = props.series;
    if (!Array.isArray(categories) || !Array.isArray(sourceSeries)) return undefined;
    const series = (props.type === "pie" ? sourceSeries.slice(0, 1) : sourceSeries)
      .filter((entry: any) => entry && typeof entry.name === "string" && Array.isArray(entry.values));
    if (!series.length) return undefined;
    const length = Math.min(
      categories.length,
      ...series.map((entry: any) => entry.values.length)
    );
    if (length < 1) return undefined;
    const parsed = schema.safeParse({
      ...props,
      categories: categories.slice(0, length),
      series: series.map((entry: any) => ({ ...entry, values: entry.values.slice(0, length) })),
    });
    return parsed.success ? parsed.data : undefined;
  }

  return undefined;
}

function collectElements(value: unknown): Record<string, ExplanationElement> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const partial: Record<string, ExplanationElement> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!validId(key) || !raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const element = raw as Record<string, unknown>;
    if (typeof element.type !== "string") continue;
    const props = validProps(element.type, normalizeGeneratedProps(element.type, element.props, false));
    if (!props) continue;
    const children = Array.isArray(element.children)
      ? element.children.filter(validId)
      : [];
    partial[key] = {
      type: element.type as ExplanationElement["type"],
      props,
      children: element.type === "Card" ? children : [],
    } as ExplanationElement;
  }
  return partial;
}

function connectedPreview(root: string, candidates: Record<string, ExplanationElement>) {
  const elements: Record<string, ExplanationElement> = {};
  const visiting = new Set<string>();
  const visit = (id: string, depth: number): boolean => {
    if (depth > 8 || visiting.has(id) || elements[id] || !candidates[id]) return false;
    visiting.add(id);
    const source = candidates[id];
    const children = source.type === "Card"
      ? source.children.filter((child) => visit(child, depth + 1))
      : [];
    elements[id] = { ...source, children } as ExplanationElement;
    visiting.delete(id);
    return true;
  };
  if (!visit(root, 1)) return undefined;
  // A root Card has no useful visual until it has a first completed child.
  if (elements[root].type === "Card" && Object.keys(elements).length < 2) return undefined;
  return elements;
}

export function createGenUiPreview(
  rawArguments: string,
  provenance: GenUiPreviewProvenance,
  previewId: string
): GenUiAttachment | undefined {
  try {
    const envelope = parse(rawArguments, partialAllow) as Record<string, unknown>;
    const spec = envelope?.spec;
    if (!spec || typeof spec !== "object" || Array.isArray(spec)) return undefined;
    const root = (spec as Record<string, unknown>).root;
    if (!validId(root)) return undefined;
    const elements = connectedPreview(
      root,
      collectElements((spec as Record<string, unknown>).elements)
    );
    if (!elements) return undefined;
    return normalizeGenUiAttachment({
      id: previewId,
      protocolVersion: 1,
      catalogVersion: "explanation-v1",
      revision: 1,
      spec: { root, elements },
      sourceMessageIds: provenance.sourceMessageIds,
      contextFingerprint: provenance.contextFingerprint,
    });
  } catch {
    return undefined;
  }
}
