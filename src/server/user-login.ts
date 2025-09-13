/**
 * 用户登录模块
 * 处理用户登录、登出、会话管理相关的所有逻辑
 */

import {
  verifyPassword,
  generateSessionToken,
  generateExpiryTime,
  isValidEmail,
  sanitizeInput,
  generateCSRFToken,
  validateCSRFToken,
  getClientIP,
  type User,
  type AuthToken
} from './auth';
import { getChinaISOString, getChinaTimestamp } from './timezone';

/**
 * 用户登录处理函数
 */
export async function handleUserLogin(request: Request, env: any): Promise<Response> {
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
    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > getChinaTimestamp()) {
      const lockTime = Math.ceil((new Date(user.lockedUntil).getTime() - getChinaTimestamp()) / 60000);
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
        user.lockedUntil = new Date(getChinaTimestamp() + 30 * 60 * 1000).toISOString();
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
    user.lastLoginAt = getChinaISOString();
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
    const cookieValue = `authToken=${sessionToken}${secureFlag}; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}; Path=/`;
    
    response.headers.set('Set-Cookie', cookieValue);

    return response;

  } catch (error) {
    console.error('登录错误:', error);
    return json({ error: '系统暂时不可用，请稍后重试' }, 500);
  }
}

/**
 * 用户登出处理函数
 */
export async function handleUserLogout(request: Request, env: any): Promise<Response> {
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
      `authToken=${secureFlag}; SameSite=Lax; Max-Age=0; Path=/`
    );
    
    return response;

  } catch (error) {
    console.error('登出错误:', error);
    return json({ error: '系统暂时不可用，请稍后重试' }, 500);
  }
}

/**
 * 获取当前用户信息处理函数
 */
export async function handleGetCurrentUser(request: Request, env: any): Promise<Response> {
  try {
    const { user, tokenData } = await validateAuthToken(request, env);
    
    if (!user || !tokenData) {
      return json({ error: '未授权访问' }, 401);
    }

    // 返回现有的CSRF token，确保客户端和服务端同步
    return json({
      user: {
        id: user.id,
        email: user.email,
        verified: user.verified
      },
      csrfToken: tokenData.csrfToken
    });

  } catch (error) {
    console.error('获取用户信息错误:', error);
    return json({ error: '系统暂时不可用，请稍后重试' }, 500);
  }
}

/**
 * 验证认证令牌的辅助函数（支持HttpOnly cookie）
 */
export async function validateAuthToken(request: Request, env: any): Promise<{user: User | null, tokenData: AuthToken | null}> {
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
    if (getChinaTimestamp() > tokenData.expiresAt) {
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

/**
 * CSRF验证函数
 */
export async function validateCSRFForAuthenticatedRequest(request: Request, env: any): Promise<{valid: boolean, tokenData?: AuthToken}> {
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

/**
 * 会话刷新（延长过期时间）
 */
export async function refreshSession(request: Request, env: any): Promise<{success: boolean, newToken?: string}> {
  try {
    const { user, tokenData } = await validateAuthToken(request, env);
    if (!user || !tokenData) {
      return { success: false };
    }

    // 检查是否需要刷新（距离过期时间少于30分钟时刷新）
    const timeToExpiry = tokenData.expiresAt - getChinaTimestamp();
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

/**
 * 撤销用户的旧会话
 */
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

// 工具函数
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      'content-type': 'application/json; charset=utf-8',
    },
  });
}
