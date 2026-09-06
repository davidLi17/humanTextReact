export const FONT_SCALE_MIN_PERCENT = 80;
export const FONT_SCALE_MAX_PERCENT = 160;
export const FONT_SCALE_STEP_PERCENT = 10;
export const DEFAULT_FONT_SCALE_PERCENT = 100;
export const FONT_SCALE_CSS_VARIABLE = "--ht-font-scale";

export type FontScaleAction = "increase" | "decrease" | "reset";

export interface FontScaleKeyboardEventLike {
  key?: string;
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  isComposing?: boolean;
  defaultPrevented?: boolean;
  preventDefault?: () => void;
  stopPropagation?: () => void;
  composedPath?: () => EventTarget[];
  target?: EventTarget | null;
}

/** 将旧值、非法值和越界值收敛为 80%-160% 内的 10% 档位。 */
export function normalizeFontScalePercent(value: unknown): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(numeric)) return DEFAULT_FONT_SCALE_PERCENT;
  const stepped =
    Math.round(numeric / FONT_SCALE_STEP_PERCENT) * FONT_SCALE_STEP_PERCENT;
  return Math.min(
    FONT_SCALE_MAX_PERCENT,
    Math.max(FONT_SCALE_MIN_PERCENT, stepped)
  );
}

export function getNextFontScalePercent(
  current: unknown,
  action: FontScaleAction
): number {
  const normalized = normalizeFontScalePercent(current);
  if (action === "reset") return DEFAULT_FONT_SCALE_PERCENT;
  return normalizeFontScalePercent(
    normalized +
      (action === "increase"
        ? FONT_SCALE_STEP_PERCENT
        : -FONT_SCALE_STEP_PERCENT)
  );
}

/** 只识别真实的 Command/Ctrl + 加、减、0，排除 Alt 和输入法合成。 */
export function getFontScaleShortcutAction(
  event: FontScaleKeyboardEventLike
): FontScaleAction | null {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.altKey ||
    (!event.metaKey && !event.ctrlKey)
  ) {
    return null;
  }

  const key = event.key || "";
  const code = event.code || "";
  if (code === "NumpadAdd" || code === "Equal" || key === "+" || key === "=") {
    return "increase";
  }
  if (
    code === "NumpadSubtract" ||
    code === "Minus" ||
    key === "-" ||
    key === "−"
  ) {
    return "decrease";
  }
  if (code === "Numpad0" || code === "Digit0" || key === "0") {
    return "reset";
  }
  return null;
}

/** 网页内快捷键只在事件路径确实穿过扩展容器时生效。 */
export function isFontScaleEventInside(
  event: FontScaleKeyboardEventLike,
  root: HTMLElement | null | undefined
): boolean {
  if (!root) return false;
  const path = event.composedPath?.() || [];
  if (path.includes(root)) return true;
  const target = event.target;
  return Boolean(target && root.contains?.(target as Node));
}

export function handleScopedFontScaleShortcut(
  event: FontScaleKeyboardEventLike,
  root: HTMLElement | null | undefined,
  perform: (action: FontScaleAction) => void
): boolean {
  const action = getFontScaleShortcutAction(event);
  if (!action || !isFontScaleEventInside(event, root)) return false;
  event.preventDefault?.();
  event.stopPropagation?.();
  perform(action);
  return true;
}

export function applyFontScale(
  target: HTMLElement,
  value: unknown
): number {
  const normalized = normalizeFontScalePercent(value);
  const cssValue = String(normalized / 100);
  if (typeof target.style.setProperty === "function") {
    target.style.setProperty(FONT_SCALE_CSS_VARIABLE, cssValue);
  } else {
    (target.style as any)[FONT_SCALE_CSS_VARIABLE] = cssValue;
  }
  return normalized;
}

interface FontScaleControllerOptions {
  initialValue?: unknown;
  apply: (value: number) => void;
  persist: (value: number) => Promise<void>;
  onPersistStart?: (value: number) => void;
  onPersistSuccess?: (value: number) => void;
  onPersistError?: (error: unknown) => void;
}

/**
 * 当前值同步更新、持久化严格串行。快速连按始终基于内存中的最新档位，
 * 较早保存不会晚于较新保存落盘，也不会丢失中间步进。
 */
export class FontScaleController {
  private value: number;
  private localRevision = 0;
  private pendingWrites = 0;
  private saveQueue: Promise<void> = Promise.resolve();

  constructor(private readonly options: FontScaleControllerOptions) {
    this.value = normalizeFontScalePercent(options.initialValue);
    options.apply(this.value);
  }

  getValue(): number {
    return this.value;
  }

  /** 初始化读取晚到时，不覆盖用户已经在当前界面做出的调整。 */
  hydrate(value: unknown): number {
    if (this.localRevision > 0) return this.value;
    return this.applyExternal(value);
  }

  /** storage 同步事件在本地写入排队期间不回灌旧档位。 */
  syncExternal(value: unknown): number {
    if (this.pendingWrites > 0) return this.value;
    return this.applyExternal(value);
  }

  setAndPersist(value: unknown): number {
    const next = normalizeFontScalePercent(value);
    if (next === this.value) return this.value;
    this.value = next;
    this.localRevision += 1;
    this.options.apply(next);
    this.queuePersist(next);
    return next;
  }

  perform(action: FontScaleAction): number {
    return this.setAndPersist(getNextFontScalePercent(this.value, action));
  }

  async flush(): Promise<void> {
    await this.saveQueue;
  }

  private applyExternal(value: unknown): number {
    const next = normalizeFontScalePercent(value);
    this.value = next;
    this.options.apply(next);
    return next;
  }

  private queuePersist(value: number): void {
    this.pendingWrites += 1;
    this.options.onPersistStart?.(value);
    this.saveQueue = this.saveQueue.then(async () => {
      try {
        await this.options.persist(value);
        this.pendingWrites -= 1;
        if (this.pendingWrites === 0) {
          this.options.onPersistSuccess?.(value);
        }
      } catch (error) {
        this.pendingWrites -= 1;
        this.options.onPersistError?.(error);
      }
    });
  }
}
