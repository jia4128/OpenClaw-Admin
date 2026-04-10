<template>
  <div class="batch-actions-bar">
    <NSpace v-if="selectedCount > 0" align="center">
      <NTag type="info">
        {{ t('batch.selectedCount', { count: selectedCount }) }}
      </NTag>
      
      <NButtonGroup>
        <NButton size="small" @click="emit('batchAction', 'enable')">
          <template #icon>
            <NIcon><PlayOutline /></NIcon>
          </template>
          {{ t('batch.enable') }}
        </NButton>
        
        <NButton size="small" @click="emit('batchAction', 'disable')">
          <template #icon>
            <NIcon><PauseCircleOutline /></NIcon>
          </template>
          {{ t('batch.disable') }}
        </NButton>
        
        <NButton size="small" type="error" @click="handleBatchDelete">
          <template #icon>
            <NIcon><TrashOutline /></NIcon>
          </template>
          {{ t('batch.delete') }}
        </NButton>
      </NButtonGroup>

      <NButton size="small" @click="emit('batchAction', 'export')">
        <template #icon>
          <NIcon><DownloadOutline /></NIcon>
        </template>
        {{ t('batch.export') }}
      </NButton>
    </NSpace>

    <!-- 全选复选框 -->
    <template v-if="showSelectAll">
      <NCheckbox 
        :checked="allSelected" 
        :indeterminate="indeterminate"
        @update:checked="toggleSelectAll"
      >
        {{ t('batch.selectAll') }}
      </NCheckbox>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  NButton,
  NButtonGroup,
  NCheckbox,
  NIcon,
  NTag,
  NSpace,
} from 'naive-ui'
import {
  PlayOutline,
  PauseCircleOutline,
  TrashOutline,
  DownloadOutline,
} from '@vicons/ionicons5'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  selectedIds: string[]
  totalItems: number
  showSelectAll?: boolean
}>()

const emit = defineEmits<{
  (e: 'batchAction', action: 'enable' | 'disable' | 'delete' | 'export'): void
  (e: 'update:selectedIds', ids: string[]): void
}>()

const { t, locale } = useI18n()

const selectedCount = computed(() => props.selectedIds.length)

const allSelected = computed(() => {
  return props.selectedIds.length === props.totalItems && props.totalItems > 0
})

const indeterminate = computed(() => {
  return props.selectedIds.length > 0 && props.selectedIds.length < props.totalItems
})

function toggleSelectAll(checked: boolean): void {
  if (checked) {
    // 全选 - 需要父组件提供所有 ID
    emit('update:selectedIds', []) // 由父组件处理
  } else {
    emit('update:selectedIds', [])
  }
}

function handleBatchDelete(): void {
  if (confirm(t('batch.confirmDelete', { count: selectedCount.value }))) {
    emit('batchAction', 'delete')
  }
}

// 监听选中状态变化
watch(() => props.selectedIds, (newIds) => {
  // 可以在这里添加日志或分析
}, { deep: true })
</script>

<style scoped>
.batch-actions-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--n-color);
  border-radius: 8px;
  margin-bottom: 16px;
}

:deep(.n-checkbox) {
  font-weight: 500;
}
</style>
