<template>
  <div class="batch-operation-bar" v-if="selectedCount > 0">
    <div class="selection-info">
      <n-checkbox 
        :checked="isAllSelected" 
        :indeterminate="isIndeterminate"
        @update:checked="handleSelectAll"
      >
        全选
      </n-checkbox>
      <span class="selection-count">已选择 {{ selectedCount }} 项</span>
    </div>
    
    <div class="operation-buttons">
      <n-button 
        size="small" 
        @click="$emit('batch-delete')"
        type="error"
      >
        批量删除
      </n-button>
      
      <n-dropdown 
        :options="statusOptions"
        @select="handleBatchStatusChange"
        placement="bottom-start"
      >
        <n-button size="small">
          批量状态变更
          <template #icon>
            <n-icon :component="ChevronDown" />
          </template>
        </n-button>
      </n-dropdown>
      
      <n-button 
        size="small" 
        @click="$emit('batch-export')"
      >
        批量导出
      </n-button>
      
      <n-dropdown 
        :options="assignOptions"
        @select="handleBatchAssign"
        placement="bottom-start"
      >
        <n-button size="small">
          批量分配
          <template #icon>
            <n-icon :component="ChevronDown" />
          </template>
        </n-button>
      </n-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NCheckbox, NDropdown, NIcon, useDialog } from 'naive-ui'
import { ChevronDown } from '@vicons/ionicons5'

interface Props {
  selectedIds: string[]
  totalItems: number
  statuses?: string[]
  assignableUsers?: Array<{ id: string; name: string }>
}

const props = withDefaults(defineProps<Props>(), {
  statuses: () => ['待处理', '进行中', '已完成', '已取消'],
  assignableUsers: () => []
})

const emit = defineEmits<{
  (e: 'batch-delete'): void
  (e: 'batch-export'): void
  (e: 'batch-status-change', status: string): void
  (e: 'batch-assign', userId: string): void
  (e: 'update:selectedIds', ids: string[]): void
}>()

const selectedCount = computed(() => props.selectedIds.length)
const isAllSelected = computed(() => props.selectedIds.length === props.totalItems && props.totalItems > 0)
const isIndeterminate = computed(() => props.selectedIds.length > 0 && props.selectedIds.length < props.totalItems)

const statusOptions = computed(() => 
  props.statuses.map(status => ({
    label: status,
    key: status
  }))
)

const assignOptions = computed(() => 
  props.assignableUsers.map(user => ({
    label: user.name,
    key: user.id
  }))
)

const handleSelectAll = (checked: boolean) => {
  if (checked) {
    // Emit event to select all - parent should handle the logic
    emit('update:selectedIds', [])
  } else {
    emit('update:selectedIds', [])
  }
}

const handleBatchStatusChange = (status: string) => {
  confirmBatchOperation(`变更为"${status}"`, () => {
    emit('batch-status-change', status)
  })
}

const handleBatchAssign = (userId: string) => {
  const user = props.assignableUsers.find(u => u.id === userId)
  if (user) {
    confirmBatchOperation(`分配给 ${user.name}`, () => {
      emit('batch-assign', userId)
    })
  }
}

const confirmBatchOperation = (action: string, callback: () => void) => {
  const d = useDialog()
  d.warning({
    title: '批量操作确认',
    content: `您确定要对选中的 ${selectedCount.value} 项记录执行 ${action} 吗？此操作不可逆，请谨慎操作。`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: callback
  })
}
</script>

<style scoped>
.batch-operation-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 16px;
  animation: slideDown 0.3s ease;
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selection-count {
  color: #606266;
  font-size: 14px;
}

.operation-buttons {
  display: flex;
  gap: 8px;
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
