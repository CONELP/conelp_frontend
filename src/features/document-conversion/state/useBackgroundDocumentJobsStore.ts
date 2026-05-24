import { defineStore } from "pinia";
import { computed, ref } from "vue";

export type BackgroundJobStatus = "pending" | "succeeded" | "failed";

export interface BackgroundDocumentJob {
  id: string;
  documentTypeLabel: string;
  photoSummary: string;
  status: BackgroundJobStatus;
  errorMessage: string;
  startedAt: number;
}

export interface BackgroundJobToast {
  id: string;
  tone: "success" | "error";
  message: string;
}

function createJobId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `bg-job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const TOAST_AUTO_DISMISS_MS = 12000;

export const useBackgroundDocumentJobsStore = defineStore(
  "background-document-jobs",
  () => {
    const jobs = ref<BackgroundDocumentJob[]>([]);
    const toasts = ref<BackgroundJobToast[]>([]);
    const completionSignal = ref(0);
    const isDialogOpen = ref(false);
    const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();

    const pendingJobs = computed(() =>
      jobs.value.filter((job) => job.status === "pending"),
    );
    const hasPendingJobs = computed(() => pendingJobs.value.length > 0);

    function openDialog() {
      isDialogOpen.value = true;
    }

    function closeDialog() {
      isDialogOpen.value = false;
    }

    function dismissToast(toastId: string) {
      const timer = toastTimers.get(toastId);

      if (timer) {
        clearTimeout(timer);
        toastTimers.delete(toastId);
      }

      toasts.value = toasts.value.filter((toast) => toast.id !== toastId);
    }

    function pushToast(toast: Omit<BackgroundJobToast, "id">) {
      const id = createJobId();
      const entry: BackgroundJobToast = { id, ...toast };

      toasts.value = [...toasts.value, entry];

      const timer = setTimeout(() => {
        dismissToast(id);
      }, TOAST_AUTO_DISMISS_MS);

      toastTimers.set(id, timer);
    }

    function removeCompletedJob(jobId: string) {
      jobs.value = jobs.value.filter((job) => job.id !== jobId);

      if (jobs.value.length === 0) {
        isDialogOpen.value = false;
      }
    }

    async function enqueueJob(
      meta: { documentTypeLabel: string; photoSummary: string },
      work: () => Promise<void>,
    ) {
      const id = createJobId();
      const job: BackgroundDocumentJob = {
        id,
        documentTypeLabel: meta.documentTypeLabel,
        photoSummary: meta.photoSummary,
        status: "pending",
        errorMessage: "",
        startedAt: Date.now(),
      };

      jobs.value = [...jobs.value, job];
      isDialogOpen.value = true;

      try {
        await work();

        const target = jobs.value.find((entry) => entry.id === id);

        if (target) {
          target.status = "succeeded";
        }

        pushToast({
          tone: "success",
          message: `${meta.documentTypeLabel} 문서 생성이 완료됐어요.`,
        });
        completionSignal.value += 1;
        removeCompletedJob(id);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : `${meta.documentTypeLabel} 문서 생성에 실패했어요.`;
        const target = jobs.value.find((entry) => entry.id === id);

        if (target) {
          target.status = "failed";
          target.errorMessage = message;
        }

        pushToast({ tone: "error", message });
        removeCompletedJob(id);
      }
    }

    return {
      jobs,
      pendingJobs,
      hasPendingJobs,
      toasts,
      completionSignal,
      isDialogOpen,
      enqueueJob,
      openDialog,
      closeDialog,
      dismissToast,
    };
  },
);
