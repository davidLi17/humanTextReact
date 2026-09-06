import { describe, expect, test } from "bun:test";
import { MARKDOWN_STYLES } from "../shared/styles/markdown.ts";
import { POPUP_STYLES } from "../entrypoints/content/styles.tsx";

describe("Markdown theme CSS contract", () => {
  test("emphasis inherits the surrounding text color, including quotations", () => {
    const boldRule = MARKDOWN_STYLES.match(/\.bold\s*\{([^}]+)\}/)?.[1];
    expect(boldRule).toContain("color: inherit");
  });

  test("resolved extension theme is independent of the operating system theme", () => {
    expect(MARKDOWN_STYLES).not.toContain("prefers-color-scheme");
    expect(MARKDOWN_STYLES).toContain('[data-theme="dark"] .markdown-content');
    expect(MARKDOWN_STYLES).toContain('[data-theme="dark"] .highlight');
  });

  test("content popup dark rules match the popup root itself", () => {
    expect(POPUP_STYLES).toContain('.translator-popup[data-theme="dark"] .inline-code');
    expect(POPUP_STYLES).not.toContain('[data-theme="dark"] .translator-popup ');
  });

  test("text selections define both foreground and background", () => {
    const rule = MARKDOWN_STYLES.match(/\.markdown-content ::selection\s*\{([^}]+)\}/)?.[1];
    expect(rule).toContain("background: #bfdbfe");
    expect(rule).toContain("color: #111827");
  });
});
