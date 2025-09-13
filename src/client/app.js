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
    manifest = [
      ...data.items.map(item => ({
        title: item.title,
        path: item.path,
        group: item.group,
        subgroup: item.subgroup,
        hidden: item.hidden,
        contentPath: item.contentPath // 新增：预生成内容的路径
      })),
      { title: '炼功日志', path: 'practice/timer', group: '练习', subgroup: null }
    ];
    
    manifestLoaded = true;
    return manifest;
  } catch (error) {
    console.error('加载清单文件失败:', error);
    // 回退到硬编码的清单
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
      { title: '炼功日志', path: 'practice/timer', group: '练习', subgroup: null },
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
  
  // 过滤掉隐藏的文章
  const visibleManifest = manifest.filter(m => !m.hidden);
  const groups = Array.from(new Set(visibleManifest.map(m => m.group)));
  const wrapper = document.createElement('div');
  const brand = document.createElement('div');
  brand.className = 'brand';
  brand.innerHTML = '永恒的信息';
  wrapper.appendChild(brand);

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
    title.textContent = g;
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
    updateAppBar('炼功日志');
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
      
      // 添加文章元数据（可选）
      if (contentData.metadata && contentData.wordCount) {
        const metaInfo = document.createElement('div');
        metaInfo.className = 'article-meta';
        metaInfo.innerHTML = `
          <small style="color: var(--muted); font-size: 0.8em; margin-bottom: 1rem; display: block;">
            ${contentData.wordCount} 字 | 生成于 ${new Date(contentData.generatedAt).toLocaleDateString('zh-CN')}
          </small>
        `;
        article.insertBefore(metaInfo, article.firstChild);
        
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
    
    // 重置 AppBar 标题为站点名称
    updateAppBar('永恒的信息');
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

function updateAppBar(title = '永恒的信息') {
  if (appbarTitle) {
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
  console.log('⏰ APP启动时间:', new Date().toLocaleString());
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

initApp();


