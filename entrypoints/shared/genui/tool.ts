import { explanationComponentJsonSchemas } from "./catalog";
import { AUTO_GENUI_FALLBACK_MAX_CHARS } from "./parse";

export const RENDER_INTERACTIVE_EXPLANATION_TOOL_NAME =
  "render_interactive_explanation";

/** Added only to automatic tool requests; stored user prompts remain untouched. */
export const AUTO_GENUI_CAPABILITY_PROMPT = `You can call render_interactive_explanation to add a small interactive card to this answer. Usually use it proactively when the answer benefits from process steps, a structural hierarchy, a multidimensional comparison, or a trend, quantity, or share chart. Use TreeInspector for hierarchy, ConceptTabs for viewpoints, CompareTable for comparison, StepViewer for a sequence, and Chart for line, bar, or pie data. Keep ordinary text concise when a card is present. Do not call the tool for short facts or when the user asks for plain text only.
When calling it, emit the tool arguments in this order: version, spec, fallbackText. Put spec.root before spec.elements, put each parent element before its children, and finish the first useful step, node, row, or chart series before starting later items so the card can appear while you continue. For Chart, every series.values length matches categories; pie has one non-negative series. Use supplied data only; clearly label illustrative values as examples. Put detail in spec. fallbackText is a short readable summary, written after the spec; do not repeat every step or table cell.`;

type JsonSchema = Record<string, unknown>;

function withoutDialect(schema: JsonSchema): JsonSchema {
  const { $schema: _dialect, ...rest } = schema;
  return rest;
}

const identifierSchema: JsonSchema = {
  type: "string",
  minLength: 1,
  maxLength: 160,
  pattern: "^[A-Za-z0-9_.:-]+$",
};

const explanationElementSchema: JsonSchema = {
  oneOf: Object.entries(explanationComponentJsonSchemas).map(
    ([name, propsSchema]) => ({
      type: "object",
      additionalProperties: false,
      required: ["type", "props", "children"],
      properties: {
        type: { const: name },
        props: withoutDialect(propsSchema as JsonSchema),
        children:
          name === "Card"
            ? {
                type: "array",
                maxItems: 100,
                items: identifierSchema,
              }
            : { type: "array", maxItems: 0 },
      },
    })
  ),
};

/**
 * The catalog owns component props for both the renderer and this API schema.
 * Cross-reference, tree and total-size checks still run at the host boundary.
 */
export const renderInteractiveExplanationTool = {
  type: "function" as const,
  function: {
    name: RENDER_INTERACTIVE_EXPLANATION_TOOL_NAME,
    description:
      "Create one small interactive explanation only when it helps: TreeInspector for a hierarchy, ConceptTabs for perspectives, CompareTable for comparisons, StepViewer for a sequence, Chart for trend, quantity, or share data. Respect requests for a plain text answer and do not call this tool for them. Call at most once. Emit version, spec, then fallbackText, and finish the first useful item before later items. Put detailed content in spec; fallbackText is a short readable summary and must not repeat all steps or table cells. spec.root and every children item reference keys in spec.elements; only Card may have children. TreeInspector has exactly one parentId:null root and every other node references its parent.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["version", "spec", "fallbackText"],
      properties: {
        version: { const: 1 },
        spec: {
          type: "object",
          additionalProperties: false,
          required: ["root", "elements"],
          properties: {
            root: identifierSchema,
            elements: {
              type: "object",
              minProperties: 1,
              maxProperties: 100,
              propertyNames: identifierSchema,
              additionalProperties: explanationElementSchema,
            },
          },
        },
        fallbackText: { type: "string", minLength: 1, maxLength: AUTO_GENUI_FALLBACK_MAX_CHARS },
      },
    },
  },
};
