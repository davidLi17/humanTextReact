/**
 * 创建符合 browser.storage 基本行为的内存存储。
 */
export function createMemoryStorageArea(store = {}, overrides = {}) {
  return {
    async get(keys) {
      let result;
      if (keys == null) {
        result = store;
      } else if (typeof keys === "string") {
        result = keys in store ? { [keys]: store[keys] } : {};
      } else if (Array.isArray(keys)) {
        result = Object.fromEntries(
          keys.filter((key) => key in store).map((key) => [key, store[key]])
        );
      } else if (typeof keys === "object") {
        result = Object.fromEntries(
          Object.entries(keys).map(([key, fallback]) => [
            key,
            key in store ? store[key] : fallback,
          ])
        );
      } else {
        result = {};
      }

      return structuredClone(result);
    },
    async set(items) {
      Object.assign(store, structuredClone(items));
    },
    async remove(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        delete store[key];
      }
    },
    async clear() {
      for (const key of Object.keys(store)) delete store[key];
    },
    ...overrides,
  };
}

/**
 * 创建 local、sync、session 三个彼此隔离的 browser.storage 区域。
 */
export function createMemoryBrowserStorage(initial = {}) {
  const stores = {
    local: structuredClone(initial.local || {}),
    sync: structuredClone(initial.sync || {}),
    session: structuredClone(initial.session || {}),
  };

  return {
    stores,
    browser: {
      storage: {
        local: createMemoryStorageArea(stores.local),
        sync: createMemoryStorageArea(stores.sync),
        session: createMemoryStorageArea(stores.session),
      },
    },
  };
}

/**
 * 保存全局属性的完整描述符，便于测试后精确恢复原环境。
 */
export function preserveGlobals(...names) {
  const descriptors = new Map(
    names.map((name) => [
      name,
      Object.getOwnPropertyDescriptor(globalThis, name),
    ])
  );

  return () => {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
      } else {
        delete globalThis[name];
      }
    }
  };
}

/**
 * 兼容 navigator 等只读全局属性的测试替换。
 */
export function setTestGlobal(name, value) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });
}
