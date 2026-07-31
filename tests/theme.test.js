import { describe, expect, test } from "bun:test";
import {
  applyTheme,
  normalizeThemeMode,
  resolveTheme,
  watchSystemTheme,
} from "../entrypoints/shared/theme.ts";

describe("theme utilities", () => {
  test("normalizes unknown values to system mode", () => {
    expect(normalizeThemeMode("light")).toBe("light");
    expect(normalizeThemeMode("dark")).toBe("dark");
    expect(normalizeThemeMode("unknown")).toBe("system");
    expect(normalizeThemeMode(undefined)).toBe("system");
  });

  test("resolves system and manual theme modes", () => {
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  test("applies both preferred and resolved themes", () => {
    const attributes = new Map();
    const element = {
      setAttribute(name, value) {
        attributes.set(name, value);
      },
    };

    expect(applyTheme(element, "system", true)).toBe("dark");
    expect(attributes.get("data-theme-mode")).toBe("system");
    expect(attributes.get("data-theme")).toBe("dark");
  });

  test("watches system changes only in system mode", () => {
    let listener;
    let removedListener;
    const mediaQuery = {
      matches: false,
      addEventListener(_event, callback) {
        listener = callback;
      },
      removeEventListener(_event, callback) {
        removedListener = callback;
      },
    };
    const updates = [];

    const cleanup = watchSystemTheme(
      "system",
      (theme) => updates.push(theme),
      mediaQuery
    );

    mediaQuery.matches = true;
    listener();
    cleanup();

    expect(updates).toEqual(["dark"]);
    expect(removedListener).toBe(listener);
  });
});
