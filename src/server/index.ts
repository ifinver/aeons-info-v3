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
				return new Response(crypto.randomUUID());
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

  // POST /api/auth/logout -> 用户登出
  if (segments.length === 3 && segments[2] === 'logout' && method === 'POST') {
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

// 验证认证令牌的辅助函数
async function validateAuthToken(request: Request, env: any): Promise<User | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    
    // 获取会话令牌
    const tokenData = await env.aeons_info_auth_tokens.get(token, { type: 'json' }) as AuthToken;
    if (!tokenData || tokenData.type !== 'session') {
      return null;
    }

    // 检查令牌是否过期
    if (Date.now() > tokenData.expiresAt) {
      return null;
    }

    // 获取用户信息
    const user = await env.aeons_info_users.get(tokenData.email, { type: 'json' }) as User;
    return user || null;

  } catch (error) {
    console.error('验证认证令牌错误:', error);
    return null;
  }
}

// 用户注册
async function handleUserRegistration(request: Request, env: any): Promise<Response> {
  try {
    const body = await request.json();
    const { email } = body as { email: string };

    if (!email || !isValidEmail(email)) {
      return json({ error: '请提供有效的邮箱地址' }, 400);
    }

    // 检查用户是否已存在
    const existingUser = await env.aeons_info_users.get(email, { type: 'json' });
    if (existingUser) {
      return json({ error: '该邮箱已被注册' }, 400);
    }

    // 生成验证令牌
    const verificationToken = generateVerificationToken();
    const tokenData: AuthToken = {
      userId: '', // 用户ID将在验证后生成
      email,
      expiresAt: generateExpiryTime(24), // 24小时过期
      type: 'verification'
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
      return json({ 
        error: '邮件发送失败，请稍后重试',
        debug: {
          mailchannelsApiKey: env.MAILCHANNELS_API_KEY || null,
          fromEmail: env.MAIL_FROM_EMAIL || 'noreply@aeons-info.com'
        }
      }, 500);
    }

    return json({ 
      message: '注册邮件已发送，请检查您的邮箱并点击验证链接',
      email,
      debug: {
        mailchannelsApiKey: env.MAILCHANNELS_API_KEY || null,
        fromEmail: env.MAIL_FROM_EMAIL || 'noreply@aeons-info.com'
      }
    });

  } catch (error) {
    console.error('注册错误:', error);
    return json({ 
      error: '注册失败，请稍后重试',
      debug: {
        mailchannelsApiKey: env.MAILCHANNELS_API_KEY || null,
        fromEmail: env.MAIL_FROM_EMAIL || 'noreply@aeons-info.com'
      }
    }, 500);
  }
}

// 用户登录
async function handleUserLogin(request: Request, env: any): Promise<Response> {
  try {
    const body = await request.json();
    const { email, password } = body as { email: string; password: string };

    if (!email || !password) {
      return json({ error: '请提供邮箱和密码' }, 400);
    }

    // 获取用户信息
    const user = await env.aeons_info_users.get(email, { type: 'json' }) as User;
    if (!user) {
      return json({ error: '用户不存在' }, 400);
    }

    // 验证密码
    if (!verifyPassword(password, user.passwordHash)) {
      return json({ error: '密码错误' }, 400);
    }

    // 检查邮箱是否已验证
    if (!user.verified) {
      return json({ error: '请先验证您的邮箱地址' }, 400);
    }

    // 生成会话令牌
    const sessionToken = generateSessionToken();
    const tokenData: AuthToken = {
      userId: user.id,
      email: user.email,
      expiresAt: generateExpiryTime(24 * 7), // 7天过期
      type: 'session'
    };

    // 存储会话令牌
    await env.aeons_info_auth_tokens.put(sessionToken, JSON.stringify(tokenData), {
      expirationTtl: 24 * 60 * 60 * 7 // 7天
    });

    return json({
      message: '登录成功',
      user: {
        id: user.id,
        email: user.email,
        verified: user.verified
      },
      token: sessionToken
    });

  } catch (error) {
    console.error('登录错误:', error);
    return json({ error: '登录失败，请稍后重试' }, 500);
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
    const user: User = {
      id: userId,
      email: tokenData.email,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      verified: true
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
    return json({ error: '注册失败，请稍后重试' }, 500);
  }
}

// 用户登出
async function handleUserLogout(request: Request, env: any): Promise<Response> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ error: '未提供认证令牌' }, 401);
    }

    const token = authHeader.substring(7);
    
    // 删除会话令牌
    await env.aeons_info_auth_tokens.delete(token);

    return json({ message: '登出成功' });

  } catch (error) {
    console.error('登出错误:', error);
    return json({ error: '登出失败，请稍后重试' }, 500);
  }
}

// 获取当前用户信息
async function handleGetCurrentUser(request: Request, env: any): Promise<Response> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ error: '未提供认证令牌' }, 401);
    }

    const token = authHeader.substring(7);
    
    // 获取会话令牌
    const tokenData = await env.aeons_info_auth_tokens.get(token, { type: 'json' }) as AuthToken;
    if (!tokenData || tokenData.type !== 'session') {
      return json({ error: '无效的认证令牌' }, 401);
    }

    // 检查令牌是否过期
    if (Date.now() > tokenData.expiresAt) {
      return json({ error: '认证令牌已过期' }, 401);
    }

    // 获取用户信息
    const user = await env.aeons_info_users.get(tokenData.email, { type: 'json' }) as User;
    if (!user) {
      return json({ error: '用户不存在' }, 401);
    }

    return json({
      user: {
        id: user.id,
        email: user.email,
        verified: user.verified
      }
    });

  } catch (error) {
    console.error('获取用户信息错误:', error);
    return json({ error: '获取用户信息失败' }, 500);
  }
}

// 忘记密码
async function handleForgotPassword(request: Request, env: any): Promise<Response> {
  try {
    const body = await request.json();
    const { email } = body as { email: string };

    if (!email || !isValidEmail(email)) {
      return json({ error: '请提供有效的邮箱地址' }, 400);
    }

    // 检查用户是否存在
    const user = await env.aeons_info_users.get(email, { type: 'json' }) as User;
    if (!user) {
      return json({ error: '该邮箱未注册' }, 400);
    }

    // 生成密码重置令牌
    const resetToken = generateVerificationToken();
    const tokenData: AuthToken = {
      userId: user.id,
      email: user.email,
      expiresAt: generateExpiryTime(1), // 1小时过期
      type: 'password_reset'
    };

    // 存储重置令牌
    await env.aeons_info_auth_tokens.put(resetToken, JSON.stringify(tokenData), {
      expirationTtl: 60 * 60 // 1小时
    });

    // 发送重置邮件
    const baseUrl = new URL(request.url).origin;
    const emailData = generatePasswordResetEmail(email, resetToken, baseUrl);
    const emailSent = await sendEmail(emailData, env);

    if (!emailSent) {
      return json({ error: '邮件发送失败，请稍后重试' }, 500);
    }

    return json({ 
      message: '密码重置邮件已发送，请检查您的邮箱',
      email 
    });

  } catch (error) {
    console.error('忘记密码错误:', error);
    return json({ error: '处理失败，请稍后重试' }, 500);
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

    user.passwordHash = hashPassword(password);
    await env.aeons_info_users.put(tokenData.email, JSON.stringify(user));

    // 删除重置令牌
    await env.aeons_info_auth_tokens.delete(token);

    return json({ message: '密码重置成功' });

  } catch (error) {
    console.error('重置密码错误:', error);
    return json({ error: '密码重置失败，请稍后重试' }, 500);
  }
}

// 从auth.ts导入的类型和函数
interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  verified: boolean;
}

interface AuthToken {
  userId: string;
  email: string;
  expiresAt: number;
  type: 'session' | 'verification' | 'password_reset';
}

// 从auth.ts导入的辅助函数
function generateToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateVerificationToken(): string {
  return generateToken(16);
}

function generateSessionToken(): string {
  return generateToken(32);
}

function generateUserId(): string {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateExpiryTime(hours: number = 24): number {
  return Date.now() + (hours * 60 * 60 * 1000);
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function hashPassword(password: string): string {
  // 简单的哈希实现，生产环境应使用更安全的算法
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  return hash.toString(16);
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 6) {
    return { valid: false, message: '密码长度至少6位' };
  }
  return { valid: true, message: '密码有效' };
}

// 从mail.ts导入的邮件函数
async function sendEmail(emailData: any, env: any): Promise<boolean> {
  try {
    const fromEmail = env.MAIL_FROM_EMAIL || 'noreply@aeons-info.com';
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(env.MAILCHANNELS_API_KEY ? { 'Authorization': `Bearer ${env.MAILCHANNELS_API_KEY}` } : {}),
        ...(env.MAILCHANNELS_API_KEY ? { 'X-Api-Key': env.MAILCHANNELS_API_KEY } : {}),
        'X-Auth-User': fromEmail,
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: emailData.to, name: emailData.to.split('@')[0] }],
          },
        ],
        from: {
          email: fromEmail,
          name: env.MAIL_FROM_NAME || '练功计时器',
        },
        subject: emailData.subject,
        content: [
          {
            type: 'text/html',
            value: emailData.html,
          },
          ...(emailData.text ? [{
            type: 'text/plain',
            value: emailData.text,
          }] : []),
        ],
      }),
    });

    if (!response.ok) {
      console.error('邮件发送失败:', response.status, response.statusText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('邮件发送错误:', error);
    return false;
  }
}

function generateVerificationEmail(email: string, token: string, baseUrl: string): any {
  const verificationUrl = `${baseUrl}/#/auth/verify/${token}`;

  return {
    to: email,
    subject: '练功计时器 - 验证您的邮箱',
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
            <h1>练功计时器</h1>
          </div>
          <div class="content">
            <h2>验证您的邮箱</h2>
            <p>您好！</p>
            <p>感谢您注册练功计时器。请点击下面的按钮验证您的邮箱地址：</p>
            <a href="${verificationUrl}" class="button">验证邮箱</a>
            <p>如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
            <p style="word-break: break-all; color: #3b82f6;">${verificationUrl}</p>
            <p>此链接将在24小时后过期。</p>
            <p>如果您没有注册练功计时器，请忽略此邮件。</p>
          </div>
          <div class="footer">
            <p>此邮件由练功计时器系统自动发送，请勿回复。</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
练功计时器 - 验证您的邮箱

您好！

感谢您注册练功计时器。请点击以下链接验证您的邮箱地址：

${verificationUrl}

此链接将在24小时后过期。

如果您没有注册练功计时器，请忽略此邮件。

此邮件由练功计时器系统自动发送，请勿回复。
    `
  };
}

function generatePasswordResetEmail(email: string, token: string, baseUrl: string): any {
  const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

  return {
    to: email,
    subject: '练功计时器 - 重置密码',
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
            <h1>练功计时器</h1>
          </div>
          <div class="content">
            <h2>重置密码</h2>
            <p>您好！</p>
            <p>我们收到了您的密码重置请求。请点击下面的按钮重置您的密码：</p>
            <a href="${resetUrl}" class="button">重置密码</a>
            <p>如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
            <p style="word-break: break-all; color: #ef4444;">${resetUrl}</p>
            <p>此链接将在1小时后过期。</p>
            <p>如果您没有请求重置密码，请忽略此邮件。</p>
          </div>
          <div class="footer">
            <p>此邮件由练功计时器系统自动发送，请勿回复。</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
练功计时器 - 重置密码

您好！

我们收到了您的密码重置请求。请点击以下链接重置您的密码：

${resetUrl}

此链接将在1小时后过期。

如果您没有请求重置密码，请忽略此邮件。

此邮件由练功计时器系统自动发送，请勿回复。
    `
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

// --- Practice Time KV handlers ---
async function handlePracticeTimeKv(request: Request, kv: any, segments: string[], env: any): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  // 验证用户认证
  const user = await validateAuthToken(request, env);
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

  // DELETE /api/kv/practice-time/:date -> 删除指定日期的记录
  if (segments.length === 1 && method === 'DELETE') {
    const date = decodeURIComponent(segments[0]);
    const userKey = `user_${user.id}_${date}`;
    await kv.delete(userKey);
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed or invalid path' }, 405);
}

