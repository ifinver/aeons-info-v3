/**
 * 练功日志处理模块
 * 专门处理用户练功日志的存储、检索和管理
 */

// 练功日志接口
export interface PracticeLog {
  id: string;
  date: string;
  content: string;
  timestamp: string;
  lastModified?: string;
}

// 用户练功日志集合接口
export interface UserPracticeLogs {
  userId: string;
  logs: Record<string, PracticeLog>;
  summary: {
    totalLogs: number;
    lastUpdated: string;
  };
}

/**
 * 练功日志缓存类
 * 管理用户练功日志的内存缓存
 */
export class PracticeLogsCache {
  private cache = new Map<string, Map<string, PracticeLog>>(); // userId -> Map<logId, log>

  // 获取用户缓存的键
  private getUserCacheKey(userId: string): string {
    return `user_logs_${userId}`;
  }

  // 检查缓存是否存在
  private isCacheExists(userId: string): boolean {
    const cacheKey = this.getUserCacheKey(userId);
    return this.cache.has(cacheKey);
  }

  // 获取用户的所有练功日志
  async getUserLogs(userId: string, kv: any): Promise<PracticeLog[]> {
    const cacheKey = this.getUserCacheKey(userId);
    
    // 检查内存缓存
    if (this.isCacheExists(userId)) {
      console.log(`📦 从内存缓存获取用户 ${userId} 的练功日志 (缓存命中)`);
      const userCache = this.cache.get(cacheKey)!;
      const logs = Array.from(userCache.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // 最新的在前
      
      console.log(`✅ 缓存命中返回 ${logs.length} 条日志`);
      return logs;
    }

    // 内存缓存不存在，从KV加载
    console.log(`💾 内存缓存未命中，从KV加载用户 ${userId} 的练功日志...`);
    return await this.loadFromKV(userId, kv);
  }

  // 从KV加载用户日志
  private async loadFromKV(userId: string, kv: any): Promise<PracticeLog[]> {
    try {
      const userLogsKey = `user_logs_${userId}`;
      console.log(`🔍 从KV加载用户 ${userId} 的练功日志...`);
      
      const startTime = performance.now();
      const userLogs = await kv.get(userLogsKey, { type: 'json' }) as UserPracticeLogs;
      
      if (!userLogs || !userLogs.logs) {
        console.log(`📊 未找到用户日志，返回空数组`);
        return [];
      }

      console.log(`✅ 找到用户日志，包含 ${Object.keys(userLogs.logs).length} 条记录`);
      
      // 设置缓存
      const cacheKey = this.getUserCacheKey(userId);
      const userCache = new Map<string, PracticeLog>();
      for (const [logId, log] of Object.entries(userLogs.logs)) {
        userCache.set(logId, log);
      }
      this.cache.set(cacheKey, userCache);
      
      // 转换为数组并按日期排序（最新的在前）
      const logs = Object.values(userLogs.logs)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const loadTime = performance.now() - startTime;
      console.log(`✅ 日志加载完成 - 用户: ${userId}, 记录数: ${logs.length}, 耗时: ${loadTime.toFixed(2)}ms`);
      
      return logs;
    } catch (error) {
      console.error('从KV加载日志失败:', error);
      return [];
    }
  }

  // 获取单条日志
  async getLog(userId: string, logId: string, kv: any): Promise<PracticeLog | null> {
    const cacheKey = this.getUserCacheKey(userId);
    
    // 检查内存缓存
    if (this.cache.has(cacheKey)) {
      const userCache = this.cache.get(cacheKey)!;
      const log = userCache.get(logId);
      if (log) {
        console.log(`📦 从缓存获取日志 ${logId}`);
        return log;
      }
    }

    // 缓存中没有，从KV加载
    try {
      const userLogsKey = `user_logs_${userId}`;
      const userLogs = await kv.get(userLogsKey, { type: 'json' }) as UserPracticeLogs;
      
      if (!userLogs || !userLogs.logs || !userLogs.logs[logId]) {
        return null;
      }

      return userLogs.logs[logId];
    } catch (error) {
      console.error('获取单条日志失败:', error);
      return null;
    }
  }

  // 添加或更新日志
  async saveLog(userId: string, logData: Omit<PracticeLog, 'id' | 'timestamp'>, kv: any, existingLogId?: string): Promise<PracticeLog> {
    const logId = existingLogId || this.generateLogId(logData.date);
    const timestamp = new Date().toISOString();
    
    const log: PracticeLog = {
      id: logId,
      date: logData.date,
      content: logData.content,
      timestamp: existingLogId ? (await this.getLog(userId, existingLogId, kv))?.timestamp || timestamp : timestamp,
      lastModified: existingLogId ? timestamp : undefined
    };

    const cacheKey = this.getUserCacheKey(userId);
    
    // 更新缓存（如果存在）
    if (this.cache.has(cacheKey)) {
      const userCache = this.cache.get(cacheKey)!;
      userCache.set(logId, log);
      console.log(`🔄 已更新用户 ${userId} 的日志 ${logId} 缓存`);
    }
    
    // 更新KV存储
    await this.updateUserLogsInKV(userId, logId, log, kv);
    
    return log;
  }

  // 删除日志
  async deleteLog(userId: string, logId: string, kv: any): Promise<boolean> {
    const cacheKey = this.getUserCacheKey(userId);
    
    // 从缓存删除
    if (this.cache.has(cacheKey)) {
      const userCache = this.cache.get(cacheKey)!;
      const deleted = userCache.delete(logId);
      if (deleted) {
        console.log(`🗑️ 已从缓存删除用户 ${userId} 的日志 ${logId}`);
      }
    }
    
    // 从KV删除
    return await this.deleteLogFromKV(userId, logId, kv);
  }

  // 更新KV中的用户日志
  private async updateUserLogsInKV(userId: string, logId: string, log: PracticeLog, kv: any): Promise<void> {
    try {
      const userLogsKey = `user_logs_${userId}`;
      let userLogs = await kv.get(userLogsKey, { type: 'json' }) as UserPracticeLogs;
      
      // 如果用户日志不存在，创建新的
      if (!userLogs) {
        userLogs = {
          userId: userId,
          logs: {},
          summary: {
            totalLogs: 0,
            lastUpdated: new Date().toISOString()
          }
        };
      }
      
      // 更新或添加日志
      userLogs.logs[logId] = log;
      
      // 更新摘要信息
      const allLogs = Object.values(userLogs.logs);
      userLogs.summary = {
        totalLogs: allLogs.length,
        lastUpdated: new Date().toISOString()
      };
      
      // 保存到KV
      await kv.put(userLogsKey, JSON.stringify(userLogs));
      console.log(`✅ 已保存用户 ${userId} 的日志 ${logId} 到KV`);
    } catch (error) {
      console.error(`❌ 保存日志到KV失败 - 用户: ${userId}, 日志: ${logId}`, error);
      throw error;
    }
  }

  // 从KV删除日志
  private async deleteLogFromKV(userId: string, logId: string, kv: any): Promise<boolean> {
    try {
      const userLogsKey = `user_logs_${userId}`;
      const userLogs = await kv.get(userLogsKey, { type: 'json' }) as UserPracticeLogs;
      
      if (!userLogs || !userLogs.logs || !userLogs.logs[logId]) {
        console.log(`📊 日志不存在，无需删除 - 用户: ${userId}, 日志: ${logId}`);
        return false;
      }
      
      // 删除日志
      delete userLogs.logs[logId];
      
      // 更新摘要信息
      const allLogs = Object.values(userLogs.logs);
      userLogs.summary = {
        totalLogs: allLogs.length,
        lastUpdated: new Date().toISOString()
      };
      
      // 保存更新后的数据
      await kv.put(userLogsKey, JSON.stringify(userLogs));
      console.log(`✅ 已从KV删除用户 ${userId} 的日志 ${logId}`);
      return true;
    } catch (error) {
      console.error(`❌ 从KV删除日志失败 - 用户: ${userId}, 日志: ${logId}`, error);
      throw error;
    }
  }

  // 生成日志ID
  private generateLogId(date: string): string {
    // 使用日期 + 随机字符串作为ID
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${date}_${randomSuffix}`;
  }

  // 清除用户缓存
  clearUserCache(userId: string): void {
    const cacheKey = this.getUserCacheKey(userId);
    this.cache.delete(cacheKey);
    console.log(`🧹 已清除用户 ${userId} 的练功日志缓存`);
  }

  // 获取缓存统计信息
  getCacheStats(): { totalUsers: number; totalLogs: number } {
    let totalLogs = 0;
    for (const userCache of this.cache.values()) {
      totalLogs += userCache.size;
    }
    
    return {
      totalUsers: this.cache.size,
      totalLogs: totalLogs
    };
  }
}

// 创建全局缓存实例
export const practiceLogsCache = new PracticeLogsCache();

/**
 * 练功日志KV处理函数
 * 处理所有与练功日志相关的API请求
 */
export async function handlePracticeLogsKv(
  request: Request, 
  kv: any, 
  segments: string[], 
  env: any,
  user: any // 已验证的用户对象
): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  // GET /api/kv/practice-logs -> 获取用户的所有练功日志
  if (segments.length === 0 && method === 'GET') {
    const requestStart = performance.now();
    console.log(`🚀 开始处理练功日志请求 - 用户: ${user.id}`);
    
    try {
      const logs = await practiceLogsCache.getUserLogs(user.id, kv);
      
      const requestTime = performance.now() - requestStart;
      console.log(`✅ 练功日志请求完成 - 用户: ${user.id}, 记录数: ${logs.length}, 耗时: ${requestTime.toFixed(2)}ms`);
      
      const response = json(logs);
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      
      return response;
    } catch (error) {
      const requestTime = performance.now() - requestStart;
      console.error(`❌ 获取练功日志失败 - 用户: ${user.id}, 耗时: ${requestTime.toFixed(2)}ms`, error);
      return json({ error: '获取日志失败' }, 500);
    }
  }

  // POST /api/kv/practice-logs -> 添加新的练功日志
  if (segments.length === 0 && method === 'POST') {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    if (!body.date || !body.content) {
      return json({ error: 'Missing required fields: date, content' }, 400);
    }

    // 验证日期格式
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(body.date)) {
      return json({ error: 'Invalid date format, expected YYYY-MM-DD' }, 400);
    }

    // 验证内容长度（可选）
    if (body.content.length > 50000) { // 50KB限制
      return json({ error: 'Content too long, maximum 50KB allowed' }, 400);
    }

    try {
      const log = await practiceLogsCache.saveLog(user.id, {
        date: body.date,
        content: body.content
      }, kv);
      
      return json({ ok: true, log });
    } catch (error) {
      console.error('保存练功日志失败:', error);
      return json({ error: '保存失败' }, 500);
    }
  }

  // GET /api/kv/practice-logs/:logId -> 获取指定的练功日志
  if (segments.length === 1 && method === 'GET') {
    const logId = decodeURIComponent(segments[0]);
    
    try {
      const log = await practiceLogsCache.getLog(user.id, logId, kv);
      
      if (!log) {
        return json({ error: 'Log not found' }, 404);
      }
      
      return json(log);
    } catch (error) {
      console.error('获取练功日志失败:', error);
      return json({ error: '获取日志失败' }, 500);
    }
  }

  // PUT /api/kv/practice-logs/:logId -> 更新指定的练功日志
  if (segments.length === 1 && method === 'PUT') {
    const logId = decodeURIComponent(segments[0]);
    
    let body: any;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    if (!body.date || !body.content) {
      return json({ error: 'Missing required fields: date, content' }, 400);
    }

    // 验证日期格式
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(body.date)) {
      return json({ error: 'Invalid date format, expected YYYY-MM-DD' }, 400);
    }

    // 验证内容长度
    if (body.content.length > 50000) {
      return json({ error: 'Content too long, maximum 50KB allowed' }, 400);
    }

    try {
      // 检查日志是否存在
      const existingLog = await practiceLogsCache.getLog(user.id, logId, kv);
      if (!existingLog) {
        return json({ error: 'Log not found' }, 404);
      }

      const updatedLog = await practiceLogsCache.saveLog(user.id, {
        date: body.date,
        content: body.content
      }, kv, logId);
      
      return json({ ok: true, log: updatedLog });
    } catch (error) {
      console.error('更新练功日志失败:', error);
      return json({ error: '更新失败' }, 500);
    }
  }

  // DELETE /api/kv/practice-logs/:logId -> 删除指定的练功日志
  if (segments.length === 1 && method === 'DELETE') {
    const logId = decodeURIComponent(segments[0]);
    
    try {
      const deleted = await practiceLogsCache.deleteLog(user.id, logId, kv);
      
      if (!deleted) {
        return json({ error: 'Log not found' }, 404);
      }
      
      return json({ ok: true });
    } catch (error) {
      console.error('删除练功日志失败:', error);
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
