// server/services/CacheService.js - Redis caching service
const Redis = require('ioredis');
const crypto = require('crypto');

class CacheService {
  constructor() {
    // Initialize Redis client with fallback to in-memory cache if Redis not available
    this.redis = null;
    this.memoryCache = new Map();
    this.cacheMode = 'memory'; // Default to memory
    
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection with fallback
   */
  async initializeRedis() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn('⚠️ Redis connection failed, falling back to memory cache');
            this.cacheMode = 'memory';
            return null; // Stop retrying
          }
          return Math.min(times * 100, 2000);
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true
      });

      // Test connection
      await this.redis.connect();
      await this.redis.ping();
      
      this.cacheMode = 'redis';
      console.log('✅ Redis cache connected successfully');

      // Handle Redis errors gracefully
      this.redis.on('error', (error) => {
        console.error('Redis error:', error.message);
        if (this.cacheMode === 'redis') {
          console.warn('Switching to memory cache due to Redis error');
          this.cacheMode = 'memory';
        }
      });

    } catch (error) {
      console.warn('⚠️ Redis not available, using in-memory cache:', error.message);
      this.cacheMode = 'memory';
      this.redis = null;
    }
  }

  /**
   * Generate cache key from document buffer
   */
  generateKey(buffer) {
    if (Buffer.isBuffer(buffer)) {
      return `doc:${crypto.createHash('md5').update(buffer).digest('hex')}`;
    }
    return `doc:${crypto.createHash('md5').update(String(buffer)).digest('hex')}`;
  }

  /**
   * Get cached data
   */
  async get(key) {
    try {
      if (this.cacheMode === 'redis' && this.redis) {
        const cached = await this.redis.get(key);
        if (cached) {
          console.log(`📦 Cache hit (Redis): ${key}`);
          return JSON.parse(cached);
        }
      } else {
        // Use memory cache
        const cached = this.memoryCache.get(key);
        if (cached && cached.expires > Date.now()) {
          console.log(`📦 Cache hit (Memory): ${key}`);
          return cached.data;
        } else if (cached) {
          // Expired, remove from memory
          this.memoryCache.delete(key);
        }
      }
      
      console.log(`💨 Cache miss: ${key}`);
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  async set(key, value, ttl = 3600) {
    try {
      const serialized = JSON.stringify(value);
      
      if (this.cacheMode === 'redis' && this.redis) {
        await this.redis.setex(key, ttl, serialized);
        console.log(`💾 Cached (Redis): ${key} for ${ttl}s`);
      } else {
        // Use memory cache with expiration
        this.memoryCache.set(key, {
          data: value,
          expires: Date.now() + (ttl * 1000)
        });
        
        // Limit memory cache size
        if (this.memoryCache.size > 100) {
          // Remove oldest entries
          const firstKey = this.memoryCache.keys().next().value;
          this.memoryCache.delete(firstKey);
        }
        
        console.log(`💾 Cached (Memory): ${key} for ${ttl}s`);
      }
      
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete cached data
   */
  async delete(key) {
    try {
      if (this.cacheMode === 'redis' && this.redis) {
        await this.redis.del(key);
      } else {
        this.memoryCache.delete(key);
      }
      console.log(`🗑️ Cache deleted: ${key}`);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    try {
      if (this.cacheMode === 'redis' && this.redis) {
        const keys = await this.redis.keys('doc:*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        this.memoryCache.clear();
      }
      console.log('🗑️ Cache cleared');
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      if (this.cacheMode === 'redis' && this.redis) {
        const info = await this.redis.info('memory');
        const keys = await this.redis.keys('doc:*');
        return {
          mode: 'redis',
          entries: keys.length,
          memoryUsed: info.match(/used_memory_human:(.+)/)?.[1] || 'unknown'
        };
      } else {
        let totalSize = 0;
        let validEntries = 0;
        const now = Date.now();
        
        for (const [key, value] of this.memoryCache.entries()) {
          if (value.expires > now) {
            validEntries++;
            totalSize += JSON.stringify(value.data).length;
          }
        }
        
        return {
          mode: 'memory',
          entries: validEntries,
          totalEntries: this.memoryCache.size,
          estimatedSize: `${(totalSize / 1024).toFixed(2)} KB`
        };
      }
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        mode: this.cacheMode,
        error: error.message
      };
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable() {
    if (this.cacheMode === 'redis') {
      return this.redis && this.redis.status === 'ready';
    }
    return true; // Memory cache is always available
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
      console.log('Redis connection closed');
    }
  }
}

// Export singleton instance
module.exports = new CacheService();