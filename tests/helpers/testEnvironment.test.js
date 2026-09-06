import { describe, expect, test } from "bun:test";
import {
  createMemoryBrowserStorage,
  preserveGlobals,
  setTestGlobal,
} from "./testEnvironment.js";

describe("test environment helpers", () => {
  test("restoring a previously absent global property removes it again", () => {
    const name = "__humanTextTestAbsentGlobal__";
    expect(Object.hasOwn(globalThis, name)).toBe(false);

    const restoreGlobals = preserveGlobals(name);
    setTestGlobal(name, { temporary: true });
    expect(Object.hasOwn(globalThis, name)).toBe(true);

    restoreGlobals();
    expect(Object.hasOwn(globalThis, name)).toBe(false);
  });

  test("isolates initial, written and returned storage values", async () => {
    const initial = {
      local: { value: { source: "local" } },
      sync: { value: { source: "sync" } },
      session: { value: { source: "session" } },
    };
    const { browser, stores } = createMemoryBrowserStorage(initial);

    for (const area of ["local", "sync", "session"]) {
      initial[area].value.source = "mutated initial";
      expect(stores[area].value.source).toBe(area);
    }

    const input = { saved: { nested: "from input" } };
    await browser.storage.local.set(input);
    input.saved.nested = "mutated input";
    expect(stores.local.saved.nested).toBe("from input");
    stores.local.saved.nested = "mutated store";
    expect(input.saved.nested).toBe("mutated input");

    const defaults = { missing: { nested: "fallback" } };
    const result = await browser.storage.local.get({
      saved: null,
      ...defaults,
    });
    result.saved.nested = "mutated result";
    result.missing.nested = "mutated fallback result";
    expect(stores.local.saved.nested).toBe("mutated store");
    expect(defaults.missing.nested).toBe("fallback");
  });
});
