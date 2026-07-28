import { marked } from 'marked';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 东八区时区工具函数（Node.js版本）
function getChinaISOString() {
  const now = new Date();
  // 获取当前时区偏移量（分钟）
  const localOffset = now.getTimezoneOffset();
  // 东八区偏移量是 -480 分钟（UTC+8）
  const chinaOffset = -480;
  // 计算到东八区的实际偏移量
  const offsetDiff = (chinaOffset - localOffset) * 60 * 1000;
  const chinaTime = new Date(now.getTime() + offsetDiff);
  return chinaTime.toISOString();
}

// 配置 marked 选项
marked.setOptions({
  gfm: true,
  breaks: false,
  headerIds: true,
  mangle: false
});

// 后处理函数，让外部链接在新标签页打开
function addTargetBlankToExternalLinks(html) {
  return html.replace(
    /<a href="(https?:\/\/[^"]+)"([^>]*)>/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer"$2>'
  );
}

// 为标题添加 id 属性，并修复内部链接
function addHeaderIds(html) {
  // 先为标题添加 id
  let result = html.replace(/<h([1-6])>([^<]+)<\/h([1-6])>/g, (match, level, text, endLevel) => {
    if (level !== endLevel) return match;
    
    // 生成 id：移除标点符号，保留中英文和数字
    const id = text.trim()
      .replace(/[^\u4e00-\u9fa5\u0800-\u4e00a-zA-Z0-9\s]/g, '') // 保留中文、英文、数字和空格
      .replace(/\s+/g, '-'); // 空格替换为连字符
    
    return `<h${level} id="${id}">${text}</h${level}>`;
  });
  
  // 修复内部锚点链接：将 URL 编码的链接改为对应的中文 id
  result = result.replace(/<a href="#([^"]+)">([^<]+)<\/a>/g, (match, encodedHref, linkText) => {
    try {
      const decodedHref = decodeURIComponent(encodedHref);
      // 生成与标题 id 相同格式的链接
      const cleanId = decodedHref
        .replace(/[^\u4e00-\u9fa5\u0800-\u4e00a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '-');
      return `<a href="#${cleanId}">${linkText}</a>`;
    } catch (e) {
      return match; // 如果解码失败，保持原样
    }
  });
  
  return result;
}

// 文件清单配置 - 更新为新的目录结构
const manifest = [
  // 中文内容
  { title: '30天学会灵魂出体', path: 'posts/zh/30-days-master-obe.zh.md', group: '博文', subgroup: null, language: 'zh', weight: 1 },
  { title: '论星体投射', path: 'posts/zh/treatise-on-astral-projection.zh.md', group: '博文', subgroup: null, language: 'zh', weight: 2 },

  // 英文内容
  { title: 'Out-of-body Adventures (30 Days)', path: 'posts/en/30-days-master-obe.en.md', group: 'Articles', subgroup: null, language: 'en', weight: 1 },
  { title: 'Treatise on Astral Projection', path: 'posts/en/treatise-on-astral-projection.en.md', group: 'Articles', subgroup: null, language: 'en', weight: 2 },
  { title: 'Out of Body Techniques Manual', path: 'posts/en/out-of-body-techniques-manual.en.md', group: 'Articles', subgroup: null, language: 'en', weight: 3 },
  { title: 'The Method of Nourish Spirit with Eyes Closed', path: 'posts/en/close-eyes-nourish-spirit.en.md', group: 'Articles', subgroup: null, language: 'en', weight: 4 },
];

// 解析 frontmatter，返回 { data, body }
// 只支持 `key: value` 的扁平结构，这也是本站所有 MD 文件实际使用的形式
function parseFrontmatter(text) {
  if (!text.startsWith('---')) return { data: {}, body: text };

  const end = text.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: text };

  const data = {};
  for (const line of text.slice(3, end).split('\n')) {
    const matched = line.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    if (!matched) continue;

    let value = matched[2].trim();
    if (value.length >= 2 && /^(".*"|'.*')$/.test(value)) {
      value = value.slice(1, -1);
    }
    data[matched[1]] = value;
  }

  return { data, body: text.slice(end + 4) };
}

// 中英文混排的字数统计：中文按字计，英文按词计
function countWords(text) {
  const cjkPattern = /[一-鿿㐀-䶿]/g;
  const cjk = (text.match(cjkPattern) || []).length;
  const latin = (text.replace(cjkPattern, ' ').match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g) || []).length;
  return { cjk, latin, total: cjk + latin };
}

// 预估阅读时长（分钟）：中文 400 字/分钟，英文 200 词/分钟
function estimateReadingMinutes({ cjk, latin }) {
  return Math.max(1, Math.round(cjk / 400 + latin / 200));
}

function ensureDir(dirPath) {
  try {
    mkdirSync(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

function processMarkdownFile(sourcePath, outputPath, metadata) {
  console.log(`处理文件: ${sourcePath} -> ${outputPath}`);
  
  try {
    // 读取 MD 文件
    const mdContent = readFileSync(sourcePath, 'utf-8');

    // 解析并去除 frontmatter
    const { data: frontmatter, body: cleanedContent } = parseFrontmatter(mdContent);

    // 转换为 HTML
    let htmlContent = marked.parse(cleanedContent);

    // 后处理：为标题添加 id 属性
    htmlContent = addHeaderIds(htmlContent);

    // 后处理：为外部链接添加 target="_blank"
    htmlContent = addTargetBlankToExternalLinks(htmlContent);

    // 从 frontmatter 提取首页卡片所需的摘要信息
    const counted = countWords(cleanedContent);
    const summaryMeta = {
      summary: frontmatter.summary || '',
      author: frontmatter.author || frontmatter.source || '',
      date: frontmatter.date || '',
      wordCount: counted.total,
      readingMinutes: estimateReadingMinutes(counted)
    };

    // 创建带有元数据的完整 HTML 结构
    const fullHtml = {
      metadata: { ...metadata, ...summaryMeta },
      content: htmlContent,
      generatedAt: getChinaISOString(),
      wordCount: counted.total
    };

    // 确保输出目录存在
    ensureDir(dirname(outputPath));

    // 写入 JSON 格式（便于 JS 加载和包含元数据）
    writeFileSync(outputPath, JSON.stringify(fullHtml, null, 2), 'utf-8');

    return {
      success: true,
      wordCount: fullHtml.wordCount,
      summaryMeta,
      size: Buffer.byteLength(JSON.stringify(fullHtml), 'utf-8')
    };

  } catch (error) {
    console.error(`处理文件失败 ${sourcePath}:`, error);
    return { success: false, error: error.message };
  }
}

function buildContent(outputDir = null) {
  console.log('开始构建内容...\n');
  
  const sourceDir = join(__dirname, 'client', 'content');
  // 如果没有指定输出目录，默认使用 dist/content
  const actualOutputDir = outputDir || join(__dirname, '..', 'dist', 'content');
  
  // 确保输出目录存在
  ensureDir(actualOutputDir);
  
  const results = [];
  // path -> 从 frontmatter/正文提取的摘要信息，用于回填清单
  const summaryByPath = new Map();
  let totalFiles = 0;
  let successfulFiles = 0;
  let totalWordCount = 0;
  let totalSize = 0;

  // 处理清单中的每个文件
  for (const item of manifest) {
    const sourcePath = join(sourceDir, item.path);
    const outputFileName = item.path.replace(/\.md$/, '.json');
    const outputPath = join(actualOutputDir, outputFileName);
    
    totalFiles++;
    
    try {
      // 检查源文件是否存在
      if (!statSync(sourcePath).isFile()) {
        console.warn(`警告: 源文件不存在: ${sourcePath}`);
        continue;
      }
      
      const result = processMarkdownFile(sourcePath, outputPath, {
        title: item.title,
        path: item.path,
        group: item.group,
        subgroup: item.subgroup,
        hidden: item.hidden || false,
        weight: item.weight || 999,
        language: item.language || 'zh'
      });
      
      if (result.success) {
        successfulFiles++;
        totalWordCount += result.wordCount;
        totalSize += result.size;
        summaryByPath.set(item.path, result.summaryMeta);
        results.push({
          path: item.path,
          title: item.title,
          wordCount: result.wordCount,
          size: result.size
        });
      }
      
    } catch (error) {
      console.error(`跳过文件 ${sourcePath}:`, error.message);
    }
  }
  
  // 生成更新的清单文件
  const updatedManifest = {
    generated: getChinaISOString(),
    totalFiles: successfulFiles,
    totalWordCount,
    totalSize,
    // 清单里带上摘要/作者/阅读时长，首页无需再逐篇加载正文
    items: manifest.map(item => ({
      ...item,
      ...(summaryByPath.get(item.path) || {}),
      contentPath: item.path.replace(/\.md$/, '.json')
    })),
    buildResults: results
  };
  
  const manifestPath = join(actualOutputDir, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(updatedManifest, null, 2), 'utf-8');
  
  // 输出构建报告
  console.log('\n构建完成!');
  console.log('================');
  console.log(`处理文件: ${successfulFiles}/${totalFiles}`);
  console.log(`总字数: ${totalWordCount.toLocaleString()}`);
  console.log(`总大小: ${(totalSize / 1024).toFixed(2)} KB`);
  console.log(`清单文件: ${manifestPath}`);
  console.log('\n生成的文件:');
  
  results.forEach(result => {
    console.log(`  ${result.path} (${result.wordCount} 字, ${(result.size / 1024).toFixed(2)} KB)`);
  });
  
  if (successfulFiles < totalFiles) {
    console.warn(`\n警告: ${totalFiles - successfulFiles} 个文件处理失败`);
  }
}

// 如果直接运行此脚本
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  buildContent();
}

export { buildContent };
