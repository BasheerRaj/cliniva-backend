/**
 * Simple in-memory cache for query results
 *
 * This utility provides basic caching functionality for working hours queries
 * to reduce database load for frequently accessed data.
 *
 * Features:
 * - TTL-based expiration
 * - Automatic cleanup of expired entries
 * - Type-safe cache keys
 *
 * Note: This is a simple in-memory cache. For production with multiple
 * instances, consider using Redis or similar distributed cache.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class QueryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private defaultTTL: number = 5 * 60 * 1000) {
    // Default TTL: 5 minutes
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Get cached value by key
   * @param key - Cache key
   * @returns Cached value or undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data as T;
  }

  /**
   * Set cache value with optional TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in milliseconds (optional, uses default if not provided)
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data: value, expiresAt });
  }

  /**
   * Delete cached value by key
   * @param key - Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Invalidate cache entries matching a pattern
   * @param pattern - Pattern to match (supports wildcards with *)
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
    );

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Remove expired entries from cache
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Destroy cache and cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

/**
 * Generate cache key for working hours queries
 */
export class WorkingHoursCacheKeys {
  static parentHours(entityType: string, entityId: string): string {
    return `working-hours:parent:${entityType}:${entityId}`;
  }

  static entityDetails(entityType: string, entityId: string): string {
    return `entity:details:${entityType}:${entityId}`;
  }

  static suggestions(role: string, entityId: string): string {
    return `working-hours:suggestions:${role}:${entityId}`;
  }

  static conflicts(userId: string): string {
    return `working-hours:conflicts:${userId}`;
  }

  static invalidateEntity(entityType: string, entityId: string): string {
    return `*:${entityType}:${entityId}*`;
  }
}

// Singleton instance
export const queryCache = new QueryCache();
