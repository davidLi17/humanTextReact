import { describe, expect, test } from "bun:test";
import { createMemoryBrowserStorage } from "./helpers/testEnvironment.js";

describe("test environment helpers", () => {
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
