/**
 * 东八区（GMT+8）时区工具函数
 * 确保整个应用使用统一的东八区时间
 */

// 东八区偏移量（8小时 = 8 * 60 = 480分钟）
const CHINA_TIMEZONE_OFFSET = 8 * 60;

/**
 * 获取东八区当前时间
 * @returns {Date} 东八区时间的Date对象
 */
export function getChinaTime() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (CHINA_TIMEZONE_OFFSET * 60000));
}

/**
 * 获取东八区今天的日期字符串 (YYYY-MM-DD)
 * @returns {string} 格式化的日期字符串
 */
export function getChinaToday() {
  const chinaTime = getChinaTime();
  return formatDateString(chinaTime);
}

/**
 * 将Date对象格式化为YYYY-MM-DD字符串
 * @param {Date} date - 要格式化的日期
 * @returns {string} 格式化的日期字符串
 */
export function formatDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 获取东八区当前时间的ISO字符串
 * @returns {string} ISO格式的时间字符串
 */
export function getChinaISOString() {
  return getChinaTime().toISOString();
}

/**
 * 将UTC时间字符串转换为东八区时间
 * @param {string} utcString - UTC时间字符串
 * @returns {Date} 东八区时间的Date对象
 */
export function utcToChinaTime(utcString) {
  const utcDate = new Date(utcString);
  const utc = utcDate.getTime();
  return new Date(utc + (CHINA_TIMEZONE_OFFSET * 60000));
}

/**
 * 创建指定日期的东八区时间（日期部分使用东八区，时间为00:00:00）
 * @param {string} dateString - 日期字符串 (YYYY-MM-DD)
 * @returns {Date} 东八区时间的Date对象
 */
export function createChinaDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const utc = utcDate.getTime();
  return new Date(utc + (CHINA_TIMEZONE_OFFSET * 60000));
}

/**
 * 格式化东八区日期为中文显示
 * @param {string|Date} date - 日期字符串或Date对象
 * @param {Object} options - 格式化选项
 * @returns {string} 格式化的中文日期
 */
export function formatChinaDate(date, options = {}) {
  const chinaDate = typeof date === 'string' ? createChinaDate(date) : date;
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Shanghai'
  };
  
  return chinaDate.toLocaleDateString('zh-CN', { ...defaultOptions, ...options });
}

/**
 * 判断两个日期是否为同一天（东八区）
 * @param {Date|string} date1 - 第一个日期
 * @param {Date|string} date2 - 第二个日期
 * @returns {boolean} 是否为同一天
 */
export function isSameDay(date1, date2) {
  const d1 = typeof date1 === 'string' ? createChinaDate(date1) : date1;
  const d2 = typeof date2 === 'string' ? createChinaDate(date2) : date2;
  
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

/**
 * 获取相对日期描述（今天、昨天等）
 * @param {string|Date} date - 要描述的日期
 * @returns {string} 相对日期描述
 */
export function getRelativeDateDescription(date) {
  const targetDate = typeof date === 'string' ? createChinaDate(date) : date;
  const today = getChinaTime();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  
  if (isSameDay(targetDate, today)) {
    return '今天';
  } else if (isSameDay(targetDate, yesterday)) {
    return '昨天';
  } else {
    return formatChinaDate(targetDate);
  }
}

/**
 * 获取星期几（中文）
 * @param {string|Date} date - 日期
 * @returns {string} 中文星期
 */
export function getChinaWeekday(date) {
  const chinaDate = typeof date === 'string' ? createChinaDate(date) : date;
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return weekdays[chinaDate.getDay()];
}

/**
 * 获取东八区当前毫秒时间戳
 * @returns {number} 毫秒时间戳
 */
export function getChinaTimestamp() {
  return getChinaTime().getTime();
}
