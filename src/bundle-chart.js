// 简单的Chart.js bundler
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function bundleChart() {
  try {
    // 读取Chart.js的核心文件
    const chartJsPath = join(__dirname, '..', 'node_modules', 'chart.js', 'dist', 'chart.umd.js');
    const chartJsContent = readFileSync(chartJsPath, 'utf-8');
    
    // 创建一个简单的包装器，使其可以在ES模块中使用
    const bundledContent = `
// Chart.js Bundle for ES Module
(function() {
  ${chartJsContent}
  
  // 导出Chart到全局
  if (typeof window !== 'undefined') {
    window.Chart = Chart;
  }
  
  // 对于ES模块导入
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Chart;
  }
})();

// ES模块导出
export default window.Chart;
`;
    
    // 写入到客户端目录
    const outputPath = join(__dirname, 'client', 'chart.bundle.js');
    writeFileSync(outputPath, bundledContent);
    
    console.log('Chart.js bundle created successfully');
    return true;
  } catch (error) {
    console.error('Failed to bundle Chart.js:', error);
    return false;
  }
}

export { bundleChart };

// 如果直接运行此脚本
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  bundleChart();
}
