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
          <div ref="siteMenuRef" class="desktop-app-header__site-selector">
            <button
              class="desktop-app-header__chip desktop-app-header__chip--site"
              type="button"
              aria-haspopup="menu"
              :aria-expanded="isSiteMenuOpen"
              @click="toggleSiteMenu"
            >
              <img
                class="desktop-app-header__chip-icon"
                :src="buildingIcon"
                alt=""
                aria-hidden="true"
              />
              <span>{{ displaySiteLabel }}</span>
              <img
                class="desktop-app-header__chevron"
                :class="{ 'desktop-app-header__chevron--open': isSiteMenuOpen }"
                :src="chevronDownIcon"
                alt=""
                aria-hidden="true"
              />
            </button>

            <Transition name="desktop-app-header__site-menu-transition">
              <div
                v-if="isSiteMenuOpen"
                class="desktop-app-header__site-menu"
                role="menu"
                aria-label="현장 선택"
              >
                <button
                  v-for="site in siteCards"
                  :key="site.siteId"
                  class="desktop-app-header__site-menu-item"
                  :class="{ 'desktop-app-header__site-menu-item--selected': site.isSelected }"
                  type="button"
                  role="menuitemradio"
                  :aria-checked="site.isSelected"
                  @click="handleSelectSite(site.siteId)"
                >
                  <span class="desktop-app-header__site-menu-copy">
                    <strong>{{ site.siteName }}</strong>
                  </span>
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

  <Transition name="desktop-app-header__site-loading-transition">
    <div
      v-if="isSiteSwitching"
      class="desktop-app-header__site-loading-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="desktop-app-header__site-loading-card">
        <span class="desktop-app-header__site-loading-indicator" aria-hidden="true" />
        <span class="desktop-app-header__site-loading-copy">
          <span>현장 정보를 불러오고 있어요.</span>
        </span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useAttrs } from "vue";
import buildingIcon from "@fluentui/svg-icons/icons/building_20_regular.svg";
import chevronDownIcon from "@fluentui/svg-icons/icons/chevron_down_20_regular.svg";
import settingsIcon from "@fluentui/svg-icons/icons/settings_20_regular.svg";
import { RouterLink, useRoute } from "vue-router";

import { useServicePresentationDemoViewModel } from "@/features/service-presentation-demo/state/useServicePresentationDemoViewModel";
import type { ServicePresentationSiteId } from "@/features/service-presentation-demo/model/service-presentation-demo.types";

type DesktopHeaderSection = "dashboard" | "schedule" | "documents";

const props = withDefaults(
  defineProps<{
    siteLabel?: string;
  }>(),
  {
    siteLabel: undefined,
  },
);

const route = useRoute();
const attrs = useAttrs();
const siteMenuRef = ref<HTMLElement | null>(null);
const isSiteMenuOpen = ref(false);
const isSiteSwitching = ref(false);
let siteSwitchReloadTimer: ReturnType<typeof setTimeout> | null = null;
const {
  siteCards,
  selectedSite,
  selectedSiteLabel,
  selectSite,
} = useServicePresentationDemoViewModel();
const displaySiteLabel = computed(
  () => props.siteLabel ?? selectedSiteLabel.value,
);

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

function closeSiteMenu() {
  isSiteMenuOpen.value = false;
}

function toggleSiteMenu() {
  isSiteMenuOpen.value = !isSiteMenuOpen.value;
}

function handleSelectSite(siteId: ServicePresentationSiteId) {
  const previousSiteId = selectedSite.value?.siteId ?? null;
  const didSelectSite = selectSite(siteId);

  closeSiteMenu();

  if (didSelectSite && previousSiteId !== siteId) {
    isSiteSwitching.value = true;
    siteSwitchReloadTimer = setTimeout(() => {
      window.location.reload();
    }, 850);
  }
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!siteMenuRef.value || event.target === null) {
    return;
  }

  if (!siteMenuRef.value.contains(event.target as Node)) {
    closeSiteMenu();
  }
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    closeSiteMenu();
  }
}

onMounted(() => {
  document.addEventListener("pointerdown", handleDocumentPointerDown);
  document.addEventListener("keydown", handleDocumentKeydown);
});

onUnmounted(() => {
  if (siteSwitchReloadTimer) {
    clearTimeout(siteSwitchReloadTimer);
  }

  document.removeEventListener("pointerdown", handleDocumentPointerDown);
  document.removeEventListener("keydown", handleDocumentKeydown);
});

const logoSrc = new URL("../../../conelp_logo.png", import.meta.url).href;
</script>

<style scoped src="./styles/DesktopAppHeader.css"></style>
