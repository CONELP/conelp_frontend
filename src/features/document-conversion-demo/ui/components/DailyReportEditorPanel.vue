<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import imageIcon from "@fluentui/svg-icons/icons/image_20_regular.svg";

import { actualWorkApi } from "@/features/document-conversion-demo/api/actual-work.api";
import type { ActualWorkResponse } from "@/features/document-conversion-demo/api/actual-work-api.types";
import { materialInspectionRequestApi } from "@/features/document-conversion-demo/api/material-inspection-request.api";
import type { WorkTypeReferenceResponse } from "@/features/document-conversion-demo/api/material-inspection-request-api.types";

type DailyReportWorkSection = "today" | "tomorrow";
type DailyReportEditorTabId =
  | "todayWork"
  | "tomorrowWork"
  | "labor"
  | "material"
  | "equipment";
type DailyReportResourceTabId = Exclude<
  DailyReportEditorTabId,
  "todayWork" | "tomorrowWork" | "labor"
>;
type DailyReportResourceColumnKey = "name" | "detail" | "quantity" | "note";

type DailyReportEditorTab = {
  id: DailyReportEditorTabId;
  label: string;
};

type DailyReportResourceColumn = {
  key: DailyReportResourceColumnKey;
  label: string;
  placeholder: string;
  inputMode?: "numeric" | "text";
};

type DailyReportResourceTab = {
  id: DailyReportResourceTabId;
  label: string;
  addLabel: string;
  columns: DailyReportResourceColumn[];
};

const DAILY_REPORT_EDITOR_TABS: DailyReportEditorTab[] = [
  { id: "todayWork", label: "오늘작업" },
  { id: "tomorrowWork", label: "내일작업" },
  { id: "labor", label: "인력투입" },
  { id: "material", label: "자재투입" },
  { id: "equipment", label: "장비투입" },
];

const DAILY_REPORT_RESOURCE_TABS: DailyReportResourceTab[] = [
  {
    id: "material",
    label: "자재투입",
    addLabel: "자재 추가",
    columns: [
      { key: "name", label: "자재명", placeholder: "자재명" },
      { key: "detail", label: "규격", placeholder: "규격" },
      { key: "quantity", label: "수량", placeholder: "수량", inputMode: "numeric" },
    ],
  },
  {
    id: "equipment",
    label: "장비투입",
    addLabel: "장비 추가",
    columns: [
      { key: "name", label: "장비명", placeholder: "장비명" },
      { key: "detail", label: "규격", placeholder: "규격" },
      { key: "quantity", label: "수량", placeholder: "수량", inputMode: "numeric" },
    ],
  },
];

const HOMEPAGE_IMPORT_MIN_DURATION_MS = 2500;

type DailyReportImageDraft = {
  id: string;
  src: string;
  description: string;
};

type DailyReportImageDropPosition = "before" | "after";

type DailyReportImageDragState = {
  section: DailyReportWorkSection;
  imageId: string;
};

type DailyReportImageDragOverState = DailyReportImageDragState & {
  position: DailyReportImageDropPosition;
};

type DailyReportTaskDraft = {
  id: string;
  text: string;
  actualWorkId: number | null;
  matchedWorkName: string | null;
  isSyncing: boolean;
  hasReceivedResponse: boolean;
};

type DailyReportWorkTypeDraft = {
  id: string;
  workTypeId: number | null;
  workTypeName: string;
  tasks: DailyReportTaskDraft[];
};

type DailyReportLaborSubWorkDraft = {
  id: string;
  name: string;
  quantity: string;
};

type DailyReportLaborWorkTypeDraft = {
  id: string;
  workTypeId: number | null;
  workTypeName: string;
  subWorks: DailyReportLaborSubWorkDraft[];
};

type DailyReportResourceDraft = {
  id: string;
  name: string;
  detail: string;
  quantity: string;
  note: string;
};

type DailyReportWorkTypeSuggestionState = {
  suggestions: WorkTypeReferenceResponse[];
  isLoading: boolean;
  errorMessage: string;
  isOpen: boolean;
  highlightedIndex: number;
  requestId: number;
  closeTimer: ReturnType<typeof setTimeout> | null;
};

const todayImageInputRef = ref<HTMLInputElement | null>(null);
const tomorrowImageInputRef = ref<HTMLInputElement | null>(null);
const imageDragState = ref<DailyReportImageDragState | null>(null);
const imageDragOverState = ref<DailyReportImageDragOverState | null>(null);
const todayWorkTypes = ref<DailyReportWorkTypeDraft[]>([
  createDailyReportWorkTypeDraft(),
]);
const tomorrowWorkTypes = ref<DailyReportWorkTypeDraft[]>([
  createDailyReportWorkTypeDraft(),
]);
const todayImages = ref<DailyReportImageDraft[]>([]);
const tomorrowImages = ref<DailyReportImageDraft[]>([]);
const laborWorkTypes = ref<DailyReportLaborWorkTypeDraft[]>([
  createDailyReportLaborWorkTypeDraft(),
]);
const materialRows = ref<DailyReportResourceDraft[]>([
  createDailyReportResourceDraft(),
]);
const equipmentRows = ref<DailyReportResourceDraft[]>([
  createDailyReportResourceDraft(),
]);
const previewImage = ref<DailyReportImageDraft | null>(null);
const activeDailyReportTab = ref<DailyReportEditorTabId>("todayWork");
const workTypeSuggestionStates = ref<Record<string, DailyReportWorkTypeSuggestionState>>({});
const laborWorkTypeSuggestionStates = ref<Record<string, DailyReportWorkTypeSuggestionState>>({});
const homepageImportStatus = ref<"idle" | "loading" | "error">("idle");
const taskSyncRequestIds = new Map<string, number>();
const pendingTaskDeletes = new Set<string>();

function createDailyReportId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `daily-report-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createDailyReportTask(text = ""): DailyReportTaskDraft {
  return {
    id: createDailyReportId(),
    text,
    actualWorkId: null,
    matchedWorkName: null,
    isSyncing: false,
    hasReceivedResponse: false,
  };
}

function createDailyReportTaskFromResponse(
  response: ActualWorkResponse,
): DailyReportTaskDraft {
  return {
    id: createDailyReportId(),
    text: response.actualWorkName,
    actualWorkId: response.id,
    matchedWorkName: response.workName,
    isSyncing: false,
    hasReceivedResponse: true,
  };
}

function createDailyReportWorkTypeDraft(
  taskText = "",
): DailyReportWorkTypeDraft {
  return {
    id: createDailyReportId(),
    workTypeId: null,
    workTypeName: "",
    tasks: [createDailyReportTask(taskText)],
  };
}

function createDailyReportLaborSubWorkDraft(
  name = "",
  quantity = "",
): DailyReportLaborSubWorkDraft {
  return {
    id: createDailyReportId(),
    name,
    quantity,
  };
}

function createDailyReportLaborWorkTypeDraft(
  subWorkName = "",
  quantity = "",
): DailyReportLaborWorkTypeDraft {
  return {
    id: createDailyReportId(),
    workTypeId: null,
    workTypeName: "",
    subWorks: [createDailyReportLaborSubWorkDraft(subWorkName, quantity)],
  };
}

function createDailyReportResourceDraft(): DailyReportResourceDraft {
  return {
    id: createDailyReportId(),
    name: "",
    detail: "",
    quantity: "",
    note: "",
  };
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function getReportDates() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return {
    today: formatLocalDate(today),
    tomorrow: formatLocalDate(tomorrow),
  };
}

const reportDates = getReportDates();

function getSectionDate(section: DailyReportWorkSection) {
  return section === "today" ? reportDates.today : reportDates.tomorrow;
}

function getImageInputRef(section: DailyReportWorkSection) {
  return section === "today" ? todayImageInputRef.value : tomorrowImageInputRef.value;
}

function getWorkTypeDrafts(section: DailyReportWorkSection) {
  return section === "today" ? todayWorkTypes.value : tomorrowWorkTypes.value;
}

function ensureDefaultWorkTypes(workTypes: DailyReportWorkTypeDraft[]) {
  return workTypes.length > 0 ? workTypes : [createDailyReportWorkTypeDraft()];
}

function ensureDefaultLaborWorkTypes(
  workTypes: DailyReportLaborWorkTypeDraft[],
) {
  return workTypes.length > 0
    ? workTypes
    : [createDailyReportLaborWorkTypeDraft()];
}

function setWorkTypeDrafts(
  section: DailyReportWorkSection,
  workTypes: DailyReportWorkTypeDraft[],
) {
  const nextWorkTypes = ensureDefaultWorkTypes(workTypes);

  if (section === "today") {
    todayWorkTypes.value = nextWorkTypes;
    return;
  }

  tomorrowWorkTypes.value = nextWorkTypes;
}

function getImageDrafts(section: DailyReportWorkSection) {
  return section === "today" ? todayImages.value : tomorrowImages.value;
}

function setImageDrafts(
  section: DailyReportWorkSection,
  images: DailyReportImageDraft[],
) {
  if (section === "today") {
    todayImages.value = images;
    return;
  }

  tomorrowImages.value = images;
}

function findSectionForWorkType(
  workType: DailyReportWorkTypeDraft,
): DailyReportWorkSection | null {
  if (todayWorkTypes.value.some((entry) => entry.id === workType.id)) {
    return "today";
  }

  if (tomorrowWorkTypes.value.some((entry) => entry.id === workType.id)) {
    return "tomorrow";
  }

  return null;
}

function nextSyncRequestId(taskId: string) {
  const next = (taskSyncRequestIds.get(taskId) ?? 0) + 1;
  taskSyncRequestIds.set(taskId, next);
  return next;
}

function isLatestSync(taskId: string, requestId: number) {
  return taskSyncRequestIds.get(taskId) === requestId;
}

function applyResponseToTask(
  task: DailyReportTaskDraft,
  response: ActualWorkResponse,
) {
  task.actualWorkId = response.id;
  task.matchedWorkName = response.workName;
  task.hasReceivedResponse = true;
}

async function syncTaskCreate(
  task: DailyReportTaskDraft,
  workType: DailyReportWorkTypeDraft,
  section: DailyReportWorkSection,
) {
  if (workType.workTypeId === null) {
    return;
  }

  const trimmedName = task.text.trim();

  if (!trimmedName) {
    return;
  }

  const requestId = nextSyncRequestId(task.id);
  task.isSyncing = true;

  try {
    const response = await actualWorkApi.create({
      date: getSectionDate(section),
      workTypeId: workType.workTypeId,
      workName: trimmedName,
    });

    if (!isLatestSync(task.id, requestId)) {
      return;
    }

    if (pendingTaskDeletes.has(task.id)) {
      pendingTaskDeletes.delete(task.id);
      await actualWorkApi.delete(response.id);
      return;
    }

    applyResponseToTask(task, response);
  } catch (error) {
    console.error("createActualWork failed", error);
  } finally {
    if (isLatestSync(task.id, requestId)) {
      task.isSyncing = false;
    }
  }
}

async function syncTaskUpdate(
  task: DailyReportTaskDraft,
  patch: { workTypeId?: number; workName?: string },
) {
  if (task.actualWorkId === null) {
    return;
  }

  const body = {
    ...(typeof patch.workTypeId === "number" ? { workTypeId: patch.workTypeId } : {}),
    ...(typeof patch.workName === "string" ? { workName: patch.workName } : {}),
  };

  if (Object.keys(body).length === 0) {
    return;
  }

  const requestId = nextSyncRequestId(task.id);
  task.isSyncing = true;

  try {
    const response = await actualWorkApi.update(task.actualWorkId, body);

    if (!isLatestSync(task.id, requestId)) {
      return;
    }

    applyResponseToTask(task, response);
  } catch (error) {
    console.error("updateActualWork failed", error);
  } finally {
    if (isLatestSync(task.id, requestId)) {
      task.isSyncing = false;
    }
  }
}

async function syncTaskDelete(task: DailyReportTaskDraft) {
  if (task.actualWorkId === null) {
    pendingTaskDeletes.add(task.id);
    return;
  }

  try {
    await actualWorkApi.delete(task.actualWorkId);
  } catch (error) {
    console.error("deleteActualWork failed", error);
  }
}

function addDailyReportWorkType(section: DailyReportWorkSection) {
  setWorkTypeDrafts(section, [
    ...getWorkTypeDrafts(section),
    createDailyReportWorkTypeDraft(),
  ]);
}

function removeDailyReportWorkType(
  section: DailyReportWorkSection,
  workTypeId: string,
) {
  clearWorkTypeSuggestionCloseTimer(workTypeId);
  const target = getWorkTypeDrafts(section).find(
    (workType) => workType.id === workTypeId,
  );

  setWorkTypeDrafts(
    section,
    getWorkTypeDrafts(section).filter((workType) => workType.id !== workTypeId),
  );

  target?.tasks.forEach((task) => {
    void syncTaskDelete(task);
  });
}

function addDailyReportTask(workType: DailyReportWorkTypeDraft) {
  workType.tasks.push(createDailyReportTask());
}

function removeDailyReportTask(
  workType: DailyReportWorkTypeDraft,
  taskId: string,
) {
  const target = workType.tasks.find((task) => task.id === taskId);
  workType.tasks = workType.tasks.filter((task) => task.id !== taskId);

  if (target) {
    void syncTaskDelete(target);
  }
}

async function handleTaskBlur(
  workType: DailyReportWorkTypeDraft,
  task: DailyReportTaskDraft,
) {
  const trimmedName = task.text.trim();

  if (!trimmedName) {
    return;
  }

  if (task.actualWorkId === null) {
    const section = findSectionForWorkType(workType);

    if (!section) {
      return;
    }

    await syncTaskCreate(task, workType, section);
    return;
  }

  await syncTaskUpdate(task, { workName: trimmedName });
}

function createSuggestionState(): DailyReportWorkTypeSuggestionState {
  return {
    suggestions: [],
    isLoading: false,
    errorMessage: "",
    isOpen: false,
    highlightedIndex: -1,
    requestId: 0,
    closeTimer: null,
  };
}

function getWorkTypeSuggestionState(workTypeId: string) {
  return workTypeSuggestionStates.value[workTypeId] ?? createSuggestionState();
}

function ensureWorkTypeSuggestionState(workTypeId: string) {
  const currentState = workTypeSuggestionStates.value[workTypeId];

  if (currentState) {
    return currentState;
  }

  const nextState = createSuggestionState();

  workTypeSuggestionStates.value = {
    ...workTypeSuggestionStates.value,
    [workTypeId]: nextState,
  };

  return nextState;
}

function clearWorkTypeSuggestionCloseTimer(workTypeId: string) {
  const state = workTypeSuggestionStates.value[workTypeId];

  if (state?.closeTimer) {
    clearTimeout(state.closeTimer);
    state.closeTimer = null;
  }
}

function clearDailyReportWorkTypeSuggestions(workTypeId: string) {
  const state = ensureWorkTypeSuggestionState(workTypeId);
  state.suggestions = [];
  state.errorMessage = "";
  state.isLoading = false;
  state.isOpen = false;
  state.highlightedIndex = -1;
}

async function loadDailyReportWorkTypeSuggestions(
  workType: DailyReportWorkTypeDraft,
) {
  const query = workType.workTypeName.trim();
  const state = ensureWorkTypeSuggestionState(workType.id);
  const requestId = state.requestId + 1;
  state.requestId = requestId;

  if (!query) {
    clearDailyReportWorkTypeSuggestions(workType.id);
    return;
  }

  state.isLoading = true;
  state.errorMessage = "";
  state.isOpen = true;

  try {
    const suggestions =
      await materialInspectionRequestApi.getWorkTypeListByName(query);

    if (state.requestId !== requestId) {
      return;
    }

    state.suggestions = suggestions;
    state.highlightedIndex = suggestions.length > 0 ? 0 : -1;
  } catch (error) {
    if (state.requestId !== requestId) {
      return;
    }

    state.suggestions = [];
    state.highlightedIndex = -1;
    state.errorMessage =
      error instanceof Error ? error.message : "공종명을 불러오지 못했습니다.";
  } finally {
    if (state.requestId === requestId) {
      state.isLoading = false;
    }
  }
}

function handleDailyReportWorkTypeNameInput(
  workType: DailyReportWorkTypeDraft,
  event: Event,
) {
  const input = event.target as HTMLInputElement | null;
  workType.workTypeName = input?.value ?? "";
  workType.workTypeId = null;
  void loadDailyReportWorkTypeSuggestions(workType);
}

function setDailyReportWorkTypeHighlightedIndex(
  workTypeId: string,
  index: number,
) {
  const state = ensureWorkTypeSuggestionState(workTypeId);
  state.highlightedIndex = Math.min(
    Math.max(index, -1),
    state.suggestions.length - 1,
  );
}

function handleDailyReportWorkTypeKeydown(
  workType: DailyReportWorkTypeDraft,
  event: KeyboardEvent,
) {
  const state = ensureWorkTypeSuggestionState(workType.id);
  const suggestionCount = state.suggestions.length;

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    clearWorkTypeSuggestionCloseTimer(workType.id);

    if (workType.workTypeName.trim()) {
      state.isOpen = true;
    }

    if (suggestionCount === 0) {
      return;
    }

    const offset = event.key === "ArrowDown" ? 1 : -1;
    const baseIndex =
      state.highlightedIndex >= 0
        ? state.highlightedIndex
        : event.key === "ArrowDown"
          ? -1
          : 0;
    state.highlightedIndex = (baseIndex + offset + suggestionCount) % suggestionCount;
    return;
  }

  if (event.key === "Enter" && !event.isComposing) {
    if (!state.isOpen || suggestionCount === 0) {
      return;
    }

    event.preventDefault();
    const selectedIndex =
      state.highlightedIndex >= 0 && state.highlightedIndex < suggestionCount
        ? state.highlightedIndex
        : 0;
    const suggestion = state.suggestions[selectedIndex];

    if (suggestion) {
      selectDailyReportWorkTypeSuggestion(workType, suggestion);
    }
    return;
  }

  if (event.key === "Escape" && state.isOpen) {
    event.preventDefault();
    state.isOpen = false;
    state.highlightedIndex = -1;
  }
}

function openDailyReportWorkTypeSuggestionList(
  workType: DailyReportWorkTypeDraft,
) {
  clearWorkTypeSuggestionCloseTimer(workType.id);

  const state = ensureWorkTypeSuggestionState(workType.id);
  const query = workType.workTypeName.trim();

  if (!query) {
    return;
  }

  state.isOpen = true;
  state.highlightedIndex =
    state.highlightedIndex >= 0
      ? state.highlightedIndex
      : state.suggestions.length > 0
        ? 0
        : -1;

  if (!state.isLoading && state.suggestions.length === 0) {
    void loadDailyReportWorkTypeSuggestions(workType);
  }
}

function scheduleCloseDailyReportWorkTypeSuggestionList(workTypeId: string) {
  clearWorkTypeSuggestionCloseTimer(workTypeId);
  const state = ensureWorkTypeSuggestionState(workTypeId);
  state.closeTimer = setTimeout(() => {
    state.isOpen = false;
    state.closeTimer = null;
  }, 120);
}

function selectDailyReportWorkTypeSuggestion(
  workType: DailyReportWorkTypeDraft,
  suggestion: WorkTypeReferenceResponse,
) {
  clearWorkTypeSuggestionCloseTimer(workType.id);
  const state = ensureWorkTypeSuggestionState(workType.id);
  state.requestId += 1;

  const previousWorkTypeId = workType.workTypeId;
  workType.workTypeId = suggestion.id;
  workType.workTypeName = suggestion.name;
  state.suggestions = [];
  state.errorMessage = "";
  state.isOpen = false;
  state.highlightedIndex = -1;

  if (previousWorkTypeId === suggestion.id) {
    return;
  }

  const section = findSectionForWorkType(workType);

  if (!section) {
    return;
  }

  workType.tasks.forEach((task) => {
    if (task.actualWorkId !== null) {
      void syncTaskUpdate(task, { workTypeId: suggestion.id });
      return;
    }

    if (task.text.trim()) {
      void syncTaskCreate(task, workType, section);
    }
  });
}

function readImageFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("이미지 파일을 읽지 못했습니다."));
    });
    reader.addEventListener("error", () => {
      reject(reader.error ?? new Error("이미지 파일을 읽지 못했습니다."));
    });
    reader.readAsDataURL(file);
  });
}

function openImagePicker(section: DailyReportWorkSection) {
  getImageInputRef(section)?.click();
}

async function handleDailyReportImageChange(
  section: DailyReportWorkSection,
  event: Event,
) {
  const input = event.target as HTMLInputElement | null;
  const files = Array.from(input?.files ?? []).filter((file) =>
    file.type.startsWith("image/"),
  );

  if (input) {
    input.value = "";
  }

  if (files.length === 0) {
    return;
  }

  const nextImages = await Promise.all(
    files.map(async (file) => ({
      id: createDailyReportId(),
      src: await readImageFileAsDataUrl(file),
      description: "",
    })),
  );

  setImageDrafts(section, [...getImageDrafts(section), ...nextImages]);
}

function removeDailyReportImage(
  section: DailyReportWorkSection,
  imageId: string,
) {
  setImageDrafts(
    section,
    getImageDrafts(section).filter((image) => image.id !== imageId),
  );
}

function openDailyReportImagePreview(image: DailyReportImageDraft) {
  previewImage.value = image;
}

function closeDailyReportImagePreview() {
  previewImage.value = null;
}

function getImageDropPosition(event: DragEvent): DailyReportImageDropPosition {
  const target = event.currentTarget;

  if (!(target instanceof HTMLElement)) {
    return "after";
  }

  const targetRect = target.getBoundingClientRect();
  return event.clientX > targetRect.left + targetRect.width / 2 ? "after" : "before";
}

function moveDailyReportImage(
  section: DailyReportWorkSection,
  sourceImageId: string,
  targetImageId: string,
  position: DailyReportImageDropPosition,
) {
  if (sourceImageId === targetImageId) {
    return;
  }

  const images = getImageDrafts(section);
  const sourceIndex = images.findIndex((image) => image.id === sourceImageId);
  const targetIndex = images.findIndex((image) => image.id === targetImageId);

  if (sourceIndex < 0 || targetIndex < 0) {
    return;
  }

  const nextImages = [...images];
  const [movedImage] = nextImages.splice(sourceIndex, 1);

  if (!movedImage) {
    return;
  }

  const adjustedTargetIndex = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
  const insertIndex = position === "after" ? adjustedTargetIndex + 1 : adjustedTargetIndex;
  nextImages.splice(insertIndex, 0, movedImage);
  setImageDrafts(section, nextImages);
}

function handleImageDragStart(
  section: DailyReportWorkSection,
  imageId: string,
  event: DragEvent,
) {
  const target = event.target;

  if (target instanceof HTMLElement && target.closest("button, input, textarea")) {
    event.preventDefault();
    return;
  }

  imageDragState.value = { section, imageId };
  imageDragOverState.value = null;
  event.dataTransfer?.setData("text/plain", imageId);

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
}

function handleImageDragOver(
  section: DailyReportWorkSection,
  imageId: string,
  event: DragEvent,
) {
  const dragState = imageDragState.value;

  if (!dragState || dragState.section !== section || dragState.imageId === imageId) {
    return;
  }

  event.preventDefault();

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }

  imageDragOverState.value = {
    section,
    imageId,
    position: getImageDropPosition(event),
  };
}

function handleImageDrop(
  section: DailyReportWorkSection,
  imageId: string,
  event: DragEvent,
) {
  const dragState = imageDragState.value;
  const position = getImageDropPosition(event);
  event.preventDefault();

  if (dragState?.section === section) {
    moveDailyReportImage(section, dragState.imageId, imageId, position);
  }

  imageDragState.value = null;
  imageDragOverState.value = null;
}

function endImageDrag() {
  imageDragState.value = null;
  imageDragOverState.value = null;
}

function getImageCardDragClass(section: DailyReportWorkSection, imageId: string) {
  return {
    "daily-report-write-image-card--dragging":
      imageDragState.value?.section === section && imageDragState.value.imageId === imageId,
    "daily-report-write-image-card--drop-before":
      imageDragOverState.value?.section === section &&
      imageDragOverState.value.imageId === imageId &&
      imageDragOverState.value.position === "before",
    "daily-report-write-image-card--drop-after":
      imageDragOverState.value?.section === section &&
      imageDragOverState.value.imageId === imageId &&
      imageDragOverState.value.position === "after",
  };
}

function waitForHomepageImportFeedback() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, HOMEPAGE_IMPORT_MIN_DURATION_MS);
  });
}

async function handleHomepageDataImport() {
  if (homepageImportStatus.value === "loading") {
    return;
  }

  homepageImportStatus.value = "loading";

  try {
    await Promise.all([
      hydrateDailyReportFromServer(),
      waitForHomepageImportFeedback(),
    ]);
    homepageImportStatus.value = "idle";
  } catch (error) {
    console.error("homepage daily report import failed", error);
    homepageImportStatus.value = "error";
  }
}

function addDailyReportLaborWorkType() {
  laborWorkTypes.value = [
    ...laborWorkTypes.value,
    createDailyReportLaborWorkTypeDraft(),
  ];
}

function removeDailyReportLaborWorkType(workTypeId: string) {
  clearLaborWorkTypeSuggestionCloseTimer(workTypeId);
  laborWorkTypes.value = ensureDefaultLaborWorkTypes(
    laborWorkTypes.value.filter((workType) => workType.id !== workTypeId),
  );
}

function addDailyReportLaborSubWork(workType: DailyReportLaborWorkTypeDraft) {
  workType.subWorks.push(createDailyReportLaborSubWorkDraft());
}

function removeDailyReportLaborSubWork(
  workType: DailyReportLaborWorkTypeDraft,
  subWorkId: string,
) {
  workType.subWorks = workType.subWorks.filter((subWork) => subWork.id !== subWorkId);
}

function getDailyReportResourceRows(tabId: DailyReportResourceTabId) {
  if (tabId === "material") {
    return materialRows.value;
  }

  return equipmentRows.value;
}

function addDailyReportResourceRow(tabId: DailyReportResourceTabId) {
  getDailyReportResourceRows(tabId).push(createDailyReportResourceDraft());
}

function removeDailyReportResourceRow(tabId: DailyReportResourceTabId, rowId: string) {
  const rows = getDailyReportResourceRows(tabId);
  const nextRows = rows.filter((row) => row.id !== rowId);

  if (tabId === "material") {
    materialRows.value = nextRows;
    return;
  }

  equipmentRows.value = nextRows;
}

function updateDailyReportResourceValue(
  row: DailyReportResourceDraft,
  key: DailyReportResourceColumnKey,
  event: Event,
) {
  const input = event.target as HTMLInputElement | null;
  row[key] = input?.value ?? "";
}

function getLaborWorkTypeSuggestionState(workTypeId: string) {
  return laborWorkTypeSuggestionStates.value[workTypeId] ?? createSuggestionState();
}

function ensureLaborWorkTypeSuggestionState(workTypeId: string) {
  const currentState = laborWorkTypeSuggestionStates.value[workTypeId];

  if (currentState) {
    return currentState;
  }

  const nextState = createSuggestionState();

  laborWorkTypeSuggestionStates.value = {
    ...laborWorkTypeSuggestionStates.value,
    [workTypeId]: nextState,
  };

  return nextState;
}

function clearLaborWorkTypeSuggestionCloseTimer(workTypeId: string) {
  const state = laborWorkTypeSuggestionStates.value[workTypeId];

  if (state?.closeTimer) {
    clearTimeout(state.closeTimer);
    state.closeTimer = null;
  }
}

function clearLaborWorkTypeSuggestions(workTypeId: string) {
  const state = ensureLaborWorkTypeSuggestionState(workTypeId);
  state.suggestions = [];
  state.errorMessage = "";
  state.isLoading = false;
  state.isOpen = false;
  state.highlightedIndex = -1;
}

async function loadLaborWorkTypeSuggestions(
  workType: DailyReportLaborWorkTypeDraft,
) {
  const query = workType.workTypeName.trim();
  const state = ensureLaborWorkTypeSuggestionState(workType.id);
  const requestId = state.requestId + 1;
  state.requestId = requestId;

  if (!query) {
    clearLaborWorkTypeSuggestions(workType.id);
    return;
  }

  state.isLoading = true;
  state.errorMessage = "";
  state.isOpen = true;

  try {
    const suggestions =
      await materialInspectionRequestApi.getWorkTypeListByName(query);

    if (state.requestId !== requestId) {
      return;
    }

    state.suggestions = suggestions;
    state.highlightedIndex = suggestions.length > 0 ? 0 : -1;
  } catch (error) {
    if (state.requestId !== requestId) {
      return;
    }

    state.suggestions = [];
    state.highlightedIndex = -1;
    state.errorMessage =
      error instanceof Error ? error.message : "공종명을 불러오지 못했습니다.";
  } finally {
    if (state.requestId === requestId) {
      state.isLoading = false;
    }
  }
}

function handleLaborWorkTypeNameInput(
  workType: DailyReportLaborWorkTypeDraft,
  event: Event,
) {
  const input = event.target as HTMLInputElement | null;
  workType.workTypeName = input?.value ?? "";
  workType.workTypeId = null;
  void loadLaborWorkTypeSuggestions(workType);
}

function setLaborWorkTypeHighlightedIndex(
  workTypeId: string,
  index: number,
) {
  const state = ensureLaborWorkTypeSuggestionState(workTypeId);
  state.highlightedIndex = Math.min(
    Math.max(index, -1),
    state.suggestions.length - 1,
  );
}

function handleLaborWorkTypeKeydown(
  workType: DailyReportLaborWorkTypeDraft,
  event: KeyboardEvent,
) {
  const state = ensureLaborWorkTypeSuggestionState(workType.id);
  const suggestionCount = state.suggestions.length;

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    clearLaborWorkTypeSuggestionCloseTimer(workType.id);

    if (workType.workTypeName.trim()) {
      state.isOpen = true;
    }

    if (suggestionCount === 0) {
      return;
    }

    const offset = event.key === "ArrowDown" ? 1 : -1;
    const baseIndex =
      state.highlightedIndex >= 0
        ? state.highlightedIndex
        : event.key === "ArrowDown"
          ? -1
          : 0;
    state.highlightedIndex = (baseIndex + offset + suggestionCount) % suggestionCount;
    return;
  }

  if (event.key === "Enter" && !event.isComposing) {
    if (!state.isOpen || suggestionCount === 0) {
      return;
    }

    event.preventDefault();
    const selectedIndex =
      state.highlightedIndex >= 0 && state.highlightedIndex < suggestionCount
        ? state.highlightedIndex
        : 0;
    const suggestion = state.suggestions[selectedIndex];

    if (suggestion) {
      selectLaborWorkTypeSuggestion(workType, suggestion);
    }
    return;
  }

  if (event.key === "Escape" && state.isOpen) {
    event.preventDefault();
    state.isOpen = false;
    state.highlightedIndex = -1;
  }
}

function openLaborWorkTypeSuggestionList(
  workType: DailyReportLaborWorkTypeDraft,
) {
  clearLaborWorkTypeSuggestionCloseTimer(workType.id);

  const state = ensureLaborWorkTypeSuggestionState(workType.id);
  const query = workType.workTypeName.trim();

  if (!query) {
    return;
  }

  state.isOpen = true;
  state.highlightedIndex =
    state.highlightedIndex >= 0
      ? state.highlightedIndex
      : state.suggestions.length > 0
        ? 0
        : -1;

  if (!state.isLoading && state.suggestions.length === 0) {
    void loadLaborWorkTypeSuggestions(workType);
  }
}

function scheduleCloseLaborWorkTypeSuggestionList(workTypeId: string) {
  clearLaborWorkTypeSuggestionCloseTimer(workTypeId);
  const state = ensureLaborWorkTypeSuggestionState(workTypeId);
  state.closeTimer = setTimeout(() => {
    state.isOpen = false;
    state.closeTimer = null;
  }, 120);
}

function selectLaborWorkTypeSuggestion(
  workType: DailyReportLaborWorkTypeDraft,
  suggestion: WorkTypeReferenceResponse,
) {
  clearLaborWorkTypeSuggestionCloseTimer(workType.id);
  const state = ensureLaborWorkTypeSuggestionState(workType.id);
  state.requestId += 1;
  workType.workTypeId = suggestion.id;
  workType.workTypeName = suggestion.name;
  state.suggestions = [];
  state.errorMessage = "";
  state.isOpen = false;
  state.highlightedIndex = -1;
}

function handleDailyReportSave() {
  homepageImportStatus.value = "idle";
}

function buildWorkTypeDraftsFromResponses(
  responses: ActualWorkResponse[],
): DailyReportWorkTypeDraft[] {
  const groupOrder: number[] = [];
  const groups = new Map<number, DailyReportWorkTypeDraft>();

  responses.forEach((response) => {
    let group = groups.get(response.workTypeId);

    if (!group) {
      group = {
        id: createDailyReportId(),
        workTypeId: response.workTypeId,
        workTypeName: response.workTypeName,
        tasks: [],
      };
      groups.set(response.workTypeId, group);
      groupOrder.push(response.workTypeId);
    }

    group.tasks.push(createDailyReportTaskFromResponse(response));
  });

  return groupOrder.map((workTypeId) => groups.get(workTypeId)!);
}

async function hydrateDailyReportFromServer() {
  try {
    const [todayResponses, tomorrowResponses] = await Promise.all([
      actualWorkApi.listByDate(reportDates.today),
      actualWorkApi.listByDate(reportDates.tomorrow),
    ]);
    todayWorkTypes.value = ensureDefaultWorkTypes(
      buildWorkTypeDraftsFromResponses(todayResponses),
    );
    tomorrowWorkTypes.value = ensureDefaultWorkTypes(
      buildWorkTypeDraftsFromResponses(tomorrowResponses),
    );
  } catch (error) {
    console.error("hydrate daily report failed", error);
  }
}

onMounted(() => {
  void hydrateDailyReportFromServer();
});

onUnmounted(() => {
  Object.values(workTypeSuggestionStates.value).forEach((state) => {
    if (state.closeTimer) {
      clearTimeout(state.closeTimer);
    }
    state.requestId += 1;
  });
  Object.values(laborWorkTypeSuggestionStates.value).forEach((state) => {
    if (state.closeTimer) {
      clearTimeout(state.closeTimer);
    }
    state.requestId += 1;
  });
});
</script>

<template>
  <div class="daily-report-editor-panel">
  <aside
    class="daily-report-write-panel daily-report-write-panel--with-tabs"
    aria-label="공사일보 작성"
  >
    <nav
      class="daily-report-write-panel__tabs"
      role="tablist"
      aria-label="공사일보 항목"
    >
      <button
        v-for="tab in DAILY_REPORT_EDITOR_TABS"
        :id="`daily-report-tab-${tab.id}`"
        :key="tab.id"
        type="button"
        class="daily-report-write-panel__tab"
        :class="{ 'daily-report-write-panel__tab--active': activeDailyReportTab === tab.id }"
        role="tab"
        :aria-selected="activeDailyReportTab === tab.id"
        :aria-controls="`daily-report-panel-${tab.id}`"
        @click="activeDailyReportTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <div class="daily-report-write-panel__content">
      <div
        v-show="activeDailyReportTab === 'todayWork'"
        id="daily-report-panel-todayWork"
        class="daily-report-tab-panel"
        role="tabpanel"
        aria-labelledby="daily-report-tab-todayWork"
      >
      <section class="daily-report-write-editor">
        <input
          ref="todayImageInputRef"
          class="daily-report-write-editor__file-input"
          type="file"
          accept="image/*"
          multiple
          @change="handleDailyReportImageChange('today', $event)"
        />

        <div class="daily-report-write-work-cell">
          <div class="daily-report-write-work-cell__header">
            <span class="daily-report-write-work-cell__title">오늘작업</span>
            <button
              type="button"
              class="daily-report-worktype-add"
              @click="addDailyReportWorkType('today')"
            >
              + 공종 추가
            </button>
          </div>

          <div class="daily-report-worktype-list">
            <article
              v-for="workType in todayWorkTypes"
              :key="workType.id"
              class="daily-report-worktype-entry"
            >
              <label class="daily-report-worktype-field">
                <span class="daily-report-worktype-field__control">
                  <span class="daily-report-worktype-field__marker" aria-hidden="true" />
                  <span class="daily-report-worktype-field__input-wrap">
                    <input
                      :value="workType.workTypeName"
                      class="daily-report-worktype-field__input"
                      type="text"
                      autocomplete="off"
                      placeholder="공종명을 입력해 주세요."
                      role="combobox"
                      :aria-expanded="getWorkTypeSuggestionState(workType.id).isOpen"
                      aria-autocomplete="list"
                      @input="handleDailyReportWorkTypeNameInput(workType, $event)"
                      @keydown="handleDailyReportWorkTypeKeydown(workType, $event)"
                      @focus="openDailyReportWorkTypeSuggestionList(workType)"
                      @blur="scheduleCloseDailyReportWorkTypeSuggestionList(workType.id)"
                    />
                    <button
                      type="button"
                      class="daily-report-worktype-delete"
                      aria-label="공종 삭제"
                      @click="removeDailyReportWorkType('today', workType.id)"
                    >
                      ×
                    </button>

                    <Transition name="daily-report-typeahead">
                      <div
                        v-if="getWorkTypeSuggestionState(workType.id).isOpen"
                        class="daily-report-typeahead"
                        role="listbox"
                        aria-label="공종명 후보"
                        @mousedown.prevent
                      >
                        <p
                          v-if="getWorkTypeSuggestionState(workType.id).isLoading"
                          class="daily-report-typeahead__state"
                        >
                          불러오는 중
                        </p>
                        <p
                          v-else-if="getWorkTypeSuggestionState(workType.id).errorMessage"
                          class="daily-report-typeahead__state"
                        >
                          {{ getWorkTypeSuggestionState(workType.id).errorMessage }}
                        </p>
                        <template
                          v-else-if="
                            getWorkTypeSuggestionState(workType.id).suggestions.length > 0
                          "
                        >
                          <button
                            v-for="(suggestion, suggestionIndex) in getWorkTypeSuggestionState(
                              workType.id,
                            ).suggestions"
                            :key="suggestion.id"
                            class="daily-report-typeahead__option"
                            :class="{
                              'daily-report-typeahead__option--highlighted':
                                getWorkTypeSuggestionState(workType.id).highlightedIndex ===
                                suggestionIndex,
                            }"
                            type="button"
                            role="option"
                            :aria-selected="
                              getWorkTypeSuggestionState(workType.id).highlightedIndex ===
                              suggestionIndex
                            "
                            @mouseenter="
                              setDailyReportWorkTypeHighlightedIndex(
                                workType.id,
                                suggestionIndex,
                              )
                            "
                            @click="selectDailyReportWorkTypeSuggestion(workType, suggestion)"
                          >
                            {{ suggestion.name }}
                          </button>
                        </template>
                        <p
                          v-else-if="workType.workTypeName.trim() && workType.workTypeId === null"
                          class="daily-report-typeahead__state"
                        >
                          매칭되는 공종명이 없어요
                        </p>
                      </div>
                    </Transition>
                  </span>
                </span>
              </label>

              <button
                type="button"
                class="daily-report-task-add"
                @click="addDailyReportTask(workType)"
              >
                + 작업 사항 추가
              </button>

              <div class="daily-report-task-list">
                <div
                  v-for="task in workType.tasks"
                  :key="task.id"
                  class="daily-report-task-row"
                >
                  <span class="daily-report-task-row__bullet" aria-hidden="true">-</span>
                  <div class="daily-report-task-field">
                    <input
                      v-model="task.text"
                      class="daily-report-task-input"
                      type="text"
                      placeholder="작업 사항을 입력해 주세요."
                      @blur="handleTaskBlur(workType, task)"
                    />
                    <button
                      type="button"
                      class="daily-report-task-delete"
                      aria-label="작업사항 삭제"
                      @click="removeDailyReportTask(workType, task.id)"
                    >
                      ×
                    </button>
                  </div>
                  <span
                    v-if="task.isSyncing"
                    class="daily-report-task-match-label daily-report-task-match-label--syncing"
                  >
                    동기화 중...
                  </span>
                  <span
                    v-else-if="task.matchedWorkName"
                    class="daily-report-task-match-label daily-report-task-match-label--matched"
                  >
                    → {{ task.matchedWorkName }}
                  </span>
                  <span
                    v-else-if="task.hasReceivedResponse && task.text.trim()"
                    class="daily-report-task-match-label daily-report-task-match-label--unmatched"
                  >
                    매칭 없음
                  </span>
                </div>
              </div>
            </article>
          </div>

          <div class="daily-report-write-attachments">
            <TransitionGroup
              v-if="todayImages.length > 0"
              name="daily-report-image-list"
              tag="div"
              class="daily-report-write-image-list"
            >
              <article
                v-for="image in todayImages"
                :key="image.id"
                class="daily-report-write-image-card"
                :class="getImageCardDragClass('today', image.id)"
                draggable="true"
                @dragstart="handleImageDragStart('today', image.id, $event)"
                @dragover="handleImageDragOver('today', image.id, $event)"
                @dragleave="imageDragOverState = null"
                @drop="handleImageDrop('today', image.id, $event)"
                @dragend="endImageDrag"
              >
                <figure
                  class="daily-report-write-image-card__preview"
                  @click="openDailyReportImagePreview(image)"
                >
                  <img
                    class="daily-report-write-image-card__image"
                    :src="image.src"
                    alt=""
                    draggable="false"
                  />
                </figure>
                <textarea
                  v-model="image.description"
                  class="daily-report-write-image-card__description"
                  rows="2"
                  placeholder="설명을 적어주세요."
                />
                <button
                  type="button"
                  class="daily-report-write-image-card__remove"
                  aria-label="이미지 삭제"
                  @click.stop="removeDailyReportImage('today', image.id)"
                >
                  ×
                </button>
              </article>
            </TransitionGroup>

            <button
              type="button"
              class="daily-report-write-attachments__add"
              @click="openImagePicker('today')"
            >
              <span class="daily-report-write-attachments__add-box" aria-hidden="true">
                <img
                  class="daily-report-write-attachments__add-icon"
                  :src="imageIcon"
                  alt=""
                />
              </span>
              <span>이미지 추가</span>
            </button>
          </div>
        </div>
      </section>
      </div>

      <div
        v-show="activeDailyReportTab === 'tomorrowWork'"
        id="daily-report-panel-tomorrowWork"
        class="daily-report-tab-panel"
        role="tabpanel"
        aria-labelledby="daily-report-tab-tomorrowWork"
      >
      <section class="daily-report-write-editor">
        <input
          ref="tomorrowImageInputRef"
          class="daily-report-write-editor__file-input"
          type="file"
          accept="image/*"
          multiple
          @change="handleDailyReportImageChange('tomorrow', $event)"
        />

        <div class="daily-report-write-work-cell">
          <div class="daily-report-write-work-cell__header">
            <span class="daily-report-write-work-cell__title">내일작업</span>
            <button
              type="button"
              class="daily-report-worktype-add"
              @click="addDailyReportWorkType('tomorrow')"
            >
              + 공종 추가
            </button>
          </div>

          <div class="daily-report-worktype-list">
            <article
              v-for="workType in tomorrowWorkTypes"
              :key="workType.id"
              class="daily-report-worktype-entry"
            >
              <label class="daily-report-worktype-field">
                <span class="daily-report-worktype-field__control">
                  <span class="daily-report-worktype-field__marker" aria-hidden="true" />
                  <span class="daily-report-worktype-field__input-wrap">
                    <input
                      :value="workType.workTypeName"
                      class="daily-report-worktype-field__input"
                      type="text"
                      autocomplete="off"
                      placeholder="공종명을 입력해 주세요."
                      role="combobox"
                      :aria-expanded="getWorkTypeSuggestionState(workType.id).isOpen"
                      aria-autocomplete="list"
                      @input="handleDailyReportWorkTypeNameInput(workType, $event)"
                      @keydown="handleDailyReportWorkTypeKeydown(workType, $event)"
                      @focus="openDailyReportWorkTypeSuggestionList(workType)"
                      @blur="scheduleCloseDailyReportWorkTypeSuggestionList(workType.id)"
                    />
                    <button
                      type="button"
                      class="daily-report-worktype-delete"
                      aria-label="공종 삭제"
                      @click="removeDailyReportWorkType('tomorrow', workType.id)"
                    >
                      ×
                    </button>

                    <Transition name="daily-report-typeahead">
                      <div
                        v-if="getWorkTypeSuggestionState(workType.id).isOpen"
                        class="daily-report-typeahead"
                        role="listbox"
                        aria-label="공종명 후보"
                        @mousedown.prevent
                      >
                        <p
                          v-if="getWorkTypeSuggestionState(workType.id).isLoading"
                          class="daily-report-typeahead__state"
                        >
                          불러오는 중
                        </p>
                        <p
                          v-else-if="getWorkTypeSuggestionState(workType.id).errorMessage"
                          class="daily-report-typeahead__state"
                        >
                          {{ getWorkTypeSuggestionState(workType.id).errorMessage }}
                        </p>
                        <template
                          v-else-if="
                            getWorkTypeSuggestionState(workType.id).suggestions.length > 0
                          "
                        >
                          <button
                            v-for="(suggestion, suggestionIndex) in getWorkTypeSuggestionState(
                              workType.id,
                            ).suggestions"
                            :key="suggestion.id"
                            class="daily-report-typeahead__option"
                            :class="{
                              'daily-report-typeahead__option--highlighted':
                                getWorkTypeSuggestionState(workType.id).highlightedIndex ===
                                suggestionIndex,
                            }"
                            type="button"
                            role="option"
                            :aria-selected="
                              getWorkTypeSuggestionState(workType.id).highlightedIndex ===
                              suggestionIndex
                            "
                            @mouseenter="
                              setDailyReportWorkTypeHighlightedIndex(
                                workType.id,
                                suggestionIndex,
                              )
                            "
                            @click="selectDailyReportWorkTypeSuggestion(workType, suggestion)"
                          >
                            {{ suggestion.name }}
                          </button>
                        </template>
                        <p
                          v-else-if="workType.workTypeName.trim() && workType.workTypeId === null"
                          class="daily-report-typeahead__state"
                        >
                          매칭되는 공종명이 없어요
                        </p>
                      </div>
                    </Transition>
                  </span>
                </span>
              </label>

              <button
                type="button"
                class="daily-report-task-add"
                @click="addDailyReportTask(workType)"
              >
                + 작업 사항 추가
              </button>

              <div class="daily-report-task-list">
                <div
                  v-for="task in workType.tasks"
                  :key="task.id"
                  class="daily-report-task-row"
                >
                  <span class="daily-report-task-row__bullet" aria-hidden="true">-</span>
                  <div class="daily-report-task-field">
                    <input
                      v-model="task.text"
                      class="daily-report-task-input"
                      type="text"
                      placeholder="작업 사항을 입력해 주세요."
                      @blur="handleTaskBlur(workType, task)"
                    />
                    <button
                      type="button"
                      class="daily-report-task-delete"
                      aria-label="작업사항 삭제"
                      @click="removeDailyReportTask(workType, task.id)"
                    >
                      ×
                    </button>
                  </div>
                  <span
                    v-if="task.isSyncing"
                    class="daily-report-task-match-label daily-report-task-match-label--syncing"
                  >
                    동기화 중...
                  </span>
                  <span
                    v-else-if="task.matchedWorkName"
                    class="daily-report-task-match-label daily-report-task-match-label--matched"
                  >
                    → {{ task.matchedWorkName }}
                  </span>
                  <span
                    v-else-if="task.hasReceivedResponse && task.text.trim()"
                    class="daily-report-task-match-label daily-report-task-match-label--unmatched"
                  >
                    매칭 없음
                  </span>
                </div>
              </div>
            </article>
          </div>

          <div class="daily-report-write-attachments">
            <TransitionGroup
              v-if="tomorrowImages.length > 0"
              name="daily-report-image-list"
              tag="div"
              class="daily-report-write-image-list"
            >
              <article
                v-for="image in tomorrowImages"
                :key="image.id"
                class="daily-report-write-image-card"
                :class="getImageCardDragClass('tomorrow', image.id)"
                draggable="true"
                @dragstart="handleImageDragStart('tomorrow', image.id, $event)"
                @dragover="handleImageDragOver('tomorrow', image.id, $event)"
                @dragleave="imageDragOverState = null"
                @drop="handleImageDrop('tomorrow', image.id, $event)"
                @dragend="endImageDrag"
              >
                <figure
                  class="daily-report-write-image-card__preview"
                  @click="openDailyReportImagePreview(image)"
                >
                  <img
                    class="daily-report-write-image-card__image"
                    :src="image.src"
                    alt=""
                    draggable="false"
                  />
                </figure>
                <textarea
                  v-model="image.description"
                  class="daily-report-write-image-card__description"
                  rows="2"
                  placeholder="설명을 적어주세요."
                />
                <button
                  type="button"
                  class="daily-report-write-image-card__remove"
                  aria-label="이미지 삭제"
                  @click.stop="removeDailyReportImage('tomorrow', image.id)"
                >
                  ×
                </button>
              </article>
            </TransitionGroup>

            <button
              type="button"
              class="daily-report-write-attachments__add"
              @click="openImagePicker('tomorrow')"
            >
              <span class="daily-report-write-attachments__add-box" aria-hidden="true">
                <img
                  class="daily-report-write-attachments__add-icon"
                  :src="imageIcon"
                  alt=""
                />
              </span>
              <span>이미지 추가</span>
            </button>
          </div>
        </div>
      </section>
      </div>

      <section
        v-show="activeDailyReportTab === 'labor'"
        id="daily-report-panel-labor"
        class="daily-report-resource-panel"
        role="tabpanel"
        aria-labelledby="daily-report-tab-labor"
      >
        <div class="daily-report-write-work-cell daily-report-labor-cell">
          <div class="daily-report-write-work-cell__header">
            <span class="daily-report-write-work-cell__title">인력투입</span>
            <button
              type="button"
              class="daily-report-worktype-add"
              @click="addDailyReportLaborWorkType"
            >
              + 공종 추가
            </button>
          </div>

          <div
            v-if="laborWorkTypes.length > 0"
            class="daily-report-worktype-list"
          >
            <article
              v-for="workType in laborWorkTypes"
              :key="workType.id"
              class="daily-report-worktype-entry daily-report-worktype-entry--static"
            >
              <div class="daily-report-worktype-field">
                <div class="daily-report-worktype-field__control">
                  <span class="daily-report-worktype-field__marker" aria-hidden="true" />
                  <div class="daily-report-worktype-field__input-wrap">
                    <input
                      :value="workType.workTypeName"
                      class="daily-report-worktype-field__input"
                      type="text"
                      autocomplete="off"
                      placeholder="공종명을 입력해 주세요."
                      role="combobox"
                      :aria-expanded="getLaborWorkTypeSuggestionState(workType.id).isOpen"
                      aria-autocomplete="list"
                      @input="handleLaborWorkTypeNameInput(workType, $event)"
                      @keydown="handleLaborWorkTypeKeydown(workType, $event)"
                      @focus="openLaborWorkTypeSuggestionList(workType)"
                      @blur="scheduleCloseLaborWorkTypeSuggestionList(workType.id)"
                    />
                    <button
                      type="button"
                      class="daily-report-worktype-delete"
                      aria-label="공종 삭제"
                      @click="removeDailyReportLaborWorkType(workType.id)"
                    >
                      ×
                    </button>

                    <Transition name="daily-report-typeahead">
                      <div
                        v-if="getLaborWorkTypeSuggestionState(workType.id).isOpen"
                        class="daily-report-typeahead"
                        role="listbox"
                        aria-label="공종명 후보"
                        @mousedown.prevent
                      >
                        <p
                          v-if="getLaborWorkTypeSuggestionState(workType.id).isLoading"
                          class="daily-report-typeahead__state"
                        >
                          불러오는 중
                        </p>
                        <p
                          v-else-if="getLaborWorkTypeSuggestionState(workType.id).errorMessage"
                          class="daily-report-typeahead__state"
                        >
                          {{ getLaborWorkTypeSuggestionState(workType.id).errorMessage }}
                        </p>
                        <template
                          v-else-if="
                            getLaborWorkTypeSuggestionState(workType.id).suggestions.length > 0
                          "
                        >
                          <button
                            v-for="(suggestion, suggestionIndex) in getLaborWorkTypeSuggestionState(
                              workType.id,
                            ).suggestions"
                            :key="suggestion.id"
                            class="daily-report-typeahead__option"
                            :class="{
                              'daily-report-typeahead__option--highlighted':
                                getLaborWorkTypeSuggestionState(workType.id).highlightedIndex ===
                                suggestionIndex,
                            }"
                            type="button"
                            role="option"
                            :aria-selected="
                              getLaborWorkTypeSuggestionState(workType.id).highlightedIndex ===
                              suggestionIndex
                            "
                            @mouseenter="
                              setLaborWorkTypeHighlightedIndex(
                                workType.id,
                                suggestionIndex,
                              )
                            "
                            @click="selectLaborWorkTypeSuggestion(workType, suggestion)"
                          >
                            {{ suggestion.name }}
                          </button>
                        </template>
                        <p
                          v-else-if="workType.workTypeName.trim() && workType.workTypeId === null"
                          class="daily-report-typeahead__state"
                        >
                          매칭되는 공종명이 없어요
                        </p>
                      </div>
                    </Transition>
                  </div>
                </div>
              </div>

              <button
                type="button"
                class="daily-report-task-add"
                @click="addDailyReportLaborSubWork(workType)"
              >
                + 직종 추가
              </button>

              <div class="daily-report-task-list daily-report-labor-subwork-list">
                <div
                  v-for="subWork in workType.subWorks"
                  :key="subWork.id"
                  class="daily-report-task-row daily-report-labor-subwork-row"
                >
                  <span class="daily-report-task-row__bullet" aria-hidden="true">-</span>
                  <div class="daily-report-labor-subwork-field">
                    <input
                      v-model="subWork.name"
                      class="daily-report-task-input daily-report-labor-subwork-input"
                      type="text"
                      placeholder="직종명"
                    />
                    <input
                      v-model="subWork.quantity"
                      class="daily-report-task-input daily-report-labor-quantity-input"
                      inputmode="numeric"
                      type="text"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      class="daily-report-task-delete daily-report-labor-subwork-delete"
                      aria-label="직종 삭제"
                      @click="removeDailyReportLaborSubWork(workType, subWork.id)"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section
        v-for="resourceTab in DAILY_REPORT_RESOURCE_TABS"
        v-show="activeDailyReportTab === resourceTab.id"
        :id="`daily-report-panel-${resourceTab.id}`"
        :key="resourceTab.id"
        class="daily-report-resource-panel"
        role="tabpanel"
        :aria-labelledby="`daily-report-tab-${resourceTab.id}`"
      >
        <div
          class="daily-report-resource-table"
          :class="`daily-report-resource-table--${resourceTab.id}`"
        >
          <div class="daily-report-resource-table__header">
            <h2 class="daily-report-resource-table__title">
              {{ resourceTab.label }}
            </h2>
            <button
              type="button"
              class="daily-report-resource-add"
              @click="addDailyReportResourceRow(resourceTab.id)"
            >
              + {{ resourceTab.addLabel }}
            </button>
          </div>

          <div
            v-for="row in getDailyReportResourceRows(resourceTab.id)"
            :key="row.id"
            class="daily-report-resource-table__row"
          >
            <input
              v-for="column in resourceTab.columns"
              :key="column.key"
              class="daily-report-resource-table__input"
              :inputmode="column.inputMode ?? 'text'"
              :placeholder="column.placeholder"
              :value="row[column.key]"
              @input="updateDailyReportResourceValue(row, column.key, $event)"
            />
            <button
              type="button"
              class="daily-report-resource-table__delete"
              :aria-label="`${resourceTab.label} 항목 삭제`"
              @click="removeDailyReportResourceRow(resourceTab.id, row.id)"
            >
              ×
            </button>
          </div>
        </div>
      </section>
    </div>

    <footer class="daily-report-write-save-bar">
      <button
        type="button"
        class="daily-report-write-import-button"
        :disabled="homepageImportStatus === 'loading'"
        @click="handleHomepageDataImport"
      >
        {{ homepageImportStatus === "loading" ? "홈페이지 자료 불러오는 중" : "홈페이지 자료 불러오기" }}
      </button>
      <button
        type="button"
        class="daily-report-write-save-button"
        @click="handleDailyReportSave"
      >
        생성하기
      </button>
    </footer>

    <Transition name="daily-report-homepage-import-overlay">
      <div
        v-if="homepageImportStatus === 'loading'"
        class="daily-report-homepage-import-overlay"
        role="status"
        aria-live="polite"
      >
        <div class="daily-report-homepage-import-overlay__card">
          <span
            class="daily-report-homepage-import-overlay__indicator"
            aria-hidden="true"
          />
          <span>홈페이지 자료를 가져오고 있어요.</span>
        </div>
      </div>
    </Transition>
  </aside>

  <Transition name="daily-report-image-preview">
    <div
      v-if="previewImage"
      class="daily-report-image-preview"
      role="presentation"
      @click.self="closeDailyReportImagePreview"
    >
      <section
        class="daily-report-image-preview__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="이미지 크게 보기"
      >
        <button
          type="button"
          class="daily-report-image-preview__close"
          aria-label="닫기"
          @click="closeDailyReportImagePreview"
        >
          ×
        </button>
        <img
          class="daily-report-image-preview__image"
          :src="previewImage.src"
          alt=""
        />
        <p
          v-if="previewImage.description"
          class="daily-report-image-preview__description"
        >
          {{ previewImage.description }}
        </p>
      </section>
    </div>
  </Transition>
  </div>
</template>

<style scoped>
.daily-report-editor-panel {
  display: flex;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  overflow: hidden;
}

.daily-report-editor-panel :deep(.daily-report-write-panel) {
  flex: 1 1 auto;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  overflow: hidden;
}

.daily-report-editor-panel :deep(.daily-report-write-panel__content) {
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}
</style>

<style scoped src="../styles/DailyReportWritePage.css"></style>
