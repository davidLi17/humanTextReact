import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_FONT_SCALE_PERCENT,
  FontScaleController,
  applyFontScale,
  getFontScaleShortcutAction,
  type FontScaleAction,
} from "./fontScale";
import { SettingsUtils } from "./settingsUtils";

export function useFontScale() {
  const [fontScalePercent, setFontScalePercentState] = useState(
    DEFAULT_FONT_SCALE_PERCENT
  );
  const [fontScaleSaveStatus, setFontScaleSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const controllerRef = useRef<FontScaleController | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new FontScaleController({
      apply: (value) => {
        if (!active) return;
        applyFontScale(document.documentElement, value);
        setFontScalePercentState(value);
      },
      persist: (value) =>
        SettingsUtils.setFontScalePercent(value),
      onPersistStart: () => {
        if (active) setFontScaleSaveStatus("saving");
      },
      onPersistSuccess: () => {
        if (!active) return;
        setFontScaleSaveStatus("saved");
        if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
        statusTimerRef.current = setTimeout(
          () => setFontScaleSaveStatus("idle"),
          1600
        );
      },
      onPersistError: () => {
        if (active) setFontScaleSaveStatus("error");
      },
    });
    controllerRef.current = controller;

    const unsubscribe = SettingsUtils.onSettingsChanged((settings) => {
      controller.syncExternal(settings.fontScalePercent);
    });
    void SettingsUtils.getSettings().then((settings) => {
      if (active) controller.hydrate(settings.fontScalePercent);
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      const action = getFontScaleShortcutAction(event);
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      controller.perform(action);
    };
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      active = false;
      unsubscribe();
      document.removeEventListener("keydown", handleKeyDown, true);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      if (controllerRef.current === controller) controllerRef.current = null;
    };
  }, []);

  const setFontScalePercent = useCallback((value: number) => {
    return controllerRef.current?.setAndPersist(value);
  }, []);

  const performFontScaleAction = useCallback((action: FontScaleAction) => {
    return controllerRef.current?.perform(action);
  }, []);

  return {
    fontScalePercent,
    setFontScalePercent,
    performFontScaleAction,
    fontScaleSaveStatus,
  };
}
