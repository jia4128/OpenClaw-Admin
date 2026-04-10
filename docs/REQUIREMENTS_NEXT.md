# 需求文档：数据可视化组件库

**版本**: 1.0.0  
**创建时间**: 2026-04-11  
**优先级**: P1 - 高优先级  
**负责人**: 前端开发  
**状态**: 待开始

---

## 1. 概述

### 1.1 项目背景
后端已完成数据可视化相关 API 接口开发（stats.routes.js），包括系统统计概览、用户统计、任务统计、审计统计等 5 个接口。前端需要实现相应的可视化组件库来展示这些数据。

### 1.2 目标
构建一套可复用、高性能、美观的数据可视化组件库，支持多种图表类型，满足管理后台的数据展示需求。

### 1.3 范围
- 基础图表组件（折线图、柱状图、饼图、雷达图等）
- 统计卡片组件
- 数据表格组件
- 图表布局组件
- 主题适配支持

---

## 2. 功能需求

### 2.1 基础图表组件

#### 2.1.1 折线图 (LineChart)
**用途**: 展示趋势数据（如用户增长、任务完成率）

**Props**:
```typescript
interface LineChartProps {
  data: Array<{
    label: string;
    value: number;
  }>;
  title?: string;
  xLabel?: string;
  yLabel?: string;
  color?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  height?: number;
}
```

**功能要求**:
- 支持多系列数据
- 支持数据点标记
- 支持鼠标悬停显示详细数据
- 支持平滑曲线/折线切换
- 支持动画效果

#### 2.1.2 柱状图 (BarChart)
**用途**: 展示分类对比数据（如角色分布、任务状态分布）

**Props**:
```typescript
interface BarChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  title?: string;
  horizontal?: boolean;
  showValue?: boolean;
  height?: number;
}
```

**功能要求**:
- 支持垂直/水平方向
- 支持分组柱状图
- 支持堆叠柱状图
- 支持值标签显示
- 支持点击交互

#### 2.1.3 饼图/环形图 (PieChart)
**用途**: 展示占比数据（如权限分布、状态分布）

**Props**:
```typescript
interface PieChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  title?: string;
  type?: 'pie' | 'donut';
  showPercentage?: boolean;
  innerRadius?: number;
  height?: number;
}
```

**功能要求**:
- 支持饼图/环形图切换
- 支持百分比显示
- 支持图例点击隐藏/显示
- 支持鼠标悬停高亮
- 支持中心文字显示

#### 2.1.4 雷达图 (RadarChart)
**用途**: 展示多维度数据对比（如用户能力评估）

**Props**:
```typescript
interface RadarChartProps {
  data: Array<{
    label: string;
    values: Record<string, number>;
  }>;
  title?: string;
  dimensions: string[];
  height?: number;
}
```

**功能要求**:
- 支持多系列对比
- 支持填充/边框模式
- 支持网格线自定义
- 支持数据点标记

#### 2.1.5 面积图 (AreaChart)
**用途**: 展示趋势及占比（如流量趋势）

**Props**:
```typescript
interface AreaChartProps {
  data: Array<{
    label: string;
    value: number;
  }>;
  title?: string;
  stacked?: boolean;
  gradient?: boolean;
  height?: number;
}
```

**功能要求**:
- 支持堆叠模式
- 支持渐变色填充
- 支持透明度调整
- 支持平滑曲线

### 2.2 统计卡片组件

#### 2.2.1 统计卡片 (StatCard)
**用途**: 展示关键指标

**Props**:
```typescript
interface StatCardProps {
  title: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  icon?: string;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
}
```

**功能要求**:
- 支持图标显示
- 支持变化率展示（同比/环比）
- 支持趋势箭头
- 支持颜色主题
- 支持点击跳转

#### 2.2.2 指标组 (StatGroup)
**用途**: 组合多个统计卡片

**Props**:
```typescript
interface StatGroupProps {
  items: StatCardProps[];
  columns?: number;
  gap?: number;
}
```

### 2.3 数据表格组件

#### 2.3.1 增强表格 (EnhancedTable)
**用途**: 展示可交互的数据表格

**Props**:
```typescript
interface EnhancedTableProps {
  columns: Array<{
    key: string;
    title: string;
    type?: 'text' | 'number' | 'date' | 'status' | 'action';
    sortable?: boolean;
    render?: (value: any, row: any) => VNode;
  }>;
  data: any[];
  pagination?: boolean;
  selectable?: boolean;
  loading?: boolean;
  onSort?: (field: string, order: 'asc' | 'desc') => void;
  onSelect?: (selectedRows: any[]) => void;
}
```

**功能要求**:
- 支持列排序
- 支持行选择（单选/多选）
- 支持分页
- 支持自定义列渲染
- 支持加载状态
- 支持响应式布局

#### 2.3.2 统计表格 (StatsTable)
**用途**: 展示统计数据的表格

**Props**:
```typescript
interface StatsTableProps {
  data: Array<{
    label: string;
    value: number | string;
    change?: number;
  }>;
  showChange?: boolean;
}
```

### 2.4 图表布局组件

#### 2.4.1 图表容器 (ChartContainer)
**用途**: 图表的统一容器

**Props**:
```typescript
interface ChartContainerProps {
  title: string;
  subtitle?: string;
  actions?: VNode;
  height?: number;
  loading?: boolean;
  empty?: boolean;
  emptyText?: string;
}
```

**功能要求**:
- 统一卡片样式
- 支持标题/副标题
- 支持操作按钮区域
- 支持加载状态
- 支持空状态

#### 2.4.2 仪表板布局 (DashboardLayout)
**用途**: 仪表盘页面布局

**Props**:
```typescript
interface DashboardLayoutProps {
  columns?: number;
  gap?: number;
  responsive?: boolean;
}
```

### 2.5 主题适配

#### 2.5.1 主题支持
- 支持亮色/暗色主题自动切换
- 支持主题色自定义
- 支持图表颜色继承主题

#### 2.5.2 响应式支持
- 支持移动端适配
- 支持图表自适应缩放
- 支持触摸交互

---

## 3. 技术需求

### 3.1 技术选型
**推荐方案**: 使用 Apache ECharts (通过 vue-echarts)
- 成熟稳定，功能丰富
- 性能优秀，支持大数据量
- 文档完善，社区活跃
- 支持主题定制

**备选方案**: Chart.js (通过 vue-chartjs)
- 轻量级
- 简单易用
- 动画效果好

### 3.2 性能要求
- 单个图表渲染时间 < 100ms
- 支持 1000+ 数据点流畅渲染
- 支持虚拟滚动（表格）
- 支持按需加载

### 3.3 兼容性要求
- 支持 Chrome 80+
- 支持 Firefox 75+
- 支持 Safari 13+
- 支持 Edge 80+

### 3.4 代码规范
- 使用 TypeScript 编写
- 遵循 Vue 3 Composition API 规范
- 组件命名采用 PascalCase
- Props 使用 camelCase
- 事件使用 kebab-case

---

## 4. API 对接需求

### 4.1 数据接口映射

| 前端组件 | 后端接口 | 数据用途 |
|---------|---------|---------|
| 趋势折线图 | GET /api/stats/users | 用户增长趋势 |
| 状态柱状图 | GET /api/stats/tasks | 任务状态分布 |
| 角色饼图 | GET /api/stats/users | 角色分布 |
| 操作雷达图 | GET /api/stats/audit | 操作类型分布 |
| 统计卡片 | GET /api/stats/overview | 系统概览指标 |
| 审计表格 | GET /api/audit | 审计日志列表 |

### 4.2 数据格式转换
需要创建数据适配器，将后端数据格式转换为图表组件所需格式：

```typescript
// 示例：用户增长数据适配器
function adaptUserGrowthData(apiData: any[]) {
  return apiData.map(item => ({
    label: formatDate(item.date),
    value: item.count
  }));
}

// 示例：任务状态数据适配器
function adaptTaskStatusData(apiData: any[]) {
  return apiData.map(item => ({
    label: getStatusLabel(item.status),
    value: item.count,
    color: getStatusColor(item.status)
  }));
}
```

---

## 5. 页面集成需求

### 5.1 仪表盘页面 (Dashboard)
**位置**: `/src/views/Dashboard.vue`

**需要集成的组件**:
- StatGroup (顶部统计卡片组)
- LineChart (用户增长趋势)
- BarChart (任务状态分布)
- PieChart (角色分布)
- EnhancedTable (最近活动列表)

### 5.2 用户管理页面
**位置**: `/src/views/settings/Users.vue`

**需要集成的组件**:
- EnhancedTable (用户列表)
- PieChart (用户状态分布)
- LineChart (用户增长趋势)

### 5.3 任务管理页面
**位置**: `/src/views/sessions/Tasks.vue`

**需要集成的组件**:
- EnhancedTable (任务列表)
- BarChart (任务优先级分布)
- AreaChart (任务完成趋势)

### 5.4 审计日志页面
**位置**: `/src/views/audit/Logs.vue`

**需要集成的组件**:
- EnhancedTable (日志列表)
- PieChart (操作类型分布)
- LineChart (操作趋势)

### 5.5 性能监控页面
**位置**: `/src/views/monitor/Performance.vue`

**需要集成的组件**:
- StatGroup (性能指标卡片)
- LineChart (CPU/内存趋势)
- AreaChart (请求量趋势)

---

## 6. 设计需求

### 6.1 视觉规范

#### 6.1.1 颜色规范
```typescript
// 主题色
primary: '#1890ff'
success: '#52c41a'
warning: '#faad14'
error: '#ff4d4f'

// 图表配色方案
chartColors: [
  '#1890ff', '#52c41a', '#faad14', '#ff4d4f',
  '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'
]

// 状态色
statusColors: {
  active: '#52c41a',
  pending: '#faad14',
  completed: '#1890ff',
  failed: '#ff4d4f'
}
```

#### 6.1.2 尺寸规范
- 卡片圆角：8px
- 图表高度：最小 300px，默认 400px
- 统计卡片高度：120px
- 表格行高：56px

#### 6.1.3 间距规范
- 卡片内边距：24px
- 组件间距：16px
- 网格间距：24px

### 6.2 交互规范
- 图表悬停：显示详细数据 tooltip
- 图表点击：触发对应数据筛选
- 卡片点击：跳转到详情页面
- 表格行悬停：高亮显示

### 6.3 动画规范
- 图表加载动画：fade-in + scale-in
- 数据更新动画：smooth transition
- 交互动画：200-300ms

---

## 7. 交付物清单

### 7.1 组件文件结构
```
/src/components/charts/
├── index.ts                    # 组件导出
├── LineChart.vue               # 折线图组件
├── BarChart.vue                # 柱状图组件
├── PieChart.vue                # 饼图组件
├── RadarChart.vue              # 雷达图组件
├── AreaChart.vue               # 面积图组件
├── StatCard.vue                # 统计卡片组件
├── StatGroup.vue               # 统计卡片组组件
├── EnhancedTable.vue           # 增强表格组件
├── StatsTable.vue              # 统计表格组件
├── ChartContainer.vue          # 图表容器组件
├── DashboardLayout.vue         # 仪表板布局组件
└── hooks/
    ├── useChartTheme.ts        # 图表主题 Hook
    └── useChartData.ts         # 图表数据 Hook
```

### 7.2 工具函数
```
/src/utils/charts.ts            # 图表工具函数
/src/composables/useCharts.ts   # 图表 Composable
```

### 7.3 类型定义
```
/src/types/charts.ts            # 图表类型定义
```

### 7.4 文档
```
/docs/COMPONENT_LIBRARY.md      # 组件使用文档
/docs/CHARTS_GUIDE.md           # 图表使用指南
```

---

## 8. 验收标准

### 8.1 功能验收
- [ ] 所有图表组件可正常渲染
- [ ] 数据适配器正确转换后端数据
- [ ] 图表交互功能正常（悬停、点击、筛选）
- [ ] 统计卡片显示正确
- [ ] 表格支持排序、筛选、分页
- [ ] 主题切换后图表颜色正确更新

### 8.2 性能验收
- [ ] 首屏加载时间 < 3s
- [ ] 图表渲染时间 < 100ms
- [ ] 支持 1000+ 数据点流畅渲染
- [ ] 内存占用合理，无内存泄漏

### 8.3 兼容性验收
- [ ] 在 Chrome/Firefox/Safari/Edge 上测试通过
- [ ] 移动端浏览器适配正常
- [ ] 响应式布局正常

### 8.4 代码质量验收
- [ ] TypeScript 类型定义完整
- [ ] 代码遵循 ESLint 规范
- [ ] 组件有完整的 Props 类型定义
- [ ] 关键函数有注释说明

---

## 9. 开发计划

### 阶段 1: 基础组件开发 (预计 2 天)
- 搭建图表组件框架
- 实现 LineChart、BarChart、PieChart
- 实现 StatCard、StatGroup
- 实现 ChartContainer

### 阶段 2: 高级组件开发 (预计 2 天)
- 实现 RadarChart、AreaChart
- 实现 EnhancedTable、StatsTable
- 实现 DashboardLayout

### 阶段 3: 工具与适配 (预计 1 天)
- 实现数据适配器
- 实现主题 Hook
- 实现类型定义

### 阶段 4: 页面集成 (预计 2 天)
- 集成到 Dashboard 页面
- 集成到各管理页面
- 数据对接测试

### 阶段 5: 优化与文档 (预计 1 天)
- 性能优化
- 编写使用文档
- 代码审查

**总预计工期**: 8 个工作日

---

## 10. 风险与依赖

### 10.1 技术风险
- ECharts 学习曲线较陡
- 大数据量渲染性能问题

**应对措施**:
- 提前进行技术预研
- 使用虚拟滚动优化表格
- 数据采样优化大数据量图表

### 10.2 依赖项
- 后端 API 接口已就绪
- UI 设计规范已确定
- 主题系统已实现

---

## 11. 附录

### 11.1 参考资源
- [ECharts 官方文档](https://echarts.apache.org/zh/index.html)
- [Vue-ECharts 组件](https://github.com/ecomfe/vue-echarts)
- [Ant Design Vue 图表](https://antdv.com/components/chart)

### 11.2 示例代码
详见组件库文档中的使用示例。

---

**文档版本**: 1.0.0  
**最后更新**: 2026-04-11  
**编写人**: 产品经理 (WinClaw AI 助手)
