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
      en: 'Celestial Invitation'
    },
    subtitle: {
      zh: '探索东方智慧的精神宝库',
      en: 'Exploring the Spiritual Treasury of Eastern Wisdom'
    },
    description: {
      zh: '专注于灵魂出体、星体投射与静坐养神的实践',
      en: 'Focusing on out-of-body experience, astral projection, and stillness practice'
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
    astralRecords: {
      zh: '出神记录',
      en: 'Astral Records'
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
      },
      Articles: {
        zh: '博文',
        en: 'Articles'
      },
      Practice: {
        zh: '练习',
        en: 'Practice'
      }
    }
  },

  // 出神记录（记事本/文章）
  astral: {
    title: {
      zh: '出神记录',
      en: 'Astral Records'
    },
    notebooks: {
      header: {
        zh: '记事本',
        en: 'Notebooks'
      },
      new: {
        zh: '新建记事本',
        en: 'New Notebook'
      },
      toggle: {
        zh: '折叠/展开',
        en: 'Collapse/Expand'
      },
      rename: {
        zh: '重命名记事本',
        en: 'Rename Notebook'
      },
      deleteConfirm: {
        zh: '确定删除该记事本及其文章？',
        en: 'Delete this notebook and all its posts?'
      }
    },
    posts: {
      header: {
        zh: '文章',
        en: 'Posts'
      },
      count: {
        zh: '{count} 篇',
        en: '{count} posts'
      },
      new: {
        zh: '新建文章',
        en: 'New Post'
      },
      rename: {
        zh: '重命名文章',
        en: 'Rename Post'
      },
      deleteConfirm: {
        zh: '确定删除该文章？',
        en: 'Delete this post?'
      },
      contentHeader: {
        zh: '文章内容',
        en: 'Post Content'
      }
    },
    placeholders: {
      name: {
        zh: '名称',
        en: 'Name'
      },
      title: {
        zh: '标题',
        en: 'Title'
      },
      content: {
        zh: '内容 (Markdown)',
        en: 'Content (Markdown)'
      }
    },
    messages: {
      selectNotebookFirst: {
        zh: '请先选择记事本',
        en: 'Please select a notebook first'
      }
    }
  },

  // 首页内容
  home: {
    badge: {
      zh: '意识探索 · 出体实践',
      en: 'Consciousness · Out-of-Body Practice'
    },
    intro: {
      zh: '这里收录了灵魂出体与星体投射的完整译著，从原理、准备到逐日练习；并配有炼功计时与出神记录工具，帮助你把阅读变成能坚持下去的日常练习。',
      en: 'A small library of complete works on out-of-body experience and astral projection — from the underlying principles to day-by-day practice — paired with a practice timer and a journal, so reading turns into a habit you can keep.'
    },
    stats: {
      articles: {
        zh: '{count} 篇文章',
        en: '{count} articles'
      },
      reading: {
        zh: '约 {count} 分钟阅读',
        en: '~{count} min of reading'
      },
      readingHours: {
        zh: '约 {count} 小时阅读',
        en: '~{count} hours of reading'
      },
      tools: {
        zh: '{count} 个练习工具',
        en: '{count} practice tools'
      }
    },
    sections: {
      articles: {
        title: {
          zh: '📖 文章',
          en: '📖 Articles'
        },
        description: {
          zh: '出体与星体投射经典著作的全文翻译，按由浅入深的顺序排列。',
          en: 'Full-length works on leaving the body, ordered from the most approachable to the most demanding.'
        }
      },
      practice: {
        title: {
          zh: '⚡ 练习工具',
          en: '⚡ Practice Tools'
        },
        description: {
          zh: '记录每一次静坐与出体，让练习的进展看得见。',
          en: 'Log every sitting and every exit, so your progress stops being a guess.'
        }
      }
    },
    tools: {
      'practice/timer': {
        zh: '静坐计时与炼功日志，记录每日练习的时长与状态。',
        en: 'A meditation timer and practice log for your daily sittings.'
      },
      'astral/records': {
        zh: '按记事本分类整理出体与梦境记录，随时回顾细节。',
        en: 'Keep out-of-body and dream records in notebooks you can revisit.'
      }
    },
    readMore: {
      zh: '阅读全文',
      en: 'Read article'
    },
    readingTime: {
      zh: '{count} 分钟',
      en: '{count} min'
    },
    readingTimeHours: {
      zh: '{count} 小时',
      en: '{count} h'
    },
    empty: {
      zh: '暂无文章',
      en: 'No articles yet'
    },
    footer: {
      zh: '从一次安静的闭目开始，走向更广阔的实相……',
      en: 'It starts with closing your eyes — and opens onto a much larger reality...'
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
    },
    forgotPassword: {
      zh: '忘记密码？',
      en: 'Forgot Password?'
    },
    forgotPasswordTitle: {
      zh: '忘记密码',
      en: 'Forgot Password'
    },
    sendRegistrationEmail: {
      zh: '发送注册邮件',
      en: 'Send Registration Email'
    },
    alreadyHaveAccount: {
      zh: '已有账户？去登录',
      en: 'Already have an account? Login'
    },
    backToLogin: {
      zh: '返回登录',
      en: 'Back to Login'
    },
    loggingIn: {
      zh: '登录中...',
      en: 'Logging in...'
    },
    sendResetEmail: {
      zh: '发送重置邮件',
      en: 'Send Reset Email'
    },
    resetEmailSent: {
      zh: '重置邮件已发送，请检查您的邮箱',
      en: 'Reset email sent, please check your inbox'
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
    },
    // 图表相关
    chart: {
      date: {
        zh: '日期',
        en: 'Date'
      },
      durationHours: {
        zh: '时长 (小时)',
        en: 'Duration (Hours)'
      },
      practiceTimeLabel: {
        zh: '炼功时长 (小时)',
        en: 'Practice Duration (Hours)'
      },
      averageTimeLabel: {
        zh: '平均时长',
        en: 'Average Duration'
      },
      tooltipPracticeTime: {
        zh: '炼功时长',
        en: 'Practice Duration'
      },
      tooltipAverageTime: {
        zh: '平均时长',
        en: 'Average Duration'
      },
      hoursUnit: {
        zh: '小时',
        en: 'hours'
      },
      minutesUnit: {
        zh: '分钟',
        en: 'minutes'
      },
      hoursSuffix: {
        zh: '小时',
        en: 'h'
      }
    },
    // 表单验证消息
    validation: {
      selectDate: {
        zh: '请选择日期',
        en: 'Please select a date'
      },
      enterDuration: {
        zh: '请输入炼功时长',
        en: 'Please enter practice duration'
      }
    },
    // 编辑器相关
    editor: {
      markdownHelp: {
        zh: '支持Markdown格式：**粗体** *斜体* ## 标题 - 列表 > 引用 `代码`',
        en: 'Markdown supported: **bold** *italic* ## heading - list > quote `code`'
      },
      preview: {
        zh: '预览',
        en: 'Preview'
      },
      previewPlaceholder: {
        zh: '在上方输入内容后，这里会显示预览',
        en: 'Preview will appear here after entering content above'
      },
      toolbar: {
        bold: {
          zh: '粗体',
          en: 'Bold'
        },
        italic: {
          zh: '斜体',
          en: 'Italic'
        },
        heading: {
          zh: '标题',
          en: 'Heading'
        },
        list: {
          zh: '列表',
          en: 'List'
        },
        quote: {
          zh: '引用',
          en: 'Quote'
        },
        code: {
          zh: '代码',
          en: 'Code'
        }
      }
    },
    // 日志操作
    actions: {
      edit: {
        zh: '编辑',
        en: 'Edit'
      },
      delete: {
        zh: '删除',
        en: 'Delete'
      },
      confirmDelete: {
        zh: '确定要删除这条日志吗？',
        en: 'Are you sure you want to delete this log?'
      },
      editLogTitle: {
        zh: '编辑炼功日志',
        en: 'Edit Practice Log'
      }
    },
    // 消息提示
    messages: {
      loginRequired: {
        zh: '请填写完整的登录信息',
        en: 'Please fill in complete login information'
      },
      invalidEmail: {
        zh: '请输入有效的邮箱地址',
        en: 'Please enter a valid email address'
      },
      loginFailed: {
        zh: '登录失败',
        en: 'Login failed'
      },
      loginSuccess: {
        zh: '登录成功！',
        en: 'Login successful!'
      },
      registrationEmailSent: {
        zh: '注册邮件已发送，请检查您的邮箱并点击验证链接',
        en: 'Registration email sent, please check your inbox and click the verification link'
      },
      registerFailed: {
        zh: '注册失败',
        en: 'Registration failed'
      },
      enterEmail: {
        zh: '请输入邮箱地址',
        en: 'Please enter email address'
      },
      saveFailed: {
        zh: '保存失败',
        en: 'Save failed'
      },
      deleteSuccess: {
        zh: '日志删除成功！',
        en: 'Log deleted successfully!'
      },
      deleteFailed: {
        zh: '删除失败',
        en: 'Delete failed'
      }
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
