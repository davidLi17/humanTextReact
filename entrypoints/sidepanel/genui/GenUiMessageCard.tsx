import React, { Component, useMemo, useState } from "react";
import type { GenUiAttachment } from "@/entrypoints/shared/genui/types";
import { normalizeGenUiAttachment, jsonByteLength, MAX_GENUI_BYTES } from "@/entrypoints/shared/genui/profile";
import { ExplanationRenderer, toRuntimeSpec } from "./registry";
import { GenUiStateContext, useGenUiState } from "./useGenUiState";
import "./genui.less";

class GenUiErrorBoundary extends Component<{ children: React.ReactNode; fallbackText: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div role="status"><p>交互卡片暂时无法显示，已切换为文字版本。</p><p className="genui-text">{this.props.fallbackText}</p></div> : this.props.children; }
}
interface Props {
  attachment: GenUiAttachment;
  content: string;
  sourceLabels: string[];
  onStateChange(state: NonNullable<GenUiAttachment["viewState"]>): void;
  /** A preview is rendered only after it passes the same strict attachment validation. */
  streaming?: boolean;
}
function ValidatedCard({ attachment, content, sourceLabels, onStateChange, streaming }: Omit<Props, "attachment"> & { attachment: GenUiAttachment }) {
  const [textOnly, setTextOnly] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const { viewState: initialState, ...baseAttachment } = attachment;
  const state = useGenUiState(initialState, onStateChange, Math.max(0, MAX_GENUI_BYTES - jsonByteLength(baseAttachment) - 13));
  const spec = useMemo(() => toRuntimeSpec(attachment.spec), [attachment.spec]);
  return <section className="genui-message-card" aria-label="交互讲解卡片">
    <header><div><strong>交互讲解</strong><p className="genui-source">来源：{sourceLabels.join("；") || "当前对话回答"}</p></div>{streaming && <span className="genui-streaming" role="status">生成中</span>}</header>
    <div className="genui-toolbar">
      <button type="button" onClick={() => setTextOnly(!textOnly)}>{textOnly ? "交互版本" : "文字版本"}</button>
      <button type="button" onClick={async () => {
        try { if (!navigator.clipboard?.writeText) throw new Error("unavailable"); await navigator.clipboard.writeText(content); setCopyStatus("已复制摘要"); }
        catch { setCopyStatus("复制失败，请切换文字版本手动复制"); }
      }}>复制摘要</button>
      {copyStatus && <small role="status">{copyStatus}</small>}
    </div>
    {textOnly ? <p className="genui-text">{content}</p> : <GenUiErrorBoundary fallbackText={content}>
      <GenUiStateContext.Provider value={state}><ExplanationRenderer spec={spec} /></GenUiStateContext.Provider>
    </GenUiErrorBoundary>}
    {state.pruned && <p role="status">卡片操作较多，较早的选择状态不会保存；当前仍可继续使用。</p>}
    <p className="genui-disclaimer">内容由模型整理，请结合原文核对；教学示例不代表原文事实。</p>
  </section>;
}
export default function GenUiMessageCard(props: Props) {
  const attachment = useMemo(() => normalizeGenUiAttachment(props.attachment), [props.attachment]);
  if (!attachment) return <p className="genui-text">{props.content}</p>;
  return <ValidatedCard {...props} attachment={attachment} />;
}
