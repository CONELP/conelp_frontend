import type {
  ConversionDemoStep,
  DemoResultState,
  DocumentDemoCard,
  FlowStageSummary,
  SelectionPageCopy,
  UploadDocumentPreset,
  UploadFeedbackPageCopy,
  UploadPageCopy,
} from "@/features/document-conversion/model/document-conversion-demo.types";
import clipboardTaskIcon from "@fluentui/svg-icons/icons/clipboard_task_24_regular.svg";
import beakerIcon from "@fluentui/svg-icons/icons/beaker_24_regular.svg";
import cylinderIcon from "@fluentui/svg-icons/icons/database_24_regular.svg";
import noteEditIcon from "@fluentui/svg-icons/icons/note_edit_24_regular.svg";

export const selectionPageCopy: SelectionPageCopy = {
  eyebrow: "",
  title: "어떤 서류를 만들까요?",
  description:
    "서류 종류를 먼저 고르면 다음 화면에서 이미지 자료를 바로 올릴 수 있습니다.",
  helper: "스크롤 없이 한눈에 보고 빠르게 선택할 수 있는 형태로 구성했습니다.",
  actionLabel: "자료 업로드하기",
};

export const demoFlowStages: FlowStageSummary[] = [
  {
    id: "selection",
    label: "문서 선택",
    description: "생성할 문서 종류를 고릅니다.",
  },
  {
    id: "upload",
    label: "자료 업로드",
    description: "현장 사진과 참고 자료를 첨부합니다.",
  },
  {
    id: "loading",
    label: "변환 진행",
    description: "AI가 형식과 입력값을 정리합니다.",
  },
  {
    id: "result",
    label: "결과 확인",
    description: "완성된 시안과 다음 행동을 확인합니다.",
  },
];

export const documentCatalog: DocumentDemoCard[] = [
  {
    type: "daily_report_write",
    label: "공사일보 작성",
    chipLabel: "공사일보 작성",
    iconSrc: noteEditIcon,
    description: "당일 작업 내용과 현장 기록을 직접 작성하는 공사일보 문서",
    uploadGuide: "기본 입력 흐름으로 공사일보를 작성할 수 있어요.",
    resultLabel: "공사일보 작성 결과 시안",
    status: "available",
    accentLabel: "즉시 데모 가능",
    generationMode: "direct",
  },
  {
    type: "material_registration",
    label: "자재 반입 검수요청",
    chipLabel: "자재 반입 검수요청",
    iconSrc: clipboardTaskIcon,
    description: "반입 자재 정보와 검수 요청에 필요한 항목을 정리하는 문서",
    uploadGuide: "송장 사진과 거래 명세서 사진을 올려 주세요.",
    resultLabel: "자재 반입 검수요청 결과 시안",
    status: "available",
    accentLabel: "즉시 데모 가능",
    generationMode: "upload_required",
  },
  {
    type: "concrete_delivery_csi",
    label: "콘크리트 반입시험",
    chipLabel: "콘크리트 반입시험",
    iconSrc: beakerIcon,
    description: "반입 정보와 CSI 입력 항목을 한 번에 정리하는 문서",
    uploadGuide: "출하증명서와 현장 반입 사진을 올려 주세요.",
    resultLabel: "콘크리트 반입 결과 시안",
    status: "available",
    accentLabel: "즉시 데모 가능",
    generationMode: "upload_required",
  },
  {
    type: "concrete_strength_csi",
    label: "콘크리트 압축강도",
    chipLabel: "콘크리트 압축강도",
    iconSrc: cylinderIcon,
    description: "압축강도 결과와 CSI 항목을 묶어 보여 주는 문서",
    uploadGuide: "시험 결과표와 시편 사진을 올려 주세요.",
    resultLabel: "압축강도 결과 시안",
    status: "available",
    accentLabel: "즉시 데모 가능",
    generationMode: "upload_required",
  },
];

export const uploadPageCopy: UploadPageCopy = {
  title: "어떤 자료를 올릴까요?",
  guideTitle: "필요 자료",
  filesTitle: "첨부 자료",
  actionLabel: "생성하기",
  loadSampleActionLabel: "샘플 자료 불러오기",
  clearActionLabel: "비우기",
  emptyTitle: "아직 첨부된 자료가 없어요",
  emptyDescription:
    "현장 사진이나 문서 이미지를 올리면 이곳에 첨부 목록이 표시됩니다.",
};

export const uploadFeedbackPageCopy: UploadFeedbackPageCopy = {
  title: "업로드 자료를 점검했어요",
  summaryLabel: "필요 자료 기준으로 업로드 상태를 확인했습니다.",
  primaryReadyActionLabel: "변환 시작하기",
  primaryRetryActionLabel: "자료 다시 올리기",
  secondaryActionLabel: "문서 선택으로 돌아가기",
};

export const uploadDocumentPresets: UploadDocumentPreset[] = [
  {
    documentType: "material_registration",
    guideItems: ["송장 사진", "자재 반입 사진", "밀시트 사진"],
    sampleFiles: [
      {
        id: "material-registration-1",
        name: "IMG_2409_송장.jpg",
        previewType: "image",
        rotation: 0,
      },
      {
        id: "material-registration-2",
        name: "IMG_2410_자재반입.jpg",
        previewType: "image",
        rotation: 0,
      },
      {
        id: "material-registration-3",
        name: "IMG_2411_밀시트.jpg",
        previewType: "image",
        rotation: 0,
      },
    ],
    feedbackItems: [
      {
        id: "material-registration-check-1",
        label: "송장 사진",
        status: "matched",
      },
      {
        id: "material-registration-check-2",
        label: "자재 반입 사진",
        status: "matched",
      },
      {
        id: "material-registration-check-3",
        label: "밀시트 사진",
        status: "missing",
      },
    ],
  },
  {
    documentType: "concrete_delivery_csi",
    guideItems: [
      "슬럼프 시험 전경 사진",
      "보드판 사진",
      "공기량 사진",
      "온도 사진",
      "염화물 사진",
      "함수율 사진",
    ],
    sampleFiles: [
      {
        id: "concrete-delivery-1",
        name: "IMG_2420_반입차량.jpg",
        previewType: "image",
        rotation: 0,
      },
      {
        id: "concrete-delivery-2",
        name: "IMG_2421_출하증명서.jpg",
        previewType: "image",
        rotation: 0,
      },
    ],
    feedbackItems: [
      {
        id: "delivery-check-1",
        label: "출하증명서 사진",
        status: "matched",
      },
      {
        id: "delivery-check-2",
        label: "슬럼프 시험 전경 사진",
        status: "matched",
      },
      {
        id: "delivery-check-3",
        label: "보드판 사진",
        status: "missing",
      },
      {
        id: "delivery-check-4",
        label: "공기량 사진",
        status: "missing",
      },
      {
        id: "delivery-check-5",
        label: "온도 사진",
        status: "missing",
      },
      {
        id: "delivery-check-6",
        label: "염화물 사진",
        status: "missing",
      },
      {
        id: "delivery-check-7",
        label: "함수율 사진",
        status: "missing",
      },
    ],
  },
  {
    documentType: "concrete_strength_csi",
    guideItems: ["시험 성적서 사진", "공시체 사진", "배합 또는 위치 메모 사진"],
    sampleFiles: [
      {
        id: "concrete-strength-1",
        name: "IMG_2430_시험성적서.jpg",
        previewType: "image",
        rotation: 0,
      },
      {
        id: "concrete-strength-2",
        name: "IMG_2431_공시체.jpg",
        previewType: "image",
        rotation: 0,
      },
    ],
    feedbackItems: [
      { id: "strength-check-1", label: "시험 성적서 사진", status: "matched" },
      { id: "strength-check-2", label: "공시체 사진", status: "matched" },
      {
        id: "strength-check-3",
        label: "배합 또는 위치 메모 사진",
        status: "missing",
      },
    ],
  },
];

export const conversionLoadingSteps: ConversionDemoStep[] = [
  {
    id: "analyzing",
    label: "이미지 확인 중",
    detail: "업로드한 자료의 문서 종류와 핵심 표기를 읽고 있습니다.",
  },
  {
    id: "mapping",
    label: "문서 형식 정리 중",
    detail: "읽은 내용을 데모용 문서 구조에 맞춰 정렬하고 있습니다.",
  },
  {
    id: "rendering",
    label: "결과 시안 생성 중",
    detail: "검토 가능한 결과 화면 레이아웃으로 시안을 만들고 있습니다.",
  },
];

export const demoResultState: DemoResultState = {
  documentType: "daily_report_write",
  title: "공사일보 작성 결과 시안",
  statusLabel: "변환 완료",
  summaryItems: [
    { label: "문서 타입", value: "공사일보 작성" },
    { label: "입력 자료", value: "현장 이미지 2건" },
    { label: "데모 상태", value: "검토 가능한 시안 준비" },
  ],
  primaryActionLabel: "데모 다운로드",
  secondaryActionLabel: "처음으로 돌아가기",
};
