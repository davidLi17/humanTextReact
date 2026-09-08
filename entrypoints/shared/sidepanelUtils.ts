import { MESSAGE_TYPES } from "./constants";
import type { WebPageMetadata, WebReadExtractStage } from "./webReadingPrompt";

/**
 * 侧边栏工具函数
 */
export interface SidePanelTarget {
  windowId?: number;
  tabId?: number;
}

const SIDE_PANEL_TOGGLE_DEDUPE_MS = 500;
const recentSidePanelToggles = new Map<
  string,
  { startedAt: number; result: Promise<boolean> }
>();

export async function openSidePanel(target: SidePanelTarget): Promise<boolean> {
  try {
    const chromeApi = (globalThis as any).chrome;
    const browserApi = (globalThis as any).browser;
    const sidePanelApi = browserApi?.sidePanel || chromeApi?.sidePanel;

    if (typeof sidePanelApi?.open === "function") {
      if (typeof target.windowId === "number") {
        await sidePanelApi.open({ windowId: target.windowId });
        return true;
      }
      if (typeof target.tabId === "number") {
        await sidePanelApi.open({ tabId: target.tabId });
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("打开侧边栏失败:", error);
    return false;
  }
}

function getSidePanelToggleKey(target: SidePanelTarget): string {
  if (typeof target.windowId === "number") return `window:${target.windowId}`;
  if (typeof target.tabId === "number") return `tab:${target.tabId}`;
  return "unknown";
}

async function performSidePanelToggle(
  target: SidePanelTarget
): Promise<boolean> {
  try {
    const chromeApi = (globalThis as any).chrome;
    const browserApi = (globalThis as any).browser;
    const sidePanelApi = browserApi?.sidePanel || chromeApi?.sidePanel;
    const runtimeApi = browserApi?.runtime || chromeApi?.runtime;

    if (!sidePanelApi || !runtimeApi) return false;

    let isOpen = false;
    if (typeof runtimeApi.getContexts === "function") {
      const filter: Record<string, unknown> = {
        contextTypes: ["SIDE_PANEL"],
      };
      if (typeof target.windowId === "number") {
        filter.windowIds = [target.windowId];
      } else if (typeof target.tabId === "number") {
        filter.tabIds = [target.tabId];
      }

      const contexts = await runtimeApi.getContexts(filter);
      isOpen = Array.isArray(contexts) && contexts.length > 0;
    }

    if (isOpen) {
      if (typeof sidePanelApi.close !== "function") {
        console.warn("当前 Chrome 版本不支持通过快捷键关闭侧边栏");
        return false;
      }

      if (typeof target.windowId === "number") {
        await sidePanelApi.close({ windowId: target.windowId });
        return true;
      }
      if (typeof target.tabId === "number") {
        await sidePanelApi.close({ tabId: target.tabId });
        return true;
      }
      return false;
    }

    return openSidePanel(target);
  } catch (error) {
    console.error("切换侧边栏失败:", error);
    return false;
  }
}

/**
 * 快捷键专用的侧边栏开关。
 * Content Script 与 commands API 可能同时收到一次按键，因此按窗口合并短时间内的重复请求。
 */
export function toggleSidePanel(target: SidePanelTarget): Promise<boolean> {
  const key = getSidePanelToggleKey(target);
  const now = Date.now();
  const recent = recentSidePanelToggles.get(key);
  if (recent && now - recent.startedAt < SIDE_PANEL_TOGGLE_DEDUPE_MS) {
    return recent.result;
  }

  const result = performSidePanelToggle(target);
  recentSidePanelToggles.set(key, { startedAt: now, result });
  return result;
}

/**
 * 判断是否属于浏览器内置受限页面（不允许注入脚本和提取）
 */
export function isRestrictedUrl(url?: string): boolean {
  if (!url) return true;
  const lower = url.toLowerCase().trim();
  return (
    lower.startsWith("chrome://") ||
    lower.startsWith("edge://") ||
    lower.startsWith("about:") ||
    lower.startsWith("chrome-extension://") ||
    lower.startsWith("devtools://") ||
    lower.startsWith("view-source:")
  );
}

export interface TabInfo {
  id?: number;
  url?: string;
  title?: string;
  windowId?: number;
}

/**
 * 获取当前活动标签页 (Active Tab)
 */
export async function getActiveTab(): Promise<TabInfo | null> {
  try {
    const browserApi = (globalThis as any).browser || (globalThis as any).chrome;
    if (!browserApi?.tabs?.query) return null;

    const tabs = await browserApi.tabs.query({
      active: true,
      currentWindow: true,
    });
    return tabs && tabs.length > 0 ? tabs[0] : null;
  } catch (err) {
    console.error("获取当前标签页失败:", err);
    return null;
  }
}

/**
 * 从当前活动标签页中提取正文信息的结果（含失败环节标记，便于定位链路问题）
 */
export interface ExtractActiveTabResult {
  success: boolean;
  data?: WebPageMetadata;
  error?: string;
  /** 失败环节：tab(取标签页)/restricted(受限页)/cs-inject(内容脚本未注入)/cs-extract(内容脚本提取失败)/fallback-extract(动态注入兜底失败) */
  stage?: WebReadExtractStage;
}

export interface ExtractPageContentOptions {
  deepScan?: boolean;
}

/**
 * 从当前活动标签页中提取正文信息
 *
 * 失败路径与环节标记：
 * - 取不到标签页 → stage "tab"
 * - 浏览器受限页 → stage "restricted"
 * - content script 明确返回失败（已注入但提取出错）→ stage "cs-extract"，原样透传原因，不再静默降级
 * - 发送消息本身抛错（多为内容脚本未注入）→ 走 executeScript 动态注入兜底：
 *   - 兜底执行成功 → 正常返回
 *   - 兜底未返回内容 / 执行被拒绝 → stage "fallback-extract"，附具体原因
 */
export async function extractActiveTabContent(
  options?: ExtractPageContentOptions
): Promise<ExtractActiveTabResult> {
  let activeTab: TabInfo | null = null;
  try {
    activeTab = await getActiveTab();
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "获取当前标签页失败，请重试。",
      stage: "tab",
    };
  }

  if (!activeTab || typeof activeTab.id !== "number") {
    return {
      success: false,
      error: "无法获取当前活动标签页，请确保有打开的网页标签。",
      stage: "tab",
    };
  }

  if (isRestrictedUrl(activeTab.url)) {
    return {
      success: false,
      error:
        "浏览器内置系统页面（如 chrome:// 等）不支持提取正文，请切换到常规网页重试。",
      stage: "restricted",
    };
  }

  const browserApi = (globalThis as any).browser || (globalThis as any).chrome;

  // 主链路：向已注入的 content script 发送提取请求
  try {
    const response = await browserApi.tabs.sendMessage(activeTab.id, {
      action: MESSAGE_TYPES.EXTRACT_PAGE_CONTENT,
      deepScan: !!options?.deepScan,
    });

    if (response && response.success && response.data) {
      return {
        success: true,
        data: {
          title: response.data.title || activeTab.title || "未知网页",
          url: response.data.url || activeTab.url || "",
          content: response.data.content || "",
          excerpt: response.data.excerpt || "",
          wordCount: response.data.wordCount || 0,
          isLikelyVirtualList: response.data.isLikelyVirtualList,
          totalEstimatedScreens: response.data.totalEstimatedScreens,
          scrollDensity: response.data.scrollDensity,
          hasMoreContent: response.data.hasMoreContent,
        },
      };
    }

    // 内容脚本已注入但明确报告提取失败：向上透传具体原因，与“未注入”区分
    return {
      success: false,
      error: response?.error || "内容脚本未返回有效的正文数据",
      stage: "cs-extract",
    };
  } catch (tabSendError: any) {
    // 发送消息本身失败：多为 content script 尚未注入（刚打开的标签页），走动态注入兜底
    console.warn(
      "向标签页发送提取消息失败（内容脚本可能未注入），尝试动态提取:",
      tabSendError
    );
  }

  // 兜底链路：动态注入提取脚本（在网页环境中直接执行）
  if (browserApi.scripting?.executeScript) {
    try {
      const results = await browserApi.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
          const doc = document;
          const title =
            doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
            doc.querySelector("h1")?.textContent?.trim() ||
            doc.title ||
            "网页内容";

          const noiseTags = new Set([
            "script",
            "style",
            "noscript",
            "iframe",
            "svg",
            "canvas",
            "video",
            "audio",
            "nav",
            "footer",
            "header",
            "aside",
          ]);
          const textBlocks: string[] = [];
          const visitedRoots = new WeakSet<Node>();

          const traverse = (node: Node, depth: number) => {
            if (depth > 64 || textBlocks.length > 5000) return;
            if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent?.trim();
              if (text) textBlocks.push(text);
              return;
            }
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement;
              const tag = el.tagName.toLowerCase();
              if (noiseTags.has(tag)) return;
              if (
                el.matches &&
                el.matches(
                  ".ad, .ads, .advertisement, .comment, .comments, .sidebar, [aria-hidden='true']"
                )
              ) {
                return;
              }
              if (
                el.hidden ||
                el.style.display === "none" ||
                el.style.visibility === "hidden"
              ) {
                return;
              }
              try {
                const style = window.getComputedStyle(el);
                if (style.display === "none" || style.visibility === "hidden")
                  return;
              } catch {}

              if (tag === "slot") {
                const slot = el as HTMLSlotElement;
                const assigned =
                  typeof slot.assignedNodes === "function"
                    ? slot.assignedNodes({ flatten: true })
                    : [];
                const targets =
                  assigned.length > 0 ? assigned : Array.from(slot.childNodes);
                for (const child of targets) traverse(child, depth + 1);
                return;
              }

              if (el.shadowRoot && !visitedRoots.has(el.shadowRoot)) {
                visitedRoots.add(el.shadowRoot);
                for (const child of Array.from(el.shadowRoot.childNodes)) {
                  traverse(child, depth + 1);
                }
                return;
              }

              for (const child of Array.from(el.childNodes)) {
                traverse(child, depth + 1);
              }
            }
          };

          const root =
            doc.querySelector("article, main, [role='main']") || doc.body;
          if (root) traverse(root, 0);

          const content = textBlocks.join(" ").replace(/\s+/g, " ").trim();
          return {
            title,
            url: window.location.href,
            content,
            wordCount: content.length,
          };
        },
      });

      if (results && results[0] && results[0].result) {
        const res = results[0].result;
        return {
          success: true,
          data: {
            title: res.title || activeTab.title || "网页内容",
            url: res.url || activeTab.url || "",
            content: res.content || "",
            wordCount: res.wordCount || 0,
          },
        };
      }

      return {
        success: false,
        error:
          "动态注入兜底已执行，但页面未返回有效正文（页面可能尚未加载完成或内容为空）。",
        stage: "fallback-extract",
      };
    } catch (executeError: any) {
      const rawMessage = executeError?.message || String(executeError);
      const injectionDenied = /cannot access|permission|not allowed|cannot attach/i.test(
        rawMessage
      );
      return {
        success: false,
        error: injectionDenied
          ? "动态注入提取脚本被浏览器拒绝，该页面禁止扩展注入（如应用商店、PDF 查看器，或缺少站点访问权限）。"
          : `动态注入兜底提取失败：${rawMessage}`,
        stage: "fallback-extract",
      };
    }
  }

  return {
    success: false,
    error: "内容脚本未注入，且当前环境不支持动态注入兜底提取。",
    stage: "cs-inject",
  };
}
