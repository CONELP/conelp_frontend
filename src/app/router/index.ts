import { createRouter, createWebHistory } from "vue-router";

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

  return true;
});
