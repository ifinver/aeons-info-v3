// 练功计时器页面
// Chart.js 将通过script标签加载，使用全局Chart对象

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
  
  container.innerHTML = `
    <div class="practice-timer-page" style="${marginStyle}">
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
      margin-bottom: 36px;
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
      margin: 0 -5px;
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
        margin-bottom: 30px;
        margin-top: 6px;
      }
      
      .chart-container {
        margin: 0 -3px;
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
      headers: {
        'Content-Type': 'application/json',
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
    const response = await fetch('/api/kv/practice-time');
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
  
  // 计算平均值
  const averageHours = records.length > 0 
    ? records.reduce((sum, record) => sum + record.totalMinutes, 0) / records.length / 60
    : 0;
  
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
                const hours = parseFloat(context.parsed.y);
                const totalMinutes = Math.round(hours * 60);
                const h = Math.floor(totalMinutes / 60);
                const m = totalMinutes % 60;
                return `练功时长: ${h}小时${m}分钟`;
              } else {
                const hours = parseFloat(context.parsed.y);
                const totalMinutes = Math.round(hours * 60);
                const h = Math.floor(totalMinutes / 60);
                const m = totalMinutes % 60;
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
