// 国际化管理模块
// 处理语言检测、存储和切换逻辑

// 支持的语言
const SUPPORTED_LANGUAGES = {
  'zh': {
    code: 'zh',
    name: '中文',
    nativeName: '中文',
    htmlLang: 'zh-CN'
  },
  'en': {
    code: 'en', 
    name: 'English',
    nativeName: 'English',
    htmlLang: 'en'
  }
};

// 默认语言
const DEFAULT_LANGUAGE = 'zh';

// Cookie 和 localStorage 键名
const LANGUAGE_STORAGE_KEY = 'aeons_language_preference';
const LANGUAGE_COOKIE_NAME = 'aeons_lang';

// Cookie 过期时间（7天）
const LANGUAGE_COOKIE_EXPIRY_DAYS = 7;

/**
 * 从浏览器获取首选语言
 */
function getBrowserLanguage() {
  // 获取浏览器语言设置
  const browserLangs = navigator.languages || [navigator.language || navigator.userLanguage];
  
  for (const lang of browserLangs) {
    // 提取主语言代码（如 'zh-CN' -> 'zh'）
    const primaryLang = lang.split('-')[0].toLowerCase();
    
    // 检查是否支持该语言
    if (SUPPORTED_LANGUAGES[primaryLang]) {
      return primaryLang;
    }
  }
  
  return DEFAULT_LANGUAGE;
}

/**
 * 从存储中获取用户语言偏好
 */
function getStoredLanguage() {
  // 优先检查 Cookie（服务端可访问）
  const cookieLang = getCookie(LANGUAGE_COOKIE_NAME);
  if (cookieLang && SUPPORTED_LANGUAGES[cookieLang]) {
    return cookieLang;
  }
  
  // 回退到 localStorage
  try {
    const storedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLang && SUPPORTED_LANGUAGES[storedLang]) {
      return storedLang;
    }
  } catch (e) {
    console.warn('无法访问 localStorage:', e);
  }
  
  return null;
}

/**
 * 保存用户语言偏好
 */
function saveLanguagePreference(language) {
  if (!SUPPORTED_LANGUAGES[language]) {
    console.warn('不支持的语言:', language);
    return;
  }
  
  // 保存到 Cookie（7天过期）
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + LANGUAGE_COOKIE_EXPIRY_DAYS);
  
  document.cookie = `${LANGUAGE_COOKIE_NAME}=${language}; expires=${expiryDate.toUTCString()}; path=/; secure; samesite=strict`;
  
  // 同时保存到 localStorage 作为备份
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (e) {
    console.warn('无法保存到 localStorage:', e);
  }
}

/**
 * 获取当前语言
 */
function getCurrentLanguage() {
  // 1. 检查存储的用户偏好
  const storedLang = getStoredLanguage();
  if (storedLang) {
    return storedLang;
  }
  
  // 2. 使用浏览器语言
  const browserLang = getBrowserLanguage();
  
  // 3. 保存浏览器检测到的语言作为初始偏好
  saveLanguagePreference(browserLang);
  
  return browserLang;
}

/**
 * 切换语言
 */
function switchLanguage(newLanguage) {
  if (!SUPPORTED_LANGUAGES[newLanguage]) {
    console.error('不支持的语言:', newLanguage);
    return;
  }
  
  const currentLang = getCurrentLanguage();
  if (currentLang === newLanguage) {
    return; // 语言相同，无需切换
  }
  
  // 保存新的语言偏好
  saveLanguagePreference(newLanguage);
  
  // 更新 HTML lang 属性
  document.documentElement.lang = SUPPORTED_LANGUAGES[newLanguage].htmlLang;
  
  // 触发语言变更事件
  const languageChangeEvent = new CustomEvent('languagechange', {
    detail: {
      oldLanguage: currentLang,
      newLanguage: newLanguage,
      languageData: SUPPORTED_LANGUAGES[newLanguage]
    }
  });
  
  window.dispatchEvent(languageChangeEvent);
  
  // 重新加载页面以应用新语言
  window.location.reload();
}

/**
 * 获取安全的 Cookie 值
 */
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

/**
 * 获取语言信息
 */
function getLanguageInfo(langCode = null) {
  const lang = langCode || getCurrentLanguage();
  return SUPPORTED_LANGUAGES[lang] || SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];
}

/**
 * 检查是否为中文环境
 */
function isChinese() {
  return getCurrentLanguage() === 'zh';
}

/**
 * 检查是否为英文环境
 */
function isEnglish() {
  return getCurrentLanguage() === 'en';
}

/**
 * 初始化国际化系统
 */
function initI18n() {
  const currentLang = getCurrentLanguage();
  const langInfo = getLanguageInfo(currentLang);
  
  // 设置 HTML lang 属性
  document.documentElement.lang = langInfo.htmlLang;
  
  // 立即更新页面标题，避免闪烁
  updatePageTitleImmediate(currentLang);
  
  console.log(`🌐 语言初始化完成: ${langInfo.name} (${currentLang})`);
  
  // 触发初始化完成事件
  const initEvent = new CustomEvent('i18ninit', {
    detail: {
      language: currentLang,
      languageData: langInfo
    }
  });
  
  window.dispatchEvent(initEvent);
}

/**
 * 立即更新页面标题（在i18n-texts.js加载前）
 */
function updatePageTitleImmediate(currentLang) {
  const titles = {
    zh: '仙界邀请函',
    en: 'Celestial Invitation'
  };
  
  const title = titles[currentLang] || titles.zh;
  document.title = title;
  
  // 同时更新AppBar标题
  const appbarTitleElement = document.getElementById('appbar-title');
  if (appbarTitleElement) {
    appbarTitleElement.textContent = title;
  }
}

// 导出到全局作用域
window.I18n = {
  // 核心函数
  getCurrentLanguage,
  switchLanguage,
  getLanguageInfo,
  
  // 便捷函数
  isChinese,
  isEnglish,
  
  // 常量
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  
  // 初始化
  init: initI18n
};

// 页面加载完成后自动初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initI18n);
} else {
  initI18n();
}

export {
  getCurrentLanguage,
  switchLanguage,
  getLanguageInfo,
  isChinese,
  isEnglish,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  initI18n
};
