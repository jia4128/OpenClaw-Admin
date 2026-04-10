<template>
  <div class="pie-chart">
    <div class="chart-header" v-if="title">
      <h4>{{ title }}</h4>
    </div>
    <div ref="chartRef" class="chart-container"></div>
    <div class="chart-legend" v-if="showLegend">
      <div 
        class="legend-item" 
        v-for="(item, index) in legendData" 
        :key="item.name"
        @click="handleLegendClick(index)"
      >
        <span class="legend-color" :style="{ backgroundColor: colors[index % colors.length] }"></span>
        <span class="legend-name">{{ item.name }}</span>
        <span class="legend-value">{{ item.value }} ({{ item.percent }}%)</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import { NIcon } from 'naive-ui'

interface Props {
  title?: string
  data: Array<{ name: string; value: number }>
  colors?: string[]
  showLegend?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  colors: () => ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#C0C4CC'],
  showLegend: true
})

const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null
const legendData = ref<Array<{ name: string; value: number; percent: number }>>([])

const emit = defineEmits<{
  (e: 'legend-click', index: number): void
}>()

const initChart = () => {
  if (!chartRef.value) return
  
  chartInstance = echarts.init(chartRef.value)
  
  const total = props.data.reduce((sum, item) => sum + item.value, 0)
  legendData.value = props.data.map(item => ({
    ...item,
    percent: total > 0 ? Number(((item.value / total) * 100).toFixed(1)) : 0
  }))
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e4e7ed',
      textStyle: { color: '#303133' }
    },
    legend: {
      show: false
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 8,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: false
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      labelLine: {
        show: false
      },
      data: props.data.map((item, index) => ({
        ...item,
        itemStyle: {
          color: props.colors[index % props.colors.length]
        }
      }))
    }],
    animationDuration: 800,
    animationEasing: 'cubicOut' as const
  }
  
  chartInstance.setOption(option)
}

const handleLegendClick = (index: number) => {
  emit('legend-click', index)
}

const resizeChart = () => {
  chartInstance?.resize()
}

onMounted(() => {
  initChart()
  window.addEventListener('resize', resizeChart)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  chartInstance?.dispose()
})

watch(() => props.data, () => {
  if (chartInstance) {
    initChart()
  }
}, { deep: true })

defineExpose({
  resize: resizeChart
})
</script>

<style scoped>
.pie-chart {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.chart-header {
  margin-bottom: 16px;
}

.chart-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.chart-container {
  width: 100%;
  height: 280px;
}

.chart-legend {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.legend-item:hover {
  background: #f5f7fa;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-name {
  flex: 1;
  font-size: 14px;
  color: #606266;
}

.legend-value {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}
</style>
