import {Blob as NodeBlob} from "node:buffer";
import {IDBFactory} from "fake-indexeddb";
import {preserveGlobals, setTestGlobal} from "./testEnvironment.js";

/** Happy DOM replaces Blob/structuredClone; fake IndexedDB needs an actual cloneable Blob. */
export function installImageStoreEnvironment() {
  const restore = preserveGlobals("indexedDB", "Blob", "structuredClone");
  const clone = globalThis.structuredClone;
  setTestGlobal("indexedDB", new IDBFactory());
  setTestGlobal("Blob", NodeBlob);
  setTestGlobal("structuredClone", (value: any) => value && typeof value.arrayBuffer === "function" && typeof value.slice === "function" ? value.slice(0, value.size, value.type) : clone(value));
  return restore;
}
