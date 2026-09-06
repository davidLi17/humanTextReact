export function createMemoryStorageArea(
  store?: Record<string, unknown>,
  overrides?: Record<string, unknown>
): Record<string, unknown>;

export function createMemoryBrowserStorage(initial?: Record<string, unknown>): {
  stores: Record<string, Record<string, unknown>>;
  browser: Record<string, unknown>;
};

export function preserveGlobals(...names: string[]): () => void;
export function setTestGlobal(name: string, value: unknown): void;
