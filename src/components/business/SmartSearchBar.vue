<template>
  <div class="smart-search">
    <div class="search-bar">
      <n-input
        v-model:value="keyword"
        placeholder="搜索任务名称、ID、描述..."
        :prefix-icon="Search"
        clearable
        @input="handleSearchInput"
        @keyup.enter="handleSearch"
      >
        <template #prefix>
          <n-icon :component="Search" />
        </template>
      </n-input>
      
      <n-button @click="showAdvancedFilter = !showAdvancedFilter">
        高级筛选
        <template #icon>
          <n-icon :component="Filter" />
        </template>
      </n-button>
      
      <n-button @click="handleSaveFilter" v-if="hasActiveFilters">
        保存筛选
      </n-button>
    </div>
    
    <!-- 高级筛选面板 -->
    <div v-if="showAdvancedFilter" class="advanced-filter-panel">
      <div class="filter-header">
        <h4>高级筛选</h4>
        <div class="filter-actions">
          <n-button size="small" @click="resetFilters">重置</n-button>
          <n-button size="small" type="primary" @click="applyFilters">应用筛选</n-button>
        </div>
      </div>
      
      <div class="filter-content">
        <n-space vertical :size="16">
          <n-form :model="filterForm" label-placement="left" label-width="80">
            <n-form-item label="任务名称">
              <n-input v-model:value="filterForm.taskName" placeholder="输入任务名称" />
            </n-form-item>
            
            <n-form-item label="状态">
              <n-select
                v-model:value="filterForm.status"
                :options="statusOptions"
                placeholder="选择状态"
                clearable
              />
            </n-form-item>
            
            <n-form-item label="负责人">
              <n-select
                v-model:value="filterForm.assignee"
                :options="userOptions"
                placeholder="选择负责人"
                clearable
                filterable
              />
            </n-form-item>
            
            <n-form-item label="日期范围">
              <n-date-range-picker
                v-model:value="filterForm.dateRange"
                placeholder="选择日期范围"
                format="YYYY-MM-DD"
              />
            </n-form-item>
            
            <n-form-item label="优先级">
              <n-radio-group v-model:value="filterForm.priority">
                <n-space>
                  <n-radio value="">全部</n-radio>
                  <n-radio value="high">高</n-radio>
                  <n-radio value="medium">中</n-radio>
                  <n-radio value="low">低</n-radio>
                </n-space>
              </n-radio-group>
            </n-form-item>
          </n-form>
        </n-space>
      </div>
    </div>
    
    <!-- 筛选条件标签 -->
    <div class="filter-tags" v-if="activeFilters.length > 0">
      <span class="filter-tags-label">当前筛选：</span>
      <n-tag
        v-for="filter in activeFilters"
        :key="filter.key"
        closable
        @close="removeFilter(filter.key)"
        size="small"
      >
        {{ filter.label }}
      </n-tag>
      <n-button text size="small" @click="clearAllFilters">清除全部</n-button>
    </div>
    
    <!-- 搜索建议 -->
    <div class="search-suggestions" v-if="showSuggestions && suggestions.length > 0">
      <div class="suggestion-section">
        <div class="section-title">最近搜索</div>
        <div
          class="suggestion-item"
          v-for="item in recentSearches"
          :key="item"
          @click="selectSuggestion(item)"
        >
          <n-icon :component="Search" />
          <span>{{ item }}</span>
        </div>
      </div>
      
      <div class="suggestion-section" v-if="suggestions.length > 0">
        <div class="section-title">搜索建议</div>
        <div
          class="suggestion-item"
          v-for="item in suggestions"
          :key="item"
          @click="selectSuggestion(item)"
        >
          <n-icon :component="Search" />
          <span>{{ item }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { NInput, NButton, NIcon, NSelect, NDatePicker, NTag, NSpace, NForm, NFormItem, NRadio, NRadioGroup, useMessage } from 'naive-ui'
import { Search, Filter } from '@vicons/ionicons5'

interface Props {
  statuses?: string[]
  users?: Array<{ id: string; name: string }>
}

const props = withDefaults(defineProps<Props>(), {
  statuses: () => ['待处理', '进行中', '已完成', '已取消'],
  users: () => []
})

const emit = defineEmits<{
  (e: 'search', keyword: string): void
  (e: 'filter-apply', filters: any): void
  (e: 'filter-reset'): void
  (e: 'save-filter', name: string, filters: any): void
}>()

const keyword = ref('')
const showAdvancedFilter = ref(false)
const showSuggestions = ref(false)
const suggestions = ref<string[]>([])
const recentSearches = ref<string[]>(['任务 A', '审计日志 2026-04', '待处理任务'])

const filterForm = ref({
  taskName: '',
  status: '',
  assignee: '',
  dateRange: null as [Date, Date] | null,
  priority: ''
})

const statusOptions = computed(() => 
  props.statuses.map(s => ({ label: s, value: s }))
)

const userOptions = computed(() => 
  props.users.map(u => ({ label: u.name, value: u.id }))
)

const hasActiveFilters = computed(() => {
  return Object.values(filterForm.value).some(v => v !== '' && v !== null && v !== undefined)
})

const activeFilters = computed(() => {
  const filters = []
  if (filterForm.value.taskName) {
    filters.push({ key: 'taskName', label: `任务名称=${filterForm.value.taskName}` })
  }
  if (filterForm.value.status) {
    filters.push({ key: 'status', label: `状态=${filterForm.value.status}` })
  }
  if (filterForm.value.assignee) {
    const user = props.users.find(u => u.id === filterForm.value.assignee)
    filters.push({ key: 'assignee', label: `负责人=${user?.name || ''}` })
  }
  if (filterForm.value.priority) {
    const priorityMap: Record<string, string> = { high: '高', medium: '中', low: '低' }
    filters.push({ key: 'priority', label: `优先级=${priorityMap[filterForm.value.priority] || filterForm.value.priority}` })
  }
  return filters
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

const handleSearchInput = (value: string) => {
  if (searchTimer) clearTimeout(searchTimer)
  
  if (value.length >= 2) {
    searchTimer = setTimeout(() => {
      generateSuggestions(value)
      showSuggestions.value = true
    }, 300)
  } else {
    showSuggestions.value = false
  }
}

const generateSuggestions = async (keyword: string) => {
  // Mock suggestion generation - replace with actual API call
  suggestions.value = [
    `${keyword}测试`,
    `${keyword}项目`,
    `${keyword}管理`
  ].filter(s => !recentSearches.value.includes(s))
}

const handleSearch = () => {
  if (keyword.value.trim()) {
    emit('search', keyword.value.trim())
    showSuggestions.value = false
    addToRecentSearches(keyword.value.trim())
  }
}

const addToRecentSearches = (search: string) => {
  if (!recentSearches.value.includes(search)) {
    recentSearches.value.unshift(search)
    if (recentSearches.value.length > 5) {
      recentSearches.value.pop()
    }
  }
}

const selectSuggestion = (suggestion: string) => {
  keyword.value = suggestion
  handleSearch()
}

const applyFilters = () => {
  emit('filter-apply', filterForm.value)
  showAdvancedFilter.value = false
}

const resetFilters = () => {
  filterForm.value = {
    taskName: '',
    status: '',
    assignee: '',
    dateRange: null,
    priority: ''
  }
  emit('filter-reset')
}

const removeFilter = (key: string) => {
  if (key === 'taskName') filterForm.value.taskName = ''
  if (key === 'status') filterForm.value.status = ''
  if (key === 'assignee') filterForm.value.assignee = ''
  if (key === 'priority') filterForm.value.priority = ''
  emit('filter-apply', filterForm.value)
}

const clearAllFilters = () => {
  resetFilters()
}

const handleSaveFilter = () => {
  const message = useMessage()
  const name = prompt('请输入筛选条件名称:')
  if (name) {
    emit('save-filter', name, filterForm.value)
    message.success('筛选条件已保存')
  }
}

onMounted(() => {
  // Load saved recent searches from localStorage
  const saved = localStorage.getItem('recentSearches')
  if (saved) {
    recentSearches.value = JSON.parse(saved)
  }
})

watch(recentSearches, (val) => {
  localStorage.setItem('recentSearches', JSON.stringify(val))
}, { deep: true })
</script>

<style scoped>
.smart-search {
  position: relative;
}

.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.advanced-filter-panel {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
  animation: slideDown 0.3s ease;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filter-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.filter-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.filter-tags-label {
  color: #606266;
  font-size: 14px;
}

.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
}

.suggestion-section {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.suggestion-section:last-child {
  border-bottom: none;
}

.section-title {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.suggestion-item:hover {
  background: #f5f7fa;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
