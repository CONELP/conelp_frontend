<template>
  <button
    class="document-chip"
    :class="{ 'document-chip--selected': selected }"
    type="button"
    :aria-label="document.selectLabel"
    :aria-pressed="selected"
    @click="$emit('select')"
  >
    <span class="document-chip__icon-frame" aria-hidden="true">
      <img
        class="document-chip__icon"
        :src="document.iconSrc"
        alt=""
      />
    </span>
    <span class="document-chip__label">{{ document.chipLabel }}</span>
  </button>
</template>

<script setup lang="ts">
import type { SelectionCardViewData } from "@/features/document-conversion-demo/services/document-conversion-demo.service";

defineProps<{
  document: SelectionCardViewData;
  selected: boolean;
}>();

defineEmits<{
  select: [];
}>();
</script>

<style scoped src="../styles/DocumentTypeCard.css"></style>
