import {
  cropRect,
  elementSourceUrl,
  MAX_ELEMENT_MARKS,
  type ElementSnapshot,
} from "../shared/elementSnapshot";
import { extractElementText, PRIVATE_ELEMENTS } from "./elementText";
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
    if (!this.active && !this.marks.size) return;
    for (const item of this.marks.values())
      if (!this.valid(item)) item.snapshot.invalid = true;
    this.render();
  };
  private message = (req: any, _sender: any, reply: (r: any) => void) => {
    if (!req.action?.startsWith("element")) return false;
    if (req.action === "elementStart") {
      this.active = true;
      this.locked = null;
      this.render();
    }
    if (req.action === "elementStop") {
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
      this.render();
    }
    if (req.action === "elementSent" && Array.isArray(req.ids)) {
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
    if (this.busy) return;
    const target = e.target instanceof Element ? e.target : null;
    if (!target || target.closest(PRIVATE_ELEMENTS)) return;
    this.locked = target;
    this.ancestors = [];
    this.error = "";
    void browser.runtime.sendMessage({ action: MESSAGE_TYPES.OPEN_SIDEPANEL });
    this.render();
    this.ui.querySelector("textarea")?.focus();
  };
  private key = (e: KeyboardEvent) => {
    if (!this.active || e.key !== "Escape") return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (this.locked) {
      this.locked = null;
      this.ancestors = [];
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
    const draft = this.ui.querySelector("textarea")?.value || "";
    this.ui.replaceChildren();
    const style = document.createElement("style");
    style.textContent = `:host{font:14px system-ui;color:#172033}*{box-sizing:border-box}.box{position:fixed;border:2px solid #6466ef;pointer-events:none;background:#6366f112}.focus{border:3px solid #f59e0b;background:#f59e0b22}.dot{position:absolute;left:0;top:0;border-radius:50%;background:#4f46e5;color:white;width:25px;height:25px;pointer-events:auto;padding:0}.menu,.bar{position:fixed;pointer-events:auto;background:white;border:1px solid #ccc;border-radius:10px;padding:10px;box-shadow:0 4px 20px #0003}.bar{right:16px;top:12px}.menu{width:310px;max-width:95vw}textarea{width:100%;min-height:72px;color:#172033;background:white}button{cursor:pointer;padding:6px;margin:3px;border:1px solid #ddd;border-radius:6px;background:#f7f7ff;color:#172033}p{margin:4px 0;font-size:12px}`;
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
      const dot = this.button(String(item.snapshot.number), () => {});
      dot.className = "dot";
      dot.title = `${item.snapshot.title}\n${item.snapshot.text.slice(0, 160)}\n问题：${item.snapshot.question}`;
      dot.onmouseenter = () => {
        this.focused = item.snapshot.id;
        void browser.runtime
          .sendMessage({ action: "elementFocus", id: this.focused })
          .catch(() => {});
      };
      dot.onmouseleave = () => {
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
      bar.textContent = this.busy ? "正在生成快照…" : "选择元素 · Esc 取消";
      bar.append(
        this.button("退出选择", () => {
          this.active = false;
          this.locked = null;
          this.hovered = null;
          this.render();
        }),
      );
      this.ui.append(bar);
      const target = this.locked || this.hovered;
      if (target?.isConnected) outline(target, true);
    }
    if (this.locked && this.active) {
      const r = this.rect(this.locked),
        menu = document.createElement("div");
      menu.className = "menu";
      menu.style.left = Math.max(4, Math.min(innerWidth - 320, r.x)) + "px";
      menu.style.top =
        Math.max(45, Math.min(innerHeight - 220, r.y + r.height + 8)) + "px";
      const input = document.createElement("textarea");
      input.placeholder = "想问 AI 什么？";
      input.maxLength = 2000;
      input.value = draft;
      input.disabled = this.busy;
      menu.append(input);
      menu.append(
        this.button("扩大父级", () => {
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
          this.locked = this.ancestors.pop() || this.locked;
          this.render();
        }),
        this.button("加入待发送", () => void this.capture(input.value)),
        this.button("取消", () => {
          this.locked = null;
          this.render();
        }),
      );
      const hint = document.createElement("p");
      hint.textContent =
        "仅截当前视口内所选区域；表单/嵌入内容遮盖。加入不会调用 AI。";
      menu.append(hint);
      if (this.error) {
        const error = document.createElement("p");
        error.setAttribute("role", "alert");
        error.textContent = this.error;
        menu.append(error);
      }
      this.ui.append(menu);
      if (editing) {
        input.focus();
        input.setSelectionRange(cursor, cursor);
      }
    }
  }
  private fail(message: string) {
    this.error = message;
    this.render();
  }
  private async capture(question: string) {
    if (this.busy || !this.locked) return;
    if (!question.trim()) {
      this.fail("请填写给 AI 的问题");
      return;
    }
    if (this.marks.size >= MAX_ELEMENT_MARKS) {
      this.fail("每页最多6个标记，请先删除不需要的标记");
      return;
    }
    const target = this.locked,
      rect = this.rect(target),
      viewport = { width: innerWidth, height: innerHeight };
    const clip = cropRect(rect, viewport.width, viewport.height),
      offset = { x: scrollX, y: scrollY };
    if (!clip.width || !clip.height) {
      this.fail("元素不在视口内，请滚动后重选");
      return;
    }
    if (window.visualViewport && window.visualViewport.scale !== 1) {
      this.fail("请退出双指缩放后重选（浏览器页面缩放可用）");
      return;
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
      this.locked = null;
      this.hovered = null;
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
    } finally {
      for (const [el, value] of hidden) el.style.visibility = value;
      this.busy = false;
      if (!this.destroyed) this.render();
    }
  }
  destroy() {
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
