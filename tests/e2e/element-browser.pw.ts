import { test, expect, chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";

test("browser feature modules: selection, privacy crop, marks, send, restore and cleanup (mock extension transport)", async ({}, testInfo) => {
  execFileSync(
    "bun",
    [
      "build",
      "tests/fixtures/element-browser.tsx",
      "--target=browser",
      "--loader=.less:text",
      "--outfile=artifacts/element-browser.js",
    ],
    { cwd: process.cwd() },
  );
  const script = readFileSync(resolve("artifacts/element-browser.js"));
  const assets = resolve(".output/chrome-mv3/assets");
  const style = readFileSync(
    resolve(
      assets,
      readdirSync(assets).find(
        (name) => name.startsWith("sidepanel-") && name.endsWith(".css"),
      )!,
    ),
  );
  const server = createServer((req, res) => {
    if (req.url === "/style.css") {
      res.setHeader("Content-Type", "text/css");
      res.end(style);
      return;
    }
    if (req.url === "/bundle.js") {
      res.setHeader("Content-Type", "text/javascript");
      res.end(script);
      return;
    }
    res.setHeader("Content-Type", "text/html");
    res.end(
      `<html><head><meta charset="utf-8"><link rel="stylesheet" href="/style.css"></head><body style="font:16px sans-serif;margin:20px"><div id="root"></div>${req.url === "/panel" ? "" : `<section id="card" style="width:420px;padding:20px;background:rgb(230,246,255)"><h2>季度数据</h2><table><tr><th>项目</th><th>金额</th></tr><tr><td>收入</td><td>120</td></tr></table><pre>const a = 1;\nconsole.log(a);</pre><input id="secret" value="PRIVATE-FORM-VALUE"><button id="action" onclick="window.clicks=(window.clicks||0)+1">页面按钮</button></section><div id="tall" style="margin-top:30px;height:1100px;width:400px;background:#def">超出视口的元素</div>`}<script src="/bundle.js"></script></body></html>`,
    );
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address() as { port: number };
  const url = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
      "/usr/lib/chromium/chromium",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1000, height: 800 },
    deviceScaleFactor: 2,
  });
  const content = await context.newPage(),
    panel = await context.newPage();
  await panel.setViewportSize({width:460,height:900});
  let captures = 0;
  await content.exposeFunction("captureViewport", async () => {
    captures++;
    return `data:image/png;base64,${(await content.screenshot()).toString("base64")}`;
  });
  await content.exposeFunction("forwardFocus", async (request: any) => {
    await panel.evaluate(
      (req) => (window as any).deliver(req, { tab: { id: 7 } }),
      request,
    );
  });
  await panel.exposeFunction("forwardToContent", async (request: any) =>
    content.evaluate((req) => (window as any).deliver(req), request),
  );
  try {
    await content.goto(url);
    const bounded = await content.evaluate(() => {
      const root = document.createElement("pre"); root.textContent = "x".repeat(9000); document.body.append(root);
      const result = (window as any).extractElementText(root); root.remove(); return result;
    });
    expect(bounded.truncated).toBe(true); expect(bounded.text.length).toBeLessThanOrEqual(8000);

    await panel.goto(url + "/panel");
    await content.bringToFront();
    await panel.getByRole("button", { name: "选择网页元素" }).click();

    await content.locator("#action").click();
    expect(await content.evaluate(() => (window as any).clicks || 0)).toBe(0);
    await content.keyboard.press("Escape");
    await content.locator("#card h2").hover();
    await expect(content.locator(".box.focus")).toHaveCount(1);
    await content.locator("#card h2").click();
    await content.getByRole("button", { name: "扩大父级" }).click();
    await content.getByRole("button", { name: "返回上一层" }).click();
    await content.getByRole("button", { name: "扩大父级" }).click();
    await content.getByPlaceholder("想问 AI 什么？").fill("解释表格和代码");
    await content.screenshot({path:testInfo.outputPath("selection-input.png")});
    await content.getByRole("button", { name: "加入待发送" }).click();
    await expect(panel.getByLabel("标记1的问题")).toHaveValue("解释表格和代码");
    expect(captures).toBe(1);
    expect(await panel.evaluate(() => (window as any).sent)).toBeUndefined();
    await content.locator(".dot").hover();
    await expect(panel.locator("article")).toHaveClass("focused");
    await panel.locator("article").hover();
    await expect(content.locator(".box.focus")).toHaveCount(1);
    await panel.getByText("查看实际发送快照", { exact: false }).click();
    const image = await panel.locator("img").getAttribute("src");
    writeFileSync(testInfo.outputPath("actual-cropped-snapshot.png"), Buffer.from(image!.split(",")[1], "base64"));
    await expect(panel.locator("pre")).toContainText(
      "const a = 1;\nconsole.log(a);",
    );
    await expect(panel.locator("pre")).not.toContainText("PRIVATE-FORM-VALUE");
    const inputRect = await content.locator("#secret").boundingBox();
    const cardRect = await content.locator("#card").boundingBox();
    const pixels = await panel.evaluate(
      async ({ image, x, y }) => {
        const img = new Image();
        img.src = image!;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        return {
          width: img.width,
          height: img.height,
          pixel: [...ctx.getImageData(x, y, 1, 1).data],
          corner: [...ctx.getImageData(4, 4, 1, 1).data],
        };
      },
      {
        image,
        x: Math.round((inputRect!.x - cardRect!.x + 10) * 2),
        y: Math.round((inputRect!.y - cardRect!.y + 10) * 2),
      },
    );
    expect(pixels.width).toBe(cardRect!.width * 2);
    expect(pixels.pixel).toEqual([119, 119, 119, 255]);
    expect(pixels.corner).toEqual([230, 246, 255, 255]);
    await content.screenshot({ path: testInfo.outputPath("marked-page.png") });
    await panel.screenshot({
      path: testInfo.outputPath("snapshot-preview.png"),
    });

    await panel.getByLabel("标记1的问题").fill("比较收入");
    await panel.getByRole("button", { name: /发送给AI/ }).click();
    await expect
      .poll(() => panel.evaluate(() => (window as any).sent))
      .toBeTruthy();
    const sent = await panel.evaluate(() => (window as any).sent);
    expect(sent[0].content).toContainEqual({
      type: "image_url",
      image_url: { url: image },
    });
    expect(JSON.stringify(sent)).toContain("比较收入");

    await panel.reload();
    const restored = await panel.evaluate(() => (window as any).followup());
    expect(JSON.stringify(restored)).toContain(image!);
    expect(restored.at(-1).content).toBe("继续解释");

    await content.locator("#action").click();
    expect(await content.evaluate(() => (window as any).clicks)).toBe(1);
    // A second mark is clipped honestly; scrolling cannot change the saved snapshot.
    await panel.getByRole("button", { name: "选择网页元素" }).click();
    await content.bringToFront();
    await content
      .locator("#tall")
      .evaluate((el) => el.scrollIntoView({ block: "start" }));
    await content.mouse.click(80, 100);
    await content.getByPlaceholder("想问 AI 什么？").fill("解释长区域");
    await content.getByRole("button", { name: "加入待发送" }).click();
    await expect(panel.getByLabel("标记2的问题")).toBeVisible();
    await panel.locator("article").nth(1).locator("summary").click();
    await expect(panel.locator("article").nth(1).locator("pre")).toContainText(
      "部分元素（超出视口）",
    );
    await content.locator("#card").evaluate((el) => el.remove());
    await expect(
      panel.getByText("目标已失效，请删除后重新选择。快照仍是原内容。"),
    ).toBeVisible();
    await expect(panel.getByRole("button", { name: /发送给AI/ })).toBeEnabled();
    await content.locator("#tall").evaluate((el) => el.remove());
    await expect(
      panel.getByRole("button", { name: /发送给AI/ }),
    ).toBeDisabled();
    await panel
      .locator("article")
      .first()
      .getByRole("button", { name: "删除标记" })
      .click();
    await expect(panel.locator("article")).toHaveCount(1);
    await content.keyboard.press("Escape");
    await expect(
      content.getByText("选择元素 · Esc 取消", { exact: false }),
    ).toHaveCount(0);
    await content.evaluate(() => (window as any).destroyPicker());
    await expect(content.locator("#humantext-element-picker")).toHaveCount(0);
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
  }
});
