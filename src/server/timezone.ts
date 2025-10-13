/**
 * 东八区（GMT+8）时区工具函数 - TypeScript版本
 * 确保整个应用使用统一的东八区时间
 */

// 东八区偏移量（8小时 = 8 * 60 = 480分钟）
const CHINA_TIMEZONE_OFFSET = 8 * 60;

/**
 * 获取东八区当前时间
 * @returns {Date} 东八区时间的Date对象
 */
export function getChinaTime(): Date {
  // 返回“当前瞬时”的中国本地时间表示。
  // 注意：Date 内部以 UTC 毫秒存储，这里不应人为平移绝对时间；
  // 仅在格式化时使用 'Asia/Shanghai' 时区。
  return new Date();
}

/**
 * 获取东八区今天的日期字符串 (YYYY-MM-DD)
 * @returns {string} 格式化的日期字符串
 */
export function getChinaToday(): string {
  // 使用 Intl 直接按东八区计算“今天”的日期字符串
  const fmt = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  // zh-CN 通常输出形如 2025/10/13，这里统一转为 2025-10-13
  const parts = fmt.formatToParts(new Date());
  const y = parts.find(p => p.type === 'year')?.value || '1970';
  const m = parts.find(p => p.type === 'month')?.value || '01';
  const d = parts.find(p => p.type === 'day')?.value || '01';
  return `${y}-${m}-${d}`;
}

/**
 * 将Date对象格式化为YYYY-MM-DD字符串
 * @param {Date} date - 要格式化的日期
 * @returns {string} 格式化的日期字符串
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 获取东八区当前时间的ISO字符串
 * @returns {string} ISO格式的时间字符串
 */
export function getChinaISOString(): string {
  // 存储统一使用标准 UTC ISO；展示时再按东八区格式化
  return new Date().toISOString();
}

/**
 * 将UTC时间字符串转换为东八区时间
 * @param {string} utcString - UTC时间字符串
 * @returns {Date} 东八区时间的Date对象
 */
export function utcToChinaTime(utcString: string): Date {
  // 返回相同“绝对时间”的 Date；格式化时指定 Asia/Shanghai 即可
  return new Date(utcString);
}

/**
 * 创建指定日期的东八区时间（日期部分使用东八区，时间为00:00:00）
 * @param {string} dateString - 日期字符串 (YYYY-MM-DD)
 * @returns {Date} 东八区时间的Date对象
 */
export function createChinaDate(dateString: string): Date {
  // 构造对应东八区 00:00:00 的绝对时间点（用于日期边界场景）
  const [year, month, day] = dateString.split('-').map(Number);
  // 该日期在东八区的 00:00:00 对应的 UTC 毫秒为：UTC = China - 8h
  const utcMs = Date.UTC(year, (month || 1) - 1, day || 1) - (CHINA_TIMEZONE_OFFSET * 60000);
  return new Date(utcMs);
}

/**
 * 获取东八区当前毫秒时间戳
 * @returns {number} 毫秒时间戳
 */
export function getChinaTimestamp(): number {
  // 统一以当前绝对时间的毫秒时间戳；日期边界请配合 Asia/Shanghai 计算
  return Date.now();
}

/**
 * 判断两个日期是否为同一天（东八区）
 * @param {Date|string} date1 - 第一个日期
 * @param {Date|string} date2 - 第二个日期
 * @returns {boolean} 是否为同一天
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === 'string' ? createChinaDate(date1) : date1;
  const d2 = typeof date2 === 'string' ? createChinaDate(date2) : date2;
  
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}
