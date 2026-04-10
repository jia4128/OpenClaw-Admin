<template>
  <div class="data-card">
    <div class="card-header">
      <n-icon :component="iconComponent" :size="24" :color="iconColor" />
      <span class="card-title">{{ title }}</span>
    </div>
    <div class="card-value">{{ formattedValue }}</div>
    <div class="card-trend" :class="trendClass">
      <n-icon :component="trendIcon" />
      <span>{{ trendText }}</span>
      <span class="trend-detail">{{ trendDetail }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NIcon } from 'naive-ui'
import { 
  TrendingUp, TrendingDown,
  People, CheckmarkCircle, Warning,
  Time, Calendar
} from '@vicons/ionicons5'

interface Props {
  title: string
  value: number | string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: number | string
  trendDetail?: string
  icon: string
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  trend: 'neutral',
  trendValue: 0,
  color: '#409EFF'
})

const iconComponent = computed(() => {
  const iconMap: Record<string, any> = {
    'tasks': People,
    'completed': CheckmarkCircle,
    'warning': Warning,
    'time': Time,
    'calendar': Calendar
  }
  return iconMap[props.icon] || People
})

const iconColor = computed(() => props.color)

const formattedValue = computed(() => {
  if (typeof props.value === 'number') {
    return props.value.toLocaleString()
  }
  return props.value
})

const trendClass = computed(() => `trend-${props.trend}`)

const trendIcon = computed(() => {
  if (props.trend === 'up') return TrendingUp
  if (props.trend === 'down') return TrendingDown
  return TrendingUp // 默认使用向上图标替代 Min
})

const trendText = computed(() => {
  if (props.trendValue === undefined || props.trendValue === null) return ''
  const sign = props.trend === 'up' ? '+' : props.trend === 'down' ? '-' : ''
  return `${sign}${props.trendValue}%`
})

const trendDetail = computed(() => props.trendDetail || '')
</script>

<style scoped>
.data-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.data-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.card-title {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.card-value {
  font-size: 32px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 12px;
  line-height: 1;
}

.card-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.trend-up {
  color: #67C23A;
}

.trend-down {
  color: #F56C6C;
}

.trend-neutral {
  color: #909399;
}

.trend-detail {
  color: #909399;
  margin-left: 4px;
}
</style>
