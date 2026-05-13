<template>
  <header class="desktop-app-header" v-bind="attrs">
    <div class="desktop-app-header__shell">
      <div class="desktop-app-header__top">
        <RouterLink
          class="desktop-app-header__brand"
          to="/dashboard"
          aria-label="대시보드로 이동"
        >
          <img class="desktop-app-header__logo" :src="logoSrc" alt="CONELP" />
        </RouterLink>

        <div class="desktop-app-header__controls">
          <div ref="projectMenuRef" class="desktop-app-header__project">
            <button
              class="desktop-app-header__project-button"
              type="button"
              :aria-expanded="isProjectMenuOpen"
              :aria-haspopup="hasProjectOptions ? 'listbox' : undefined"
              :aria-busy="isLoadingProjects || isProjectSwitching"
              :disabled="isProjectButtonDisabled"
              @click="toggleProjectMenu"
            >
              <img
                class="desktop-app-header__project-icon"
                :src="buildingIcon"
                alt=""
                aria-hidden="true"
              />
              <span>{{ currentProjectLabel }}</span>
              <img
                class="desktop-app-header__project-caret"
                :class="{ 'desktop-app-header__project-caret--open': isProjectMenuOpen }"
                :src="chevronDownIcon"
                alt=""
                aria-hidden="true"
              />
            </button>

            <Transition name="desktop-app-header__project-menu-transition">
              <div
                v-if="isProjectMenuOpen && hasProjectOptions"
                class="desktop-app-header__project-menu"
                role="listbox"
                aria-label="프로젝트 선택"
              >
                <button
                  v-for="project in projects"
                  :key="project.id"
                  type="button"
                  role="option"
                  class="desktop-app-header__project-option"
                  :class="{
                    'desktop-app-header__project-option--active':
                      project.id === currentProjectId,
                  }"
                  :aria-selected="project.id === currentProjectId"
                  @click="selectProject(project.id)"
                >
                  <span>{{ project.projectName }}</span>
                </button>
              </div>
            </Transition>
          </div>

          <button
            class="desktop-app-header__settings"
            type="button"
            aria-label="설정"
          >
            <img class="desktop-app-header__settings-icon" :src="settingsIcon" alt="" />
          </button>
        </div>
      </div>

      <nav class="desktop-app-header__nav" aria-label="주요 메뉴">
        <RouterLink
          v-for="item in navItems"
          :key="item.id"
          class="desktop-app-header__nav-link"
          :class="{ 'desktop-app-header__nav-link--active': isActive(item.id) }"
          :to="item.to"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </div>
  </header>

  <Transition name="desktop-app-header__project-loading-transition">
    <div
      v-if="isProjectSwitching"
      class="desktop-app-header__project-loading-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="desktop-app-header__project-loading-card">
        <span class="desktop-app-header__project-loading-indicator" aria-hidden="true" />
        <span>프로젝트 정보를 불러오고 있어요.</span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import buildingIcon from "@fluentui/svg-icons/icons/building_20_regular.svg";
import chevronDownIcon from "@fluentui/svg-icons/icons/chevron_down_20_regular.svg";
import settingsIcon from "@fluentui/svg-icons/icons/settings_20_regular.svg";
import { computed, onMounted, onUnmounted, ref, useAttrs } from "vue";
import { RouterLink, useRoute } from "vue-router";

import { useDocumentConversionDemoStore } from "@/features/document-conversion-demo/state/useDocumentConversionDemoStore";
import {
  clearSelectedDesktopScheduleVersionId,
  desktopScheduleApi,
  getSelectedDesktopScheduleProjectId,
  setSelectedDesktopScheduleProjectId,
} from "@/features/desktop-schedule/api/desktop-schedule.api";
import type { DesktopScheduleProjectResponse } from "@/features/desktop-schedule/api/desktop-schedule-api.types";

type DesktopHeaderSection = "dashboard" | "schedule" | "documents";

const route = useRoute();
const attrs = useAttrs();
const documentConversionStore = useDocumentConversionDemoStore();

const navItems: Array<{ id: DesktopHeaderSection; label: string; to: string }> = [
  {
    id: "dashboard",
    label: "대시보드",
    to: "/dashboard",
  },
  {
    id: "schedule",
    label: "공정표",
    to: "/schedule",
  },
  {
    id: "documents",
    label: "문서생성",
    to: "/documents",
  },
];

function isActive(section: DesktopHeaderSection) {
  const currentPath = route.path;

  if (section === "dashboard") {
    return currentPath === "/" || currentPath.startsWith("/dashboard");
  }

  if (section === "schedule") {
    return currentPath.startsWith("/schedule");
  }

  return currentPath.startsWith("/documents") || currentPath.startsWith("/preview");
}

const logoSrc = new URL("../../../conelp_logo.png", import.meta.url).href;

const projects = ref<DesktopScheduleProjectResponse[]>([]);
const currentProjectId = ref<string | null>(getSelectedDesktopScheduleProjectId());
const isProjectMenuOpen = ref(false);
const isLoadingProjects = ref(false);
const isProjectSwitching = ref(false);
const projectMenuRef = ref<HTMLElement | null>(null);
let projectSwitchReloadTimer: ReturnType<typeof setTimeout> | null = null;

const hasProjectOptions = computed(() => projects.value.length > 0);
const isProjectButtonDisabled = computed(
  () =>
    isProjectSwitching.value ||
    (isLoadingProjects.value && !hasProjectOptions.value),
);

const currentProjectLabel = computed(() => {
  if (isLoadingProjects.value && projects.value.length === 0) {
    return "불러오는 중";
  }
  if (!isLoadingProjects.value && projects.value.length === 0) {
    return "프로젝트 없음";
  }
  const match = projects.value.find((project) => project.id === currentProjectId.value);
  return match?.projectName ?? "프로젝트 선택";
});

async function loadProjects() {
  isLoadingProjects.value = true;
  try {
    const fetched = await desktopScheduleApi.getProjectList();
    projects.value = fetched;
    const stored = getSelectedDesktopScheduleProjectId();
    if (stored && fetched.some((project) => project.id === stored)) {
      currentProjectId.value = stored;
    } else if (fetched[0]) {
      currentProjectId.value = fetched[0].id;
      setSelectedDesktopScheduleProjectId(fetched[0].id);
    }
  } catch (error) {
    console.error("getProjectList failed", error);
  } finally {
    isLoadingProjects.value = false;
  }
}

function toggleProjectMenu() {
  if (isProjectButtonDisabled.value || !hasProjectOptions.value) return;
  isProjectMenuOpen.value = !isProjectMenuOpen.value;
}

function closeProjectMenu() {
  isProjectMenuOpen.value = false;
}

function selectProject(projectId: string) {
  isProjectMenuOpen.value = false;
  if (projectId === currentProjectId.value) return;

  setSelectedDesktopScheduleProjectId(projectId);
  clearSelectedDesktopScheduleVersionId();
  documentConversionStore.clearSelectedDocument();
  currentProjectId.value = projectId;

  if (typeof window !== "undefined") {
    isProjectSwitching.value = true;
    projectSwitchReloadTimer = setTimeout(() => {
      window.location.reload();
    }, 700);
  }
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!isProjectMenuOpen.value) return;
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (projectMenuRef.value?.contains(target)) return;
  closeProjectMenu();
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    closeProjectMenu();
  }
}

onMounted(() => {
  void loadProjects();
  if (typeof window !== "undefined") {
    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeydown);
  }
});

onUnmounted(() => {
  if (projectSwitchReloadTimer) {
    clearTimeout(projectSwitchReloadTimer);
  }

  if (typeof window !== "undefined") {
    document.removeEventListener("pointerdown", handleDocumentPointerDown);
    document.removeEventListener("keydown", handleDocumentKeydown);
  }
});
</script>

<style scoped src="./styles/DesktopAppHeader.css"></style>
