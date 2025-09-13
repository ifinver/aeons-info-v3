// 炼功日志页面
// Chart.js 将通过script标签加载，使用全局Chart对象

// 用户认证状态
let currentUser = null;
let csrfToken = null; // CSRF token从登录响应获取

// 安全的cookie操作函数
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

function deleteCookie(name) {
  document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/; secure; samesite=strict';
}

// 检查是否已登录（通过检查cookie）
function isLoggedIn() {
  return getCookie('authToken') !== undefined;
}

// 将函数和变量导出到全局，以便其他模块访问
window.isLoggedIn = isLoggedIn;
window.currentUser = null;
window.csrfToken = null;

// 安全的文本清理函数
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  
  // 移除潜在的XSS字符
  return input
    .replace(/[<>\"'&]/g, '') // 移除HTML特殊字符
    .replace(/javascript:/gi, '') // 移除javascript协议
    .replace(/on\w+=/gi, '') // 移除事件处理器
    .trim();
}

// 验证邮箱格式
function isValidEmail(email) {
  // 更严格的邮箱验证正则
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  // 长度检查
  if (email.length > 254) return false;
  if (email.length < 5) return false;
  
  // 基本格式检查
  if (!emailRegex.test(email)) return false;
  
  // 防止危险字符
  const dangerousChars = /<|>|"|'|&|;|\||`/;
  if (dangerousChars.test(email)) return false;
  
  return true;
}

// Chart.js 管理器 - 优化加载和复用
class ChartManager {
  constructor() {
    this.isChartReady = false;
    this.chartLoadPromise = null;
    this.practiceChart = null;
    this.chartContainer = null;
  }

  // 预加载 Chart.js
  preloadChart() {
    if (!this.chartLoadPromise) {
      this.chartLoadPromise = this.waitForChart();
    }
    return this.chartLoadPromise;
  }

  async waitForChart() {
    if (this.isChartReady) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      if (typeof Chart !== 'undefined') {
        this.isChartReady = true;
        console.log('📊 Chart.js 已就绪');
        resolve();
      } else {
        const checkChart = () => {
          if (typeof Chart !== 'undefined') {
            this.isChartReady = true;
            console.log('📊 Chart.js 加载完成');
            resolve();
          } else {
            setTimeout(checkChart, 50); // 更短的检查间隔
          }
        };
        checkChart();
      }
    });
  }

  // 优化的图表创建
  async createChart(container, records) {
    await this.preloadChart();
    
    const canvas = container.querySelector('#practice-chart');
    if (!canvas) {
      throw new Error('找不到图表画布元素');
    }

    const ctx = canvas.getContext('2d');
    this.chartContainer = container;
    
    // 销毁现有图表
    if (this.practiceChart) {
      this.practiceChart.destroy();
      this.practiceChart = null;
    }

    // 准备图表数据
    const chartData = this.prepareChartData(records);

    // 使用 requestAnimationFrame 确保DOM更新完成
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        this.practiceChart = new Chart(ctx, {
          type: 'line',
          data: chartData,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 200 // 减少动画时间
            },
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  usePointStyle: true,
                  padding: 20,
                  font: {
                    size: 12,
                    weight: '500'
                  }
                }
              },
              tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                borderColor: '#3b82f6',
                borderWidth: 1,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                  label: function(context) {
                    if (context.datasetIndex === 0) {
                      // 对于单个数据点，从records中获取原始数据
                      const recordIndex = context.dataIndex;
                      const originalMinutes = records[recordIndex].totalMinutes;
                      const h = Math.floor(originalMinutes / 60);
                      const m = originalMinutes % 60;
                      return `炼功时长: ${h}小时${m}分钟`;
                    } else {
                      // 对于平均值
                      const totalMinutes = records.reduce((sum, record) => sum + record.totalMinutes, 0);
                      const averageMinutes = records.length > 0 ? Math.round(totalMinutes / records.length) : 0;
                      const h = Math.floor(averageMinutes / 60);
                      const m = averageMinutes % 60;
                      return `平均时长: ${h}小时${m}分钟`;
                    }
                  }
                }
              }
            },
            scales: {
              x: {
                display: true,
                title: {
                  display: true,
                  text: '日期',
                  font: {
                    size: 14,
                    weight: '600'
                  }
                },
                grid: {
                  color: 'rgba(0, 0, 0, 0.1)',
                }
              },
              y: {
                display: true,
                title: {
                  display: true,
                  text: '时长 (小时)',
                  font: {
                    size: 14,
                    weight: '600'
                  }
                },
                beginAtZero: true,
                grid: {
                  color: 'rgba(0, 0, 0, 0.1)',
                },
                ticks: {
                  callback: function(value) {
                    return value + 'h';
                  }
                }
              }
            },
            interaction: {
              mode: 'nearest',
              axis: 'x',
              intersect: false
            }
          }
        });
        
        console.log('📊 图表创建完成');
        resolve(this.practiceChart);
      });
    });
  }

  // 准备图表数据
  prepareChartData(records) {
    if (!records || records.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    const labels = records.map(record => {
      const date = new Date(record.date);
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    });
    
    const data = records.map(record => (record.totalMinutes / 60).toFixed(1)); // 转换为小时
    
    // 计算平均值
    const totalMinutes = records.reduce((sum, record) => sum + record.totalMinutes, 0);
    const averageMinutes = records.length > 0 ? Math.round(totalMinutes / records.length) : 0;
    const averageHours = averageMinutes / 60;
    const averageLine = new Array(records.length).fill(averageHours.toFixed(1));

    return {
      labels: labels,
      datasets: [
        {
          label: '炼功时长 (小时)',
          data: data,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
        },
        {
          label: '平均时长',
          data: averageLine,
          borderColor: '#ef4444',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0,
        }
      ]
    };
  }

  // 更新图表数据（避免重新创建）
  async updateChartData(records) {
    if (this.practiceChart && records) {
      const newData = this.prepareChartData(records);
      this.practiceChart.data = newData;
      this.practiceChart.update('none'); // 无动画更新
      console.log('📊 图表数据已更新');
    }
  }

  // 销毁图表
  destroy() {
    if (this.practiceChart) {
      this.practiceChart.destroy();
      this.practiceChart = null;
      console.log('📊 图表已销毁');
    }
  }

  // 检查是否已初始化
  isInitialized() {
    return !!this.practiceChart;
  }
}

// 创建全局图表管理器实例
const chartManager = new ChartManager();

// 等待Chart.js加载完成（保持向后兼容）
function waitForChart() {
  return chartManager.preloadChart();
}

// 清理炼功计时器页面的样式影响
export function cleanupPracticeTimerPage(container) {
  // 移除可能添加的类名
  container.classList.remove('practice-timer-container');
  // 清理图表实例
  chartManager.destroy();
}

export async function loadPracticeTimerPage(container) {
  console.log('🚀 开始加载炼功日志页面...');
  performanceMonitor.start('页面总加载时间');
  
  // 清理之前可能存在的类名
  container.classList.remove('practice-timer-container');
  
  // 根据屏幕大小设置不同的边距
  const isMobile = window.innerWidth <= 768;
  const marginStyle = isMobile 
    ? "margin: -15px -15px 0 -15px; padding: 15px;" 
    : "margin: -20px -20px 0 -20px; padding: 20px;";
  
  // 立即显示加载状态
  container.innerHTML = `
    <div class="practice-timer-loading" style="${marginStyle}">
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p class="loading-text">正在加载炼功日志...</p>
        <div class="loading-steps">
          <div class="step" id="step-auth">🔐 验证用户身份</div>
          <div class="step" id="step-chart">📊 准备图表组件</div>
          <div class="step" id="step-data">📊 加载炼功数据</div>
        </div>
      </div>
    </div>
  `;

  // 添加加载状态样式
  addLoadingStyles();

  try {
    // 第一步：并行执行认证检查和Chart.js预加载
    console.log('⚡ 并行执行认证检查和Chart.js预加载...');
    updateLoadingStep('step-auth', 'active');
    updateLoadingStep('step-chart', 'active');

    performanceMonitor.start('认证检查');
    performanceMonitor.start('Chart.js加载');

    const [authResult, chartReady] = await Promise.allSettled([
      checkUserAuthentication(),
      waitForChart()
    ]);

    performanceMonitor.end('认证检查');
    performanceMonitor.end('Chart.js加载');

    // 检查认证结果
    if (authResult.status === 'rejected' || !authResult.value.authenticated) {
      console.log('❌ 用户未认证，显示登录界面');
      updateLoadingStep('step-auth', 'error');
      
      // 显示登录界面
      showAuthInterface(container, marginStyle);
      return;
    }

    updateLoadingStep('step-auth', 'completed');
    console.log('✅ 用户认证成功');

    // 检查Chart.js加载结果
    if (chartReady.status === 'rejected') {
      console.error('❌ Chart.js 加载失败:', chartReady.reason);
      updateLoadingStep('step-chart', 'error');
      throw new Error('Chart.js 加载失败');
    }

    updateLoadingStep('step-chart', 'completed');
    console.log('✅ Chart.js 已就绪');

    // 第二步：立即显示UI结构
    console.log('🎨 立即显示炼功计时器界面结构...');
    renderPracticeTimerInterface(container, marginStyle);

    // 第三步：异步加载数据
    updateLoadingStep('step-data', 'active');
    console.log('📊 开始加载炼功数据...');
    
    // 不等待数据加载完成，立即初始化界面
    initPracticeTimerInterface();
    
    // 异步加载数据
    loadPracticeDataAsync();
    
    // 异步加载炼功日志
    loadPracticeLogs();

    // 记录页面加载完成时间
    performanceMonitor.end('页面总加载时间');
    performanceMonitor.logSummary();

  } catch (error) {
    console.error('❌ 炼功计时器加载失败:', error);
    performanceMonitor.end('页面总加载时间');
    showErrorState(container, error.message, marginStyle);
  }
}

// 认证状态检查（优化版本）
async function checkUserAuthentication() {
  // 快速检查cookie
  if (!isLoggedIn()) {
    return { authenticated: false, reason: 'no_token' };
  }

  // 如果已有用户信息和CSRF token，直接返回成功
  if (currentUser && csrfToken) {
    console.log('🚀 使用缓存的认证信息');
    return { 
      authenticated: true, 
      user: currentUser, 
      csrfToken: csrfToken 
    };
  }

  // 需要获取用户信息
  console.log('🔄 获取用户信息...');
  try {
    const user = await getCurrentUser();
    if (!user || !csrfToken) {
      // 清除无效cookie
      deleteCookie('authToken');
      return { authenticated: false, reason: 'invalid_token' };
    }

    return { 
      authenticated: true, 
      user: user, 
      csrfToken: csrfToken 
    };
  } catch (error) {
    console.error('获取用户信息失败:', error);
    deleteCookie('authToken');
    return { authenticated: false, reason: 'auth_error' };
  }
}

// 显示认证界面
function showAuthInterface(container, marginStyle) {
  container.innerHTML = `
    <div class="auth-page" style="${marginStyle}">
      <div class="auth-container">
        <div class="auth-header">
          <h1>炼功日志</h1>
          <p>请登录或注册以使用炼功日志功能</p>
        </div>
        
        <!-- 登录表单 -->
        <div class="auth-form" id="login-form">
          <h2>登录</h2>
          <div class="form-group">
            <label for="login-email">邮箱</label>
            <input type="email" id="login-email" class="form-input" placeholder="请输入邮箱" />
          </div>
          <div class="form-group">
            <label for="login-password">密码</label>
            <input type="password" id="login-password" class="form-input" placeholder="请输入密码" />
          </div>
          <button id="login-btn" class="auth-btn primary">登录</button>
          <div class="auth-links">
            <button id="show-register-btn" class="link-btn">没有账户？去注册</button>
            <button id="forgot-password-btn" class="link-btn">忘记密码？</button>
          </div>
        </div>
        
        <!-- 注册表单 -->
        <div class="auth-form hidden" id="register-form">
          <h2>注册</h2>
          <div class="form-group">
            <label for="register-email">邮箱</label>
            <input type="email" id="register-email" class="form-input" placeholder="请输入邮箱" />
          </div>
          <button id="register-btn" class="auth-btn primary">发送注册邮件</button>
          <div class="auth-links">
            <button id="show-login-btn" class="link-btn">已有账户？去登录</button>
          </div>
        </div>
        
        <!-- 忘记密码表单 -->
        <div class="auth-form hidden" id="forgot-password-form">
          <h2>忘记密码</h2>
          <div class="form-group">
            <label for="forgot-email">邮箱</label>
            <input type="email" id="forgot-email" class="form-input" placeholder="请输入邮箱" />
          </div>
          <button id="send-reset-btn" class="auth-btn primary">发送重置邮件</button>
          <div class="auth-links">
            <button id="back-to-login-btn" class="link-btn">返回登录</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 添加认证页面样式
  addAuthStyles();
  
  // 初始化认证功能
  initAuth();
}

// 渲染炼功计时器界面结构
function renderPracticeTimerInterface(container, marginStyle) {
  container.innerHTML = `
    <div class="practice-timer-page" style="${marginStyle}">
      <!-- 标题和添加按钮 -->
      <div class="header-row mb-6">
        <h1 class="page-title" style="margin-bottom: 0px;">炼功计时器</h1>
        <button id="add-data-btn" class="add-btn">+</button>
      </div>
      
      <!-- 图表容器 -->
      <div class="chart-container mb-8">
        <div class="chart-loading">
          <div class="chart-skeleton"></div>
          <p>正在加载图表...</p>
        </div>
        <canvas id="practice-chart" width="400" height="200" style="display: none;"></canvas>
      </div>

      <!-- 统计信息 -->
      <div class="stats-grid mb-8">
        <div class="stat-card">
          <div class="stat-label">总时长</div>
          <div class="stat-value skeleton-text" id="total-time">加载中...</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">平均每天</div>
          <div class="stat-value skeleton-text" id="average-time">加载中...</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">记录天数</div>
          <div class="stat-value skeleton-text" id="total-days">加载中...</div>
        </div>
      </div>

      <!-- 炼功日志板块 -->
      <div class="practice-log-section">
        <div class="log-header">
          <h2 class="log-title">炼功日志</h2>
          <button id="add-log-btn" class="add-log-btn">+</button>
        </div>
        
        <div class="log-timeline" id="log-timeline">
          <div class="log-loading">
            <div class="loading-spinner"></div>
            <p>正在加载日志...</p>
          </div>
        </div>
      </div>

    </div>
    
    <!-- 添加数据对话框 -->
    <div id="add-data-modal" class="modal-overlay hidden">
      <div class="modal-content">
        <div class="modal-header">
          <h3>添加炼功记录</h3>
          <button id="close-modal" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="practice-date">日期</label>
            <input type="date" id="practice-date" class="form-input" />
          </div>
          <div class="form-group">
            <label for="practice-time">炼功时长</label>
            <div class="time-input-group">
              <input type="number" id="practice-hours" class="time-input" placeholder="0" min="0" max="23" />
              <span class="time-separator">小时</span>
              <input type="number" id="practice-minutes" class="time-input" placeholder="0" min="0" max="59" />
              <span class="time-separator">分钟</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button id="cancel-btn" class="cancel-btn">取消</button>
          <button id="confirm-btn" class="confirm-btn">确定</button>
        </div>
      </div>
    </div>
    
    <!-- 添加/编辑日志对话框 -->
    <div id="add-log-modal" class="modal-overlay hidden">
      <div class="modal-content log-modal-content">
        <div class="modal-header">
          <h3 id="log-modal-title">添加炼功日志</h3>
          <button id="close-log-modal" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="log-date">日期</label>
            <input type="date" id="log-date" class="form-input" />
          </div>
          <div class="form-group">
            <label for="log-content">日志内容</label>
            <div class="markdown-editor">
              <div class="editor-toolbar">
                <button type="button" class="toolbar-btn" onclick="insertMarkdown('**', '**')" title="粗体">
                  <strong>B</strong>
                </button>
                <button type="button" class="toolbar-btn" onclick="insertMarkdown('*', '*')" title="斜体">
                  <em>I</em>
                </button>
                <button type="button" class="toolbar-btn" onclick="insertMarkdown('## ', '')" title="标题">
                  H
                </button>
                <button type="button" class="toolbar-btn" onclick="insertMarkdown('- ', '')" title="列表">
                  •
                </button>
                <button type="button" class="toolbar-btn" onclick="insertMarkdown('> ', '')" title="引用">
                  "
                </button>
                <button type="button" class="toolbar-btn" onclick="insertMarkdown('\`', '\`')" title="代码">
                  &lt;/&gt;
                </button>
              </div>
              <textarea 
                id="log-content" 
                class="form-textarea" 
                placeholder="支持Markdown格式，例如：

## 今日炼功心得
今天练习了**静坐冥想**，持续了30分钟。

### 体验：
- 心境比较平静
- 注意力集中度有所提升
- *身体感觉轻松*

> 坚持练习，必有收获！

下次要尝试更长时间的练习。"
                rows="9"
              ></textarea>
            </div>
            <div class="markdown-help">

              <small>
                支持Markdown格式：**粗体** *斜体* ## 标题 - 列表 > 引用 \`代码\`
              </small>
            </div>
          </div>
          <div class="form-group">
            <label>预览</label>
            <div id="log-preview" class="log-preview">
              <div class="preview-placeholder">在上方输入内容后，这里会显示预览</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button id="cancel-log-btn" class="cancel-btn">取消</button>
          <button id="confirm-log-btn" class="confirm-btn">保存</button>
        </div>
      </div>
    </div>
  `;

  // 添加样式
  addPracticeTimerStyles();
}

// 初始化炼功计时器界面（不等待数据）
function initPracticeTimerInterface() {
  // 设置默认日期为今天
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('practice-date');
  if (dateInput) {
    dateInput.value = today;
  }
  
  // 绑定事件
  bindEvents();
  
  console.log('✅ 炼功计时器界面初始化完成');
}

// 异步加载炼功数据
async function loadPracticeDataAsync() {
  performanceMonitor.start('数据加载');
  try {
    const response = await fetch('/api/kv/practice-time', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
      }
    });

    if (!response.ok) {
      throw new Error('获取数据失败');
    }
    
    const aggregatedData = await response.json();
    console.log(`✅ 成功获取聚合炼功数据，包含 ${aggregatedData.summary?.totalRecords || 0} 条记录`);
    
    // 将聚合数据转换为记录数组（兼容现有的图表和统计函数）
    const records = Object.entries(aggregatedData.records || {}).map(([date, record]) => ({
      date,
      ...record
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // 更新统计信息
    updateStats(records);
    
    // 隐藏骨架屏，显示真实数据
    const chartLoading = document.querySelector('.chart-loading');
    const chartCanvas = document.getElementById('practice-chart');
    
    if (chartLoading && chartCanvas) {
      chartLoading.style.display = 'none';
      chartCanvas.style.display = 'block';
    }
    
    // 创建图表
    const container = document.querySelector('.practice-timer-page');
    if (container) {
      await chartManager.createChart(container, records);
    }
    
    // 移除骨架屏样式
    document.querySelectorAll('.skeleton-text').forEach(el => {
      el.classList.remove('skeleton-text');
    });
    
    console.log('✅ 炼功数据加载完成');
    performanceMonitor.end('数据加载');
    
  } catch (error) {
    console.error('加载炼功数据失败:', error);
    performanceMonitor.end('数据加载');
    
    // 显示错误状态
    const chartLoading = document.querySelector('.chart-loading');
    if (chartLoading) {
      chartLoading.innerHTML = `
        <div class="error-state">
          <p>❌ 数据加载失败</p>
          <button onclick="loadPracticeDataAsync()" class="retry-btn">重试</button>
        </div>
      `;
    }
    
    showMessage('加载数据失败: ' + error.message, 'error');
  }
}

// 显示错误状态
function showErrorState(container, message, marginStyle) {
  container.innerHTML = `
    <div class="error-page" style="${marginStyle}">
      <div class="error-container">
        <h2>😔 加载失败</h2>
        <p>${message}</p>
        <button onclick="location.reload()" class="retry-btn">重新加载</button>
      </div>
    </div>
  `;
}

// 更新加载步骤状态
function updateLoadingStep(stepId, status) {
  const step = document.getElementById(stepId);
  if (step) {
    step.className = `step ${status}`;
    
    const statusIcons = {
      'active': '⏳',
      'completed': '✅',
      'error': '❌'
    };
    
    const icon = statusIcons[status] || '⏳';
    const text = step.textContent.replace(/^[⏳✅❌]\s*/, '');
    step.textContent = `${icon} ${text}`;
  }
}

// 添加加载状态样式
function addLoadingStyles() {
  const existingStyle = document.getElementById('loading-styles');
  if (existingStyle) return;

  const style = document.createElement('style');
  style.id = 'loading-styles';
  style.textContent = `
    .practice-timer-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      text-align: center;
    }
    
    .loading-container {
      max-width: 300px;
    }
    
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid var(--border, #e2e8f0);
      border-top: 4px solid var(--primary, #3b82f6);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .loading-text {
      font-size: 18px;
      font-weight: 500;
      color: var(--text, #1f2937);
      margin-bottom: 20px;
    }
    
    .loading-steps {
      text-align: left;
    }
    
    .step {
      padding: 8px 0;
      font-size: 14px;
      color: var(--muted, #6b7280);
      transition: color 0.3s ease;
    }
    
    .step.active {
      color: var(--primary, #3b82f6);
      font-weight: 500;
    }
    
    .step.completed {
      color: var(--success, #10b981);
      font-weight: 500;
    }
    
    .step.error {
      color: var(--error, #ef4444);
      font-weight: 500;
    }
    
    .chart-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      text-align: center;
    }
    
    .chart-skeleton {
      width: 100%;
      height: 200px;
      background: linear-gradient(90deg, 
        var(--border, #e2e8f0) 25%, 
        var(--card-bg, #f9fafb) 50%, 
        var(--border, #e2e8f0) 75%);
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s infinite;
      border-radius: 8px;
      margin-bottom: 15px;
    }
    
    @keyframes skeleton-loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    
    .skeleton-text {
      background: linear-gradient(90deg, 
        var(--border, #e2e8f0) 25%, 
        var(--card-bg, #f9fafb) 50%, 
        var(--border, #e2e8f0) 75%);
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s infinite;
      border-radius: 4px;
      color: transparent !important;
    }
    
    .error-state {
      padding: 20px;
      text-align: center;
    }
    
    .retry-btn {
      background: var(--primary, #3b82f6);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 10px;
      transition: background 0.2s ease;
    }
    
    .retry-btn:hover {
      background: var(--primary-dark, #2563eb);
    }
    
    .error-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      text-align: center;
    }
    
    .error-container h2 {
      color: var(--error, #ef4444);
      margin-bottom: 10px;
    }
    
    .error-container p {
      color: var(--muted, #6b7280);
      margin-bottom: 20px;
    }
  `;
  
  document.head.appendChild(style);
}

function addPracticeTimerStyles() {
  const existingStyle = document.getElementById('practice-timer-styles');
  if (existingStyle) return;

  const style = document.createElement('style');
  style.id = 'practice-timer-styles';
  style.textContent = `
    .practice-timer-page {
      max-width: 1000px;
      margin: 0 auto;
    }
    
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      margin-top: 8px;
      margin-left: 20PX;
      margin-right: 20px;
    }
    
    .page-title {
      font-size: 2rem;
      font-weight: bold;
      color: var(--text, #1f2937);
      margin: 0;
    }
    
    .add-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      border: none;
      font-size: 20px;
      font-weight: 300;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    
    .add-btn:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
    }
    
    .add-btn:active {
      transform: translateY(0) scale(0.95);
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 0px;
      margin-top: 8px;
      margin-left: 20px;
      margin-right: 20px;
    }
    
    .stat-card {
      background: var(--card-bg, #ffffff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 12px;
      padding: 12px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    
    .stat-label {
      font-size: 14px;
      color: var(--muted, #6b7280);
      margin-bottom: 8px;
      font-weight: 500;
    }
    
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: var(--primary, #3b82f6);
    }
    
    .chart-container {
      background: var(--card-bg, #ffffff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 12px;
      padding: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin: 0 -5px 20px -5px;
      min-height: 350px;
    }
    
    #practice-chart {
      width: 100% !important;
      height: 340px !important;
    }
    
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    
    .modal-overlay.hidden {
      display: none;
    }
    
    .modal-content {
      background: var(--card-bg, #ffffff);
      border-radius: 12px;
      width: 90%;
      max-width: 400px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }
    
    .modal-header {
      padding: 20px;
      border-bottom: 1px solid var(--border, #e2e8f0);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .modal-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    
    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: var(--muted, #6b7280);
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 0.2s ease;
    }
    
    .close-btn:hover {
      background: var(--border, #e2e8f0);
    }
    
    .modal-body {
      padding: 20px;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--text, #374151);
    }
    
    .form-input {
      width: 100%;
      padding: 12px;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      box-sizing: border-box;
    }
    
    .form-input:focus {
      outline: none;
      border-color: var(--primary, #3b82f6);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .time-input-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .time-input {
      width: 80px;
      padding: 12px;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 8px;
      font-size: 14px;
      text-align: center;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    
    .time-input:focus {
      outline: none;
      border-color: var(--primary, #3b82f6);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .time-separator {
      font-size: 14px;
      color: var(--muted, #6b7280);
      font-weight: 500;
    }
    
    .modal-footer {
      padding: 20px;
      border-top: 1px solid var(--border, #e2e8f0);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    
    .cancel-btn {
      padding: 10px 20px;
      border: 1px solid var(--border, #e2e8f0);
      background: var(--card-bg, #ffffff);
      color: var(--text, #374151);
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    
    .cancel-btn:hover {
      background: var(--border, #f3f4f6);
    }
    
    .confirm-btn {
      padding: 10px 20px;
      background: var(--primary, #3b82f6);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    
    .confirm-btn:hover {
      background: var(--primary-dark, #2563eb);
    }
    
    .confirm-btn:disabled {
      background: var(--muted, #9ca3af);
      cursor: not-allowed;
    }
    
    /* 炼功日志板块样式 */
    .practice-log-section {
      margin: 32px 20px 0 20px;
    }
    
    .log-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    
    .log-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text, #1f2937);
      margin: 0;
    }
    
    .add-log-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border: none;
      font-size: 20px;
      font-weight: 300;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    
    .add-log-btn:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
    }
    
    .add-log-btn:active {
      transform: translateY(0) scale(0.95);
    }
    
    .log-timeline {
      background: var(--card-bg, #ffffff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      min-height: 300px;
    }
    
    .log-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 260px;
      text-align: center;
    }
    
    .log-loading .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border, #e2e8f0);
      border-top: 3px solid var(--primary, #3b82f6);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }
    
    .log-loading p {
      color: var(--muted, #6b7280);
      font-size: 14px;
      margin: 0;
    }
    
    .timeline-container {
      position: relative;
      padding-left: 40px;
    }
    
    .timeline-line {
      position: absolute;
      left: 18px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: linear-gradient(to bottom, var(--primary, #3b82f6), transparent);
    }
    
    .timeline-item {
      position: relative;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border, #e2e8f0);
    }
    
    .timeline-item:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }
    
    .timeline-dot {
      position: absolute;
      left: -58px;
      top: 8px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--primary, #3b82f6);
      border: 3px solid var(--card-bg, #ffffff);
      box-shadow: 0 0 0 2px var(--primary, #3b82f6);
    }
    
    .timeline-date {
      font-size: 14px;
      font-weight: 600;
      color: var(--primary, #3b82f6);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    
    .date-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .timeline-content {
      background: var(--bg-panel, #f9fafb);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 8px;
      padding: 16px;
      position: relative;
    }
    
    .timeline-content::before {
      content: '';
      position: absolute;
      left: -8px;
      top: 16px;
      width: 0;
      height: 0;
      border-top: 8px solid transparent;
      border-bottom: 8px solid transparent;
      border-right: 8px solid var(--border, #e2e8f0);
    }
    
    .timeline-content::after {
      content: '';
      position: absolute;
      left: -7px;
      top: 16px;
      width: 0;
      height: 0;
      border-top: 8px solid transparent;
      border-bottom: 8px solid transparent;
      border-right: 8px solid var(--bg-panel, #f9fafb);
    }
    
    .log-content {
      color: var(--text, #374151);
      line-height: 1.6;
      font-size: 14px;
    }
    
    .log-content h1, .log-content h2, .log-content h3, 
    .log-content h4, .log-content h5, .log-content h6 {
      margin-top: 16px;
      margin-bottom: 8px;
      color: var(--text, #1f2937);
    }
    
    .log-content h1 { font-size: 18px; }
    .log-content h2 { font-size: 16px; }
    .log-content h3 { font-size: 15px; }
    .log-content h4, .log-content h5, .log-content h6 { font-size: 14px; }
    
    .log-content p {
      margin-bottom: 12px;
    }
    
    .log-content ul, .log-content ol {
      margin-bottom: 12px;
      padding-left: 20px;
    }
    
    .log-content li {
      margin-bottom: 4px;
    }
    
    .log-content blockquote {
      border-left: 3px solid var(--primary, #3b82f6);
      padding-left: 12px;
      margin: 12px 0;
      color: var(--muted, #6b7280);
      font-style: italic;
    }
    
    .log-content code {
      background: var(--border, #e2e8f0);
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 13px;
      font-family: monospace;
    }
    
    .log-content pre {
      background: var(--border, #e2e8f0);
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 12px 0;
    }
    
    .log-content pre code {
      background: none;
      padding: 0;
    }
    
    .log-actions {
      display: flex;
      flex-shrink: 0;
      margin-right: 9px;
    }
    
    .log-action-btn {
      padding: 4px 8px;
      font-size: 12px;
      border: 1px solid var(--border, #e2e8f0);
      border-bottom: none;
      background: var(--card-bg, #ffffff);
      color: var(--muted, #6b7280);
      border-radius: 4px 4px 0 0;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .log-action-btn:hover {
      background: var(--border, #f3f4f6);
      color: var(--text, #374151);
    }
    
    .log-action-btn.edit {
      color: var(--primary, #3b82f6);
      border-right: none;
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
      border-bottom-left-radius: 0;
    }
    
    .log-action-btn.delete {
      color: var(--error, #ef4444);
      border-left: none;
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }
    
    .empty-logs {
      text-align: center;
      padding: 60px 20px;
      color: var(--muted, #6b7280);
    }
    
    .empty-logs-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
    
    .empty-logs-text {
      font-size: 16px;
      margin-bottom: 8px;
    }
    
    .empty-logs-hint {
      font-size: 14px;
      opacity: 0.8;
    }
    
    /* 日志弹窗样式 */
    .log-modal-content {
      max-width: 800px;
      width: 95%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }
    
    .log-modal-content .modal-body {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
    }
    
    .log-modal-content .modal-header,
    .log-modal-content .modal-footer {
      flex-shrink: 0;
    }
    
    .markdown-editor {
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 8px;
      overflow: hidden;
    }
    
    .editor-toolbar {
      background: var(--bg-panel, #f9fafb);
      border-bottom: 1px solid var(--border, #e2e8f0);
      padding: 8px 12px;
      display: flex;
      gap: 8px;
    }
    
    .toolbar-btn {
      padding: 6px 10px;
      background: var(--card-bg, #ffffff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      color: var(--text, #374151);
      transition: all 0.2s ease;
      min-width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .toolbar-btn:hover {
      background: var(--primary, #3b82f6);
      color: white;
      border-color: var(--primary, #3b82f6);
    }
    
    .form-textarea {
      width: 100%;
      padding: 16px;
      border: none;
      border-radius: 0;
      font-size: 14px;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace;
      line-height: 1.5;
      resize: vertical;
      min-height: 150px;
      max-height: 300px;
      background: var(--card-bg, #ffffff);
      color: var(--text, #374151);
      box-sizing: border-box;
    }
    
    .form-textarea:focus {
      outline: none;
      background: var(--card-bg, #ffffff);
    }
    
    .form-textarea::placeholder {
      color: var(--muted, #9ca3af);
      line-height: 1.5;
    }
    
    .markdown-help {
      margin-top: 8px;
      padding: 8px 12px;
      background: var(--bg-panel, #f9fafb);
      border-radius: 4px;
    }
    
    .markdown-help small {
      color: var(--muted, #6b7280);
      font-size: 12px;
    }
    
    .log-preview {
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 8px;
      padding: 16px;
      background: var(--card-bg, #ffffff);
      min-height: 150px;
      max-height: 250px;
      overflow-y: auto;
    }
    
    .preview-placeholder {
      color: var(--muted, #9ca3af);
      font-style: italic;
      text-align: center;
      padding: 40px 20px;
    }
    
    /* 预览内容样式 */
    .log-preview h1, .log-preview h2, .log-preview h3,
    .log-preview h4, .log-preview h5, .log-preview h6 {
      margin-top: 16px;
      margin-bottom: 8px;
      color: var(--text, #1f2937);
    }
    
    .log-preview h1 { font-size: 20px; font-weight: bold; }
    .log-preview h2 { font-size: 18px; font-weight: bold; }
    .log-preview h3 { font-size: 16px; font-weight: 600; }
    .log-preview h4, .log-preview h5, .log-preview h6 { 
      font-size: 14px; 
      font-weight: 600; 
    }
    
    .log-preview p {
      margin-bottom: 12px;
      line-height: 1.6;
      color: var(--text, #374151);
    }
    
    .log-preview ul, .log-preview ol {
      margin-bottom: 12px;
      padding-left: 24px;
    }
    
    .log-preview li {
      margin-bottom: 4px;
      line-height: 1.6;
    }
    
    .log-preview blockquote {
      border-left: 3px solid var(--primary, #3b82f6);
      padding-left: 16px;
      margin: 16px 0;
      color: var(--muted, #6b7280);
      font-style: italic;
      background: var(--bg-panel, #f9fafb);
      padding: 12px 16px;
      border-radius: 0 4px 4px 0;
    }
    
    .log-preview code {
      background: var(--border, #e2e8f0);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 13px;
      font-family: monospace;
      color: var(--text, #374151);
    }
    
    .log-preview pre {
      background: var(--border, #e2e8f0);
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 16px 0;
      font-family: monospace;
      font-size: 13px;
      line-height: 1.4;
    }
    
    .log-preview pre code {
      background: none;
      padding: 0;
      font-size: inherit;
    }
    
    .log-preview strong {
      font-weight: 600;
      color: var(--text, #1f2937);
    }
    
    .log-preview em {
      font-style: italic;
      color: var(--muted, #6b7280);
    }
    
    .log-preview a {
      color: var(--primary, #3b82f6);
      text-decoration: underline;
    }
    
    .log-preview a:hover {
      color: var(--primary-dark, #2563eb);
    }

    @media (max-width: 768px) {
      .practice-timer-page {
        padding: 15px;
      }
      
      .header-row {
        margin-bottom: 28px;
        margin-top: 6px;
      }
      
      .page-title {
        font-size: 1.75rem;
      }
      
      .add-btn {
        width: 32px;
        height: 32px;
        font-size: 18px;
      }
      
      .stats-grid {
        grid-template-columns: 1fr;
        gap: 16px;
        margin-bottom: 10px;
        margin-top: 6px;
      }
      
      .chart-container {
        margin: 0 -3px 20px -3px;
        padding: 8px;
        min-height: 280px;
      }
      
      #practice-chart {
        height: 260px !important;
      }
      
      .modal-content {
        width: 95%;
        margin: 20px;
      }
      
      /* 移动端日志样式调整 */
      .practice-log-section {
        margin: 24px 0 0 0;
      }
      
      .log-title {
        font-size: 1.25rem;
      }
      
      .add-log-btn {
        width: 32px;
        height: 32px;
        font-size: 18px;
      }
      
      .log-timeline {
        padding: 16px;
      }
      
      .timeline-container {
        padding-left: 28px;
      }
      
      .timeline-dot {
        left: -22px;
        width: 12px;
        height: 12px;
        border-width: 2px;
      }
      
      .timeline-line {
        left: -16px;
      }
      
      .timeline-content {
        padding: 8px;
      }
      
      .timeline-date {
        font-size: 13px;
      }
      
      .log-content {
        font-size: 13px;
      }
      
      /* 移动端日志弹窗样式调整 */
      .log-modal-content {
        width: 98%;
        max-width: none;
        margin: 10px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
      }
      
      .log-modal-content .modal-body {
        flex: 1;
        overflow-y: auto;
        padding: 15px 20px;
        min-height: 0; /* 允许 flex 子项收缩 */
      }
      
      .log-modal-content .modal-header,
      .log-modal-content .modal-footer {
        flex-shrink: 0; /* 防止头部和底部被压缩 */
      }
      
      .editor-toolbar {
        padding: 6px 8px;
        gap: 6px;
        flex-wrap: wrap;
      }
      
      .toolbar-btn {
        min-width: 24px;
        height: 24px;
        font-size: 11px;
        padding: 4px 6px;
      }
      
      .form-textarea {
        min-height: 135px;
        max-height: 200px;
        font-size: 13px;
        padding: 12px;
        resize: vertical;
      }
      
      .log-preview {
        min-height: 100px;
        max-height: 150px;
        padding: 12px;
        font-size: 12px;
      }
      
      .log-modal-content .form-group {
        margin-bottom: 15px;
      }
      
      .log-modal-content .form-group:last-child {
        margin-bottom: 0;
      }
    }
    
    /* 超小屏幕优化 */
    @media (max-height: 600px) {
      .log-modal-content {
        max-height: 95vh;
        margin: 5px;
      }
      
      .log-modal-content .modal-header {
        padding: 15px;
      }
      
      .log-modal-content .modal-footer {
        padding: 15px;
      }
      
      .log-modal-content .modal-body {
        padding: 10px 15px;
      }
      
      .form-textarea {
        min-height: 120px;
        max-height: 150px;
      }
      
      .log-preview {
        min-height: 80px;
        max-height: 100px;
      }
    }
  `;
  
  document.head.appendChild(style);
}

// 关闭日志弹窗函数
function closeLogModal() {
  const logModal = document.getElementById('add-log-modal');
  if (logModal) {
    logModal.classList.add('hidden');
    // 重置表单
    document.getElementById('log-modal-title').textContent = '添加炼功日志';
    document.getElementById('log-date').value = '';
    document.getElementById('log-content').value = '';
    document.getElementById('log-preview').innerHTML = '<div class="preview-placeholder">在上方输入内容后，这里会显示预览</div>';
    
    // 清除编辑状态
    delete logModal.dataset.editingLogId;
  }
}

function bindEvents() {
  const addDataBtn = document.getElementById('add-data-btn');
  const modal = document.getElementById('add-data-modal');
  const closeModal = document.getElementById('close-modal');
  const cancelBtn = document.getElementById('cancel-btn');
  const confirmBtn = document.getElementById('confirm-btn');
  
  // 日志相关元素
  const addLogBtn = document.getElementById('add-log-btn');
  const logModal = document.getElementById('add-log-modal');
  const closeLogModalBtn = document.getElementById('close-log-modal');
  const cancelLogBtn = document.getElementById('cancel-log-btn');
  const confirmLogBtn = document.getElementById('confirm-log-btn');
  const logContentTextarea = document.getElementById('log-content');
  const logPreview = document.getElementById('log-preview');
  
  // 打开炼功数据对话框
  addDataBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
    // 重置表单
    document.getElementById('practice-hours').value = '';
    document.getElementById('practice-minutes').value = '';
  });
  
  // 打开日志对话框
  addLogBtn.addEventListener('click', () => {
    openLogModal();
  });
  
  // 关闭对话框
  const closeModalFn = () => {
    modal.classList.add('hidden');
  };
  
  closeModal.addEventListener('click', closeModalFn);
  cancelBtn.addEventListener('click', closeModalFn);
  
  // 点击遮罩关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModalFn();
    }
  });
  
  // 确认添加数据
  confirmBtn.addEventListener('click', async () => {
    await addPracticeRecord();
  });
  
  // 回车键提交
  document.getElementById('practice-minutes').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addPracticeRecord();
    }
  });
  
  // 日志弹窗事件绑定
  if (closeLogModalBtn) {
    closeLogModalBtn.addEventListener('click', closeLogModal);
  }
  
  if (cancelLogBtn) {
    cancelLogBtn.addEventListener('click', closeLogModal);
  }
  
  if (confirmLogBtn) {
    confirmLogBtn.addEventListener('click', async () => {
      await savePracticeLog();
    });
  }
  
  // 点击遮罩关闭日志弹窗
  if (logModal) {
    logModal.addEventListener('click', (e) => {
      if (e.target === logModal) {
        closeLogModal();
      }
    });
  }
  
  // 实时预览
  if (logContentTextarea) {
    logContentTextarea.addEventListener('input', updateLogPreview);
  }
  
}

async function addPracticeRecord() {
  const date = document.getElementById('practice-date').value;
  const hours = parseInt(document.getElementById('practice-hours').value) || 0;
  const minutes = parseInt(document.getElementById('practice-minutes').value) || 0;
  
  if (!date) {
    alert('请选择日期');
    return;
  }
  
  if (hours === 0 && minutes === 0) {
    alert('请输入炼功时长');
    return;
  }
  
  if (minutes >= 60) {
    alert('分钟数不能超过59');
    return;
  }
  
  try {
    const response = await fetch('/api/kv/practice-time', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
      },
      body: JSON.stringify({
        date,
        hours,
        minutes
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '添加失败');
    }
    
    // 关闭对话框
    document.getElementById('add-data-modal').classList.add('hidden');
    
    // 重新加载数据
    await loadPracticeDataAsync();
    
    // 显示成功消息
    showMessage('炼功记录添加成功！', 'success');
    
  } catch (error) {
    console.error('添加炼功记录失败:', error);
    showMessage('添加失败: ' + error.message, 'error');
  }
}


function updateStats(records) {
  const totalMinutes = records.reduce((sum, record) => sum + record.totalMinutes, 0);
  const totalDays = records.length;
  const averageMinutes = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0;
  
  // 格式化时间显示
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`;
    }
    return `${mins}分钟`;
  };
  
  document.getElementById('total-time').textContent = formatTime(totalMinutes);
  document.getElementById('average-time').textContent = formatTime(averageMinutes);
  document.getElementById('total-days').textContent = `${totalDays}天`;
}


function showMessage(text, type = 'info') {
  // 创建消息元素
  const message = document.createElement('div');
  message.className = `message message-${type}`;
  message.textContent = text;
  
  // 添加样式
  const styles = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 24px',
    borderRadius: '8px',
    color: 'white',
    fontWeight: '500',
    zIndex: '9999',
    maxWidth: '300px',
    wordBreak: 'break-word',
    transition: 'all 0.3s ease',
    transform: 'translateX(100%)',
    opacity: '0'
  };
  
  Object.assign(message.style, styles);
  
  if (type === 'success') {
    message.style.background = '#10b981';
  } else if (type === 'error') {
    message.style.background = '#ef4444';
  } else {
    message.style.background = '#3b82f6';
  }
  
  document.body.appendChild(message);
  
  // 动画显示
  setTimeout(() => {
    message.style.transform = 'translateX(0)';
    message.style.opacity = '1';
  }, 100);
  
  // 3秒后自动移除
  setTimeout(() => {
    message.style.transform = 'translateX(100%)';
    message.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(message);
    }, 300);
  }, 3000);
}

// 添加认证页面样式
function addAuthStyles() {
  const existingStyle = document.getElementById('auth-styles');
  if (existingStyle) return;

  const style = document.createElement('style');
  style.id = 'auth-styles';
  style.textContent = `
    .auth-page {
      max-width: 500px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    
    .auth-container {
      background: var(--card-bg, #ffffff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    }
    
    .auth-header {
      text-align: center;
      margin-bottom: 32px;
    }
    
    .auth-header h1 {
      font-size: 2rem;
      font-weight: bold;
      color: var(--text, #1f2937);
      margin: 0 0 8px 0;
    }
    
    .auth-header p {
      color: var(--muted, #6b7280);
      margin: 0;
    }
    
    .auth-form {
      transition: all 0.3s ease;
    }
    
    .auth-form.hidden {
      display: none;
    }
    
    .auth-form h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text, #1f2937);
      margin: 0 0 24px 0;
      text-align: center;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--text, #374151);
    }
    
    .form-input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      box-sizing: border-box;
    }
    
    .form-input:focus {
      outline: none;
      border-color: var(--primary, #3b82f6);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .auth-btn {
      width: 100%;
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 20px;
    }
    
    .auth-btn.primary {
      background: var(--primary, #3b82f6);
      color: white;
    }
    
    .auth-btn.primary:hover {
      background: var(--primary-dark, #2563eb);
      transform: translateY(-1px);
    }
    
    .auth-btn:disabled {
      background: var(--muted, #9ca3af);
      cursor: not-allowed;
      transform: none;
    }
    
    .auth-links {
      text-align: center;
    }
    
    .link-btn {
      background: none;
      border: none;
      color: var(--primary, #3b82f6);
      cursor: pointer;
      font-size: 14px;
      text-decoration: underline;
      margin: 0 8px;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background 0.2s ease;
    }
    
    .link-btn:hover {
      background: rgba(59, 130, 246, 0.1);
    }
    
    
    @media (max-width: 768px) {
      .auth-page {
        padding: 20px 15px;
      }
      
      .auth-container {
        padding: 30px 20px;
      }
      
      .auth-header h1 {
        font-size: 1.75rem;
      }
    }
  `;
  
  document.head.appendChild(style);
}

// 初始化认证功能
function initAuth() {
  // 绑定事件
  bindAuthEvents();
  
  // 如果已登录，尝试获取用户信息
  if (isLoggedIn()) {
    getCurrentUser();
  }
}

// 绑定认证相关事件
function bindAuthEvents() {
  // 登录表单事件
  const loginBtn = document.getElementById('login-btn');
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  
  loginBtn.addEventListener('click', () => handleLogin());
  loginPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  
  // 注册表单事件
  const registerBtn = document.getElementById('register-btn');
  const registerEmail = document.getElementById('register-email');
  
  registerBtn.addEventListener('click', () => handleRegister());
  registerEmail.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleRegister();
  });
  
  // 忘记密码表单事件
  const sendResetBtn = document.getElementById('send-reset-btn');
  const forgotEmail = document.getElementById('forgot-email');
  
  sendResetBtn.addEventListener('click', () => handleForgotPassword());
  forgotEmail.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleForgotPassword();
  });
  
  // 切换表单事件
  document.getElementById('show-register-btn').addEventListener('click', () => showForm('register'));
  document.getElementById('show-login-btn').addEventListener('click', () => showForm('login'));
  document.getElementById('forgot-password-btn').addEventListener('click', () => showForm('forgot-password'));
  document.getElementById('back-to-login-btn').addEventListener('click', () => showForm('login'));
}

// 显示指定表单
function showForm(formType) {
  const forms = ['login', 'register', 'forgot-password'];
  forms.forEach(form => {
    const formElement = document.getElementById(`${form}-form`);
    if (form === formType) {
      formElement.classList.remove('hidden');
    } else {
      formElement.classList.add('hidden');
    }
  });
}

// 处理登录
async function handleLogin() {
  let email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  
  // 清理邮箱输入（防止XSS）
  email = sanitizeInput(email);
  
  if (!email || !password) {
    showMessage('请填写完整的登录信息', 'error');
    return;
  }
  
  if (!isValidEmail(email)) {
    showMessage('请输入有效的邮箱地址', 'error');
    return;
  }
  
  const loginBtn = document.getElementById('login-btn');
  loginBtn.disabled = true;
  loginBtn.textContent = '登录中...';
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '登录失败');
    }
    
    // 保存用户信息和CSRF token
    currentUser = data.user;
    csrfToken = data.csrfToken;
    window.currentUser = currentUser;
    window.csrfToken = csrfToken;
    
    showMessage('登录成功！', 'success');
    
    // 清空表单
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    
    // 延迟一下让用户看到成功消息，然后重新加载炼功计时器界面
    setTimeout(async () => {
      try {
        // 确保用户信息和CSRF token已经设置
        console.log('🔄 登录成功，重新加载炼功计时器界面');
        console.log('👤 当前用户:', currentUser);
        console.log('🔐 CSRF Token:', csrfToken ? '存在' : '缺失');
        
        // 验证认证状态
        if (!currentUser || !csrfToken) {
          console.log('⚠️ 认证信息不完整，尝试获取用户信息');
          const user = await getCurrentUser();
          if (!user || !csrfToken) {
            console.log('❌ 无法获取完整的认证信息，刷新页面');
            window.location.reload();
            return;
          }
        }
        
        // 重新加载炼功计时器页面内容
        const container = document.getElementById('article');
        if (container) {
          await loadPracticeTimerPage(container);
          console.log('✅ 炼功计时器界面已重新加载');
          
          // 更新侧边栏的用户信息
          if (window.updateUserInfoInSidebar) {
            window.updateUserInfoInSidebar();
          }
        } else {
          console.error('❌ 找不到容器元素 #article');
          window.location.reload();
        }
      } catch (error) {
        console.error('❌ 重新加载炼功计时器失败:', error);
        // 如果出错，使用页面刷新作为备用方案
        window.location.reload();
      }
    }, 1500);
    
  } catch (error) {
    showMessage('登录失败: ' + error.message, 'error');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = '登录';
  }
}

// 处理注册
async function handleRegister() {
  let email = document.getElementById('register-email').value.trim();
  
  // 清理邮箱输入（防止XSS）
  email = sanitizeInput(email);
  
  if (!email) {
    showMessage('请输入邮箱地址', 'error');
    return;
  }
  
  if (!isValidEmail(email)) {
    showMessage('请输入有效的邮箱地址', 'error');
    return;
  }
  
  const registerBtn = document.getElementById('register-btn');
  registerBtn.disabled = true;
  registerBtn.textContent = '发送中...';
  
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '注册失败');
    }
    
    showMessage('注册邮件已发送，请检查您的邮箱并点击验证链接', 'success');
    
    // 清空邮箱输入
    document.getElementById('register-email').value = '';
    
  } catch (error) {
    console.error('注册失败:', error);
    showMessage('注册失败: ' + error.message, 'error');
  } finally {
    registerBtn.disabled = false;
    registerBtn.textContent = '发送注册邮件';
  }
}

// 处理忘记密码
async function handleForgotPassword() {
  let email = document.getElementById('forgot-email').value.trim();
  
  // 清理邮箱输入（防止XSS）
  email = sanitizeInput(email);
  
  if (!email) {
    showMessage('请输入邮箱地址', 'error');
    return;
  }
  
  if (!isValidEmail(email)) {
    showMessage('请输入有效的邮箱地址', 'error');
    return;
  }
  
  const sendResetBtn = document.getElementById('send-reset-btn');
  sendResetBtn.disabled = true;
  sendResetBtn.textContent = '发送中...';
  
  try {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '发送失败');
    }
    
    showMessage('重置邮件已发送，请检查您的邮箱', 'success');
    
    // 清空邮箱输入
    document.getElementById('forgot-email').value = '';
    
  } catch (error) {
    console.error('发送失败:', error);
    showMessage('发送失败: ' + error.message, 'error');
  } finally {
    sendResetBtn.disabled = false;
    sendResetBtn.textContent = '发送重置邮件';
  }
}

// 获取当前用户信息
async function getCurrentUser() {
  if (!isLoggedIn()) {
    console.log('🔍 getCurrentUser: 用户未登录');
    return null;
  }
  
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.log('🔍 getCurrentUser: 响应失败', response.status);
      return null;
    }
    
    const data = await response.json();
    console.log('🔍 getCurrentUser: 获取到数据', {
      hasUser: !!data.user,
      hasCSRFToken: !!data.csrfToken
    });
    
    // 更新全局状态
    currentUser = data.user;
    window.currentUser = currentUser;
    if (data.csrfToken) {
      csrfToken = data.csrfToken;
      window.csrfToken = csrfToken;
      console.log('🔍 getCurrentUser: CSRF token已更新');
    } else {
      console.log('⚠️ getCurrentUser: 响应中没有CSRF token');
    }
    
    // 更新侧边栏用户信息
    if (window.updateUserInfoInSidebar) {
      window.updateUserInfoInSidebar();
    }
    
    return data.user;
  } catch (error) {
    console.error('🔍 getCurrentUser: 请求失败', error);
    return null;
  }
}

// 全局调试函数 - 检查认证状态
function debugAuthStatus() {
  console.log('🔍 === 认证状态调试信息 ===');
  console.log('📅 时间:', new Date().toLocaleString());
  console.log('🍪 所有cookies:', document.cookie);
  
  // 详细的Cookie解析调试
  console.log('🔧 === Cookie解析详情 ===');
  const cookieString = document.cookie;
  console.log('📝 原始cookie字符串:', JSON.stringify(cookieString));
  console.log('📝 cookie字符串长度:', cookieString.length);
  
  if (cookieString.includes('authToken')) {
    console.log('✅ cookie字符串包含 authToken');
    const authTokenMatch = cookieString.match(/authToken=([^;]*)/);
    console.log('🎯 正则匹配结果:', authTokenMatch);
    if (authTokenMatch) {
      console.log('🎯 匹配到的token值:', authTokenMatch[1]);
      console.log('🎯 token值长度:', authTokenMatch[1].length);
    }
  } else {
    console.log('❌ cookie字符串不包含 authToken');
  }
  
  const authToken = getCookie('authToken');
  console.log('🔑 getCookie() 返回值:', authToken);
  console.log('🔑 getCookie() 返回值类型:', typeof authToken);
  console.log('🔑 authToken === undefined:', authToken === undefined);
  console.log('🔑 authToken || "无":', authToken || '无');
  console.log('📏 authToken 长度:', authToken ? authToken.length : 0);
  console.log('👤 currentUser 变量:', currentUser || '无');
  console.log('🔐 csrfToken 变量:', csrfToken || '无');
  console.log('✅ isLoggedIn() 返回:', isLoggedIn());
  
  // 尝试获取当前用户信息
  getCurrentUser().then(user => {
    console.log('📡 getCurrentUser() 结果:', user || '获取失败');
  }).catch(error => {
    console.error('❌ getCurrentUser() 错误:', error);
  });
  
  console.log('🔍 === 调试信息结束 ===');
}

// 将调试函数挂载到全局，方便在控制台调用
window.debugAuthStatus = debugAuthStatus;

// 手动触发页面重载的函数（调试用）
window.manualReload = function() {
  console.log('🔄 手动触发页面重载...');
  location.reload();
};

// 显示所有可用的调试函数
window.showDebugFunctions = function() {
  console.log('🛠️ === 可用的调试函数 ===');
  console.log('debugAuthStatus() - 检查认证状态');
  console.log('manualReload() - 手动重载页面');
  console.log('showDebugFunctions() - 显示此帮助');
  console.log('🛠️ === 调试函数列表结束 ===');
};

// 处理登出
async function handleLogout() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
      }
    });
  } catch (error) {
    console.error('登出失败:', error);
  }
  
  // 清除本地状态
  currentUser = null;
  csrfToken = null;
  window.currentUser = null;
  window.csrfToken = null;
  // HttpOnly cookie会被服务器端清除
  
  // 重新加载页面
  location.reload();
}

// 导出登出函数到全局
window.handleLogout = handleLogout;

// 导出数据加载函数到全局（用于重试按钮）
window.loadPracticeDataAsync = loadPracticeDataAsync;

// 性能监控
class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.startTimes = {};
  }

  start(operation) {
    this.startTimes[operation] = performance.now();
    console.log(`⏱️ 开始计时: ${operation}`);
  }

  end(operation) {
    if (this.startTimes[operation]) {
      const duration = performance.now() - this.startTimes[operation];
      this.metrics[operation] = duration;
      console.log(`✅ 完成计时: ${operation} - ${duration.toFixed(2)}ms`);
      delete this.startTimes[operation];
      return duration;
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }

  logSummary() {
    console.log('📊 === 性能监控摘要 ===');
    Object.entries(this.metrics).forEach(([operation, duration]) => {
      console.log(`  ${operation}: ${duration.toFixed(2)}ms`);
    });
    
    const totalTime = Object.values(this.metrics).reduce((sum, time) => sum + time, 0);
    console.log(`  总耗时: ${totalTime.toFixed(2)}ms`);
    console.log('📊 === 摘要结束 ===');
  }
}

// 创建全局性能监控实例
const performanceMonitor = new PerformanceMonitor();

// 导出性能监控到全局（调试用）
window.performanceMonitor = performanceMonitor;

// 炼功日志相关函数
async function loadPracticeLogs() {
  const logTimeline = document.getElementById('log-timeline');
  if (!logTimeline) return;

  try {
    const response = await fetch('/api/kv/practice-logs', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
      }
    });

    if (!response.ok) {
      throw new Error('获取日志失败');
    }
    
    const logs = await response.json();
    console.log(`✅ 成功获取炼功日志，包含 ${logs.length} 条记录`);
    
    renderPracticeLogs(logs);
    
  } catch (error) {
    console.error('加载炼功日志失败:', error);
    
    // 显示错误状态
    logTimeline.innerHTML = `
      <div class="log-loading">
        <div class="empty-logs-icon">❌</div>
        <p class="empty-logs-text">日志加载失败</p>
        <button onclick="loadPracticeLogs()" class="retry-btn">重试</button>
      </div>
    `;
  }
}

function renderPracticeLogs(logs) {
  const logTimeline = document.getElementById('log-timeline');
  if (!logTimeline) return;

  if (!logs || logs.length === 0) {
    logTimeline.innerHTML = `
      <div class="empty-logs">
        <div class="empty-logs-icon">📝</div>
        <div class="empty-logs-text">还没有炼功日志</div>
        <div class="empty-logs-hint">点击右上角的 + 按钮添加第一条日志</div>
      </div>
    `;
    return;
  }

  // 按日期排序（最新的在上面）
  const sortedLogs = logs.sort((a, b) => new Date(b.date) - new Date(a.date));

  const timelineHTML = `
    <div class="timeline-container">
      <div class="timeline-line"></div>
      ${sortedLogs.map(log => `
        <div class="timeline-item" data-log-id="${log.id || log.date}">
          <div class="timeline-dot"></div>
          <div class="timeline-date">
            <div class="date-info">
              <span>${formatLogDate(log.date)}</span>
              <span style="font-weight: normal; color: var(--muted, #6b7280);">
                ${formatLogWeekday(log.date)}
              </span>
            </div>
            <div class="log-actions">
              <button class="log-action-btn edit" onclick="editPracticeLog('${log.id || log.date}')">
                编辑
              </button>
              <button class="log-action-btn delete" onclick="deletePracticeLog('${log.id || log.date}')">
                删除
              </button>
            </div>
          </div>
          <div class="timeline-content">
            <div class="log-content">${parseMarkdownContent(log.content || '')}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  logTimeline.innerHTML = timelineHTML;
}

function formatLogDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const logDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (logDate.getTime() === today.getTime()) {
    return '今天';
  } else if (logDate.getTime() === yesterday.getTime()) {
    return '昨天';
  } else {
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
}

function formatLogWeekday(dateString) {
  const date = new Date(dateString);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return weekdays[date.getDay()];
}

function parseMarkdownContent(content) {
  if (!content) return '<p class="empty-content">暂无内容</p>';
  
  // 简单的Markdown解析器
  let html = content
    // 标题
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // 粗体和斜体
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // 链接
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, '<a href="$2" target="_blank">$1</a>')
    // 代码块
    .replace(/```([^`]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]*?)`/g, '<code>$1</code>')
    // 引用
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    // 列表
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    // 段落
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // 包装列表项
  html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
  
  // 包装段落
  if (!html.includes('<h1>') && !html.includes('<h2>') && !html.includes('<h3>') && 
      !html.includes('<ul>') && !html.includes('<blockquote>') && !html.includes('<pre>')) {
    html = '<p>' + html + '</p>';
  }

  return html;
}

// 删除炼功日志
async function deletePracticeLog(logId) {
  if (!confirm('确定要删除这条日志吗？')) {
    return;
  }

  try {
    const response = await fetch(`/api/kv/practice-logs/${logId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '删除失败');
    }

    showMessage('日志删除成功！', 'success');
    
    // 重新加载日志
    await loadPracticeLogs();
    
  } catch (error) {
    console.error('删除日志失败:', error);
    showMessage('删除失败: ' + error.message, 'error');
  }
}

// 打开日志弹窗
function openLogModal(logData = null) {
  const logModal = document.getElementById('add-log-modal');
  const logModalTitle = document.getElementById('log-modal-title');
  const logDate = document.getElementById('log-date');
  const logContent = document.getElementById('log-content');
  const logPreview = document.getElementById('log-preview');
  
  if (!logModal) return;
  
  // 设置默认日期为今天
  const today = new Date().toISOString().split('T')[0];
  
  if (logData) {
    // 编辑模式
    logModalTitle.textContent = '编辑炼功日志';
    logDate.value = logData.date;
    logContent.value = logData.content || '';
    logModal.dataset.editingLogId = logData.id || logData.date;
  } else {
    // 新增模式
    logModalTitle.textContent = '添加炼功日志';
    logDate.value = today;
    logContent.value = '';
    delete logModal.dataset.editingLogId;
  }
  
  // 更新预览
  updateLogPreview();
  
  // 显示弹窗
  logModal.classList.remove('hidden');
  
  // 聚焦到内容输入框
  setTimeout(() => {
    logContent.focus();
  }, 100);
}

// 更新日志预览
function updateLogPreview() {
  const logContent = document.getElementById('log-content');
  const logPreview = document.getElementById('log-preview');
  
  if (!logContent || !logPreview) return;
  
  const content = logContent.value.trim();
  
  if (!content) {
    logPreview.innerHTML = '<div class="preview-placeholder">在上方输入内容后，这里会显示预览</div>';
    return;
  }
  
  const htmlContent = parseMarkdownContent(content);
  logPreview.innerHTML = htmlContent;
}

// 插入Markdown格式
function insertMarkdown(prefix, suffix = '') {
  const textarea = document.getElementById('log-content');
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);
  const beforeText = textarea.value.substring(0, start);
  const afterText = textarea.value.substring(end);
  
  let newText;
  let newCursorPos;
  
  if (suffix) {
    // 包围式标记（如粗体、斜体）
    newText = beforeText + prefix + selectedText + suffix + afterText;
    newCursorPos = selectedText ? end + prefix.length + suffix.length : start + prefix.length;
  } else {
    // 前缀式标记（如标题、列表）
    const lines = selectedText.split('\n');
    const processedLines = lines.map(line => {
      if (line.trim()) {
        return prefix + line;
      }
      return line;
    });
    
    newText = beforeText + processedLines.join('\n') + afterText;
    newCursorPos = end + (prefix.length * lines.filter(line => line.trim()).length);
  }
  
  textarea.value = newText;
  textarea.focus();
  textarea.setSelectionRange(newCursorPos, newCursorPos);
  
  // 更新预览
  updateLogPreview();
}

// 保存炼功日志
async function savePracticeLog() {
  const logModal = document.getElementById('add-log-modal');
  const date = document.getElementById('log-date').value;
  const content = document.getElementById('log-content').value.trim();
  
  if (!date) {
    showMessage('请选择日期', 'error');
    return;
  }
  
  if (!content) {
    showMessage('请输入日志内容', 'error');
    return;
  }
  
  const isEditing = logModal && logModal.dataset.editingLogId;
  const logId = isEditing ? logModal.dataset.editingLogId : null;
  
  try {
    const url = isEditing ? `/api/kv/practice-logs/${logId}` : '/api/kv/practice-logs';
    const method = isEditing ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
      },
      body: JSON.stringify({
        date,
        content
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '保存失败');
    }
    
    // 关闭弹窗
    logModal.classList.add('hidden');
    
    // 重新加载日志
    await loadPracticeLogs();
    
    // 显示成功消息
    showMessage(isEditing ? '日志更新成功！' : '日志添加成功！', 'success');
    
  } catch (error) {
    console.error('保存日志失败:', error);
    showMessage('保存失败: ' + error.message, 'error');
  }
}

// 编辑炼功日志
async function editPracticeLog(logId) {
  try {
    const response = await fetch(`/api/kv/practice-logs/${logId}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
      }
    });

    if (!response.ok) {
      throw new Error('获取日志失败');
    }
    
    const logData = await response.json();
    openLogModal(logData);
    
  } catch (error) {
    console.error('获取日志失败:', error);
    showMessage('获取日志失败: ' + error.message, 'error');
  }
}

// 导出函数到全局
window.loadPracticeLogs = loadPracticeLogs;
window.deletePracticeLog = deletePracticeLog;
window.editPracticeLog = editPracticeLog;
window.openLogModal = openLogModal;
window.closeLogModal = closeLogModal;
window.insertMarkdown = insertMarkdown;
window.updateLogPreview = updateLogPreview;
window.savePracticeLog = savePracticeLog;
