import { getSidePanelTabId } from "../shared/sidepanelUtils";

const SESSIONS = "sidepanel_chat_sessions";
const ACTIVE = "sidepanel_active_session_id";
const PROGRESS = "sidepanel_web_reading_progress";
export const tabStateKey = (tabId: number, kind: string) => `sidepanel_tab_${tabId}_${kind}`;

interface Area {
  get(keys: string | string[]): Promise<Record<string, any>>;
  set(items: Record<string, any>): Promise<void>;
}

/** Only changed records are merged: a hidden tab must never overwrite another tab's work. */
export function mergeRecords(previous: Record<string, any>, next: Record<string, any>, current: Record<string, any>) {
  const merged = { ...current };
  for (const id of Object.keys(previous)) if (!(id in next)) delete merged[id];
  for (const [id, value] of Object.entries(next)) {
    if (JSON.stringify(previous[id]) !== JSON.stringify(value)) merged[id] = value;
  }
  return merged;
}

export function createTabStateStorage(local: Area, session: Area, tabId: number,
  lock: <T>(fn: () => Promise<T>) => Promise<T>, progressKey = PROGRESS): Area {
  let baseline: Record<string, any> = {};
  const records = (items: any[]) => Object.fromEntries((items || []).map(item => [item.id, item]));
  return {
    async get(keys) {
      const result = await local.get(keys);
      baseline = structuredClone({ ...baseline, ...result });
      const activeKey = tabStateKey(tabId, "active");
      const active = await session.get(activeKey);
      return { ...result, [ACTIVE]: active[activeKey] };
    },
    async set(items) {
      await lock(async () => {
        const current = await local.get(Object.keys(items));
        const payload = { ...items };
        delete payload[ACTIVE];
        if (items[SESSIONS]) {
          payload[SESSIONS] = Object.values(mergeRecords(records(baseline[SESSIONS]), records(items[SESSIONS]), records(current[SESSIONS])));
        }
        if (items[progressKey]) {
          payload[progressKey] = { ...items[progressKey], records: mergeRecords(baseline[progressKey]?.records || {}, items[progressKey].records || {}, current[progressKey]?.records || {}) };
        }
        await local.set(payload);
        if (items[ACTIVE] !== undefined) await session.set({ [tabStateKey(tabId, "active")]: items[ACTIVE] });
        baseline = structuredClone({ ...baseline, ...items });
      });
    },
  };
}

let scoped: Area | undefined;
export function getTabStateStorage(local: Area, progressKey: string): Area {
  const id = getSidePanelTabId();
  if (id === undefined) return local;
  if (!scoped) {
    const api = (globalThis as any).browser || (globalThis as any).chrome;
    scoped = createTabStateStorage(local, api.storage.session, id,
      async fn => await navigator.locks.request("humantext-sidepanel-checkpoint", fn), progressKey);
  }
  return scoped;
}
