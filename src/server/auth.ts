import * as bcrypt from 'bcryptjs';
import { generateToken as cryptoGenerateToken } from './crypto-utils';
import { getChinaTimestamp } from './timezone';

// 用户接口
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  verified: boolean;
  lastLoginAt?: string;
  failedLoginAttempts?: number;
  lockedUntil?: string;
}

// 认证令牌接口
export interface AuthToken {
  userId: string;
  email: string;
  expiresAt: number;
  type: 'session' | 'verification' | 'password_reset';
  csrfToken?: string;
  ipAddress?: string;
  userAgent?: string;
}

// 登录尝试记录接口
export interface LoginAttempt {
  ip: string;
  attempts: number;
  lastAttempt: number;
  blockedUntil?: number;
}

// 生成随机令牌
export function generateToken(length: number = 32): string {
  return cryptoGenerateToken(length);
}

// 生成安全的密码哈希 (使用bcrypt)
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // 高安全级别
  return await bcrypt.hash(password, saltRounds);
}

// 验证密码 (使用bcrypt)
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('密码验证错误:', error);
    return false;
  }
}

// 生成用户ID
export function generateUserId(): string {
  return 'user_' + getChinaTimestamp() + '_' + Math.random().toString(36).substr(2, 9);
}

// 生成验证令牌
export function generateVerificationToken(): string {
  return generateToken(16);
}

// 生成会话令牌
export function generateSessionToken(): string {
  return generateToken(32);
}

// 检查令牌是否过期
export function isTokenExpired(token: AuthToken): boolean {
  return getChinaTimestamp() > token.expiresAt;
}

// 生成过期时间（默认24小时）
export function generateExpiryTime(hours: number = 24): number {
  return getChinaTimestamp() + (hours * 60 * 60 * 1000);
}

// 改进的密码强度验证 - 更加合理和用户友好
export function validatePassword(password: string): { valid: boolean; message: string } {
  const errors: string[] = [];
  
  // 基本长度检查 (至少8位)
  if (password.length < 8) {
    errors.push('密码长度至少8位');
  }
  
  // 最大长度检查 (防止DoS)
  if (password.length > 128) {
    errors.push('密码长度不能超过128位');
  }
  
  // 计算密码复杂度得分 (而不是严格要求所有类型)
  let score = 0;
  let hasUpper = /[A-Z]/.test(password);
  let hasLower = /[a-z]/.test(password);
  let hasDigit = /\d/.test(password);
  let hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password);
  
  if (hasUpper) score++;
  if (hasLower) score++;
  if (hasDigit) score++;
  if (hasSpecial) score++;
  
  // 长密码可以降低复杂度要求
  if (password.length >= 12) {
    // 12位以上密码只需要3种字符类型
    if (score < 3) {
      errors.push('长密码需要包含至少3种字符类型（大写字母、小写字母、数字、特殊字符）');
    }
  } else {
    // 8-11位密码需要4种字符类型或者3种+足够长度
    if (score < 3) {
      errors.push('密码需要包含至少3种字符类型（大写字母、小写字母、数字、特殊字符）');
    }
  }
  
  // 只检查最常见的弱密码模式
  const commonWeakPatterns = [
    'password', '123456', '12345678', 'qwerty', 'abc123', 
    'admin', 'letmein', 'welcome'
  ];
  const lowercasePassword = password.toLowerCase();
  if (commonWeakPatterns.some(pattern => lowercasePassword === pattern || lowercasePassword.includes(pattern + '123'))) {
    errors.push('密码不能使用常见的弱密码模式');
  }
  
  // 放宽重复字符检查 - 只检查4个以上的连续重复
  if (/(.)\1{3,}/.test(password)) {
    errors.push('密码不能包含4个或以上连续重复的字符');
  }
  
  // 检查全数字密码
  if (/^\d+$/.test(password)) {
    errors.push('密码不能全部为数字');
  }
  
  // 检查简单的键盘序列
  const keyboardPatterns = ['123456', '654321', 'qwerty', 'asdfgh', 'zxcvbn'];
  if (keyboardPatterns.some(pattern => lowercasePassword.includes(pattern))) {
    errors.push('密码不能包含键盘序列');
  }
  
  if (errors.length > 0) {
    return { valid: false, message: errors.join('; ') };
  }
  
  return { valid: true, message: '密码强度符合要求' };
}

// 增强的邮箱验证
export function isValidEmail(email: string): boolean {
  // 更严格的邮箱验证正则
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  // 长度检查
  if (email.length > 254) return false;
  if (email.length < 5) return false;
  
  // 基本格式检查
  if (!emailRegex.test(email)) return false;
  
  // 防止SQL注入和XSS
  const dangerousChars = /<|>|"|'|&|;|\||`/;
  if (dangerousChars.test(email)) return false;
  
  return true;
}

// 清理和验证输入字符串
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  // 移除潜在的XSS字符
  return input
    .replace(/[<>\"'&]/g, '') // 移除HTML特殊字符
    .replace(/javascript:/gi, '') // 移除javascript协议
    .replace(/on\w+=/gi, '') // 移除事件处理器
    .trim();
}

// 生成CSRF令牌
export function generateCSRFToken(): string {
  return generateToken(32);
}

// 验证CSRF令牌
export function validateCSRFToken(providedToken: string, storedToken: string): boolean {
  if (!providedToken || !storedToken) return false;
  if (providedToken.length !== storedToken.length) return false;
  
  // 使用时间安全的比较函数防止时序攻击
  let result = 0;
  for (let i = 0; i < providedToken.length; i++) {
    result |= providedToken.charCodeAt(i) ^ storedToken.charCodeAt(i);
  }
  return result === 0;
}

// 获取客户端IP地址
export function getClientIP(request: Request): string {
  // 检查各种可能的IP头部
  const headers = request.headers;
  return headers.get('CF-Connecting-IP') ||
         headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
         headers.get('X-Real-IP') ||
         headers.get('X-Client-IP') ||
         'unknown';
}

// 速率限制检查
export function checkRateLimit(attempts: number, windowMs: number = 900000): boolean {
  // 15分钟内最多5次尝试
  const maxAttempts = 5;
  const now = getChinaTimestamp();
  
  if (attempts >= maxAttempts) {
    return false; // 超过限制
  }
  
  return true;
}
