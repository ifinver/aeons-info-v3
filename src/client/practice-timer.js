// 练功计时器页面
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

// 等待Chart.js加载完成
function waitForChart() {
  return new Promise((resolve) => {
    if (typeof Chart !== 'undefined') {
      resolve();
    } else {
      const checkChart = () => {
        if (typeof Chart !== 'undefined') {
          resolve();
        } else {
          setTimeout(checkChart, 100);
        }
      };
      checkChart();
    }
  });
}

// 清理练功计时器页面的样式影响
export function cleanupPracticeTimerPage(container) {
  // 移除可能添加的类名
  container.classList.remove('practice-timer-container');
  // 清理图表实例
  if (practiceChart) {
    practiceChart.destroy();
    practiceChart = null;
  }
}

export async function loadPracticeTimerPage(container) {
  
  // 等待Chart.js加载完成
  await waitForChart();
  
  // 清理之前可能存在的类名
  container.classList.remove('practice-timer-container');
  
  // 根据屏幕大小设置不同的边距
  const isMobile = window.innerWidth <= 768;
  const marginStyle = isMobile 
    ? "margin: -15px -15px 0 -15px; padding: 15px;" 
    : "margin: -20px -20px 0 -20px; padding: 20px;";
  
  // 检查用户是否已登录
  if (!isLoggedIn()) {
    // 显示登录/注册界面
    container.innerHTML = `
      <div class="auth-page" style="${marginStyle}">
        <div class="auth-container">
          <div class="auth-header">
            <h1>练功计时器</h1>
            <p>请登录或注册以使用练功计时器功能</p>
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
    return;
  }
  
  console.log('🔍 练功计时器页面加载 - 认证状态检查');
  console.log('  - isLoggedIn():', isLoggedIn());
  console.log('  - currentUser:', currentUser);
  console.log('  - csrfToken:', csrfToken ? '存在' : '不存在');
  
  // 如果已登录但没有用户信息或CSRF token，先获取用户信息
  if (!currentUser || !csrfToken) {
    console.log('🔄 已登录但缺少用户信息或CSRF token，尝试获取...');
    const user = await getCurrentUser();
    if (!user) {
      console.log('⚠️ 获取用户信息失败，可能token已过期');
      console.log('🧹 清除无效cookie并重新加载');
      // 清除可能无效的cookie
      deleteCookie('authToken');
      // 重新加载页面显示登录界面
      location.reload();
      return;
    }
  }
  
  // 再次检查CSRF token
  if (!csrfToken) {
    console.log('⚠️ 无法获取CSRF token，显示登录界面');
    // 清除可能无效的cookie
    deleteCookie('authToken');
    // 重新加载页面显示登录界面
    location.reload();
    return;
  }
  
  console.log('✅ 用户认证成功，显示练功计时器界面');
  
  // 如果已登录，显示练功计时器界面
  container.innerHTML = `
    <div class="practice-timer-page" style="${marginStyle}">
      <!-- 用户信息栏 -->
      <div class="user-info-bar">
        <div class="user-info">
          <span class="user-email">${currentUser ? currentUser.email : '用户'}</span>
        </div>
        <button id="logout-btn" class="logout-btn">登出</button>
      </div>
      
      <!-- 标题和添加按钮 -->
      <div class="header-row mb-6">
        <h1 class="page-title" style="margin-bottom: 0px;">练功计时器</h1>
        <button id="add-data-btn" class="add-btn">+</button>
      </div>
      
      <!-- 图表容器 -->
      <div class="chart-container mb-8">
        <canvas id="practice-chart" width="400" height="200"></canvas>
      </div>

      <!-- 统计信息 -->
      <div class="stats-grid mb-8">
        <div class="stat-card">
          <div class="stat-label">总时长</div>
          <div class="stat-value" id="total-time">0小时0分钟</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">平均每天</div>
          <div class="stat-value" id="average-time">0小时0分钟</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">记录天数</div>
          <div class="stat-value" id="total-days">0天</div>
        </div>
      </div>

    </div>
    
    <!-- 添加数据对话框 -->
    <div id="add-data-modal" class="modal-overlay hidden">
      <div class="modal-content">
        <div class="modal-header">
          <h3>添加练功记录</h3>
          <button id="close-modal" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="practice-date">日期</label>
            <input type="date" id="practice-date" class="form-input" />
          </div>
          <div class="form-group">
            <label for="practice-time">练功时长</label>
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
  `;

  // 添加样式
  addPracticeTimerStyles();
  
  // 初始化功能
  await initPracticeTimer();
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
      padding: 24px;
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
    }
  `;
  
  document.head.appendChild(style);
}

let practiceChart = null;

async function initPracticeTimer() {
  // 设置默认日期为今天
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('practice-date').value = today;
  
  // 绑定事件
  bindEvents();
  
  // 加载数据并绘制图表
  await loadAndRenderData();
}

function bindEvents() {
  const addDataBtn = document.getElementById('add-data-btn');
  const modal = document.getElementById('add-data-modal');
  const closeModal = document.getElementById('close-modal');
  const cancelBtn = document.getElementById('cancel-btn');
  const confirmBtn = document.getElementById('confirm-btn');
  const logoutBtn = document.getElementById('logout-btn');
  
  // 登出按钮事件
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  // 打开对话框
  addDataBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
    // 重置表单
    document.getElementById('practice-hours').value = '';
    document.getElementById('practice-minutes').value = '';
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
    alert('请输入练功时长');
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
    await loadAndRenderData();
    
    // 显示成功消息
    showMessage('练功记录添加成功！', 'success');
    
  } catch (error) {
    console.error('添加练功记录失败:', error);
    showMessage('添加失败: ' + error.message, 'error');
  }
}

async function loadAndRenderData() {
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
    
    const records = await response.json();
    
    // 更新统计信息
    updateStats(records);
    
    // 绘制图表
    renderChart(records);
    
  } catch (error) {
    console.error('加载数据失败:', error);
    showMessage('加载数据失败: ' + error.message, 'error');
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

function renderChart(records) {
  const ctx = document.getElementById('practice-chart').getContext('2d');
  
  // 销毁现有图表
  if (practiceChart) {
    practiceChart.destroy();
  }
  
  // 准备数据
  const labels = records.map(record => {
    const date = new Date(record.date);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  });
  
  const data = records.map(record => (record.totalMinutes / 60).toFixed(1)); // 转换为小时
  
  // 计算平均值（使用与汇总一致的方法）
  const totalMinutes = records.reduce((sum, record) => sum + record.totalMinutes, 0);
  const averageMinutes = records.length > 0 ? Math.round(totalMinutes / records.length) : 0;
  const averageHours = averageMinutes / 60;
  
  const averageLine = new Array(records.length).fill(averageHours.toFixed(1));
  
  practiceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: '练功时长 (小时)',
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
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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
                // 对于单个数据点，直接从records中获取原始数据
                const recordIndex = context.dataIndex;
                const originalMinutes = records[recordIndex].totalMinutes;
                const h = Math.floor(originalMinutes / 60);
                const m = originalMinutes % 60;
                return `练功时长: ${h}小时${m}分钟`;
              } else {
                // 对于平均值，使用与汇总一致的计算方法
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
    
    .user-info-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--card-bg, #ffffff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .user-email {
      font-weight: 500;
      color: var(--text, #374151);
    }
    
    .logout-btn {
      padding: 8px 16px;
      background: var(--muted, #6b7280);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.2s ease;
    }
    
    .logout-btn:hover {
      background: var(--muted-dark, #4b5563);
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
    
    showMessage('登录成功！', 'success');
    
    // 清空表单
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    
    // 延迟一下让用户看到成功消息，然后重新加载练功计时器界面
    setTimeout(async () => {
      try {
        // 确保用户信息和CSRF token已经设置
        console.log('🔄 登录成功，重新加载练功计时器界面');
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
        
        // 重新加载练功计时器页面内容
        const container = document.getElementById('article');
        if (container) {
          await loadPracticeTimerPage(container);
          console.log('✅ 练功计时器界面已重新加载');
        } else {
          console.error('❌ 找不到容器元素 #article');
          window.location.reload();
        }
      } catch (error) {
        console.error('❌ 重新加载练功计时器失败:', error);
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
    if (data.csrfToken) {
      csrfToken = data.csrfToken;
      console.log('🔍 getCurrentUser: CSRF token已更新');
    } else {
      console.log('⚠️ getCurrentUser: 响应中没有CSRF token');
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
  // HttpOnly cookie会被服务器端清除
  
  // 重新加载页面
  location.reload();
}
