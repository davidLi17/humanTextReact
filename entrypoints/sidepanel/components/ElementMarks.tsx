import { useEffect, useRef, useState } from "react";
import {
  elementSnapshotText,
  type ElementSnapshot,
} from "../../shared/elementSnapshot";
import { elementImageBudget, formatImageBytes, imageBytes } from "../../shared/elementImages";
import { getActiveTab, getSidePanelTabId } from "../../shared/sidepanelUtils";
import "./ElementMarks.less";

export function ElementMarks({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (items: ElementSnapshot[]) => boolean;
}) {
  const [items, setItems] = useState<ElementSnapshot[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState("");
  const tab = useRef<number | undefined>(undefined);
  const signature = useRef("");
  const sending = useRef(false);
  const sendRef = useRef<(requestId?: string) => Promise<void>>(async () => {});
  const handled = useRef("");
  const call = async (action: string, extra: Record<string, unknown> = {}) => {
    const current = await getActiveTab();
    if (typeof current?.id !== "number") throw new Error("请先打开普通网页");
    if (
      tab.current !== undefined &&
      tab.current !== current.id &&
      !["elementState", "elementStart"].includes(action)
    ) {
      throw new Error("页面已切换，请检查当前网页的标记后重试");
    }
    if (tab.current !== current.id) {
      tab.current = current.id;
      signature.current = "";
      setItems([]);
      setDrafts({});
    }
    const result = await browser.tabs.sendMessage(current.id, {
      action,
      ...extra,
      ...(action === "elementState" ? { revision: signature.current } : {}),
    });
    if (tab.current !== current.id)
      throw new Error("页面已切换，已忽略旧页面响应");
    if (!result?.success) throw new Error(result?.error || "请刷新网页后重试");
    if (result.items) {
      const next = result.revision;
      if (signature.current !== next) {
        signature.current = next;
        setItems(result.items);
      }
    }
    setActive(result.active);
    return result;
  };
  useEffect(() => {
    let disposed = false;
    const poll = () => {
      if (!disposed) void call("elementState").then(state => {
        if (getSidePanelTabId() !== undefined && state.sendRequest && handled.current !== state.sendRequest.id) {
          handled.current = state.sendRequest.id; void sendRef.current(state.sendRequest.id);
        }
      }).catch(() => {});
    };
    poll();
    const timer = setInterval(poll, 1500);
    const listener = (req: any, sender: any) => {
      if (req.action === "elementFocus" && sender.tab?.id === tab.current)
        setFocused(req.id);
      return false;
    };
    browser.runtime.onMessage.addListener(listener);
    return () => {
      disposed = true;
      clearInterval(timer);
      browser.runtime.onMessage.removeListener(listener);
    };
  }, []);
  useEffect(() => {
    if (!document.activeElement?.closest(".element-marks textarea")) setDrafts({});
  }, [items]);
  const run = (action: string, extra: Record<string, unknown> = {}) =>
    void call(action, extra)
      .then(() => setError(""))
      .catch((e) => setError(e.message));
  const pendingItems = items.filter(
    (item) =>
      !item.sent || (drafts[item.id] ?? item.question).trim() !== item.question,
  );
  sendRef.current = async (requestId?: string) => {
            if (sending.current || disabled) {
              if (requestId) await call("elementSendError", {requestId,error:"AI 正在回答，请稍后再次提问"});
              return;
            }
            sending.current = true;
            try {
              for (const [id, question] of Object.entries(requestId ? {} : drafts))
                await call("elementEdit", { id, question });
              const state = await call("elementValidate");
              const pending = state.items.filter(
                (item: ElementSnapshot) => !item.sent,
              );
              if (
                !requestId && (pending.length !== pendingItems.length ||
                pending.some(
                  (entry: ElementSnapshot) =>
                    !pendingItems.some(
                      (preview) =>
                        preview.id === entry.id &&
                        (drafts[entry.id] ?? preview.question).trim() ===
                          entry.question,
                    ),
                )
              )) {
                throw new Error("标记清单已变化，请检查最新预览后重新发送");
              }
              if (
                pending.some(
                  (x: ElementSnapshot) => x.invalid || !x.question.trim(),
                )
              )
                throw new Error("请重新选择失效目标并填写问题");
              if (!pending.length) throw new Error("没有待发送的问题，请先修改问题或添加标记");
              const imageError = elementImageBudget(pending).error;
              if (imageError) throw new Error(imageError);
              if (onSend(pending)) {
                await call("elementSent", {
                  ids: pending.map((item: ElementSnapshot) => item.id),
                });
                // Keep confirmed page markers after sending; user can edit/delete them explicitly.
                await call("elementStop");
                setError(""); setDrafts({});
              } else throw new Error("暂时无法发送，请稍后再次提问");
            } catch (e) {
              const error = e instanceof Error ? e.message : String(e);
              setError(error);
              if (requestId) await call("elementSendError", {requestId,error});
            } finally {
              sending.current = false;
            }
  };
  return (
    <section className="element-marks" aria-label="网页标记">
      <header className="marks-header"><span className="marks-help" tabIndex={0} aria-label="截图与模型说明">?<span role="tooltip">截图随问题发送，请使用支持图片的模型。首次截图前，点击当前页的扩展图标或右键「打开人话侧边栏」授予临时访问。</span></span></header>
      <button
        className="marks-select"
        type="button"
        onClick={() => run(active ? "elementStop" : "elementStart")}
      >
        {active ? "退出元素选择" : "选择网页元素"}
      </button>
      {error && <p role="alert">{error}</p>}
      <details className="marks-list">
      <summary>已选{items.length}处{focused ? " · 定位中" : ""}</summary>
      {items.map((item) => (
        <article
          key={item.id}
          className={focused === item.id ? "focused" : ""}
          onMouseEnter={() => run("elementHover", { id: item.id })}
          onMouseLeave={() => run("elementHover", { id: "" })}
        >
          <div className="mark-heading"><span className="mark-number">{item.number}</span><strong title={item.title}>{item.title}</strong><span className="mark-status">{item.sent ? "已发送" : "待发送"}</span></div>
          <small>截图 {formatImageBytes(imageBytes(item.image))} / 上限5 MB</small>
          {item.invalid && (
            <p role="alert">目标已失效，请删除后重新选择。快照仍是原内容。</p>
          )}
          <button type="button" onClick={() => run("elementOpenEditor", {id:item.id})}>在网页编辑</button>
          <details><summary>编辑问题</summary>
          <label className="mark-label" htmlFor={`mark-question-${item.id}`}>给 AI 的问题</label>
          <textarea
            id={`mark-question-${item.id}`}
            aria-label={`标记${item.number}的问题`}
            maxLength={2000}
            value={drafts[item.id] ?? item.question}
            onChange={(e) =>
              setDrafts((previous) => ({
                ...previous,
                [item.id]: e.target.value,
              }))
            }
            onBlur={(e) =>
              run("elementEdit", { id: item.id, question: e.target.value })
            }
          />
          </details>
          <details>
            <summary>
              查看实际发送快照{item.truncated ? " · 文本已截断" : ""}
            </summary>
            <img src={item.image} alt={`标记${item.number}的实际发送截图`} />
            <pre>
              {elementSnapshotText([
                { ...item, question: drafts[item.id] ?? item.question },
              ])}
            </pre>
          </details>
          <button
            className="mark-delete"
            type="button"
            onClick={() => run("elementDelete", { id: item.id })}
          >
            删除标记
          </button>
        </article>
      ))}
      {!!pendingItems.length && <small>本次合计 {formatImageBytes(elementImageBudget(pendingItems).total)} / 上限30 MB · {pendingItems.length}/6张</small>}
      {!!pendingItems.length && (
        <button
          className="marks-send"
          type="button"
          disabled={
            disabled ||
            pendingItems.some(
              (x) => x.invalid || !(drafts[x.id] ?? x.question).trim(),
            )
          }
          onClick={() => void sendRef.current()}
        >
          发送给AI（{pendingItems.length}个标记）
        </button>
      )}
      </details>
    </section>
  );
}
