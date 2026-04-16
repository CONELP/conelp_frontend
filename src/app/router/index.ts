import { createRouter, createWebHistory } from "vue-router";

import DemoPlaceholderPage from "@/features/document-conversion-demo/ui/DemoPlaceholderPage.vue";
import DocumentSelectionPage from "@/features/document-conversion-demo/ui/DocumentSelectionPage.vue";
import DocumentUploadPage from "@/features/document-conversion-demo/ui/DocumentUploadPage.vue";
import UploadFeedbackPage from "@/features/document-conversion-demo/ui/UploadFeedbackPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/preview/documents",
    },
    {
      path: "/preview/documents",
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
      component: DemoPlaceholderPage,
      props: {
        eyebrow: "LOADING PREVIEW",
        title: "변환 로딩 화면은 다음 stage에서 구체화됩니다",
        description:
          "Stage 7에서 AI 변환 경험을 느낄 수 있도록 glow, gradation, animation을 넣어 다듬습니다.",
      },
    },
    {
      path: "/preview/result",
      name: "result-preview",
      component: DemoPlaceholderPage,
      props: {
        eyebrow: "RESULT PREVIEW",
        title: "결과 화면은 다음 stage에서 구체화됩니다",
        description:
          "Stage 8에서 결과 요약, 예시 비주얼, 다음 행동 CTA를 실제 화면으로 정리합니다.",
      },
    },
  ],
});
