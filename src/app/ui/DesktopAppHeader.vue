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
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
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
const isLoggingOut = ref(false);
const settingsRef = ref<HTMLElement | null>(null);

const userLabel = computed(() => authStore.user?.userName ?? "");

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value;
}

function closeMenu() {
  isMenuOpen.value = false;
}

async function handleLogout() {
  if (isLoggingOut.value) return;
  isLoggingOut.value = true;
  try {
    await authStore.logout();
    closeMenu();
    await router.push("/login");
  } finally {
    isLoggingOut.value = false;
  }
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!isMenuOpen.value) return;
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (settingsRef.value?.contains(target)) return;
  closeMenu();
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") closeMenu();
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
  {
    id: "ai-agent",
    label: "AI에이전트",
    to: "/ai-agent",
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

  if (section === "ai-agent") {
    return currentPath.startsWith("/ai-agent");
  }

  return currentPath.startsWith("/documents") || currentPath.startsWith("/preview");
}

const logoSrc = new URL("../../../conelp_logo.png", import.meta.url).href;
</script>

<style scoped src="./styles/DesktopAppHeader.css"></style>
