import { describe, expect, test } from "bun:test";
import {
  deleteJargonItem,
  exportJargonAsJson,
  exportJargonAsMarkdown,
  getJargonList,
  importJargonItems,
  inferJargonDetails,
  saveJargonItem,
  toggleStarJargon,
  updateJargonItem,
} from "../entrypoints/shared/jargonStorage.ts";

describe("jargonStorage module", () => {
  test("inferJargonDetails extracts term, analogy and category", () => {
    const rawTerm = "什么是赋能？";
    const rawExplanation =
      "赋能就是给别人提供工具和能力，让他能把事情办成。\n\n💡 生活比喻：就像给不会骑车的小孩装上了辅助轮，等他学会了再拆掉。";
    const result = inferJargonDetails(rawTerm, rawExplanation);

    expect(result.term).toBe("赋能");
    expect(result.analogy).toContain("辅助轮");
    expect(result.category).toBe("大厂黑话");
    expect(result.tags).toContain("含生活比喻");
  });

  test("inferJargonDetails identifies AI technology category", () => {
    const rawTerm = "RAG 检索增强生成";
    const rawExplanation =
      "RAG 是给大模型配一个实时翻阅的开卷考试参考书库，防止 AI 产生幻觉。";
    const result = inferJargonDetails(rawTerm, rawExplanation);

    expect(result.term).toBe("RAG 检索增强生成");
    expect(result.category).toBe("AI技术");
  });

  test("inferJargonDetails identifies Workplace category", () => {
    const rawTerm = "什么是 OKR？";
    const rawExplanation = "OKR 是公司用来对齐目标和关键结果的考核绩效工具。";
    const result = inferJargonDetails(rawTerm, rawExplanation);

    expect(result.term).toBe("OKR");
    expect(result.category).toBe("职场");
  });

  test("saves and retrieves jargon items", async () => {
    const saved = await saveJargonItem({
      term: "对齐",
      explanation: "大家找个时间坐在一起把想法说到一块去，避免各做各的。",
      analogy: "就像合唱团在演出前要先定一下基准音调。",
      category: "大厂黑话",
      tags: ["沟通", "协同"],
      isStarred: true,
    });

    expect(saved.id).toBeDefined();
    expect(saved.term).toBe("对齐");
    expect(saved.isStarred).toBe(true);

    const list = await getJargonList();
    expect(list.some((item) => item.term === "对齐")).toBe(true);
  });

  test("toggles star status", async () => {
    const saved = await saveJargonItem({
      term: "颗粒度",
      explanation: "事情切分的精细程度。",
      category: "大厂黑话",
      isStarred: false,
    });

    const isStarred = await toggleStarJargon(saved.id);
    expect(isStarred).toBe(true);

    const isStarredAgain = await toggleStarJargon(saved.id);
    expect(isStarredAgain).toBe(false);
  });

  test("updates jargon item", async () => {
    const saved = await saveJargonItem({
      term: "抓手",
      explanation: "着力点。",
      category: "大厂黑话",
    });

    const updated = await updateJargonItem(saved.id, {
      explanation: "着手解决问题切入点与具体工具。",
      tags: ["高频黑话"],
    });

    expect(updated).not.toBeNull();
    expect(updated?.explanation).toBe("着手解决问题切入点与具体工具。");
    expect(updated?.tags).toContain("高频黑话");
  });

  test("deletes jargon item", async () => {
    const saved = await saveJargonItem({
      term: "闭环",
      explanation: "一件事情有始有终。",
      category: "大厂黑话",
    });

    const deleteSuccess = await deleteJargonItem(saved.id);
    expect(deleteSuccess).toBe(true);

    const list = await getJargonList();
    expect(list.some((item) => item.id === saved.id)).toBe(false);
  });

  test("exports to Markdown and JSON", async () => {
    const items = [
      {
        id: "test-1",
        term: "底层逻辑",
        explanation: "事物最基础、最本质的运作规则。",
        analogy: "地基稳不稳决定了高楼能盖多高。",
        category: "大厂黑话",
        tags: ["思维", "本质"],
        isStarred: true,
        createdAt: 1725150000000,
        updatedAt: 1725150000000,
      },
    ];

    const markdown = exportJargonAsMarkdown(items);
    expect(markdown).toContain("# 📚 人话翻译器 · 黑话生词本与收藏");
    expect(markdown).toContain("底层逻辑 ⭐");
    expect(markdown).toContain("地基稳不稳");

    const json = exportJargonAsJson(items);
    expect(json).toContain('"term": "底层逻辑"');
  });

  test("imports jargon items from JSON", async () => {
    const importPayload = [
      {
        term: "降维打击",
        explanation: "用高层次的技术或模式去冲击低层次的传统业务。",
        analogy: "三体人扔二向箔，或者智能手机淘汰数码相机与MP3。",
        category: "大厂黑话",
        tags: ["竞争", "商业"],
        isStarred: true,
      },
      {
        term: "Prompt 工程",
        explanation: "如何给大模型说话能让它听懂并给出最好结果。",
        category: "AI技术",
        tags: ["大模型"],
      },
    ];

    const result = await importJargonItems(importPayload);
    expect(result.success).toBe(true);
    expect(result.count).toBe(2);

    const list = await getJargonList();
    expect(list.some((i) => i.term === "降维打击")).toBe(true);
    expect(list.some((i) => i.term === "Prompt 工程")).toBe(true);
  });
});
