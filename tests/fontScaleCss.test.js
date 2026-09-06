import { describe, expect, test } from "bun:test";

const ROOT = new URL("../", import.meta.url);
const text = (path) => Bun.file(new URL(path, ROOT)).text();

describe("扩展字体缩放样式契约", () => {
  test("所有扩展文字固定 px 字号均已接入变量，仅保留三个明确图标字号", async () => {
    const files = [
      "shared/styles/markdown.ts",
      "entrypoints/popup/App.less",
      "entrypoints/popup/components/SmartInput.less",
      "entrypoints/sidepanel/App.less",
      "entrypoints/sidepanel/components/JargonVaultPanel.less",
      "entrypoints/options/Options.less",
      "entrypoints/content/styles.tsx",
      "entrypoints/content/popupManager.ts",
    ];
    const remaining = [];
    for (const file of files) {
      const source = await text(file);
      for (const match of source.matchAll(/font-size:\s*([\d.]+)px/g)) {
        remaining.push(`${file}:${match[1]}`);
      }
    }
    expect(remaining).toEqual([
      "entrypoints/popup/App.less:18",
      "entrypoints/popup/App.less:48",
      "entrypoints/content/styles.tsx:17",
    ]);
  });

  test("Markdown 的 em 层级只继承一次，正文和代码复制按钮基准字号参与缩放", async () => {
    const source = await text("shared/styles/markdown.ts");
    expect(source).toContain("font-size: 1.5em");
    expect(source).toContain(
      "font-size: calc(13px * var(--ht-font-scale, 1))"
    );
    expect(source).not.toMatch(/(?:em|rem)\s*\*\s*var\(--ht-font-scale/);
  });

  test("独立扩展页设置根变量，网页内只给扩展浮窗和工具条设置变量", async () => {
    const popupRoot = await text("entrypoints/popup/style.less");
    const optionsRoot = await text("entrypoints/options/Options.less");
    const contentStyles = await text("entrypoints/content/styles.tsx");
    const sidepanelApp = await text("entrypoints/sidepanel/App.tsx");
    expect(popupRoot).toContain("font-size: calc(16px * var(--ht-font-scale))");
    expect(optionsRoot).toContain("font-size: calc(16px * var(--ht-font-scale))");
    expect(contentStyles).toMatch(
      /\.translator-popup \{[\s\S]*?--ht-font-scale: 1;/
    );
    expect(contentStyles).toMatch(
      /\.translator-action-bar \{[\s\S]*?--ht-font-scale: 1;/
    );
    expect(contentStyles).not.toMatch(
      /(?:html|body|:root)\s*\{[^}]*--ht-font-scale/
    );
    expect(sidepanelApp.match(/fontSize:[\s\S]{0,80}--ht-font-scale/g)).toHaveLength(2);
  });

  test("没有使用 CSS zoom 做整页布局缩放", async () => {
    const files = [
      "entrypoints/popup/App.less",
      "entrypoints/sidepanel/App.less",
      "entrypoints/options/Options.less",
      "entrypoints/content/styles.tsx",
    ];
    for (const file of files) {
      expect(await text(file)).not.toMatch(/\bzoom\s*:/);
    }
  });
});
