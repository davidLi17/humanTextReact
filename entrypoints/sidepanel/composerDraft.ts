import type { ChatMessage } from "@/entrypoints/shared/chatTypes";
import type { SelectionContext } from "@/entrypoints/shared/selectionContext";

export interface SidepanelComposerDraft {
  inputText: string;
  images: ChatMessage["images"];
  selectionContext?: SelectionContext;
}

export function saveComposerDraft(
  drafts: Map<string, SidepanelComposerDraft>,
  sessionId: string,
  draft: SidepanelComposerDraft
): void {
  if (!sessionId) return;
  drafts.set(sessionId, {
    ...draft,
    images: draft.images ? [...draft.images] : [],
  });
}

export function restoreComposerDraft(
  drafts: Map<string, SidepanelComposerDraft>,
  sessionId: string
): SidepanelComposerDraft {
  const draft = drafts.get(sessionId);
  return {
    inputText: draft?.inputText || "",
    images: draft?.images ? [...draft.images] : [],
    selectionContext: draft?.selectionContext,
  };
}
