<template>
  <RouterView />
</template>

<script setup lang="ts">
import { onMounted, watch } from "vue";
import { RouterView } from "vue-router";

import { useAuthStore } from "@/features/auth/state/useAuthStore";
import { aiAgentWsClient } from "@/features/ai-agent/services/ai-agent-ws-client";
import { useAiAgentStore } from "@/features/ai-agent/state/useAiAgentStore";

const authStore = useAuthStore();
const aiAgentStore = useAiAgentStore();

watch(
  () => authStore.isAuthenticated,
  (isAuth, wasAuth) => {
    if (isAuth && !wasAuth) {
      aiAgentWsClient.connect(aiAgentStore);
    } else if (!isAuth && wasAuth) {
      aiAgentWsClient.disconnect();
      aiAgentStore.reset();
    }
  },
);

onMounted(() => {
  void authStore.initialize().then(() => {
    if (authStore.isAuthenticated) {
      aiAgentWsClient.connect(aiAgentStore);
    }
  });
});
</script>
