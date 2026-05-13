<template>
  <header class="desktop-app-header">
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
              :aria-haspopup="projects.length > 0 ? 'listbox' : undefined"
              :disabled="isLoadingProjects && projects.length === 0"
              @click="toggleProjectMenu"
            >
              <span>{{ currentProjectLabel }}</span>
              <span class="desktop-app-header__project-caret" aria-hidden="true">▾</span>
            </button>

            <div
              v-if="isProjectMenuOpen && projects.length > 0"
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
                {{ project.projectName }}
              </button>
            </div>
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
</template>

<script setup lang="ts">
import settingsIcon from "@fluentui/svg-icons/icons/settings_20_regular.svg";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";

import {
  clearSelectedDesktopScheduleVersionId,
  desktopScheduleApi,
  getSelectedDesktopScheduleProjectId,
  setSelectedDesktopScheduleProjectId,
} from "@/features/desktop-schedule/api/desktop-schedule.api";
import type { DesktopScheduleProjectResponse } from "@/features/desktop-schedule/api/desktop-schedule-api.types";

type DesktopHeaderSection = "dashboard" | "schedule" | "documents";

const route = useRoute();

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
const projectMenuRef = ref<HTMLElement | null>(null);

const currentProjectLabel = computed(() => {
  if (isLoadingProjects.value && projects.value.length === 0) {
    return "불러오는 중";
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
  if (isLoadingProjects.value && projects.value.length === 0) return;
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
  currentProjectId.value = projectId;

  if (typeof window !== "undefined") {
    window.location.reload();
  }
}

function handleDocumentClick(event: MouseEvent) {
  if (!isProjectMenuOpen.value) return;
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (projectMenuRef.value?.contains(target)) return;
  closeProjectMenu();
}

onMounted(() => {
  void loadProjects();
  if (typeof window !== "undefined") {
    window.addEventListener("click", handleDocumentClick);
  }
});

onUnmounted(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("click", handleDocumentClick);
  }
});
</script>

<style scoped src="./styles/DesktopAppHeader.css"></style>
