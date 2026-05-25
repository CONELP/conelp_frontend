import { defineStore } from "pinia";
import { computed, ref } from "vue";

export type BackgroundJobStatus =
  | "queued"
  | "analyzing"
  | "generating"
  | "succeeded"
  | "failed";

export interface BackgroundDocumentJob {
  id: string;
  documentType: string;
  documentTypeLabel: string;
  photoSummary: string;
  summary: string;
  status: BackgroundJobStatus;
  errorMessage: string;
  startedAt: number;
  updatedAt: number;
  resultRoute: string;
  retryKey: string;
  unread: boolean;
}

export interface BackgroundDocumentJobMeta {
  documentType?: string;
  documentTypeLabel: string;
  photoSummary?: string;
  summary?: string;
  initialStatus?: Extract<BackgroundJobStatus, "queued" | "analyzing" | "generating">;
  resultRoute?: string;
  retryKey?: string;
}

export interface BackgroundJobToast {
  id: string;
  tone: "info" | "success" | "error";
  message: string;
  actionLabel?: string;
  actionRoute?: string;
  durationMs: number;
  createdAt: number;
}

export interface BackgroundDocumentJobContext {
  updateStatus: (
    status: Extract<BackgroundJobStatus, "queued" | "analyzing" | "generating">,
  ) => void;
}

type BackgroundDocumentJobWork = (
  context: BackgroundDocumentJobContext,
) => Promise<void>;

interface BackgroundDocumentJobRetryEntry {
  meta: BackgroundDocumentJobMeta;
  work: BackgroundDocumentJobWork;
}

const DEFAULT_RESULT_ROUTE = "/documents/generated";
const DEFAULT_RETRY_KEY = "default";
const TOAST_AUTO_DISMISS_MS = 3000;

function createJobId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `bg-job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useBackgroundDocumentJobsStore = defineStore(
  "background-document-jobs",
  () => {
    const jobs = ref<BackgroundDocumentJob[]>([]);
    const toasts = ref<BackgroundJobToast[]>([]);
    const completionSignal = ref(0);
    const isDialogOpen = ref(false);
    const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const retryEntries = new Map<string, BackgroundDocumentJobRetryEntry>();

    const activeJobs = computed(() =>
      jobs.value.filter(
        (job) =>
          job.status === "queued" ||
          job.status === "analyzing" ||
          job.status === "generating",
      ),
    );
    const completedJobs = computed(() =>
      jobs.value.filter((job) => job.status === "succeeded"),
    );
    const failedJobs = computed(() =>
      jobs.value.filter((job) => job.status === "failed"),
    );
    const finishedJobs = computed(() =>
      jobs.value.filter(
        (job) => job.status === "succeeded" || job.status === "failed",
      ),
    );
    const visibleJobs = computed(() =>
      [...activeJobs.value, ...finishedJobs.value].sort(
        (first, second) => second.updatedAt - first.updatedAt,
      ),
    );
    const unreadCompletedCount = computed(
      () => completedJobs.value.filter((job) => job.unread).length,
    );
    const unreadFailedCount = computed(
      () => failedJobs.value.filter((job) => job.unread).length,
    );
    const pendingJobs = computed(() => activeJobs.value);
    const hasPendingJobs = computed(() => pendingJobs.value.length > 0);
    const hasVisibleJobs = computed(() => visibleJobs.value.length > 0);

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

    function pushToast(
      toast: Omit<BackgroundJobToast, "id" | "durationMs" | "createdAt"> & {
        durationMs?: number;
      },
    ) {
      const id = createJobId();
      const durationMs = toast.durationMs ?? TOAST_AUTO_DISMISS_MS;
      const entry: BackgroundJobToast = {
        id,
        ...toast,
        durationMs,
        createdAt: Date.now(),
      };

      toasts.value = [...toasts.value, entry];

      const timer = setTimeout(() => {
        dismissToast(id);
      }, durationMs);

      toastTimers.set(id, timer);
    }

    function dismissJob(jobId: string) {
      jobs.value = jobs.value.filter((job) => job.id !== jobId);
      retryEntries.delete(jobId);

      if (jobs.value.length === 0) {
        isDialogOpen.value = false;
      }
    }

    function clearFinishedJobs() {
      finishedJobs.value.forEach((job) => {
        retryEntries.delete(job.id);
      });
      jobs.value = jobs.value.filter(
        (job) =>
          job.status === "queued" ||
          job.status === "analyzing" ||
          job.status === "generating",
      );
    }

    function markJobsRead() {
      jobs.value.forEach((job) => {
        job.unread = false;
      });
    }

    function updateJobStatus(
      jobId: string,
      status: Extract<BackgroundJobStatus, "queued" | "analyzing" | "generating">,
    ) {
      const target = jobs.value.find((job) => job.id === jobId);

      if (!target) return;

      target.status = status;
      target.updatedAt = Date.now();
    }

    function canRetryJob(jobId: string) {
      return retryEntries.has(jobId);
    }

    function retryJob(jobId: string) {
      const retryEntry = retryEntries.get(jobId);

      if (!retryEntry) return;

      dismissJob(jobId);
      void enqueueJob(retryEntry.meta, retryEntry.work);
    }

    async function enqueueJob(
      meta: BackgroundDocumentJobMeta,
      work: BackgroundDocumentJobWork,
    ) {
      const id = createJobId();
      const now = Date.now();
      const summary = meta.summary ?? meta.photoSummary ?? "";
      const job: BackgroundDocumentJob = {
        id,
        documentType: meta.documentType ?? "",
        documentTypeLabel: meta.documentTypeLabel,
        photoSummary: meta.photoSummary ?? summary,
        summary,
        status: meta.initialStatus ?? "generating",
        errorMessage: "",
        startedAt: now,
        updatedAt: now,
        resultRoute: meta.resultRoute ?? DEFAULT_RESULT_ROUTE,
        retryKey: meta.retryKey ?? DEFAULT_RETRY_KEY,
        unread: false,
      };
      jobs.value = [...jobs.value, job];
      retryEntries.set(id, { meta, work });
      pushToast({
        tone: "info",
        message: "문서 생성을 시작했어요. 다른 작업을 계속하셔도 됩니다.",
      });

      try {
        await work({
          updateStatus: (status) => updateJobStatus(id, status),
        });

        const target = jobs.value.find((entry) => entry.id === id);

        if (target) {
          target.status = "succeeded";
          target.updatedAt = Date.now();
          target.errorMessage = "";
          target.unread = true;
        }

        pushToast({
          tone: "success",
          message: `${meta.documentTypeLabel} 문서 생성이 완료됐어요.`,
          actionLabel: "결과 보기",
          actionRoute: job.resultRoute,
        });
        completionSignal.value += 1;
        retryEntries.delete(id);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : `${meta.documentTypeLabel} 문서 생성에 실패했어요.`;
        const target = jobs.value.find((entry) => entry.id === id);

        if (target) {
          target.status = "failed";
          target.errorMessage = message;
          target.updatedAt = Date.now();
          target.unread = true;
        }

        pushToast({ tone: "error", message });
      }
    }

    return {
      jobs,
      activeJobs,
      completedJobs,
      failedJobs,
      finishedJobs,
      visibleJobs,
      pendingJobs,
      hasPendingJobs,
      hasVisibleJobs,
      unreadCompletedCount,
      unreadFailedCount,
      toasts,
      completionSignal,
      isDialogOpen,
      enqueueJob,
      retryJob,
      canRetryJob,
      dismissJob,
      clearFinishedJobs,
      markJobsRead,
      openDialog,
      closeDialog,
      dismissToast,
    };
  },
);
