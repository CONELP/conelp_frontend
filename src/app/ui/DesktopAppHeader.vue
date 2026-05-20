<template>
  <header
    ref="headerRef"
    class="desktop-app-header"
    :class="{
      'desktop-app-header--mobile-menu-open': isMobileMenuOpen,
    }"
    v-bind="attrs"
  >
    <div class="desktop-app-header__shell">
      <div class="desktop-app-header__top">
        <RouterLink
          class="desktop-app-header__brand"
          to="/schedule"
          aria-label="공정표로 이동"
          @click="closeMobileMenu"
        >
          <img class="desktop-app-header__logo" :src="logoSrc" alt="CONELP" />
        </RouterLink>

        <button
          class="desktop-app-header__mobile-toggle"
          type="button"
          :aria-expanded="isMobileMenuOpen"
          :aria-label="isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'"
          @click="toggleMobileMenu"
        >
          <img
            class="desktop-app-header__mobile-toggle-icon"
            :src="mobileMenuIcon"
            alt=""
            aria-hidden="true"
          />
        </button>

        <div class="desktop-app-header__controls">
          <ProjectPicker class="desktop-app-header__project-picker" />

          <div ref="settingsRef" class="desktop-app-header__settings-wrap">
            <button
              class="desktop-app-header__settings"
              type="button"
              aria-label="설정"
              aria-haspopup="menu"
              :aria-expanded="isMenuOpen"
              @click="toggleMenu"
            >
              <img
                class="desktop-app-header__settings-icon"
                :src="settingsIcon"
                alt=""
              />
            </button>

            <Transition name="desktop-app-header__menu-transition">
              <div
                v-if="isMenuOpen"
                class="desktop-app-header__menu"
                role="menu"
                aria-label="설정 메뉴"
              >
                <div v-if="userLabel" class="desktop-app-header__menu-user">
                  {{ userLabel }}
                </div>
                <div
                  v-if="userLabel"
                  class="desktop-app-header__menu-divider"
                  aria-hidden="true"
                />
                <button
                  class="desktop-app-header__menu-item"
                  type="button"
                  role="menuitem"
                  :disabled="isLoggingOut"
                  @click="handleLogout"
                >
                  {{ isLoggingOut ? "로그아웃 중…" : "로그아웃" }}
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <nav class="desktop-app-header__nav" aria-label="주요 메뉴">
        <RouterLink
          v-for="item in navItems"
          :key="item.id"
          class="desktop-app-header__nav-link"
          :class="{ 'desktop-app-header__nav-link--active': isActive(item.id) }"
          :to="item.to"
          @click="closeMobileMenu"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import dismissIcon from "@fluentui/svg-icons/icons/dismiss_20_regular.svg";
import navigationIcon from "@fluentui/svg-icons/icons/navigation_20_regular.svg";
import settingsIcon from "@fluentui/svg-icons/icons/settings_20_regular.svg";
import { computed, onMounted, onUnmounted, ref, useAttrs } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import { useAuthStore } from "@/features/auth/state/useAuthStore";
import ProjectPicker from "@/shared/ui/ProjectPicker.vue";

type DesktopHeaderSection = "dashboard" | "schedule" | "documents" | "ai-agent";

const route = useRoute();
const router = useRouter();
const attrs = useAttrs();
const authStore = useAuthStore();

const isMenuOpen = ref(false);
const isMobileMenuOpen = ref(false);
const isLoggingOut = ref(false);
const headerRef = ref<HTMLElement | null>(null);
const settingsRef = ref<HTMLElement | null>(null);

const userLabel = computed(() => authStore.user?.userName ?? "");
const mobileMenuIcon = computed(() =>
  isMobileMenuOpen.value ? dismissIcon : navigationIcon,
);

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value;
}

function closeMenu() {
  isMenuOpen.value = false;
}

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
  closeMenu();
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false;
  closeMenu();
}

async function handleLogout() {
  if (isLoggingOut.value) return;
  isLoggingOut.value = true;
  try {
    await authStore.logout();
    closeMobileMenu();
    await router.push("/login");
  } finally {
    isLoggingOut.value = false;
  }
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!isMenuOpen.value && !isMobileMenuOpen.value) return;
  const target = event.target;
  if (!(target instanceof Node)) return;

  if (headerRef.value?.contains(target)) {
    if (!settingsRef.value?.contains(target)) {
      closeMenu();
    }
    return;
  }

  closeMobileMenu();
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    closeMobileMenu();
  }
}

onMounted(() => {
  if (typeof window === "undefined") return;
  document.addEventListener("pointerdown", handleDocumentPointerDown);
  document.addEventListener("keydown", handleDocumentKeydown);
});

onUnmounted(() => {
  if (typeof window === "undefined") return;
  document.removeEventListener("pointerdown", handleDocumentPointerDown);
  document.removeEventListener("keydown", handleDocumentKeydown);
});

const navItems: Array<{ id: DesktopHeaderSection; label: string; to: string }> = [
  /*
   * Temporarily hidden from the top tab UI.
   * Restore guide: docs/temporary-disabled-features/dashboard-and-schedule-import.md
  {
    id: "dashboard",
    label: "대시보드",
    to: "/dashboard",
  },
   */
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
  {
    id: "ai-agent",
    label: "AI에이전트",
    to: "/ai-agent",
  },
];

function isActive(section: DesktopHeaderSection) {
  const currentPath = route.path;

  if (section === "dashboard") {
    return currentPath.startsWith("/dashboard");
  }

  if (section === "schedule") {
    return currentPath === "/" || currentPath.startsWith("/schedule");
  }

  if (section === "ai-agent") {
    return currentPath.startsWith("/ai-agent");
  }

  return currentPath.startsWith("/documents") || currentPath.startsWith("/preview");
}

const logoSrc = new URL("../../../conelp_logo.png", import.meta.url).href;
</script>

<style scoped src="./styles/DesktopAppHeader.css"></style>
