import { expect, test } from "bun:test";
import { elementImageBudget, imageBytes, MAX_ELEMENT_IMAGE_BYTES, MAX_ELEMENT_TOTAL_BYTES } from "../../entrypoints/shared/elementImages";
const data = (size: number) => `data:image/png;base64,${btoa("x".repeat(size))}`;
test("decoded byte count accounts for padding and ignores data URL prefix", () => {
  for (const size of [0,1,2,3,4,512*1024+1]) expect(imageBytes(data(size))).toBe(size);
});
test("5 MiB each, six images and exactly 30 MiB are allowed despite base64 expansion", () => {
  const image = data(MAX_ELEMENT_IMAGE_BYTES);
  const images = Array.from({length:6},(_,i)=>({image,number:i+1}));
  const result = elementImageBudget(images);
  expect(result.error).toBeUndefined(); expect(result.total).toBe(MAX_ELEMENT_TOTAL_BYTES);
  expect(image.length).toBeGreaterThan(MAX_ELEMENT_IMAGE_BYTES);
  expect(elementImageBudget([...images, {image:data(1),number:7}]).error).toContain("最多6张");
});
test("one byte over the individual limit names the mark and actual byte count", () => {
  const result = elementImageBudget([{image:data(1),number:1},{image:data(MAX_ELEMENT_IMAGE_BYTES+1),number:9}]);
  expect(result.error).toContain("#9"); expect(result.error).toContain("5242881 字节");
});
test("the batch total contains only the current selection, not prior sent snapshots", () => {
  const snapshots = [{image:data(500),number:1,sent:true},{image:data(100),number:2,sent:false}];
  expect(elementImageBudget(snapshots.filter(s=>!s.sent)).total).toBe(100);
});
