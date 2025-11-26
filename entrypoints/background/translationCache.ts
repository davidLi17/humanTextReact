/**
 * 翻译缓存服务
 *
 * 使用 LRU 缓存存储翻译结果，避免重复 API 调用
 *
 * 特点：
 * - 基于文本内容 hash 作为缓存 key
 * - 支持 TTL 过期机制
 * - 缓存命中率统计
 */
import { LRUCacheWithTTL } from "../shared/utils/LRUCache";

/**
 * 缓存项结构
 */
export interface TranslationCacheItem {
  translatedText: string;
  reasoningContent?: string;
  hasReasoning: boolean;
  timestamp: number;
}

/**
 * 翻译缓存配置
 */
export interface TranslationCacheConfig {
  maxSize?: number; // 最大缓存条数，默认 200
  ttl?: number; // 缓存过期时间(ms)，默认 30 分钟
  enabled?: boolean; // 是否启用缓存，默认 true
}

const DEFAULT_CONFIG: Required<TranslationCacheConfig> = {
  maxSize: 200,
  ttl: 30 * 60 * 1000, // 30 分钟
  enabled: true,
};

/**
 * 翻译缓存服务类
 */
export class TranslationCacheService {
  private cache: LRUCacheWithTTL<string, TranslationCacheItem>;
  private config: Required<TranslationCacheConfig>;
  private _enabled: boolean;

  // 统计信息
  private _totalRequests: number = 0;
  private _cacheHits: number = 0;

  constructor(config?: TranslationCacheConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this._enabled = this.config.enabled;
    this.cache = new LRUCacheWithTTL<string, TranslationCacheItem>(
      this.config.maxSize,
      this.config.ttl
    );
  }

  /**
   * 生成缓存 key
   * 使用简单的字符串 hash，确保相同文本得到相同 key
   */
  private generateKey(text: string, model?: string): string {
    // 包含模型信息，因为不同模型输出可能不同
    const content = `${model || "default"}:${text.trim().toLowerCase()}`;
    return this.simpleHash(content);
  }

  /**
   * 简单字符串 hash 函数 (djb2 算法)
   * 面试亮点：手写 hash 函数
   */
  private simpleHash(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
  }

  /**
   * 获取缓存的翻译结果
   */
  get(text: string, model?: string): TranslationCacheItem | undefined {
    this._totalRequests++;

    if (!this._enabled) {
      return undefined;
    }

    const key = this.generateKey(text, model);
    const cached = this.cache.get(key);

    if (cached) {
      this._cacheHits++;
      console.log(`[TranslationCache] 缓存命中: ${key.slice(0, 8)}...`);
    }

    return cached;
  }

  /**
   * 存储翻译结果到缓存
   */
  set(
    text: string,
    result: Omit<TranslationCacheItem, "timestamp">,
    model?: string
  ): void {
    if (!this._enabled) {
      return;
    }

    const key = this.generateKey(text, model);
    this.cache.set(key, {
      ...result,
      timestamp: Date.now(),
    });

    console.log(`[TranslationCache] 缓存存储: ${key.slice(0, 8)}...`);
  }

  /**
   * 检查是否有缓存
   */
  has(text: string, model?: string): boolean {
    if (!this._enabled) {
      return false;
    }
    const key = this.generateKey(text, model);
    return this.cache.has(key);
  }

  /**
   * 清除特定文本的缓存
   */
  invalidate(text: string, model?: string): boolean {
    const key = this.generateKey(text, model);
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this._totalRequests = 0;
    this._cacheHits = 0;
    console.log("[TranslationCache] 缓存已清空");
  }

  /**
   * 启用/禁用缓存
   */
  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    console.log(`[TranslationCache] 缓存${enabled ? "已启用" : "已禁用"}`);
  }

  /**
   * 获取缓存是否启用
   */
  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * 获取缓存统计信息
   */
  get stats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    totalRequests: number;
    cacheHits: number;
    enabled: boolean;
  } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate:
        this._totalRequests > 0 ? this._cacheHits / this._totalRequests : 0,
      totalRequests: this._totalRequests,
      cacheHits: this._cacheHits,
      enabled: this._enabled,
    };
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    return this.cache.cleanup();
  }
}

// 单例实例
let instance: TranslationCacheService | null = null;

/**
 * 获取翻译缓存服务单例
 */
export function getTranslationCache(
  config?: TranslationCacheConfig
): TranslationCacheService {
  if (!instance) {
    instance = new TranslationCacheService(config);
  }
  return instance;
}

/**
 * 重置翻译缓存服务（主要用于测试）
 */
export function resetTranslationCache(): void {
  if (instance) {
    instance.clear();
    instance = null;
  }
}

export default TranslationCacheService;
