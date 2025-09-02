import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

const manifest = [
  { title: '30天学会灵魂出体', path: 'posts/30-days-master-obe.zh.md', group: '博文', subgroup: null },
  { title: 'Out-of-body adventures (30 days)', path: 'posts/30-days-master-obe.en.md', group: '博文', subgroup: null },
  { title: 'Treatise on Astral Projection (EN)', path: 'posts/treatise-on-astral-projection.en.md', group: '博文', subgroup: null },
  { title: '论星体投射 (ZH)', path: 'posts/treatise-on-astral-projection.zh.md', group: '博文', subgroup: null },
  { title: 'Out of Body Techniques Manual', path: 'posts/out-of-body-techniques-manual.en.md', group: '博文', subgroup: null },
  { title: '瑜伽经 · 站点版', path: 'posts/yoga-sutra/by-site.zh.md', group: '博文', subgroup: '瑜伽经' },
  { title: 'Yoga Sutras · Bon Giovanni', path: 'posts/yoga-sutra/by-bon-giovanni.en.md', group: '博文', subgroup: '瑜伽经' },
  { title: 'Yoga Sutras · Swami Jnaneshvara', path: 'posts/yoga-sutra/by-swami-jnaneshvara-bharati.en.md', group: '博文', subgroup: '瑜伽经' },
  { title: '瑜伽经 · 元吾氏译', path: 'posts/yoga-sutra/by-yuanwushi.zh.md', group: '博文', subgroup: '瑜伽经' },
  { title: '练功计时器', path: 'practice/timer', group: '练习', subgroup: null },
];

const sidebar = document.getElementById('sidebar');
const article = document.getElementById('article');

function buildSidebar() {
  const groups = Array.from(new Set(manifest.map(m => m.group)));
  const wrapper = document.createElement('div');
  const brand = document.createElement('div');
  brand.className = 'brand';
  brand.innerHTML = '永恒的信息 <span class="muted">v3</span>';
  wrapper.appendChild(brand);

  const search = document.createElement('div');
  search.className = 'search';
  search.innerHTML = '<input id="q" placeholder="搜索标题..."/><button id="qbtn">搜索</button>';
  wrapper.appendChild(search);

  groups.forEach(g => {
    const sec = document.createElement('div');
    sec.className = 'nav-section';
    const title = document.createElement('div');
    title.className = (g === '博文' || g === '练习') ? 'nav-title nav-title-section' : 'nav-title';
    title.textContent = g;
    sec.appendChild(title);

    const ul = document.createElement('ul');
    ul.className = 'nav-list';

    // 获取该分组下的所有项目
    const groupItems = manifest.filter(m => m.group === g);
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
}

async function loadMarkdown(path) {
  article.innerHTML = '<h1>加载中…</h1>';

  // 处理练功计时器特殊页面
  if (path === 'practice/timer') {
    article.innerHTML = `
      <h1>练功计时器</h1>
      <div id="timer-chart" style="
        width: 100%;
        height: 400px;
        border: 2px dashed var(--border);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 20px 0;
        background: rgba(0, 123, 255, 0.05);
        color: var(--muted);
        font-size: 16px;
      ">
        图表区域预留位置<br>
        即将支持KV数据可视化
      </div>
      <p style="text-align: center; color: var(--muted); margin-top: 20px;">
        练功数据统计图表即将上线
      </p>
    `;
    highlightActive(path);
    return;
  }

  try {
    const resp = await fetch(`/${path}`);
    if (!resp.ok) throw new Error(resp.statusText);
    const text = await resp.text();
    const cleaned = stripFrontmatter(text);
    const html = marked.parse(cleaned);
    article.innerHTML = html;
    highlightActive(path);
  } catch (e) {
    article.innerHTML = `<p>加载失败：${String(e)}</p>`;
  }
}

function stripFrontmatter(text) {
  if (text.startsWith('---')) {
    const end = text.indexOf('\n---', 3);
    if (end !== -1) return text.slice(end + 4);
  }
  return text;
}

function highlightActive(path) {
  document.querySelectorAll('.nav-list a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === `#/${encodeURIComponent(path)}`);
  });
}

function route() {
  const hash = location.hash;
  if (hash.startsWith('#/')) {
    const path = decodeURIComponent(hash.slice(2));
    loadMarkdown(path);
  } else {
    // default: first item
    const first = manifest[0];
    location.hash = `#/${encodeURIComponent(first.path)}`;
  }
}

buildSidebar();
addEventListener('hashchange', route);
route();


