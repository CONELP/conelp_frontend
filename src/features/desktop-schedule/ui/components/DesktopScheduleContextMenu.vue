<template>
  <Teleport to="body">
    <div
      v-if="open && items.length > 0"
      ref="menuRef"
      class="schedule-context-menu"
      :style="{ left: `${position.left}px`, top: `${position.top}px` }"
    >
      <button
        v-for="item in items"
        :key="item.id"
        class="schedule-context-menu__item"
        :class="{
          'schedule-context-menu__item--danger': item.danger,
          'schedule-context-menu__item--disabled': item.disabled,
        }"
        type="button"
        :disabled="item.disabled"
        @click="emit('select', item.command)"
      >
        <span class="schedule-context-menu__icon" aria-hidden="true">{{ getIconGlyph(item.icon) }}</span>
        {{ item.label }}
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";

import type {
  DesktopScheduleContextMenuCommand,
  DesktopScheduleContextMenuIcon,
  DesktopScheduleContextMenuItem,
} from "@/features/desktop-schedule/state/desktop-schedule-interaction-state";
import "@/features/desktop-schedule/ui/components/styles/DesktopScheduleContextMenu.css";

const VIEWPORT_MARGIN = 12;

const props = defineProps<{
  open: boolean;
  x: number;
  y: number;
  items: DesktopScheduleContextMenuItem[];
}>();

const emit = defineEmits<{
  select: [command: DesktopScheduleContextMenuCommand];
  close: [];
}>();

const menuRef = ref<HTMLElement | null>(null);
const position = ref({ left: 0, top: 0 });

function getIconGlyph(icon: DesktopScheduleContextMenuIcon) {
  switch (icon) {
    case "plus":
      return "+";
    case "trash":
      return "−";
    case "palette":
      return "◐";
    case "pencil":
      return "✎";
    case "unlink":
      return "⤫";
    case "link":
    default:
      return "↔";
  }
}

async function syncPosition() {
  if (!props.open) {
    return;
  }

  await nextTick();
  const element = menuRef.value;
  if (!element) {
    return;
  }

  const rect = element.getBoundingClientRect();
  position.value = {
    left: Math.min(props.x, window.innerWidth - rect.width - VIEWPORT_MARGIN),
    top: Math.min(props.y, window.innerHeight - rect.height - VIEWPORT_MARGIN),
  };
}

function handleWindowPointerDown(event: PointerEvent) {
  if (!props.open) {
    return;
  }

  const target = event.target as Node | null;
  if (target && menuRef.value?.contains(target)) {
    return;
  }

  emit("close");
}

function handleWindowKeyDown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    emit("close");
  }
}

function handleWindowScroll() {
  if (props.open) {
    emit("close");
  }
}

watch(
  () => [props.open, props.x, props.y, props.items.length] as const,
  () => {
    void syncPosition();
  },
);

onMounted(() => {
  window.addEventListener("pointerdown", handleWindowPointerDown);
  window.addEventListener("keydown", handleWindowKeyDown);
  window.addEventListener("scroll", handleWindowScroll, true);
  window.addEventListener("resize", handleWindowScroll);
});

onUnmounted(() => {
  window.removeEventListener("pointerdown", handleWindowPointerDown);
  window.removeEventListener("keydown", handleWindowKeyDown);
  window.removeEventListener("scroll", handleWindowScroll, true);
  window.removeEventListener("resize", handleWindowScroll);
});
</script>
