import {
  FONT_SCALE_MAX_PERCENT,
  FONT_SCALE_MIN_PERCENT,
} from "./fontScale";

interface FontScaleControlProps {
  value: number;
  onDecrease: () => void;
  onReset: () => void;
  onIncrease: () => void;
  compact?: boolean;
  saveStatus?: "idle" | "saving" | "saved" | "error";
}

export function FontScaleControl({
  value,
  onDecrease,
  onReset,
  onIncrease,
  compact = false,
  saveStatus = "idle",
}: FontScaleControlProps) {
  return (
    <div
      className={`font-scale-control ${compact ? "compact" : ""}`}
      role="group"
      aria-label="扩展字体大小"
    >
      <button
        type="button"
        aria-label="减小扩展字体"
        title="减小字体（Command/Ctrl + -）"
        disabled={value <= FONT_SCALE_MIN_PERCENT}
        onClick={onDecrease}
      >
        A−
      </button>
      <button
        type="button"
        className="font-scale-value"
        aria-label={`恢复默认字体大小，当前 ${value}%`}
        title="恢复 100%（Command/Ctrl + 0）"
        disabled={value === 100}
        onClick={onReset}
      >
        {value}%
      </button>
      <button
        type="button"
        aria-label="增大扩展字体"
        title="增大字体（Command/Ctrl + +）"
        disabled={value >= FONT_SCALE_MAX_PERCENT}
        onClick={onIncrease}
      >
        A+
      </button>
      {saveStatus !== "idle" && (
        <span
          className={`font-scale-status ${saveStatus}`}
          role="status"
          aria-live="polite"
        >
          {saveStatus === "saving"
            ? "保存中"
            : saveStatus === "saved"
            ? "已保存"
            : "保存失败，重开后可能恢复旧值"}
        </span>
      )}
    </div>
  );
}
