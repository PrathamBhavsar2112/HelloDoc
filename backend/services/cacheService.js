const NodeCache = require('node-cache');
const shortCache = new NodeCache({ stdTTL: 300 }); 
const mediumCache = new NodeCache({ stdTTL: 900 }); 
const longCache = new NodeCache({ stdTTL: 3600 }); 

class CacheService {
  setShort(key, data) {
    try {
      shortCache.set(key, data);
      console.log(`Short cache SET: ${key}`);
    } catch (error) {
      console.error('Short cache SET error:', error);
    }
  }

  getShort(key) {
    try {
      const data = shortCache.get(key);
      if (data) {
        console.log(`Short cache HIT: ${key}`);
      } else {
        console.log(`Short cache MISS: ${key}`);
      }
      return data || null;
    } catch (error) {
      console.error('Short cache GET error:', error);
      return null;
    }
  }

  setMedium(key, data) {
    try {
      mediumCache.set(key, data);
      console.log(`Medium cache SET: ${key}`);
    } catch (error) {
      console.error('Medium cache SET error:', error);
    }
  }

  getMedium(key) {
    try {
      const data = mediumCache.get(key);
      if (data) {
        console.log(`Medium cache HIT: ${key}`);
      } else {
        console.log(`Medium cache MISS: ${key}`);
      }
      return data || null;
    } catch (error) {
      console.error('Medium cache GET error:', error);
      return null;
    }
  }

  setLong(key, data) {
    try {
      longCache.set(key, data);
      console.log(`Long cache SET: ${key}`);
    } catch (error) {
      console.error('Long cache SET error:', error);
    }
  }

  getLong(key) {
    try {
      const data = longCache.get(key);
      if (data) {
        console.log(`Long cache HIT: ${key}`);
      } else {
        console.log(`Long cache MISS: ${key}`);
      }
      return data || null;
    } catch (error) {
      console.error('Long cache GET error:', error);
      return null;
    }
  }

  delete(key) {
    try {
      shortCache.del(key);
      mediumCache.del(key);
      longCache.del(key);
      console.log(`Cache DELETE: ${key}`);
    } catch (error) {
      console.error('Cache DELETE error:', error);
    }
  }

  clearPattern(pattern) {
    try {
      const allCaches = [shortCache, mediumCache, longCache];
      allCaches.forEach(cache => {
        const keys = cache.keys();
        keys.forEach(key => {
          if (key.includes(pattern)) {
            cache.del(key);
          }
        });
      });
      console.log(`Cache CLEAR pattern: ${pattern}`);
    } catch (error) {
      console.error('Cache CLEAR pattern error:', error);
    }
  }
  getStats() {
    return {
      short: shortCache.getStats(),
      medium: mediumCache.getStats(),
      long: longCache.getStats()
    };
  }
}

module.exports = new CacheService();