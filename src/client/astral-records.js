// 出神记录前端页面
// 复用 practice-timer.js 提供的认证与全局变量：isLoggedIn, currentUser, csrfToken, getCurrentUser

import { loadPracticeTimerPage } from './practice-timer.js';

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
              <h3>记事本</h3>
              <button id="btn-create-notebook" class="icon-btn" title="新建记事本">+</button>
            </div>
            <div class="card-body">
              <div class="flex justify-end mb-2">
                <button id="btn-toggle-notebook" class="text-sm">折叠/展开</button>
              </div>
              <ul id="notebook-list" class="space-y-2"></ul>
            </div>
          </div>
        </div>
        <div class="col-span-12 lg:col-span-4">
          <div class="card">
            <div class="card-header">
              <h3>文章</h3>
            </div>
            <div class="card-body">
              <ul id="post-list" class="space-y-2"></ul>
            </div>
          </div>
        </div>
        <div class="col-span-12 lg:col-span-5">
          <div class="card">
            <div class="card-header">
              <h3 id="post-title">文章内容</h3>
            </div>
            <div class="card-body" id="post-content" style="min-height: 300px;"></div>
          </div>
        </div>
      </div>
      <button id="btn-create-post" class="floating-btn" title="添加新文章">＋</button>
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
      list.style.display = list.style.display === 'none' ? '' : 'none';
    });
  }
  const btnCreateNotebook = container.querySelector('#btn-create-notebook');
  if (btnCreateNotebook) {
    btnCreateNotebook.addEventListener('click', async () => {
      const name = prompt('记事本名称');
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
        alert('请先选择记事本');
        return;
      }
      const title = prompt('文章标题');
      if (!title) return;
      const content = await promptMultiline('文章内容 (Markdown)');
      if (content == null) return;
      await apiCreatePost(nbId, title, content);
      await refreshPosts(nbId);
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
    li.textContent = nb.name;
    li.addEventListener('click', async () => {
      state.selectedNotebookId = nb.id;
      state.selectedPostId = null;
      renderNotebooks();
      await refreshPosts(nb.id);
    });
    ul.appendChild(li);
  });
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


