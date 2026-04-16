import type {
  ConversionDemoStep,
  DemoResultState,
  DocumentDemoCard,
  FlowStageSummary,
  SelectionPageCopy,
  UploadDocumentPreset,
  UploadFeedbackPageCopy,
  UploadPageCopy,
} from "@/features/document-conversion-demo/model/document-conversion-demo.types";
import documentTextIcon from "@fluentui/svg-icons/icons/document_text_24_regular.svg";
import clipboardTaskIcon from "@fluentui/svg-icons/icons/clipboard_task_24_regular.svg";
import beakerIcon from "@fluentui/svg-icons/icons/beaker_24_regular.svg";
import cylinderIcon from "@fluentui/svg-icons/icons/database_24_regular.svg";
import checkmarkIcon from "@fluentui/svg-icons/icons/checkmark_circle_24_regular.svg";

export const selectionPageCopy: SelectionPageCopy = {
  eyebrow: "",
  title: "어떤 서류를 만들까요?",
  description:
    "서류 종류를 먼저 고르면 다음 화면에서 이미지 자료를 바로 올릴 수 있습니다.",
  helper:
    "스크롤 없이 한눈에 보고 빠르게 선택할 수 있는 형태로 구성했습니다.",
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
    type: "daily_report",
    label: "공사일보",
    chipLabel: "공사일보",
    iconSrc: documentTextIcon,
    description: "일일 작업 현황과 투입 인력, 장비 기록을 정리하는 기본 문서",
    uploadGuide: "현장 사진, 작업 메모, 당일 기록지를 올려 주세요.",
    resultLabel: "공사일보 결과 시안",
    status: "available",
    accentLabel: "즉시 데모 가능",
  },
  {
    type: "material_inspection_rebar",
    label: "자재반입 검수요청",
    chipLabel: "자재반입 검수요청",
    iconSrc: clipboardTaskIcon,
    description: "철근 반입 수량과 규격 확인 내용을 작성하는 검수 요청 문서",
    uploadGuide: "철근 표기 사진과 검수 대상 자재 사진을 올려 주세요.",
    resultLabel: "철근 검수요청서 결과 시안",
    status: "available",
    accentLabel: "즉시 데모 가능",
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
  },
  {
    type: "inspection_request",
    label: "검측 요청서",
    chipLabel: "검측 요청서",
    iconSrc: checkmarkIcon,
    description: "공정별 검측 요청 정보를 빠르게 정리하는 요청 문서",
    uploadGuide: "검측 대상 위치 사진과 체크 포인트 메모를 올려 주세요.",
    resultLabel: "검측 요청서 결과 시안",
    status: "available",
    accentLabel: "즉시 데모 가능",
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
    documentType: "daily_report",
    guideItems: [
      "작업 전경 사진",
      "당일 작업 메모 사진",
      "인력 또는 장비 기록 사진",
    ],
    sampleFiles: [
      {
        id: "daily-report-1",
        name: "IMG_2407_작업전경.jpg",
        previewType: "image",
      },
      {
        id: "daily-report-2",
        name: "IMG_2408_작업메모.jpg",
        previewType: "image",
      },
    ],
    feedbackItems: [
      { id: "daily-report-check-1", label: "작업 전경 사진", status: "matched" },
      { id: "daily-report-check-2", label: "당일 작업 메모 사진", status: "matched" },
      { id: "daily-report-check-3", label: "인력 또는 장비 기록 사진", status: "missing" },
    ],
  },
  {
    documentType: "material_inspection_rebar",
    guideItems: [
      "철근 표기 사진",
      "반입 자재 전경 사진",
      "규격표 또는 납품서 사진",
    ],
    sampleFiles: [
      {
        id: "rebar-1",
        name: "IMG_2410_철근표기.jpg",
        previewType: "image",
      },
      {
        id: "rebar-2",
        name: "IMG_2411_반입전경.jpg",
        previewType: "image",
      },
    ],
    feedbackItems: [
      { id: "rebar-check-1", label: "철근 표기 사진", status: "matched" },
      { id: "rebar-check-2", label: "반입 자재 전경 사진", status: "matched" },
      { id: "rebar-check-3", label: "규격표 또는 납품서 사진", status: "missing" },
    ],
  },
  {
    documentType: "concrete_delivery_csi",
    guideItems: [
      "반입 차량 전경 사진",
      "레미콘 출하증명서 사진",
      "반입시험 기록지 사진",
    ],
    sampleFiles: [
      {
        id: "concrete-delivery-1",
        name: "IMG_2420_반입차량.jpg",
        previewType: "image",
      },
      {
        id: "concrete-delivery-2",
        name: "IMG_2421_출하증명서.jpg",
        previewType: "image",
      },
    ],
    feedbackItems: [
      { id: "delivery-check-1", label: "반입 차량 전경 사진", status: "matched" },
      { id: "delivery-check-2", label: "레미콘 출하증명서 사진", status: "matched" },
      { id: "delivery-check-3", label: "반입시험 기록지 사진", status: "missing" },
    ],
  },
  {
    documentType: "concrete_strength_csi",
    guideItems: [
      "시험 성적서 사진",
      "공시체 사진",
      "배합 또는 위치 메모 사진",
    ],
    sampleFiles: [
      {
        id: "concrete-strength-1",
        name: "IMG_2430_시험성적서.jpg",
        previewType: "image",
      },
      {
        id: "concrete-strength-2",
        name: "IMG_2431_공시체.jpg",
        previewType: "image",
      },
    ],
    feedbackItems: [
      { id: "strength-check-1", label: "시험 성적서 사진", status: "matched" },
      { id: "strength-check-2", label: "공시체 사진", status: "matched" },
      { id: "strength-check-3", label: "배합 또는 위치 메모 사진", status: "missing" },
    ],
  },
  {
    documentType: "inspection_request",
    guideItems: [
      "검측 대상 위치 사진",
      "체크 포인트 메모 사진",
      "도면 또는 표기 사진",
    ],
    sampleFiles: [
      {
        id: "inspection-1",
        name: "IMG_2440_검측위치.jpg",
        previewType: "image",
      },
      {
        id: "inspection-2",
        name: "IMG_2441_체크포인트.jpg",
        previewType: "image",
      },
    ],
    feedbackItems: [
      { id: "inspection-check-1", label: "검측 대상 위치 사진", status: "matched" },
      { id: "inspection-check-2", label: "체크 포인트 메모 사진", status: "matched" },
      { id: "inspection-check-3", label: "도면 또는 표기 사진", status: "missing" },
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
  documentType: "daily_report",
  title: "공사일보 결과 시안",
  statusLabel: "변환 완료",
  summaryItems: [
    { label: "문서 타입", value: "공사일보" },
    { label: "입력 자료", value: "현장 이미지 2건" },
    { label: "데모 상태", value: "검토 가능한 시안 준비" },
  ],
  primaryActionLabel: "데모 다운로드",
  secondaryActionLabel: "처음으로 돌아가기",
};
