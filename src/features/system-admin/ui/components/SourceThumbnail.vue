<script setup lang="ts">
import { useProxyImage } from "@/features/system-admin/state/useProxyImage";

const props = defineProps<{
  gsUrl: string;
  projectId?: string;
  active?: boolean;
  label?: string;
}>();

defineEmits<{ select: [] }>();

const { objectUrl, isLoading, hasError } = useProxyImage(
  () => props.gsUrl,
  () => props.projectId,
);
</script>

<template>
  <button
    type="button"
    class="thumb"
    :class="{ 'thumb--active': active }"
    :aria-pressed="active"
    @click="$emit('select')"
  >
    <span v-if="isLoading" class="thumb__state">…</span>
    <span v-else-if="hasError" class="thumb__state thumb__state--error">!</span>
    <img v-else-if="objectUrl" :src="objectUrl" :alt="label ?? '사진'" class="thumb__img" />
  </button>
</template>

<style scoped>
.thumb {
  flex: 0 0 auto;
  width: 64px;
  height: 64px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: var(--radius-control);
  overflow: hidden;
  background: #2a2a2a;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.thumb--active {
  border-color: var(--primary);
}
.thumb__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.thumb__state {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}
.thumb__state--error {
  color: #fca5a5;
}
</style>
