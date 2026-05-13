<script setup lang="ts">
import { ref } from "vue";

import imageIcon from "@fluentui/svg-icons/icons/image_20_regular.svg";

import { materialInspectionRequestApi } from "@/features/document-conversion-demo/api/material-inspection-request.api";
import type { WorkTypeReferenceResponse } from "@/features/document-conversion-demo/api/material-inspection-request-api.types";
import {
  resolveDailyReportHomepageImportConfig,
  toDemoDataUrl,
  type DailyReportHomepagePayload,
  type DailyReportHomepageWorkSection,
} from "@/features/document-conversion-demo/data/daily-report-homepage-demo.seed";
import { useServicePresentationDemoViewModel } from "@/features/service-presentation-demo/state/useServicePresentationDemoViewModel";

const DAILY_REPORT_DRAFT_STORAGE_KEY = "conelp.dailyReportWrite.draft.v2";
const HOMEPAGE_IMPORT_MIN_DURATION_MS = 2500;

type DailyReportWorkSection = "today" | "tomorrow";
type DailyReportEditorTabId = "todayWork" | "tomorrowWork" | "labor" | "material" | "equipment";
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

type DailyReportResourceDraft = {
  id: string;
  name: string;
  detail: string;
  quantity: string;
  note: string;
  source?: "manual" | "homepage";
};

type DailyReportLaborSubWorkDraft = {
  id: string;
  name: string;
  quantity: string;
  source?: "manual" | "homepage";
};

type DailyReportLaborWorkTypeDraft = {
  id: string;
  workTypeId: number | null;
  workTypeName: string;
  subWorks: DailyReportLaborSubWorkDraft[];
  source?: "manual" | "homepage";
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

type DailyReportImageDraft = {
  id: string;
  src: string;
  description: string;
  source?: "manual" | "homepage";
};

type DailyReportImageDropPosition = "before" | "after";

type DailyReportImageDragState = {
  section: DailyReportWorkSection;
  imageId: string;
};

type DailyReportImageDragOverState = DailyReportImageDragState & {
  position: DailyReportImageDropPosition;
};

type DailyReportWorkTypeDragState = {
  section: DailyReportWorkSection;
  workTypeId: string;
};

type DailyReportWorkTypeDragOverState = DailyReportWorkTypeDragState & {
  position: DailyReportImageDropPosition;
};

type DailyReportTaskDraft = {
  id: string;
  text: string;
};

type DailyReportWorkTypeDraft = {
  id: string;
  workTypeId: number | null;
  workTypeName: string;
  tasks: DailyReportTaskDraft[];
  source?: "manual" | "homepage";
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

type DailyReportDraft = {
  todayWork?: string;
  tomorrowWork?: string;
  todayWorkTypes: DailyReportWorkTypeDraft[];
  tomorrowWorkTypes: DailyReportWorkTypeDraft[];
  todayImages: DailyReportImageDraft[];
  tomorrowImages: DailyReportImageDraft[];
  laborWorkTypes: DailyReportLaborWorkTypeDraft[];
  laborRows?: DailyReportResourceDraft[];
  materialRows: DailyReportResourceDraft[];
  equipmentRows: DailyReportResourceDraft[];
};

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createDailyReportImageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `daily-report-image-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createDailyReportTask(text = ""): DailyReportTaskDraft {
  return {
    id: createDailyReportImageId(),
    text,
  };
}

function createDailyReportWorkTypeDraft(taskText = ""): DailyReportWorkTypeDraft {
  return {
    id: createDailyReportImageId(),
    workTypeId: null,
    workTypeName: "",
    tasks: [createDailyReportTask(taskText)],
    source: "manual",
  };
}

function createDailyReportLaborSubWorkDraft(
  name = "",
  quantity = "",
): DailyReportLaborSubWorkDraft {
  return {
    id: createDailyReportImageId(),
    name,
    quantity,
    source: "manual",
  };
}

function createDailyReportLaborWorkTypeDraft(
  subWorkName = "",
  quantity = "",
): DailyReportLaborWorkTypeDraft {
  return {
    id: createDailyReportImageId(),
    workTypeId: null,
    workTypeName: "",
    subWorks: [createDailyReportLaborSubWorkDraft(subWorkName, quantity)],
    source: "manual",
  };
}

function createDailyReportResourceDraft(): DailyReportResourceDraft {
  return {
    id: createDailyReportImageId(),
    name: "",
    detail: "",
    quantity: "",
    note: "",
    source: "manual",
  };
}

function normalizeDailyReportLaborSubWorks(value: unknown): DailyReportLaborSubWorkDraft[] {
  if (!Array.isArray(value)) {
    return [createDailyReportLaborSubWorkDraft()];
  }

  const subWorks = value
    .filter(
      (subWork): subWork is Partial<DailyReportLaborSubWorkDraft> =>
        typeof subWork === "object" && subWork !== null,
    )
    .map((subWork) => ({
      id:
        typeof subWork.id === "string" && subWork.id
          ? subWork.id
          : createDailyReportImageId(),
      name: typeof subWork.name === "string" ? subWork.name : "",
      quantity: typeof subWork.quantity === "string" ? subWork.quantity : "",
      source: (subWork.source === "homepage"
        ? "homepage"
        : "manual") as DailyReportLaborSubWorkDraft["source"],
    }));

  return subWorks.length > 0 ? subWorks : [createDailyReportLaborSubWorkDraft()];
}

function normalizeLegacyLaborRows(value: unknown): DailyReportLaborWorkTypeDraft[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (row): row is Partial<DailyReportResourceDraft> =>
        typeof row === "object" && row !== null,
    )
    .map((row) => ({
      id: typeof row.id === "string" && row.id ? row.id : createDailyReportImageId(),
      workTypeId: null,
      workTypeName: typeof row.name === "string" ? row.name : "",
      subWorks: [
        createDailyReportLaborSubWorkDraft(
          typeof row.detail === "string" ? row.detail : "",
          typeof row.quantity === "string" ? row.quantity : "",
        ),
      ],
      source: (row.source === "homepage"
        ? "homepage"
        : "manual") as DailyReportLaborWorkTypeDraft["source"],
    }))
    .filter(
      (workType) =>
        workType.workTypeName.trim() ||
        workType.subWorks.some(
          (subWork) => subWork.name.trim() || subWork.quantity.trim(),
        ),
    );
}

function normalizeDailyReportLaborWorkTypes(
  value: unknown,
  legacyRows?: unknown,
): DailyReportLaborWorkTypeDraft[] {
  if (!Array.isArray(value)) {
    return normalizeLegacyLaborRows(legacyRows);
  }

  return value
    .filter(
      (workType): workType is Partial<DailyReportLaborWorkTypeDraft> =>
        typeof workType === "object" && workType !== null,
    )
    .map((workType) => ({
      id:
        typeof workType.id === "string" && workType.id
          ? workType.id
          : createDailyReportImageId(),
      workTypeId:
        typeof workType.workTypeId === "number" && Number.isFinite(workType.workTypeId)
          ? workType.workTypeId
          : null,
      workTypeName: typeof workType.workTypeName === "string" ? workType.workTypeName : "",
      subWorks: normalizeDailyReportLaborSubWorks(workType.subWorks),
      source: (workType.source === "homepage"
        ? "homepage"
        : "manual") as DailyReportLaborWorkTypeDraft["source"],
    }));
}

function normalizeDailyReportResourceRows(value: unknown): DailyReportResourceDraft[] {
  if (!Array.isArray(value)) {
    return [createDailyReportResourceDraft()];
  }

  const rows = value
    .filter(
      (row): row is Partial<DailyReportResourceDraft> =>
        typeof row === "object" && row !== null,
    )
    .map((row) => ({
      id: typeof row.id === "string" && row.id ? row.id : createDailyReportImageId(),
      name: typeof row.name === "string" ? row.name : "",
      detail: typeof row.detail === "string" ? row.detail : "",
      quantity: typeof row.quantity === "string" ? row.quantity : "",
      note: typeof row.note === "string" ? row.note : "",
      source: (row.source === "homepage"
        ? "homepage"
        : "manual") as DailyReportResourceDraft["source"],
    }));

  return rows.length > 0 ? rows : [createDailyReportResourceDraft()];
}

function normalizeDailyReportImages(value: unknown): DailyReportImageDraft[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (image): image is Partial<DailyReportImageDraft> =>
        typeof image === "object" && image !== null,
    )
    .map((image) => ({
      id: typeof image.id === "string" && image.id ? image.id : createDailyReportImageId(),
      src: typeof image.src === "string" ? image.src : "",
      description: typeof image.description === "string" ? image.description : "",
      source: (image.source === "homepage" ? "homepage" : "manual") as DailyReportImageDraft["source"],
    }))
    .filter((image) => image.src);
}

function normalizeDailyReportTasks(value: unknown): DailyReportTaskDraft[] {
  if (!Array.isArray(value)) {
    return [createDailyReportTask()];
  }

  const tasks = value
    .filter(
      (task): task is Partial<DailyReportTaskDraft> =>
        typeof task === "object" && task !== null,
    )
    .map((task) => ({
      id: typeof task.id === "string" && task.id ? task.id : createDailyReportImageId(),
      text: typeof task.text === "string" ? task.text : "",
    }));

  return tasks.length > 0 ? tasks : [createDailyReportTask()];
}

function normalizeDailyReportWorkTypes(
  value: unknown,
  legacyText?: string,
): DailyReportWorkTypeDraft[] {
  if (Array.isArray(value)) {
    return value
      .filter(
        (workType): workType is Partial<DailyReportWorkTypeDraft> =>
          typeof workType === "object" && workType !== null,
      )
      .map((workType) => ({
        id:
          typeof workType.id === "string" && workType.id
            ? workType.id
            : createDailyReportImageId(),
        workTypeId:
          typeof workType.workTypeId === "number" && Number.isFinite(workType.workTypeId)
            ? workType.workTypeId
            : null,
        workTypeName: typeof workType.workTypeName === "string" ? workType.workTypeName : "",
        tasks: normalizeDailyReportTasks(workType.tasks),
        source: workType.source === "homepage" ? "homepage" : "manual",
      }));
  }

  const trimmedLegacyText = legacyText?.trim();
  return trimmedLegacyText ? [createDailyReportWorkTypeDraft(trimmedLegacyText)] : [];
}

function readStoredDailyReportDraft(): DailyReportDraft {
  if (typeof window === "undefined") {
    return {
      todayWorkTypes: [],
      tomorrowWorkTypes: [],
      todayImages: [],
      tomorrowImages: [],
      laborWorkTypes: [],
      materialRows: [createDailyReportResourceDraft()],
      equipmentRows: [createDailyReportResourceDraft()],
    };
  }

  try {
    const storedValue = window.localStorage.getItem(DAILY_REPORT_DRAFT_STORAGE_KEY);
    const parsedValue = storedValue ? (JSON.parse(storedValue) as Partial<DailyReportDraft>) : {};

    return {
      todayWorkTypes: normalizeDailyReportWorkTypes(
        parsedValue.todayWorkTypes,
        parsedValue.todayWork,
      ),
      tomorrowWorkTypes: normalizeDailyReportWorkTypes(
        parsedValue.tomorrowWorkTypes,
        parsedValue.tomorrowWork,
      ),
      todayImages: normalizeDailyReportImages(parsedValue.todayImages),
      tomorrowImages: normalizeDailyReportImages(parsedValue.tomorrowImages),
      laborWorkTypes: normalizeDailyReportLaborWorkTypes(
        parsedValue.laborWorkTypes,
        parsedValue.laborRows,
      ),
      materialRows: normalizeDailyReportResourceRows(parsedValue.materialRows),
      equipmentRows: normalizeDailyReportResourceRows(parsedValue.equipmentRows),
    };
  } catch {
    return {
      todayWorkTypes: [],
      tomorrowWorkTypes: [],
      todayImages: [],
      tomorrowImages: [],
      laborWorkTypes: [],
      materialRows: [createDailyReportResourceDraft()],
      equipmentRows: [createDailyReportResourceDraft()],
    };
  }
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

function waitForHomepageImportDemo() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, HOMEPAGE_IMPORT_MIN_DURATION_MS);
  });
}

const { selectedSite } = useServicePresentationDemoViewModel();
const todayImageInputRef = ref<HTMLInputElement | null>(null);
const tomorrowImageInputRef = ref<HTMLInputElement | null>(null);
const workTypeDragState = ref<DailyReportWorkTypeDragState | null>(null);
const workTypeDragOverState = ref<DailyReportWorkTypeDragOverState | null>(null);
const imageDragState = ref<DailyReportImageDragState | null>(null);
const imageDragOverState = ref<DailyReportImageDragOverState | null>(null);
const previewImage = ref<DailyReportImageDraft | null>(null);
const workTypeSuggestionStates = ref<Record<string, DailyReportWorkTypeSuggestionState>>({});
const laborWorkTypeSuggestionStates = ref<Record<string, DailyReportWorkTypeSuggestionState>>({});
const activeDailyReportTab = ref<DailyReportEditorTabId>("todayWork");
const dailyReportDraft = readStoredDailyReportDraft();
const todayWorkTypes = ref<DailyReportWorkTypeDraft[]>(dailyReportDraft.todayWorkTypes);
const tomorrowWorkTypes = ref<DailyReportWorkTypeDraft[]>(dailyReportDraft.tomorrowWorkTypes);
const todayImages = ref<DailyReportImageDraft[]>(dailyReportDraft.todayImages);
const tomorrowImages = ref<DailyReportImageDraft[]>(dailyReportDraft.tomorrowImages);
const laborWorkTypes = ref<DailyReportLaborWorkTypeDraft[]>(dailyReportDraft.laborWorkTypes);
const materialRows = ref<DailyReportResourceDraft[]>(dailyReportDraft.materialRows);
const equipmentRows = ref<DailyReportResourceDraft[]>(dailyReportDraft.equipmentRows);
const homepageImportStatus = ref<"idle" | "loading" | "error">("idle");

function persistDailyReportDraft() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    DAILY_REPORT_DRAFT_STORAGE_KEY,
    JSON.stringify({
      todayWorkTypes: todayWorkTypes.value.filter(
        (workType) => workType.source !== "homepage",
      ),
      tomorrowWorkTypes: tomorrowWorkTypes.value.filter(
        (workType) => workType.source !== "homepage",
      ),
      todayImages: todayImages.value.filter((image) => image.source !== "homepage"),
      tomorrowImages: tomorrowImages.value.filter((image) => image.source !== "homepage"),
      laborWorkTypes: laborWorkTypes.value.filter(
        (workType) => workType.source !== "homepage",
      ),
      materialRows: materialRows.value.filter((row) => row.source !== "homepage"),
      equipmentRows: equipmentRows.value.filter((row) => row.source !== "homepage"),
    }),
  );
}

function createWorkTypesFromHomepageSections(
  sections: DailyReportHomepageWorkSection[] | undefined,
) {
  return (sections ?? [])
    .filter((section) => section.name.trim() || section.items.some((item) => item.trim()))
    .map((section) => ({
      id: createDailyReportImageId(),
      workTypeId: null,
      workTypeName: section.name,
      source: "homepage" as const,
      tasks:
        section.items.length > 0
          ? section.items.map((item) => createDailyReportTask(item))
          : [createDailyReportTask()],
    }));
}

function getWorkTypeSignature(workType: DailyReportWorkTypeDraft) {
  return JSON.stringify({
    workTypeName: workType.workTypeName.trim(),
    tasks: workType.tasks.map((task) => task.text.trim()).filter(Boolean),
  });
}

function mergeWorkTypes(
  currentWorkTypes: DailyReportWorkTypeDraft[],
  incomingWorkTypes: DailyReportWorkTypeDraft[],
) {
  const existingSignatures = new Set(currentWorkTypes.map(getWorkTypeSignature));

  return [
    ...currentWorkTypes,
    ...incomingWorkTypes.filter((workType) => {
      const signature = getWorkTypeSignature(workType);

      if (existingSignatures.has(signature)) {
        return false;
      }

      existingSignatures.add(signature);
      return true;
    }),
  ];
}

function mergeImages(
  currentImages: DailyReportImageDraft[],
  incomingImages: DailyReportImageDraft[],
) {
  const existingSources = new Set(currentImages.map((image) => image.src));

  return [
    ...currentImages,
    ...incomingImages.filter((image) => {
      if (existingSources.has(image.src)) {
        return false;
      }

      existingSources.add(image.src);
      return true;
    }),
  ];
}

async function handleHomepageDataImport() {
  const config = resolveDailyReportHomepageImportConfig(selectedSite.value?.siteId);

  if (!config) {
    homepageImportStatus.value = "error";
    return;
  }

  homepageImportStatus.value = "loading";

  try {
    const [response] = await Promise.all([
      fetch(toDemoDataUrl(config.jsonPath)),
      waitForHomepageImportDemo(),
    ]);

    if (!response.ok) {
      throw new Error("홈페이지 작업일보 JSON을 불러오지 못했습니다.");
    }

    const payload = (await response.json()) as DailyReportHomepagePayload;
    const todayImportedWorkTypes = createWorkTypesFromHomepageSections(
      payload.normalized?.today?.sections,
    );
    const tomorrowImportedWorkTypes = createWorkTypesFromHomepageSections(
      payload.normalized?.tomorrow?.sections,
    );
    const importedImages = (payload.normalized?.photos ?? []).map((photo) => ({
      id: createDailyReportImageId(),
      src: toDemoDataUrl(`${config.photoFolderPath}/${photo.filename}`),
      description: photo.caption,
      source: "homepage" as const,
    }));

    todayWorkTypes.value = mergeWorkTypes(todayWorkTypes.value, todayImportedWorkTypes);
    tomorrowWorkTypes.value = mergeWorkTypes(tomorrowWorkTypes.value, tomorrowImportedWorkTypes);
    todayImages.value = mergeImages(todayImages.value, importedImages);
    persistDailyReportDraft();
    homepageImportStatus.value = "idle";
  } catch (error) {
    console.error(error);
    homepageImportStatus.value = "error";
  }
}

function getImageInputRef(section: DailyReportWorkSection) {
  return section === "today" ? todayImageInputRef.value : tomorrowImageInputRef.value;
}

function getWorkTypeDrafts(section: DailyReportWorkSection) {
  return section === "today" ? todayWorkTypes.value : tomorrowWorkTypes.value;
}

function setWorkTypeDrafts(
  section: DailyReportWorkSection,
  workTypes: DailyReportWorkTypeDraft[],
) {
  if (section === "today") {
    todayWorkTypes.value = workTypes;
    return;
  }

  tomorrowWorkTypes.value = workTypes;
}

function addDailyReportWorkType(section: DailyReportWorkSection) {
  setWorkTypeDrafts(section, [
    ...getWorkTypeDrafts(section),
    createDailyReportWorkTypeDraft(),
  ]);
}

function removeDailyReportWorkType(section: DailyReportWorkSection, workTypeId: string) {
  clearWorkTypeSuggestionCloseTimer(workTypeId);
  setWorkTypeDrafts(
    section,
    getWorkTypeDrafts(section).filter((workType) => workType.id !== workTypeId),
  );
}

function moveDailyReportWorkType(
  section: DailyReportWorkSection,
  sourceWorkTypeId: string,
  targetWorkTypeId: string,
  position: DailyReportImageDropPosition,
) {
  if (sourceWorkTypeId === targetWorkTypeId) {
    return;
  }

  const workTypes = getWorkTypeDrafts(section);
  const sourceIndex = workTypes.findIndex((workType) => workType.id === sourceWorkTypeId);
  const targetIndex = workTypes.findIndex((workType) => workType.id === targetWorkTypeId);

  if (sourceIndex < 0 || targetIndex < 0) {
    return;
  }

  const nextWorkTypes = [...workTypes];
  const [movedWorkType] = nextWorkTypes.splice(sourceIndex, 1);

  if (!movedWorkType) {
    return;
  }

  const adjustedTargetIndex = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
  const insertIndex = position === "after" ? adjustedTargetIndex + 1 : adjustedTargetIndex;
  nextWorkTypes.splice(insertIndex, 0, movedWorkType);
  setWorkTypeDrafts(section, nextWorkTypes);
}

function handleWorkTypeDragStart(
  section: DailyReportWorkSection,
  workTypeId: string,
  event: DragEvent,
) {
  const target = event.target;

  if (target instanceof HTMLElement && target.closest("button, input, textarea")) {
    event.preventDefault();
    return;
  }

  workTypeDragState.value = { section, workTypeId };
  workTypeDragOverState.value = null;
  event.dataTransfer?.setData("text/plain", workTypeId);

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
}

function handleWorkTypeDragOver(
  section: DailyReportWorkSection,
  workTypeId: string,
  event: DragEvent,
) {
  const dragState = workTypeDragState.value;

  if (!dragState || dragState.section !== section || dragState.workTypeId === workTypeId) {
    return;
  }

  event.preventDefault();

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }

  workTypeDragOverState.value = {
    section,
    workTypeId,
    position: getBlockDropPosition(event),
  };
}

function handleWorkTypeDrop(
  section: DailyReportWorkSection,
  workTypeId: string,
  event: DragEvent,
) {
  const dragState = workTypeDragState.value;
  const position = getBlockDropPosition(event);
  event.preventDefault();

  if (dragState?.section === section) {
    moveDailyReportWorkType(section, dragState.workTypeId, workTypeId, position);
  }

  workTypeDragState.value = null;
  workTypeDragOverState.value = null;
}

function endWorkTypeDrag() {
  workTypeDragState.value = null;
  workTypeDragOverState.value = null;
}

function getWorkTypeDragClass(section: DailyReportWorkSection, workTypeId: string) {
  return {
    "daily-report-worktype-entry--dragging":
      workTypeDragState.value?.section === section &&
      workTypeDragState.value.workTypeId === workTypeId,
    "daily-report-worktype-entry--drop-before":
      workTypeDragOverState.value?.section === section &&
      workTypeDragOverState.value.workTypeId === workTypeId &&
      workTypeDragOverState.value.position === "before",
    "daily-report-worktype-entry--drop-after":
      workTypeDragOverState.value?.section === section &&
      workTypeDragOverState.value.workTypeId === workTypeId &&
      workTypeDragOverState.value.position === "after",
  };
}

function addDailyReportTask(workType: DailyReportWorkTypeDraft) {
  workType.tasks.push(createDailyReportTask());
}

function removeDailyReportTask(workType: DailyReportWorkTypeDraft, taskId: string) {
  workType.tasks = workType.tasks.filter((task) => task.id !== taskId);
}

function getWorkTypeSuggestionState(workTypeId: string) {
  return workTypeSuggestionStates.value[workTypeId] ?? {
    suggestions: [],
    isLoading: false,
    errorMessage: "",
    isOpen: false,
    highlightedIndex: -1,
    requestId: 0,
    closeTimer: null,
  };
}

function ensureWorkTypeSuggestionState(workTypeId: string) {
  const currentState = workTypeSuggestionStates.value[workTypeId];

  if (currentState) {
    return currentState;
  }

  const nextState: DailyReportWorkTypeSuggestionState = {
    suggestions: [],
    isLoading: false,
    errorMessage: "",
    isOpen: false,
    highlightedIndex: -1,
    requestId: 0,
    closeTimer: null,
  };

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

async function loadDailyReportWorkTypeSuggestions(workType: DailyReportWorkTypeDraft) {
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
    const suggestions = await materialInspectionRequestApi.getWorkTypeListByName(query);

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

function setDailyReportWorkTypeHighlightedIndex(workTypeId: string, index: number) {
  const state = ensureWorkTypeSuggestionState(workTypeId);
  state.highlightedIndex = clampNumber(index, -1, state.suggestions.length - 1);
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
      state.highlightedIndex >= 0 ? state.highlightedIndex : event.key === "ArrowDown" ? -1 : 0;
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

function openDailyReportWorkTypeSuggestionList(workType: DailyReportWorkTypeDraft) {
  clearWorkTypeSuggestionCloseTimer(workType.id);

  const state = ensureWorkTypeSuggestionState(workType.id);
  const query = workType.workTypeName.trim();

  if (!query) {
    return;
  }

  state.isOpen = true;
  state.highlightedIndex =
    state.highlightedIndex >= 0 ? state.highlightedIndex : state.suggestions.length > 0 ? 0 : -1;

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
  workType.workTypeId = suggestion.id;
  workType.workTypeName = suggestion.name;
  state.suggestions = [];
  state.errorMessage = "";
  state.isOpen = false;
  state.highlightedIndex = -1;
}

function getLaborWorkTypeSuggestionState(rowId: string) {
  return laborWorkTypeSuggestionStates.value[rowId] ?? {
    suggestions: [],
    isLoading: false,
    errorMessage: "",
    isOpen: false,
    highlightedIndex: -1,
    requestId: 0,
    closeTimer: null,
  };
}

function ensureLaborWorkTypeSuggestionState(rowId: string) {
  const currentState = laborWorkTypeSuggestionStates.value[rowId];

  if (currentState) {
    return currentState;
  }

  const nextState: DailyReportWorkTypeSuggestionState = {
    suggestions: [],
    isLoading: false,
    errorMessage: "",
    isOpen: false,
    highlightedIndex: -1,
    requestId: 0,
    closeTimer: null,
  };

  laborWorkTypeSuggestionStates.value = {
    ...laborWorkTypeSuggestionStates.value,
    [rowId]: nextState,
  };

  return nextState;
}

function clearLaborWorkTypeSuggestionCloseTimer(rowId: string) {
  const state = laborWorkTypeSuggestionStates.value[rowId];

  if (state?.closeTimer) {
    clearTimeout(state.closeTimer);
    state.closeTimer = null;
  }
}

function clearLaborWorkTypeSuggestions(rowId: string) {
  const state = ensureLaborWorkTypeSuggestionState(rowId);
  state.suggestions = [];
  state.errorMessage = "";
  state.isLoading = false;
  state.isOpen = false;
  state.highlightedIndex = -1;
}

async function loadLaborWorkTypeSuggestions(workType: DailyReportLaborWorkTypeDraft) {
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
    const suggestions = await materialInspectionRequestApi.getWorkTypeListByName(query);

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

function setLaborWorkTypeHighlightedIndex(rowId: string, index: number) {
  const state = ensureLaborWorkTypeSuggestionState(rowId);
  state.highlightedIndex = clampNumber(index, -1, state.suggestions.length - 1);
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
      state.highlightedIndex >= 0 ? state.highlightedIndex : event.key === "ArrowDown" ? -1 : 0;
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

function openLaborWorkTypeSuggestionList(workType: DailyReportLaborWorkTypeDraft) {
  clearLaborWorkTypeSuggestionCloseTimer(workType.id);

  const state = ensureLaborWorkTypeSuggestionState(workType.id);
  const query = workType.workTypeName.trim();

  if (!query) {
    return;
  }

  state.isOpen = true;
  state.highlightedIndex =
    state.highlightedIndex >= 0 ? state.highlightedIndex : state.suggestions.length > 0 ? 0 : -1;

  if (!state.isLoading && state.suggestions.length === 0) {
    void loadLaborWorkTypeSuggestions(workType);
  }
}

function scheduleCloseLaborWorkTypeSuggestionList(rowId: string) {
  clearLaborWorkTypeSuggestionCloseTimer(rowId);
  const state = ensureLaborWorkTypeSuggestionState(rowId);
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

function getImageDrafts(section: DailyReportWorkSection) {
  return section === "today" ? todayImages.value : tomorrowImages.value;
}

function setImageDrafts(section: DailyReportWorkSection, images: DailyReportImageDraft[]) {
  if (section === "today") {
    todayImages.value = images;
    return;
  }

  tomorrowImages.value = images;
}

function openImagePicker(section: DailyReportWorkSection) {
  getImageInputRef(section)?.click();
}

async function handleDailyReportImageChange(section: DailyReportWorkSection, event: Event) {
  const input = event.target as HTMLInputElement | null;
  const files = Array.from(input?.files ?? []).filter((file) => file.type.startsWith("image/"));

  if (input) {
    input.value = "";
  }

  if (files.length === 0) {
    return;
  }

  const nextImages = await Promise.all(
    files.map(async (file) => ({
      id: createDailyReportImageId(),
      src: await readImageFileAsDataUrl(file),
      description: "",
    })),
  );

  setImageDrafts(section, [...getImageDrafts(section), ...nextImages]);
}

function removeDailyReportImage(section: DailyReportWorkSection, imageId: string) {
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

function getBlockDropPosition(event: DragEvent): DailyReportImageDropPosition {
  const target = event.currentTarget;

  if (!(target instanceof HTMLElement)) {
    return "after";
  }

  const targetRect = target.getBoundingClientRect();
  return event.clientY > targetRect.top + targetRect.height / 2 ? "after" : "before";
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

function addDailyReportLaborWorkType() {
  laborWorkTypes.value = [
    ...laborWorkTypes.value,
    createDailyReportLaborWorkTypeDraft(),
  ];
}

function removeDailyReportLaborWorkType(workTypeId: string) {
  clearLaborWorkTypeSuggestionCloseTimer(workTypeId);
  laborWorkTypes.value = laborWorkTypes.value.filter(
    (workType) => workType.id !== workTypeId,
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
  const target = event.target;

  if (target instanceof HTMLInputElement) {
    row[key] = target.value;
  }
}

function handleDailyReportSave() {
  persistDailyReportDraft();
}
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
              <span class="daily-report-write-work-cell__title">
                오늘작업
              </span>
              <button
                type="button"
                class="daily-report-worktype-add"
                @click="addDailyReportWorkType('today')"
              >
                <span class="daily-report-worktype-add__box" aria-hidden="true">
                  +
                </span>
                <span>공종 추가</span>
              </button>
            </div>
            <div
              v-if="todayWorkTypes.length > 0"
              class="daily-report-worktype-list"
            >
              <article
                v-for="workType in todayWorkTypes"
                :key="workType.id"
                class="daily-report-worktype-entry"
                :class="getWorkTypeDragClass('today', workType.id)"
                draggable="true"
                @dragstart="handleWorkTypeDragStart('today', workType.id, $event)"
                @dragover="handleWorkTypeDragOver('today', workType.id, $event)"
                @dragleave="workTypeDragOverState = null"
                @drop="handleWorkTypeDrop('today', workType.id, $event)"
                @dragend="endWorkTypeDrag"
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
                            v-else-if="getWorkTypeSuggestionState(workType.id).suggestions.length > 0"
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
                    </div>
                  </div>
                </div>
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
              <span class="daily-report-write-work-cell__title">
                내일작업
              </span>
              <button
                type="button"
                class="daily-report-worktype-add"
                @click="addDailyReportWorkType('tomorrow')"
              >
                <span class="daily-report-worktype-add__box" aria-hidden="true">
                  +
                </span>
                <span>공종 추가</span>
              </button>
            </div>
            <div
              v-if="tomorrowWorkTypes.length > 0"
              class="daily-report-worktype-list"
            >
              <article
                v-for="workType in tomorrowWorkTypes"
                :key="workType.id"
                class="daily-report-worktype-entry"
                :class="getWorkTypeDragClass('tomorrow', workType.id)"
                draggable="true"
                @dragstart="handleWorkTypeDragStart('tomorrow', workType.id, $event)"
                @dragover="handleWorkTypeDragOver('tomorrow', workType.id, $event)"
                @dragleave="workTypeDragOverState = null"
                @drop="handleWorkTypeDrop('tomorrow', workType.id, $event)"
                @dragend="endWorkTypeDrag"
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
                            v-else-if="getWorkTypeSuggestionState(workType.id).suggestions.length > 0"
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
                    </div>
                  </div>
                </div>
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
              <span class="daily-report-write-work-cell__title">
                인력투입
              </span>
              <button
                type="button"
                class="daily-report-worktype-add"
                @click="addDailyReportLaborWorkType"
              >
                <span class="daily-report-worktype-add__box" aria-hidden="true">
                  +
                </span>
                <span>공종 추가</span>
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
                        aria-label="공정 삭제"
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
                            v-else-if="getLaborWorkTypeSuggestionState(workType.id).suggestions.length > 0"
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
