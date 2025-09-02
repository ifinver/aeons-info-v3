import { rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const srcDir = join(__dirname, '..');
const distDir = join(srcDir, 'dist');

function clean() {
  console.log('清理构建产物...\n');
  
  // 清理 dist 目录（如果存在）
  if (existsSync(distDir)) {
    console.log('清理 dist 目录...');
    rmSync(distDir, { recursive: true, force: true });
    console.log('✅ dist 已清理');
  }
  
  console.log('\n🧹 清理完成！');
}

// 如果直接运行此脚本
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  clean();
}

export { clean };
