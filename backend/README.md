# AI Work Backend API

后端 API 服务，提供 RESTful 接口支持。

## 项目结构

```
backend/
├── src/
│   ├── index.js          # 应用入口
│   ├── routes/           # 路由定义
│   ├── controllers/      # 控制器
│   ├── services/         # 业务逻辑
│   ├── models/           # 数据模型
│   ├── middleware/       # 中间件
│   └── utils/            # 工具函数
├── tests/
│   ├── unit/             # 单元测试
│   └── integration/      # 集成测试
├── package.json
└── README.md
```

## 安装

```bash
cd /www/wwwroot/ai-work/backend
npm install
```

## 配置

创建 `.env` 文件：

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ai_work
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

## 运行

```bash
# 开发模式
npm run dev

# 生产模式
npm start

# 运行测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 生成测试覆盖率报告
npm run test:coverage
```

## API 接口

### 批量操作
- `DELETE /api/batch/:resource` - 批量删除
- `PATCH /api/batch/:resource/status` - 批量更新状态
- `POST /api/batch/:resource/export` - 批量导出
- `PATCH /api/batch/:resource/assign` - 批量分配

### 搜索与筛选
- `GET /api/search/global` - 全局搜索
- `POST /api/:resource/filter` - 高级筛选
- `GET /api/search/suggest` - 搜索建议

### 数据可视化
- `GET /api/stats/overview` - 系统统计
- `GET /api/stats/users` - 用户统计
- `GET /api/stats/tasks` - 任务统计
- `GET /api/stats/audit` - 审计统计

### 权限管理
- `GET /api/rbac/permissions` - 权限列表
- `POST /api/rbac/permissions` - 创建权限
- `GET /api/rbac/roles` - 角色列表
- `POST /api/rbac/roles` - 创建角色
- `PUT /api/rbac/roles/:id/permissions` - 分配角色权限

### 主题配置
- `GET /api/themes` - 获取主题列表
- `POST /api/themes/custom` - 创建自定义主题
- `PUT /api/themes/:id` - 更新主题

## 测试

### 单元测试
```bash
npm run test:unit
```

### 集成测试
```bash
npm run test:integration
```

## 日志

日志文件位于 `logs/` 目录，使用 Winston 进行日志记录。

## 安全

- 使用 Helmet 设置安全 HTTP 头
- 使用 CORS 配置跨域访问
- JWT 令牌认证
- 输入验证和 sanitization
