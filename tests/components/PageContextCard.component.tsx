import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "bun:test";
import PageContextCard from "../../entrypoints/sidepanel/components/PageContextCard";
import type { ChatMessage } from "../../entrypoints/shared/chatTypes";

type PageMeta = NonNullable<ChatMessage["pageMeta"]>;

function createMeta(overrides: Partial<PageMeta> = {}): PageMeta {
  return {
    title: "一篇很长的技术文章",
    url: "https://example.com/article?from=sidepanel",
    contextOnly: true,
    attachedPage: {
      version: 1,
      content: `${"A".repeat(16_000)}${"B".repeat(2_000)}`,
      capturedChars: 20_000,
      hasMoreContent: true,
      selectedSegments: [1],
    },
    ...overrides,
  };
}

afterEach(cleanup);

describe("PageContextCard", () => {
  test("勾选段落时通知父组件新的参与回答范围", () => {
    const selections: number[][] = [];
    render(
      <PageContextCard
        meta={createMeta()}
        disabled={false}
        onSelectionChange={(segments) => selections.push(segments)}
      />
    );

    fireEvent.click(screen.getByText("预览已保存原文"));
    fireEvent.click(screen.getByRole("checkbox", { name: "第 2 段参与回答" }));

    expect(selections).toEqual([[1, 2]]);
    expect(screen.getByText("下次提问带入：16,000 字符")).toBeTruthy();
  });

  test("切换预览段落不会改变参与回答范围", () => {
    const onSelectionChange = () => {
      throw new Error("预览不应修改参与回答范围");
    };
    render(
      <PageContextCard
        meta={createMeta()}
        disabled={false}
        onSelectionChange={onSelectionChange}
      />
    );

    fireEvent.click(screen.getByText("预览已保存原文"));
    fireEvent.click(screen.getByRole("button", { name: "预览第 2 段" }));

    expect(screen.getByLabelText("第 2 段原文").textContent).toBe("B".repeat(2_000));
    expect(
      (screen.getByRole("checkbox", { name: "第 1 段参与回答" }) as HTMLInputElement).checked
    ).toBe(true);
  });

  test("清空按钮移除全部参与回答段落", () => {
    const selections: number[][] = [];
    render(
      <PageContextCard
        meta={createMeta({
          attachedPage: { ...createMeta().attachedPage!, selectedSegments: [1, 2] },
        })}
        disabled={false}
        onSelectionChange={(segments) => selections.push(segments)}
      />
    );

    fireEvent.click(screen.getByText("预览已保存原文"));
    fireEvent.click(screen.getByRole("button", { name: "清空参与回答的段落" }));

    expect(selections).toEqual([[]]);
  });

  test("生成中禁用范围修改，预览仍可切换", () => {
    const selections: number[][] = [];
    render(
      <PageContextCard
        meta={createMeta()}
        disabled
        onSelectionChange={(segments) => selections.push(segments)}
      />
    );

    fireEvent.click(screen.getByText("预览已保存原文"));
    expect(
      (screen.getByRole("checkbox", { name: "第 1 段参与回答" }) as HTMLInputElement).disabled
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "清空参与回答的段落" }) as HTMLButtonElement).disabled
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "预览第 2 段" }));

    expect(screen.getByLabelText("第 2 段原文")).toBeTruthy();
    expect(selections).toEqual([]);
  });

  test("旧记录标明来源范围未知，且只渲染安全来源链接", () => {
    const { rerender } = render(
      <PageContextCard
        meta={createMeta({ attachedPage: undefined, sourceContent: "旧记录首段" })}
        disabled={false}
        onSelectionChange={() => {}}
      />
    );

    expect(screen.getByText("已采集：未知（旧记录）")).toBeTruthy();
    expect(screen.getByText("旧记录只保存首段，请重新加入网页以使用完整上下文。")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "打开来源：example.com" }).getAttribute("href")
    ).toBe("https://example.com/article?from=sidepanel");

    rerender(
      <PageContextCard
        meta={createMeta({ url: "javascript:alert(1)" })}
        disabled={false}
        onSelectionChange={() => {}}
      />
    );

    expect(screen.queryByRole("link", { name: /打开来源/ })).toBeNull();
  });

  test("异常快照显示可重新加入的空状态且不会崩溃", () => {
    render(
      <PageContextCard
        meta={createMeta({
          sourceContent: undefined,
          attachedPage: {
            version: 1,
            content: undefined,
            capturedChars: 20_000,
            hasMoreContent: false,
            selectedSegments: 2,
          } as never,
        })}
        disabled={false}
        onSelectionChange={() => {}}
      />
    );

    expect(screen.getByText("没有可用的网页正文，请重新加入网页。")).toBeTruthy();
  });

  test("异常标题和来源字段仍可预览正文并隐藏危险链接", () => {
    render(
      <PageContextCard
        meta={createMeta({ title: { invalid: true }, url: {} } as never)}
        disabled={false}
        onSelectionChange={() => {}}
      />
    );

    expect(screen.getByText("未命名网页")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /打开来源/ })).toBeNull();
    fireEvent.click(screen.getByText("预览已保存原文"));
    expect(screen.getByLabelText("第 1 段原文").textContent).toBe("A".repeat(16_000));
  });
});
