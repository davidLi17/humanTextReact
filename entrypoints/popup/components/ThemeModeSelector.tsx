import {
  THEME_MODES,
  ThemeMode,
} from "@/entrypoints/shared/constants";
import { Computer, Moon, Sun } from "@icon-park/react";
import { useEffect, useRef, useState } from "react";

interface ThemeModeSelectorProps {
  value: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}

const THEME_OPTIONS = [
  {
    value: THEME_MODES.SYSTEM,
    label: "跟随系统",
    Icon: Computer,
  },
  {
    value: THEME_MODES.LIGHT,
    label: "浅色",
    Icon: Sun,
  },
  {
    value: THEME_MODES.DARK,
    label: "深色",
    Icon: Moon,
  },
] as const;

export default function ThemeModeSelector({
  value,
  onChange,
}: ThemeModeSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentOption =
    THEME_OPTIONS.find((option) => option.value === value) ?? THEME_OPTIONS[0];
  const CurrentIcon = currentOption.Icon;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="theme-mode-selector" ref={containerRef}>
      <button
        type="button"
        className="theme-mode-trigger"
        title={`外观：${currentOption.label}`}
        aria-label={`切换外观，当前为${currentOption.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <CurrentIcon theme="outline" size="17" />
      </button>

      {open && (
        <div className="theme-mode-menu" role="menu" aria-label="外观模式">
          {THEME_OPTIONS.map(({ value: optionValue, label, Icon }) => (
            <button
              type="button"
              key={optionValue}
              role="menuitemradio"
              aria-checked={value === optionValue}
              className={`theme-mode-option ${
                value === optionValue ? "active" : ""
              }`}
              onClick={() => {
                onChange(optionValue);
                setOpen(false);
              }}
            >
              <Icon theme="outline" size="16" />
              <span>{label}</span>
              <span className="theme-mode-check" aria-hidden="true">
                {value === optionValue ? "✓" : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
