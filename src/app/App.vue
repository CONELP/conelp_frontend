<template>
  <RouterView />
  <BackgroundDocumentJobDialog />
  <BackgroundDocumentJobToast />
</template>

<script setup lang="ts">
import { onMounted, watch } from "vue";
import { RouterView } from "vue-router";

import { useAuthStore } from "@/features/auth/state/useAuthStore";
import { aiAgentWsClient } from "@/features/ai-agent/services/ai-agent-ws-client";
import { useAiAgentStore } from "@/features/ai-agent/state/useAiAgentStore";
import BackgroundDocumentJobDialog from "@/features/document-conversion/ui/components/BackgroundDocumentJobDialog.vue";
import BackgroundDocumentJobToast from "@/features/document-conversion/ui/components/BackgroundDocumentJobToast.vue";

const authStore = useAuthStore();
const aiAgentStore = useAiAgentStore();

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
