import { createRouter, createWebHistory } from "vue-router";

import AiAgentChatPage from "@/features/ai-agent/ui/AiAgentChatPage.vue";
import AiAgentThreadListPage from "@/features/ai-agent/ui/AiAgentThreadListPage.vue";
import DesktopDashboardPage from "@/features/desktop-dashboard/ui/DesktopDashboardPage.vue";
import DesktopSchedulePage from "@/features/desktop-schedule/ui/DesktopSchedulePage.vue";
import LoginPage from "@/features/auth/ui/LoginPage.vue";
import ConversionLoadingPage from "@/features/document-conversion-demo/ui/ConversionLoadingPage.vue";
import DailyReportWritePage from "@/features/document-conversion-demo/ui/DailyReportWritePage.vue";
import DocumentSelectionPage from "@/features/document-conversion-demo/ui/DocumentSelectionPage.vue";
import DocumentUploadPage from "@/features/document-conversion-demo/ui/DocumentUploadPage.vue";
import GeneratedDocumentsPage from "@/features/document-conversion-demo/ui/GeneratedDocumentsPage.vue";
import MaterialRegistrationResultPage from "@/features/document-conversion-demo/ui/MaterialRegistrationResultPage.vue";
import ResultPreviewPage from "@/features/document-conversion-demo/ui/ResultPreviewPage.vue";
import UploadFeedbackPage from "@/features/document-conversion-demo/ui/UploadFeedbackPage.vue";

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
const GlobalApiKeyPage = () => import("@/features/system-admin/ui/pages/GlobalApiKeyPage.vue");
const DocumentSettingPage = () =>
  import("@/features/project-admin/document-setting/ui/DocumentSettingPage.vue");
const BulkDeploymentPage = () =>
  import("@/features/project-admin/bulk-deployment/ui/BulkDeploymentPage.vue");
const HomepageSettingPage = () =>
  import("@/features/project-admin/homepage-setting/ui/HomepageSettingPage.vue");
const HolidayManagementPage = () =>
  import("@/features/project-admin/holiday/ui/HolidayManagementPage.vue");

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/dashboard",
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
      path: "/dashboard",
      name: "desktop-dashboard",
      component: DesktopDashboardPage,
    },
    {
      path: "/schedule",
      name: "desktop-schedule",
      component: DesktopSchedulePage,
    },
    {
      path: "/preview/documents",
      alias: ["/documents"],
      name: "document-selection",
      component: DocumentSelectionPage,
    },
    {
      path: "/preview/upload",
      name: "upload-preview",
      component: DocumentUploadPage,
    },
    {
      path: "/preview/daily-report-write",
      name: "daily-report-write-preview",
      component: DailyReportWritePage,
    },
    {
      path: "/preview/upload-feedback",
      name: "upload-feedback-preview",
      component: UploadFeedbackPage,
    },
    {
      path: "/preview/loading",
      name: "loading-preview",
      component: ConversionLoadingPage,
    },
    {
      path: "/preview/result",
      name: "result-preview",
      component: ResultPreviewPage,
    },
    {
      path: "/preview/material-registration-result",
      name: "material-registration-result-preview",
      component: MaterialRegistrationResultPage,
    },
    {
      path: "/preview/generated-documents",
      name: "generated-documents-preview",
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
          path: "global/api-key",
          name: "system-admin-global-api-key",
          component: GlobalApiKeyPage,
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
    if (to.path === "/login" && authStore.isAuthenticated) {
      return "/dashboard";
    }

    return true;
  }

  if (!authStore.isAuthenticated) {
    return {
      path: "/login",
      query: {
        redirect: to.fullPath,
      },
    };
  }

  const requiresSuper = to.matched.some((route) => route.meta.requiresSuper);
  if (requiresSuper && authStore.user?.systemRole !== "SUPER") {
    return "/dashboard";
  }

  return true;
});
