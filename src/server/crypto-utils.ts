/**
 * Crypto utilities for Cloudflare Workers
 * 使用Web Crypto API替代Node.js crypto模块
 */

// Cloudflare Workers中的Web Crypto API
interface WebCrypto {
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
  randomUUID(): string;
  subtle: SubtleCrypto;
}

// 确保crypto在全局范围内可用
declare const crypto: WebCrypto;

/**
 * 生成加密安全的随机字节
 * @param size 字节数量
 * @returns Uint8Array 随机字节数组
 */
export function randomBytes(size: number): Uint8Array {
  if (size <= 0) {
    throw new Error('Size must be positive');
  }
  
  const array = new Uint8Array(size);
  crypto.getRandomValues(array);
  return array;
}

/**
 * 将字节数组转换为十六进制字符串
 * @param bytes 字节数组
 * @returns 十六进制字符串
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 生成随机令牌
 * @param length 令牌长度（字节）
 * @returns 十六进制字符串
 */
export function generateToken(length: number = 32): string {
  const bytes = randomBytes(length);
  return bytesToHex(bytes);
}

/**
 * 生成UUID v4
 * @returns UUID字符串
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * 检查当前环境是否支持Web Crypto API
 * @returns boolean
 */
export function isCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && 
         typeof crypto.getRandomValues === 'function' &&
         typeof crypto.randomUUID === 'function';
}
