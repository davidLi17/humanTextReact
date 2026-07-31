import {
  THEME_MODES,
  ThemeMode,
} from "@/entrypoints/shared/constants";

export type ResolvedTheme = "light" | "dark";

type ThemeElement = Pick<HTMLElement, "setAttribute">;

type ThemeMediaQuery = Pick<
  MediaQueryList,
  "matches" | "addEventListener" | "removeEventListener"
> & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
};

export function normalizeThemeMode(value: unknown): ThemeMode {
  if (value === THEME_MODES.LIGHT || value === THEME_MODES.DARK) {
    return value;
  }

  return THEME_MODES.SYSTEM;
}

export function resolveTheme(
  mode: ThemeMode,
  systemPrefersDark: boolean
): ResolvedTheme {
  if (mode === THEME_MODES.DARK) return THEME_MODES.DARK;
  if (mode === THEME_MODES.LIGHT) return THEME_MODES.LIGHT;
  return systemPrefersDark ? THEME_MODES.DARK : THEME_MODES.LIGHT;
}

export function getSystemThemeMediaQuery(): MediaQueryList | undefined {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return undefined;
  }

  return window.matchMedia("(prefers-color-scheme: dark)");
}

export function applyTheme(
  element: ThemeElement,
  mode: ThemeMode,
  systemPrefersDark = getSystemThemeMediaQuery()?.matches ?? false
): ResolvedTheme {
  const normalizedMode = normalizeThemeMode(mode);
  const resolvedTheme = resolveTheme(normalizedMode, systemPrefersDark);

  element.setAttribute("data-theme-mode", normalizedMode);
  element.setAttribute("data-theme", resolvedTheme);
  return resolvedTheme;
}

export function watchSystemTheme(
  mode: ThemeMode,
  onChange: (theme: ResolvedTheme) => void,
  mediaQuery: ThemeMediaQuery | undefined = getSystemThemeMediaQuery()
): () => void {
  if (normalizeThemeMode(mode) !== THEME_MODES.SYSTEM || !mediaQuery) {
    return () => {};
  }

  const listener = () => {
    onChange(resolveTheme(THEME_MODES.SYSTEM, mediaQuery.matches));
  };

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }

  mediaQuery.addListener?.(listener);
  return () => mediaQuery.removeListener?.(listener);
}
