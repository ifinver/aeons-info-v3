// 邮箱验证页面

export async function loadEmailVerificationPage(container, path) {
  // 从路径中提取验证令牌
  const token = path.split('/').pop();
  
  if (!token) {
    showVerificationError(container, '验证链接无效');
    return;
  }

  // 显示加载状态
  container.innerHTML = `
    <div class="verification-page">
      <div class="verification-container">
        <div class="verification-header">
          <h1>邮箱验证</h1>
          <div class="loading-spinner">
            <div class="spinner"></div>
            <p>正在验证您的邮箱...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // 添加验证页面样式
  addVerificationStyles();

  try {
    // 调用后端API验证令牌
    const response = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    });

    const result = await response.json();

    if (response.ok) {
      // 验证成功，显示密码创建表单
      showPasswordCreationForm(container, token);
    } else {
      // 验证失败
      showVerificationError(container, result.error || '验证失败');
    }
  } catch (error) {
    console.error('验证错误:', error);
    showVerificationError(container, '网络错误，请稍后重试');
  }
}

function showPasswordCreationForm(container, token) {
  container.innerHTML = `
    <div class="verification-page">
      <div class="verification-container">
        <div class="verification-header">
          <h1>创建密码</h1>
          <p>请为您的账户创建一个安全密码</p>
        </div>
        
        <form class="password-form" id="password-form">
          <div class="form-group">
            <label for="password">密码</label>
            <input type="password" id="password" class="form-input" placeholder="请输入密码" required />
            <div class="password-requirements">
              <p>密码要求：</p>
              <ul>
                <li>至少8个字符</li>
                <li>包含至少3种字符类型（大写字母、小写字母、数字、特殊字符）</li>
                <li>不能是常见的弱密码</li>
                <li>12位以上的密码要求会更宽松</li>
              </ul>
            </div>
          </div>
          
          <div class="form-group">
            <label for="confirm-password">确认密码</label>
            <input type="password" id="confirm-password" class="form-input" placeholder="请再次输入密码" required />
          </div>
          
          <button type="submit" class="auth-btn primary" id="create-password-btn">创建密码</button>
        </form>
        
        <div class="success-message hidden" id="success-message">
          <div class="success-icon">✅</div>
          <h2>注册成功！</h2>
          <p>您的账户已创建成功，正在跳转到登录页面...</p>
        </div>
      </div>
    </div>
  `;

  // 绑定表单提交事件
  const form = container.querySelector('#password-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handlePasswordCreation(container, token);
  });
}

function showVerificationError(container, message) {
  container.innerHTML = `
    <div class="verification-page">
      <div class="verification-container">
        <div class="verification-header">
          <h1>验证失败</h1>
          <div class="error-message">
            <div class="error-icon">❌</div>
            <p>${message}</p>
          </div>
        </div>
        
        <div class="verification-actions">
          <button onclick="location.hash = 'practice/timer'" class="auth-btn secondary">
            返回登录页面
          </button>
        </div>
      </div>
    </div>
  `;
}

async function handlePasswordCreation(container, token) {
  let password = container.querySelector('#password').value;
  let confirmPassword = container.querySelector('#confirm-password').value;
  const submitBtn = container.querySelector('#create-password-btn');

  // 清理输入（防止XSS）
  password = sanitizeInput(password);
  confirmPassword = sanitizeInput(confirmPassword);

  // 验证密码
  if (password !== confirmPassword) {
    showFormError(container, '两次输入的密码不一致');
    return;
  }

  if (!validatePassword(password)) {
    showFormError(container, '密码必须包含：至少8个字符、大小写字母、数字、特殊字符，且不能包含常见弱密码模式');
    return;
  }

  // 禁用按钮，显示加载状态
  submitBtn.disabled = true;
  submitBtn.textContent = '创建中...';

  try {
    const response = await fetch('/api/auth/complete-registration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        token,
        password 
      })
    });

    const result = await response.json();

    if (response.ok) {
      // 显示成功消息
      const form = container.querySelector('#password-form');
      const successMessage = container.querySelector('#success-message');
      
      form.classList.add('hidden');
      successMessage.classList.remove('hidden');

      // 3秒后跳转到登录页面
      setTimeout(() => {
        location.hash = 'practice/timer';
      }, 3000);
    } else {
      showFormError(container, result.error || '密码创建失败');
      submitBtn.disabled = false;
      submitBtn.textContent = '创建密码';
    }
  } catch (error) {
    console.error('密码创建错误:', error);
    showFormError(container, '网络错误，请稍后重试');
    submitBtn.disabled = false;
    submitBtn.textContent = '创建密码';
  }
}

function showFormError(container, message) {
  // 移除之前的错误消息
  const existingError = container.querySelector('.form-error');
  if (existingError) {
    existingError.remove();
  }

  // 添加新的错误消息
  const form = container.querySelector('#password-form');
  const errorDiv = document.createElement('div');
  errorDiv.className = 'form-error';
  errorDiv.innerHTML = `
    <div class="error-message">
      <span class="error-icon">⚠️</span>
      <span>${message}</span>
    </div>
  `;
  form.insertBefore(errorDiv, form.firstChild);

  // 3秒后自动移除错误消息
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.remove();
    }
  }, 5000);
}

function validatePassword(password) {
  // 改进的密码验证规则（与服务器端保持一致）
  if (password.length < 8) return false;
  if (password.length > 128) return false;
  
  // 计算密码复杂度得分
  let score = 0;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password);
  
  if (hasUpper) score++;
  if (hasLower) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;
  
  // 长密码降低复杂度要求
  const minScore = password.length >= 12 ? 3 : 3;
  if (score < minScore) return false;

  // 只检查最常见的弱密码模式
  const commonWeakPatterns = [
    'password', '123456', '12345678', 'qwerty', 'abc123', 
    'admin', 'letmein', 'welcome'
  ];
  const lowercasePassword = password.toLowerCase();
  if (commonWeakPatterns.some(pattern => lowercasePassword === pattern || lowercasePassword.includes(pattern + '123'))) {
    return false;
  }
  
  // 放宽重复字符检查 - 只检查4个以上连续重复
  if (/(.)\1{3,}/.test(password)) return false;
  
  // 检查全数字密码
  if (/^\d+$/.test(password)) return false;
  
  // 检查键盘序列
  const keyboardPatterns = ['123456', '654321', 'qwerty', 'asdfgh', 'zxcvbn'];
  if (keyboardPatterns.some(pattern => lowercasePassword.includes(pattern))) {
    return false;
  }

  return true;
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

function addVerificationStyles() {
  // 检查是否已经添加了样式
  if (document.querySelector('#verification-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'verification-styles';
  style.textContent = `
    .verification-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      margin: -20px;
      padding: 20px;
    }

    .verification-container {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      max-width: 400px;
      width: 100%;
      text-align: center;
    }

    .verification-header h1 {
      color: #333;
      margin-bottom: 0.5rem;
      font-size: 2rem;
    }

    .verification-header p {
      color: #666;
      margin-bottom: 2rem;
    }

    .loading-spinner {
      padding: 2rem 0;
    }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-message {
      background: #fee;
      border: 1px solid #fcc;
      border-radius: 8px;
      padding: 1rem;
      margin: 1rem 0;
      color: #c33;
    }

    .error-icon {
      font-size: 1.5rem;
      margin-right: 0.5rem;
    }

    .success-message {
      text-align: center;
      padding: 2rem 0;
    }

    .success-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .success-message h2 {
      color: #22c55e;
      margin-bottom: 1rem;
    }

    .success-message p {
      color: #666;
    }

    .password-form {
      text-align: left;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      color: #333;
      font-weight: 500;
    }

    .form-input {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.3s ease;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: #667eea;
    }

    .password-requirements {
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: #666;
    }

    .password-requirements p {
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .password-requirements ul {
      margin: 0;
      padding-left: 1.5rem;
    }

    .password-requirements li {
      margin-bottom: 0.25rem;
    }

    .auth-btn {
      width: 100%;
      padding: 0.75rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.3s ease;
      margin-top: 1rem;
    }

    .auth-btn.primary {
      background: #667eea;
      color: white;
    }

    .auth-btn.primary:hover {
      background: #5a67d8;
    }

    .auth-btn.secondary {
      background: #e2e8f0;
      color: #4a5568;
    }

    .auth-btn.secondary:hover {
      background: #cbd5e0;
    }

    .auth-btn:disabled {
      background: #cbd5e0;
      color: #a0aec0;
      cursor: not-allowed;
    }

    .form-error {
      margin-bottom: 1rem;
    }

    .form-error .error-message {
      background: #fee;
      border: 1px solid #fcc;
      border-radius: 8px;
      padding: 0.75rem;
      color: #c33;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
    }

    .verification-actions {
      margin-top: 2rem;
    }

    .hidden {
      display: none !important;
    }

    /* 移动端适配 */
    @media (max-width: 768px) {
      .verification-page {
        margin: -15px;
        padding: 15px;
      }
      
      .verification-container {
        padding: 1.5rem;
      }
      
      .verification-header h1 {
        font-size: 1.5rem;
      }
    }
  `;
  
  document.head.appendChild(style);
}
