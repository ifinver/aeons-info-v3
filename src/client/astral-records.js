// 出神记录前端页面
// 复用 practice-timer.js 提供的认证与全局变量：isLoggedIn, currentUser, csrfToken, getCurrentUser

import { loadPracticeTimerPage } from './practice-timer.js';

// i18n 助手
const t = (k, p) => (window.I18nTexts ? window.I18nTexts.getText(k, null, p) : k);

export async function loadAstralRecordsPage(container) {
  const marginStyle = 'max-width: 1200px; margin: 0 auto; padding: 1rem;';

  // 未登录则显示登录界面（复用练功日志的登录UI）
  const auth = await checkAuth();
  if (!auth.authenticated) {
    // 设置登录后回跳
    window.postLoginRedirect = '#/astral/records';
    // 复用炼功日志登录界面
    container.innerHTML = '';
    await loadPracticeTimerPage(container); // 该页面内会显示登录表单
    return;
  }

  // 已登录，渲染三栏布局
  container.innerHTML = `
    <div class="astral-records" style="${marginStyle}">
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 lg:col-span-3">
          <div class="card">
            <div class="card-header flex justify-between items-center">
              <h3 class="text-lg font-semibold">${t('astral.notebooks.header')}</h3>
              <div class="flex items-center gap-2">
                <button id="btn-toggle-notebook" class="icon-btn" title="${t('astral.notebooks.toggle')}">▾</button>
                <button id="btn-create-notebook" class="icon-btn" title="${t('astral.notebooks.new')}">＋</button>
              </div>
            </div>
            <div class="card-body">
              <ul id="notebook-list" class="space-y-2"></ul>
            </div>
          </div>
        </div>
        <div class="col-span-12 lg:col-span-4">
          <div class="card">
            <div class="card-header">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">${t('astral.posts.header')}</h3>
                <div class="text-sm text-gray-500" id="post-count"></div>
              </div>
            </div>
            <div class="card-body">
              <ul id="post-list" class="space-y-2"></ul>
            </div>
          </div>
        </div>
        <div class="col-span-12 lg:col-span-5">
          <div class="card">
            <div class="card-header">
              <div class="flex items-center justify-between w-full gap-2">
                <h3 id="post-title" class="text-lg font-semibold truncate">${t('astral.posts.contentHeader')}</h3>
                <div class="flex items-center gap-2">
                  <button id="btn-rename-post" class="icon-btn" title="${t('common.edit')}">✎</button>
                  <button id="btn-delete-post" class="icon-btn" title="${t('common.delete')}">🗑</button>
                </div>
              </div>
            </div>
            <div class="card-body" id="post-content" style="min-height: 300px;"></div>
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
  if (window.isLoggedIn && window.isLoggedIn() && window.currentUser && window.csrfToken) {
    return { authenticated: true, user: window.currentUser };
  }
  const user = await (window.getCurrentUser ? window.getCurrentUser() : Promise.resolve(null));
  return { authenticated: !!user, user };
}

function bindUI(container) {
  const btnToggle = container.querySelector('#btn-toggle-notebook');
  const list = container.querySelector('#notebook-list');
  if (btnToggle && list) {
    btnToggle.addEventListener('click', () => {
      const nowHidden = list.style.display !== 'none' ? 'none' : '';
      list.style.display = nowHidden;
      try { localStorage.setItem('astral_nb_collapsed', nowHidden === 'none' ? '1' : '0'); } catch {}
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

  // 折叠状态恢复
  try {
    const collapsed = localStorage.getItem('astral_nb_collapsed') === '1';
    if (collapsed) ul.style.display = 'none';
  } catch {}
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
    document.getElementById('post-title').textContent = '文章内容';
    document.getElementById('post-content').innerHTML = '';
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
    li.textContent = p.title;
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
  document.getElementById('post-title').textContent = data.meta.title;
  const md = data.content || '';
  // 简单渲染：优先使用页面内已有的 marked，如没有则用最简单替代
  const html = window.marked ? window.marked.parse(md) : basicMarkdown(md);
  document.getElementById('post-content').innerHTML = html;
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


