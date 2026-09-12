import type { JargonInput } from "@/entrypoints/shared/jargonStorage";
import React, { useEffect, useRef, useState } from "react";
import "./JargonSaveDialog.less";

export interface JargonSaveDialogDraft {
  item: JargonInput;
  explanationSource: "vernacular" | "full";
}

interface JargonSaveDialogProps {
  draft: JargonSaveDialogDraft;
  onCancel: () => void;
  onSave: (item: JargonInput) => Promise<void>;
}

export default function JargonSaveDialog({
  draft,
  onCancel,
  onSave,
}: JargonSaveDialogProps) {
  const [item, setItem] = useState<JargonInput>(() => ({ ...draft.item }));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const termInputRef = useRef<HTMLInputElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    termInputRef.current?.focus();
    return () => previouslyFocusedRef.current?.focus();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    if (!item.term.trim()) {
      setError("请输入术语");
      return;
    }
    if (!item.explanation.trim()) {
      setError("请输入人话释义");
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      await onSave({
        ...item,
        term: item.term.trim(),
        explanation: item.explanation.trim(),
        sourceContext: item.sourceContext?.trim() || "",
        sourceUrl: item.sourceUrl?.trim() || "",
      });
    } catch (saveError: any) {
      setError(saveError?.message || "保存失败，请重试");
      setIsSaving(false);
    }
  };

  const requestCancel = () => {
    if (!isSaving) onCancel();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      requestCancel();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      ) || []
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="jargon-save-dialog-overlay"
      role="presentation"
      onMouseDown={requestCancel}
      onKeyDown={handleKeyDown}
    >
      <section
        ref={dialogRef}
        className="jargon-save-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="jargon-save-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="jargon-save-dialog-header">
          <div>
            <h2 id="jargon-save-dialog-title">保存到生词本</h2>
            <p>
              {draft.explanationSource === "vernacular"
                ? "已选用直白人话，可按自己的理解调整。"
                : "当前解释会保存到生词本，可按自己的理解调整。"}
            </p>
          </div>
          <button
            type="button"
            className="jargon-save-dialog-close"
            aria-label="关闭保存弹窗"
            disabled={isSaving}
            onClick={requestCancel}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="jargon-save-dialog-form">
          {error && (
            <div className="jargon-save-dialog-error" role="alert">
              {error}
            </div>
          )}

          <label>
            <span>术语</span>
            <input
              ref={termInputRef}
              value={item.term}
              onChange={(event) =>
                setItem((previous) => ({ ...previous, term: event.target.value }))
              }
              disabled={isSaving}
            />
          </label>
          <label>
            <span>人话释义</span>
            <textarea
              rows={5}
              value={item.explanation}
              onChange={(event) =>
                setItem((previous) => ({
                  ...previous,
                  explanation: event.target.value,
                }))
              }
              disabled={isSaving}
            />
          </label>
          <label>
            <span>原句或提问</span>
            <textarea
              rows={3}
              value={item.sourceContext || ""}
              onChange={(event) =>
                setItem((previous) => ({
                  ...previous,
                  sourceContext: event.target.value,
                }))
              }
              disabled={isSaving}
            />
          </label>
          <label>
            <span>来源链接</span>
            <input
              type="url"
              placeholder="https://example.com/article"
              value={item.sourceUrl || ""}
              onChange={(event) =>
                setItem((previous) => ({
                  ...previous,
                  sourceUrl: event.target.value,
                }))
              }
              disabled={isSaving}
            />
          </label>
          <div className="jargon-save-dialog-actions">
            <button type="button" disabled={isSaving} onClick={requestCancel}>
              取消
            </button>
            <button type="submit" disabled={isSaving}>
              {isSaving ? "保存中…" : "保存到生词本"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
