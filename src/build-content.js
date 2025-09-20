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
  { title: '张三丰丹道——《张三丰内丹36诀》', path: 'posts/zh/zhang-sanfeng-36-instructions-on-internal-alchemy.md', group: '博文', subgroup: null, language: 'zh' },
  { title: '合一之道——《老子丹道21诀》', path: 'posts/zh/laozi-internal-alchemy-21-instructions.md', group: '博文', subgroup: null, language: 'zh' },
  { title: '30天学会灵魂出体', path: 'posts/zh/30-days-master-obe.zh.md', group: '博文', subgroup: null, language: 'zh' },
  { title: '论星体投射', path: 'posts/zh/treatise-on-astral-projection.zh.md', group: '博文', subgroup: null, language: 'zh' },
  { title: '瑜伽经 · 站点版', path: 'posts/zh/yoga-sutra/by-site.zh.md', group: '博文', subgroup: '瑜伽经', hidden: true, language: 'zh' },
  { title: '瑜伽经 · 元吾氏译', path: 'posts/zh/yoga-sutra/by-yuanwushi.zh.md', group: '博文', subgroup: '瑜伽经', hidden: true, language: 'zh' },
  
  // 英文内容
  { title: 'Zhang Sanfeng\'s Internal Alchemy — The Thirty‑Six Instructions', path: 'posts/en/zhang-sanfeng-36-instructions-on-internal-alchemy.en.md', group: 'Articles', subgroup: null, language: 'en', weight: 1 },
  { title: 'Out-of-body Adventures (30 Days)', path: 'posts/en/30-days-master-obe.en.md', group: 'Articles', subgroup: null, language: 'en', weight: 2 },
  { title: 'Treatise on Astral Projection', path: 'posts/en/treatise-on-astral-projection.en.md', group: 'Articles', subgroup: null, language: 'en', weight: 3 },
  { title: 'Out of Body Techniques Manual', path: 'posts/en/out-of-body-techniques-manual.en.md', group: 'Articles', subgroup: null, language: 'en', weight: 4 },
  { title: 'Yoga Sutras · Bon Giovanni', path: 'posts/en/yoga-sutra/by-bon-giovanni.en.md', group: 'Articles', subgroup: 'Yoga Sutras', hidden: true, language: 'en' },
  { title: 'Yoga Sutras · Swami Jnaneshvara', path: 'posts/en/yoga-sutra/by-swami-jnaneshvara-bharati.en.md', group: 'Articles', subgroup: 'Yoga Sutras', hidden: true, language: 'en' },
];

function stripFrontmatter(text) {
  if (text.startsWith('---')) {
    const end = text.indexOf('\n---', 3);
    if (end !== -1) return text.slice(end + 4);
  }
  return text;
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
    
    // 去除 frontmatter
    const cleanedContent = stripFrontmatter(mdContent);
    
    // 转换为 HTML
    let htmlContent = marked.parse(cleanedContent);
    
    // 后处理：为标题添加 id 属性
    htmlContent = addHeaderIds(htmlContent);
    
    // 后处理：为外部链接添加 target="_blank"
    htmlContent = addTargetBlankToExternalLinks(htmlContent);
    
    // 创建带有元数据的完整 HTML 结构
    const fullHtml = {
      metadata,
      content: htmlContent,
      generatedAt: getChinaISOString(),
      wordCount: cleanedContent.split(/\s+/).length
    };
    
    // 确保输出目录存在
    ensureDir(dirname(outputPath));
    
    // 写入 JSON 格式（便于 JS 加载和包含元数据）
    writeFileSync(outputPath, JSON.stringify(fullHtml, null, 2), 'utf-8');
    
    return {
      success: true,
      wordCount: fullHtml.wordCount,
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
    items: manifest.map(item => ({
      ...item,
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
