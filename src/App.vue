<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NNotificationProvider,
  zhCN,
  enUS,
  dateZhCN,
  dateEnUS,
} from "naive-ui";
import { useI18n } from "vue-i18n";
import { useTheme } from "@/composables/useTheme";
import { useLocaleStore } from "@/stores/locale";
import { useAgentStore } from "@/stores/agent";

const { theme } = useTheme();
const route = useRoute();
const localeStore = useLocaleStore();
const agentStore = useAgentStore();
const { t } = useI18n();

const naiveLocale = computed(() =>
  localeStore.locale === "zh-CN" ? zhCN : enUS,
);
const naiveDateLocale = computed(() =>
  localeStore.locale === "zh-CN" ? dateZhCN : dateEnUS,
);

watch(
  () =>
    [route.meta.titleKey as string | undefined, localeStore.locale] as const,
  ([titleKey]) => {
    if (typeof document === "undefined") return;
    if (!titleKey) {
      document.title = "OpenClaw Admin";
      return;
    }
    const title = t(titleKey);
    document.title = `${title} - OpenClaw Admin`;
  },
  { immediate: true },
);

/**
 * Initialize agent store for real-time dynamic agent detection.
 * This enables support for dynamically created agents (e.g., from wecom plugin).
 */
onMounted(async () => {
  try {
    // Initialize agent store with auto-refresh and WebSocket event listeners
    await agentStore.initialize();
    console.log("[App] Agent store initialized successfully");
  } catch (error) {
    console.error("[App] Failed to initialize agent store:", error);
    // Continue anyway - agent store should have sensible defaults
  }
});

/**
 * Cleanup: stop auto-refresh when app is unmounted.
 */
onUnmounted(() => {
  agentStore.stopAutoRefresh();
  console.log("[App] Cleanup: agent store auto-refresh stopped");
});
</script>

<template>
  <NConfigProvider
    :theme="theme"
    :locale="naiveLocale"
    :date-locale="naiveDateLocale"
  >
    <NNotificationProvider>
      <NMessageProvider>
        <NDialogProvider>
          <RouterView />
        </NDialogProvider>
      </NMessageProvider>
    </NNotificationProvider>
  </NConfigProvider>
</template>
