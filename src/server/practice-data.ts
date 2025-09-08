/**
 * 练功数据处理模块
 * 专门处理用户练功时间数据的存储、检索和缓存
 */

// 练功记录接口
export interface PracticeRecord {
  date: string;
  hours: number;
  minutes: number;
  totalMinutes: number;
  timestamp: string;
}

// 聚合数据结构接口
export interface AggregatedPracticeData {
  userId: string;
  records: Record<string, {
    hours: number;
    minutes: number;
    totalMinutes: number;
    timestamp: string;
  }>;
  summary: {
    totalRecords: number;
    totalMinutes: number;
    lastUpdated: string;
    migratedAt?: string;
  };
}

/**
 * 练功数据内存缓存类
 * 使用聚合数据结构，提高性能
 */
export class PracticeDataCache {
  private cache = new Map<string, Map<string, any>>(); // userId -> Map<date, record>

  // 获取用户缓存的键
  private getUserCacheKey(userId: string): string {
    return `user_${userId}`;
  }

  // 检查缓存是否存在
  private isCacheExists(userId: string): boolean {
    const cacheKey = this.getUserCacheKey(userId);
    return this.cache.has(cacheKey);
  }

  // 获取用户的练功数据（从缓存或聚合数据）
  async getUserPracticeData(userId: string, kv: any): Promise<PracticeRecord[]> {
    const cacheKey = this.getUserCacheKey(userId);
    
    // 检查内存缓存是否存在
    if (this.isCacheExists(userId)) {
      console.log(`📦 从内存缓存获取用户 ${userId} 的练功数据 (缓存命中)`);
      const userCache = this.cache.get(cacheKey)!;
      const records = Array.from(userCache.entries()).map(([date, record]) => ({
        date,
        ...record
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      console.log(`✅ 缓存命中返回 ${records.length} 条记录`);
      return records;
    }

    // 内存缓存不存在，从kv加载
    console.log(`💾 内存缓存未命中，从聚合数据加载...`);
    return await this.loadFromKV(userId, kv);
  }

  // 获取用户的聚合练功数据（直接返回聚合格式）
  async getUserAggregatedData(userId: string, kv: any): Promise<AggregatedPracticeData | null> {
    const cacheKey = this.getUserCacheKey(userId);
    
    // 检查内存缓存是否存在
    if (this.isCacheExists(userId)) {
      console.log(`📦 从内存缓存获取用户 ${userId} 的聚合数据 (缓存命中)`);
      const userCache = this.cache.get(cacheKey)!;
      
      // 从缓存重建聚合数据结构
      const records: Record<string, any> = {};
      let totalMinutes = 0;
      
      for (const [date, record] of userCache.entries()) {
        records[date] = record;
        totalMinutes += record.totalMinutes;
      }
      
      const aggregatedData: AggregatedPracticeData = {
        userId: userId,
        records: records,
        summary: {
          totalRecords: userCache.size,
          totalMinutes: totalMinutes,
          lastUpdated: new Date().toISOString()
        }
      };
      
      console.log(`✅ 缓存命中返回聚合数据，包含 ${userCache.size} 条记录`);
      return aggregatedData;
    }

    // 内存缓存不存在，从kv直接加载聚合数据
    console.log(`💾 内存缓存未命中，从KV加载聚合数据...`);
    try {
      const aggregatedKey = `user_${userId}_aggregated`;
      const aggregatedData = await kv.get(aggregatedKey, { type: 'json' }) as AggregatedPracticeData;
      
      if (!aggregatedData) {
        console.log(`📊 未找到聚合数据`);
        return null;
      }

      // 创建内存缓存（这是唯一能创建缓存的地方）
      const userCache = new Map<string, any>();
      for (const [date, record] of Object.entries(aggregatedData.records)) {
        userCache.set(date, record);
      }
      this.cache.set(cacheKey, userCache);
      
      console.log(`✅ 聚合数据加载完成，包含 ${Object.keys(aggregatedData.records).length} 条记录`);
      return aggregatedData;
    } catch (error) {
      console.error('从KV加载聚合数据失败:', error);
      return null;
    }
  }

  // 从kv加载
  private async loadFromKV(userId: string, kv: any): Promise<PracticeRecord[]> {
    try {
      const aggregatedKey = `user_${userId}_aggregated`;
      console.log(`🔍 从聚合数据加载用户 ${userId} 的练功数据...`);
      
      const startTime = performance.now();
      const aggregatedData = await kv.get(aggregatedKey, { type: 'json' }) as AggregatedPracticeData;
      
      if (!aggregatedData || !aggregatedData.records) {
        console.log(`📊 未找到聚合数据，返回空数组`);
        return [];
      }

      console.log(`✅ 找到聚合数据，包含 ${Object.keys(aggregatedData.records).length} 条记录`);
      
      // 直接设置聚合数据为缓存（这是唯一能创建缓存的地方）
      const cacheKey = this.getUserCacheKey(userId);
      const userCache = new Map<string, any>();
      for (const [date, record] of Object.entries(aggregatedData.records)) {
        userCache.set(date, record);
      }
      this.cache.set(cacheKey, userCache);
      
      // 转换为标准格式返回给客户端
      const records = Object.entries(aggregatedData.records).map(([date, record]) => ({
        date,
        ...record
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const loadTime = performance.now() - startTime;
      console.log(`✅ 数据加载完成 - 用户: ${userId}, 记录数: ${records.length}, 耗时: ${loadTime.toFixed(2)}ms`);
      
      return records;
    } catch (error) {
      console.error('从聚合数据加载失败:', error);
      return [];
    }
  }

  // 添加或更新练功记录
  async updatePracticeRecord(userId: string, date: string, record: Omit<PracticeRecord, 'date'>, kv: any): Promise<void> {
    const cacheKey = this.getUserCacheKey(userId);
    
    // 只有当缓存已存在时才更新内存缓存（不创建新缓存）
    if (this.cache.has(cacheKey)) {
      const userCache = this.cache.get(cacheKey)!;
      userCache.set(date, {
        hours: record.hours,
        minutes: record.minutes,
        totalMinutes: record.totalMinutes,
        timestamp: record.timestamp
      });
      console.log(`🔄 已更新用户 ${userId} 在 ${date} 的练功记录缓存`);
    } else {
      console.log(`📦 用户 ${userId} 的缓存不存在，跳过缓存更新`);
    }
    
    // 同时更新聚合数据
    await this.updateAggregatedData(userId, date, record, kv);
  }

  // 更新聚合数据中的单条记录
  private async updateAggregatedData(userId: string, date: string, record: Omit<PracticeRecord, 'date'>, kv: any): Promise<void> {
    try {
      const aggregatedKey = `user_${userId}_aggregated`;
      let aggregatedData = await kv.get(aggregatedKey, { type: 'json' }) as AggregatedPracticeData;
      
      // 如果聚合数据不存在，创建新的
      if (!aggregatedData) {
        aggregatedData = {
          userId: userId,
          records: {},
          summary: {
            totalRecords: 0,
            totalMinutes: 0,
            lastUpdated: new Date().toISOString()
          }
        };
      }
      
      // 更新记录
      aggregatedData.records[date] = {
        hours: record.hours,
        minutes: record.minutes,
        totalMinutes: record.totalMinutes,
        timestamp: record.timestamp
      };
      
      // 更新摘要信息
      const allRecords = Object.values(aggregatedData.records);
      aggregatedData.summary = {
        ...aggregatedData.summary,
        totalRecords: allRecords.length,
        totalMinutes: allRecords.reduce((sum, r) => sum + r.totalMinutes, 0),
        lastUpdated: new Date().toISOString()
      };
      
      // 保存更新后的聚合数据
      await kv.put(aggregatedKey, JSON.stringify(aggregatedData));
      console.log(`✅ 已更新聚合数据 - 用户: ${userId}, 日期: ${date}`);
    } catch (error) {
      console.error(`❌ 更新聚合数据失败 - 用户: ${userId}, 日期: ${date}`, error);
      throw error;
    }
  }

  // 删除练功记录
  async deletePracticeRecord(userId: string, date: string, kv: any): Promise<void> {
    const cacheKey = this.getUserCacheKey(userId);
    
    // 从内存缓存删除
    if (this.cache.has(cacheKey)) {
      const userCache = this.cache.get(cacheKey)!;
      userCache.delete(date);
      console.log(`🗑️ 已删除用户 ${userId} 在 ${date} 的练功记录缓存`);
    }
    
    // 从聚合数据删除
    await this.deleteFromAggregatedData(userId, date, kv);
  }

  // 从聚合数据中删除记录
  private async deleteFromAggregatedData(userId: string, date: string, kv: any): Promise<void> {
    try {
      const aggregatedKey = `user_${userId}_aggregated`;
      const aggregatedData = await kv.get(aggregatedKey, { type: 'json' }) as AggregatedPracticeData;
      
      if (!aggregatedData || !aggregatedData.records) {
        console.log(`📊 聚合数据不存在，无需删除 - 用户: ${userId}, 日期: ${date}`);
        return;
      }
      
      // 删除记录
      delete aggregatedData.records[date];
      
      // 更新摘要信息
      const allRecords = Object.values(aggregatedData.records);
      aggregatedData.summary = {
        ...aggregatedData.summary,
        totalRecords: allRecords.length,
        totalMinutes: allRecords.reduce((sum, r) => sum + r.totalMinutes, 0),
        lastUpdated: new Date().toISOString()
      };
      
      // 保存更新后的聚合数据
      await kv.put(aggregatedKey, JSON.stringify(aggregatedData));
      console.log(`✅ 已从聚合数据删除记录 - 用户: ${userId}, 日期: ${date}`);
    } catch (error) {
      console.error(`❌ 从聚合数据删除记录失败 - 用户: ${userId}, 日期: ${date}`, error);
      throw error;
    }
  }

  // 清除用户缓存
  clearUserCache(userId: string): void {
    const cacheKey = this.getUserCacheKey(userId);
    this.cache.delete(cacheKey);
    console.log(`🧹 已清除用户 ${userId} 的练功数据缓存`);
  }

  // 获取缓存统计信息
  getCacheStats(): { totalUsers: number; totalRecords: number } {
    let totalRecords = 0;
    for (const userCache of this.cache.values()) {
      totalRecords += userCache.size;
    }
    
    return {
      totalUsers: this.cache.size,
      totalRecords: totalRecords
    };
  }
}

// 创建全局缓存实例
export const practiceDataCache = new PracticeDataCache();

/**
 * 练功时间KV处理函数
 * 处理所有与练功数据相关的API请求
 */
export async function handlePracticeTimeKv(
  request: Request, 
  kv: any, 
  segments: string[], 
  env: any,
  user: any // 已验证的用户对象
): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  // GET /api/kv/practice-time -> 获取用户的所有练功记录
  if (segments.length === 0 && method === 'GET') {
    const requestStart = performance.now();
    const workerInstanceId = Math.random().toString(36).substring(2, 8);
    console.log(`🚀 开始处理练功数据请求 - 用户: ${user.id}, Worker实例: ${workerInstanceId}`);
    
    try {
      // 使用缓存系统获取聚合数据
      const aggregatedData = await practiceDataCache.getUserAggregatedData(user.id, kv);
      
      const requestTime = performance.now() - requestStart;
      
      if (!aggregatedData) {
        console.log(`✅ 练功数据请求完成 - 用户: ${user.id}, 无数据, 耗时: ${requestTime.toFixed(2)}ms`);
        // 返回空的聚合数据结构
        const emptyData: AggregatedPracticeData = {
          userId: user.id,
          records: {},
          summary: {
            totalRecords: 0,
            totalMinutes: 0,
            lastUpdated: new Date().toISOString()
          }
        };
        const response = json(emptyData);
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        return response;
      }
      
      console.log(`✅ 练功数据请求完成 - 用户: ${user.id}, 记录数: ${aggregatedData.summary.totalRecords}, 耗时: ${requestTime.toFixed(2)}ms`);
      
      // 返回聚合数据结构，不设置客户端缓存（确保数据实时性）
      const response = json(aggregatedData);
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      
      return response;
    } catch (error) {
      const requestTime = performance.now() - requestStart;
      console.error(`❌ 获取练功数据失败 - 用户: ${user.id}, 耗时: ${requestTime.toFixed(2)}ms`, error);
      return json({ error: '获取数据失败' }, 500);
    }
  }

  // POST /api/kv/practice-time -> 添加新的练功记录
  if (segments.length === 0 && method === 'POST') {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    if (!body.date || body.hours === undefined || body.minutes === undefined) {
      return json({ error: 'Missing required fields: date, hours, minutes' }, 400);
    }

    // 验证数据格式
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(body.date)) {
      return json({ error: 'Invalid date format, expected YYYY-MM-DD' }, 400);
    }

    const hours = parseInt(body.hours);
    const minutes = parseInt(body.minutes);
    
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || minutes < 0 || minutes >= 60) {
      return json({ error: 'Invalid time values' }, 400);
    }

    // 创建记录对象
    const record = {
      hours,
      minutes,
      totalMinutes: hours * 60 + minutes,
      timestamp: new Date().toISOString()
    };
    
    try {
      // 直接更新聚合数据和缓存（不再使用单条记录存储）
      await practiceDataCache.updatePracticeRecord(user.id, body.date, record, kv);
      
      return json({ ok: true, record: { date: body.date, ...record } });
    } catch (error) {
      console.error('保存练功记录失败:', error);
      return json({ error: '保存失败' }, 500);
    }
  }

  // DELETE /api/kv/practice-time/:date -> 删除指定日期的记录
  if (segments.length === 1 && method === 'DELETE') {
    const date = decodeURIComponent(segments[0]);
    
    try {
      // 直接从聚合数据和缓存删除
      await practiceDataCache.deletePracticeRecord(user.id, date, kv);
      
      return json({ ok: true });
    } catch (error) {
      console.error('删除练功记录失败:', error);
      return json({ error: '删除失败' }, 500);
    }
  }

  return json({ error: 'Method not allowed or invalid path' }, 405);
}

// 工具函数
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      'content-type': 'application/json; charset=utf-8',
    },
  });
}
