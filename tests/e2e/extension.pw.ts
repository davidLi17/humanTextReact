import { expect, test as base, chromium, type BrowserContext } from "@playwright/test";
import { access, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GENUI_SYSTEM_PROMPT } from "../../entrypoints/shared/genui/prompt";
import type { ChatSession } from "../../entrypoints/shared/chatTypes";

interface RecordedModelRequest {
  authorization?: string;
  body: any;
}

interface LocalFixtureServer {
  baseUrl: string;
  modelRequests: RecordedModelRequest[];
  genUiControl: { delayMs: number; finish: "normal" | "truncated" | "interrupted" };
  close(): Promise<void>;
}

interface ExtensionHarness {
  context: BrowserContext;
  extensionId: string;
  server: LocalFixtureServer;
  unexpectedExternalRequests: string[];
}

const SELECTED_TEXT = "对齐颗粒度并形成增长飞轮";
const CONTEXTUAL_PARAGRAPH = `项目讨论时，${SELECTED_TEXT}，这样可以避免协作双方对目标理解不一致。`;
const GENUI_FALLBACK = "项目由 src 目录组织，按钮组件位于 src/components/Button.tsx。此示例帮助理解目录与文件的父子关系。";
const GENUI_FIXTURE = {
  version: 1,
  fallbackText: GENUI_FALLBACK,
  spec: {
    root: "card",
    elements: {
      card: { type: "Card", props: { title: "目录结构讲解" }, children: ["tree", "steps"] },
      tree: { type: "TreeInspector", props: { nodes: [
        { id: "src", label: "src", parentId: null, description: "项目源代码目录。" },
        { id: "components", label: "src/components", parentId: "src", description: "存放可复用组件。" },
        { id: "button", label: "src/components/Button.tsx", parentId: "components", description: "按钮组件，属于 components 目录。" },
      ] }, children: [] },
      steps: { type: "StepViewer", props: { steps: [
        { id: "one", title: "先看目录", description: "查看 src 下的组织方式。" },
        { id: "two", title: "再看组件", description: "点击按钮组件查看父子关系。" },
      ] }, children: [] },
    },
  },
};
const VERNACULAR_EXPLANATION = "把合作细节统一好，再让增长持续循环起来。";

function longArticleHtml() {
  const paragraphs = Array.from({ length: 560 }, (_, index) =>
    `<p>第 ${index + 1} 段阶段三长文正文：围绕用户价值、交付节奏和反馈闭环展开，保留唯一段落序号以验证真实分段恢复和继续通读流程。${
      index === 559 ? "末段唯一标记：只应在用户选中末段后进入真实模型请求。" : ""
    }</p>`
  ).join("");
  return `<!doctype html>
    <html lang="zh-CN">
      <head><meta charset="utf-8"><title>阶段三长文</title></head>
      <body><article><h1>阶段三长文</h1>${paragraphs}</article></body>
    </html>`;
}

async function startFixtureServer(): Promise<LocalFixtureServer> {
  const modelRequests: RecordedModelRequest[] = [];
  const genUiControl: LocalFixtureServer["genUiControl"] = { delayMs: 0, finish: "normal" };
  const server = createServer(async (request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      });
      response.end();
      return;
    }

    if (url.pathname === "/article") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(`<!doctype html>
        <html lang="zh-CN">
          <head>
            <meta charset="utf-8">
            <title>阶段三本地文章</title>
            <style>#selection { font-size: 20px; line-height: 1.8; }</style>
          </head>
          <body>
            <main>
              <h1>阶段三本地文章</h1>
              <p id="selection">项目讨论时，<span id="selection-text">${SELECTED_TEXT}</span>，这样可以避免协作双方对目标理解不一致。</p>
              <p>这是完全由本地测试服务提供的文章，不访问外部内容。</p>
            </main>
          </body>
        </html>`);
      return;
    }

    if (url.pathname === "/long-article") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(longArticleHtml());
      return;
    }

    if (url.pathname === "/v1/chat/completions" && request.method === "POST") {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      modelRequests.push({
        authorization: request.headers.authorization,
        body,
      });
      if (body.messages?.[0]?.content === GENUI_SYSTEM_PROMPT) {
        const raw = JSON.stringify(GENUI_FIXTURE);
        const mode = { ...genUiControl };
        response.writeHead(200, {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
          "Content-Type": "text/event-stream; charset=utf-8",
        });
        const delta = (content: string, finish_reason: string | null = null) =>
          `data: ${JSON.stringify({ choices: [{ delta: { content, reasoning_content: "GENUI_PRIVATE_REASONING" }, finish_reason }] })}\n\n`;
        response.write(delta(raw.slice(0, 64)));
        if (mode.delayMs) await new Promise(resolveDelay => setTimeout(resolveDelay, mode.delayMs));
        response.write(delta(raw.slice(64), mode.finish === "normal" ? "stop" : mode.finish === "truncated" ? "length" : null));
        response.end(mode.finish === "interrupted" ? "" : "data: [DONE]\n\n");
        return;
      }
      const serialized = JSON.stringify(body);
      const groundedSegmentIndex = Number(
        serialized.match(/【原文第 (\d+) 段｜/)?.[1] || 1
      );
      const content = serialized.includes("【对话主线回顾任务 v1】")
        ? [
            "## 当前目标",
            "让本周交付按时完成。",
            "",
            "## 已确认结论",
            "责任边界需要明确。",
            "",
            "## 未解决问题",
            "验收时间尚未确定。",
            "",
            "## 下一步",
            "今天确认验收时间并同步负责人。",
          ].join("\n")
        : serialized.includes("human-text-evidence:v1")
        ? [
            "围绕末段的交付信号优先推进验证。[依据:E1]",
            "",
            "<!-- human-text-evidence:v1",
            JSON.stringify({
              citations: [{
                id: "E1",
                segmentIndex: groundedSegmentIndex,
                quote: "末段唯一标记：只应在用户选中末段后进入真实模型请求。",
              }],
            }),
            "-->",
          ].join("\n")
        : serialized.includes("【续读进度】: 第 2 段")
        ? "本地长文第二段结果"
        : serialized.includes("阶段三长文")
        ? "本地长文首段结果"
        : [
            "### 🍼 直白人话版",
            `本地浮窗翻译结果：${VERNACULAR_EXPLANATION}`,
            "### 👔 向上汇报版",
            "统一协同颗粒度并构建增长闭环。",
            "### 🔪 犀利真相版",
            "先把责任边界说清楚，再谈增长。",
          ].join("\n");

      response.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
        "Content-Type": "text/event-stream; charset=utf-8",
      });
      response.write(
        `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`
      );
      response.end("data: [DONE]\n\n");
      return;
    }

    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", () => resolveListen());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("本地测试服务没有获得 TCP 端口");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    modelRequests,
    genUiControl,
    close: () =>
      new Promise<void>((resolveClose, rejectClose) => {
        server.close((error) => (error ? rejectClose(error) : resolveClose()));
      }),
  };
}

async function configureExtension(
  harness: Pick<ExtensionHarness, "context" | "extensionId" | "server">
) {
  const page = await harness.context.newPage();
  await page.goto(`chrome-extension://${harness.extensionId}/options.html`);
  await page.evaluate(async (baseUrl) => {
    const chromeApi = (globalThis as any).chrome;
    await chromeApi.storage.local.clear();
    await chromeApi.storage.sync.clear();
    await chromeApi.storage.sync.set({
      settings: {
        apiKey: "fixture-only-key",
        baseUrl: `${baseUrl}/v1/chat/completions`,
        model: "fixture-model",
        temperature: 0,
        promptTemplate: "只返回本地测试内容",
        thinkingEnabled: false,
        showSelectionToolbar: true,
        logLevel: "off",
        theme: "light",
        fontScalePercent: 100,
      },
    });
    await chromeApi.storage.local.set({ fontScalePercent: 100 });
  }, harness.server.baseUrl);
  await page.close();
}

async function patchExtensionSettings(
  harness: Pick<ExtensionHarness, "context" | "extensionId">,
  patch: Record<string, unknown>
) {
  const page = await harness.context.newPage();
  await page.goto(`chrome-extension://${harness.extensionId}/options.html`);
  await page.evaluate(async (settingsPatch) => {
    const chromeApi = (globalThis as any).chrome;
    const stored = await chromeApi.storage.sync.get("settings");
    await chromeApi.storage.sync.set({
      settings: { ...stored.settings, ...settingsPatch },
    });
  }, patch);
  await page.close();
}

async function getLocalStorageValue<T>(
  harness: Pick<ExtensionHarness, "context" | "extensionId">,
  key: string
): Promise<T | undefined> {
  const page = await harness.context.newPage();
  await page.goto(`chrome-extension://${harness.extensionId}/options.html`);
  const value = await page.evaluate(async (storageKey) => {
    const chromeApi = (globalThis as any).chrome;
    const stored = await chromeApi.storage.local.get(storageKey);
    return stored[storageKey];
  }, key);
  await page.close();
  return value as T | undefined;
}

const test = base.extend<{ harness: ExtensionHarness }>({
  harness: async ({}, use, testInfo) => {
    const extensionPath = resolve(".output/chrome-mv3");
    await access(join(extensionPath, "manifest.json"));
    const userDataDir = await mkdtemp(join(tmpdir(), "humantext-e2e-"));
    const server = await startFixtureServer();
    let context: BrowserContext | undefined;
    let tracingStarted = false;

    try {
      context = await chromium.launchPersistentContext(userDataDir, {
        channel: "chromium",
        ignoreDefaultArgs: ["--disable-extensions"],
        ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
        headless: true,
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
          // Enables CDP toolbar action automation only in this disposable test profile.
          "--enable-unsafe-extension-debugging",
          "--disable-background-networking",
          "--disable-component-update",
          "--no-first-run",
        ],
      });
      await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
      tracingStarted = true;

      const unexpectedExternalRequests: string[] = [];
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (
          (url.protocol === "http:" || url.protocol === "https:") &&
          url.hostname !== "127.0.0.1" &&
          url.hostname !== "localhost"
        ) {
          unexpectedExternalRequests.push(url.href);
          await route.abort("blockedbyclient");
          return;
        }
        await route.continue();
      });

      let serviceWorker = context.serviceWorkers()[0];
      if (!serviceWorker) serviceWorker = await context.waitForEvent("serviceworker");
      const extensionId = new URL(serviceWorker.url()).hostname;
      const harness = { context, extensionId, server, unexpectedExternalRequests };
      await configureExtension(harness);
      await use(harness);
    } finally {
      try {
        const failed = testInfo.status !== testInfo.expectedStatus;
        if (context && failed) {
          for (const [index, page] of context.pages().entries()) {
            const screenshotPath = testInfo.outputPath(
              `failure-page-${index + 1}.png`
            );
            try {
              await page.screenshot({ path: screenshotPath, fullPage: true });
              await testInfo.attach(`failure-page-${index + 1}`, {
                path: screenshotPath,
                contentType: "image/png",
              });
            } catch {
              // 页面可能已由测试关闭；继续保存其他页面和 Trace。
            }
          }
        }
        if (context && tracingStarted) {
          if (failed) {
            const tracePath = testInfo.outputPath("trace.zip");
            await context.tracing.stop({ path: tracePath });
            await testInfo.attach("trace", {
              path: tracePath,
              contentType: "application/zip",
            });
          } else {
            await context.tracing.stop();
          }
        }
      } finally {
        try {
          await context?.close();
        } finally {
          try {
            await server.close();
          } finally {
            await rm(userDataDir, { recursive: true, force: true });
          }
        }
      }
    }
  },
});

async function createVisibleRangeSelection(page: import("@playwright/test").Page) {
  await expect(page.locator("#translator-popup-style")).toHaveCount(1);
  await page.locator("#selection").evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector("#selection-text") || element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });
  await expect(page.locator(".translator-action-bar")).toBeVisible();
}

test("设置段落说明可悬停、键盘阅读，窄屏和暗色主题保持可见", async ({ harness }) => {
  const page = await harness.context.newPage();
  await page.goto(`chrome-extension://${harness.extensionId}/options.html`);
  const help = page.getByRole("button", { name: "查看段落解释发送的信息和示例" });
  await help.hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText("2. 具体例子");
  await tooltip.hover();
  await expect(tooltip).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(tooltip).toHaveCount(0);
  await help.focus();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await help.blur();
  await help.focus();
  await expect(tooltip).toBeVisible();
  const bounds = await tooltip.boundingBox();
  expect(bounds).toBeTruthy();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
});

test("默认开启的段落解释在划词工具条点击后直接发送一次带上下文的请求", async ({ harness }, testInfo) => {
  const article = await harness.context.newPage();
  await article.goto(`${harness.server.baseUrl}/article`);
  await createVisibleRangeSelection(article);

  await article.getByRole("button", { name: "浮窗翻译" }).click();
  await expect(article.locator(".translator-popup")).toBeVisible();
  await expect(article.locator(".translator-translated-text")).toContainText(
    "本地浮窗翻译结果"
  );
  await expect.poll(() => harness.server.modelRequests.length).toBe(1);

  const request = harness.server.modelRequests[0];
  expect(request.authorization).toBe("Bearer fixture-only-key");
  const requestMessages = JSON.stringify(request.body.messages);
  expect(requestMessages).toContain("<selected_text>");
  expect(requestMessages).toContain(SELECTED_TEXT);
  expect(requestMessages).toContain("<current_paragraph>");
  expect(requestMessages).toContain(
    "项目讨论时"
  );
  expect(requestMessages).toContain(
    "这样可以避免协作双方对目标理解不一致。"
  );
  const screenshotPath = testInfo.outputPath("contextual-selection-direct.png");
  await article.screenshot({ path: screenshotPath, fullPage: true });
  await testInfo.attach("contextual-selection-direct", {
    path: screenshotPath,
    contentType: "image/png",
  });
  expect(harness.unexpectedExternalRequests).toEqual([]);
});

test("Alt/Option+D 在开启时携带段落，关闭后只发送选中文字", async ({ harness }) => {
  const contextualArticle = await harness.context.newPage();
  await contextualArticle.goto(`${harness.server.baseUrl}/article`);
  await createVisibleRangeSelection(contextualArticle);

  await contextualArticle.keyboard.press("Alt+d");
  await expect(contextualArticle.locator(".translator-popup")).toBeVisible();
  await expect(contextualArticle.locator(".translator-translated-text")).toContainText(
    "本地浮窗翻译结果"
  );
  await expect.poll(() => harness.server.modelRequests.length).toBe(1);
  const contextualMessages = JSON.stringify(
    harness.server.modelRequests[0].body.messages
  );
  expect(contextualMessages).toContain("<selected_text>");
  expect(contextualMessages).toContain("<current_paragraph>");
  expect(contextualMessages).toContain(SELECTED_TEXT);

  await patchExtensionSettings(harness, {
    contextualSelectionEnabled: false,
  });
  const textOnlyArticle = await harness.context.newPage();
  await textOnlyArticle.goto(`${harness.server.baseUrl}/article`);
  await createVisibleRangeSelection(textOnlyArticle);

  await textOnlyArticle.keyboard.press("Alt+d");
  await expect(textOnlyArticle.locator(".translator-popup")).toBeVisible();
  await expect(textOnlyArticle.locator(".translator-translated-text")).toContainText(
    "本地浮窗翻译结果"
  );
  await expect.poll(() => harness.server.modelRequests.length).toBe(2);
  const textOnlyRequest = harness.server.modelRequests[1];
  expect(textOnlyRequest.body.messages.at(-1)).toMatchObject({
    role: "user",
    content: SELECTED_TEXT,
  });
  expect(JSON.stringify(textOnlyRequest.body.messages)).not.toContain(
    "<current_paragraph>"
  );
  expect(harness.unexpectedExternalRequests).toEqual([]);
});

test("网页正文附加到当前会话，重开侧边栏后追问携带正文", async ({ harness }, testInfo) => {
  const article = await harness.context.newPage();
  await article.goto(`${harness.server.baseUrl}/long-article`);
  const sidepanel = await harness.context.newPage();
  // 在打开侧边栏前准备已有对话，验证附加操作保留用户当前上下文。
  await sidepanel.goto(`chrome-extension://${harness.extensionId}/options.html`);
  const session: ChatSession = {
    id: "ongoing-e2e-session",
    title: "已有对话",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [
      { id: "u1", role: "user", content: "之前的问题：如何改进交付？", createdAt: Date.now(), status: "completed" },
      { id: "a1", role: "assistant", content: "之前的回答：先收集用户反馈。", createdAt: Date.now(), status: "completed" },
    ],
  };
  await sidepanel.evaluate(async (session) => {
    await (globalThis as any).chrome.storage.local.set({
      sidepanel_chat_sessions: [session],
      sidepanel_active_session_id: session.id,
    });
  }, session);
  await sidepanel.goto(`chrome-extension://${harness.extensionId}/sidepanel.html`);
  await expect(sidepanel.getByText(session.messages[0].content, { exact: true })).toBeVisible();
  const readButton = sidepanel.getByRole("button", { name: /通读当前网页/ }).first();
  await expect(readButton).toBeEnabled();

  const readSessions = (page: import("@playwright/test").Page): Promise<ChatSession[]> =>
    page.evaluate(async () => {
      const stored = await (globalThis as any).chrome.storage.local.get("sidepanel_chat_sessions");
      return stored.sidepanel_chat_sessions || [];
    });
  await article.bringToFront();
  await readButton.evaluate((element) => (element as HTMLButtonElement).click());
  await expect.poll(async () => (await readSessions(sidepanel))[0]?.messages.length).toBe(3);
  const attachedSessions = await readSessions(sidepanel);
  expect(attachedSessions).toHaveLength(1);
  expect(attachedSessions[0].id).toBe(session.id);
  expect(attachedSessions[0].title).toBe(session.title);
  expect(attachedSessions[0].messages.slice(0, 2)).toEqual(session.messages);
  const card = attachedSessions[0].messages[2];
  expect(card.role).toBe("user");
  expect(card.status).toBe("completed");
  expect(card.pageMeta?.contextOnly).toBe(true);
  expect(card.pageMeta?.url).toBe(`${harness.server.baseUrl}/long-article`);
  expect(card.pageMeta?.sourceContent).toContain("第 1 段阶段三长文正文");
  expect(card.pageMeta?.attachedPage).toMatchObject({
    version: 1,
    selectedSegments: [1],
  });
  expect(harness.server.modelRequests).toHaveLength(0);

  // 只选末段后，重开侧边栏和真实请求都必须沿用这一持久化范围。
  const pageContextCard = sidepanel.getByLabel("网页上下文");
  await pageContextCard.getByText("预览已保存原文", { exact: true }).click();
  const segmentCheckboxes = pageContextCard.getByRole("checkbox", {
    name: /第 \d+ 段参与回答/,
  });
  const segmentCount = await segmentCheckboxes.count();
  expect(segmentCount).toBeGreaterThan(1);
  await segmentCheckboxes.nth(0).uncheck();
  await segmentCheckboxes.nth(segmentCount - 1).check();
  await expect.poll(async () => {
    const sessions = await readSessions(sidepanel);
    return sessions[0]?.messages[2]?.pageMeta?.attachedPage?.selectedSegments;
  }).toEqual([segmentCount]);
  const selectedAttachedSessions = await readSessions(sidepanel);
  await sidepanel.setViewportSize({ width: 400, height: 800 });
  await sidepanel.screenshot({
    path: testInfo.outputPath("page-context.png"),
    fullPage: true,
  });

  // 等待明确的去重反馈，避免在异步提取结束前检查消息数量。
  await expect(readButton).toBeEnabled();
  await readButton.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(sidepanel.getByText("该网页正文已在当前对话中，无需重复附加", { exact: true })).toBeVisible();
  expect(await readSessions(sidepanel)).toEqual(selectedAttachedSessions);
  expect(harness.server.modelRequests).toHaveLength(0);

  await sidepanel.close();
  const restoredSidepanel = await harness.context.newPage();
  await restoredSidepanel.goto(`chrome-extension://${harness.extensionId}/sidepanel.html`);
  await expect(restoredSidepanel.getByText(session.messages[0].content, { exact: true })).toBeVisible();
  expect(await readSessions(restoredSidepanel)).toEqual(selectedAttachedSessions);
  expect(harness.server.modelRequests).toHaveLength(0);

  const question = "结合网页正文，给出一个改进交付的建议。";
  await restoredSidepanel.getByPlaceholder("输入追问、黑话术语或指令", { exact: false }).fill(question);
  await restoredSidepanel.getByRole("button", { name: "发送", exact: true }).click();
  await expect(restoredSidepanel.getByText("本地长文首段结果", { exact: true })).toBeVisible();
  expect(harness.server.modelRequests).toHaveLength(1);
  const request = harness.server.modelRequests[0];
  expect(request.authorization).toBe("Bearer fixture-only-key");
  const messages = request.body.messages;
  expect(messages.at(-1)).toMatchObject({ role: "user", content: question });
  const history = JSON.stringify(messages);
  expect(history).toContain(session.messages[0].content);
  expect(history).toContain(session.messages[1].content);
  const pageContext = messages.find((message: { content: string }) =>
    typeof message.content === "string" && message.content.includes("【网页正文内容】")
  );
  expect(pageContext).toBeDefined();
  expect(pageContext.content).toContain("末段唯一标记：只应在用户选中末段后进入真实模型请求。");
  expect(pageContext.content).not.toContain("第 1 段阶段三长文正文");
  expect(pageContext.content).toContain("作为背景资料附加到本次对话");
  expect(pageContext.content).not.toContain("请按照系统提示词的四个板块");
  const finalSessions = await readSessions(restoredSidepanel);
  expect(finalSessions).toHaveLength(1);
  expect(finalSessions[0].id).toBe(session.id);
  expect(harness.unexpectedExternalRequests).toEqual([]);
});

test("按目标提取只用冻结选段，依据可核对且刷新后恢复", async ({ harness }, testInfo) => {
  const article = await harness.context.newPage();
  await article.goto(`${harness.server.baseUrl}/long-article`);
  const sidepanel = await harness.context.newPage();
  await sidepanel.goto(`chrome-extension://${harness.extensionId}/sidepanel.html`);
  const readButton = sidepanel.getByRole("button", { name: /通读当前网页/ }).first();
  await expect(readButton).toBeEnabled();

  const readSessions = (page: import("@playwright/test").Page): Promise<ChatSession[]> =>
    page.evaluate(async () => {
      const stored = await (globalThis as any).chrome.storage.local.get("sidepanel_chat_sessions");
      return stored.sidepanel_chat_sessions || [];
    });
  await article.bringToFront();
  await readButton.evaluate((element) => (element as HTMLButtonElement).click());
  await expect.poll(async () => (await readSessions(sidepanel))[0]?.messages.length).toBe(1);

  const pageContextCard = sidepanel.getByLabel("网页上下文");
  await pageContextCard.getByText("预览已保存原文", { exact: true }).click();
  const segmentCheckboxes = pageContextCard.getByRole("checkbox", {
    name: /第 \d+ 段参与回答/,
  });
  const segmentCount = await segmentCheckboxes.count();
  expect(segmentCount).toBeGreaterThan(1);
  await segmentCheckboxes.nth(0).uncheck();
  await segmentCheckboxes.nth(segmentCount - 1).check();
  await expect.poll(async () => {
    const sessions = await readSessions(sidepanel);
    return sessions[0]?.messages[0]?.pageMeta?.attachedPage?.selectedSegments;
  }).toEqual([segmentCount]);

  const goal = "找出本周最该推进的交付动作";
  await pageContextCard.getByLabel("这次想解决什么问题？").fill(goal);
  await pageContextCard.getByRole("button", { name: "提取对我有用的信息" }).click();
  await expect(sidepanel.getByText(/原文依据/)).toBeVisible();
  await expect.poll(() => harness.server.modelRequests.length).toBe(1);
  const request = harness.server.modelRequests[0];
  expect(request.authorization).toBe("Bearer fixture-only-key");
  expect(request.body.messages).toHaveLength(2);
  expect(request.body.messages[0].content).toContain("human-text-evidence:v1");
  expect(request.body.messages[1].content).toContain("【用户目标】");
  expect(request.body.messages[1].content).toContain(goal);
  expect(request.body.messages[1].content).toContain("末段唯一标记");
  expect(request.body.messages[1].content).not.toContain("第 1 段阶段三长文正文");

  const stored = await readSessions(sidepanel);
  const groundedUser = stored[0].messages.find((message: any) => message.groundedGoalMeta);
  expect(groundedUser).toMatchObject({
    groundedGoalMeta: expect.objectContaining({
      version: 1,
      goal,
      sourcePageMessageId: stored[0].messages[0].id,
      sourceSnapshotFingerprint: expect.any(String),
    }),
  });
  if (!groundedUser?.groundedGoalMeta) {
    throw new Error("目标提取用户消息没有持久化冻结来源");
  }
  expect(groundedUser.groundedGoalMeta.selectedSegments.map((segment: any) => segment.index)).toEqual([segmentCount]);
  await expect(sidepanel.getByText(/human-text-evidence:v1/)).toHaveCount(0);

  const evidenceButton = sidepanel.getByRole("button", {
    name: `查看第 ${segmentCount} 段原文`,
  });
  await evidenceButton.click();
  await expect(sidepanel.locator("mark")).toContainText("末段唯一标记");
  // 引文可能在很长的保存段落中靠后；仅渲染 mark 还不够，必须滚进 pre 的裁剪可视区域。
  await expect.poll(() => sidepanel.locator(".grounded-evidence-panel pre").evaluate((pre) => {
    const mark = pre.querySelector("mark");
    if (!mark) return false;
    const preRect = pre.getBoundingClientRect();
    const markRect = mark.getBoundingClientRect();
    const visibleHeight = Math.min(markRect.bottom, preRect.bottom) -
      Math.max(markRect.top, preRect.top);
    return (
      markRect.top >= preRect.top - 1 &&
      markRect.bottom <= preRect.bottom + 1 &&
      visibleHeight >= markRect.height - 1
    );
  })).toBe(true);
  // 截图也应直接呈现高亮，而非被侧栏的固定输入区遮住。
  await sidepanel.locator("mark").scrollIntoViewIfNeeded();
  const screenshotPath = testInfo.outputPath("grounded-goal-evidence.png");
  await sidepanel.screenshot({ path: screenshotPath, fullPage: true });
  await testInfo.attach("grounded-goal-evidence", {
    path: screenshotPath,
    contentType: "image/png",
  });

  await sidepanel.close();
  const restoredSidepanel = await harness.context.newPage();
  await restoredSidepanel.goto(`chrome-extension://${harness.extensionId}/sidepanel.html`);
  await expect(restoredSidepanel.getByText(/原文依据/)).toBeVisible();
  await expect(
    restoredSidepanel.getByRole("button", { name: `查看第 ${segmentCount} 段原文` })
  ).toBeVisible();
  expect(await readSessions(restoredSidepanel)).toEqual(stored);
  expect(harness.unexpectedExternalRequests).toEqual([]);
});

test("回顾对话主线只请求当前会话，四节结果和覆盖范围刷新后恢复", async ({ harness }, testInfo) => {
  const sidepanel = await harness.context.newPage();
  await sidepanel.goto(`chrome-extension://${harness.extensionId}/options.html`);
  const now = Date.now();
  const currentSession: ChatSession = {
    id: "recap-e2e-current",
    title: "当前回顾会话",
    createdAt: now,
    updatedAt: now + 4,
    messages: [
      {
        id: "recap-e2e-user",
        role: "user",
        content: "当前目标是让本周交付按时完成",
        createdAt: now,
        status: "completed",
      },
      {
        id: "recap-e2e-answer-one",
        role: "assistant",
        content: "已经确认需要明确每个人的责任边界。",
        createdAt: now + 1,
        status: "completed",
      },
      {
        id: "recap-e2e-page",
        role: "user",
        content: "通读网页: 《F3 回顾来源》",
        pageMeta: {
          title: "F3 回顾来源网页标题",
          url: `${harness.server.baseUrl}/long-article`,
          isWebPageReading: true,
          contextOnly: true,
          sourceContent: "F3网页正文绝不能重复进入回顾请求",
          attachedPage: {
            version: 1,
            content: "F3网页正文绝不能重复进入回顾请求",
            capturedChars: 20,
            hasMoreContent: false,
            selectedSegments: [1],
          },
        },
        createdAt: now + 2,
        status: "completed",
      },
      {
        id: "recap-e2e-answer-two",
        role: "assistant",
        content: "尚未确认验收时间，需要下一步跟进。",
        createdAt: now + 3,
        status: "completed",
      },
    ],
  };
  const otherSession: ChatSession = {
    id: "recap-e2e-other",
    title: "另一会话",
    createdAt: now,
    updatedAt: now,
    messages: [{
      id: "recap-e2e-other-user",
      role: "user",
      content: "另一会话绝不进入当前回顾请求",
      createdAt: now,
      status: "completed",
    }],
  };
  await sidepanel.evaluate(async ({ currentSession, otherSession }) => {
    await (globalThis as any).chrome.storage.local.set({
      sidepanel_chat_sessions: [currentSession, otherSession],
      sidepanel_active_session_id: currentSession.id,
    });
  }, { currentSession, otherSession });
  await sidepanel.goto(`chrome-extension://${harness.extensionId}/sidepanel.html`);
  await sidepanel.setViewportSize({ width: 380, height: 800 });
  await expect(sidepanel.getByText("当前目标是让本周交付按时完成", { exact: true })).toBeVisible();

  const readSessions = (page: import("@playwright/test").Page): Promise<ChatSession[]> =>
    page.evaluate(async () => {
      const stored = await (globalThis as any).chrome.storage.local.get("sidepanel_chat_sessions");
      return stored.sidepanel_chat_sessions || [];
    });
  const recapButton = sidepanel.getByRole("button", { name: "回顾对话主线" });
  await expect(recapButton).toBeVisible();
  await recapButton.click();
  await expect(sidepanel.getByText("当前目标", { exact: true })).toBeVisible();
  await expect(sidepanel.getByText("已确认结论", { exact: true })).toBeVisible();
  await expect(sidepanel.getByText("未解决问题", { exact: true })).toBeVisible();
  await expect(sidepanel.getByText("下一步", { exact: true })).toBeVisible();
  await expect(sidepanel.locator(".conversation-recap-scope")).toHaveText(
    /本次覆盖\s*4\/4\s*条消息/
  );
  await expect.poll(() => sidepanel.evaluate(() =>
    document.documentElement.scrollWidth <= window.innerWidth
  )).toBe(true);
  await expect.poll(() => harness.server.modelRequests.length).toBe(1);
  const request = harness.server.modelRequests[0];
  expect(request.authorization).toBe("Bearer fixture-only-key");
  expect(request.body.messages).toHaveLength(2);
  expect(request.body.messages[0].content).toContain("【对话主线回顾任务 v1】");
  expect(request.body.messages[1].content).toContain("【覆盖信息】");
  expect(request.body.messages[1].content).toContain("【本次覆盖的当前会话文字】");
  const requestText = JSON.stringify(request.body.messages);
  expect(requestText).toContain("当前目标是让本周交付按时完成");
  expect(requestText).toContain("F3 回顾来源网页标题");
  expect(requestText).not.toContain("F3网页正文绝不能重复进入回顾请求");
  expect(requestText).not.toContain("另一会话绝不进入当前回顾请求");

  const stored = await readSessions(sidepanel);
  const recapUser = stored[0].messages.find((message: any) => message.conversationRecapMeta);
  expect(recapUser).toMatchObject({
    role: "user",
    content: "回顾对话主线",
    conversationRecapMeta: expect.objectContaining({
      version: 1,
      totalMessageCount: 4,
      coveredMessageCount: 4,
      truncated: false,
      sourceMessageIds: expect.arrayContaining([
        "recap-e2e-user",
        "recap-e2e-answer-one",
        "recap-e2e-page",
        "recap-e2e-answer-two",
      ]),
    }),
  });

  const screenshotPath = testInfo.outputPath("conversation-recap.png");
  await sidepanel.screenshot({ path: screenshotPath, fullPage: true });
  await testInfo.attach("conversation-recap", {
    path: screenshotPath,
    contentType: "image/png",
  });
  await sidepanel.close();
  const restoredSidepanel = await harness.context.newPage();
  await restoredSidepanel.goto(`chrome-extension://${harness.extensionId}/sidepanel.html`);
  await expect(restoredSidepanel.locator("main")).toContainText(
    "今天确认验收时间并同步负责人。"
  );
  await expect(restoredSidepanel.locator(".conversation-recap-scope")).toHaveText(
    /本次覆盖\s*4\/4\s*条消息/
  );
  expect(await readSessions(restoredSidepanel)).toEqual(stored);
  expect(harness.unexpectedExternalRequests).toEqual([]);
});

test("浮窗收藏可编辑直白释义并保存真实选区来源", async ({ harness }, testInfo) => {
  await patchExtensionSettings(harness, {
    theme: "dark",
  });
  const article = await harness.context.newPage();
  await article.goto(`${harness.server.baseUrl}/article`);
  await createVisibleRangeSelection(article);

  await article.getByRole("button", { name: "浮窗翻译" }).click();
  await expect(article.locator(".translator-popup")).toBeVisible();
  await expect(
    article.getByRole("button", { name: "结合本段解释" })
  ).toBeHidden();
  await expect(
    article.getByRole("button", { name: "仅解释选中文字" })
  ).toBeHidden();
  await expect(article.locator(".translator-translated-text")).toContainText(
    VERNACULAR_EXPLANATION
  );
  await expect.poll(() => harness.server.modelRequests.length).toBe(1);

  await article.getByRole("button", { name: "存入生词本" }).click();
  const editor = article.getByTestId("translator-jargon-editor");
  await expect(editor).toBeVisible();
  await expect(editor.getByLabel("术语")).toHaveValue(SELECTED_TEXT);
  await expect(editor.getByLabel("人话释义")).toHaveValue(
    `本地浮窗翻译结果：${VERNACULAR_EXPLANATION}`
  );
  await expect(editor.getByLabel("原句或提问")).toHaveValue(
    CONTEXTUAL_PARAGRAPH
  );
  await expect(editor.getByLabel("来源链接")).toHaveValue(article.url());

  await editor.getByLabel("术语").fill("增长飞轮协同");
  await editor.getByLabel("人话释义").fill("先统一合作细节，再持续推动增长。");
  const screenshotPath = testInfo.outputPath("jargon-save.png");
  await editor.screenshot({ path: screenshotPath });
  await testInfo.attach("jargon-save", {
    path: screenshotPath,
    contentType: "image/png",
  });
  await editor.getByTitle("保存到生词本").click();
  await expect(article.getByRole("button", { name: "存入生词本" })).toHaveText(
    "已收藏 ✓"
  );

  await expect
    .poll(async () => {
      const items = await getLocalStorageValue<any[]>(harness, "jargon_vault_items");
      return items?.[0];
    })
    .toMatchObject({
      term: "增长飞轮协同",
      explanation: "先统一合作细节，再持续推动增长。",
      sourceContext: CONTEXTUAL_PARAGRAPH,
      sourceUrl: article.url(),
    });
  expect(harness.unexpectedExternalRequests).toEqual([]);
});

test("会话搜索定位旧回答并保留原会话草稿，不触发模型请求", async ({ harness }, testInfo) => {
  const now = Date.now();
  const originalSession: ChatSession = {
    id: "session-search-original",
    title: "原会话",
    createdAt: now,
    updatedAt: now + 1,
    messages: [
      {
        id: "original-question",
        role: "user",
        content: "原会话的历史问题",
        createdAt: now,
        status: "completed",
      },
    ],
  };
  const targetIndex = 9;
  const targetMessageId = "session-search-target-answer";
  const targetSession: ChatSession = {
    id: "session-search-target",
    title: "目标会话",
    createdAt: now + 2,
    updatedAt: now + 40,
    messages: Array.from({ length: 24 }, (_, index) => ({
      id: index === targetIndex ? targetMessageId : `target-message-${index}`,
      role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content:
        index === targetIndex
          ? "旧回答中的 session-search-e2e-target 命中词。"
          : `目标会话的历史消息 ${index}，用于验证定位后仍有足够的后续内容。`,
      createdAt: now + 3 + index,
      status: "completed" as const,
    })),
  };

  const setup = await harness.context.newPage();
  await setup.goto(`chrome-extension://${harness.extensionId}/options.html`);
  await setup.evaluate(
    async ({ sessions, activeSessionId }) => {
      await (globalThis as any).chrome.storage.local.set({
        sidepanel_chat_sessions: sessions,
        sidepanel_active_session_id: activeSessionId,
      });
    },
    {
      sessions: [originalSession, targetSession],
      activeSessionId: originalSession.id,
    }
  );
  await setup.close();

  const sidepanel = await harness.context.newPage();
  await sidepanel.setViewportSize({ width: 420, height: 720 });
  await sidepanel.goto(`chrome-extension://${harness.extensionId}/sidepanel.html`);
  const composer = sidepanel.getByPlaceholder("输入追问、黑话术语或指令", {
    exact: false,
  });
  await expect(composer).toBeVisible();
  await composer.fill("原会话暂存草稿");

  await sidepanel.getByTitle("会话与生词本抽屉").click();
  const searchInput = sidepanel.getByTestId("session-search-input");
  await expect(searchInput).toBeVisible();
  await searchInput.fill("session-search-e2e-target");
  const result = sidepanel.getByTestId("session-search-result").first();
  await expect(result).toHaveAttribute("data-session-id", targetSession.id);
  await expect(result).toHaveAttribute("data-message-id", targetMessageId);
  await result.click();

  const chatContent = sidepanel.locator(".chat-content");
  const target = sidepanel.locator(
    `[data-message-id="${targetMessageId}"]`
  );
  await expect(target).toBeVisible();
  await expect(target).toHaveAttribute("data-search-highlighted", "true");
  const readScrollMetrics = () => chatContent.evaluate((element, messageId) => {
    const container = element as HTMLElement;
    const targetElement = container.querySelector<HTMLElement>(
      `[data-message-id="${messageId}"]`
    );
    if (!targetElement) throw new Error("目标消息没有出现在消息流中");
    const targetRect = targetElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return {
      scrollTop: container.scrollTop,
      maxScrollTop: Math.max(0, container.scrollHeight - container.clientHeight),
      targetTop: targetRect.top,
      targetBottom: targetRect.bottom,
      containerTop: containerRect.top,
      containerBottom: containerRect.bottom,
    };
  }, targetMessageId);
  await expect
    .poll(
      async () => {
        const metrics = await readScrollMetrics();
        return (
          metrics.targetTop > metrics.containerTop &&
          metrics.targetBottom < metrics.containerBottom &&
          metrics.maxScrollTop - metrics.scrollTop > 80
        );
      },
      { timeout: 4000, intervals: [100, 250, 500] }
    )
    .toBe(true);
  const centeredMetrics = await readScrollMetrics();
  expect(centeredMetrics.targetTop).toBeGreaterThan(centeredMetrics.containerTop);
  expect(centeredMetrics.targetBottom).toBeLessThan(centeredMetrics.containerBottom);
  expect(centeredMetrics.maxScrollTop - centeredMetrics.scrollTop).toBeGreaterThan(80);

  await sidepanel.screenshot({
    path: testInfo.outputPath("session-search.png"),
    fullPage: true,
  });

  await sidepanel.getByTitle("会话与生词本抽屉").click();
  await sidepanel.locator(".drawer-item").filter({ hasText: "原会话" }).click();
  await expect(composer).toHaveValue("原会话暂存草稿");
  expect(harness.server.modelRequests).toHaveLength(0);
  expect(harness.unexpectedExternalRequests).toEqual([]);
});

test("字体设置通过 Storage 事件同步三个扩展页面和 Content 浮层", async ({ harness }) => {
  const article = await harness.context.newPage();
  await article.goto(`${harness.server.baseUrl}/article`);
  await createVisibleRangeSelection(article);
  await article.getByRole("button", { name: "浮窗翻译" }).click();
  await expect(article.locator(".translator-popup")).toBeVisible();
  await expect(article.locator(".translator-translated-text")).toContainText(
    "本地浮窗翻译结果"
  );
  const options = await harness.context.newPage();
  const sidepanel = await harness.context.newPage();
  const popup = await harness.context.newPage();
  await Promise.all([
    options.goto(`chrome-extension://${harness.extensionId}/options.html`),
    sidepanel.goto(`chrome-extension://${harness.extensionId}/sidepanel.html`),
    popup.goto(`chrome-extension://${harness.extensionId}/popup.html`),
  ]);

  const readScale = (page: import("@playwright/test").Page) =>
    page.evaluate(() =>
      document.documentElement.style.getPropertyValue("--ht-font-scale")
    );
  const hostFontBefore = await article
    .locator("#selection")
    .evaluate((element) => getComputedStyle(element).fontSize);
  const actionFontBefore = await article
    .locator(".translator-action-text")
    .first()
    .evaluate((element) => getComputedStyle(element).fontSize);
  const translationPopupFontBefore = await article
    .locator(".translator-translated-text")
    .evaluate((element) => getComputedStyle(element).fontSize);

  await options.getByRole("button", { name: "增大扩展字体" }).click();
  await expect.poll(() => readScale(options)).toBe("1.1");
  await expect.poll(() => readScale(sidepanel)).toBe("1.1");
  await expect.poll(() => readScale(popup)).toBe("1.1");
  await expect
    .poll(() =>
      article.locator(".translator-action-bar").evaluate((element) =>
        (element as HTMLElement).style.getPropertyValue("--ht-font-scale")
      )
    )
    .toBe("1.1");
  await expect
    .poll(() =>
      article.locator(".translator-popup").evaluate((element) =>
        (element as HTMLElement).style.getPropertyValue("--ht-font-scale")
      )
    )
    .toBe("1.1");

  const actionFontAfter = await article
    .locator(".translator-action-text")
    .first()
    .evaluate((element) => getComputedStyle(element).fontSize);
  expect(Number.parseFloat(actionFontAfter)).toBeGreaterThan(
    Number.parseFloat(actionFontBefore)
  );
  const translationPopupFontAfter = await article
    .locator(".translator-translated-text")
    .evaluate((element) => getComputedStyle(element).fontSize);
  expect(Number.parseFloat(translationPopupFontAfter)).toBeGreaterThan(
    Number.parseFloat(translationPopupFontBefore)
  );
  await expect
    .poll(() =>
      article
        .locator("#selection")
        .evaluate((element) => getComputedStyle(element).fontSize)
    )
    .toBe(hostFontBefore);

  await sidepanel.getByRole("button", { name: "增大扩展字体" }).click();
  await expect.poll(() => readScale(options)).toBe("1.2");
  await expect.poll(() => readScale(popup)).toBe("1.2");

  await popup.keyboard.press("Meta+0");
  await expect.poll(() => readScale(options)).toBe("1");
  await expect.poll(() => readScale(sidepanel)).toBe("1");
  await expect.poll(() => readScale(popup)).toBe("1");
  await expect
    .poll(() =>
      article.locator(".translator-action-bar").evaluate((element) =>
        (element as HTMLElement).style.getPropertyValue("--ht-font-scale")
      )
    )
    .toBe("1");
  await expect
    .poll(() =>
      article.locator(".translator-popup").evaluate((element) =>
        (element as HTMLElement).style.getPropertyValue("--ht-font-scale")
      )
    )
    .toBe("1");
  expect(harness.unexpectedExternalRequests).toEqual([]);
});

async function openGenUiSource(harness: ExtensionHarness) {
  const page = await harness.context.newPage();
  await page.goto(`chrome-extension://${harness.extensionId}/options.html`);
  const now = Date.now();
  const session: ChatSession = {
    id: "genui-browser-session", title: "目录结构解释", createdAt: now, updatedAt: now,
    messages: [
      {id:"genui-source-user",role:"user",content:"解释 src/components/Button.tsx 与目录的关系。",createdAt:now,status:"completed"},
      {id:"genui-source-answer",role:"assistant",content:"src 是源代码目录，components 放可复用组件，Button.tsx 是其中的按钮组件。",createdAt:now+1,status:"completed"},
    ],
  };
  await page.evaluate(async session => {
    await (globalThis as any).chrome.storage.local.set({sidepanel_chat_sessions:[session],sidepanel_active_session_id:session.id});
  }, session);
  await page.goto(`chrome-extension://${harness.extensionId}/sidepanel.html`);
  await page.setViewportSize({width:380,height:800});
  await expect(page.locator('[data-message-id="genui-source-answer"]')).toBeVisible();
  return page;
}

const readGenUiSessions = (page: import("@playwright/test").Page): Promise<ChatSession[]> => page.evaluate(async()=>{
  const stored=await (globalThis as any).chrome.storage.local.get("sidepanel_chat_sessions");
  return stored.sidepanel_chat_sessions || [];
});

test("GenUI uses real extension request flow, hides raw stream, persists local selection and falls back when disabled",async({harness},testInfo)=>{
  harness.server.genUiControl.delayMs=1200;
  const page=await openGenUiSource(harness);
  await page.locator('[data-message-id="genui-source-answer"]').getByRole('button',{name:'交互讲解',exact:true}).click();
  await expect.poll(()=>harness.server.modelRequests.length).toBe(1);
  await expect(page.getByLabel('交互讲解卡片')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('"fallbackText"');
  await expect(page.locator('body')).not.toContainText('GENUI_PRIVATE_REASONING');
  const card=page.getByLabel('交互讲解卡片');
  await expect(card).toBeVisible();
  const request=harness.server.modelRequests[0];
  expect(request.authorization).toBe('Bearer fixture-only-key');
  expect(request.body.messages[0].content).toBe(GENUI_SYSTEM_PROMPT);
  await card.getByRole('group',{name:'选择节点'}).getByRole('button',{name:'src/components/Button.tsx',exact:true}).click();
  await expect(card.getByText('按钮组件，属于 components 目录。',{exact:true})).toBeVisible();
  await expect(card.getByText('父节点：',{exact:false})).toContainText('src/components');
  await card.getByRole('button',{name:'下一步',exact:true}).click();
  await expect(card.getByRole('heading',{name:'再看组件'})).toBeVisible();
  expect(harness.server.modelRequests).toHaveLength(1);
  await expect.poll(async()=>{
    const sessions=await readGenUiSessions(page);
    return sessions[0]?.messages.find(message=>message.genUi)?.genUi?.viewState;
  }).toMatchObject({tree:{selectedNodeId:'button'},steps:{step:1}});
  const stored=await readGenUiSessions(page);
  const assistant=stored[0].messages.find(message=>message.genUi)!;
  expect(assistant.content).toBe(GENUI_FALLBACK);
  expect(assistant.genUi).toMatchObject({protocolVersion:1,catalogVersion:'explanation-v1',revision:1,sourceMessageIds:expect.arrayContaining(['genui-source-answer'])});
  expect(JSON.stringify(stored)).not.toContain('GENUI_PRIVATE_REASONING');
  await page.reload();
  const restored=page.getByLabel('交互讲解卡片');
  await expect(restored.getByRole('group',{name:'选择节点'}).getByRole('button',{name:'src/components/Button.tsx',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(restored.getByRole('heading',{name:'再看组件'})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('genui-tree-restored.png'),fullPage:true});
  await restored.getByRole('button',{name:'文字版本',exact:true}).click();
  await expect(restored).toContainText(GENUI_FALLBACK);
  await page.getByLabel('交互讲解开关').uncheck();
  await expect(page.getByLabel('交互讲解卡片')).toHaveCount(0);
  await expect(page.locator('main')).toContainText(GENUI_FALLBACK);
  expect(harness.server.modelRequests).toHaveLength(1);
  expect(harness.unexpectedExternalRequests).toEqual([]);
});

test("GenUI cancellation and retry retain source intent, and truncated valid JSON never renders",async({harness})=>{
  harness.server.genUiControl.delayMs=1600;
  const page=await openGenUiSource(harness);
  await page.locator('[data-message-id="genui-source-answer"]').getByRole('button',{name:'交互讲解',exact:true}).click();
  await expect.poll(()=>harness.server.modelRequests.length).toBe(1);
  await page.getByRole('button',{name:'停止生成',exact:false}).click();
  await expect(page.getByLabel('交互讲解卡片')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('"fallbackText"');
  harness.server.genUiControl.delayMs=0;
  harness.server.genUiControl.finish='truncated';
  await page.getByTitle('重试生成').last().click();
  await expect.poll(()=>harness.server.modelRequests.length).toBe(2);
  await expect(page.locator('main')).toContainText(/交互解释生成失败|交互讲解未通过校验/);
  await expect(page.getByLabel('交互讲解卡片')).toHaveCount(0);
  const failed=await readGenUiSessions(page);
  expect(failed[0].messages.some(message=>message.genUi)).toBe(false);
  expect(JSON.stringify(failed)).not.toContain('"fallbackText"');
  harness.server.genUiControl.finish='normal';
  await page.getByTitle('重试生成').last().click();
  await expect(page.getByLabel('交互讲解卡片')).toBeVisible();
  expect(harness.server.modelRequests).toHaveLength(3);
  expect(harness.server.modelRequests.every(request=>request.body.messages[0].content === GENUI_SYSTEM_PROMPT)).toBe(true);
  expect(harness.unexpectedExternalRequests).toEqual([]);
});

test('element marks: real cropped screenshot, bidirectional hover, multimodal send and follow-up restore',async({harness},testInfo)=>{
  const article=await harness.context.newPage();
  await article.goto(`${harness.server.baseUrl}/article`);
  await article.evaluate(()=>{
    const card=document.createElement('section');card.id='element-fixture';
    card.style.cssText='margin:20px;padding:20px;width:430px;background:#e6f6ff';
    card.innerHTML='<h2>季度数据</h2><table><tr><th>项目</th><th>金额</th></tr><tr><td>收入</td><td>120</td></tr></table><pre>const a = 1;\nconsole.log(a);</pre><input value="PRIVATE-FORM-VALUE"><button id="page-action">页面按钮</button>';
    document.body.prepend(card);
    (window as any).pageClicks=0;
    card.querySelector('button')!.addEventListener('click',()=>{(window as any).pageClicks++;});
  });
  const panel=await harness.context.newPage();await panel.goto(`chrome-extension://${harness.extensionId}/sidepanel.html`);
  await article.bringToFront();
  // Invoke the real toolbar action: page key events do not reliably dispatch
  // browser shortcuts in headless Chromium. This exercises activeTab without
  // adding host permissions or mocking captureVisibleTab.
  const browserCdp = await harness.context.browser()!.newBrowserCDPSession();
  const { targetInfos } = await browserCdp.send('Target.getTargets', {
    filter: [{ type: 'tab', exclude: false }, { exclude: true }],
  });
  const tabTarget = targetInfos.find(target => target.url === article.url());
  expect(tabTarget, 'the browser tab target for the fixture').toBeTruthy();
  await browserCdp.send('Extensions.triggerAction', { id: harness.extensionId, targetId: tabTarget!.targetId });
  await browserCdp.detach();
  await article.bringToFront();
  const clickPanel=async(name:string|RegExp)=>panel.getByRole('button',{name}).evaluate(el=>(el as HTMLButtonElement).click());
  await clickPanel('选择网页元素');
  await expect(article.getByText('选择元素 · Esc 取消',{exact:false})).toBeVisible();
  await article.locator('#page-action').click();
  expect(await article.evaluate(()=>(window as any).pageClicks)).toBe(0);
  await article.keyboard.press('Escape');
  await article.locator('#element-fixture h2').click();
  await article.getByRole('button',{name:'扩大父级'}).click();
  await article.getByRole('button',{name:'返回上一层'}).click();
  await article.getByRole('button',{name:'扩大父级'}).click();
  await article.getByPlaceholder('想问 AI 什么？').fill('解释这张表和代码');
  await article.getByRole('button',{name:'加入待发送'}).click();
  await expect.poll(async () => {
    const error = await article.locator('#humantext-element-picker [role=alert]').allTextContents();
    if (error.length) throw new Error(error.join("\n"));
    return article.locator('#humantext-element-picker .dot').count();
  }).toBe(1);
  await expect(panel.getByLabel('标记1的问题')).toHaveValue('解释这张表和代码');
  expect(harness.server.modelRequests).toHaveLength(0);
  const dot=article.locator('#humantext-element-picker .dot');await expect(dot).toHaveCount(1);
  await dot.hover();await expect(panel.locator('.element-marks article')).toHaveClass('focused');
  await article.mouse.move(700,500);
  await panel.locator('.element-marks article').dispatchEvent('mouseover');
  await expect(article.locator('#humantext-element-picker .box.focus')).toHaveCount(1);
  await panel.getByText('查看实际发送快照',{exact:false}).click();
  const preview=panel.locator('.element-marks img');await expect(preview).toBeVisible();
  const image=await preview.getAttribute('src');expect(image).toMatch(/^data:image\/png;base64,/);
  await expect(panel.locator('.element-marks pre')).not.toContainText('PRIVATE-FORM-VALUE');
  await expect(panel.locator('.element-marks pre')).toContainText('const a = 1;\nconsole.log(a);');
  await article.bringToFront();
  await article.screenshot({path:testInfo.outputPath('element-mark.png')});
  await panel.screenshot({path:testInfo.outputPath('element-preview.png')});
  await clickPanel(/发送给AI/);
  await expect.poll(()=>harness.server.modelRequests.length).toBe(1);
  const request=harness.server.modelRequests[0].body;
  const user=request.messages.filter((m:any)=>m.role==='user').at(-1);
  expect(user.content).toContainEqual({type:'image_url',image_url:{url:image}});
  expect(JSON.stringify(user.content)).toContain('解释这张表和代码');
  expect(JSON.stringify(user.content)).not.toContain('PRIVATE-FORM-VALUE');
  await expect.poll(() => panel.evaluate(async () => {
    const stored = await (globalThis as any).chrome.storage.local.get('sidepanel_chat_sessions');
    return stored.sidepanel_chat_sessions?.flatMap((s:any) => s.messages).find((m:any) => m.role === 'assistant')?.status;
  })).toBe('completed');
  await panel.reload();
  const stored=await panel.evaluate(async()=>((await (globalThis as any).chrome.storage.local.get('sidepanel_chat_sessions')).sidepanel_chat_sessions));
  expect(stored.flatMap((s:any)=>s.messages).find((m:any)=>m.elementSnapshots)?.images[0].data).toBe(image);
  const target=panel.getByPlaceholder('输入追问、黑话术语或指令 (Enter 发送/排队，⌘+Enter 打断发送，Shift+Enter 换行)...');
  await target.fill('继续解释');await target.press('Enter');
  await expect.poll(()=>harness.server.modelRequests.length).toBe(2);
  expect(JSON.stringify(harness.server.modelRequests[1].body.messages)).toContain(image!);
  await article.bringToFront();
  await article.locator('#page-action').click();expect(await article.evaluate(()=>(window as any).pageClicks)).toBe(1);
  await article.locator('#element-fixture').evaluate(el=>el.remove());
  await expect(panel.getByText('目标已失效，请删除后重新选择。快照仍是原内容。')).toBeVisible();
  await expect(dot).toHaveCount(0);
  await clickPanel('删除标记');await expect(panel.locator('.element-marks article')).toHaveCount(0);
});
