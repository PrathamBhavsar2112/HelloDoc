const NodeCache = require('node-cache');

// Initialize caches with optimized settings
const shortCache = new NodeCache({ 
  stdTTL: 300,      // 5 minutes
  checkperiod: 60,  // Check for expired keys every 60 seconds
  useClones: false  // Better performance, avoid deep cloning
}); 

const mediumCache = new NodeCache({ 
  stdTTL: 900,      // 15 minutes
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false
}); 

const longCache = new NodeCache({ 
  stdTTL: 3600,     // 1 hour
  checkperiod: 300, // Check for expired keys every 5 minutes
  useClones: false
}); 

class CacheService {
  // Short-term cache methods (5 minutes)
  setShort(key, data, ttl = null) {
    try {
      const success = shortCache.set(key, data, ttl);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Short cache SET: ${key} [Success: ${success}]`);
      }
      return success;
    } catch (error) {
      console.error('Short cache SET error:', error);
      return false;
    }
  }

  getShort(key) {
    try {
      const data = shortCache.get(key);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Short cache ${data ? 'HIT' : 'MISS'}: ${key}`);
      }
      return data;
    } catch (error) {
      console.error('Short cache GET error:', error);
      return undefined;
    }
  }

  // Medium-term cache methods (15 minutes)
  setMedium(key, data, ttl = null) {
    try {
      const success = mediumCache.set(key, data, ttl);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Medium cache SET: ${key} [Success: ${success}]`);
      }
      return success;
    } catch (error) {
      console.error('Medium cache SET error:', error);
      return false;
    }
  }

  getMedium(key) {
    try {
      const data = mediumCache.get(key);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Medium cache ${data ? 'HIT' : 'MISS'}: ${key}`);
      }
      return data;
    } catch (error) {
      console.error('Medium cache GET error:', error);
      return undefined;
    }
  }

  // Long-term cache methods (1 hour)
  setLong(key, data, ttl = null) {
    try {
      const success = longCache.set(key, data, ttl);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Long cache SET: ${key} [Success: ${success}]`);
      }
      return success;
    } catch (error) {
      console.error('Long cache SET error:', error);
      return false;
    }
  }

  getLong(key) {
    try {
      const data = longCache.get(key);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Long cache ${data ? 'HIT' : 'MISS'}: ${key}`);
      }
      return data;
    } catch (error) {
      console.error('Long cache GET error:', error);
      return undefined;
    }
  }

  // Delete from all caches
  delete(key) {
    try {
      let deleted = false;
      deleted = shortCache.del(key) > 0 || deleted;
      deleted = mediumCache.del(key) > 0 || deleted;
      deleted = longCache.del(key) > 0 || deleted;
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Cache DELETE: ${key} [Deleted: ${deleted}]`);
      }
      return deleted;
    } catch (error) {
      console.error('Cache DELETE error:', error);
      return false;
    }
  }

  // Clear cache entries matching a pattern
  clearPattern(pattern) {
    try {
      let totalDeleted = 0;
      const allCaches = [
        { cache: shortCache, name: 'short' },
        { cache: mediumCache, name: 'medium' },
        { cache: longCache, name: 'long' }
      ];

      allCaches.forEach(({ cache, name }) => {
        const keys = cache.keys();
        const matchingKeys = keys.filter(key => {
          // Support both string includes and regex patterns
          if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return regex.test(key);
          }
          return key.includes(pattern);
        });

        matchingKeys.forEach(key => {
          if (cache.del(key) > 0) {
            totalDeleted++;
          }
        });
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log(`Cache CLEAR pattern: ${pattern} [Deleted: ${totalDeleted} keys]`);
      }
      return totalDeleted;
    } catch (error) {
      console.error('Cache CLEAR pattern error:', error);
      return 0;
    }
  }

  // Get comprehensive cache statistics
  getStats() {
    try {
      return {
        short: {
          ...shortCache.getStats(),
          keys: shortCache.keys().length
        },
        medium: {
          ...mediumCache.getStats(),
          keys: mediumCache.keys().length
        },
        long: {
          ...longCache.getStats(),
          keys: longCache.keys().length
        },
        total: {
          keys: shortCache.keys().length + mediumCache.keys().length + longCache.keys().length
        }
      };
    } catch (error) {
      console.error('Cache STATS error:', error);
      return null;
    }
  }

  // Check if key exists in any cache
  has(key) {
    try {
      return shortCache.has(key) || mediumCache.has(key) || longCache.has(key);
    } catch (error) {
      console.error('Cache HAS error:', error);
      return false;
    }
  }

  // Flush all caches
  flushAll() {
    try {
      shortCache.flushAll();
      mediumCache.flushAll();
      longCache.flushAll();
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('All caches flushed');
      }
      return true;
    } catch (error) {
      console.error('Cache FLUSH ALL error:', error);
      return false;
    }
  }

  // Get cache hit rate
  getHitRate() {
    try {
      const stats = this.getStats();
      const calculateRate = (hits, misses) => {
        const total = hits + misses;
        return total > 0 ? (hits / total * 100).toFixed(2) : 0;
      };

      return {
        short: calculateRate(stats.short.hits, stats.short.misses),
        medium: calculateRate(stats.medium.hits, stats.medium.misses),
        long: calculateRate(stats.long.hits, stats.long.misses),
        overall: calculateRate(
          stats.short.hits + stats.medium.hits + stats.long.hits,
          stats.short.misses + stats.medium.misses + stats.long.misses
        )
      };
    } catch (error) {
      console.error('Cache HIT RATE error:', error);
      return null;
    }
  }

  // Batch operations for better performance
  setMultiple(entries, cacheTier = 'medium') {
    try {
      const cache = this.getCacheInstance(cacheTier);
      let successCount = 0;
      
      entries.forEach(({ key, data, ttl }) => {
        if (cache.set(key, data, ttl)) {
          successCount++;
        }
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log(`Batch SET [${cacheTier}]: ${successCount}/${entries.length} successful`);
      }
      return successCount;
    } catch (error) {
      console.error('Cache SET MULTIPLE error:', error);
      return 0;
    }
  }

  getMultiple(keys, cacheTier = 'medium') {
    try {
      const cache = this.getCacheInstance(cacheTier);
      return cache.mget(keys);
    } catch (error) {
      console.error('Cache GET MULTIPLE error:', error);
      return {};
    }
  }

  // Helper method to get cache instance
  getCacheInstance(tier) {
    switch (tier) {
      case 'short':
        return shortCache;
      case 'medium':
        return mediumCache;
      case 'long':
        return longCache;
      default:
        return mediumCache;
    }
  }

  // Get all keys from all caches
  getAllKeys() {
    try {
      return {
        short: shortCache.keys(),
        medium: mediumCache.keys(),
        long: longCache.keys()
      };
    } catch (error) {
      console.error('Cache GET ALL KEYS error:', error);
      return { short: [], medium: [], long: [] };
    }
  }

  // Get memory usage information
  getMemoryInfo() {
    try {
      const stats = this.getStats();
      const hitRates = this.getHitRate();
      
      return {
        totalKeys: stats.total.keys,
        cacheDistribution: {
          short: stats.short.keys,
          medium: stats.medium.keys,
          long: stats.long.keys
        },
        hitRates,
        performance: {
          totalHits: stats.short.hits + stats.medium.hits + stats.long.hits,
          totalMisses: stats.short.misses + stats.medium.misses + stats.long.misses
        }
      };
    } catch (error) {
      console.error('Cache MEMORY INFO error:', error);
      return null;
    }
  }
}

// Export singleton instance
module.exports = new CacheService();