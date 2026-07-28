// 首页内容模块
// 首页完全由清单（manifest）驱动：增删文章只需改 build-content.js 的清单，
// 不需要再回到这里维护关键词或分类白名单。

const TOOL_ICONS = {
  'practice/timer': 'fa-stopwatch',
  'astral/records': 'fa-book-open'
};

const DEFAULT_TOOL_ICON = 'fa-wand-magic-sparkles';

function getText(key, params = {}) {
  return window.I18nTexts ? window.I18nTexts.getText(key, null, params) : key;
}

function getCurrentLanguage() {
  return window.I18n ? window.I18n.getCurrentLanguage() : 'zh';
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 练习工具（炼功日志、出神记录等）由 app.js 在清单末尾追加，不受语言过滤影响
function isToolItem(item) {
  return item.path.startsWith('practice/') || item.path.startsWith('astral/') || item.path.startsWith('auth/');
}

function matchesLanguage(item, lang) {
  const itemLang = item.language || (item.path.includes('.en.') ? 'en' : 'zh');
  return itemLang === lang;
}

function byWeight(a, b) {
  return (a.weight || 999) - (b.weight || 999);
}

// 整本书动辄上百分钟，超过 90 分钟改用小时更好读
function formatReadingTime(minutes, keyPrefix = 'home.readingTime') {
  if (minutes >= 90) {
    const hours = Math.round(minutes / 6) / 10;
    return getText(`${keyPrefix}Hours`, { count: hours });
  }
  return getText(keyPrefix, { count: minutes });
}

function formatDate(rawDate, lang) {
  if (!rawDate) return '';

  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', {
    year: 'numeric',
    month: lang === 'en' ? 'short' : 'long',
    day: 'numeric'
  });
}

function collectHomeItems(manifest) {
  const lang = getCurrentLanguage();
  const visible = manifest.filter(item => !item.hidden);

  return {
    lang,
    articles: visible.filter(item => !isToolItem(item) && matchesLanguage(item, lang)).sort(byWeight),
    tools: visible.filter(isToolItem).sort(byWeight)
  };
}

function renderMeta(article, lang) {
  const parts = [];

  if (article.author) {
    parts.push(`<span class="article-card-author"><i class="fas fa-feather-pointed"></i>${escapeHtml(article.author)}</span>`);
  }

  const date = formatDate(article.date, lang);
  if (date) {
    parts.push(`<span><i class="fas fa-calendar-day"></i>${escapeHtml(date)}</span>`);
  }

  if (article.readingMinutes) {
    parts.push(`<span><i class="fas fa-clock"></i>${escapeHtml(formatReadingTime(article.readingMinutes))}</span>`);
  }

  if (parts.length === 0) return '';
  return `<div class="article-card-meta">${parts.join('')}</div>`;
}

function renderArticleCard(article, index, lang) {
  const summary = article.summary
    ? `<p class="article-card-summary">${escapeHtml(article.summary)}</p>`
    : '';

  return `
    <a href="/${escapeHtml(article.path)}" class="article-card">
      <span class="article-card-index">${String(index + 1).padStart(2, '0')}</span>
      <h3 class="article-card-title">${escapeHtml(article.title)}</h3>
      ${summary}
      ${renderMeta(article, lang)}
      <span class="article-card-cta">${escapeHtml(getText('home.readMore'))}<i class="fas fa-arrow-right"></i></span>
    </a>
  `;
}

function renderToolCard(tool) {
  const icon = TOOL_ICONS[tool.path] || DEFAULT_TOOL_ICON;
  const description = getText(`home.tools.${tool.path}`);
  // getText 找不到键时会回退成键名本身，此时不展示描述
  const safeDescription = description.startsWith('home.tools.') ? '' : description;

  return `
    <a href="/${escapeHtml(tool.path)}" class="tool-card">
      <span class="tool-card-icon"><i class="fas ${icon}"></i></span>
      <span class="tool-card-body">
        <span class="tool-card-title">${escapeHtml(tool.title)}</span>
        ${safeDescription ? `<span class="tool-card-desc">${escapeHtml(safeDescription)}</span>` : ''}
      </span>
      <i class="fas fa-chevron-right tool-card-arrow"></i>
    </a>
  `;
}

function renderSection({ title, description, body }) {
  return `
    <section class="home-block">
      <header class="home-block-head">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(description)}</p>
      </header>
      ${body}
    </section>
  `;
}

export function loadHomePage(manifest, article) {
  const { lang, articles, tools } = collectHomeItems(manifest);
  const totalMinutes = articles.reduce((sum, item) => sum + (item.readingMinutes || 0), 0);

  const stats = [
    getText('home.stats.articles', { count: articles.length }),
    totalMinutes ? formatReadingTime(totalMinutes, 'home.stats.reading') : '',
    tools.length ? getText('home.stats.tools', { count: tools.length }) : ''
  ].filter(Boolean);

  const articleBody = articles.length
    ? `<div class="article-grid">${articles.map((item, index) => renderArticleCard(item, index, lang)).join('')}</div>`
    : `<p class="home-empty">${escapeHtml(getText('home.empty'))}</p>`;

  const sections = [
    renderSection({
      title: getText('home.sections.articles.title'),
      description: getText('home.sections.articles.description'),
      body: articleBody
    })
  ];

  if (tools.length) {
    sections.push(renderSection({
      title: getText('home.sections.practice.title'),
      description: getText('home.sections.practice.description'),
      body: `<div class="tool-grid">${tools.map(renderToolCard).join('')}</div>`
    }));
  }

  article.innerHTML = `
    <div class="home-page">
      <div class="home-content">
        <section class="home-hero">
          <span class="home-hero-badge">${escapeHtml(getText('home.badge'))}</span>
          <h1>${escapeHtml(getText('site.title'))}</h1>
          <p class="home-hero-subtitle">${escapeHtml(getText('site.subtitle'))}</p>
          <p class="home-hero-intro">${escapeHtml(getText('home.intro'))}</p>
          <div class="home-stats">
            ${stats.map(text => `<span class="home-stat">${escapeHtml(text)}</span>`).join('')}
          </div>
        </section>

        ${sections.join('')}

        <section class="home-footer">
          <p>${escapeHtml(getText('home.footer'))}</p>
        </section>
      </div>
    </div>
  `;

  // 移除所有活动状态
  document.querySelectorAll('.nav-list a').forEach(a => {
    a.classList.remove('active');
  });
}
