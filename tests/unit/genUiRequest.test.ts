import { describe, expect, test } from "bun:test";
import { acceptGenUiCompletion, prepareGenUiRequest } from "../../entrypoints/sidepanel/genui/useGenUiRequest";
import type { ChatSession } from "../../entrypoints/shared/chatTypes";
import { GENUI_SYSTEM_PROMPT } from "../../entrypoints/shared/genui/prompt";
import { checkChatRequestBudget } from "../../entrypoints/shared/pageContext";
const session: ChatSession = { id: "s", title: "t", createdAt: 1, updatedAt: 2, messages: [
  { id: "q", role: "user", content: "Explain", createdAt: 1, status: "completed" },
  { id: "a", role: "assistant", content: "Readable source", createdAt: 2, status: "completed" },
] };
describe("GenUI request ownership", () => {
  test("prepares a new independent turn without mutating source; budgets actual schema prompt", () => {
    const prepared = prepareGenUiRequest(session, "a");
    expect(session.messages).toHaveLength(2);
    expect(prepared.assistant.id).not.toBe("a");
    expect(prepared.user.genUiRequest?.sourceMessageIds).toEqual(["q", "a"]);
    expect(prepared.meta.contextFingerprint).toMatch(/^ctx-/);
    expect(checkChatRequestBudget(prepared.payload, { systemPrompt: GENUI_SYSTEM_PROMPT, maxChars: 40_000 }).ok).toBe(true);
    expect(() => prepareGenUiRequest({ ...session, messages: [...session.messages.slice(0, 1), { ...session.messages[1], content: "长".repeat(40_000) }] }, "a")).toThrow();
  });
  test("requires exact request, session, assistant, source metadata, completed state", () => {
    const prepared = prepareGenUiRequest(session, "a");
    const owner = { requestId: prepared.requestId, sessionId: session.id, assistantMessageId: prepared.assistant.id };
    const update = { ...owner, done: true, genUi: { id: "artifact", protocolVersion: 1, catalogVersion: "explanation-v1", revision: 1,
      sourceMessageIds: prepared.meta.sourceMessageIds, contextFingerprint: prepared.meta.contextFingerprint,
      spec: { root: "text", elements: { text: { type: "Text", props: { text: "safe" }, children: [] } } } } };
    expect(acceptGenUiCompletion(update, owner, prepared.meta)).toBeDefined();
    for (const changed of [{ requestId: "late" }, { sessionId: "other" }, { assistantMessageId: "other" }, { done: false }, { error: "failed" }, { genUi: { ...update.genUi, sourceMessageIds: ["other"] } }, { genUi: { ...update.genUi, contextFingerprint: "other" } }]) {
      expect(acceptGenUiCompletion({ ...update, ...changed }, owner, prepared.meta)).toBeUndefined();
    }
    expect(acceptGenUiCompletion(update, undefined, prepared.meta)).toBeUndefined();
  });
});

test("local view-state persistence trims reconstructible old entries to reserved 4 KiB", async () => {
  const { boundViewState } = await import("../../entrypoints/sidepanel/genui/useGenUiState");
  const state = Object.fromEntries(Array.from({ length: 100 }, (_, index) => [`node-${index}-${"x".repeat(100)}`, { selectedNodeId: `selected-${index}-${"y".repeat(100)}` }]));
  const bounded = boundViewState(state);
  expect(new TextEncoder().encode(JSON.stringify(bounded)).byteLength).toBeLessThanOrEqual(4096);
  expect(Object.keys(bounded).at(-1)).toBe(Object.keys(state).at(-1));
  expect(Object.keys(state)).toHaveLength(100);
});

test("98 long-id controls retain a near-limit attachment with bounded latest-state persistence", async () => {
  const { boundViewState } = await import("../../entrypoints/sidepanel/genui/useGenUiState");
  const { normalizeGenUiAttachment } = await import("../../entrypoints/shared/genui/profile");
  const ids = Array.from({ length: 98 }, (_, index) => `tab-${index}`.padEnd(160, "x"));
  const artifact = { id: "artifact", protocolVersion: 1, catalogVersion: "explanation-v1", revision: 1, sourceMessageIds: ["a"], contextFingerprint: "ctx", spec: {
    root: "card", elements: { card: { type: "Card", props: {}, children: ids }, ...Object.fromEntries(ids.map(id => [id, { type: "ConceptTabs", props: { tabs: [{ id: "a", label: "A", content: "x".repeat(180) }] }, children: [] }])) },
  } };
  const exactBytes = 61_440;
  const padding = exactBytes - new TextEncoder().encode(JSON.stringify(artifact)).byteLength;
  expect(padding).toBeGreaterThan(0);
  (artifact.spec.elements as Record<string, any>)[ids[0]].props.tabs[0].content += "x".repeat(padding);
  expect(new TextEncoder().encode(JSON.stringify(artifact)).byteLength).toBe(exactBytes);
  expect(normalizeGenUiAttachment(artifact)).toBeDefined();
  const fullState = Object.fromEntries(ids.map(id => [id, { activeTabId: "a" }]));
  expect(normalizeGenUiAttachment({ ...artifact, viewState: fullState })).toBeUndefined();
  const persisted = boundViewState(fullState);
  expect(normalizeGenUiAttachment({ ...artifact, viewState: persisted })).toBeDefined();
  expect(Object.keys(persisted)).not.toContain(ids[0]);
  expect(persisted[ids.at(-1)!]).toEqual({ activeTabId: "a" });
});

test("numeric element IDs keep the most recently selected control when state is trimmed", async () => {
  const { boundViewState } = await import("../../entrypoints/sidepanel/genui/useGenUiState");
  const state = Object.fromEntries(Array.from({ length: 40 }, (_, index) => [String(index), { selectedNodeId: "n".repeat(160) }]));
  const newestZero = [...Object.keys(state).filter(id => id !== "0"), "0"];
  const bounded = boundViewState(state, newestZero);
  expect(bounded["0"]).toEqual(state["0"]);
  expect(bounded["1"]).toBeUndefined();
  expect(new TextEncoder().encode(JSON.stringify(bounded)).byteLength).toBeLessThanOrEqual(4096 - 32);
});

test("imported cards with little state headroom evict state rather than losing attachment", async () => {
  const { boundViewState } = await import("../../entrypoints/sidepanel/genui/useGenUiState");
  expect(boundViewState({ tree: { selectedNodeId: "root" } }, ["tree"], 0)).toEqual({});
  const bounded = boundViewState({ a: { step: 1 }, b: { step: 2 } }, ["a", "b"], 20);
  expect(bounded).toEqual({ b: { step: 2 } });
});
