import { Window } from "happy-dom";
import { afterEach, beforeEach, expect, test } from "bun:test";
import { extractElementText } from "../../entrypoints/content/elementText";
import { preserveGlobals, setTestGlobal } from "../helpers/testEnvironment.js";

const restore = preserveGlobals("Node", "Element", "getComputedStyle");
let page: Window;
beforeEach(() => {
  page = new Window();
  setTestGlobal("Node", page.Node);
  setTestGlobal("Element", page.Element);
  setTestGlobal("getComputedStyle", page.getComputedStyle.bind(page));
});
afterEach(() => restore());
const extract = (html: string) => {
  page.document.body.innerHTML = html;
  return extractElementText(page.document.body as unknown as Element);
};

test("nested cards collapse source indentation and repeated layout breaks", () => {
  const result = extract(`<article>
    <div><div><h2> 标题    内容 </h2></div></div>
    <div><p> 摘要  <span>继续   阅读</span> </p></div>
    <div><div><div> 赞同   3502 </div></div></div>
    <div> 387 条评论 </div><div><div> 分享 </div></div>
  </article>`);
  expect(result).toEqual({text:"标题 内容\n摘要 继续 阅读\n赞同 3502\n387 条评论\n分享", truncated:false});
});

test("table rows and empty columns retain their separators without layout blank lines", () => {
  expect(extract(`<table><tr><th> 项目 </th><th></th><th> 金额 </th></tr>
    <tr><td><div> 收入 </div></td><td> 120 </td><td></td></tr></table>`).text)
    .toBe("项目\t\t金额\n收入\t120\t");
});

test("pre and inline code preserve indentation, repeated spaces, tabs and blank lines", () => {
  const code = "  const a = 1;\n\n\tif (a) {\n    console.log(  a);\n  }";
  expect(extract(`<div> 解释   代码 </div><pre><code>${code}</code></pre><p>后续 <code>a  +  b</code> 解释</p>`).text)
    .toBe(`解释 代码\n${code}\n后续 a  +  b 解释`);
  expect(extract(`<pre>${code}</pre>`).text).toBe(code);
});

test("privacy exclusions and normalized text limits remain in effect", () => {
  const result = extract(`<p> 可见    内容 </p><input value="private"><textarea>secret</textarea><p hidden>hidden</p><pre>${"x".repeat(9000)}</pre>`);
  expect(result.truncated).toBe(true);
  expect(result.text.length).toBe(8000);
  expect(result.text).toStartWith("可见 内容\n");
  expect(result.text).not.toContain("private");
  expect(result.text).not.toContain("secret");
  expect(result.text).not.toContain("hidden");
});
