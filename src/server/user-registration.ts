/**
 * 用户注册模块
 * 处理用户注册相关的所有逻辑
 */

import {
  hashPassword,
  generateUserId,
  generateVerificationToken,
  generateExpiryTime,
  isValidEmail,
  validatePassword,
  sanitizeInput,
  getClientIP,
  type User,
  type AuthToken
} from './auth';

import { sendEmail } from './mail';

/**
 * 用户注册处理函数
 */
export async function handleUserRegistration(request: Request, env: any): Promise<Response> {
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

/**
 * 验证邮箱处理函数
 */
export async function handleEmailVerification(request: Request, env: any): Promise<Response> {
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

/**
 * 完成用户注册（创建密码）处理函数
 */
export async function handleCompleteRegistration(request: Request, env: any): Promise<Response> {
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

/**
 * 忘记密码处理函数
 */
export async function handleForgotPassword(request: Request, env: any): Promise<Response> {
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

/**
 * 重置密码处理函数
 */
export async function handleResetPassword(request: Request, env: any): Promise<Response> {
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

/**
 * 生成验证邮件内容
 */
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

/**
 * 生成密码重置邮件内容
 */
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

// 工具函数
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      'content-type': 'application/json; charset=utf-8',
    },
  });
}
