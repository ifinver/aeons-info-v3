// 多语言文本资源
// 包含所有界面文本的中英文版本

const I18N_TEXTS = {
  // 通用文本
  common: {
    loading: {
      zh: '加载中...',
      en: 'Loading...'
    },
    error: {
      zh: '错误',
      en: 'Error'
    },
    success: {
      zh: '成功',
      en: 'Success'
    },
    confirm: {
      zh: '确认',
      en: 'Confirm'
    },
    cancel: {
      zh: '取消',
      en: 'Cancel'
    },
    save: {
      zh: '保存',
      en: 'Save'
    },
    delete: {
      zh: '删除',
      en: 'Delete'
    },
    edit: {
      zh: '编辑',
      en: 'Edit'
    },
    close: {
      zh: '关闭',
      en: 'Close'
    },
    back: {
      zh: '返回',
      en: 'Back'
    },
    next: {
      zh: '下一步',
      en: 'Next'
    },
    previous: {
      zh: '上一步',
      en: 'Previous'
    },
    submit: {
      zh: '提交',
      en: 'Submit'
    }
  },

  // 站点信息
  site: {
    title: {
      zh: '仙界邀请函',
      en: 'Invitation to Immortal Realm'
    },
    subtitle: {
      zh: '探索东方智慧的精神宝库',
      en: 'Exploring the Spiritual Treasury of Eastern Wisdom'
    },
    description: {
      zh: '专注于中华传统丹道修炼与意识探索',
      en: 'Focusing on Traditional Chinese Alchemy and Consciousness Exploration'
    }
  },

  // 导航菜单
  nav: {
    home: {
      zh: '首页',
      en: 'Home'
    },
    articles: {
      zh: '博文',
      en: 'Articles'
    },
    practice: {
      zh: '练习',
      en: 'Practice'
    },
    practiceLog: {
      zh: '炼功日志',
      en: 'Practice Log'
    },
    language: {
      zh: '语言',
      en: 'Language'
    },
    switchToEnglish: {
      zh: 'English',
      en: 'English'
    },
    switchToChinese: {
      zh: '中文',
      en: '中文'
    },
    // 导航组名
    groups: {
      博文: {
        zh: '博文',
        en: 'Articles'
      },
      练习: {
        zh: '练习', 
        en: 'Practice'
      }
    }
  },

  // 首页内容
  home: {
    intro: {
      zh: '这里收录了张三丰、老子等圣贤的丹道秘诀，以及现代灵魂出体与星体投射的实践指南，为追求内在觉醒的修行者提供珍贵的修炼资源。',
      en: 'Here we collect the alchemical secrets of sages like Zhang Sanfeng and Laozi, along with modern guides for out-of-body experiences and astral projection, providing valuable cultivation resources for practitioners seeking inner awakening.'
    },
    sections: {
      traditionalAlchemy: {
        title: {
          zh: '🏔️ 传统丹道',
          en: '🏔️ Traditional Alchemy'
        },
        description: {
          zh: '中华传统丹道修炼的核心秘诀，包含张三丰内丹36诀和老子丹道21诀，传承千年的修真智慧。',
          en: 'Core secrets of traditional Chinese alchemical cultivation, including Zhang Sanfeng\'s 36 Internal Alchemy Instructions and Laozi\'s 21 Alchemical Instructions, wisdom passed down through millennia.'
        }
      },
      consciousnessExploration: {
        title: {
          zh: '✨ 意识探索',
          en: '✨ Consciousness Exploration'
        },
        description: {
          zh: '现代意识探索与古典智慧的结合，包括灵魂出体技术和星体投射的理论与实践。',
          en: 'The fusion of modern consciousness exploration with classical wisdom, including theories and practices of out-of-body experiences and astral projection.'
        }
      },
      practiceTools: {
        title: {
          zh: '⚡ 实践工具',
          en: '⚡ Practice Tools'
        },
        description: {
          zh: '实用的修炼辅助工具，帮助您更好地进行灵性实践和意识训练。',
          en: 'Practical cultivation tools to help you better engage in spiritual practice and consciousness training.'
        }
      }
    },
    footer: {
      zh: '从传统丹道到现代意识探索，开启您的内在觉醒之路...',
      en: 'From traditional alchemy to modern consciousness exploration, begin your journey of inner awakening...'
    }
  },

  // 用户认证
  auth: {
    login: {
      zh: '登录',
      en: 'Login'
    },
    logout: {
      zh: '登出',
      en: 'Logout'
    },
    register: {
      zh: '注册',
      en: 'Register'
    },
    email: {
      zh: '邮箱',
      en: 'Email'
    },
    password: {
      zh: '密码',
      en: 'Password'
    },
    emailPlaceholder: {
      zh: '请输入您的邮箱',
      en: 'Please enter your email'
    },
    emailVerification: {
      zh: '邮箱验证',
      en: 'Email Verification'
    },
    registrationSuccess: {
      zh: '注册邮件已发送，请检查您的邮箱并点击验证链接',
      en: 'Registration email sent. Please check your inbox and click the verification link'
    },
    loginSuccess: {
      zh: '登录成功',
      en: 'Login successful'
    },
    logoutSuccess: {
      zh: '已成功登出',
      en: 'Successfully logged out'
    },
    invalidEmail: {
      zh: '请提供有效的邮箱地址',
      en: 'Please provide a valid email address'
    },
    loginRequired: {
      zh: '请先登录以使用此功能',
      en: 'Please login to use this feature'
    }
  },

  // 炼功日志
  practiceLog: {
    title: {
      zh: '炼功日志',
      en: 'Practice Log'
    },
    todaySession: {
      zh: '今日修炼',
      en: 'Today\'s Session'
    },
    startPractice: {
      zh: '开始炼功',
      en: 'Start Practice'
    },
    stopPractice: {
      zh: '结束炼功',
      en: 'Stop Practice'
    },
    pausePractice: {
      zh: '暂停',
      en: 'Pause'
    },
    resumePractice: {
      zh: '继续',
      en: 'Resume'
    },
    practiceTime: {
      zh: '炼功时长',
      en: 'Practice Duration'
    },
    totalTime: {
      zh: '累计时长',
      en: 'Total Time'
    },
    sessionCount: {
      zh: '练习次数',
      en: 'Session Count'
    },
    averageTime: {
      zh: '平均时长',
      en: 'Average Duration'
    },
    practiceNote: {
      zh: '炼功心得',
      en: 'Practice Notes'
    },
    notePlaceholder: {
      zh: '记录今天的炼功体验、感悟或遇到的问题...',
      en: 'Record today\'s practice experience, insights, or any issues encountered...'
    },
    saveNote: {
      zh: '保存心得',
      en: 'Save Notes'
    },
    practiceHistory: {
      zh: '炼功历史',
      en: 'Practice History'
    },
    practiceStats: {
      zh: '炼功统计',
      en: 'Practice Statistics'
    },
    thisWeek: {
      zh: '本周',
      en: 'This Week'
    },
    thisMonth: {
      zh: '本月',
      en: 'This Month'
    },
    last30Days: {
      zh: '近30天',
      en: 'Last 30 Days'
    },
    minutes: {
      zh: '分钟',
      en: 'minutes'
    },
    hours: {
      zh: '小时',
      en: 'hours'
    },
    days: {
      zh: '天',
      en: 'days'
    },
    today: {
      zh: '今天',
      en: 'Today'
    },
    yesterday: {
      zh: '昨天',
      en: 'Yesterday'
    },
    weekdays: {
      zh: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
      en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    },
    months: {
      zh: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
      en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    },
    noDataYet: {
      zh: '暂无数据',
      en: 'No data yet'
    },
    practiceStreak: {
      zh: '连续炼功',
      en: 'Practice Streak'
    },
    daysStreak: {
      zh: '天',
      en: 'days'
    }
  },

  // 错误消息
  errors: {
    loadFailed: {
      zh: '内容加载失败',
      en: 'Content loading failed'
    },
    networkError: {
      zh: '网络连接错误',
      en: 'Network connection error'
    },
    serverError: {
      zh: '服务器错误',
      en: 'Server error'
    },
    unauthorized: {
      zh: '未授权访问',
      en: 'Unauthorized access'
    },
    forbidden: {
      zh: '访问被禁止',
      en: 'Access forbidden'
    },
    notFound: {
      zh: '页面未找到',
      en: 'Page not found'
    },
    sessionExpired: {
      zh: '会话已过期，请重新登录',
      en: 'Session expired, please login again'
    },
    tryAgain: {
      zh: '重试',
      en: 'Try Again'
    },
    reload: {
      zh: '重新加载',
      en: 'Reload'
    }
  },

  // 时间格式
  time: {
    justNow: {
      zh: '刚刚',
      en: 'Just now'
    },
    minutesAgo: {
      zh: '分钟前',
      en: 'minutes ago'
    },
    hoursAgo: {
      zh: '小时前',
      en: 'hours ago'
    },
    daysAgo: {
      zh: '天前',
      en: 'days ago'
    },
    weeksAgo: {
      zh: '周前',
      en: 'weeks ago'
    },
    monthsAgo: {
      zh: '月前',
      en: 'months ago'
    },
    yearsAgo: {
      zh: '年前',
      en: 'years ago'
    }
  }
};

/**
 * 获取指定键的本地化文本
 * @param {string} key - 文本键，支持点号分隔的路径，如 'common.loading'
 * @param {string} lang - 语言代码，如果不提供则使用当前语言
 * @param {Object} params - 文本参数，用于替换占位符
 * @returns {string} 本地化的文本
 */
function getText(key, lang = null, params = {}) {
  // 获取当前语言
  const currentLang = lang || (window.I18n ? window.I18n.getCurrentLanguage() : 'zh');
  
  // 解析键路径
  const keys = key.split('.');
  let text = I18N_TEXTS;
  
  // 遍历路径获取文本对象
  for (const k of keys) {
    if (text && typeof text === 'object' && k in text) {
      text = text[k];
    } else {
      console.warn(`未找到文本键: ${key}`);
      return key; // 返回键名作为后备
    }
  }
  
  // 获取指定语言的文本
  if (text && typeof text === 'object' && currentLang in text) {
    let result = text[currentLang];
    
    // 替换参数占位符
    if (typeof result === 'string' && Object.keys(params).length > 0) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      }
    }
    
    return result;
  }
  
  console.warn(`未找到语言文本: ${key} (${currentLang})`);
  return key; // 返回键名作为后备
}

/**
 * 获取中文文本（便捷函数）
 */
function getTextZh(key, params = {}) {
  return getText(key, 'zh', params);
}

/**
 * 获取英文文本（便捷函数）
 */
function getTextEn(key, params = {}) {
  return getText(key, 'en', params);
}

// 导出到全局作用域
window.I18nTexts = {
  getText,
  getTextZh,
  getTextEn,
  I18N_TEXTS
};

export {
  getText,
  getTextZh,
  getTextEn,
  I18N_TEXTS
};
