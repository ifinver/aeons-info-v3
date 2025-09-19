import { loadHomePage } from './home.js';
import { loadPracticeTimerPage, cleanupPracticeTimerPage } from './practice-timer.js';
import { loadEmailVerificationPage } from './email-verification.js';

// 动态加载清单文件
let manifest = [];
let manifestLoaded = false;

async function loadManifest() {
  if (manifestLoaded) return manifest;
  
  try {
    const resp = await fetch('/content/manifest.json');
    if (!resp.ok) throw new Error(resp.statusText);
    const data = await resp.json();
    
    // 转换为原来的格式，并添加特殊页面
    const currentLang = window.I18n ? window.I18n.getCurrentLanguage() : 'zh';
    const practiceLogTitle = window.I18nTexts ? window.I18nTexts.getText('practiceLog.title') : (currentLang === 'en' ? 'Practice Log' : '炼功日志');
    const practiceGroupName = window.I18nTexts ? window.I18nTexts.getText('nav.practice') : (currentLang === 'en' ? 'Practice' : '练习');
    
    manifest = [
      ...data.items.map(item => ({
        title: item.title,
        path: item.path,
        group: item.group,
        subgroup: item.subgroup,
        hidden: item.hidden,
        contentPath: item.contentPath // 新增：预生成内容的路径
      })),
      { title: practiceLogTitle, path: 'practice/timer', group: practiceGroupName, subgroup: null }
    ];
    
    manifestLoaded = true;
    return manifest;
  } catch (error) {
    console.error('加载清单文件失败:', error);
    // 回退到硬编码的清单
    const currentLang = window.I18n ? window.I18n.getCurrentLanguage() : 'zh';
    const practiceLogTitle = window.I18nTexts ? window.I18nTexts.getText('practiceLog.title') : (currentLang === 'en' ? 'Practice Log' : '炼功日志');
    const practiceGroupName = window.I18nTexts ? window.I18nTexts.getText('nav.practice') : (currentLang === 'en' ? 'Practice' : '练习');
    
    manifest = [
      { title: '30天学会灵魂出体', path: 'posts/30-days-master-obe.zh.md', group: '博文', subgroup: null },
      { title: 'Out-of-body adventures (30 days)', path: 'posts/30-days-master-obe.en.md', group: '博文', subgroup: null, hidden: true },
      { title: 'Treatise on Astral Projection (EN)', path: 'posts/treatise-on-astral-projection.en.md', group: '博文', subgroup: null, hidden: true },
      { title: '论星体投射', path: 'posts/treatise-on-astral-projection.zh.md', group: '博文', subgroup: null },
      { title: 'Out of Body Techniques Manual', path: 'posts/out-of-body-techniques-manual.en.md', group: '博文', subgroup: null, hidden: true },
      { title: '瑜伽经 · 站点版', path: 'posts/yoga-sutra/by-site.zh.md', group: '博文', subgroup: '瑜伽经', hidden: true },
      { title: 'Yoga Sutras · Bon Giovanni', path: 'posts/yoga-sutra/by-bon-giovanni.en.md', group: '博文', subgroup: '瑜伽经', hidden: true },
      { title: 'Yoga Sutras · Swami Jnaneshvara', path: 'posts/yoga-sutra/by-swami-jnaneshvara-bharati.en.md', group: '博文', subgroup: '瑜伽经', hidden: true },
      { title: '瑜伽经 · 元吾氏译', path: 'posts/yoga-sutra/by-yuanwushi.zh.md', group: '博文', subgroup: '瑜伽经', hidden: true },
      { title: practiceLogTitle, path: 'practice/timer', group: practiceGroupName, subgroup: null },
    ];
    manifestLoaded = true;
    return manifest;
  }
}

const sidebar = document.getElementById('sidebar');
const article = document.getElementById('article');
const appbarTitle = document.getElementById('appbar-title');
const homeBtn = document.getElementById('home-btn');
const drawerToggle = document.getElementById('drawer-toggle');
const drawerOverlay = document.getElementById('drawer-overlay');

async function buildSidebar() {
  await loadManifest();
  
  // 过滤掉隐藏的文章，并根据语言过滤
  let visibleManifest = manifest.filter(m => !m.hidden);
  
  // 根据当前语言过滤文章
  const currentLang = window.I18n ? window.I18n.getCurrentLanguage() : 'zh';
  visibleManifest = visibleManifest.filter(m => {
    // 特殊页面（如 practice/timer）不受语言过滤影响，始终显示
    if (m.path.startsWith('practice/') || m.path.startsWith('auth/')) {
      return true;
    }
    
    if (currentLang === 'zh') {
      // 中文环境：显示中文文章和没有语言标识的文章
      return !m.path.includes('.en.') && !m.title.includes('(EN)');
    } else {
      // 英文环境：显示英文文章
      return m.path.includes('.en.') || m.title.includes('(EN)') || m.title.includes('English');
    }
  });
  
  const groups = Array.from(new Set(visibleManifest.map(m => m.group)));
  const wrapper = document.createElement('div');
  const brand = document.createElement('div');
  brand.className = 'brand';
  brand.innerHTML = window.I18nTexts ? window.I18nTexts.getText('site.title') : '仙界邀请函';
  wrapper.appendChild(brand);

  // 添加语言切换区域
  const languageSection = document.createElement('div');
  languageSection.className = 'language-section';
  languageSection.innerHTML = `
    <div class="language-switcher">
      <button id="sidebar-language-toggle" class="sidebar-language-btn" title="切换语言 / Switch Language">
        <i class="fas fa-language"></i>
        <span id="current-language-text">中文</span>
      </button>
    </div>
  `;
  wrapper.appendChild(languageSection);

  // 添加用户信息区域（如果已登录）
  const userInfoSection = document.createElement('div');
  userInfoSection.id = 'user-info-section';
  userInfoSection.className = 'user-info-section';
  wrapper.appendChild(userInfoSection);

  groups.forEach(g => {
    const sec = document.createElement('div');
    sec.className = 'nav-section';
    const title = document.createElement('div');
    title.className = (g === '博文' || g === '练习') ? 'nav-title nav-title-section' : 'nav-title';
    
    // 获取本地化的组名
    const localizedGroupName = window.I18nTexts ? 
      (window.I18nTexts.getText(`nav.groups.${g}`) || g) : g;
    title.textContent = localizedGroupName;
    
    sec.appendChild(title);

    const ul = document.createElement('ul');
    ul.className = 'nav-list';

    // 获取该分组下的所有项目（已过滤隐藏的）
    const groupItems = visibleManifest.filter(m => m.group === g);
    // 获取所有子分组
    const subgroups = Array.from(new Set(groupItems.map(m => m.subgroup).filter(s => s !== null)));

    if (subgroups.length === 0) {
      // 如果没有子分组，直接渲染所有项目
      groupItems.forEach(m => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#/${encodeURIComponent(m.path)}`;
        a.textContent = m.title;
        li.appendChild(a);
        ul.appendChild(li);
      });
    } else {
      // 如果有子分组，先渲染没有子分组的项目
      const mainItems = groupItems.filter(m => m.subgroup === null);
      mainItems.forEach(m => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#/${encodeURIComponent(m.path)}`;
        a.textContent = m.title;
        li.appendChild(a);
        ul.appendChild(li);
      });

      // 然后渲染子分组
      subgroups.forEach(subgroup => {
        const subLi = document.createElement('li');
        subLi.className = 'nav-subgroup';
        const subTitle = document.createElement('div');
        subTitle.className = 'nav-subtitle';
        subTitle.textContent = subgroup;
        subLi.appendChild(subTitle);

        const subUl = document.createElement('ul');
        subUl.className = 'nav-sublist';
        groupItems.filter(m => m.subgroup === subgroup).forEach(m => {
          const subItemLi = document.createElement('li');
          const a = document.createElement('a');
          a.href = `#/${encodeURIComponent(m.path)}`;
          a.textContent = m.title;
          subItemLi.appendChild(a);
          subUl.appendChild(subItemLi);
        });
        subLi.appendChild(subUl);
        ul.appendChild(subLi);
      });
    }

    sec.appendChild(ul);
    wrapper.appendChild(sec);
  });

  sidebar.innerHTML = '';
  sidebar.appendChild(wrapper);
  
  // 初始化用户信息显示
  updateUserInfoInSidebar();
}

// 更新侧边栏中的用户信息
function updateUserInfoInSidebar() {
  const userInfoSection = document.getElementById('user-info-section');
  if (!userInfoSection) return;
  
  // 检查是否登录（从practice-timer.js获取状态）
  const isLoggedIn = window.isLoggedIn && window.isLoggedIn();
  const currentUser = window.currentUser;
  
  if (isLoggedIn && currentUser) {
    userInfoSection.innerHTML = `
      <div class="sidebar-user-info">
        <div class="user-details">
          <span class="user-email">${currentUser.email}</span>
        </div>
        <button id="sidebar-logout-btn" class="sidebar-logout-btn" title="登出"><i class="fas fa-sign-out-alt"></i></button>
      </div>
    `;
    
    // 绑定登出按钮事件
    const logoutBtn = document.getElementById('sidebar-logout-btn');
    if (logoutBtn && window.handleLogout) {
      logoutBtn.addEventListener('click', window.handleLogout);
    }
    
    userInfoSection.style.display = 'block';
  } else {
    userInfoSection.innerHTML = '';
    userInfoSection.style.display = 'none';
  }
}

// 导出函数到全局
window.updateUserInfoInSidebar = updateUserInfoInSidebar;

// 语言切换处理函数
function handleLanguageSwitch() {
  if (!window.I18n) {
    console.error('I18n 模块未加载');
    return;
  }

  const currentLang = window.I18n.getCurrentLanguage();
  const newLang = currentLang === 'zh' ? 'en' : 'zh';
  
  console.log(`切换语言: ${currentLang} -> ${newLang}`);
  window.I18n.switchLanguage(newLang);
}

// 语言变更处理函数
function handleLanguageChange(event) {
  console.log('语言变更事件:', event.detail);
  
  // 更新页面标题
  updatePageTitle();
  
  // 重新构建侧边栏以更新导航项的语言
  buildSidebar();
  
  // 更新侧边栏语言按钮文本
  updateLanguageButtonText();
  
  // 更新 AppBar 标题
  if (!location.hash.startsWith('#/')) {
    updateAppBar();
  } else {
    // 如果在特定页面，也需要更新 AppBar 标题
    const path = decodeURIComponent(location.hash.slice(2));
    if (path === 'practice/timer') {
      const practiceLogTitle = window.I18nTexts ? window.I18nTexts.getText('practiceLog.title') : '炼功日志';
      updateAppBar(practiceLogTitle);
    }
  }
}

// 更新页面标题
function updatePageTitle() {
  if (window.I18nTexts) {
    const siteTitle = window.I18nTexts.getText('site.title');
    document.title = siteTitle;
    
    // 更新品牌显示
    const brandElement = document.querySelector('.brand');
    if (brandElement) {
      brandElement.textContent = siteTitle;
    }
    
    // 更新移动端AppBar标题
    const appbarTitleElement = document.getElementById('appbar-title');
    if (appbarTitleElement) {
      appbarTitleElement.textContent = siteTitle;
    }
  }
}

// 更新语言按钮文本
function updateLanguageButtonText() {
  const currentLanguageText = document.getElementById('current-language-text');
  if (currentLanguageText && window.I18n) {
    const currentLang = window.I18n.getCurrentLanguage();
    const langInfo = window.I18n.getLanguageInfo(currentLang);
    currentLanguageText.textContent = langInfo.nativeName;
  }
}

async function loadContent(path) {
  article.innerHTML = `
    <div class="flex items-center justify-center min-h-[200px]">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  `;
  
  // 清理炼功日志页面可能的样式影响
  if (path !== 'practice/timer') {
    cleanupPracticeTimerPage(article);
  }
  
  await loadManifest();

  // 处理炼功日志特殊页面
  if (path === 'practice/timer') {
    await loadPracticeTimerPage(article);
    highlightActive(path);
    const practiceLogTitle = window.I18nTexts ? window.I18nTexts.getText('practiceLog.title') : '炼功日志';
    updateAppBar(practiceLogTitle);
    return;
  }

  // 处理邮箱验证页面
  if (path.startsWith('auth/verify/')) {
    await loadEmailVerificationPage(article, path);
    updateAppBar('邮箱验证');
    return;
  }

  try {
    // 查找对应的内容项
    const contentItem = manifest.find(item => item.path === path);
    
    if (contentItem && contentItem.contentPath) {
      // 使用预生成的 HTML 内容
      const resp = await fetch(`/content/${contentItem.contentPath}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      
      const contentData = await resp.json();
      
      // 设置 HTML 内容
      article.innerHTML = contentData.content;
      
      // 拦截文章内的锚点链接，防止与路由冲突
      interceptArticleLinks();
      
      // 修复 Safari Reader 模式检测问题
      await fixSafariReaderMode();
      
      // 添加文章元数据（可选）
      if (contentData.metadata && contentData.wordCount) {
        // const metaInfo = document.createElement('div');
        // metaInfo.className = 'article-meta';
        // metaInfo.innerHTML = `
        //   <small style="color: var(--muted); font-size: 0.8em; margin-bottom: 1rem; display: block;">
        //     ${contentData.wordCount} 字 | 生成于 ${new Date(contentData.generatedAt).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })}
        //   </small>
        // `;
        // article.insertBefore(metaInfo, article.firstChild);
        
        // 更新移动端 AppBar 标题
        updateAppBar(contentData.metadata.title);
      }
      
    } else {
      // 回退到原来的 MD 文件加载方式（用于向后兼容）
      console.warn(`未找到预生成内容，回退到 MD 文件: ${path}`);
      const resp = await fetch(`/${path}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      const text = await resp.text();
      const cleaned = stripFrontmatter(text);
      
      // 简单的 Markdown 解析（基础功能）
      const html = parseBasicMarkdown(cleaned);
      article.innerHTML = html;
      
      // 修复 Safari Reader 模式检测问题
      await fixSafariReaderMode();
    }
    
    highlightActive(path);
    
  } catch (e) {
    console.error('加载内容失败:', e);
    article.innerHTML = `
      <div style="padding: 2rem; text-align: center;">
        <h2>😔 内容加载失败</h2>
        <p style="color: var(--muted); margin: 1rem 0;">
          ${String(e)}
        </p>
        <button onclick="location.reload()" style="
          background: var(--primary);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
        ">
          重新加载
        </button>
      </div>
    `;
  }
}

function stripFrontmatter(text) {
  if (text.startsWith('---')) {
    const end = text.indexOf('\n---', 3);
    if (end !== -1) return text.slice(end + 4);
  }
  return text;
}

function parseBasicMarkdown(text) {
  // 简单的 Markdown 解析器（用于回退）
  return text
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, '<a href="$2">$1</a>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.*)$/gm, '<p>$1</p>')
    .replace(/<p><h([1-6])>/g, '<h$1>')
    .replace(/<\/h([1-6])><\/p>/g, '</h$1>');
}

function interceptArticleLinks() {
  // 拦截文章内的锚点链接，防止与 SPA 路由冲突
  const articleLinks = article.querySelectorAll('a[href^="#"]');
  
  articleLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetText = link.textContent.trim();
      
      // 查找包含相同文本的标题元素
      const headers = article.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const targetElement = Array.from(headers).find(header => 
        header.textContent.trim() === targetText
      );
      
      if (targetElement) {
        targetElement.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      } else {
        console.warn('未找到目标标题:', targetText);
      }
    });
  });
}

function highlightActive(path) {
  document.querySelectorAll('.nav-list a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === `#/${encodeURIComponent(path)}`);
  });
}



async function route() {
  const hash = location.hash;
  if (hash.startsWith('#/')) {
    const path = decodeURIComponent(hash.slice(2));
    await loadContent(path);
  } else {
    // 显示首页，需要先加载清单
    await loadManifest();
    const visibleManifest = manifest.filter(m => !m.hidden);
    loadHomePage(visibleManifest, article);
    
    // 重置 AppBar 标题为站点名称（使用本地化）
    updateAppBar();
  }
}

// 移动端抽屉控制
let isDrawerOpen = false;

function toggleDrawer() {
  isDrawerOpen = !isDrawerOpen;
  sidebar.classList.toggle('mobile-open', isDrawerOpen);
  drawerOverlay.classList.toggle('active', isDrawerOpen);
}

function closeDrawer() {
  isDrawerOpen = false;
  sidebar.classList.remove('mobile-open');
  drawerOverlay.classList.remove('active');
}

function updateAppBar(title = null) {
  if (appbarTitle) {
    // 如果没有提供标题，使用站点标题
    if (!title) {
      title = window.I18nTexts ? window.I18nTexts.getText('site.title') : '仙界邀请函';
    }
    appbarTitle.textContent = title;
  }
}

function checkMobileAndOpenDrawer() {
  // 检查是否是移动端且在首页，如果是则打开抽屉
  if (window.innerWidth <= 768 && !location.hash.startsWith('#/')) {
    isDrawerOpen = true;
    sidebar.classList.add('mobile-open');
    drawerOverlay.classList.add('active');
  }
}

// 初始化应用
async function initApp() {
  console.log('🚀 === APP 初始化开始 ===');
  console.log('⏰ APP启动时间:', new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));
  console.log('🔗 当前URL:', window.location.href);
  console.log('🔗 当前Hash:', window.location.hash);
  
  // 检查全局认证状态（如果practice-timer.js已加载）
  if (typeof window.debugAuthStatus === 'function') {
    console.log('🔍 发现认证调试函数，执行检查...');
    window.debugAuthStatus();
  } else {
    console.log('🔍 APP级别简单认证检查:');
    console.log('🍪 document.cookie:', document.cookie || '(空)');
  }
  
  await buildSidebar();
  
  // 预加载Chart.js（为炼功日志页面准备）
  if (typeof Chart !== 'undefined') {
    console.log('📊 Chart.js 已可用，无需预加载');
  } else {
    console.log('📊 开始预加载 Chart.js...');
    // Chart.js 会通过HTML中的script标签异步加载
  }
  
  // 绑定移动端事件
  if (drawerToggle) {
    drawerToggle.addEventListener('click', toggleDrawer);
  }
  
  if (drawerOverlay) {
    drawerOverlay.addEventListener('click', closeDrawer);
  }
  
  if (homeBtn) {
    homeBtn.addEventListener('click', () => {
      location.hash = '';
      closeDrawer();
    });
  }

  // 绑定语言切换事件（仅侧边栏）
  const sidebarLanguageToggle = document.getElementById('sidebar-language-toggle');
  
  if (sidebarLanguageToggle) {
    sidebarLanguageToggle.addEventListener('click', handleLanguageSwitch);
  }

  // 监听语言变更事件，更新界面
  window.addEventListener('languagechange', handleLanguageChange);
  window.addEventListener('i18ninit', handleLanguageChange);
  
  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      closeDrawer();
    }
  });
  
  await route();
  checkMobileAndOpenDrawer();
  
  console.log('🚀 === APP 初始化完成 ===');
}

addEventListener('hashchange', () => {
  route();
  // 访问文章时关闭抽屉
  if (location.hash.startsWith('#/')) {
    closeDrawer();
  }
});

/**
 * 修复 Safari Reader 模式检测问题
 * Safari 需要时间来分析新加载的内容结构
 */
async function fixSafariReaderMode() {
  // 检测是否为 Safari 浏览器
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  if (!isSafari) {
    return; // 非 Safari 浏览器无需处理
  }
  
  // 方法1: 添加延迟让 Safari 有时间分析内容
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // 方法2: 触发 DOM 变更事件通知浏览器内容已更新
  const article = document.getElementById('article');
  if (article) {
    // 创建并派发自定义事件
    const contentChangeEvent = new Event('DOMContentLoaded', { bubbles: true });
    article.dispatchEvent(contentChangeEvent);
    
    // 触发窗口 resize 事件，这有时能帮助 Safari 重新检测内容
    window.dispatchEvent(new Event('resize'));
    
    // 方法3: 微调DOM结构来触发重新分析
    // 临时添加一个不可见元素然后移除，这会触发 Safari 的内容分析
    const tempElement = document.createElement('div');
    tempElement.style.display = 'none';
    tempElement.setAttribute('aria-hidden', 'true');
    article.appendChild(tempElement);
    
    // 下一个事件循环中移除临时元素
    setTimeout(() => {
      if (tempElement.parentNode) {
        tempElement.parentNode.removeChild(tempElement);
      }
    }, 10);
  }
}

initApp();


