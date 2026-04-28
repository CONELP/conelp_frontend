import { createRouter, createWebHistory } from "vue-router";

import DesktopDashboardPage from "@/features/desktop-dashboard/ui/DesktopDashboardPage.vue";
import DesktopSchedulePage from "@/features/desktop-schedule/ui/DesktopSchedulePage.vue";
import ConversionLoadingPage from "@/features/document-conversion-demo/ui/ConversionLoadingPage.vue";
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
