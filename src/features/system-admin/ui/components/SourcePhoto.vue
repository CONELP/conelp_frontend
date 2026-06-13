<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

import { superDocumentApi } from "@/features/system-admin/services/super-document.api";

const props = defineProps<{
  gsUrl: string;
  projectId?: string;
  description?: string | null;
  type?: string | null;
}>();

const objectUrl = ref<string | null>(null);
const isLoading = ref(true);
const hasError = ref(false);

onMounted(async () => {
  try {
    const blob = await superDocumentApi.downloadPhotoBlob(props.gsUrl, props.projectId);
    objectUrl.value = URL.createObjectURL(blob);
  } catch (error) {
    console.error("사진 로드 실패:", error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
});

onUnmounted(() => {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value);
});
</script>

<template>
  <figure class="source-photo">
    <div class="source-photo__frame">
      <div v-if="isLoading" class="source-photo__placeholder">불러오는 중…</div>
      <div v-else-if="hasError" class="source-photo__placeholder source-photo__placeholder--error">
        불러오기 실패
      </div>
      <a
        v-else-if="objectUrl"
        :href="objectUrl"
        target="_blank"
        rel="noopener"
        class="source-photo__link"
      >
        <img :src="objectUrl" :alt="description ?? type ?? '원본 사진'" class="source-photo__img" />
      </a>
    </div>
    <figcaption v-if="type || description" class="source-photo__caption">
      <span v-if="type" class="source-photo__type">{{ type }}</span>
      <span v-if="description">{{ description }}</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.source-photo {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.source-photo__frame {
  width: 120px;
  height: 120px;
  border: 1px solid var(--outline-soft);
  border-radius: var(--radius-control);
  overflow: hidden;
  background: var(--surface-3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.source-photo__placeholder {
  font-size: 11px;
  color: var(--ink-faint);
  text-align: center;
  padding: 8px;
}
.source-photo__placeholder--error {
  color: #b91c1c;
}
.source-photo__link {
  display: block;
  width: 100%;
  height: 100%;
}
.source-photo__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.source-photo__caption {
  font-size: 11px;
  color: var(--ink-muted);
  display: flex;
  flex-direction: column;
  gap: 1px;
  max-width: 120px;
}
.source-photo__type {
  font-weight: 600;
  color: var(--ink);
}
</style>
