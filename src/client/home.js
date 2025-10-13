// 根据当前语言和类别过滤文章
function getFilteredArticles(manifest, category) {
  const currentLang = window.I18n ? window.I18n.getCurrentLanguage() : 'zh';
  
  let filtered = manifest.filter(m => !m.hidden);
  
  // 根据语言过滤
  filtered = filtered.filter(m => {
    if (currentLang === 'zh') {
      // 中文环境：显示中文文章和没有语言标识的文章
      return !m.path.includes('.en.') && !m.title.includes('(EN)');
    } else {
      // 英文环境：显示英文文章
      return m.path.includes('.en.') || m.title.includes('(EN)') || m.title.includes('English');
    }
  });
  
  // 根据类别过滤
  switch (category) {
    case 'traditional':
      return filtered.filter(m => 
        m.title.includes('张三丰') || m.title.includes('老子') ||
        m.title.includes('Zhang Sanfeng') || m.title.includes('Laozi')
      );
    case 'consciousness':
      return filtered.filter(m => 
        m.title.includes('灵魂出体') || m.title.includes('星体投射') ||
        m.title.includes('Out-of-body') || m.title.includes('Astral Projection')
      );
    case 'practice':
      return filtered.filter(m => m.group === '练习' || m.group === 'Practice');
    default:
      return filtered;
  }
}

// 首页内容模块
export function loadHomePage(manifest, article) {
  // 获取本地化文本
  const getText = window.I18nTexts ? window.I18nTexts.getText : (key) => key;
  
  article.innerHTML = `
    <div class="home-page">

      <div class="home-content">
        <section class="home-intro">
          <h1>${getText('site.title')}</h1>
          <p>${getText('site.subtitle')}</p>
          <p>${getText('home.intro')}</p>
        </section>

        <section class="home-sections">
          <div class="home-section">
            <h3>${getText('home.sections.traditionalAlchemy.title')}</h3>
            <p>${getText('home.sections.traditionalAlchemy.description')}</p>
            <div class="section-articles">
              ${getFilteredArticles(manifest, 'traditional').map(m => `
                <a href="/${encodeURIComponent(m.path)}" class="article-link">
                  <span class="article-title">${m.title}</span>
                  <span class="article-arrow">→</span>
                </a>
              `).join('')}
            </div>
          </div>

          <div class="home-section">
            <h3>${getText('home.sections.consciousnessExploration.title')}</h3>
            <p>${getText('home.sections.consciousnessExploration.description')}</p>
            <div class="section-articles">
              ${getFilteredArticles(manifest, 'consciousness').map(m => `
                <a href="/${encodeURIComponent(m.path)}" class="article-link">
                  <span class="article-title">${m.title}</span>
                  <span class="article-arrow">→</span>
                </a>
              `).join('')}
            </div>
          </div>

          <div class="home-section">
            <h3>${getText('home.sections.practiceTools.title')}</h3>
            <p>${getText('home.sections.practiceTools.description')}</p>
            <div class="section-articles">
              ${getFilteredArticles(manifest, 'practice').map(m => `
                <a href="/${encodeURIComponent(m.path)}" class="article-link">
                  <span class="article-title">${m.title}</span>
                  <span class="article-arrow">→</span>
                </a>
              `).join('')}
            </div>
          </div>
        </section>

        <section class="home-footer">
          <p>${getText('home.footer')}</p>
        </section>
      </div>
    </div>
  `;

  // 移除所有活动状态
  document.querySelectorAll('.nav-list a').forEach(a => {
    a.classList.remove('active');
  });
}
