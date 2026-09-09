import { describe, expect, test } from "bun:test";
import {
  getPrismContentByTab,
  getPrismCopyText,
  parsePrismTranslation,
} from "../../entrypoints/shared/prismParser";
import {
  buildPrismSystemPrompt,
  PRISM_SYSTEM_PROMPT,
} from "../../entrypoints/shared/prismPrompt";
import { PRISM_TAB_KEYS } from "../../entrypoints/shared/prismTypes";

describe("Prism Translation Parser & Prompt", () => {
  describe("buildPrismSystemPrompt", () => {
    test("returns standard prompt when no base template is provided", () => {
      expect(buildPrismSystemPrompt()).toBe(PRISM_SYSTEM_PROMPT);
      expect(buildPrismSystemPrompt("")).toBe(PRISM_SYSTEM_PROMPT);
    });

    test("appends custom preferences to standard prism prompt", () => {
      const custom = "请全部用可爱的语气回答";
      const result = buildPrismSystemPrompt(custom);
      expect(result).toContain(PRISM_SYSTEM_PROMPT);
      expect(result).toContain(custom);
    });

    test("does not duplicate if base template already contains prism sections", () => {
      const custom = "这是我的 ### 🍼 直白人话版 和 ### 👔 向上汇报版 以及 ### 🔪 犀利真相版 模板";
      expect(buildPrismSystemPrompt(custom)).toBe(custom);
    });
  });

  describe("parsePrismTranslation", () => {
    test("handles empty or whitespace-only text", () => {
      const parsed = parsePrismTranslation("");
      expect(parsed.isPrism).toBe(false);
      expect(parsed.raw).toBe("");
      expect(parsed.vernacular).toBe("");
    });

    test("falls back gracefully on non-prism regular text", () => {
      const text = "这是一段普通的翻译结果，没有任何三棱镜标记。";
      const parsed = parsePrismTranslation(text);
      expect(parsed.isPrism).toBe(false);
      expect(parsed.raw).toBe(text);
      expect(parsed.vernacular).toBe(text);
      expect(parsed.corporate).toBe("");
      expect(parsed.truth).toBe("");
      expect(getPrismContentByTab(parsed, PRISM_TAB_KEYS.VERNACULAR)).toBe(text);
      expect(getPrismContentByTab(parsed, PRISM_TAB_KEYS.CORPORATE)).toBe(text);
    });

    test("correctly parses fully rendered 3-in-1 prism output", () => {
      const text = `
### 🍼 直白人话版
大家别各自为战了，一起凑个会分工干活，帮业务多拉点客户。就像做一桌菜，有人洗菜有人炒菜。

### 👔 向上汇报版
完成端到端交互韧性重构，深度优化关键路径渲染损耗，推动用户链路流畅度显著提升，实现业务价值闭环。

### 🔪 犀利真相版
现在不想做，以后大概率也不做，先开个会把你糊弄过去。
`.trim();

      const parsed = parsePrismTranslation(text);
      expect(parsed.isPrism).toBe(true);
      expect(parsed.vernacular).toContain("大家别各自为战了");
      expect(parsed.vernacular).toContain("就像做一桌菜");
      expect(parsed.corporate).toContain("完成端到端交互韧性重构");
      expect(parsed.truth).toContain("现在不想做，以后大概率也不做");
      expect(parsed.activeStreamKey).toBe("truth");

      expect(getPrismContentByTab(parsed, PRISM_TAB_KEYS.VERNACULAR)).toBe(parsed.vernacular);
      expect(getPrismContentByTab(parsed, PRISM_TAB_KEYS.CORPORATE)).toBe(parsed.corporate);
      expect(getPrismContentByTab(parsed, PRISM_TAB_KEYS.TRUTH)).toBe(parsed.truth);
      expect(getPrismContentByTab(parsed, PRISM_TAB_KEYS.RAW)).toBe(text);

      expect(getPrismCopyText(parsed, PRISM_TAB_KEYS.CORPORATE)).toBe(parsed.corporate);
    });

    test("correctly handles streaming state during generation", () => {
      // 场景 1：仅直白人话版正在生成
      const chunk1 = `### 🍼 直白人话版\n这相当于买菜的时候给的塑料袋`;
      const p1 = parsePrismTranslation(chunk1);
      expect(p1.isPrism).toBe(true);
      expect(p1.vernacular).toBe("这相当于买菜的时候给的塑料袋");
      expect(p1.corporate).toBe("");
      expect(p1.truth).toBe("");
      expect(p1.activeStreamKey).toBe("vernacular");

      // 场景 2：汇报版正在生成
      const chunk2 = `${chunk1}\n\n### 👔 向上汇报版\n构建基础设施交付底座`;
      const p2 = parsePrismTranslation(chunk2);
      expect(p2.isPrism).toBe(true);
      expect(p2.vernacular).toBe("这相当于买菜的时候给的塑料袋");
      expect(p2.corporate).toBe("构建基础设施交付底座");
      expect(p2.truth).toBe("");
      expect(p2.activeStreamKey).toBe("corporate");
    });
  });

  describe("buildMessagesPayload with prismMode", () => {
    test("embeds prism instructions when prismMode: true is passed", async () => {
      const { buildMessagesPayload } = await import(
        "../../entrypoints/background/translationService"
      );
      const payload = buildMessagesPayload({
        text: "心智沉淀",
        promptTemplate: "基础提示词",
        prismMode: true,
      });

      expect(payload[0].role).toBe("system");
      expect(payload[0].content).toContain("多维视角三棱镜");
      expect(payload[0].content).toContain("🍼 直白人话版");
      expect(payload[0].content).toContain("👔 向上汇报版");
      expect(payload[0].content).toContain("🔪 犀利真相版");
      expect(payload[0].content).toContain("基础提示词");
      expect(payload[1].role).toBe("user");
      expect(payload[1].content).toBe("心智沉淀");
    });

    test("keeps exact template when prismMode is false", async () => {
      const { buildMessagesPayload } = await import(
        "../../entrypoints/background/translationService"
      );
      const payload = buildMessagesPayload({
        text: "心智沉淀",
        promptTemplate: "纯净提示词",
        prismMode: false,
      });

      expect(payload[0].content).toBe("纯净提示词");
    });
  });
});
