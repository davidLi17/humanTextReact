import { Allow, parse } from "partial-json";
import { assertSafeJson, normalizeGenUiAttachment, recoverGeneratedExplanationSpec } from "./profile";
import type { GenUiAttachment } from "./types";

export interface GenUiPreviewProvenance {
  sourceMessageIds: string[];
  contextFingerprint: string;
}

const partialAllow = Allow.STR | Allow.OBJ | Allow.ARR;
export function createGenUiPreview(
  rawArguments: string,
  provenance: GenUiPreviewProvenance,
  previewId: string
): GenUiAttachment | undefined {
  try {
    const envelope = parse(rawArguments, partialAllow) as Record<string, unknown>;
    assertSafeJson(envelope);
    const { spec } = recoverGeneratedExplanationSpec(envelope?.spec, false);
    if (Object.values(spec.elements).every(element => element.type === "Card")) return undefined;
    return normalizeGenUiAttachment({
      id: previewId,
      protocolVersion: 1,
      catalogVersion: "explanation-v1",
      revision: 1,
      spec,
      sourceMessageIds: provenance.sourceMessageIds,
      contextFingerprint: provenance.contextFingerprint,
    });
  } catch {
    return undefined;
  }
}
