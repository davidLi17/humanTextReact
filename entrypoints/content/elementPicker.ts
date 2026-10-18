import {
  cropRect,
  elementSourceUrl,
  MAX_ELEMENT_MARKS,
  type ElementSnapshot,
} from "../shared/elementSnapshot";
import { extractElementText, PRIVATE_ELEMENTS } from "./elementText";
import { contentLogger } from "../shared/logger";
import { MESSAGE_TYPES } from "../shared/constants";

// Independent selection-only implementation; no VisBug editing/clipboard handlers are imported.
export class ElementPicker {
  private host = document.createElement("div");
  private ui = this.host.attachShadow({ mode: "open" });
  private active = false;
  private locked: Element | null = null;
  private hovered: Element | null = null;
  private ancestors: Element[] = [];
  private marks = new Map<
    string,
    { element: Element; snapshot: ElementSnapshot; fingerprint: string; pageUrl: string }
  >();
  private editingId = "";
  private draft = "";
  private composing = false;
  private submitting = false;
  private askTimer: ReturnType<typeof setTimeout> | undefined;
  private sendRequest: { id: string } | undefined;
  private counter = 0;
  private busy = false;
  private destroyed = false;
  private focused = "";
  private error = "";
  private observer = new MutationObserver(() => {
    if (this.active || this.marks.size) this.refresh();
  });
  private fingerprint(el: Element) {
    return JSON.stringify([
      extractElementText(el).text,
      ...(el.matches("img,svg")
        ? [el, ...Array.from(el.querySelectorAll("img,svg"))]
        : Array.from(el.querySelectorAll("img,svg"))
      ).map((media) =>
        media.tagName.toLowerCase() === "img"
          ? [
              (media as HTMLImageElement).currentSrc,
              media.getAttribute("src"),
              media.getAttribute("alt"),
            ]
          : media.outerHTML,
      ),
    ]);
  }
  private rect(el: Element) {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }
  constructor() {
    this.host.id = "humantext-element-picker";
    this.host.style.cssText =
      "position:fixed;inset:0;pointer-events:none;z-index:2147483647";
    document.documentElement.append(this.host);
    document.addEventListener("pointermove", this.move, true);
    document.addEventListener("pointerdown", this.block, true);
    document.addEventListener("mousedown", this.block, true);
    document.addEventListener("mouseup", this.block, true);
    document.addEventListener("dblclick", this.block, true);
    document.addEventListener("contextmenu", this.block, true);
    document.addEventListener("click", this.click, true);
    document.addEventListener("keydown", this.key, true);
    window.addEventListener("scroll", this.refresh, true);
    window.addEventListener("resize", this.refresh);
    browser.runtime.onMessage.addListener(this.message);
    this.observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });
    this.render();
  }
  private valid(item: {
    element: Element;
    snapshot: ElementSnapshot;
    fingerprint: string;
    pageUrl: string;
  }) {
    return (
      !item.snapshot.invalid &&
      location.href === item.pageUrl &&
      item.element.isConnected &&
      item.element.getBoundingClientRect().width > 0 &&
      item.element.getBoundingClientRect().height > 0 &&
      getComputedStyle(item.element).visibility !== "hidden" &&
      getComputedStyle(item.element).display !== "none" &&
      this.fingerprint(item.element) === item.fingerprint
    );
  }
  private refresh = () => {
    if (this.composing || (!this.active && !this.marks.size)) return;
    for (const item of this.marks.values())
      if (!this.valid(item)) item.snapshot.invalid = true;
    this.render();
  };
  private message = (req: any, _sender: any, reply: (r: any) => void) => {
    if (!req.action?.startsWith("element")) return false;
    if (req.action === "elementOpenEditor") {
      const item = this.marks.get(req.id);
      if (item && this.valid(item) && !this.busy && !this.submitting) {
        this.cancelPendingAsk();
        this.editingId = req.id; this.locked = item.element;
        this.draft = item.snapshot.question; this.render();
        this.ui.querySelector("textarea")?.focus();
      }
    }
    if (req.action === "elementSendError" && req.requestId === this.sendRequest?.id) {
      this.submitting = false; this.sendRequest = undefined; this.error = req.error; this.render();
    }
    if (req.action === "elementStart") {
      this.cancelPendingAsk();
      this.active = true;
      this.locked = null;
      this.render();
    }
    if (req.action === "elementStop") {
      this.cancelPendingAsk();
      this.active = false;
      this.locked = null;
      this.hovered = null;
      this.render();
    }
    if (req.action === "elementHover") {
      this.focused = req.id || "";
      this.refresh();
    }
    if (req.action === "elementDelete") {
      this.marks.delete(req.id);
      if (this.editingId === req.id) this.cancelEditor();
      this.render();
    }
    if (req.action === "elementSent" && Array.isArray(req.ids)) {
      this.submitting = false; this.sendRequest = undefined; this.error = ""; this.cancelEditor();
      for (const id of req.ids) {
        const item = this.marks.get(id);
        if (item) item.snapshot.sent = true;
      }
    }
    if (req.action === "elementEdit") {
      const item = this.marks.get(req.id);
      if (item && typeof req.question === "string") {
        const question = req.question.trim().slice(0, 2000);
        if (question !== item.snapshot.question) {
          item.snapshot.question = question;
          item.snapshot.sent = false;
        }
      }
    }
    if (req.action === "elementState" || req.action === "elementValidate") {
      for (const item of this.marks.values())
        if (!this.valid(item)) item.snapshot.invalid = true;
    }
    const revision = JSON.stringify(
      [...this.marks.values()].map((x) => [
        x.snapshot.id,
        x.snapshot.question,
        x.snapshot.invalid,
        x.snapshot.sent,
      ]),
    );
    reply({
      success: true,
      active: this.active,
      sendRequest: this.sendRequest,
      focused: this.focused,
      revision,
      ...(req.revision === revision
        ? {}
        : { items: [...this.marks.values()].map((x) => x.snapshot) }),
    });
    return false;
  };
  private own(e: Event) {
    return e.composedPath().includes(this.host);
  }
  private block = (e: Event) => {
    if (this.active && !this.own(e)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  };
  private move = (e: PointerEvent) => {
    if (!this.active || this.locked || this.busy || this.own(e)) return;
    this.hovered = e.target instanceof Element ? e.target : null;
    this.render();
  };
  private click = (e: MouseEvent) => {
    if (!this.active || this.own(e)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (this.busy || this.submitting) return;
    this.cancelPendingAsk();
    const target = e.target instanceof Element ? e.target : null;
    if (!target || target.closest(PRIVATE_ELEMENTS)) return;
    this.locked = target;
    this.editingId = ""; this.draft = "";
    this.ancestors = [];
    this.error = "";
    this.render();
    this.ui.querySelector("textarea")?.focus();
  };
  private key = (e: KeyboardEvent) => {
    if ((!this.active && !this.locked) || e.key !== "Escape" || this.busy || this.submitting) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (this.locked) {
      this.cancelEditor();
    } else {
      this.active = false;
      this.hovered = null;
    }
    this.render();
  };
  private button(label: string, fn: () => void) {
    const b = document.createElement("button");
    b.textContent = label;
    b.type = "button";
    b.onclick = fn;
    return b;
  }
  private render() {
    const editing = this.ui.activeElement instanceof HTMLTextAreaElement;
    const cursor = editing
      ? (this.ui.activeElement as HTMLTextAreaElement).selectionStart
      : 0;
    const draft = this.draft;
    this.ui.replaceChildren();
    const style = document.createElement("style");
    style.textContent = `
:host{all:initial;--bg:#fff;--surface:#f8fafc;--ink:#1e293b;--muted:#64748b;--line:#e2e8f0;--accent:#6366f1;font:13px/1.5 system-ui,sans-serif;color:var(--ink);color-scheme:light}
@media(prefers-color-scheme:dark){:host{--bg:#18181b;--surface:#27272a;--ink:#f4f4f5;--muted:#a1a1aa;--line:#3f3f46;--accent:#a5b4fc;color-scheme:dark}}
*{box-sizing:border-box}button,textarea{font:inherit}button{cursor:pointer;border:1px solid var(--line);border-radius:7px;padding:6px 9px;background:var(--bg);color:var(--ink)}button:hover{background:var(--surface)}button:focus-visible,textarea:focus-visible{outline:2px solid var(--accent);outline-offset:3px}button:disabled{opacity:.45;cursor:default}
.box{position:fixed;border:1px solid #818cf8;border-radius:3px;pointer-events:none;background:#6366f106}.focus{border:2px solid #6366f1;background:#6366f10c;box-shadow:0 0 0 2px #6366f115}.marked{border-color:transparent;background:transparent}.marked.focus{border:1px solid #818cf8;background:transparent;box-shadow:none}.dot{position:fixed;border:2px solid var(--bg);border-radius:50%;background:#6366f1!important;color:white;width:25px;height:25px;pointer-events:auto;padding:0;font-size:11px;font-weight:700;box-shadow:0 2px 6px #0002}
.menu,.bar,.mark-tip{position:fixed;pointer-events:auto;background:var(--bg);border:1px solid var(--line);border-radius:12px;box-shadow:0 8px 28px #00000018;color:var(--ink)}.bar{right:12px;top:12px;padding:7px 8px 7px 12px;font-size:12px;display:flex;align-items:center;gap:12px;max-width:calc(100vw - 24px)}.bar button{padding:4px 8px}.menu{width:320px;max-width:calc(100vw - 16px);max-height:calc(100vh - 70px);overflow:auto;padding:14px}.menu-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font-weight:650}.menu textarea{display:block;resize:vertical;width:100%;min-height:88px;max-height:180px;padding:10px;border:1px solid var(--line);border-radius:8px;color:var(--ink);background:var(--surface);margin-bottom:10px}.menu-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;align-items:center}.menu-actions button{font-size:12px}.menu-actions .primary{background:#6366f1;color:#fff;border-color:#6366f1;grid-column:2;grid-row:3}.menu-actions .cancel{grid-column:1;grid-row:3;text-align:left;border-color:transparent;color:var(--muted)}p{margin:8px 0 0;font-size:12px;overflow-wrap:anywhere}[role=alert]{color:#e15b64}.help{position:relative;cursor:help;border:1px solid var(--line);border-radius:50%;width:18px;height:18px;text-align:center;font-size:11px;color:var(--muted)}.help span{display:none;position:absolute;right:0;top:24px;width:240px;padding:10px;background:var(--ink);color:var(--bg);border-radius:8px;font-weight:400;z-index:2}.help:hover span,.help:focus span{display:block}.mark-tip{display:none;width:280px;max-width:calc(100vw - 16px);padding:12px;font-size:12px;pointer-events:none;overflow-wrap:anywhere;white-space:pre-wrap}.mark-tip.visible{display:block}
`;
    this.ui.append(style);
    const outline = (el: Element, focus = false) => {
      const r = this.rect(el),
        box = document.createElement("div");
      box.className = "box" + (focus ? " focus" : "");
      Object.assign(box.style, {
        left: r.x + "px",
        top: r.y + "px",
        width: r.width + "px",
        height: r.height + "px",
      });
      this.ui.append(box);
      return box;
    };
    for (const item of this.marks.values()) {
      if (item.snapshot.invalid) continue;
      const box = outline(item.element, this.focused === item.snapshot.id);
      box.classList.add("marked");
      const dot = this.button(String(item.snapshot.number), () => {
        if (this.busy || this.submitting) return;
        this.cancelPendingAsk();
        this.editingId = item.snapshot.id; this.locked = item.element;
        this.draft = item.snapshot.question; this.error = ""; this.ancestors = [];
        this.render(); this.ui.querySelector("textarea")?.focus();
      });
      dot.className = "dot";
      const r = this.rect(item.element);
      if (r.y + r.height < 0 || r.y > innerHeight || r.x + r.width < 0 || r.x > innerWidth) continue;
      const left = r.x >= 30 ? r.x - 29 : r.x + r.width + 29 <= innerWidth ? r.x + r.width + 4 : r.x;
      const top = left === r.x ? (r.y >= 30 ? r.y - 29 : r.y + r.height + 4) : r.y;
      dot.style.left = Math.max(2, Math.min(innerWidth - 27, left)) + "px";
      dot.style.top = Math.max(2, Math.min(innerHeight - 27, top)) + "px";
      dot.setAttribute("aria-label", `标记${item.snapshot.number}：${item.snapshot.title}`);
      const tip = document.createElement("div");
      tip.className = "mark-tip";
      tip.setAttribute("role", "tooltip");
      tip.textContent = `${item.snapshot.title}\n${item.snapshot.text.replace(/\s+/g, " ").slice(0, 120)}\n\n问题：${item.snapshot.question.slice(0, 200)}`;
      this.ui.append(tip);
      const showTip = () => {
        if (this.locked) return;
        box.classList.add("focus");
        tip.classList.add("visible");
        const d = dot.getBoundingClientRect();
        const target = item.element.getBoundingClientRect();
        tip.style.left = (target.right + 288 < innerWidth ? target.right + 8 : Math.max(8, Math.min(innerWidth - 288, d.left))) + "px";
        tip.style.top = Math.max(8, Math.min(innerHeight - tip.offsetHeight - 8, d.bottom + 8)) + "px";
      };
      dot.onfocus = showTip;
      dot.onblur = () => { tip.classList.remove("visible"); box.classList.remove("focus"); };
      dot.onmouseenter = () => {
        showTip();
        this.focused = item.snapshot.id;
        void browser.runtime
          .sendMessage({ action: "elementFocus", id: this.focused })
          .catch(() => {});
      };
      dot.onmouseleave = () => {
        tip.classList.remove("visible"); box.classList.remove("focus");
        this.focused = "";
        void browser.runtime
          .sendMessage({ action: "elementFocus", id: "" })
          .catch(() => {});
      };
      box.append(dot);
    }
    if (this.active) {
      const bar = document.createElement("div");
      bar.className = "bar";
      bar.textContent = this.busy ? "正在生成快照…" : this.submitting ? "正在发送…" : this.askTimer ? "等待提问…" : "选择元素 · Esc 取消";
      bar.append(
        this.button("退出选择", () => {
          this.cancelPendingAsk();
          this.active = false;
          this.locked = null;
          this.hovered = null;
          this.render();
        }),
      );
      bar.querySelectorAll("button").forEach(b => b.disabled = this.busy || this.submitting);
      this.ui.append(bar);
      const target = this.locked || this.hovered;
      if (target?.isConnected) outline(target, true);
    }
    if (!this.locked && this.error) {
      const notice = document.createElement("div"); notice.className = "bar"; notice.setAttribute("role", "status"); notice.textContent = this.error; this.ui.append(notice);
    }
    if (this.locked) {
      const r = this.rect(this.locked),
        menu = document.createElement("div");
      menu.className = "menu" + (this.editingId ? " editing" : "");
      menu.style.left = Math.max(4, Math.min(innerWidth - 320, r.x)) + "px";
      menu.style.top =
        Math.max(45, Math.min(innerHeight - 220, r.y + r.height + 8)) + "px";
      const input = document.createElement("textarea");
      input.placeholder = "想问 AI 什么？";
      input.maxLength = 2000;
      input.value = draft;
      input.disabled = this.busy || this.submitting;
      input.oninput = () => { this.draft = input.value; };
      input.addEventListener("compositionstart", () => { this.cancelPendingAsk(); this.composing = true; });
      input.addEventListener("compositionend", () => { this.composing = false; this.draft = input.value; this.render(); });
      const ask = () => this.scheduleAsk(input.value);
      input.onkeydown = e => {
        if (e.key === "Enter" && !e.shiftKey && !e.isComposing && !this.composing && e.keyCode !== 229) {
          e.preventDefault(); e.stopPropagation(); ask();
        }
      };
      const heading = document.createElement("div");
      heading.className = "menu-heading";
      const title = document.createElement("span");
      title.textContent = this.askTimer ? "等待提问…" : "询问这个区域";
      if (this.askTimer) title.setAttribute("role", "status");
      heading.append(title);
      const help = document.createElement("span");
      help.className = "help";
      help.tabIndex = 0;
      help.textContent = "?";
      help.setAttribute("aria-label", "快照说明");
      const hint = document.createElement("span");
      hint.setAttribute("role", "tooltip");
      hint.textContent = "提问会发送全部待发送标记；保存仅加入待发送清单。截图只包含当前可见区域，敏感表单遮盖。Enter 提问，Shift+Enter 换行。";
      help.append(hint);
      heading.append(help);
      input.setAttribute("aria-label", "给 AI 的问题");
      menu.append(heading, input);
      const actions = document.createElement("div");
      actions.className = "menu-actions";
      actions.append(
        this.button("扩大父级", () => {
          this.cancelPendingAsk();
          if (
            this.locked?.parentElement &&
            this.locked.parentElement !== document.documentElement
          ) {
            this.ancestors.push(this.locked);
            this.locked = this.locked.parentElement;
            this.render();
          }
        }),
        this.button("返回上一层", () => {
          this.cancelPendingAsk();
          this.locked = this.ancestors.pop() || this.locked;
          this.render();
        }),
        this.button("提问", ask),
        this.button("取消", () => {
          this.cancelEditor();
          this.render();
        }),
      );
      const buttons = actions.querySelectorAll("button");
      buttons[1].disabled = !this.ancestors.length;
      buttons[2].className = "primary";
      buttons[3].className = "cancel";
      const save = this.button(this.editingId ? "保存问题" : "保存并继续选择", () => void this.save(input.value));
      save.style.gridColumn = "1 / -1"; save.style.gridRow = "2";
      actions.append(save);
      if (this.editingId) {
        buttons[0].remove(); buttons[1].remove();
        save.style.gridRow = "1"; save.style.gridColumn = "1";
        buttons[2].style.gridRow = "2"; buttons[3].style.gridRow = "2";
        const remove = this.button("删除标记", () => { this.marks.delete(this.editingId); this.cancelEditor(); this.render(); });
        remove.style.gridRow = "1"; remove.style.gridColumn = "2"; actions.append(remove);
      }
      if (this.busy || this.submitting) actions.querySelectorAll("button").forEach(b => b.disabled = true);
      menu.append(actions);
      if (this.error) {
        const error = document.createElement("p");
        error.setAttribute("role", "alert");
        error.textContent = this.error;
        menu.append(error);
      }
      this.ui.append(menu);
      const height = menu.offsetHeight;
      const below = r.y + r.height + 10;
      const top = below + height < innerHeight - 8 ? below : r.y - height - 10;
      menu.style.left = Math.max(8, Math.min(innerWidth - menu.offsetWidth - 8, r.x)) + "px";
      menu.style.top = Math.max(58, Math.min(innerHeight - height - 8, top)) + "px";
      if (editing) {
        input.focus();
        input.setSelectionRange(cursor, cursor);
      }
    }
  }
  private cancelEditor() {
    this.cancelPendingAsk();
    this.locked = null; this.editingId = ""; this.draft = ""; this.ancestors = []; this.composing = false;
    this.focused = ""; void browser.runtime.sendMessage({ action: "elementFocus", id: "" }).catch(() => {});
  }
  private async save(question: string): Promise<boolean> {
    this.cancelPendingAsk();
    if (this.busy || !this.locked) return false;
    if (!question.trim()) { this.fail("请填写给 AI 的问题"); return false; }
    if (this.editingId) {
      const item = this.marks.get(this.editingId);
      if (!item || !this.valid(item)) { this.fail("目标已失效，请重新选择"); return false; }
      if (item.snapshot.question !== question.trim()) { item.snapshot.question = question.trim(); item.snapshot.sent = false; }
      this.cancelEditor(); this.render(); return true;
    }
    return await this.capture(question);
  }
  private cancelPendingAsk() {
    clearTimeout(this.askTimer);
    this.askTimer = undefined;
  }
  private scheduleAsk(question: string) {
    if (this.busy || this.submitting || this.composing || !this.locked) return;
    this.cancelPendingAsk();
    if (!question.trim()) { this.fail("请填写给 AI 的问题"); return; }
    this.draft = question;
    this.error = "";
    // Native sidePanel.open must run in the original click/Enter gesture.
    // Only capture + submission wait for the shared 400 ms trailing debounce.
    const opening = browser.runtime.sendMessage({ action: MESSAGE_TYPES.OPEN_SIDEPANEL })
      .catch((error: unknown) => ({ success: false, error: error instanceof Error ? error.message : String(error) }));
    const target = this.locked;
    contentLogger.info("元素提问已排队", { delayMs: 400 });
    this.askTimer = setTimeout(() => {
      this.askTimer = undefined;
      if (this.destroyed || this.locked !== target) return;
      void this.submit(question, opening);
    }, 400);
    this.render();
  }
  private async submit(question: string, opening: Promise<any>) {
    if (this.busy || this.submitting || this.composing || !this.locked || this.destroyed) return;
    this.submitting = true;
    contentLogger.info("元素提问开始");
    this.render();
    try {
      const result = await opening;
      if (!result?.success) throw new Error(result?.error || "侧栏未打开，请重试提问");
      if (this.destroyed || !this.locked) { this.submitting = false; return; }
      const edited = this.marks.get(this.editingId);
      if (edited) edited.snapshot.sent = false;
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (!await this.save(question)) { this.submitting = false; this.render(); return; }
      this.sendRequest = { id: crypto.randomUUID() };
      contentLogger.info("元素提问等待侧栏接收", { requestId: this.sendRequest.id });
      const requestId = this.sendRequest.id;
      setTimeout(() => {
        if (!this.destroyed && this.sendRequest?.id === requestId) {
          this.sendRequest = undefined; this.submitting = false;
          this.error = "侧栏尚未接收问题，请点击编号后重试提问"; this.render();
        }
      }, 15000);
      this.error = "正在发送…";
    } catch (error) {
      this.submitting = false; this.error = error instanceof Error ? error.message : String(error);
      contentLogger.warn("元素提问失败", this.error);
    }
    this.render();
  }
  private fail(message: string) {
    this.error = message;
    this.render();
  }
  private async capture(question: string): Promise<boolean> {
    if (this.busy || !this.locked) return false;
    if (!question.trim()) {
      this.fail("请填写给 AI 的问题");
      return false;
    }
    if (this.marks.size >= MAX_ELEMENT_MARKS) {
      this.fail("每页最多6个标记，请先删除不需要的标记");
      return false;
    }
    const target = this.locked,
      rect = this.rect(target),
      viewport = { width: innerWidth, height: innerHeight };
    const clip = cropRect(rect, viewport.width, viewport.height),
      offset = { x: scrollX, y: scrollY };
    if (!clip.width || !clip.height) {
      this.fail("元素不在视口内，请滚动后重选");
      return false;
    }
    if (window.visualViewport && window.visualViewport.scale !== 1) {
      this.fail("请退出双指缩放后重选（浏览器页面缩放可用）");
      return false;
    }
    const extracted = extractElementText(target),
      fingerprint = this.fingerprint(target);
    this.busy = true;
    this.error = "";
    const hidden: Array<[HTMLElement, string]> = [];
    // Hide extension UI only; no page editing, and restoration is guaranteed.
    document
      .querySelectorAll<HTMLElement>(
        "#humantext-element-picker,.translator-popup,.translator-action-bar,.translator-font-scale-toast",
      )
      .forEach((el) => {
        hidden.push([el, el.style.visibility]);
        el.style.visibility = "hidden";
      });
    try {
      const getMasks = () => {
        const result = Array.from(
          document.querySelectorAll(`${PRIVATE_ELEMENTS},iframe,object,embed`),
        ).map((el) => this.rect(el));
        for (const el of Array.from(document.querySelectorAll("*")))
          if ((el.shadowRoot || el.localName.includes("-")) && el !== this.host) result.push(this.rect(el));
        return result;
      };
      const masks = getMasks();
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const result = await browser.runtime.sendMessage({
        action: "captureElement",
        rect,
        viewport,
        masks,
      });
      if (!result?.success)
        throw new Error(result?.error || "截图失败，请检查站点访问权限");
      if (
        this.destroyed ||
        this.locked !== target ||
        JSON.stringify(getMasks()) !== JSON.stringify(masks) ||
        !target.isConnected ||
        offset.x !== scrollX ||
        offset.y !== scrollY ||
        innerWidth !== viewport.width ||
        innerHeight !== viewport.height ||
        JSON.stringify(this.rect(target)) !== JSON.stringify(rect) ||
        this.fingerprint(target) !== fingerprint
      )
        throw new Error("截图时页面发生变化，请重新选择");
      const partial = clip.width < rect.width || clip.height < rect.height;
      const snapshot: ElementSnapshot = {
        version: 1,
        id: crypto.randomUUID(),
        number: ++this.counter,
        title: target.tagName.toLowerCase(),
        url: elementSourceUrl(location.href),
        text: extracted.text,
        truncated: extracted.truncated,
        question: question.trim(),
        capturedAt: Date.now(),
        image: result.image,
        scope: `${partial ? "部分元素（超出视口）" : "完整元素"}；视口坐标 ${Math.round(clip.x)},${Math.round(clip.y)}，${Math.round(clip.width)}×${Math.round(clip.height)} CSS px；最长边1600像素；表单、嵌入内容及自定义元素已遮盖`,
      };
      this.marks.set(snapshot.id, { element: target, snapshot, fingerprint, pageUrl: location.href });
      this.cancelEditor();
      this.hovered = null;
      return true;
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      contentLogger.warn("元素截图失败", this.error);
      return false;
    } finally {
      for (const [el, value] of hidden) el.style.visibility = value;
      this.busy = false;
      if (!this.destroyed) this.render();
    }
  }
  destroy() {
    this.cancelPendingAsk();
    this.destroyed = true;
    this.locked = null;
    this.observer.disconnect();
    browser.runtime.onMessage.removeListener(this.message);
    document.removeEventListener("pointermove", this.move, true);
    for (const name of [
      "pointerdown",
      "mousedown",
      "mouseup",
      "dblclick",
      "contextmenu",
    ])
      document.removeEventListener(name, this.block, true);
    document.removeEventListener("click", this.click, true);
    document.removeEventListener("keydown", this.key, true);
    window.removeEventListener("scroll", this.refresh, true);
    window.removeEventListener("resize", this.refresh);
    this.host.remove();
    this.marks.clear();
  }
}
