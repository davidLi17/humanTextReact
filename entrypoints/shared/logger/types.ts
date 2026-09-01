import type { LogLevel } from "@/entrypoints/shared/constants";

export type LoggerContext =
  | "background"
  | "content"
  | "popup"
  | "options"
  | "sidepanel";
export type LoggerMethod =
  | "log"
  | "info"
  | "warn"
  | "error"
  | "success"
  | "trace";

export interface DiagnosticSessionState {
  enabled: boolean;
  startedAt: number;
  expiresAt: number;
}

export interface DiagnosticLogRecord {
  id: string;
  timestamp: number;
  level: LoggerMethod;
  context: LoggerContext;
  namespace: string;
  message: string;
  data: unknown[];
  requestId?: string;
  extensionVersion?: string;
}

export interface DiagnosticLogSummary {
  total: number;
  errors: number;
  latestTimestamp?: number;
}

export interface LoggerRuntimeState {
  logLevel: LogLevel;
  diagnostics: DiagnosticSessionState | null;
}
