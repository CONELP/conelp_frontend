<template>
  <button
    class="document-chip"
    :class="{ 'document-chip--selected': selected }"
    type="button"
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

<style scoped>
.document-chip {
  display: flex;
  align-items: center;
  gap: 0.52rem;
  width: 100%;
  min-height: clamp(4.55rem, 8vh, 5.35rem);
  padding: 0.84rem 0.95rem;
  border: 1px solid var(--outline-soft);
  border-radius: 1.05rem;
  background: var(--surface-1);
  color: var(--ink);
  text-align: left;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease;
}

.document-chip:hover {
  border-color: var(--primary-outline);
}

.document-chip--selected {
  border-width: 2px;
  border-color: var(--primary);
  background: rgba(30, 24, 136, 0.04);
}

.document-chip__icon-frame {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 999px;
  border: 1px solid var(--outline-soft);
  background: transparent;
}

.document-chip__icon {
  width: 1.16rem;
  height: 1.16rem;
  object-fit: contain;
  opacity: 0.46;
}

.document-chip--selected .document-chip__icon-frame {
  border-color: var(--primary-outline);
}

.document-chip--selected .document-chip__icon {
  opacity: 0.6;
}

.document-chip__label {
  font-size: 1.01rem;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
}

@media (min-width: 768px) {
  .document-chip {
    min-height: 5rem;
    padding: 0.92rem 1.04rem;
  }

  .document-chip__icon {
    width: 1.22rem;
    height: 1.22rem;
  }

  .document-chip__label {
    font-size: 1.06rem;
  }
}
</style>
