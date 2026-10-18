import type { z } from 'zod';
import type { componentSchemas } from './catalog';

export type ExplanationElement = {
  [K in keyof typeof componentSchemas]: { type: K; props: z.infer<(typeof componentSchemas)[K]>; children: string[] }
}[keyof typeof componentSchemas];
export interface ExplanationSpec { root: string; elements: Record<string, ExplanationElement> }
export interface GenUiAttachment {
  id: string;
  protocolVersion: 1;
  catalogVersion: 'explanation-v1';
  revision: number;
  spec: ExplanationSpec;
  sourceMessageIds: string[];
  contextFingerprint: string;
  fallbackText?: string;
  viewState?: Record<string, { selectedNodeId?: string; activeTabId?: string; step?: number }>;
}
export interface GeneratedUiEnvelope { version: 1; fallbackText: string; spec: ExplanationSpec }
export interface GenUiRequestMeta { sourceMessageIds: string[]; contextFingerprint: string; assistantMessageId: string }

export interface GenUiRequestIntent { version: 1; sourceMessageIds: string[]; contextFingerprint: string }
