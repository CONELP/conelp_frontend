<template>
  <RouterView />
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { RouterView } from "vue-router";

import { useAuthStore } from "@/features/auth/state/useAuthStore";

const authStore = useAuthStore();

onMounted(() => {
  void authStore.initialize();
});
</script>
