import { describe, test, expect } from "bun:test";
import {
  cropRect,
  elementSourceUrl,
  elementSnapshotText,
  type ElementSnapshot,
} from "../../entrypoints/shared/elementSnapshot";
import { buildHistoryPayload } from "../../entrypoints/shared/chatTypes";
import { createApiError } from "../../entrypoints/shared/errors";
import { buildModelParams } from "../../entrypoints/shared/modelCatalog";
describe("element snapshots", () => {
  test("source attribution excludes query values, fragments and URL credentials",()=>{
    expect(elementSourceUrl("https://user:secret@example.com/report?token=private#password")).toBe("https://example.com/report");
  });
  test("image rejection provides actionable feedback without dropping the attachment", () => {
    const error = createApiError(
      400,
      JSON.stringify({
        error: { message: "Model does not support image input" },
      }),
    );
    expect(error.message).toContain("deepseek-flash");
    expect(error.message).toContain("截图未被自动移除");
  });
  test("clips negative offsets and offscreen bounds", () => {
    expect(
      cropRect({ x: -20, y: 50, width: 100, height: 900 }, 800, 600),
    ).toEqual({ x: 0, y: 50, width: 80, height: 550 });
    expect(
      cropRect({ x: 900, y: 0, width: 10, height: 10 }, 800, 600).width,
    ).toBe(0);
  });
  test("preview text and image survive persisted follow-up without DOM references", () => {
    const snapshot: ElementSnapshot = {
      version: 1,
      id: "one",
      number: 1,
      title: "table",
      url: "https://example.test",
      text: "A\tB\n1\t2",
      question: "比较两列",
      truncated: true,
      capturedAt: 1,
      image: "data:image/png;base64,aGVsbG8=",
      scope: "视口内部分元素",
    };
    const text = elementSnapshotText([snapshot]);
    expect(text).toContain("已截断");
    expect(text).toContain(snapshot.scope);
    expect(text).toContain("A\tB\n1\t2");
    const saved = JSON.parse(
      JSON.stringify([
        {
          role: "user",
          content: text,
          images: [{ data: snapshot.image, mimeType: "image/png" }],
        },
      ]),
    );
    const payload = buildHistoryPayload(saved, {
      role: "user",
      content: "继续解释",
    });
    expect(payload[0].content).toEqual([
      { type: "image_url", image_url: { url: snapshot.image } },
      { type: "text", text },
    ]);
    expect(payload[1].content).toBe("继续解释");
  });
  test("DeepSeek uses official thinking field with image-capable alias", () => {
    expect(
      buildModelParams({
        baseUrl: "https://api.deepseek.com/v1/chat/completions",
        model: "deepseek-flash",
        thinkingEnabled: true,
        temperature: 0.5,
      }),
    ).toMatchObject({ thinking: { type: "enabled" } });
    expect(
      buildModelParams({
        baseUrl: "https://api.deepseek.com/v1/chat/completions",
        model: "deepseek-flash",
        thinkingEnabled: false,
        temperature: 0.5,
      }),
    ).toMatchObject({ thinking: { type: "disabled" } });
  });
});
