import { assertSafeJson, MAX_GENUI_BYTES, validateExplanationSpec } from './profile';
import type { GeneratedUiEnvelope } from './types';

/** A complete JSON document only: no fences, JSONL patches, repair or partial streaming. */
export function parseGeneratedUiEnvelope(raw: string): GeneratedUiEnvelope {
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > MAX_GENUI_BYTES) throw new Error('Explanation UI response is too large');
  const value: unknown = JSON.parse(raw);
  assertSafeJson(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid explanation UI envelope');
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 3 || Object.keys(record).some(key => !['version', 'fallbackText', 'spec'].includes(key)) || record.version !== 1 || typeof record.fallbackText !== 'string' || !record.fallbackText.trim() || record.fallbackText.length > 16_000) throw new Error('Invalid explanation UI envelope');
  return { version: 1, fallbackText: record.fallbackText, spec: validateExplanationSpec(record.spec) };
}
