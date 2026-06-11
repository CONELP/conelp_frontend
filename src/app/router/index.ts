import { createRouter, createWebHashHistory } from "vue-router";

import { analyticsClient } from "@/shared/analytics/analytics-stub";
import AiAgentChatPage from "@/features/ai-agent/ui/AiAgentChatPage.vue";
import AiAgentThreadListPage from "@/features/ai-agent/ui/AiAgentThreadListPage.vue";
// 임시 비활성 — /dashboard 라우트 차단. 복구 가이드: docs/temporary-disabled-features/dashboard-and-schedule-import.md
// import DesktopDashboardPage from "@/features/desktop-dashboard/ui/DesktopDashboardPage.vue";
import DesktopSchedulePage from "@/features/desktop-schedule/ui/DesktopSchedulePage.vue";
import LandingPage from "@/features/landing/ui/LandingPage.vue";
import LoginPage from "@/features/auth/ui/LoginPage.vue";
import ConversionLoadingPage from "@/features/document-conversion/ui/ConversionLoadingPage.vue";
import DailyReportWritePage from "@/features/document-conversion/ui/DailyReportWritePage.vue";
import DocumentSelectionPage from "@/features/document-conversion/ui/DocumentSelectionPage.vue";
import DocumentUploadPage from "@/features/document-conversion/ui/DocumentUploadPage.vue";
import GeneratedDocumentsPage from "@/features/document-conversion/ui/GeneratedDocumentsPage.vue";
import MatInoutPeriodPage from "@/features/document-conversion/ui/MatInoutPeriodPage.vue";
import MaterialRegistrationResultPage from "@/features/document-conversion/ui/MaterialRegistrationResultPage.vue";
import ResultPreviewPage from "@/features/document-conversion/ui/ResultPreviewPage.vue";
import UploadFeedbackPage from "@/features/document-conversion/ui/UploadFeedbackPage.vue";

const SystemAdminLayout = () => import("@/features/system-admin/ui/SystemAdminLayout.vue");
const AdminPlaceholderPage = () =>
  import("@/features/system-admin/ui/components/AdminPlaceholderPage.vue");
const MasterDataPage = () =>
  import("@/features/project-admin/master-data/ui/MasterDataPage.vue");
const GlobalProjectPage = () =>
  import("@/features/system-admin/ui/pages/GlobalProjectPage.vue");
const GlobalUserCompanyPage = () =>
  import("@/features/system-admin/ui/pages/GlobalUserCompanyPage.vue");
const GlobalRolePage = () => import("@/features/system-admin/ui/pages/GlobalRolePage.vue");
const GlobalStandardPage = () =>
  import("@/features/system-admin/ui/pages/GlobalStandardPage.vue");
const GlobalEmbeddingPage = () =>
  import("@/features/system-admin/ui/pages/GlobalEmbeddingPage.vue");
const ApiKeyPage = () =>
  import("@/features/project-admin/api-key/ui/ApiKeyPage.vue");
const DocumentSettingPage = () =>
  import("@/features/project-admin/document-setting/ui/DocumentSettingPage.vue");
const BulkDeploymentPage = () =>
  import("@/features/project-admin/bulk-deployment/ui/BulkDeploymentPage.vue");
const HomepageSettingPage = () =>
  import("@/features/project-admin/homepage-setting/ui/HomepageSettingPage.vue");
const HolidayManagementPage = () =>
  import("@/features/project-admin/holiday/ui/HolidayManagementPage.vue");
const ScheduleValidationPage = () =>
  import("@/features/project-admin/schedule-validation/ui/ScheduleValidationPage.vue");

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      redirect: "/schedule",
    },
    {
      path: "/landing",
      name: "landing",
      component: LandingPage,
      meta: {
        public: true,
      },
    },
    {
      path: "/login",
      name: "login",
      component: LoginPage,
      meta: {
        public: true,
      },
    },
    {
      // 임시 비활성 — 헤더 탭 숨김 상태에서 직접 URL 접근 차단.
      // 복구 가이드: docs/temporary-disabled-features/dashboard-and-schedule-import.md
      path: "/dashboard",
      redirect: "/schedule",
    },
    {
      path: "/schedule",
      name: "desktop-schedule",
      component: DesktopSchedulePage,
    },
    {
      path: "/preview/documents",
      redirect: "/documents",
    },
    {
      path: "/preview/upload",
      redirect: "/documents/upload",
    },
    {
      path: "/preview/daily-report-write",
      redirect: "/documents/daily-report/write",
    },
    {
      path: "/preview/upload-feedback",
      redirect: "/documents/upload/review",
    },
    {
      path: "/preview/loading",
      redirect: "/documents/generation",
    },
    {
      path: "/preview/result",
      redirect: "/documents/result",
    },
    {
      path: "/preview/material-registration-result",
      redirect: "/documents/material-registration/result",
    },
    {
      path: "/preview/generated-documents",
      redirect: "/documents/generated",
    },
    {
      path: "/documents",
      name: "document-selection",
      component: DocumentSelectionPage,
    },
    {
      path: "/documents/upload",
      name: "document-upload",
      component: DocumentUploadPage,
    },
    {
      path: "/documents/daily-report/write",
      name: "daily-report-write",
      component: DailyReportWritePage,
    },
    {
      path: "/documents/mat-inout/period",
      name: "mat-inout-period",
      component: MatInoutPeriodPage,
    },
    {
      path: "/documents/upload/review",
      name: "document-upload-review",
      component: UploadFeedbackPage,
      beforeEnter: (to) => {
        if (to.query.documentType === "material_registration") {
          return {
            path: "/documents/generation",
            query: to.query,
          };
        }

        return true;
      },
    },
    {
      path: "/documents/generation",
      name: "document-generation",
      component: ConversionLoadingPage,
    },
    {
      path: "/documents/result",
      name: "document-result",
      component: ResultPreviewPage,
    },
    {
      path: "/documents/material-registration/result",
      name: "material-registration-result",
      component: MaterialRegistrationResultPage,
    },
    {
      path: "/documents/generated",
      name: "generated-documents",
      component: GeneratedDocumentsPage,
    },
    {
      path: "/ai-agent",
      name: "ai-agent-threads",
      component: AiAgentThreadListPage,
    },
    {
      path: "/ai-agent/threads/:threadId",
      name: "ai-agent-chat",
      component: AiAgentChatPage,
      props: (route) => ({ threadId: Number(route.params.threadId) }),
    },
    {
      path: "/system-admin",
      component: SystemAdminLayout,
      meta: { requiresSuper: true },
      redirect: "/system-admin/global/project",
      children: [
        {
          path: "global/project",
          name: "system-admin-global-project",
          component: GlobalProjectPage,
        },
        {
          path: "global/user-company",
          name: "system-admin-global-user-company",
          component: GlobalUserCompanyPage,
        },
        {
          path: "global/role",
          name: "system-admin-global-role",
          component: GlobalRolePage,
        },
        {
          path: "global/standard",
          name: "system-admin-global-standard",
          component: GlobalStandardPage,
        },
        {
          path: "global/embedding",
          name: "system-admin-global-embedding",
          component: GlobalEmbeddingPage,
        },
        {
          path: "project/master-data",
          name: "system-admin-project-master-data",
          component: MasterDataPage,
        },
        {
          path: "project/document-setting",
          name: "system-admin-project-document-setting",
          component: DocumentSettingPage,
        },
        {
          path: "project/holiday",
          name: "system-admin-project-holiday",
          component: HolidayManagementPage,
        },
        {
          path: "project/daily-report",
          name: "system-admin-project-daily-report",
          component: AdminPlaceholderPage,
          props: {
            title: "작업일보 설정",
            description:
              "원본 hook 432줄 + area 631줄 — native 재작성 분량이 매우 커서 별도 단계 필요. " +
              "원본: constructionHelperFrontend/src/features/project-admin/daily-report-setting/",
          },
        },
        {
          path: "project/bulk-deployment",
          name: "system-admin-project-bulk-deployment",
          component: BulkDeploymentPage,
        },
        {
          path: "project/homepage-setting",
          name: "system-admin-project-homepage-setting",
          component: HomepageSettingPage,
        },
        {
          path: "project/schedule-validation",
          name: "system-admin-project-schedule-validation",
          component: ScheduleValidationPage,
        },
        {
          path: "project/api-key",
          name: "system-admin-project-api-key",
          component: ApiKeyPage,
        },
      ],
    },
  ],
});

router.beforeEach(async (to) => {
  const { useAuthStore } = await import("@/features/auth/state/useAuthStore");
  const authStore = useAuthStore();

  if (!authStore.isInitialized) {
    await authStore.initialize();
  }

  if (to.meta.public) {
    if (
      (to.path === "/login" || to.path === "/landing") &&
      authStore.isAuthenticated
    ) {
      return "/schedule";
    }

    return true;
  }

  if (!authStore.isAuthenticated) {
    return "/landing";
  }

  const requiresSuper = to.matched.some((route) => route.meta.requiresSuper);
  if (requiresSuper && authStore.user?.systemRole !== "SUPER") {
    return "/schedule";
  }

  return true;
});

router.afterEach((to) => {
  analyticsClient.trackRouteView({
    routeName: to.name,
    routePath: to.path,
  });
});
