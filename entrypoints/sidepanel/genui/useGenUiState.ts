import { createContext, useContext, useRef, useState } from "react";
import type { GenUiAttachment } from "@/entrypoints/shared/genui/types";

type ViewState = NonNullable<GenUiAttachment["viewState"]>;
type ElementState = ViewState[string];
// Leave room for the surrounding ,"viewState": property in the attachment envelope.
const VIEW_STATE_BYTE_BUDGET = 4096 - 32;
/** Persist recent navigation first; older state is reconstructible and must not crowd out the spec. */
export function boundViewState(state: ViewState, recency: readonly string[] = Object.keys(state), byteBudget = VIEW_STATE_BYTE_BUDGET): ViewState {
  const entries = recency.filter((id) => Object.hasOwn(state, id)).map((id) => [id, state[id]] as const);
  while (entries.length && new TextEncoder().encode(JSON.stringify(Object.fromEntries(entries))).byteLength > Math.min(VIEW_STATE_BYTE_BUDGET, byteBudget)) entries.shift();
  return Object.fromEntries(entries);
}
interface LocalStateContext { state: ViewState; update(id: string, value: ElementState): void }
export const GenUiStateContext = createContext<LocalStateContext | null>(null);

/** One mounted artifact owns one state domain; only discrete local controls can write it. */
export function useGenUiState(initialState: ViewState | undefined, onChange: (state: ViewState) => void, byteBudget = VIEW_STATE_BYTE_BUDGET) {
  const [state, setState] = useState<ViewState>(initialState ?? {});
  const stateRef = useRef(state);
  const recencyRef = useRef(Object.keys(state));
  const [pruned, setPruned] = useState(false);
  return {
    state,
    pruned,
    update(id: string, value: ElementState) {
      const { [id]: previous, ...rest } = stateRef.current;
      const next = { ...rest, [id]: value };
      stateRef.current = next;
      setState(next);
      recencyRef.current = [...recencyRef.current.filter((key) => key !== id), id];
      const persisted = boundViewState(next, recencyRef.current, byteBudget);
      setPruned(Object.keys(persisted).length < Object.keys(next).length);
      onChange(persisted);
    },
  };
}
export function useElementViewState(id: string): [ElementState, (state: ElementState) => void] {
  const context = useContext(GenUiStateContext);
  if (!context) throw new Error("交互讲解缺少本地状态域");
  return [context.state[id] ?? {}, (state) => context.update(id, state)];
}
