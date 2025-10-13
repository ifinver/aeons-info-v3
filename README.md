# 仙界邀请函

## 项目概述

这是一个基于Cloudflare Workers的全栈Web应用，提供用户认证和炼功计时器功能。

#### API端点
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/status` - 状态检查（支持HttpOnly Cookie）
- `POST /api/auth/logout` - 用户登出

#### 前端状态管理
```javascript
// 通过API检查认证状态
async function getCurrentUser() {
  const response = await fetch('/api/auth/status', { credentials: 'include' });
  const data = await response.json();
  return data.authenticated ? data.user : null;
}
```