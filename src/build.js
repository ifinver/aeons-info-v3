import { copyFileSync, mkdirSync, readdirSync, statSync, existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildContent } from './build-content.js';
import { bundleChart } from './bundle-chart.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const srcDir = join(__dirname, '..');
const clientDir = join(__dirname, 'client');
const distDir = join(srcDir, 'dist');

function ensureDir(dirPath) {
  try {
    mkdirSync(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

function copyDirectory(src, dest, excludePatterns = []) {
  ensureDir(dest);
  
  const items = readdirSync(src);
  
  for (const item of items) {
    const srcPath = join(src, item);
    const destPath = join(dest, item);
    
    // 检查是否需要排除
    const shouldExclude = excludePatterns.some(pattern => {
      if (typeof pattern === 'string') {
        return item === pattern;
      } else if (pattern instanceof RegExp) {
        return pattern.test(item);
      }
      return false;
    });
    
    if (shouldExclude) {
      console.log(`跳过: ${item}`);
      continue;
    }
    
    const stat = statSync(srcPath);
    
    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath, excludePatterns);
    } else {
      copyFileSync(srcPath, destPath);
      console.log(`复制: ${srcPath} -> ${destPath}`);
    }
  }
}

async function build() {
  console.log('开始构建网站...\n');
  
  // 1. 清理 dist 目录
  if (existsSync(distDir)) {
    console.log('清理 dist 目录...');
    rmSync(distDir, { recursive: true, force: true });
  }
  
  // 2. 创建 dist 目录
  ensureDir(distDir);
  
  // 3. Bundle Chart.js
  console.log('打包 Chart.js...');
  bundleChart();
  
  // 4. 构建内容（MD -> HTML JSON）到 dist/content
  const distContentDir = join(distDir, 'content');
  console.log('构建内容...');
  await buildContent(distContentDir);
  
  // 5. 复制客户端文件到 dist（排除 content 目录和 styles.css）
  console.log('\n复制客户端文件...');
  copyDirectory(clientDir, distDir, ['content', 'styles.css']);
  
  // 6. 构建 CSS 到 dist
  console.log('\n构建 CSS...');
  const { execSync } = await import('child_process');
  try {
    execSync('npx tailwindcss -i ./src/client/styles.css -o ./dist/styles.css --minify', { 
      stdio: 'inherit',
      cwd: srcDir
    });
  } catch (error) {
    console.error('CSS 构建失败:', error.message);
  }

  // 7. 复制下载资源目录到 dist/dl（用于 /dl/ 路径下载）
  console.log('\n复制下载资源...');
  try {
    const dlSrcDir = join(srcDir, 'dl');
    const dlDestDir = join(distDir, 'dl');
    if (existsSync(dlSrcDir) && statSync(dlSrcDir).isDirectory()) {
      copyDirectory(dlSrcDir, dlDestDir);
    } else {
      console.warn(`⚠️ 未找到下载目录: ${dlSrcDir}（已跳过复制）`);
    }
  } catch (error) {
    console.error('复制下载资源失败:', error.message);
  }
  
  console.log('\n✅ 构建完成！');
  console.log(`📁 输出目录: ${distDir}`);
  
  // 显示构建统计
  try {
    const manifestPath = join(distContentDir, 'manifest.json');
    if (existsSync(manifestPath)) {
      const { readFileSync } = await import('fs');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      console.log(`📊 内容统计:`);
      console.log(`   - 文件数量: ${manifest.totalFiles}`);
      console.log(`   - 总字数: ${manifest.totalWordCount.toLocaleString()}`);
      console.log(`   - 总大小: ${(manifest.totalSize / 1024).toFixed(2)} KB`);
    }
  } catch (error) {
    // 忽略统计错误
  }
}

// 如果直接运行此脚本
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  build().catch(console.error);
}

export { build };
