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
          <ProjectPicker />

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
import { useAttrs } from "vue";
import { RouterLink, useRoute } from "vue-router";

import ProjectPicker from "@/shared/ui/ProjectPicker.vue";

type DesktopHeaderSection = "dashboard" | "schedule" | "documents";

const route = useRoute();
const attrs = useAttrs();

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
</script>

<style scoped src="./styles/DesktopAppHeader.css"></style>
