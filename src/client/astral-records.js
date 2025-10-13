// 出神记录前端页面
// 复用 practice-timer.js 提供的认证与全局变量：isLoggedIn, currentUser, csrfToken, getCurrentUser

import { loadPracticeTimerPage } from './practice-timer.js';

// i18n 助手
const t = (k, p) => (window.I18nTexts ? window.I18nTexts.getText(k, null, p) : k);

export async function loadAstralRecordsPage(container) {
  // 未登录则显示登录界面
  const auth = await checkAuth();
  if (!auth.authenticated) {
    // 设置登录后回跳
    window.postLoginRedirect = '#/astral/records';
    // 展示 Astral 独立登录表单
    renderAstralAuth(container);
    return;
  }

  // 已登录，渲染三栏布局
  container.innerHTML = `
    <div class="astral-records">
      <div class="astral-layout relative">
        <div id="astral-gutter" class="astral-left-gutter hidden">
          <button id="drawer-notebooks" class="drawer-btn-in" title="${t('astral.notebooks.header')}">📒</button>
          <button id="drawer-posts" class="drawer-btn-in" title="${t('astral.posts.header')}">📄</button>
        </div>
        <div id="col-notebooks" class="astral-col-notebooks">
          <div class="card rounded-none border-0">
            <div class="card-header flex justify-between items-center border-b">
              <h3 class="text-sm font-semibold">${t('astral.notebooks.header')}</h3>
              <div class="flex items-center gap-2">
                <button id="btn-toggle-notebook" class="icon-btn" title="${t('astral.notebooks.toggle')}">📒</button>
                <button id="btn-create-notebook" class="icon-btn" title="${t('astral.notebooks.new')}">＋</button>
              </div>
            </div>
            <div class="card-body p-2">
              <ul id="notebook-list" class="space-y-1"></ul>
            </div>
          </div>
        </div>
        <div id="col-posts" class="astral-col-posts">
          <div class="card rounded-none border-0">
            <div class="card-header flex items-center justify-between border-b">
              <h3 class="text-sm font-semibold">${t('astral.posts.header')}</h3>
              <div class="text-xs text-gray-500" id="post-count"></div>
              <div class="flex items-center gap-2">
                <button id="btn-toggle-posts" class="icon-btn" title="${t('astral.notebooks.toggle')}">📄</button>
              </div>
            </div>
            <div class="card-body p-2">
              <ul id="post-list" class="space-y-1"></ul>
            </div>
          </div>
        </div>
        <div class="astral-col-content">
          <div class="card rounded-none border-0">
            <div class="card-body p-4" id="post-content" style="min-height: 300px;"></div>
          </div>
        </div>
      </div>
      <button id="btn-create-post" class="floating-btn" title="${t('astral.posts.new')}">＋</button>
    </div>
  `;

  bindUI(container);
  await refreshNotebooks();
}

async function checkAuth() {
  // 优先使用已缓存的用户与 CSRF
  if (window.currentUser && window.csrfToken) {
    return { authenticated: true, user: window.currentUser };
  }
  // 直接请求 /api/auth/me，避免依赖前端可见 cookie（HttpOnly 无法读取）
  try {
    const resp = await fetch('/api/auth/me', { method: 'GET', credentials: 'include' });
    if (!resp.ok) return { authenticated: false, user: null };
    const data = await resp.json();
    if (data && data.user && data.csrfToken) {
      window.currentUser = data.user;
      window.csrfToken = data.csrfToken;
      return { authenticated: true, user: data.user };
    }
    return { authenticated: false, user: null };
  } catch {
    return { authenticated: false, user: null };
  }
}

function bindUI(container) {
  // 记事本列左右折叠
  const colNotebooks = container.querySelector('#col-notebooks');
  const btnToggle = container.querySelector('#btn-toggle-notebook');
  const drawerNotebooks = container.querySelector('#drawer-notebooks');
  const gutter = container.querySelector('#astral-gutter');
  if (btnToggle && colNotebooks) {
    btnToggle.addEventListener('click', () => {
      const collapsed = !colNotebooks.classList.contains('astral-col-collapsed');
      colNotebooks.classList.toggle('astral-col-collapsed', collapsed);
      // 切换按钮指向
      btnToggle.textContent = '📒';
      try { localStorage.setItem('astral_nb_collapsed', collapsed ? '1' : '0'); } catch {}
      if (drawerNotebooks) drawerNotebooks.classList.toggle('hidden', !collapsed);
      if (gutter) gutter.classList.toggle('hidden', !(collapsed || isPostsCollapsed(container)));
    });
  }
  if (drawerNotebooks && colNotebooks) {
    drawerNotebooks.addEventListener('click', () => {
      colNotebooks.classList.remove('astral-col-collapsed');
      if (btnToggle) btnToggle.textContent = '📒';
      drawerNotebooks.classList.add('hidden');
      if (gutter) gutter.classList.toggle('hidden', !isAnyCollapsed(container));
      try { localStorage.setItem('astral_nb_collapsed', '0'); } catch {}
    });
  }

  // 文章列左右折叠
  const colPosts = container.querySelector('#col-posts');
  const btnTogglePosts = container.querySelector('#btn-toggle-posts');
  const drawerPosts = container.querySelector('#drawer-posts');
  if (btnTogglePosts && colPosts) {
    btnTogglePosts.addEventListener('click', () => {
      const collapsed = !colPosts.classList.contains('astral-col-collapsed');
      colPosts.classList.toggle('astral-col-collapsed', collapsed);
      btnTogglePosts.textContent = '📄';
      try { localStorage.setItem('astral_posts_collapsed', collapsed ? '1' : '0'); } catch {}
      if (drawerPosts) drawerPosts.classList.toggle('hidden', !collapsed);
      if (gutter) gutter.classList.toggle('hidden', !(collapsed || isNotebooksCollapsed(container)));
    });
  }
  if (drawerPosts && colPosts) {
    drawerPosts.addEventListener('click', () => {
      colPosts.classList.remove('astral-col-collapsed');
      if (btnTogglePosts) btnTogglePosts.textContent = '📄';
      drawerPosts.classList.add('hidden');
      if (gutter) gutter.classList.toggle('hidden', !isAnyCollapsed(container));
      try { localStorage.setItem('astral_posts_collapsed', '0'); } catch {}
    });
  }
  const btnCreateNotebook = container.querySelector('#btn-create-notebook');
  if (btnCreateNotebook) {
    btnCreateNotebook.addEventListener('click', async () => {
      const res = await openEditModal({ title: t('astral.notebooks.new'), okText: t('common.save'), fields: ['name'] });
      const name = res && res.name;
      if (!name) return;
      await apiCreateNotebook(name);
      await refreshNotebooks();
    });
  }
  const btnCreatePost = container.querySelector('#btn-create-post');
  if (btnCreatePost) {
    btnCreatePost.addEventListener('click', async () => {
      const nbId = getSelectedNotebookId();
      if (!nbId) {
        alert(t('astral.messages.selectNotebookFirst'));
        return;
      }
      const result = await openEditModal({ title: t('astral.posts.new'), okText: t('common.save'), showPreview: true });
      if (!result) return;
      await apiCreatePost(nbId, result.title, result.content);
      await refreshPosts(nbId);
    });
  }

  const btnRenamePost = container.querySelector('#btn-rename-post');
  if (btnRenamePost) {
    btnRenamePost.addEventListener('click', async () => {
      if (!state.selectedNotebookId || !state.selectedPostId) return;
      const current = state.posts.find(p => p.id === state.selectedPostId);
      const result = await openEditModal({ title: t('astral.posts.rename'), okText: t('common.save'), fields: ['title'], initial: { title: current?.title || '' } });
      if (!result) return;
      await apiUpdatePost(state.selectedNotebookId, state.selectedPostId, result.title, undefined);
      await refreshPosts(state.selectedNotebookId);
    });
  }

  const btnDeletePost = container.querySelector('#btn-delete-post');
  if (btnDeletePost) {
    btnDeletePost.addEventListener('click', async () => {
      if (!state.selectedNotebookId || !state.selectedPostId) return;
      if (!confirm(t('astral.posts.deleteConfirm'))) return;
      await apiDeletePost(state.selectedNotebookId, state.selectedPostId);
      state.selectedPostId = null;
      await refreshPosts(state.selectedNotebookId);
    });
  }
}

// 简易多行输入
async function promptMultiline(title) {
  const text = prompt(title + '\n(在此粘贴内容，确认后保存)');
  return text;
}

// 状态管理
let state = {
  notebooks: [],
  selectedNotebookId: null,
  posts: [],
  selectedPostId: null,
};

function getSelectedNotebookId() { return state.selectedNotebookId; }

async function refreshNotebooks() {
  const notebooks = await apiListNotebooks();
  state.notebooks = notebooks;
  renderNotebooks();
  if (!state.selectedNotebookId && notebooks.length > 0) {
    state.selectedNotebookId = notebooks[0].id;
  }
  if (state.selectedNotebookId) {
    await refreshPosts(state.selectedNotebookId);
  }
}

function renderNotebooks() {
  const ul = document.getElementById('notebook-list');
  if (!ul) return;
  ul.innerHTML = '';
  state.notebooks.forEach(nb => {
    const li = document.createElement('li');
    li.className = 'list-item ' + (state.selectedNotebookId === nb.id ? 'active' : '');
    const nameSpan = document.createElement('span');
    nameSpan.className = 'truncate';
    nameSpan.textContent = nb.name;
    const actions = document.createElement('span');
    actions.className = 'actions';
    const renameBtn = document.createElement('button');
    renameBtn.className = 'icon-btn';
    renameBtn.title = t('common.edit');
    renameBtn.textContent = '✎';
    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn';
    delBtn.title = t('common.delete');
    delBtn.textContent = '🗑';
    actions.appendChild(renameBtn);
    actions.appendChild(delBtn);
    li.appendChild(nameSpan);
    li.appendChild(actions);
    li.addEventListener('click', async () => {
      state.selectedNotebookId = nb.id;
      state.selectedPostId = null;
      renderNotebooks();
      await refreshPosts(nb.id);
    });
    renameBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const result = await openEditModal({ title: t('astral.notebooks.rename'), okText: t('common.save'), fields: ['name'], initial: { name: nb.name } });
      if (!result) return;
      await apiRenameNotebook(nb.id, result.name);
      await refreshNotebooks();
    });
    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(t('astral.notebooks.deleteConfirm'))) return;
      await apiDeleteNotebook(nb.id);
      if (state.selectedNotebookId === nb.id) {
        state.selectedNotebookId = null;
        state.selectedPostId = null;
      }
      await refreshNotebooks();
    });
    ul.appendChild(li);
  });

  // 折叠状态恢复（列级别）
  try {
    const nbCollapsed = localStorage.getItem('astral_nb_collapsed') === '1';
    const postsCollapsed = localStorage.getItem('astral_posts_collapsed') === '1';
    const colNotebooks = document.getElementById('col-notebooks');
    const colPosts = document.getElementById('col-posts');
    const btnToggle = document.getElementById('btn-toggle-notebook');
    const btnTogglePosts = document.getElementById('btn-toggle-posts');
    const drawerNotebooks = document.getElementById('drawer-notebooks');
    const drawerPosts = document.getElementById('drawer-posts');
    if (nbCollapsed && colNotebooks) {
      colNotebooks.classList.add('astral-col-collapsed');
      if (btnToggle) btnToggle.textContent = '📒';
      if (drawerNotebooks) drawerNotebooks.classList.remove('hidden');
    }
    if (postsCollapsed && colPosts) {
      colPosts.classList.add('astral-col-collapsed');
      if (btnTogglePosts) btnTogglePosts.textContent = '📄';
      if (drawerPosts) drawerPosts.classList.remove('hidden');
    }
    const g = document.getElementById('astral-gutter');
    if (g) g.classList.toggle('hidden', !(nbCollapsed || postsCollapsed));
  } catch {}

  // 工具函数：判断折叠状态
  function isNotebooksCollapsed(root) {
    const col = root.querySelector('#col-notebooks');
    return !!(col && col.classList.contains('astral-col-collapsed'));
  }
  function isPostsCollapsed(root) {
    const col = root.querySelector('#col-posts');
    return !!(col && col.classList.contains('astral-col-collapsed'));
  }
  function isAnyCollapsed(root) {
    return isNotebooksCollapsed(root) || isPostsCollapsed(root);
  }
}

async function refreshPosts(nbId) {
  const posts = await apiListPosts(nbId);
  state.posts = posts;
  renderPosts();
  if (!state.selectedPostId && posts.length > 0) {
    state.selectedPostId = posts[0].id;
  }
  if (state.selectedPostId) {
    await loadPost(nbId, state.selectedPostId);
  } else {
    const contentEl = document.getElementById('post-content');
    if (contentEl) contentEl.innerHTML = '';
  }
  const count = document.getElementById('post-count');
  if (count) count.textContent = (window.I18nTexts ? window.I18nTexts.getText('astral.posts.count', null, { count: state.posts.length }) : `${state.posts.length}`);
}

function renderPosts() {
  const ul = document.getElementById('post-list');
  if (!ul) return;
  ul.innerHTML = '';
  state.posts.forEach(p => {
    const li = document.createElement('li');
    li.className = 'list-item ' + (state.selectedPostId === p.id ? 'active' : '');
    const createdText = formatDateTime(p.createdAt);
    li.innerHTML = `
      <div class="flex flex-col min-w-0">
        <span class="truncate font-medium">${escapeHtml(p.title)}</span>
        <span class="text-xs text-gray-500">${createdText}</span>
      </div>
    `;
    li.addEventListener('click', async () => {
      state.selectedPostId = p.id;
      renderPosts();
      await loadPost(state.selectedNotebookId, p.id);
    });
    ul.appendChild(li);
  });
}

async function loadPost(nbId, postId) {
  const data = await apiGetPost(nbId, postId);
  const md = data.content || '';
  // 简单渲染：优先使用页面内已有的 marked，如没有则用最简单替代
  const html = window.marked ? window.marked.parse(md) : basicMarkdown(md);
  const contentEl = document.getElementById('post-content');
  if (contentEl) {
    const metaLine = formatCreatedUpdatedLine(data.meta.createdAt, data.meta.updatedAt);
    const header = `
      <div class=\"mb-3 flex items-start justify-between gap-2\">
        <div class=\"min-w-0\">
          <h2 class=\"text-xl font-semibold truncate\">${escapeHtml(data.meta.title)}</h2>
          <div class=\"text-xs text-gray-500\">${metaLine}</div>
        </div>
        <div class=\"flex-shrink-0\">
          <button id=\"btn-delete-post-content\" class=\"icon-btn\" title=\"${t('common.delete')}\">🗑</button>
        </div>
      </div>
    `;
    contentEl.innerHTML = header + html;

    // 绑定删除按钮
    const delBtn = document.getElementById('btn-delete-post-content');
    if (delBtn) {
      delBtn.addEventListener('click', async () => {
        if (!confirm(t('astral.posts.deleteConfirm'))) return;
        await apiDeletePost(nbId, postId);
        state.selectedPostId = null;
        await refreshPosts(nbId);
      });
    }
  }
}

function basicMarkdown(md) {
  return md
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

// --- API ---

async function apiListNotebooks() {
  const resp = await fetch('/api/kv/astral-records/notebooks', { credentials: 'include' });
  if (!resp.ok) throw new Error('加载记事本失败');
  return await resp.json();
}

async function apiCreateNotebook(name) {
  const resp = await fetch('/api/kv/astral-records/notebooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(window.csrfToken ? { 'X-CSRF-Token': window.csrfToken } : {}) },
    credentials: 'include',
    body: JSON.stringify({ name }),
  });
  if (!resp.ok) throw new Error('创建记事本失败');
  return await resp.json();
}

async function apiListPosts(nbId) {
  const resp = await fetch(`/api/kv/astral-records/notebooks/${encodeURIComponent(nbId)}/posts`, { credentials: 'include' });
  if (!resp.ok) throw new Error('加载文章列表失败');
  return await resp.json();
}

async function apiCreatePost(nbId, title, content) {
  const resp = await fetch(`/api/kv/astral-records/notebooks/${encodeURIComponent(nbId)}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(window.csrfToken ? { 'X-CSRF-Token': window.csrfToken } : {}) },
    credentials: 'include',
    body: JSON.stringify({ title, content }),
  });
  if (!resp.ok) throw new Error('创建文章失败');
  return await resp.json();
}

async function apiGetPost(nbId, postId) {
  const resp = await fetch(`/api/kv/astral-records/notebooks/${encodeURIComponent(nbId)}/posts/${encodeURIComponent(postId)}`, { credentials: 'include' });
  if (!resp.ok) throw new Error('加载文章失败');
  return await resp.json();
}

async function apiRenameNotebook(nbId, name) {
  const resp = await fetch(`/api/kv/astral-records/notebooks/${encodeURIComponent(nbId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(window.csrfToken ? { 'X-CSRF-Token': window.csrfToken } : {}) },
    credentials: 'include',
    body: JSON.stringify({ name }),
  });
  if (!resp.ok) throw new Error('重命名记事本失败');
}

async function apiDeleteNotebook(nbId) {
  const resp = await fetch(`/api/kv/astral-records/notebooks/${encodeURIComponent(nbId)}`, {
    method: 'DELETE',
    headers: { ...(window.csrfToken ? { 'X-CSRF-Token': window.csrfToken } : {}) },
    credentials: 'include',
  });
  if (!resp.ok) throw new Error('删除记事本失败');
}

async function apiUpdatePost(nbId, postId, title, content) {
  const payload = {};
  if (typeof title === 'string') payload.title = title;
  if (typeof content === 'string') payload.content = content;
  const resp = await fetch(`/api/kv/astral-records/notebooks/${encodeURIComponent(nbId)}/posts/${encodeURIComponent(postId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(window.csrfToken ? { 'X-CSRF-Token': window.csrfToken } : {}) },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error('更新文章失败');
}

async function apiDeletePost(nbId, postId) {
  const resp = await fetch(`/api/kv/astral-records/notebooks/${encodeURIComponent(nbId)}/posts/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
    headers: { ...(window.csrfToken ? { 'X-CSRF-Token': window.csrfToken } : {}) },
    credentials: 'include',
  });
  if (!resp.ok) throw new Error('删除文章失败');
}

// 简易编辑模态（可带预览）
async function openEditModal(options = {}) {
  const { title = '编辑', okText = '确定', fields = ['title', 'content'], initial = {}, showPreview = false } = options;
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-header">
        <span>${title}</span>
        <button class="icon-btn" id="modal-close">✕</button>
      </div>
      <div class="modal-body space-y-3">
        ${fields.includes('name') ? `<input id="f-name" class="input" placeholder="${t('astral.placeholders.name')}" value="${escapeHtml(initial.name || '')}">` : ''}
        ${fields.includes('title') ? `<input id="f-title" class="input" placeholder="${t('astral.placeholders.title')}" value="${escapeHtml(initial.title || '')}">` : ''}
        ${fields.includes('content') ? `<textarea id="f-content" class="textarea" placeholder="${t('astral.placeholders.content')}">${escapeHtml(initial.content || '')}</textarea>` : ''}
        ${showPreview ? `<div class="mt-3"><div class="text-sm text-gray-500 mb-1">预览</div><div id="f-preview" class="prose max-w-none"></div></div>` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" id="modal-cancel">${t('common.cancel')}</button>
        <button class="btn-primary" id="modal-ok">${okText}</button>
      </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const close = (result) => { document.body.removeChild(overlay); resolve(result || null); };
    modal.querySelector('#modal-close').addEventListener('click', () => close(null));
    modal.querySelector('#modal-cancel').addEventListener('click', () => close(null));
    const okBtn = modal.querySelector('#modal-ok');
    okBtn.addEventListener('click', () => {
      const result = {};
      if (fields.includes('name')) result.name = modal.querySelector('#f-name').value.trim();
      if (fields.includes('title')) result.title = modal.querySelector('#f-title').value.trim();
      if (fields.includes('content')) result.content = modal.querySelector('#f-content').value;
      close(result);
    });

    if (showPreview && fields.includes('content')) {
      const ta = modal.querySelector('#f-content');
      const pv = modal.querySelector('#f-preview');
      const render = () => {
        const md = ta.value;
        pv.innerHTML = window.marked ? window.marked.parse(md) : basicMarkdown(md);
      };
      ta.addEventListener('input', render);
      render();
    }
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
}

function formatCreatedUpdatedLine(createdAt, updatedAt) {
  const lang = window.I18n ? window.I18n.getCurrentLanguage() : 'zh';
  const created = formatDateTime(createdAt);
  const updated = formatDateTime(updatedAt || createdAt);
  if (lang === 'en') {
    return `Created: ${created} · Updated: ${updated}`;
  }
  return `创建: ${created} · 修改: ${updated}`;
}

function formatDateTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(/\//g, '-');
  } catch {
    return iso;
  }
}

// Astral 独立登录界面
function renderAstralAuth(container) {
  const tt = (k) => (window.I18nTexts ? window.I18nTexts.getText(k) : k);
  container.innerHTML = `
    <div class="p-6 max-w-md mx-auto">
      <div class="card">
        <div class="card-header"><h3 class="text-lg font-semibold">${tt('astral.title')}</h3></div>
        <div class="card-body space-y-3">
          <div>
            <label class="text-sm text-gray-600">${tt('auth.email')}</label>
            <input id="astral-login-email" class="input mt-1" placeholder="${tt('auth.emailPlaceholder')}" />
          </div>
          <div>
            <label class="text-sm text-gray-600">${tt('auth.password')}</label>
            <input id="astral-login-password" type="password" class="input mt-1" placeholder="${tt('auth.password')}" />
          </div>
          <div class="flex justify-end gap-2">
            <button id="astral-login-btn" class="btn-primary">${tt('auth.login')}</button>
          </div>
          <div id="astral-login-msg" class="text-sm text-red-600 hidden"></div>
        </div>
      </div>
    </div>
  `;

  const emailEl = document.getElementById('astral-login-email');
  const pwdEl = document.getElementById('astral-login-password');
  const btnEl = document.getElementById('astral-login-btn');
  const msgEl = document.getElementById('astral-login-msg');
  const showMsg = (m) => { if (msgEl) { msgEl.textContent = m; msgEl.classList.remove('hidden'); } };
  const clearMsg = () => { if (msgEl) { msgEl.textContent = ''; msgEl.classList.add('hidden'); } };

  btnEl.addEventListener('click', async () => {
    clearMsg();
    const email = (emailEl.value || '').trim();
    const password = (pwdEl.value || '').trim();
    if (!email || !password) { showMsg(tt('practiceLog.messages.loginRequired')); return; }
    btnEl.disabled = true;
    btnEl.textContent = tt('auth.loggingIn');
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Login failed');
      // 保存用户信息与 CSRF
      window.currentUser = data.user;
      window.csrfToken = data.csrfToken;
      // 回跳或重载 Astral 页面
      const container = document.getElementById('article');
      if (container) {
        loadAstralRecordsPage(container);
      } else {
        location.hash = '#/astral/records';
        location.reload();
      }
    } catch (e) {
      showMsg((tt('practiceLog.messages.loginFailed') + ': ' + e.message));
    } finally {
      btnEl.disabled = false;
      btnEl.textContent = tt('auth.login');
    }
  });
}




