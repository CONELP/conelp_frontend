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
          :class="{
            'desktop-app-header__mobile-toggle--job-active': activeJobCount > 0,
            'desktop-app-header__mobile-toggle--job-failed': unreadFailedCount > 0,
            'desktop-app-header__mobile-toggle--pulse': isMobileJobPulsing,
          }"
          type="button"
          :aria-expanded="isMobileMenuOpen"
          :aria-label="isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'"
          @click="toggleMobileMenu"
        >
          <span
            v-if="isMobileJobPulsing"
            :key="mobileJobRippleRunId"
            class="desktop-app-header__mobile-toggle-ripples"
            aria-hidden="true"
          >
            <span class="desktop-app-header__mobile-toggle-ripple" />
            <span
              class="desktop-app-header__mobile-toggle-ripple desktop-app-header__mobile-toggle-ripple--two"
            />
            <span
              class="desktop-app-header__mobile-toggle-ripple desktop-app-header__mobile-toggle-ripple--three"
              @animationend="handleMobileJobRippleAnimationEnd"
            />
          </span>
          <img
            class="desktop-app-header__mobile-toggle-icon"
            :src="mobileMenuIcon"
            alt=""
            aria-hidden="true"
          />
          <span
            v-if="activeJobCount > 0"
            class="desktop-app-header__mobile-toggle-count"
            aria-label="진행 중인 문서 작업 수"
          >
            {{ activeJobCount }}
          </span>
          <span
            v-else-if="unreadFailedCount > 0"
            class="desktop-app-header__mobile-toggle-dot desktop-app-header__mobile-toggle-dot--error"
            aria-hidden="true"
          />
          <span
            v-else-if="unreadCompletedCount > 0"
            class="desktop-app-header__mobile-toggle-dot desktop-app-header__mobile-toggle-dot--success"
            aria-hidden="true"
          />
        </button>
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

      <div class="desktop-app-header__mobile-divider" aria-hidden="true" />

      <div class="desktop-app-header__controls">
        <ProjectPicker class="desktop-app-header__project-picker" />

        <div class="desktop-app-header__actions">
          <BackgroundDocumentJobCenter />

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
                  v-if="isSuper"
                  class="desktop-app-header__menu-item"
                  type="button"
                  role="menuitem"
                  @click="handleGoToSystemAdmin"
                >
                  시스템 관리자
                </button>
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
    </div>
  </header>
  <div
    class="desktop-app-header__spacer"
    :style="headerSpacerStyle"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import dismissIcon from "@fluentui/svg-icons/icons/dismiss_20_regular.svg";
import navigationIcon from "@fluentui/svg-icons/icons/navigation_20_regular.svg";
import settingsIcon from "@fluentui/svg-icons/icons/settings_20_regular.svg";
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  useAttrs,
  watch,
} from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import { useAuthStore } from "@/features/auth/state/useAuthStore";
import BackgroundDocumentJobCenter from "@/features/document-conversion/ui/components/BackgroundDocumentJobCenter.vue";
import { useBackgroundDocumentJobsStore } from "@/features/document-conversion/state/useBackgroundDocumentJobsStore";
import ProjectPicker from "@/shared/ui/ProjectPicker.vue";

defineOptions({
  inheritAttrs: false,
});

type DesktopHeaderSection = "dashboard" | "schedule" | "documents" | "ai-agent";

const route = useRoute();
const router = useRouter();
const attrs = useAttrs();
const authStore = useAuthStore();
const backgroundJobsStore = useBackgroundDocumentJobsStore();

const isMenuOpen = ref(false);
const isMobileMenuOpen = ref(false);
const isLoggingOut = ref(false);
const isMobileJobPulsing = ref(false);
const mobileJobRippleRunId = ref(0);
const headerHeight = ref(0);
const headerRef = ref<HTMLElement | null>(null);
const settingsRef = ref<HTMLElement | null>(null);
let headerResizeObserver: ResizeObserver | null = null;
let isHeaderUnmounted = false;

const userLabel = computed(() => authStore.user?.userName ?? "");
const isSuper = computed(() => authStore.user?.systemRole === "SUPER");
const mobileMenuIcon = computed(() =>
  isMobileMenuOpen.value ? dismissIcon : navigationIcon,
);
const activeJobCount = computed(() => backgroundJobsStore.activeJobs.length);
const unreadCompletedCount = computed(() => backgroundJobsStore.unreadCompletedCount);
const unreadFailedCount = computed(() => backgroundJobsStore.unreadFailedCount);
const headerSpacerStyle = computed<Record<string, string>>(() => ({
  "--desktop-app-header-spacer-height": `${headerHeight.value}px`,
}));

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

async function handleGoToSystemAdmin() {
  closeMobileMenu();
  await router.push("/system-admin");
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

function updateHeaderHeight() {
  if (!headerRef.value) return;
  headerHeight.value = Math.ceil(headerRef.value.getBoundingClientRect().height);
}

async function startMobileJobRippleSequence() {
  isMobileJobPulsing.value = false;
  await nextTick();

  if (isHeaderUnmounted) return;

  mobileJobRippleRunId.value += 1;
  isMobileJobPulsing.value = true;
}

function handleMobileJobRippleAnimationEnd() {
  isMobileJobPulsing.value = false;
}

watch(
  activeJobCount,
  (count, previousCount) => {
    const previous = previousCount ?? 0;

    if (count > previous) {
      void startMobileJobRippleSequence();
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (typeof window === "undefined") return;
  document.addEventListener("pointerdown", handleDocumentPointerDown);
  document.addEventListener("keydown", handleDocumentKeydown);
  window.addEventListener("resize", updateHeaderHeight);

  updateHeaderHeight();
  if (typeof ResizeObserver !== "undefined" && headerRef.value) {
    headerResizeObserver = new ResizeObserver(updateHeaderHeight);
    headerResizeObserver.observe(headerRef.value);
  }
});

onUnmounted(() => {
  isHeaderUnmounted = true;

  if (typeof window === "undefined") return;
  document.removeEventListener("pointerdown", handleDocumentPointerDown);
  document.removeEventListener("keydown", handleDocumentKeydown);
  window.removeEventListener("resize", updateHeaderHeight);
  headerResizeObserver?.disconnect();
  headerResizeObserver = null;
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

const logoSrc = "/conelp_logo.png";
</script>

<style scoped src="./styles/DesktopAppHeader.css"></style>
