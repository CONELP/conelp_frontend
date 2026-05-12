import type {
  ServicePresentationSiteId,
  ServicePresentationSiteManifest,
} from "@/features/service-presentation-demo/model/service-presentation-demo.types";

export const defaultServicePresentationSiteId: ServicePresentationSiteId =
  "cheongun_church";

export const servicePresentationSiteManifest: ServicePresentationSiteManifest[] = [
  {
    siteId: "sunhyewon",
    siteName: "선혜원",
    siteChipLabel: "선혜원 현장",
    description: "작업일보와 자재/콘크리트 자료를 기준으로 시연할 현장",
    dataRoot: "data/선혜원",
    scheduleSeedId: "sunhyewon-baseline-schedule",
    documents: [
      {
        documentType: "daily_report",
        label: "홈페이지 fetch 작업일보",
        sourceFolder: "data/선혜원/1. 작업일보",
        inputFiles: ["2024-05.xlsx"],
        inputRefs: [
          {
            id: "sunhyewon-daily-report-excel",
            label: "작업일보 원본",
            fileName: "2024-05.xlsx",
            kind: "excel",
            required: true,
          },
          {
            id: "sunhyewon-daily-report-homepage",
            label: "홈페이지 fetch 대상",
            fileName: "선혜원 작업일보 페이지",
            kind: "external",
            required: true,
          },
        ],
        outputExcel: "2024-05.xlsx",
        registrationSteps: [
          {
            id: "confirm-homepage-target",
            label: "홈페이지 자료 확인",
            description: "현장과 날짜 기준으로 가져올 홈페이지 작업일보를 확인합니다.",
          },
          {
            id: "confirm-daily-report-format",
            label: "작업일보 양식 확인",
            description: "현장 폴더의 기존 Excel 양식을 결과 문서 기준으로 사용합니다.",
          },
        ],
        generationSteps: [
          "선혜원 작업일보 페이지에 접속하고 있어요.",
          "2024-05 작업일보 원본 양식을 확인하고 있어요.",
          "홈페이지 작업 내용을 날짜별 항목으로 정리하고 있어요.",
          "인력, 장비, 작업 내용을 Excel 양식에 맞추고 있어요.",
          "선혜원 작업일보 결과 파일을 준비하고 있어요.",
        ],
        status: "demo_ready",
      },
      {
        documentType: "material_registration",
        label: "자재반입검수요청서",
        sourceFolder: "data/선혜원/2. 자재반입검수요청서",
        inputFiles: ["230817 철근.pdf", "사진대장.xlsx"],
        inputRefs: [
          {
            id: "sunhyewon-material-invoice",
            label: "철근 반입 송장",
            fileName: "230817 철근.pdf",
            kind: "pdf",
            required: true,
          },
          {
            id: "sunhyewon-material-photo-ledger",
            label: "사진대장",
            fileName: "사진대장.xlsx",
            kind: "excel",
            required: true,
          },
        ],
        outputExcel:
          "(건)제23-27호 자재 검수요청서(철근) 230817/사진대장.xlsx",
        registrationSteps: [
          {
            id: "register-material-source",
            label: "반입 자료 등록",
            description: "송장과 사진대장을 등록해 자재 반입 근거를 확인합니다.",
          },
          {
            id: "confirm-material-summary",
            label: "자재 정보 확인",
            description: "자재명, 반입일, 규격, 수량을 검수요청서에 맞게 확인합니다.",
          },
        ],
        generationSteps: [
          "230817 철근 송장을 읽고 있어요.",
          "사진대장의 반입 사진과 송장 자료를 대조하고 있어요.",
          "자재명, 규격, 반입일, 수량을 추출하고 있어요.",
          "검수요청서 양식에 철근 반입 정보를 배치하고 있어요.",
          "선혜원 자재반입검수요청서 결과 파일을 준비하고 있어요.",
        ],
        status: "demo_ready",
      },
      {
        documentType: "concrete_delivery_csi",
        label: "콘크리트 받아들이기 시험",
        sourceFolder: "data/선혜원/3. 콘크리트 받아들이기시험",
        inputFiles: ["230920 레미콘 유진.pdf", "230921 레미콘 삼표.pdf"],
        inputRefs: [
          {
            id: "sunhyewon-concrete-yujin",
            label: "유진 레미콘 송장",
            fileName: "230920 레미콘 유진.pdf",
            kind: "pdf",
            required: true,
          },
          {
            id: "sunhyewon-concrete-sampyo",
            label: "삼표 레미콘 송장",
            fileName: "230921 레미콘 삼표.pdf",
            kind: "pdf",
            required: true,
          },
        ],
        outputExcel: null,
        registrationSteps: [
          {
            id: "register-concrete-delivery",
            label: "레미콘 송장 등록",
            description: "업체별 레미콘 송장을 등록해 배치 정보를 확인합니다.",
          },
          {
            id: "confirm-concrete-test",
            label: "시험 정보 확인",
            description: "타설 위치, 시험일, 시험 항목을 받아들이기 시험 기준으로 확인합니다.",
          },
        ],
        generationSteps: [
          "유진 레미콘 송장을 읽고 있어요.",
          "삼표 레미콘 송장을 함께 대조하고 있어요.",
          "업체별 배치, 납품 시간, 규격 정보를 정리하고 있어요.",
          "슬럼프, 공기량, 염화물 등 받아들이기 시험 항목을 맞추고 있어요.",
          "선혜원 콘크리트 받아들이기 시험 결과를 준비하고 있어요.",
        ],
        status: "needs_review",
      },
      {
        documentType: "concrete_strength_csi",
        label: "콘크리트 압축강도 시험",
        sourceFolder: "data/선혜원/4. 콘크리트 압축강도시험",
        inputFiles: ["7일", "28일"],
        inputRefs: [
          {
            id: "sunhyewon-strength-7day",
            label: "7일 강도 자료",
            fileName: "7일",
            kind: "folder",
            required: true,
          },
          {
            id: "sunhyewon-strength-28day",
            label: "28일 강도 자료",
            fileName: "28일",
            kind: "folder",
            required: true,
          },
        ],
        outputExcel: "230921_콘크리트압축강도시험.xlsx",
        registrationSteps: [
          {
            id: "register-strength-sources",
            label: "강도 자료 등록",
            description: "7일/28일 압축강도 자료를 재령 기준으로 구분합니다.",
          },
          {
            id: "confirm-strength-result",
            label: "강도 결과 확인",
            description: "타설 위치, 시험일, 재령, 업체별 강도 값을 확인합니다.",
          },
        ],
        generationSteps: [
          "7일 강도 자료 폴더를 확인하고 있어요.",
          "28일 강도 자료 폴더를 확인하고 있어요.",
          "시험일, 재령, 공시체 정보를 구분하고 있어요.",
          "압축강도 결과값과 판정 기준을 정리하고 있어요.",
          "선혜원 콘크리트 압축강도 시험 결과를 준비하고 있어요.",
        ],
        status: "needs_review",
      },
    ],
  },
  {
    siteId: "cheongun_church",
    siteName: "청운교회",
    siteChipLabel: "청운교회 현장",
    description: "공사일보, 자재반입, 콘크리트 시험 자료가 모두 들어온 대표 시연 현장",
    dataRoot: "data/청운교회",
    scheduleSeedId: "cheongun-church-baseline-schedule",
    documents: [
      {
        documentType: "daily_report",
        label: "홈페이지 fetch 작업일보",
        sourceFolder: "data/청운교회/1. 작업일보",
        inputFiles: ["260502 청운교회-공사일보.xlsx"],
        inputRefs: [
          {
            id: "cheongun-daily-report-excel",
            label: "작업일보 원본",
            fileName: "260502 청운교회-공사일보.xlsx",
            kind: "excel",
            required: true,
          },
          {
            id: "cheongun-daily-report-homepage",
            label: "홈페이지 fetch 대상",
            fileName: "청운교회 작업일보 페이지",
            kind: "external",
            required: true,
          },
        ],
        outputExcel: "260502 청운교회-공사일보.xlsx",
        registrationSteps: [
          {
            id: "confirm-homepage-target",
            label: "홈페이지 자료 확인",
            description: "현장과 날짜 기준으로 가져올 홈페이지 작업일보를 확인합니다.",
          },
          {
            id: "confirm-daily-report-format",
            label: "작업일보 양식 확인",
            description: "현장 폴더의 기존 Excel 양식을 결과 문서 기준으로 사용합니다.",
          },
        ],
        generationSteps: [
          "청운교회 작업일보 페이지에 접속하고 있어요.",
          "260502 공사일보 Excel 양식을 확인하고 있어요.",
          "홈페이지 작업 내용을 날짜별 항목으로 정리하고 있어요.",
          "인력, 장비, 작업 내용을 청운교회 양식에 맞추고 있어요.",
          "청운교회 작업일보 결과 파일을 준비하고 있어요.",
        ],
        status: "demo_ready",
      },
      {
        documentType: "material_registration",
        label: "자재반입검수요청서",
        sourceFolder: "data/청운교회/2. 자재반입검수요청서",
        inputFiles: [
          "260402 단열재(90,130,180T)/260402 단열재 송장.pdf",
        ],
        inputRefs: [
          {
            id: "cheongun-material-invoice",
            label: "단열재 송장",
            fileName: "260402 단열재 송장.pdf",
            kind: "pdf",
            required: true,
          },
        ],
        outputExcel:
          "260402 단열재(90,130,180T)/26-04-01 주요자재 검수요청서_단열재(90,130,180T).xlsx",
        registrationSteps: [
          {
            id: "register-material-source",
            label: "반입 자료 등록",
            description: "송장과 현장 자료를 등록해 자재 반입 근거를 확인합니다.",
          },
          {
            id: "confirm-material-summary",
            label: "자재 정보 확인",
            description: "자재명, 반입일, 규격, 수량을 검수요청서에 맞게 확인합니다.",
          },
        ],
        generationSteps: [
          "260402 단열재 송장을 읽고 있어요.",
          "단열재 규격 90, 130, 180T 항목을 분류하고 있어요.",
          "공급처, 반입일, 수량 정보를 검수 항목으로 정리하고 있어요.",
          "주요자재 검수요청서 양식에 단열재 정보를 배치하고 있어요.",
          "청운교회 자재반입검수요청서 결과 파일을 준비하고 있어요.",
        ],
        status: "demo_ready",
      },
      {
        documentType: "concrete_delivery_csi",
        label: "콘크리트 받아들이기 시험",
        sourceFolder: "data/청운교회/3. 콘크리트 받아들이기시험",
        inputFiles: [
          "260402 레미콘 송장(신일).pdf",
          "260402 레미콘 송장(천마).pdf",
        ],
        inputRefs: [
          {
            id: "cheongun-concrete-shinil",
            label: "신일 레미콘 송장",
            fileName: "260402 레미콘 송장(신일).pdf",
            kind: "pdf",
            required: true,
          },
          {
            id: "cheongun-concrete-cheonma",
            label: "천마 레미콘 송장",
            fileName: "260402 레미콘 송장(천마).pdf",
            kind: "pdf",
            required: true,
          },
          {
            id: "cheongun-concrete-log",
            label: "콘크리트 시험일지",
            fileName: "260402_콘크리트시험일지(신일).xlsx",
            kind: "excel",
            required: true,
          },
        ],
        outputExcel:
          "260402 지상2층 벽체 (4월30일 시험)/260402_콘크리트시험일지(신일).xlsx",
        registrationSteps: [
          {
            id: "register-concrete-delivery",
            label: "레미콘 송장 등록",
            description: "업체별 레미콘 송장을 등록해 배치 정보를 확인합니다.",
          },
          {
            id: "confirm-concrete-test",
            label: "시험 정보 확인",
            description: "타설 위치, 시험일, 시험 항목을 받아들이기 시험 기준으로 확인합니다.",
          },
        ],
        generationSteps: [
          "신일 레미콘 송장을 읽고 있어요.",
          "천마 레미콘 송장을 함께 대조하고 있어요.",
          "콘크리트 시험일지의 배치별 시험값을 확인하고 있어요.",
          "타설 위치, 납품 시간, 시험 항목을 결과 양식에 맞추고 있어요.",
          "청운교회 콘크리트 받아들이기 시험 결과 파일을 준비하고 있어요.",
        ],
        status: "demo_ready",
      },
      {
        documentType: "concrete_strength_csi",
        label: "콘크리트 압축강도 시험",
        sourceFolder: "data/청운교회/4. 콘크리트 압축강도시험",
        inputFiles: ["7일강도", "28일강도"],
        inputRefs: [
          {
            id: "cheongun-strength-7day",
            label: "7일 강도 자료",
            fileName: "7일강도",
            kind: "folder",
            required: true,
          },
          {
            id: "cheongun-strength-28day",
            label: "28일 강도 자료",
            fileName: "28일강도",
            kind: "folder",
            required: true,
          },
        ],
        outputExcel: "260402_콘크리트시험일지(신일).xlsx",
        registrationSteps: [
          {
            id: "register-strength-sources",
            label: "강도 자료 등록",
            description: "7일/28일 압축강도 자료를 재령 기준으로 구분합니다.",
          },
          {
            id: "confirm-strength-result",
            label: "강도 결과 확인",
            description: "타설 위치, 시험일, 재령, 업체별 강도 값을 확인합니다.",
          },
        ],
        generationSteps: [
          "7일강도 자료 폴더를 확인하고 있어요.",
          "28일강도 자료 폴더를 확인하고 있어요.",
          "시험일, 재령, 타설 위치를 자료별로 분류하고 있어요.",
          "업체별 압축강도 결과값과 판정 기준을 정리하고 있어요.",
          "청운교회 콘크리트 압축강도 시험 결과를 준비하고 있어요.",
        ],
        status: "needs_review",
      },
    ],
  },
];
