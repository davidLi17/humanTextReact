import { expect, test } from "bun:test";
import { HistoryManager } from "../../entrypoints/background/historyManager.ts";
import { MessageUtils } from "../../entrypoints/background/messageUtils.ts";
import { RequestManager } from "../../entrypoints/background/requestManager.ts";
import { TranslationService } from "../../entrypoints/background/translationService.ts";
import { createSidepanelTarget } from "../../entrypoints/shared/requestProtocol.ts";
import { SettingsUtils } from "../../entrypoints/shared/settingsUtils.ts";
import {
  preserveGlobals,
  setTestGlobal,
} from "../helpers/testEnvironment.js";

const restoreGlobals = preserveGlobals("fetch");

test("TranslationService Authorization 使用显式覆盖 key，并在未覆盖时回退配置 key", async () => {
  const originalGetSettings = SettingsUtils.getSettings;
  const originalSendRuntimeMessage = MessageUtils.sendRuntimeMessage;
  const originalSaveHistory = HistoryManager.saveTranslationHistory;
  const authorizations = [];

  try {
    SettingsUtils.getSettings = async () => ({
      apiKey: "config-key",
      baseUrl: "https://example.com/chat",
      model: "test-model",
      temperature: 0,
      promptTemplate: "测试提示词",
      thinkingEnabled: false,
      showSelectionToolbar: true,
      logLevel: "error",
      theme: "system",
    });
    MessageUtils.sendRuntimeMessage = async () => true;
    HistoryManager.saveTranslationHistory = async () => {};
    setTestGlobal("fetch",  async (_url, options) => {
      authorizations.push(options.headers.Authorization);
      return new Response(
        'data: {"choices":[{"delta":{"content":"成功"}}]}\n\ndata: [DONE]\n\n',
        { status: 200, headers: { "Content-Type": "text/event-stream" } }
      );
    });

    for (const [requestId, apiKey] of [
      ["auth-override", "override-key"],
      ["auth-fallback", undefined],
    ]) {
      RequestManager.createRequest(
        requestId,
        createSidepanelTarget("auth-session")
      );
      const context = RequestManager.claimRequest(requestId);
      expect(context).toBeDefined();
      await TranslationService.translateText(
        { text: "测试", apiKey },
        context
      );
    }

    expect(authorizations).toEqual([
      "Bearer override-key",
      "Bearer config-key",
    ]);
  } finally {
    restoreGlobals();
    SettingsUtils.getSettings = originalGetSettings;
    MessageUtils.sendRuntimeMessage = originalSendRuntimeMessage;
    HistoryManager.saveTranslationHistory = originalSaveHistory;
    RequestManager.cleanupRequest("auth-override");
    RequestManager.cleanupRequest("auth-fallback");
  }
});
