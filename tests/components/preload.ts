import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { plugin } from "bun";

GlobalRegistrator.register({
  url: "chrome-extension://human-language-translator/sidepanel.html",
});

process.env.RTL_SKIP_AUTO_CLEANUP = "true";

plugin({
  name: "ignore-component-styles",
  setup(build) {
    build.onLoad({ filter: /\.(css|less)$/ }, () => ({
      contents: "export default {};",
      loader: "js",
    }));
  },
});

Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  configurable: true,
  value() {},
});

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: () => ({
    matches: false,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => true,
  }),
});

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, "ResizeObserver", {
  configurable: true,
  writable: true,
  value: TestResizeObserver,
});
