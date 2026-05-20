<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";

import { useAuthStore } from "@/features/auth/state/useAuthStore";
import ProjectPicker from "@/shared/ui/ProjectPicker.vue";

interface MenuItem {
  label: string;
  to: string;
}

interface MenuGroup {
  label: string;
  hint?: string;
  items: MenuItem[];
}

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const menuGroups: MenuGroup[] = [
  {
    label: "글로벌 설정",
    hint: "시스템 전체에 적용",
    items: [
      { label: "프로젝트 관리", to: "/system-admin/global/project" },
      { label: "사용자/회사 관리", to: "/system-admin/global/user-company" },
      { label: "역할 관리", to: "/system-admin/global/role" },
      { label: "표준 데이터", to: "/system-admin/global/standard" },
    ],
  },
  {
    label: "프로젝트 단위 설정",
    hint: "선택된 프로젝트에만 적용",
    items: [
      { label: "기준 정보", to: "/system-admin/project/master-data" },
      { label: "문서 설정", to: "/system-admin/project/document-setting" },
      { label: "휴일 관리", to: "/system-admin/project/holiday" },
      { label: "작업일보 설정", to: "/system-admin/project/daily-report" },
      { label: "일괄 배포", to: "/system-admin/project/bulk-deployment" },
      { label: "홈페이지 설정", to: "/system-admin/project/homepage-setting" },
      { label: "AI 공정표 검증", to: "/system-admin/project/schedule-validation" },
      { label: "API 키", to: "/system-admin/project/api-key" },
    ],
  },
];

function isActive(to: string) {
  return route.path === to || route.path.startsWith(`${to}/`);
}

const isProjectScopedRoute = computed(() =>
  route.path.startsWith("/system-admin/project/"),
);

const userLabel = computed(() => {
  const u = authStore.user;
  if (!u) return "";
  return `${u.userName} · ${u.systemRole}`;
});

async function handleLogout() {
  await authStore.logout();
  router.push("/login");
}
</script>

<template>
  <div class="sa-layout">
    <header class="sa-layout__topbar">
      <div class="sa-layout__brand">
        <RouterLink to="/dashboard" class="sa-layout__brand-link">CONELP</RouterLink>
        <span class="sa-layout__divider" aria-hidden="true">·</span>
        <span class="sa-layout__crumb">시스템 관리자</span>
      </div>
      <div class="sa-layout__topbar-right">
        <ProjectPicker v-if="isProjectScopedRoute" />
        <span class="sa-layout__user">{{ userLabel }}</span>
        <button class="sa-layout__logout" type="button" @click="handleLogout">로그아웃</button>
      </div>
    </header>

    <div class="sa-layout__body">
      <aside class="sa-layout__sidebar" aria-label="시스템 관리자 메뉴">
        <nav class="sa-layout__nav">
          <div
            v-for="group in menuGroups"
            :key="group.label"
            class="sa-layout__group"
          >
            <div class="sa-layout__group-label">{{ group.label }}</div>
            <p v-if="group.hint" class="sa-layout__group-hint">{{ group.hint }}</p>
            <ul class="sa-layout__list">
              <li v-for="item in group.items" :key="item.to">
                <RouterLink
                  :to="item.to"
                  class="sa-layout__link"
                  :class="{ 'sa-layout__link--active': isActive(item.to) }"
                >
                  {{ item.label }}
                </RouterLink>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <main class="sa-layout__main">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.sa-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--canvas);
}

.sa-layout__topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 24px;
  background: var(--surface-1);
  border-bottom: 1px solid var(--outline-soft);
}
.sa-layout__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
}
.sa-layout__brand-link {
  color: var(--primary);
  text-decoration: none;
}
.sa-layout__divider {
  color: var(--ink-faint);
}
.sa-layout__crumb {
  color: var(--ink);
}
.sa-layout__topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.sa-layout__user {
  font-size: 13px;
  color: var(--ink-muted);
}
.sa-layout__logout {
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  background: var(--surface-3);
  color: var(--ink);
  border: 1px solid var(--outline-soft);
  border-radius: 8px;
  cursor: pointer;
}
.sa-layout__logout:hover {
  background: #e6e6e6;
}

.sa-layout__body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.sa-layout__sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--surface-1);
  border-right: 1px solid var(--outline-soft);
  padding: 16px 0;
  overflow-y: auto;
}
.sa-layout__nav {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.sa-layout__group {
  display: flex;
  flex-direction: column;
}
.sa-layout__group-label {
  padding: 0 16px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--ink-muted);
  text-transform: uppercase;
}
.sa-layout__group-hint {
  padding: 0 16px;
  margin: 2px 0 6px;
  font-size: 11px;
  color: var(--ink-faint);
}
.sa-layout__list {
  list-style: none;
  padding: 0;
  margin: 4px 0 0;
}
.sa-layout__link {
  display: block;
  padding: 8px 16px;
  font-size: 13px;
  color: var(--ink);
  text-decoration: none;
  border-left: 3px solid transparent;
  transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
}
.sa-layout__link:hover {
  background: var(--surface-3);
}
.sa-layout__link--active {
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 600;
  border-left-color: var(--primary);
}

.sa-layout__main {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
  min-width: 0;
}

@media (max-width: 960px) {
  .sa-layout__sidebar {
    width: 200px;
  }
  .sa-layout__main {
    padding: 16px;
  }
}
</style>
