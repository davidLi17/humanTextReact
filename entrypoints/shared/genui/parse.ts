import { Allow, parse } from 'partial-json';
import { assertSafeJson, MAX_GENUI_BYTES, validateExplanationSpec, recoverGeneratedExplanationSpec } from './profile';
import type { ExplanationSpec, GeneratedUiEnvelope } from './types';

export const AUTO_GENUI_FALLBACK_MAX_CHARS = 2_000;

function parseEnvelope(raw: string, recover = false): { spec: ExplanationSpec; fallbackText?: string; warnings?: string[] } {
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > MAX_GENUI_BYTES) throw new Error('Explanation UI response is too large');
  let value: unknown;
  let partial = false;
  try { value = JSON.parse(raw); }
  catch (error) {
    if (!recover) throw error;
    partial = true;
    value = parse(raw, Allow.STR | Allow.OBJ | Allow.ARR);
  }
  assertSafeJson(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid explanation UI envelope');
  const record = value as Record<string, unknown>;
  if (!recover && (Object.keys(record).some(key => !['version', 'fallbackText', 'spec'].includes(key)) || record.version !== 1)) throw new Error('Invalid explanation UI envelope');
  const fallbackText = !partial && typeof record.fallbackText === 'string' && record.fallbackText.trim()
    ? record.fallbackText
    : undefined;
  return { ...(recover ? recoverGeneratedExplanationSpec(record.spec) : { spec: validateExplanationSpec(record.spec) }), fallbackText };
}

/** Strict storage callers remain strict; generation can recover usable partial content. */
export function parseGeneratedUiEnvelope(raw: string, recover = false): GeneratedUiEnvelope & { warnings?: string[] } {
  const parsed = parseEnvelope(raw, recover);
  if (!recover && (!parsed.fallbackText || parsed.fallbackText.length > 16_000)) throw new Error('Invalid explanation UI envelope');
  return { version: 1, fallbackText: parsed.fallbackText?.slice(0, 16_000) || '', spec: parsed.spec, ...(parsed.warnings ? { warnings: parsed.warnings } : {}) };
}

/** Automatic tool output may omit its short fallback when its validated spec is usable. */
export function parseGeneratedUiToolEnvelope(raw: string): { spec: ExplanationSpec; fallbackText?: string; warnings?: string[] } {
  const parsed = parseEnvelope(raw, true);
  return {
    spec: parsed.spec,
    warnings: parsed.warnings,
    ...(parsed.fallbackText && parsed.fallbackText.length <= AUTO_GENUI_FALLBACK_MAX_CHARS
      ? { fallbackText: parsed.fallbackText }
      : {}),
  };
}
