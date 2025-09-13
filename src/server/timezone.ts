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
  const now = new Date();
  // 获取当前时区偏移量（分钟）
  const localOffset = now.getTimezoneOffset();
  // 东八区偏移量是 -480 分钟（UTC+8）
  const chinaOffset = -480;
  // 计算到东八区的实际偏移量
  const offsetDiff = (chinaOffset - localOffset) * 60 * 1000;
  return new Date(now.getTime() + offsetDiff);
}

/**
 * 获取东八区今天的日期字符串 (YYYY-MM-DD)
 * @returns {string} 格式化的日期字符串
 */
export function getChinaToday(): string {
  const chinaTime = getChinaTime();
  return formatDateString(chinaTime);
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
  return getChinaTime().toISOString();
}

/**
 * 将UTC时间字符串转换为东八区时间
 * @param {string} utcString - UTC时间字符串
 * @returns {Date} 东八区时间的Date对象
 */
export function utcToChinaTime(utcString: string): Date {
  const utcDate = new Date(utcString);
  const utc = utcDate.getTime();
  return new Date(utc + (CHINA_TIMEZONE_OFFSET * 60000));
}

/**
 * 创建指定日期的东八区时间（日期部分使用东八区，时间为00:00:00）
 * @param {string} dateString - 日期字符串 (YYYY-MM-DD)
 * @returns {Date} 东八区时间的Date对象
 */
export function createChinaDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const utc = utcDate.getTime();
  return new Date(utc + (CHINA_TIMEZONE_OFFSET * 60000));
}

/**
 * 获取东八区当前毫秒时间戳
 * @returns {number} 毫秒时间戳
 */
export function getChinaTimestamp(): number {
  return getChinaTime().getTime();
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
