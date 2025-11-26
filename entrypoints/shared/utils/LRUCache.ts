/**
 * LRU (Least Recently Used) 缓存实现
 *
 * 面试亮点：手写 LRU 缓存，使用 Map 保证 O(1) 时间复杂度
 *
 * 核心原理：
 * - Map 保持插入顺序，最近访问的项移到末尾
 * - 超过容量时删除最老的项（Map 的第一个元素）
 *
 * 时间复杂度：
 * - get: O(1)
 * - set: O(1)
 * - delete: O(1)
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private readonly maxSize: number;

  // 统计信息（可选，用于分析缓存效率）
  private _hits: number = 0;
  private _misses: number = 0;

  constructor(maxSize: number = 100) {
    if (maxSize <= 0) {
      throw new Error("LRUCache maxSize must be positive");
    }
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * 获取缓存值
   * 如果存在，将其移到最近使用位置
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      this._misses++;
      return undefined;
    }

    this._hits++;

    // 移到最近使用位置：先删除再添加
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  /**
   * 设置缓存值
   * 如果已存在则更新并移到最近位置
   * 如果超出容量则删除最老的项
   */
  set(key: K, value: V): this {
    // 如果已存在，先删除（为了更新位置）
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 删除最老的项（Map 的第一个元素）
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, value);
    return this;
  }

  /**
   * 检查是否存在
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * 删除缓存项
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this._hits = 0;
    this._misses = 0;
  }

  /**
   * 获取当前缓存大小
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 获取缓存命中率
   */
  get hitRate(): number {
    const total = this._hits + this._misses;
    return total === 0 ? 0 : this._hits / total;
  }

  /**
   * 获取统计信息
   */
  get stats(): { hits: number; misses: number; hitRate: number; size: number } {
    return {
      hits: this._hits,
      misses: this._misses,
      hitRate: this.hitRate,
      size: this.size,
    };
  }

  /**
   * 获取所有键（从最老到最新）
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  /**
   * 获取所有值（从最老到最新）
   */
  values(): IterableIterator<V> {
    return this.cache.values();
  }

  /**
   * 获取所有键值对（从最老到最新）
   */
  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }

  /**
   * 遍历缓存
   */
  forEach(callback: (value: V, key: K, map: Map<K, V>) => void): void {
    this.cache.forEach(callback);
  }
}

/**
 * 创建带 TTL (Time To Live) 的 LRU 缓存
 *
 * 扩展功能：缓存项会在指定时间后自动过期
 */
export class LRUCacheWithTTL<K, V> {
  private cache: Map<K, { value: V; expireAt: number }>;
  private readonly maxSize: number;
  private readonly defaultTTL: number;

  constructor(maxSize: number = 100, defaultTTL: number = 5 * 60 * 1000) {
    if (maxSize <= 0) {
      throw new Error("LRUCacheWithTTL maxSize must be positive");
    }
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL; // 默认 5 分钟
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // 检查是否过期
    if (Date.now() > entry.expireAt) {
      this.cache.delete(key);
      return undefined;
    }

    // 移到最近使用位置
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: K, value: V, ttl?: number): this {
    const expireAt = Date.now() + (ttl ?? this.defaultTTL);

    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, { value, expireAt });
    return this;
  }

  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expireAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  /**
   * 清理过期项
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expireAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

export default LRUCache;
