import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { JargonVault } from "../entrypoints/shared/jargonVault.ts";
import { JARGON_STORAGE_KEY } from "../entrypoints/shared/jargonTypes.ts";
import { MessageHandler } from "../entrypoints/background/messageHandler.ts";
import { MESSAGE_TYPES } from "../entrypoints/shared/constants/index.ts";
import {
  getJargonList,
  importJargonItems,
  inferJargonDetails,
} from "../entrypoints/shared/jargonStorage.ts";

// 模拟内存存储
let mockStorage = {};

function setupMockBrowser() {
  mockStorage = {};
  globalThis.browser = {
    storage: {
      local: {
        get: async (keys) => {
          if (typeof keys === "string") {
            return { [keys]: mockStorage[keys] };
          }
          if (Array.isArray(keys)) {
            const res = {};
            keys.forEach((k) => (res[k] = mockStorage[k]));
            return res;
          }
          return { ...mockStorage };
        },
        set: async (items) => {
          Object.assign(mockStorage, items);
        },
      },
    },
  };
}

beforeEach(() => {
  setupMockBrowser();
});

afterEach(() => {
  delete globalThis.browser;
});

describe("JargonVault 核心存储与管理", () => {
  test("旧数据读取后自动迁移，所有入口共享规范模型", async () => {
    mockStorage[JARGON_STORAGE_KEY] = [
      {
        id: "legacy-1",
        term: "向上管理",
        explanation: "主动帮助上级获得完整信息。",
        metaphor: "像副驾驶及时提醒路线。",
        category: "职场暗语",
        tags: ["职场"],
        starred: true,
        createdAt: 100,
        updatedAt: 200,
      },
    ];

    const sidepanelList = await getJargonList();
    expect(sidepanelList[0].analogy).toBe("像副驾驶及时提醒路线。");
    expect(sidepanelList[0].isStarred).toBe(true);
    expect(sidepanelList[0].category).toBe("职场");

    const stored = mockStorage[JARGON_STORAGE_KEY][0];
    expect(stored.metaphor).toBeUndefined();
    expect(stored.starred).toBeUndefined();
    expect(stored.analogy).toBe("像副驾驶及时提醒路线。");
    expect(stored.isStarred).toBe(true);

    await JargonVault.addJargon({
      term: "现金流",
      explanation: "持续进入和流出的钱。",
      metaphor: "像水管里的水。",
      starred: true,
      category: "金融",
    });
    const sharedList = await getJargonList();
    expect(sharedList.find((item) => item.term === "现金流")?.analogy).toBe(
      "像水管里的水。"
    );
  });

  test("规范 JSON 可回导，并兼容 jargonList 包装", async () => {
    await JargonVault.addJargon({
      term: "复利",
      explanation: "收益继续参与下一轮增长。",
      category: "金融",
      starred: true,
    });
    const json = await JargonVault.exportJargonAsJson();
    const exported = JSON.parse(json);
    expect(exported.items[0].isStarred).toBe(true);
    expect(exported.items[0].starred).toBeUndefined();

    await JargonVault.clearAll();
    const roundTrip = await importJargonItems(json);
    expect(roundTrip.success).toBe(true);
    expect((await getJargonList())[0].term).toBe("复利");

    const legacyWrapper = await importJargonItems({
      jargonList: [
        {
          term: "安全金",
          explanation: "用于覆盖突发情况的现金储备。",
          category: "金融",
          starred: true,
        },
      ],
    });
    expect(legacyWrapper.success).toBe(true);
    expect((await getJargonList()).find((item) => item.term === "安全金")?.isStarred).toBe(true);
  });

  test("侧边栏长问题提炼为短术语并保留原始上下文", () => {
    const question =
      "请解释为什么安全金能够在失业、身体问题和市场低点出现时，为普通人保留等待、拒绝和重新选择工作的权利，并说明应该准备多长时间的生活费";
    const inferred = inferJargonDetails(question, "安全金的核心价值是购买决策时间。");
    expect(inferred.term.length).toBeLessThanOrEqual(61);
    expect(inferred.term.endsWith("…")).toBe(true);
    expect(question).not.toBe(inferred.term);
    expect(inferred.category).toBe("金融");
  });

  test("添加新生词条目 (addJargon) 并验证默认属性与 UUID 生成", async () => {
    const item = await JargonVault.addJargon({
      term: "颗粒度",
      explanation: "指工作分工或讨论方案的详细/精细程度。",
      metaphor: "像把整块豆腐切成大块还是碎粒。",
      category: "大厂黑话",
      tags: ["管理", "效率", "管理"], // 测试自动去重
      sourceContext: "咱们需要把这个方案的颗粒度再对齐细化一下。",
      sourceUrl: "https://example.com/meeting",
      starred: true,
    });

    expect(item.id).toBeDefined();
    expect(typeof item.id).toBe("string");
    expect(item.term).toBe("颗粒度");
    expect(item.explanation).toBe("指工作分工或讨论方案的详细/精细程度。");
    expect(item.analogy).toBe("像把整块豆腐切成大块还是碎粒。");
    expect(item.category).toBe("大厂黑话");
    expect(item.tags).toEqual(["管理", "效率"]);
    expect(item.isStarred).toBe(true);
    expect(item.createdAt).toBeGreaterThan(0);
    expect(item.updatedAt).toBeGreaterThan(0);

    const stored = mockStorage[JARGON_STORAGE_KEY];
    expect(stored).toHaveLength(1);
    expect(stored[0].term).toBe("颗粒度");
  });

  test("添加同名术语时自动排重与智能合并 (智能去重)", async () => {
    const initial = await JargonVault.addJargon({
      term: "RAG",
      explanation: "检索增强生成技术。",
      category: "AI技术",
      tags: ["AI", "LLM"],
      starred: false,
    });

    // 稍作延迟
    const initialCreatedAt = initial.createdAt;
    const initialId = initial.id;

    // 再次添加同名词条（大小写与前后空格不敏感）
    const merged = await JargonVault.addJargon({
      term: "  rag  ",
      explanation: "检索增强生成：先查知识库再回答。",
      metaphor: "开卷考试，先翻书找资料再作答。",
      tags: ["NLP", "AI"],
      starred: true,
    });

    expect(merged.id).toBe(initialId);
    expect(merged.createdAt).toBe(initialCreatedAt);
    expect(merged.term).toBe("rag");
    expect(merged.explanation).toBe("检索增强生成：先查知识库再回答。");
    expect(merged.analogy).toBe("开卷考试，先翻书找资料再作答。");
    expect(merged.isStarred).toBe(true);
    // 标签应合并去重: ["AI", "LLM", "NLP"]
    expect(merged.tags).toContain("AI");
    expect(merged.tags).toContain("LLM");
    expect(merged.tags).toContain("NLP");

    const list = await JargonVault.getJargonList();
    expect(list).toHaveLength(1);
  });

  test("校验输入必填项：term 或 explanation 为空时抛出异常", async () => {
    expect(
      JargonVault.addJargon({
        term: "",
        explanation: "解释",
      })
    ).rejects.toThrow("术语名称 (term) 不能为空");

    expect(
      JargonVault.addJargon({
        term: "对齐",
        explanation: "   ",
      })
    ).rejects.toThrow("人话释义 (explanation) 不能为空");
  });

  test("获取列表支持分类过滤与星标过滤", async () => {
    await JargonVault.addJargon({
      term: "赋能",
      explanation: "给别人提供能力或资源支持。",
      category: "大厂黑话",
      starred: false,
    });

    await JargonVault.addJargon({
      term: "Transformer",
      explanation: "主流深度学习自注意力模型架构。",
      category: "AI技术",
      starred: true,
    });

    await JargonVault.addJargon({
      term: "闭环",
      explanation: "事情有头有尾，形成完整反馈流。",
      category: "大厂黑话",
      starred: true,
    });

    // 1. 获取全量列表（默认星标置顶）
    const all = await JargonVault.getJargonList();
    expect(all).toHaveLength(3);
    expect(all[0].isStarred).toBe(true);
    expect(all[1].isStarred).toBe(true);
    expect(all[2].isStarred).toBe(false);

    // 2. 分类过滤
    const aiItems = await JargonVault.getJargonList(undefined, "AI技术");
    expect(aiItems).toHaveLength(1);
    expect(aiItems[0].term).toBe("Transformer");

    // 3. 星标过滤
    const starredItems = await JargonVault.getJargonList(undefined, undefined, true);
    expect(starredItems).toHaveLength(2);
    expect(starredItems.every((item) => item.isStarred)).toBe(true);

    // 4. 分类 + 星标联合过滤
    const filtered = await JargonVault.getJargonList(undefined, "大厂黑话", true);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].term).toBe("闭环");
  });

  test("Fuse.js 模糊检索支持检索 term、explanation、tags", async () => {
    await JargonVault.addJargon({
      term: "抓手",
      explanation: "开展工作时的切入点或着力点。",
      tags: ["项目管理", "黑话"],
    });

    await JargonVault.addJargon({
      term: "LoRA",
      explanation: "大语言模型低秩微调技术，显存占用少。",
      tags: ["微调", "大模型"],
    });

    await JargonVault.addJargon({
      term: "底层逻辑",
      explanation: "事物背后运作最本质的机理。",
      tags: ["认知"],
    });

    // 搜索 term
    const searchByTerm = await JargonVault.getJargonList("抓手");
    expect(searchByTerm.length).toBeGreaterThanOrEqual(1);
    expect(searchByTerm[0].term).toBe("抓手");

    // 搜索 explanation
    const searchByExplanation = await JargonVault.getJargonList("低秩微调");
    expect(searchByExplanation.length).toBeGreaterThanOrEqual(1);
    expect(searchByExplanation[0].term).toBe("LoRA");

    // 搜索 tags
    const searchByTag = await JargonVault.getJargonList("认知");
    expect(searchByTag.length).toBeGreaterThanOrEqual(1);
    expect(searchByTag[0].term).toBe("底层逻辑");
  });

  test("编辑修改词条 (updateJargon)", async () => {
    const item = await JargonVault.addJargon({
      term: "打法",
      explanation: "做事的方法或策略。",
    });

    const updated = await JargonVault.updateJargon(item.id, {
      explanation: "具体的战术策略与执行套路。",
      metaphor: "打牌的出牌套路。",
      category: "职场暗语",
      tags: ["策略"],
    });

    expect(updated.id).toBe(item.id);
    expect(updated.explanation).toBe("具体的战术策略与执行套路。");
    expect(updated.analogy).toBe("打牌的出牌套路。");
    expect(updated.category).toBe("职场");
    expect(updated.tags).toEqual(["策略"]);

    // 不存在的 ID 应抛出异常
    expect(
      JargonVault.updateJargon("non-existent-id", { explanation: "test" })
    ).rejects.toThrow("未找到指定词条");
  });

  test("旧字段更新可以覆盖已有规范字段", async () => {
    const item = await JargonVault.addJargon({
      term: "抓重点",
      explanation: "优先处理最关键的信息。",
      analogy: "先抓主干。",
      isStarred: true,
    });

    const updated = await JargonVault.updateJargon(item.id, {
      metaphor: "先找到树干，再处理枝叶。",
      starred: false,
    });

    expect(updated.analogy).toBe("先找到树干，再处理枝叶。");
    expect(updated.isStarred).toBe(false);
    const stored = mockStorage[JARGON_STORAGE_KEY][0];
    expect(stored.analogy).toBe("先找到树干，再处理枝叶。");
    expect(stored.isStarred).toBe(false);
    expect(stored.metaphor).toBeUndefined();
    expect(stored.starred).toBeUndefined();
  });

  test("删除词条 (deleteJargon)", async () => {
    const item = await JargonVault.addJargon({
      term: "背锅",
      explanation: "替他人承担过失责任。",
    });

    expect(await JargonVault.deleteJargon(item.id)).toBe(true);

    const list = await JargonVault.getJargonList();
    expect(list).toHaveLength(0);

    // 重复删除返回 false
    expect(await JargonVault.deleteJargon(item.id)).toBe(false);
  });

  test("切换星标状态 (toggleStar)", async () => {
    const item = await JargonVault.addJargon({
      term: "ROI",
      explanation: "投资回报率。",
      starred: false,
    });

    const starred = await JargonVault.toggleStar(item.id);
    expect(starred.isStarred).toBe(true);

    const unstarred = await JargonVault.toggleStar(item.id);
    expect(unstarred.isStarred).toBe(false);
  });

  test("导出为美观的 Markdown 词典 (exportJargonAsMarkdown)", async () => {
    await JargonVault.addJargon({
      term: "心智",
      explanation: "用户对某种品牌或认知的既定印象。",
      category: "大厂黑话",
      metaphor: "就像在用户脑子里占了个车位。",
      tags: ["用户心理", "运营"],
      sourceContext: "我们要抢占用户心智。",
      sourceUrl: "https://example.com/growth",
      starred: true,
    });

    const md = await JargonVault.exportJargonAsMarkdown();
    expect(md).toContain("# 📚 人话翻译器 · 黑话生词本与收藏");
    expect(md).toContain("心智 ⭐");
    expect(md).toContain("用户对某种品牌或认知的既定印象。");
    expect(md).toContain("就像在用户脑子里占了个车位。");
    expect(md).toContain("`#用户心理`");
    expect(md).toContain("- **使用上下文**: 我们要抢占用户心智。");
    expect(md).toContain("[https://example.com/growth](https://example.com/growth)");
  });

  test("导出标准 JSON 备份 (exportJargonAsJson)", async () => {
    await JargonVault.addJargon({
      term: "链路",
      explanation: "从头到尾的完整流程或节点链条。",
      category: "大厂黑话",
    });

    const jsonStr = await JargonVault.exportJargonAsJson();
    const parsed = JSON.parse(jsonStr);

    expect(parsed.version).toBe("2.0");
    expect(parsed.count).toBe(1);
    expect(Array.isArray(parsed.items)).toBe(true);
    expect(parsed.items[0].term).toBe("链路");
  });

  test("批量导入 JSON 并智能去重 (importJargonFromJson)", async () => {
    await JargonVault.addJargon({
      term: "拉通",
      explanation: "让各方信息同步。",
      tags: ["沟通"],
      starred: false,
    });

    const importData = {
      version: "1.0",
      items: [
        {
          term: "拉通",
          explanation: "组织各方同步信息，消除信息差。",
          tags: ["协作", "对齐"],
          starred: true,
        },
        {
          term: "Agent",
          explanation: "具备感知、规划和行动能力的自主智能体。",
          category: "AI技术",
          tags: ["AI", "智能体"],
        },
        {
          term: "", // 无效数据
          explanation: "invalid",
        },
      ],
    };

    const result = await JargonVault.importJargonFromJson(JSON.stringify(importData));

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(1); // Agent
    expect(result.updatedCount).toBe(1); // 拉通
    expect(result.totalCount).toBe(2);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);

    const list = await JargonVault.getJargonList();
    expect(list).toHaveLength(2);

    const latong = list.find((i) => i.term === "拉通");
    expect(latong?.explanation).toBe("组织各方同步信息，消除信息差。");
    expect(latong?.isStarred).toBe(true);
    expect(latong?.tags).toContain("沟通");
    expect(latong?.tags).toContain("协作");

    const agent = list.find((i) => i.term === "Agent");
    expect(agent?.category).toBe("AI技术");
  });
});

describe("后台消息处理通信 (MessageHandler Jargon Protocol)", () => {
  test("处理 SAVE_JARGON_ITEM 消息", async () => {
    let response;
    const handled = MessageHandler.handleRuntimeMessage(
      {
        action: MESSAGE_TYPES.SAVE_JARGON_ITEM,
        item: {
          term: "击穿",
          explanation: "突破底线或彻底打透某一垂直领域。",
          category: "大厂黑话",
        },
      },
      {},
      (res) => {
        response = res;
      }
    );

    expect(handled).toBe(true);
    // 等待异步响应
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(response).toBeDefined();
    expect(response.success).toBe(true);
    expect(response.item.term).toBe("击穿");
  });

  test("处理 GET_JARGON_LIST, TOGGLE_JARGON_STAR, UPDATE, DELETE 消息流程", async () => {
    // 1. 保存
    const item = await JargonVault.addJargon({
      term: "复盘",
      explanation: "回顾总结项目过程并沉淀经验教训。",
      category: "大厂黑话",
    });

    // 2. 获取列表
    let getResponse;
    MessageHandler.handleRuntimeMessage(
      {
        action: MESSAGE_TYPES.GET_JARGON_LIST,
        category: "大厂黑话",
      },
      {},
      (res) => {
        getResponse = res;
      }
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(getResponse.success).toBe(true);
    expect(getResponse.list.length).toBe(1);

    // 3. 切换星标
    let toggleResponse;
    MessageHandler.handleRuntimeMessage(
      {
        action: MESSAGE_TYPES.TOGGLE_JARGON_STAR,
        id: item.id,
      },
      {},
      (res) => {
        toggleResponse = res;
      }
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(toggleResponse.success).toBe(true);
    expect(toggleResponse.item.isStarred).toBe(true);

    // 4. 更新词条
    let updateResponse;
    MessageHandler.handleRuntimeMessage(
      {
        action: MESSAGE_TYPES.UPDATE_JARGON_ITEM,
        id: item.id,
        updates: { explanation: "回顾过去，提升未来。" },
      },
      {},
      (res) => {
        updateResponse = res;
      }
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(updateResponse.success).toBe(true);
    expect(updateResponse.item.explanation).toBe("回顾过去，提升未来。");

    // 5. 删除词条
    let deleteResponse;
    MessageHandler.handleRuntimeMessage(
      {
        action: MESSAGE_TYPES.DELETE_JARGON_ITEM,
        id: item.id,
      },
      {},
      (res) => {
        deleteResponse = res;
      }
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(deleteResponse.success).toBe(true);

    // 验证删除后列表为空
    const remaining = await JargonVault.getJargonList();
    expect(remaining).toHaveLength(0);
  });

  test("处理 EXPORT_JARGON 与 IMPORT_JARGON 消息", async () => {
    await JargonVault.addJargon({
      term: "Prompt",
      explanation: "给大模型的输入提示词或指令。",
      category: "AI技术",
    });

    // 导出 Markdown
    let exportMdResponse;
    MessageHandler.handleRuntimeMessage(
      {
        action: MESSAGE_TYPES.EXPORT_JARGON,
        format: "markdown",
      },
      {},
      (res) => {
        exportMdResponse = res;
      }
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(exportMdResponse.success).toBe(true);
    expect(exportMdResponse.data).toContain("Prompt");

    // 导出 JSON
    let exportJsonResponse;
    MessageHandler.handleRuntimeMessage(
      {
        action: MESSAGE_TYPES.EXPORT_JARGON,
        format: "json",
      },
      {},
      (res) => {
        exportJsonResponse = res;
      }
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(exportJsonResponse.success).toBe(true);
    const parsed = JSON.parse(exportJsonResponse.data);
    expect(parsed.items[0].term).toBe("Prompt");

    // 清空并导入
    await JargonVault.clearAll();

    let importResponse;
    MessageHandler.handleRuntimeMessage(
      {
        action: MESSAGE_TYPES.IMPORT_JARGON,
        jsonStr: exportJsonResponse.data,
      },
      {},
      (res) => {
        importResponse = res;
      }
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(importResponse.success).toBe(true);
    expect(importResponse.importedCount).toBe(1);

    const list = await JargonVault.getJargonList();
    expect(list).toHaveLength(1);
    expect(list[0].term).toBe("Prompt");
  });
});
