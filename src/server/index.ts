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

// 导入bcrypt和其他必要模块
import * as bcrypt from 'bcryptjs';
import { generateToken as cryptoGenerateToken, generateUUID } from './crypto-utils';

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

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		// KV API routing
		if (url.pathname === '/api/kv' || url.pathname.startsWith('/api/kv/')) {
			return handleKvApi(request, env);
		}
		// 认证API路由
		if (url.pathname.startsWith('/api/auth/')) {
			return handleAuthApi(request, env);
		}
		switch (url.pathname) {
			case '/message':
				return new Response('Hello, World!');
					case '/random':
			return new Response(generateUUID());
			default:
				return new Response('Not Found', { status: 404 });
		}
	},
} satisfies ExportedHandler<Env>;

// --- KV API helpers ---
async function handleKvApi(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const segments = url.pathname.split('/').filter(Boolean); // ['api','kv', ...]

  // 检查是否是练功时间KV请求
  if (segments.length >= 3 && segments[2] === 'practice-time') {
    const notBound = !env || !('aeons_info_practice_time' in env) || !env.aeons_info_practice_time;
    if (notBound) {
      return json(
        { error: 'aeons_info_practice_time namespace not bound. Add a KV binding named "aeons_info_practice_time" in wrangler config.' },
        501
      );
    }
    		return handlePracticeTimeKv(request, env.aeons_info_practice_time, segments.slice(3), env);
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

  // GET /api/auth/status -> 检查认证状态
  if (segments.length === 3 && segments[2] === 'status' && method === 'GET') {
    return handleAuthStatus(request, env);
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

// 验证认证令牌的辅助函数（支持HttpOnly cookie）
async function validateAuthToken(request: Request, env: any): Promise<{user: User | null, tokenData: AuthToken | null}> {
  let token: string | null = null;
  
  // 尝试从cookie获取token
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const authCookie = cookies.find(c => c.startsWith('authToken='));
    if (authCookie) {
      token = authCookie.split('=')[1];
    }
  }
  
  // 如果cookie中没有，则从Authorization header获取（向后兼容）
  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return { user: null, tokenData: null };
  }
  
  try {
    // 获取会话令牌
    const tokenData = await env.aeons_info_auth_tokens.get(token, { type: 'json' }) as AuthToken;
    if (!tokenData || tokenData.type !== 'session') {
      return { user: null, tokenData: null };
    }

    // 检查令牌是否过期
    if (Date.now() > tokenData.expiresAt) {
      // 删除过期令牌
      await env.aeons_info_auth_tokens.delete(token);
      return { user: null, tokenData: null };
    }

    // 获取用户信息
    const user = await env.aeons_info_users.get(tokenData.email, { type: 'json' }) as User;
    return { user: user || null, tokenData };

  } catch (error) {
    console.error('验证认证令牌错误:', error);
    return { user: null, tokenData: null };
  }
}

// 用户注册
async function handleUserRegistration(request: Request, env: any): Promise<Response> {
  try {
    const body = await request.json();
    let { email } = body as { email: string };

    // 输入清理和验证
    email = sanitizeInput(email);
    if (!email || !isValidEmail(email)) {
      return json({ error: '请提供有效的邮箱地址' }, 400);
    }

    // 检查用户是否已存在（使用统一错误消息防止枚举）
    const existingUser = await env.aeons_info_users.get(email, { type: 'json' });
    if (existingUser) {
      // 不泄露用户是否存在，返回相同的成功消息
      return json({ 
        message: '注册邮件已发送，请检查您的邮箱并点击验证链接',
        email
      });
    }

    // 生成验证令牌
    const verificationToken = generateVerificationToken();
    const tokenData: AuthToken = {
      userId: '', // 用户ID将在验证后生成
      email,
      expiresAt: generateExpiryTime(24), // 24小时过期
      type: 'verification',
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('User-Agent') || 'unknown'
    };

    // 存储验证令牌
    await env.aeons_info_auth_tokens.put(verificationToken, JSON.stringify(tokenData), {
      expirationTtl: 24 * 60 * 60 // 24小时
    });

    // 发送验证邮件
    const baseUrl = new URL(request.url).origin;
    const emailData = generateVerificationEmail(email, verificationToken, baseUrl);
    const emailSent = await sendEmail(emailData, env);

    if (!emailSent) {
      return json({ error: '邮件发送失败，请稍后重试' }, 500);
    }

    return json({ 
      message: '注册邮件已发送，请检查您的邮箱并点击验证链接',
      email
    });

  } catch (error) {
    console.error('注册错误:', error);
    return json({ error: '系统暂时不可用，请稍后重试' }, 500);
  }
}

// 用户登录
async function handleUserLogin(request: Request, env: any): Promise<Response> {
  try {
    const body = await request.json();
    let { email, password, csrfToken } = body as { email: string; password: string; csrfToken?: string };

    // 输入验证和清理
    email = sanitizeInput(email);
    if (!email || !password) {
      return json({ error: '请提供完整的登录信息' }, 400);
    }

    if (!isValidEmail(email)) {
      return json({ error: '邮箱格式不正确' }, 400);
    }

    // 获取客户端信息
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('User-Agent') || 'unknown';

    // 获取用户信息
    const user = await env.aeons_info_users.get(email, { type: 'json' }) as User;
    
    // 统一错误消息，防止用户枚举
    const invalidCredentialsMessage = '邮箱或密码错误';
    
    if (!user) {
      // 即使用户不存在，也要执行相同的时间延迟
      await new Promise(resolve => setTimeout(resolve, 100));
      return json({ error: invalidCredentialsMessage }, 400);
    }

    // 检查账户是否被锁定
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const lockTime = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
      return json({ 
        error: `账户已被锁定，请在${lockTime}分钟后重试`,
        lockedUntil: user.lockedUntil
      }, 423);
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    
    if (!isPasswordValid) {
      // 增加失败尝试计数
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      user.failedLoginAttempts = failedAttempts;

      // 如果失败次数达到5次，锁定账户30分钟
      if (failedAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        user.failedLoginAttempts = 0; // 重置计数
      }

      // 更新用户信息
      await env.aeons_info_users.put(email, JSON.stringify(user));
      
      return json({ error: invalidCredentialsMessage }, 400);
    }

    // 检查邮箱是否已验证
    if (!user.verified) {
      return json({ error: '请先验证您的邮箱地址' }, 400);
    }

    // 登录成功，重置失败计数和锁定状态
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date().toISOString();
    await env.aeons_info_users.put(email, JSON.stringify(user));

    // 生成CSRF令牌
    const csrfTokenValue = generateCSRFToken();

    // 限制并发会话数（可选：撤销旧会话）
    await revokeOldSessions(user.id, env, 3); // 最多保留3个活跃会话

    // 生成会话令牌
    const sessionToken = generateSessionToken();
    const tokenData: AuthToken = {
      userId: user.id,
      email: user.email,
      expiresAt: generateExpiryTime(7 * 24), // 7天过期
      type: 'session',
      csrfToken: csrfTokenValue,
      ipAddress: clientIP,
      userAgent: userAgent
    };

    // 存储会话令牌
    await env.aeons_info_auth_tokens.put(sessionToken, JSON.stringify(tokenData), {
      expirationTtl: 7 * 24 * 60 * 60 // 7天
    });

    // 设置安全的响应头
    const response = json({
      message: '登录成功',
      user: {
        id: user.id,
        email: user.email,
        verified: user.verified
      },
      csrfToken: csrfTokenValue
    });

    // 设置HttpOnly cookie
    // 在开发环境中不使用Secure标志，生产环境中使用
    const isProduction = request.url.includes('https://') || request.headers.get('cf-ray'); // Cloudflare特有header
    const secureFlag = isProduction ? '; Secure' : '';
    const cookieValue = `authToken=${sessionToken}; HttpOnly${secureFlag}; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}; Path=/`;
    
    console.log('🍪 设置Cookie调试信息:');
    console.log('  - URL:', request.url);
    console.log('  - isProduction:', isProduction);
    console.log('  - secureFlag:', secureFlag);
    console.log('  - sessionToken长度:', sessionToken.length);
    console.log('  - cookieValue:', cookieValue);
    
    response.headers.set('Set-Cookie', cookieValue);

    return response;

  } catch (error) {
    console.error('登录错误:', error);
    return json({ error: '系统暂时不可用，请稍后重试' }, 500);
  }
}

// 检查认证状态
async function handleAuthStatus(request: Request, env: any): Promise<Response> {
  try {
    const { user, tokenData } = await validateAuthToken(request, env);
    
    if (!user || !tokenData) {
      return json({ 
        authenticated: false, 
        user: null 
      });
    }

    return json({ 
      authenticated: true, 
      user: {
        id: user.id,
        email: user.email,
        verified: user.verified
      },
      csrfToken: tokenData.csrfToken
    });

  } catch (error) {
    console.error('状态检查错误:', error);
    return json({ 
      authenticated: false, 
      user: null,
      error: '状态检查失败' 
    }, 500);
  }
}

// 验证邮箱
async function handleEmailVerification(request: Request, env: any): Promise<Response> {
  try {
    const body = await request.json();
    const { token } = body as { token: string };

    if (!token) {
      return json({ error: '请提供验证令牌' }, 400);
    }

    // 获取验证令牌
    const tokenData = await env.aeons_info_auth_tokens.get(token, { type: 'json' }) as AuthToken;
    if (!tokenData || tokenData.type !== 'verification') {
      return json({ error: '无效的验证令牌' }, 400);
    }

    // 检查令牌是否过期
    if (Date.now() > tokenData.expiresAt) {
      return json({ error: '验证令牌已过期' }, 400);
    }

    return json({
      message: '验证令牌有效',
      email: tokenData.email
    });

  } catch (error) {
    console.error('邮箱验证错误:', error);
    return json({ error: '邮箱验证失败，请稍后重试' }, 500);
  }
}

// 完成用户注册（创建密码）
async function handleCompleteRegistration(request: Request, env: any): Promise<Response> {
  try {
    const body = await request.json();
    const { token, password } = body as { token: string; password: string };

    if (!token || !password) {
      return json({ error: '请提供验证令牌和密码' }, 400);
    }

    // 获取验证令牌
    const tokenData = await env.aeons_info_auth_tokens.get(token, { type: 'json' }) as AuthToken;
    if (!tokenData || tokenData.type !== 'verification') {
      return json({ error: '无效的验证令牌' }, 400);
    }

    // 检查令牌是否过期
    if (Date.now() > tokenData.expiresAt) {
      return json({ error: '验证令牌已过期' }, 400);
    }

    // 验证密码强度
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return json({ error: passwordValidation.message }, 400);
    }

    // 创建用户
    const userId = generateUserId();
    const passwordHash = await hashPassword(password); // 使用异步bcrypt哈希
    const user: User = {
      id: userId,
      email: tokenData.email,
      passwordHash: passwordHash,
      createdAt: new Date().toISOString(),
      verified: true,
      failedLoginAttempts: 0
    };

    // 存储用户信息
    await env.aeons_info_users.put(tokenData.email, JSON.stringify(user));

    // 删除验证令牌
    await env.aeons_info_auth_tokens.delete(token);

    return json({
      message: '注册完成，账户已创建',
      user: {
        id: user.id,
        email: user.email,
        verified: user.verified
      }
    });

  } catch (error) {
    console.error('完成注册错误:', error);
    return json({ error: '系统暂时不可用，请稍后重试' }, 500);
  }
}

// 用户登出
async function handleUserLogout(request: Request, env: any): Promise<Response> {
  try {
    const { tokenData } = await validateAuthToken(request, env);
    
    if (tokenData) {
      // 从cookie或Authorization header获取token并删除
      let token: string | null = null;
      
      const cookieHeader = request.headers.get('Cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(c => c.trim());
        const authCookie = cookies.find(c => c.startsWith('authToken='));
        if (authCookie) {
          token = authCookie.split('=')[1];
        }
      }
      
      if (!token) {
        const authHeader = request.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }
      
      if (token) {
        // 删除会话令牌
        await env.aeons_info_auth_tokens.delete(token);
      }
    }

    // 清除HttpOnly cookie
    const response = json({ message: '登出成功' });
    const isProduction = request.url.includes('https://') || request.headers.get('cf-ray');
    const secureFlag = isProduction ? '; Secure' : '';
    response.headers.set('Set-Cookie', 
      `authToken=; HttpOnly${secureFlag}; SameSite=Strict; Max-Age=0; Path=/`
    );
    
    return response;

  } catch (error) {
    console.error('登出错误:', error);
    return json({ error: '系统暂时不可用，请稍后重试' }, 500);
  }
}

// 获取当前用户信息
async function handleGetCurrentUser(request: Request, env: any): Promise<Response> {
  try {
    const { user, tokenData } = await validateAuthToken(request, env);
    
    if (!user || !tokenData) {
      return json({ error: '未授权访问' }, 401);
    }

    // 生成新的CSRF token（可选的额外安全措施）
    const newCSRFToken = generateCSRFToken();
    
    return json({
      user: {
        id: user.id,
        email: user.email,
        verified: user.verified
      },
      csrfToken: newCSRFToken
    });

  } catch (error) {
    console.error('获取用户信息错误:', error);
    return json({ error: '系统暂时不可用，请稍后重试' }, 500);
  }
}

// 忘记密码
async function handleForgotPassword(request: Request, env: any): Promise<Response> {
  try {
    const body = await request.json();
    let { email } = body as { email: string };

    // 输入清理和验证
    email = sanitizeInput(email);
    if (!email || !isValidEmail(email)) {
      return json({ error: '请提供有效的邮箱地址' }, 400);
    }

    // 检查用户是否存在（不泄露用户是否存在）
    const user = await env.aeons_info_users.get(email, { type: 'json' }) as User;
    
    // 无论用户是否存在都返回相同消息
    const successMessage = '如果该邮箱已注册，您将收到密码重置邮件';
    
    if (user) {
      // 生成密码重置令牌
      const resetToken = generateVerificationToken();
      const tokenData: AuthToken = {
        userId: user.id,
        email: user.email,
        expiresAt: generateExpiryTime(1), // 1小时过期
        type: 'password_reset',
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('User-Agent') || 'unknown'
      };

      // 存储重置令牌
      await env.aeons_info_auth_tokens.put(resetToken, JSON.stringify(tokenData), {
        expirationTtl: 60 * 60 // 1小时
      });

      // 发送重置邮件
      const baseUrl = new URL(request.url).origin;
      const emailData = generatePasswordResetEmail(email, resetToken, baseUrl);
      await sendEmail(emailData, env); // 不检查发送结果，避免信息泄露
    }

    // 添加延迟防止时序攻击
    await new Promise(resolve => setTimeout(resolve, 200));

    return json({ message: successMessage });

  } catch (error) {
    console.error('忘记密码错误:', error);
    return json({ error: '系统暂时不可用，请稍后重试' }, 500);
  }
}

// 重置密码
async function handleResetPassword(request: Request, env: any): Promise<Response> {
  try {
    const body = await request.json();
    const { token, password } = body as { token: string; password: string };

    if (!token || !password) {
      return json({ error: '请提供重置令牌和新密码' }, 400);
    }

    // 获取重置令牌
    const tokenData = await env.aeons_info_auth_tokens.get(token, { type: 'json' }) as AuthToken;
    if (!tokenData || tokenData.type !== 'password_reset') {
      return json({ error: '无效的重置令牌' }, 400);
    }

    // 检查令牌是否过期
    if (Date.now() > tokenData.expiresAt) {
      return json({ error: '重置令牌已过期' }, 400);
    }

    // 验证密码强度
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return json({ error: passwordValidation.message }, 400);
    }

    // 更新用户密码
    const user = await env.aeons_info_users.get(tokenData.email, { type: 'json' }) as User;
    if (!user) {
      return json({ error: '用户不存在' }, 401);
    }

    // 使用bcrypt哈希新密码
    user.passwordHash = await hashPassword(password);
    // 重置失败登录尝试和锁定状态
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    
    await env.aeons_info_users.put(tokenData.email, JSON.stringify(user));

    // 删除重置令牌
    await env.aeons_info_auth_tokens.delete(token);

    // 使所有现有会话失效（可选的额外安全措施）
    // 这里我们可以添加逻辑来撤销用户的所有活动会话

    return json({ message: '密码重置成功，请使用新密码登录' });

  } catch (error) {
    console.error('重置密码错误:', error);
    return json({ error: '系统暂时不可用，请稍后重试' }, 500);
  }
}



function generateVerificationEmail(email: string, token: string, baseUrl: string): any {
  const verificationUrl = `${baseUrl}/#/auth/verify/${token}`;

  return {
    to: email,
    subject: 'aeons.info - 验证您的邮箱',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>验证您的邮箱</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Aeons.info</h1>
          </div>
          <div class="content">
            <h2>验证您的邮箱</h2>
            <p>您好！</p>
            <p>感谢您注册Aeons.info。请点击下面的按钮验证您的邮箱地址：</p>
            <a href="${verificationUrl}" class="button">验证邮箱</a>
            <p>如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
            <p style="word-break: break-all; color: #3b82f6;">${verificationUrl}</p>
            <p>此链接将在24小时后过期。</p>
            <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; margin: 20px 0; border-radius: 6px; color: #92400e;">
              <strong>安全提醒：</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>验证链接将在24小时后过期</li>
                <li>请勿将此邮件转发给他人</li>
                <li>如有疑问，请联系我们的客服</li>
              </ul>
            </div>
            <p>如果您没有注册Aeons.info，请忽略此邮件。</p>
          </div>
          <div class="footer">
            <p>此邮件由Aeons.info系统自动发送，请勿回复。</p>
            <p>如果您有任何问题，请访问我们的帮助中心。</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Aeons.info - 验证您的邮箱

您好！

感谢您注册Aeons.info。请点击以下链接验证您的邮箱地址：

${verificationUrl}

此链接将在24小时后过期。

如果您没有注册Aeons.info，请忽略此邮件。

此邮件由Aeons.info系统自动发送，请勿回复。
    `
  };
}

function generatePasswordResetEmail(email: string, token: string, baseUrl: string): any {
  // 使用POST方式的重置页面，不在URL中暴露敏感信息
  const resetUrl = `${baseUrl}/#/auth/reset-password/${token}`;

  return {
    to: email,
    subject: 'Aeons.info - 重置密码',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>重置密码</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Aeons.info</h1>
          </div>
          <div class="content">
            <h2>重置密码</h2>
            <p>您好！</p>
            <p>我们收到了您的密码重置请求。请点击下面的按钮重置您的密码：</p>
            <a href="${resetUrl}" class="button">重置密码</a>
            <p>如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
            <p style="word-break: break-all; color: #ef4444;">${resetUrl}</p>
            <p>此链接将在1小时后过期。</p>
            <div style="background: #fee2e2; border: 1px solid #fca5a5; padding: 15px; margin: 20px 0; border-radius: 6px; color: #991b1b;">
              <strong>安全提醒：</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>重置链接仅在1小时内有效</li>
                <li>如果您没有请求重置密码，请立即联系客服</li>
                <li>请勿将此邮件转发给他人</li>
                <li>设置新密码时请使用强密码</li>
              </ul>
            </div>
            <p>如果您没有请求重置密码，请忽略此邮件。</p>
          </div>
          <div class="footer">
            <p>此邮件由Aeons.info系统自动发送，请勿回复。</p>
            <p>如果您认为这是安全威胁，请立即联系我们。</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Aeons.info - 重置密码

您好！

我们收到了您的密码重置请求。请点击以下链接重置您的密码：

${resetUrl}

此链接将在1小时后过期。

如果您没有请求重置密码，请忽略此邮件。

此邮件由Aeons.info系统自动发送，请勿回复。
    `
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

// --- Practice Time KV handlers ---
async function handlePracticeTimeKv(request: Request, kv: any, segments: string[], env: any): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  // 验证用户认证
  const { user } = await validateAuthToken(request, env);
  if (!user) {
    return json({ error: '请先登录' }, 401);
  }

  // GET /api/kv/practice-time -> 获取用户的所有练功记录
  if (segments.length === 0 && method === 'GET') {
    const userKeyPrefix = `user_${user.id}_`;
    const list = await kv.list({ prefix: userKeyPrefix });
    const records = [];
    
    for (const key of list.keys) {
      const value = await kv.get(key.name, { type: 'json' });
      if (value) {
        // 从key中提取日期（移除用户前缀）
        const date = key.name.replace(userKeyPrefix, '');
        records.push({
          date,
          ...value
        });
      }
    }
    
    // 按日期排序
    records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return json(records);
  }

  // POST /api/kv/practice-time -> 添加新的练功记录（需要CSRF验证）
  if (segments.length === 0 && method === 'POST') {
    const csrfCheck = await validateCSRFForAuthenticatedRequest(request, env);
    if (!csrfCheck.valid) {
      return json({ error: 'CSRF验证失败' }, 403);
    }
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

    // 存储数据（使用用户特定的键）
    const record = {
      hours,
      minutes,
      totalMinutes: hours * 60 + minutes,
      timestamp: new Date().toISOString()
    };

    const userKey = `user_${user.id}_${body.date}`;
    await kv.put(userKey, JSON.stringify(record));
    return json({ ok: true, record });
  }

  // DELETE /api/kv/practice-time/:date -> 删除指定日期的记录（需要CSRF验证）
  if (segments.length === 1 && method === 'DELETE') {
    const csrfCheck = await validateCSRFForAuthenticatedRequest(request, env);
    if (!csrfCheck.valid) {
      return json({ error: 'CSRF验证失败' }, 403);
    }
    const date = decodeURIComponent(segments[0]);
    const userKey = `user_${user.id}_${date}`;
    await kv.delete(userKey);
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed or invalid path' }, 405);
}

// 速率限制实现
async function checkAndUpdateRateLimit(ip: string, endpoint: string, env: any): Promise<{allowed: boolean, retryAfter: number}> {
  const key = `rate_limit:${ip}:${endpoint}`;
  const now = Date.now();
  
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

// CSRF验证函数
async function validateCSRFForAuthenticatedRequest(request: Request, env: any): Promise<{valid: boolean, tokenData?: AuthToken}> {
  try {
    // 获取认证信息
    const { user, tokenData } = await validateAuthToken(request, env);
    if (!user || !tokenData) {
      return { valid: false };
    }

    // 检查是否有存储的CSRF token
    if (!tokenData.csrfToken) {
      return { valid: false };
    }

    // 获取请求中的CSRF token
    const providedCSRFToken = request.headers.get('X-CSRF-Token');
    if (!providedCSRFToken) {
      return { valid: false };
    }

    // 验证CSRF token
    const isValidCSRF = validateCSRFToken(providedCSRFToken, tokenData.csrfToken);
    return { valid: isValidCSRF, tokenData };

  } catch (error) {
    console.error('CSRF验证错误:', error);
    return { valid: false };
  }
}

// 撤销用户的旧会话
async function revokeOldSessions(userId: string, env: any, maxSessions: number = 3): Promise<void> {
  try {
    // 这是一个简化实现，在生产环境中可能需要更复杂的会话管理
    // 由于Cloudflare KV的限制，我们暂时跳过这个功能
    // 可以考虑使用Durable Objects来实现更复杂的会话管理
    
    // TODO: 实现会话并发控制
    // 1. 扫描所有活跃的会话令牌
    // 2. 找到属于该用户的会话
    // 3. 按创建时间排序，保留最新的N个会话
    // 4. 删除其余的会话
    
    console.log(`会话管理: 用户${userId}登录，当前会话限制为${maxSessions}`);
  } catch (error) {
    console.error('撤销旧会话错误:', error);
  }
}

// 会话刷新（延长过期时间）
async function refreshSession(request: Request, env: any): Promise<{success: boolean, newToken?: string}> {
  try {
    const { user, tokenData } = await validateAuthToken(request, env);
    if (!user || !tokenData) {
      return { success: false };
    }

    // 检查是否需要刷新（距离过期时间少于30分钟时刷新）
    const timeToExpiry = tokenData.expiresAt - Date.now();
    const shouldRefresh = timeToExpiry < 30 * 60 * 1000; // 30分钟

    if (shouldRefresh) {
      // 生成新的令牌
      const newSessionToken = generateSessionToken();
      const newTokenData: AuthToken = {
        ...tokenData,
        expiresAt: generateExpiryTime(2), // 重新设置2小时过期
        csrfToken: generateCSRFToken() // 生成新的CSRF token
      };

      // 存储新令牌
      await env.aeons_info_auth_tokens.put(newSessionToken, JSON.stringify(newTokenData), {
        expirationTtl: 2 * 60 * 60 // 2小时
      });

      // 删除旧令牌（获取原始token）
      let oldToken: string | null = null;
      const cookieHeader = request.headers.get('Cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(c => c.trim());
        const authCookie = cookies.find(c => c.startsWith('authToken='));
        if (authCookie) {
          oldToken = authCookie.split('=')[1];
        }
      }
      
      if (!oldToken) {
        const authHeader = request.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          oldToken = authHeader.substring(7);
        }
      }
      
      if (oldToken) {
        await env.aeons_info_auth_tokens.delete(oldToken);
      }

      return { success: true, newToken: newSessionToken };
    }

    return { success: true }; // 不需要刷新
  } catch (error) {
    console.error('会话刷新错误:', error);
    return { success: false };
  }
}

// 类型定义 - User, AuthToken, LoginAttempt 已从 auth.ts 导入
interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// 所有工具函数已经从 auth.ts 和 mail.ts 导入

