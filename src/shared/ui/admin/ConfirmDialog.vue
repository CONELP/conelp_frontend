<script setup lang="ts">
import AdminDialog from "@/shared/ui/admin/Dialog.vue";
import AdminButton from "@/shared/ui/admin/Button.vue";

withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    width?: "sm" | "md" | "lg" | "xl";
  }>(),
  {
    title: "확인",
    confirmLabel: "확인",
    cancelLabel: "취소",
    destructive: false,
    width: "sm",
  },
);

const emit = defineEmits<{
  "update:open": [value: boolean];
  confirm: [];
}>();

function onCancel() {
  emit("update:open", false);
}

function onConfirm() {
  emit("confirm");
  emit("update:open", false);
}
</script>

<template>
  <AdminDialog
    :open="open"
    :title="title"
    :width="width"
    @update:open="emit('update:open', $event)"
  >
    <p v-if="message" class="confirm-dialog__msg">{{ message }}</p>
    <slot />
    <template #footer>
      <AdminButton variant="outline" @click="onCancel">{{ cancelLabel }}</AdminButton>
      <AdminButton :variant="destructive ? 'destructive' : 'primary'" @click="onConfirm">
        {{ confirmLabel }}
      </AdminButton>
    </template>
  </AdminDialog>
</template>

<style scoped>
.confirm-dialog__msg {
  margin: 0;
  font-size: 13px;
  color: var(--ink);
  line-height: 1.5;
}
</style>
