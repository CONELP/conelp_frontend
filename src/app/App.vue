<template>
  <RouterView />
  <BackgroundDocumentJobToast />
  <OfflineBanner v-if="!isOnline" />
</template>

<script setup lang="ts">
import { onMounted, watch } from "vue";
import { RouterView } from "vue-router";

import { useAuthStore } from "@/features/auth/state/useAuthStore";
import { aiAgentWsClient } from "@/features/ai-agent/services/ai-agent-ws-client";
import { useAiAgentStore } from "@/features/ai-agent/state/useAiAgentStore";
import BackgroundDocumentJobToast from "@/features/document-conversion/ui/components/BackgroundDocumentJobToast.vue";
import OfflineBanner from "@/shared/ui/OfflineBanner.vue";
import { useOnlineStatus } from "@/shared/useOnlineStatus";

const authStore = useAuthStore();
const aiAgentStore = useAiAgentStore();
const { isOnline } = useOnlineStatus();

watch(
  () => authStore.isAuthenticated,
  (isAuth, wasAuth) => {
    if (!isAuth && wasAuth) {
      aiAgentWsClient.disconnect();
      aiAgentStore.reset();
    }
  },
);

onMounted(() => {
  void authStore.initialize();
});
</script>
