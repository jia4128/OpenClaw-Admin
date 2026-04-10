<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h2>仪表板</h2>
      <ThemeSwitcher />
    </div>

    <!-- 数据卡片 -->
    <n-grid :cols="4" :x-gap="16" :y-gap="16" responsive="screen">
      <n-gi v-for="card in dataCards" :key="card.title">
        <DataCard
          :title="card.title"
          :value="card.value"
          :trend="card.trend"
          :icon="card.icon"
          :color="card.color"
        />
      </n-gi>
    </n-grid>

    <!-- 图表区域 -->
    <n-grid :cols="2" :x-gap="16" :y-gap="16" class="charts-grid" responsive="screen">
      <n-gi>
        <n-card title="用户增长趋势" size="small">
          <LineChart :data="lineChartData" :options="lineChartOptions" />
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="任务分布" size="small">
          <PieChart :data="pieChartData" :options="pieChartOptions" />
        </n-card>
      </n-gi>
    </n-grid>

    <!-- 批量操作区域 -->
    <div class="batch-section">
      <h3>任务列表</h3>
      <BatchOperationBar
        :selected-ids="selectedIds"
        :total-items="tasks.length"
        @batch-delete="handleBatchDelete"
        @batch-export="handleBatchExport"
        @batch-status-change="handleBatchStatusChange"
        @update:selectedIds="selectedIds = $event"
      />

      <n-table :data="tasks" :bordered="false" :single-line="false">
        <thead>
          <tr>
            <th width="50">
              <n-checkbox
                :checked="isAllSelected"
                :indeterminate="isIndeterminate"
                @update:checked="handleSelectAll"
              />
            </th>
            <th>任务名称</th>
            <th>状态</th>
            <th>负责人</th>
            <th>优先级</th>
            <th>截止日期</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in tasks" :key="task.id">
            <td>
              <n-checkbox
                :checked="selectedIds.includes(task.id)"
                @update:checked="(checked) => handleSelectTask(task.id, checked)"
              />
            </td>
            <td>{{ task.name }}</td>
            <td>
              <n-tag :type="getStatusType(task.status)" size="small">
                {{ task.status }}
              </n-tag>
            </td>
            <td>{{ task.assignee }}</td>
            <td>
              <n-tag :type="getPriorityType(task.priority)" size="small">
                {{ task.priority }}
              </n-tag>
            </td>
            <td>{{ task.dueDate }}</td>
            <td>
              <n-space>
                <n-button size="small" @click="handleViewTask(task)">查看</n-button>
                <n-button size="small" type="error" @click="handleDeleteTask(task)">删除</n-button>
              </n-space>
            </td>
          </tr>
        </tbody>
      </n-table>

      <n-pagination
        v-model:page="currentPage"
        v-model:page-size="pageSize"
        :item-count="tasks.length"
        :page-sizes="[10, 20, 50]"
        show-size-picker
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NGrid, NGi, NCard, NTable, NCheckbox, NTag, NSpace, NButton, NPagination, useMessage, useDialog } from 'naive-ui'
import DataCard from '@/components/charts/DataCard.vue'
import LineChart from '@/components/charts/LineChart.vue'
import PieChart from '@/components/charts/PieChart.vue'
import BatchOperationBar from '@/components/business/BatchOperationBar.vue'
import ThemeSwitcher from '@/components/theme/ThemeSwitcher.vue'

interface Task {
  id: string
  name: string
  status: string
  assignee: string
  priority: string
  dueDate: string
}

const message = useMessage()
const dialog = useDialog()

const currentPage = ref(1)
const pageSize = ref(10)
const selectedIds = ref<string[]>([])

const dataCards = [
  { title: '总任务数', value: 1234, trend: 12.5, icon: '📋', color: '#18a058' },
  { title: '进行中', value: 456, trend: 8.3, icon: '🔄', color: '#2080f0' },
  { title: '已完成', value: 678, trend: -3.2, icon: '✅', color: '#00c080' },
  { title: '待处理', value: 100, trend: 5.1, icon: '⏳', color: '#f0a020' }
]

const tasks = ref<Task[]>([
  { id: '1', name: '前端页面开发', status: '进行中', assignee: '张三', priority: '高', dueDate: '2026-04-15' },
  { id: '2', name: 'API 接口设计', status: '已完成', assignee: '李四', priority: '高', dueDate: '2026-04-10' },
  { id: '3', name: '数据库优化', status: '待处理', assignee: '王五', priority: '中', dueDate: '2026-04-20' },
  { id: '4', name: '单元测试编写', status: '进行中', assignee: '赵六', priority: '中', dueDate: '2026-04-18' },
  { id: '5', name: '文档整理', status: '待处理', assignee: '钱七', priority: '低', dueDate: '2026-04-25' }
])

const lineChartData = {
  labels: ['1 月', '2 月', '3 月', '4 月', '5 月', '6 月'],
  datasets: [
    {
      label: '新增用户',
      data: [65, 59, 80, 81, 56, 95],
      borderColor: '#18a058',
      backgroundColor: 'rgba(24, 160, 88, 0.1)'
    },
    {
      label: '活跃用户',
      data: [28, 48, 40, 19, 86, 75],
      borderColor: '#2080f0',
      backgroundColor: 'rgba(32, 128, 240, 0.1)'
    }
  ]
}

const pieChartData = {
  labels: ['高优先级', '中优先级', '低优先级'],
  datasets: [
    {
      data: [30, 50, 20],
      backgroundColor: ['#d03050', '#f0a020', '#18a058']
    }
  ]
}

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top'
    }
  },
  scales: {
    y: {
      beginAtZero: true
    }
  }
}

const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right'
    }
  }
}

const isAllSelected = computed(() => {
  return tasks.value.length > 0 && selectedIds.value.length === tasks.value.length
})

const isIndeterminate = computed(() => {
  return selectedIds.value.length > 0 && selectedIds.value.length < tasks.value.length
})

const getStatusType = (status: string) => {
  const typeMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    '进行中': 'primary',
    '已完成': 'success',
    '待处理': 'warning',
    '已取消': 'error'
  }
  return typeMap[status] || 'default'
}

const getPriorityType = (priority: string) => {
  const typeMap: Record<string, 'success' | 'warning' | 'error'> = {
    '高': 'error',
    '中': 'warning',
    '低': 'success'
  }
  return typeMap[priority] || 'default'
}

const handleSelectAll = (checked: boolean) => {
  if (checked) {
    selectedIds.value = tasks.value.map(t => t.id)
  } else {
    selectedIds.value = []
  }
}

const handleSelectTask = (taskId: string, checked: boolean) => {
  if (checked) {
    if (!selectedIds.value.includes(taskId)) {
      selectedIds.value.push(taskId)
    }
  } else {
    selectedIds.value = selectedIds.value.filter(id => id !== taskId)
  }
}

const handleBatchDelete = () => {
  dialog.warning({
    title: '批量删除',
    content: `确定要删除选中的 ${selectedIds.value.length} 个任务吗？此操作不可逆。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      tasks.value = tasks.value.filter(t => !selectedIds.value.includes(t.id))
      selectedIds.value = []
      message.success('批量删除成功')
    }
  })
}

const handleBatchExport = () => {
  message.success('导出功能开发中...')
}

const handleBatchStatusChange = (status: string) => {
  tasks.value = tasks.value.map(task => {
    if (selectedIds.value.includes(task.id)) {
      return { ...task, status }
    }
    return task
  })
  selectedIds.value = []
  message.success(`批量状态变更成功，已更新为"${status}"`)
}

const handleViewTask = (task: Task) => {
  message.info(`查看任务：${task.name}`)
}

const handleDeleteTask = (task: Task) => {
  dialog.warning({
    title: '删除任务',
    content: `确定要删除任务"${task.name}"吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      tasks.value = tasks.value.filter(t => t.id !== task.id)
      message.success('任务已删除')
    }
  })
}
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.dashboard-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.charts-grid {
  margin: 24px 0;
}

.batch-section {
  margin-top: 32px;
}

.batch-section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
}
</style>
