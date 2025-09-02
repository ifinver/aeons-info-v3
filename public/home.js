// 首页内容模块
export function loadHomePage(manifest, article) {
  article.innerHTML = `
    <div class="home-page">
      <header class="home-header">
        <h1>永恒的信息</h1>
        <p class="home-subtitle">探索意识、冥想与灵性成长的智慧宝库</p>
      </header>

      <div class="home-content">
        <section class="home-intro">
          <h2>欢迎来到永恒的信息</h2>
          <p>这里汇集了关于灵魂出体、瑜伽、冥想等主题的珍贵资源，帮助您在灵性成长的道路上探索更深的智慧。</p>
          <p>我们的内容包括经典著作的解读、实践指南，以及实用的工具，为您的灵性之旅提供全方位支持。</p>
        </section>

        <section class="home-sections">
          <div class="home-section">
            <h3>📚 经典著作</h3>
            <p>深入研读灵魂出体与瑜伽的经典文献，包括《论星体投射》、《瑜伽经》等重要著作。</p>
            <div class="section-articles">
              ${manifest.filter(m => m.group === '博文' && m.subgroup === null).slice(0, 3).map(m => `
                <a href="#/${encodeURIComponent(m.path)}" class="article-link">
                  <span class="article-title">${m.title}</span>
                  <span class="article-arrow">→</span>
                </a>
              `).join('')}
            </div>
          </div>

          <div class="home-section">
            <h3>🧘 瑜伽智慧</h3>
            <p>探索瑜伽经的多种译本和解读，从不同角度理解瑜伽的精髓。</p>
            <div class="section-articles">
              ${manifest.filter(m => m.subgroup === '瑜伽经').map(m => `
                <a href="#/${encodeURIComponent(m.path)}" class="article-link">
                  <span class="article-title">${m.title}</span>
                  <span class="article-arrow">→</span>
                </a>
              `).join('')}
            </div>
          </div>

          <div class="home-section">
            <h3>⚡ 实践工具</h3>
            <p>实用的冥想和练功辅助工具，帮助您更好地进行灵性实践。</p>
            <div class="section-articles">
              ${manifest.filter(m => m.group === '练习').map(m => `
                <a href="#/${encodeURIComponent(m.path)}" class="article-link">
                  <span class="article-title">${m.title}</span>
                  <span class="article-arrow">→</span>
                </a>
              `).join('')}
            </div>
          </div>
        </section>

        <section class="home-footer">
          <p>选择上方任意内容开始您的灵性探索之旅...</p>
        </section>
      </div>
    </div>
  `;

  // 移除所有活动状态
  document.querySelectorAll('.nav-list a').forEach(a => {
    a.classList.remove('active');
  });
}
