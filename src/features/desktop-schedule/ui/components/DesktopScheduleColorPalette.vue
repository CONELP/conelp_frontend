<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="paletteRef"
      class="schedule-color-palette"
      :style="{ left: `${position.left}px`, top: `${position.top}px` }"
    >
      <button
        type="button"
        class="schedule-color-palette__clear"
        :class="{ 'schedule-color-palette__clear--selected': selectedColor === null }"
        @click="emit('select', null)"
      >
        색상 없음
      </button>

      <div class="schedule-color-palette__grid" aria-label="색상 팔레트">
        <button
          v-for="color in paletteColors"
          :key="color.value"
          type="button"
          class="schedule-color-palette__swatch"
          :class="{ 'schedule-color-palette__swatch--selected': color.value === selectedColor }"
          :style="{
            '--swatch-color': color.value,
            '--swatch-soft-color': toAlphaColor(color.value, 0.18),
          }"
          :aria-label="color.label"
          :title="color.label"
          @click="emit('select', color.value)"
        />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";

import "@/features/desktop-schedule/ui/components/styles/DesktopScheduleColorPalette.css";

const VIEWPORT_MARGIN = 12;

const paletteColors = [
  { label: "Slate", value: "#64748b" },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Yellow", value: "#eab308" },
  { label: "Lime", value: "#84cc16" },
  { label: "Green", value: "#22c55e" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Pink", value: "#ec4899" },
  { label: "Rose", value: "#f43f5e" },
] as const;

const props = defineProps<{
  open: boolean;
  x: number;
  y: number;
  selectedColor: string | null;
}>();

const emit = defineEmits<{
  close: [];
  select: [colorHex: string | null];
}>();

const paletteRef = ref<HTMLElement | null>(null);
const position = ref({ left: 0, top: 0 });

function normalizeHexColor(colorHex: string) {
  const sanitized = colorHex.trim().replace("#", "");

  if (/^[0-9a-fA-F]{3}$/.test(sanitized)) {
    return sanitized
      .split("")
      .map((character) => `${character}${character}`)
      .join("");
  }

  return /^[0-9a-fA-F]{6}$/.test(sanitized) ? sanitized : null;
}

function toAlphaColor(colorHex: string, alpha: number) {
  const normalizedHex = normalizeHexColor(colorHex);

  if (!normalizedHex) {
    return colorHex;
  }

  const red = Number.parseInt(normalizedHex.slice(0, 2), 16);
  const green = Number.parseInt(normalizedHex.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedHex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

async function syncPosition() {
  if (!props.open) {
    return;
  }

  await nextTick();
  const element = paletteRef.value;

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
  if (target && paletteRef.value?.contains(target)) {
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
  () => [props.open, props.x, props.y] as const,
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
