<template>
  <div ref="containerRef" class="project-picker">
    <button
      class="project-picker__button"
      type="button"
      :aria-label="projectPickerLabel"
      :aria-expanded="isMenuOpen"
      :aria-haspopup="hasOptions ? 'listbox' : undefined"
      :aria-busy="isLoading || isSwitching"
      :disabled="isButtonDisabled"
      @click="toggleMenu"
    >
      <img
        class="project-picker__icon"
        :src="buildingIcon"
        alt=""
        aria-hidden="true"
      />
      <span>{{ currentLabel }}</span>
      <img
        class="project-picker__caret"
        :class="{ 'project-picker__caret--open': isMenuOpen }"
        :src="chevronDownIcon"
        alt=""
        aria-hidden="true"
      />
    </button>

    <Transition name="project-picker__menu-transition">
      <div
        v-if="isMenuOpen && hasOptions"
        class="project-picker__menu"
        :style="menuStyle"
        role="listbox"
        aria-label="프로젝트 선택"
      >
        <button
          v-for="project in projects"
          :key="project.id"
          type="button"
          role="option"
          class="project-picker__option"
          :class="{
            'project-picker__option--active': project.id === currentProjectId,
          }"
          :aria-selected="project.id === currentProjectId"
          @click="selectProject(project.id)"
        >
          <span>{{ project.projectName }}</span>
        </button>
      </div>
    </Transition>
  </div>

  <Teleport to="body">
    <Transition name="project-picker__loading-transition">
      <div
        v-if="isSwitching"
        class="project-picker__loading-overlay"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div class="project-picker__loading-card">
          <span class="project-picker__loading-indicator" aria-hidden="true" />
          <span>프로젝트 정보를 불러오고 있어요.</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import buildingIcon from "@fluentui/svg-icons/icons/building_20_regular.svg";
import chevronDownIcon from "@fluentui/svg-icons/icons/chevron_down_20_regular.svg";
import { storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted, ref } from "vue";

import { useDocumentConversionDemoStore } from "@/features/document-conversion/state/useDocumentConversionDemoStore";
import { clearSelectedDesktopScheduleVersionId } from "@/features/desktop-schedule/api/desktop-schedule.api";
import { analyticsClient } from "@/shared/analytics/analytics-stub";
import { useProjectPickerStore } from "@/shared/state/useProjectPickerStore";

const documentConversionStore = useDocumentConversionDemoStore();
const projectPickerStore = useProjectPickerStore();
const { projects, currentProjectId, isLoading, hasOptions } = storeToRefs(projectPickerStore);

const isMenuOpen = ref(false);
const isSwitching = ref(false);
const menuStyle = ref<Record<string, string>>({});
const containerRef = ref<HTMLElement | null>(null);
let switchReloadTimer: ReturnType<typeof setTimeout> | null = null;

const MOBILE_MENU_QUERY = "(max-width: 1023px)";
const MOBILE_MENU_MARGIN = 12;

const isButtonDisabled = computed(
  () => isSwitching.value || (isLoading.value && !hasOptions.value),
);

const currentLabel = computed(() => {
  if (isLoading.value && projects.value.length === 0) {
    return "불러오는 중";
  }
  if (!isLoading.value && projects.value.length === 0) {
    return "프로젝트 없음";
  }
  const match = projects.value.find((project) => project.id === currentProjectId.value);
  return match?.projectName ?? "프로젝트 선택";
});
const projectPickerLabel = computed(() => `현장 선택: ${currentLabel.value}`);

function toggleMenu() {
  if (isButtonDisabled.value || !hasOptions.value) return;

  if (!isMenuOpen.value) {
    updateMenuPosition();
  }

  isMenuOpen.value = !isMenuOpen.value;
}

function closeMenu() {
  isMenuOpen.value = false;
  menuStyle.value = {};
}

function selectProject(projectId: string) {
  isMenuOpen.value = false;
  if (projectId === currentProjectId.value) return;

  analyticsClient.trackAction("project", "select_project", "success", {
    has_previous_project: Boolean(currentProjectId.value),
  });
  projectPickerStore.setCurrentProjectId(projectId);
  clearSelectedDesktopScheduleVersionId();
  documentConversionStore.clearSelectedDocument();

  if (typeof window !== "undefined") {
    isSwitching.value = true;
    switchReloadTimer = setTimeout(() => {
      window.location.reload();
    }, 700);
  }
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!isMenuOpen.value) return;
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (containerRef.value?.contains(target)) return;
  closeMenu();
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    closeMenu();
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function updateMenuPosition() {
  if (typeof window === "undefined" || !containerRef.value) {
    menuStyle.value = {};
    return;
  }

  if (!window.matchMedia(MOBILE_MENU_QUERY).matches) {
    menuStyle.value = {};
    return;
  }

  const rect = containerRef.value.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const maxWidth = Math.max(0, viewportWidth - MOBILE_MENU_MARGIN * 2);
  const width = Math.min(rect.width, maxWidth);
  const left = clamp(
    rect.left,
    MOBILE_MENU_MARGIN,
    viewportWidth - MOBILE_MENU_MARGIN - width,
  );
  const top = rect.bottom + 6;
  const maxHeight = Math.max(160, viewportHeight - top - MOBILE_MENU_MARGIN);

  menuStyle.value = {
    "--project-picker-menu-left": `${left}px`,
    "--project-picker-menu-top": `${top}px`,
    "--project-picker-menu-width": `${width}px`,
    "--project-picker-menu-max-height": `${maxHeight}px`,
  };
}

function handleViewportChange() {
  if (!isMenuOpen.value) return;
  updateMenuPosition();
}

onMounted(() => {
  void projectPickerStore.loadProjects();
  if (typeof window !== "undefined") {
    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeydown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    window.visualViewport?.addEventListener("resize", handleViewportChange);
  }
});

onUnmounted(() => {
  if (switchReloadTimer) {
    clearTimeout(switchReloadTimer);
  }

  if (typeof window !== "undefined") {
    document.removeEventListener("pointerdown", handleDocumentPointerDown);
    document.removeEventListener("keydown", handleDocumentKeydown);
    window.removeEventListener("resize", handleViewportChange);
    window.removeEventListener("scroll", handleViewportChange, true);
    window.visualViewport?.removeEventListener("resize", handleViewportChange);
  }
});
</script>

<style scoped>
.project-picker {
  position: relative;
}

.project-picker__button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.2rem;
  padding: 0.48rem 0.78rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 999px;
  background: #fff;
  color: var(--ink-muted);
  font-size: 0.88rem;
  font-weight: 400;
  line-height: 1;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}

.project-picker__button:hover:not(:disabled),
.project-picker__button[aria-expanded="true"] {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.16);
}

.project-picker__button:disabled {
  cursor: default;
  opacity: 0.6;
}

.project-picker__icon {
  width: 1rem;
  height: 1rem;
  opacity: 0.72;
}

.project-picker__caret {
  width: 0.95rem;
  height: 0.95rem;
  opacity: 0.7;
  transition: transform 160ms ease;
}

.project-picker__caret--open {
  transform: rotate(180deg);
}

.project-picker__menu {
  position: absolute;
  top: calc(100% + 0.4rem);
  right: 0;
  z-index: 50;
  width: min(15rem, calc(100vw - 1.4rem));
  max-height: 16rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 0.3rem;
  border: 1px solid var(--outline-soft);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.14);
}

.project-picker__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  width: 100%;
  min-height: 2.5rem;
  padding: 0.58rem 0.68rem;
  border: 2px solid transparent;
  border-radius: 8px;
  background: #fff;
  color: var(--ink, #1a1a1a);
  font-size: 0.88rem;
  line-height: 1.25;
  text-align: left;
  cursor: pointer;
}

.project-picker__option:hover,
.project-picker__option:focus-visible {
  background: #f3f4f6;
}

.project-picker__option--active {
  border-color: var(--primary, #1e1888);
  color: var(--primary, #1e1888);
  font-weight: 600;
}

.project-picker__menu-transition-enter-active,
.project-picker__menu-transition-leave-active {
  transition:
    opacity 140ms ease,
    transform 140ms ease;
}

.project-picker__menu-transition-enter-from,
.project-picker__menu-transition-leave-to {
  opacity: 0;
  transform: translateY(-0.2rem);
}

.project-picker__loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(248, 250, 252, 0.62);
  backdrop-filter: blur(3px);
}

.project-picker__loading-overlay::before {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.34) 42%,
    rgba(255, 255, 255, 0) 78%
  );
  content: "";
  pointer-events: none;
  transform: translateX(-100%);
  animation: project-picker-loading-sweep 950ms ease-in-out infinite;
}

.project-picker__loading-card {
  position: relative;
  z-index: 1;
  display: grid;
  min-width: 16rem;
  justify-items: center;
  gap: 0.85rem;
  padding: 1.35rem 1.55rem;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 0.85rem;
  background: #fff;
  box-shadow: 0 22px 48px rgba(15, 23, 42, 0.16);
  color: #334155;
  text-align: center;
}

.project-picker__loading-card span:last-child {
  color: #334155;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.35;
}

.project-picker__loading-indicator {
  width: 2.8rem;
  height: 2.8rem;
  border: 4px solid rgba(30, 24, 136, 0.16);
  border-top-color: var(--primary, #1e1888);
  border-radius: 999px;
  animation: project-picker-loading-spin 720ms linear infinite;
}

.project-picker__loading-transition-enter-active,
.project-picker__loading-transition-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.project-picker__loading-transition-enter-from,
.project-picker__loading-transition-leave-to {
  opacity: 0;
  transform: translateY(-0.35rem);
}

@media (max-width: 1023px) {
  .project-picker__menu {
    position: fixed;
    top: var(--project-picker-menu-top, 0.75rem);
    left: var(--project-picker-menu-left, 0.75rem);
    right: auto;
    width: var(--project-picker-menu-width, calc(100vw - 1.5rem));
    max-width: calc(100vw - 1.5rem);
    max-height: min(16rem, var(--project-picker-menu-max-height, 16rem));
    box-sizing: border-box;
  }
}

@keyframes project-picker-loading-sweep {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(100%);
  }
}

@keyframes project-picker-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
