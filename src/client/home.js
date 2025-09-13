// 首页内容模块
export function loadHomePage(manifest, article) {
  article.innerHTML = `
    <div class="home-page">

      <div class="home-content">
        <section class="home-intro">
          <h1>永恒的信息</h1>
          <p>探索东方智慧的精神宝库，专注于中华传统丹道修炼与意识探索</p>
          <p>这里收录了张三丰、老子等圣贤的丹道秘诀，以及现代灵魂出体与星体投射的实践指南，为追求内在觉醒的修行者提供珍贵的修炼资源。</p>
        </section>

        <section class="home-sections">
          <div class="home-section">
            <h3>🏔️ 传统丹道</h3>
            <p>中华传统丹道修炼的核心秘诀，包含张三丰内丹36诀和老子丹道21诀，传承千年的修真智慧。</p>
            <div class="section-articles">
              ${manifest.filter(m => !m.hidden && (m.title.includes('张三丰') || m.title.includes('老子'))).map(m => `
                <a href="#/${encodeURIComponent(m.path)}" class="article-link">
                  <span class="article-title">${m.title}</span>
                  <span class="article-arrow">→</span>
                </a>
              `).join('')}
            </div>
          </div>

          <div class="home-section">
            <h3>✨ 意识探索</h3>
            <p>现代意识探索与古典智慧的结合，包括灵魂出体技术和星体投射的理论与实践。</p>
            <div class="section-articles">
              ${manifest.filter(m => !m.hidden && (m.title.includes('灵魂出体') || m.title.includes('星体投射'))).map(m => `
                <a href="#/${encodeURIComponent(m.path)}" class="article-link">
                  <span class="article-title">${m.title}</span>
                  <span class="article-arrow">→</span>
                </a>
              `).join('')}
            </div>
          </div>

          <div class="home-section">
            <h3>⚡ 实践工具</h3>
            <p>实用的修炼辅助工具，帮助您更好地进行灵性实践和意识训练。</p>
            <div class="section-articles">
              ${manifest.filter(m => m.group === '练习' && !m.hidden).map(m => `
                <a href="#/${encodeURIComponent(m.path)}" class="article-link">
                  <span class="article-title">${m.title}</span>
                  <span class="article-arrow">→</span>
                </a>
              `).join('')}
            </div>
          </div>
        </section>

        <section class="home-footer">
          <p>从传统丹道到现代意识探索，开启您的内在觉醒之路...</p>
        </section>
      </div>
    </div>
  `;

  // 移除所有活动状态
  document.querySelectorAll('.nav-list a').forEach(a => {
    a.classList.remove('active');
  });
}
