import { Window } from "happy-dom";
import { afterEach, describe, expect, test } from "bun:test";
import { PopupManager } from "../../entrypoints/content/popupManager";
import {
  preserveGlobals,
  setTestGlobal,
} from "../helpers/testEnvironment.js";

const restoreGlobals = preserveGlobals("browser", "document", "window", "navigator");

afterEach(() => {
  restoreGlobals();
});

function createBrowser(sendMessage: (message: unknown) => Promise<unknown>) {
  return {
    runtime: { sendMessage },
    storage: {
      sync: { get: async () => ({}) },
      local: { get: async () => ({}) },
      onChanged: { addListener() {}, removeListener() {} },
    },
  };
}

describe("Content 浮窗生词本编辑器", () => {
  test("无选区上下文时使用展示瞬间捕获的页面 URL，保存失败恢复四字段编辑", async () => {
    const page = new Window({ url: "https://example.com/article" });
    setTestGlobal("window", page);
    setTestGlobal("document", page.document);
    setTestGlobal("navigator", page.navigator);

    let rejectSave: ((value: unknown) => void) | undefined;
    const saveResponse = new Promise((resolve) => {
      rejectSave = resolve;
    });
    setTestGlobal(
      "browser",
      createBrowser(async (message: any) => {
        if (message.action === "saveJargonItem") return saveResponse;
        return { success: true };
      })
    );

    const manager = new PopupManager();
    const popup = manager.showPopup("RAG", "popup-request");
    manager.updateTranslation({
      requestId: "popup-request",
      content: "### 🍼 直白人话版\n先查资料再回答。",
      done: true,
    } as any);

    const vaultButton = popup.querySelector(
      ".translator-vault-btn"
    ) as HTMLButtonElement;
    expect(vaultButton.disabled).toBe(false);
    vaultButton.click();
    const editor = popup.querySelector(".translator-jargon-editor") as HTMLElement;
    expect(editor).toBeTruthy();
    expect(
      (editor.querySelector("[aria-label='来源链接']") as HTMLInputElement).value
    ).toBe("https://example.com/article");
    expect(editor.textContent).toContain("已选用直白人话");

    const fields = Array.from(
      editor.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        "input, textarea"
      )
    );
    const saveButton = editor.querySelector(
      ".translator-jargon-save-btn"
    ) as HTMLButtonElement;
    editor.dispatchEvent(
      new page.Event("submit", { bubbles: true, cancelable: true }) as unknown as Event
    );
    await Promise.resolve();
    expect(saveButton.disabled).toBe(true);
    expect(fields.every((field) => field.disabled)).toBe(true);

    rejectSave?.({ success: false, error: "保存失败" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(saveButton.disabled).toBe(false);
    expect(fields.every((field) => field.disabled)).toBe(false);
    expect(editor.textContent).toContain("保存失败");
    manager.destroy();
  });
});
