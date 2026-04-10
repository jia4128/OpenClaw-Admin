<template>
  <div class="theme-switcher">
    <n-dropdown
      :options="themeOptions"
      @select="handleThemeSelect"
      placement="bottom-end"
    >
      <n-button quaternary>
        <template #icon>
          <n-icon :component="themeIcon" size="20" />
        </template>
        {{ themeLabel }}
      </n-button>
    </n-dropdown>

    <!-- 主题设置面板 -->
    <n-modal
      v-model:show="showSettings"
      preset="card"
      title="主题设置"
      style="width: 500px"
    >
      <n-space vertical :size="20">
        <!-- 主题模式选择 -->
        <div class="setting-section">
          <h4>主题模式</h4>
          <n-radio-group v-model:value="localThemeMode">
            <n-space>
              <n-radio value="light">
                <n-icon :component="Sunny" />
                亮色
              </n-radio>
              <n-radio value="dark">
                <n-icon :component="Moon" />
                暗色
              </n-radio>
              <n-radio value="auto">
                <n-icon :component="Desktop" />
                跟随系统
              </n-radio>
            </n-space>
          </n-radio-group>
        </div>

        <!-- 主题色选择 -->
        <div class="setting-section">
          <h4>主题色</h4>
          <n-color-picker
            v-model:value="localThemeColor"
            :modes="['hex']"
            :swatches="themeColorSwatches"
            @update:value="handleThemeColorChange"
          />
        </div>

        <!-- 预览 -->
        <div class="setting-section">
          <h4>预览</h4>
          <div class="theme-preview">
            <n-button :type="primaryButtonType">主要按钮</n-button>
            <n-tag :type="primaryTagType">标签</n-tag>
            <n-card title="卡片标题" style="width: 200px">
              这是一个预览卡片
            </n-card>
          </div>
        </div>
      </n-space>

      <template #footer>
        <n-space justify="end">
          <n-button @click="showSettings = false">取消</n-button>
          <n-button type="primary" @click="handleSaveSettings">应用</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NButton, NIcon, NDropdown, NModal, NCard, NTag, NSpace, NRadio, NRadioGroup, NColorPicker, useMessage } from 'naive-ui'
import { Sunny, Moon, Desktop, Palette } from '@vicons/ionicons5'
import { useThemeStore, type ThemeMode } from '@/stores/theme'

const themeStore = useThemeStore()
const message = useMessage()

const showSettings = ref(false)
const localThemeMode = ref<ThemeMode>(themeStore.mode)
const localThemeColor = ref('#18a058')

const themeColorSwatches = [
  '#18a058', // 绿色
  '#2080f0', // 蓝色
  '#f0a020', // 橙色
  '#d03050', // 红色
  '#7040a0', // 紫色
  '#000000', // 黑色
  '#507090'  // 青色
]

const themeOptions = computed(() => [
  { label: '亮色模式', value: 'light', icon: Sunny },
  { label: '暗色模式', value: 'dark', icon: Moon },
  { label: '跟随系统', value: 'auto', icon: Desktop },
  { type: 'divider', key: 'divider' },
  { label: '主题设置', value: 'settings', icon: Palette }
])

const themeLabel = computed(() => {
  const map: Record<ThemeMode, string> = {
    light: '亮色',
    dark: '暗色',
    auto: '自动'
  }
  return map[themeStore.mode] || '主题'
})

const themeIcon = computed(() => {
  const map: Record<ThemeMode, any> = {
    light: Sunny,
    dark: Moon,
    auto: Desktop
  }
  return map[themeStore.mode] || Sunny
})

const primaryButtonType = computed(() => {
  return themeStore.mode === 'dark' ? 'success' : 'primary'
})

const primaryTagType = computed(() => {
  return themeStore.mode === 'dark' ? 'success' : 'info'
})

const handleThemeSelect = (value: string) => {
  if (value === 'settings') {
    showSettings.value = true
  } else {
    const mode = value as ThemeMode
    if (mode === 'auto') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      themeStore.setMode(systemTheme)
    } else {
      themeStore.setMode(mode)
    }
  }
}

const handleThemeColorChange = (color: string) => {
  localThemeColor.value = color
  // Apply theme color to document
  document.documentElement.style.setProperty('--primary-color', color)
}

const handleSaveSettings = () => {
  if (localThemeMode.value === 'auto') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    themeStore.setMode(systemTheme)
  } else {
    themeStore.setMode(localThemeMode.value)
  }
  
  // Save theme color to localStorage
  localStorage.setItem('theme_color', localThemeColor.value)
  
  message.success('主题设置已应用')
  showSettings.value = false
}

// Listen to system theme changes
watch(
  () => localThemeMode.value,
  (val) => {
    if (val === 'auto') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      themeStore.setMode(systemTheme)
    }
  }
)

// Load saved theme color
const savedColor = localStorage.getItem('theme_color')
if (savedColor) {
  localThemeColor.value = savedColor
  document.documentElement.style.setProperty('--primary-color', savedColor)
}
</script>

<style scoped>
.theme-switcher {
  display: inline-block;
}

.setting-section {
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.setting-section:last-child {
  border-bottom: none;
}

.setting-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.theme-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 8px;
}
</style>
