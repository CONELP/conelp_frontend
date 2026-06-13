<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { useProxyImage } from "@/features/system-admin/state/useProxyImage";

const props = defineProps<{
  gsUrl: string;
  projectId?: string;
  alt?: string;
}>();

const { objectUrl, isLoading, hasError } = useProxyImage(
  () => props.gsUrl,
  () => props.projectId,
);

const MIN_SCALE = 1;
const MAX_SCALE = 8;

const stageRef = ref<HTMLDivElement | null>(null);
const scale = ref(1);
const tx = ref(0);
const ty = ref(0);

const isPanning = ref(false);
let lastX = 0;
let lastY = 0;

const contentStyle = computed(() => ({
  transform: `translate(${tx.value}px, ${ty.value}px) scale(${scale.value})`,
}));

function clamp(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

function reset() {
  scale.value = 1;
  tx.value = 0;
  ty.value = 0;
}

// 커서 아래 지점이 고정되도록 scale 변경 시 translate 보정 (transform-origin 0 0 기준).
function zoomTo(nextScaleRaw: number, px: number, py: number) {
  const next = clamp(nextScaleRaw);
  if (next === scale.value) return;
  const contentX = (px - tx.value) / scale.value;
  const contentY = (py - ty.value) / scale.value;
  tx.value = px - next * contentX;
  ty.value = py - next * contentY;
  scale.value = next;
  if (next === 1) {
    tx.value = 0;
    ty.value = 0;
  }
}

function onWheel(event: WheelEvent) {
  const stage = stageRef.value;
  if (!stage) return;
  const rect = stage.getBoundingClientRect();
  const px = event.clientX - rect.left;
  const py = event.clientY - rect.top;
  const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;
  zoomTo(scale.value * factor, px, py);
}

function onPointerDown(event: PointerEvent) {
  if (scale.value <= 1) return;
  isPanning.value = true;
  lastX = event.clientX;
  lastY = event.clientY;
  (event.target as HTMLElement).setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent) {
  if (!isPanning.value) return;
  tx.value += event.clientX - lastX;
  ty.value += event.clientY - lastY;
  lastX = event.clientX;
  lastY = event.clientY;
}

function onPointerUp(event: PointerEvent) {
  if (!isPanning.value) return;
  isPanning.value = false;
  (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
}

function zoomInCenter() {
  const stage = stageRef.value;
  if (!stage) return;
  const rect = stage.getBoundingClientRect();
  zoomTo(scale.value * 1.3, rect.width / 2, rect.height / 2);
}

function zoomOutCenter() {
  const stage = stageRef.value;
  if (!stage) return;
  const rect = stage.getBoundingClientRect();
  zoomTo(scale.value / 1.3, rect.width / 2, rect.height / 2);
}

// 사진이 바뀌면 확대/이동 초기화.
watch(
  () => props.gsUrl,
  () => reset(),
);
</script>

<template>
  <div class="zoom">
    <div
      ref="stageRef"
      class="zoom__stage"
      :class="{ 'zoom__stage--grab': scale > 1, 'zoom__stage--grabbing': isPanning }"
      @wheel.prevent="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @dblclick="reset"
    >
      <div v-if="isLoading" class="zoom__state">불러오는 중…</div>
      <div v-else-if="hasError" class="zoom__state zoom__state--error">사진을 불러오지 못했습니다.</div>
      <div v-else-if="objectUrl" class="zoom__content" :style="contentStyle">
        <img :src="objectUrl" :alt="alt ?? '원본 사진'" class="zoom__img" draggable="false" />
      </div>
    </div>

    <div class="zoom__controls" role="group" aria-label="사진 확대">
      <button type="button" class="zoom__btn" aria-label="확대" @click="zoomInCenter">＋</button>
      <span class="zoom__level">{{ Math.round(scale * 100) }}%</span>
      <button type="button" class="zoom__btn" aria-label="축소" @click="zoomOutCenter">－</button>
      <button type="button" class="zoom__btn" aria-label="원위치" @click="reset">⟳</button>
    </div>
  </div>
</template>

<style scoped>
.zoom {
  position: relative;
  width: 100%;
  height: 100%;
}
.zoom__stage {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #1f1f1f;
  touch-action: none;
}
.zoom__stage--grab {
  cursor: grab;
}
.zoom__stage--grabbing {
  cursor: grabbing;
}
.zoom__content {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: 0 0;
  will-change: transform;
}
.zoom__img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
}
.zoom__state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
}
.zoom__state--error {
  color: #fca5a5;
}
.zoom__controls {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 999px;
}
.zoom__btn {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  line-height: 1;
  color: #fff;
  background: transparent;
  border: none;
  border-radius: 999px;
  cursor: pointer;
}
.zoom__btn:hover {
  background: rgba(255, 255, 255, 0.18);
}
.zoom__level {
  min-width: 44px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}
</style>
