// 邮件发送工具
export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// 发送邮件
export async function sendEmail(emailData: EmailData, env: any): Promise<boolean> {
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

// 生成注册验证邮件
export function generateVerificationEmail(email: string, token: string, baseUrl: string): EmailData {
  const verificationUrl = `${baseUrl}/verify?token=${token}&email=${encodeURIComponent(email)}`;
  
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

// 生成密码重置邮件
export function generatePasswordResetEmail(email: string, token: string, baseUrl: string): EmailData {
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
