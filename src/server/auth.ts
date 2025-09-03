import { createHash, randomBytes } from 'crypto';

// 用户接口
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  verified: boolean;
}

// 认证令牌接口
export interface AuthToken {
  userId: string;
  email: string;
  expiresAt: number;
  type: 'session' | 'verification' | 'password_reset';
}

// 生成随机令牌
export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

// 生成密码哈希
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).toString('hex');
}

// 验证密码
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// 生成用户ID
export function generateUserId(): string {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
  return Date.now() > token.expiresAt;
}

// 生成过期时间（默认24小时）
export function generateExpiryTime(hours: number = 24): number {
  return Date.now() + (hours * 60 * 60 * 1000);
}

// 验证邮箱格式
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 验证密码强度
export function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 6) {
    return { valid: false, message: '密码长度至少6位' };
  }
  return { valid: true, message: '密码有效' };
}
