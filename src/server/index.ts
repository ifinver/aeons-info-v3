/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// 导入必要模块
import { generateToken as cryptoGenerateToken, generateUUID } from './crypto-utils';
import { getChinaTimestamp } from './timezone';

// 从 auth.ts 导入所有认证相关函数
import {
  generateToken,
  hashPassword,
  verifyPassword,
  generateUserId,
  generateVerificationToken,
  generateSessionToken,
  generateExpiryTime,
  isValidEmail,
  validatePassword,
  sanitizeInput,
  generateCSRFToken,
  validateCSRFToken,
  getClientIP,
  type User,
  type AuthToken,
  type LoginAttempt
} from './auth';

// 从 mail.ts 导入邮件发送函数
import { sendEmail } from './mail';

// 从 practice-data.ts 导入炼功数据处理函数
import { handlePracticeTimeKv } from './practice-data';

// 从 practice-logs.ts 导入炼功日志处理函数
import { handlePracticeLogsKv } from './practice-logs';
import { handleAstralRecordsKv } from './astral-records';

// 从 user-registration.ts 导入用户注册相关函数
import {
  handleUserRegistration,
  handleEmailVerification,
  handleCompleteRegistration,
  handleForgotPassword,
  handleResetPassword
} from './user-registration';

// 从 user-login.ts 导入用户登录相关函数
import {
  handleUserLogin,
  handleUserLogout,
  handleGetCurrentUser,
  validateAuthToken,
  validateCSRFForAuthenticatedRequest
} from './user-login';

export default {
	async fetch(request, env, ctx): Promise<Response> {
			const url = new URL(request.url);
			
			// 记录所有请求（调试用）
			console.log(`📨 收到请求: ${request.method} ${url.pathname}`);
			// KV API routing
			if (url.pathname === '/api/kv' || url.pathname.startsWith('/api/kv/')) {
				return handleKvApi(request, env);
			}
			// 认证API路由
			if (url.pathname.startsWith('/api/auth/')) {
				return handleAuthApi(request, env);
			}

			// 其它动态端点示例
			switch (url.pathname) {
				case '/message':
					return new Response('Hello, World!');
				case '/random':
					return new Response(generateUUID());
			}

			// 静态资源优先
			try {
				const assetResp = await env.ASSETS.fetch(request);
				if (assetResp && assetResp.status !== 404) {
					return assetResp;
				}
			} catch (e) {
				console.warn('ASSETS.fetch 失败或未配置，进入 SPA 回退流程:', e);
			}

			// SPA 回退：对 HTML GET 请求返回 index.html
			const accept = request.headers.get('accept') || '';
			const wantsHtml = request.method === 'GET' && accept.includes('text/html');
			if (wantsHtml) {
				const indexUrl = new URL('/index.html', url.origin);
				const indexRequest = new Request(indexUrl.toString(), request);
				try {
					return await env.ASSETS.fetch(indexRequest);
				} catch (e) {
					console.error('加载 index.html 失败:', e);
					return new Response('Not Found', { status: 404 });
				}
			}

			return new Response('Not Found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;

// --- KV API helpers ---
async function handleKvApi(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const segments = url.pathname.split('/').filter(Boolean); // ['api','kv', ...]

  // 检查是否是炼功时间KV请求
  if (segments.length >= 3 && segments[2] === 'practice-time') {
    const notBound = !env || !('aeons_info_practice_time' in env) || !env.aeons_info_practice_time;
    if (notBound) {
      return json(
        { error: 'aeons_info_practice_time namespace not bound. Add a KV binding named "aeons_info_practice_time" in wrangler config.' },
        501
      );
    }
    
    // 验证用户认证
    const { user } = await validateAuthToken(request, env);
    if (!user) {
      return json({ error: '请先登录' }, 401);
    }

    // 对于需要CSRF验证的操作进行检查
    if (request.method === 'POST' || request.method === 'DELETE') {
      const csrfCheck = await validateCSRFForAuthenticatedRequest(request, env);
      if (!csrfCheck.valid) {
        return json({ error: 'CSRF验证失败' }, 403);
      }
    }

    return handlePracticeTimeKv(request, env.aeons_info_practice_time, segments.slice(3), env, user);
  }

  // 检查是否是炼功日志KV请求
  if (segments.length >= 3 && segments[2] === 'practice-logs') {
    const notBound = !env || !('aeons_info_practice_logs' in env) || !env.aeons_info_practice_logs;
    if (notBound) {
      return json(
        { error: 'aeons_info_practice_logs namespace not bound. Add a KV binding named "aeons_info_practice_logs" in wrangler config.' },
        501
      );
    }
    
    // 验证用户认证
    const { user } = await validateAuthToken(request, env);
    if (!user) {
      return json({ error: '请先登录' }, 401);
    }

    // 对于需要CSRF验证的操作进行检查
    if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
      const csrfCheck = await validateCSRFForAuthenticatedRequest(request, env);
      if (!csrfCheck.valid) {
        return json({ error: 'CSRF验证失败' }, 403);
      }
    }

    return handlePracticeLogsKv(request, env.aeons_info_practice_logs, segments.slice(3), env, user);
  }

  // 检查是否是出神记录KV请求
  if (segments.length >= 3 && segments[2] === 'astral-records') {
    const notBound = !env || !('aeons_info_astral_records' in env) || !env.aeons_info_astral_records;
    if (notBound) {
      return json(
        { error: 'aeons_info_astral_records namespace not bound. Add a KV binding named "aeons_info_astral_records" in wrangler config.' },
        501
      );
    }

    // 验证用户认证
    const { user } = await validateAuthToken(request, env);
    if (!user) {
      return json({ error: '请先登录' }, 401);
    }

    // 对于需要CSRF验证的操作进行检查
    if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
      const csrfCheck = await validateCSRFForAuthenticatedRequest(request, env);
      if (!csrfCheck.valid) {
        return json({ error: 'CSRF验证失败' }, 403);
      }
    }

    // segments: ['api','kv','astral-records', ...]
    return handleAstralRecordsKv(request, env.aeons_info_astral_records, segments.slice(3), user);
  }

  // 默认KV处理
  const notBound = !env || !('aeons_info_config' in env) || !env.aeons_info_config;
  if (notBound) {
    return json(
      { error: 'aeons_info_config namespace not bound. Add a KV binding named "aeons_info_config" in wrangler config.' },
      501
    );
  }

  // GET /api/kv -> list keys (optional prefix)
  if (segments.length === 2 && method === 'GET') {
    const prefix = url.searchParams.get('prefix') ?? undefined;
    const list = await env.aeons_info_config.list({ prefix });
    return json(list);
  }

  // /api/kv/:key
  if (segments.length >= 3) {
    const key = decodeURIComponent(segments.slice(2).join('/'));

    if (method === 'GET') {
      const value = await env.aeons_info_config.get(key, { type: 'json' });
      if (value === null) return json({ error: 'Key not found' }, 404);
      return json(value);
    }

    if (method === 'DELETE') {
      await env.aeons_info_config.delete(key);
      return json({ ok: true });
    }

    if (method === 'POST' || method === 'PUT') {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'Invalid JSON body' }, 400);
      }
      const ttlParam = url.searchParams.get('ttl');
      const ttl = ttlParam ? Number(ttlParam) : undefined;
      await env.aeons_info_config.put(key, JSON.stringify(body), ttl ? { expirationTtl: ttl } : undefined);
      return json({ ok: true });
    }
  }

  return json({ error: 'Method not allowed' }, 405);
}

// --- 认证API处理函数 ---
async function handleAuthApi(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const segments = url.pathname.split('/').filter(Boolean); // ['api', 'auth', ...]

  // 检查必要的绑定
  if (!env.aeons_info_users || !env.aeons_info_auth_tokens) {
    return json({ error: '认证服务未配置' }, 500);
  }

  // 获取客户端IP
  const clientIP = getClientIP(request);
  
  // 对敏感操作进行速率限制检查
  const sensitiveEndpoints = ['login', 'register', 'forgot-password', 'verify', 'complete-registration'];
  if (segments.length === 3 && sensitiveEndpoints.includes(segments[2])) {
    const rateLimitCheck = await checkAndUpdateRateLimit(clientIP, segments[2], env);
    if (!rateLimitCheck.allowed) {
      return json({ 
        error: '请求过于频繁，请稍后重试',
        retryAfter: Math.ceil(rateLimitCheck.retryAfter / 1000)
      }, 429);
    }
  }

  // POST /api/auth/register -> 用户注册
  if (segments.length === 3 && segments[2] === 'register' && method === 'POST') {
    return handleUserRegistration(request, env);
  }

  // POST /api/auth/login -> 用户登录
  if (segments.length === 3 && segments[2] === 'login' && method === 'POST') {
    return handleUserLogin(request, env);
  }

  // POST /api/auth/verify -> 验证邮箱
  if (segments.length === 3 && segments[2] === 'verify' && method === 'POST') {
    return handleEmailVerification(request, env);
  }

  // POST /api/auth/complete-registration -> 完成注册（创建密码）
  if (segments.length === 3 && segments[2] === 'complete-registration' && method === 'POST') {
    return handleCompleteRegistration(request, env);
  }

  // POST /api/auth/logout -> 用户登出（需要CSRF验证）
  if (segments.length === 3 && segments[2] === 'logout' && method === 'POST') {
    const csrfCheck = await validateCSRFForAuthenticatedRequest(request, env);
    if (!csrfCheck.valid) {
      return json({ error: 'CSRF验证失败' }, 403);
    }
    return handleUserLogout(request, env);
  }

  // GET /api/auth/me -> 获取当前用户信息
  if (segments.length === 3 && segments[2] === 'me' && method === 'GET') {
    return handleGetCurrentUser(request, env);
  }

  // POST /api/auth/forgot-password -> 忘记密码
  if (segments.length === 3 && segments[2] === 'forgot-password' && method === 'POST') {
    return handleForgotPassword(request, env);
  }

  // POST /api/auth/reset-password -> 重置密码
  if (segments.length === 3 && segments[2] === 'reset-password' && method === 'POST') {
    return handleResetPassword(request, env);
  }

  return json({ error: '认证端点不存在' }, 404);
}



function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

// 启动时输出状态
console.log('🔧 Worker 启动 - 服务端已启动');


// 速率限制实现
async function checkAndUpdateRateLimit(ip: string, endpoint: string, env: any): Promise<{allowed: boolean, retryAfter: number}> {
  const key = `rate_limit:${ip}:${endpoint}`;
  const now = getChinaTimestamp();
  
  // 不同端点的限制策略
  const limits: Record<string, { maxAttempts: number; windowMs: number }> = {
    'login': { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 15分钟内最多5次
    'register': { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 1小时内最多3次
    'forgot-password': { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 1小时内最多3次
    'verify': { maxAttempts: 10, windowMs: 60 * 60 * 1000 }, // 1小时内最多10次
    'complete-registration': { maxAttempts: 5, windowMs: 30 * 60 * 1000 } // 30分钟内最多5次
  };
  
  const limit = limits[endpoint] || { maxAttempts: 10, windowMs: 15 * 60 * 1000 };
  
  try {
    // 获取当前限制记录
    const recordStr = await env.aeons_info_auth_tokens.get(key);
    let record: LoginAttempt;
    
    if (recordStr) {
      record = JSON.parse(recordStr);
      
      // 检查窗口是否过期
      if (now - record.lastAttempt > limit.windowMs) {
        // 窗口过期，重置计数
        record = { ip, attempts: 0, lastAttempt: now };
      }
    } else {
      // 新的记录
      record = { ip, attempts: 0, lastAttempt: now };
    }
    
    // 检查是否被阻止
    if (record.blockedUntil && now < record.blockedUntil) {
      return { allowed: false, retryAfter: record.blockedUntil - now };
    }
    
    // 增加尝试次数
    record.attempts++;
    record.lastAttempt = now;
    
    // 检查是否超过限制
    if (record.attempts > limit.maxAttempts) {
      // 设置阻止时间（渐进式增加）
      const blockDuration = Math.min(limit.windowMs * Math.pow(2, record.attempts - limit.maxAttempts), 24 * 60 * 60 * 1000);
      record.blockedUntil = now + blockDuration;
      
      // 保存记录
      await env.aeons_info_auth_tokens.put(key, JSON.stringify(record), {
        expirationTtl: Math.ceil(blockDuration / 1000) + 3600 // 增加1小时缓冲
      });
      
      return { allowed: false, retryAfter: blockDuration };
    }
    
    // 保存更新的记录
    await env.aeons_info_auth_tokens.put(key, JSON.stringify(record), {
      expirationTtl: Math.ceil(limit.windowMs / 1000) + 3600 // 增加1小时缓冲
    });
    
    return { allowed: true, retryAfter: 0 };
    
  } catch (error) {
    console.error('速率限制检查错误:', error);
    // 出错时允许请求，但记录错误
    return { allowed: true, retryAfter: 0 };
  }
}

// 类型定义 - User, AuthToken, LoginAttempt 已从 auth.ts 导入
// 所有工具函数已经从对应模块导入

