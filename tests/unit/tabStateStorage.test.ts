import { expect, test } from "bun:test";
import { createTabStateStorage, mergeRecords, tabStateKey } from "../../entrypoints/sidepanel/tabStateStorage";

test("tab checkpoints merge independent edits and deletions without stale snapshot overwrites", () => {
  expect(mergeRecords({a:1,b:2}, {a:3}, {a:1,b:2,c:4})).toEqual({a:3,c:4});
  expect(mergeRecords({a:1}, {a:1}, {a:9,b:2})).toEqual({a:9,b:2});
});

test("two live tab writers retain both sessions and isolate active session keys", async () => {
  const data:Record<string,any> = {sidepanel_chat_sessions:[]};
  const state:Record<string,any> = {};
  const area = (store:Record<string,any>) => ({
    async get(keys:string|string[]) { return structuredClone(Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,store[k]]))); },
    async set(items:Record<string,any>) { Object.assign(store,structuredClone(items)); },
  });
  let queue = Promise.resolve();
  const lock = <T>(fn:()=>Promise<T>):Promise<T> => { const next=queue.then(fn);queue=next.then(()=>{},()=>{});return next; };
  const a=createTabStateStorage(area(data),area(state),1,lock);
  const b=createTabStateStorage(area(data),area(state),2,lock);
  await a.get(['sidepanel_chat_sessions']);await b.get(['sidepanel_chat_sessions']);
  await Promise.all([
    a.set({sidepanel_chat_sessions:[{id:'a',messages:['A']}],sidepanel_active_session_id:'a'}),
    b.set({sidepanel_chat_sessions:[{id:'b',messages:['B']}],sidepanel_active_session_id:'b'}),
  ]);
  expect(data.sidepanel_chat_sessions).toEqual([{id:'a',messages:['A']},{id:'b',messages:['B']}]);
  expect(state[tabStateKey(1,'active')]).toBe('a');
  expect(state[tabStateKey(2,'active')]).toBe('b');
  expect(data.sidepanel_active_session_id).toBeUndefined();
});
