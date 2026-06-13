import type {
  FeatureCard,
  PainPoint,
  StepItem,
  VideoAsset,
} from "@/features/landing/model/landing.types";

/**
 * conelp-public 버킷 에셋.
 * 버킷 파일명이 한글 + NFD(분해형) 인코딩이라 런타임 encodeURI는 NFC/NFD 불일치 위험.
 * → gsutil 목록에서 추출해 검증(전 객체 HTTP 200)한 percent-encoded URL을 그대로 상수로 둔다.
 */
const BUCKET = "https://storage.googleapis.com/conelp-public";

export const ASSETS = {
  docMobile0: `${BUCKET}/%E1%84%86%E1%85%A9%E1%84%87%E1%85%A1%E1%84%8B%E1%85%B5%E1%86%AF%20%E1%84%86%E1%85%AE%E1%86%AB%E1%84%89%E1%85%A5%E1%84%89%E1%85%A2%E1%86%BC%E1%84%89%E1%85%A5%E1%86%BC0.png`,
  docMobile2: `${BUCKET}/%E1%84%86%E1%85%A9%E1%84%87%E1%85%A1%E1%84%8B%E1%85%B5%E1%86%AF%20%E1%84%86%E1%85%AE%E1%86%AB%E1%84%89%E1%85%A5%E1%84%89%E1%85%A2%E1%86%BC%E1%84%89%E1%85%A5%E1%86%BC2.png`,
  docMobile3: `${BUCKET}/%E1%84%86%E1%85%A9%E1%84%87%E1%85%A1%E1%84%8B%E1%85%B5%E1%86%AF%20%E1%84%86%E1%85%AE%E1%86%AB%E1%84%89%E1%85%A5%E1%84%89%E1%85%A2%E1%86%BC%E1%84%89%E1%85%A5%E1%86%BC3.png`,
  docVideo: `${BUCKET}/%E1%84%86%E1%85%A9%E1%84%87%E1%85%A1%E1%84%8B%E1%85%B5%E1%86%AF_%E1%84%86%E1%85%AE%E1%86%AB%E1%84%89%E1%85%A5%E1%84%89%E1%85%A2%E1%86%BC%E1%84%89%E1%85%A5%E1%86%BC%E1%84%8B%E1%85%AD%E1%84%8E%E1%85%A5%E1%86%BC.mp4`,
  report1: `${BUCKET}/%E1%84%80%E1%85%A9%E1%86%BC%E1%84%89%E1%85%A1%E1%84%8B%E1%85%B5%E1%86%AF%E1%84%87%E1%85%A91.jpeg`,
  report2: `${BUCKET}/%E1%84%80%E1%85%A9%E1%86%BC%E1%84%89%E1%85%A1%E1%84%8B%E1%85%B5%E1%86%AF%E1%84%87%E1%85%A92.jpeg`,
  report3: `${BUCKET}/%E1%84%80%E1%85%A9%E1%86%BC%E1%84%89%E1%85%A1%E1%84%8B%E1%85%B5%E1%86%AF%E1%84%87%E1%85%A93.jpeg`,
  scheduleCreatePoster: `${BUCKET}/%E1%84%80%E1%85%A9%E1%86%BC%E1%84%8C%E1%85%A5%E1%86%BC%E1%84%91%E1%85%AD%20%E1%84%8C%E1%85%A1%E1%86%A8%E1%84%8B%E1%85%A5%E1%86%B8%E1%84%89%E1%85%A2%E1%86%BC%E1%84%89%E1%85%A5%E1%86%BC.png`,
  scheduleLinkPoster: `${BUCKET}/%E1%84%80%E1%85%A9%E1%86%BC%E1%84%8C%E1%85%A5%E1%86%BC%E1%84%91%E1%85%AD%20%E1%84%8C%E1%85%A1%E1%86%A8%E1%84%8B%E1%85%A5%E1%86%B8%E1%84%8B%E1%85%A7%E1%86%AB%E1%84%80%E1%85%A7%E1%86%AF.png`,
  scheduleCreateVideo: `${BUCKET}/%E1%84%80%E1%85%A9%E1%86%BC%E1%84%8C%E1%85%A5%E1%86%BC%E1%84%91%E1%85%AD_%E1%84%8C%E1%85%A1%E1%86%A8%E1%84%8B%E1%85%A5%E1%86%B8%E1%84%89%E1%85%A2%E1%86%BC%E1%84%89%E1%85%A5%E1%86%BC.mp4`,
  scheduleLinkVideo: `${BUCKET}/%E1%84%80%E1%85%A9%E1%86%BC%E1%84%8C%E1%85%A5%E1%86%BC%E1%84%91%E1%85%AD_%E1%84%8C%E1%85%A1%E1%86%A8%E1%84%8B%E1%85%A5%E1%86%B8%E1%84%8B%E1%85%A7%E1%86%AB%E1%84%80%E1%85%A7%E1%86%AF.mp4`,
  scheduleVerify: `${BUCKET}/%E1%84%80%E1%85%A9%E1%86%BC%E1%84%8C%E1%85%A5%E1%86%BC%E1%84%91%E1%85%AD%20AI%E1%84%80%E1%85%A5%E1%86%B7%E1%84%8C%E1%85%B3%E1%86%BC.png`,
  scheduleDailyCompare: `${BUCKET}/%E1%84%80%E1%85%A9%E1%86%BC%E1%84%8C%E1%85%A5%E1%86%BC%E1%84%91%E1%85%AD%20%E1%84%8C%E1%85%A1%E1%86%A8%E1%84%8B%E1%85%A5%E1%86%B8%E1%84%8B%E1%85%B5%E1%86%AF%E1%84%87%E1%85%A9%E1%84%87%E1%85%B5%E1%84%80%E1%85%AD.png`,
} as const;

/** 로고는 public 자산 재사용 (루트에서 public/으로 이동됨) */
export const LOGO_SRC = "/conelp_logo.png";

export const HERO = {
  title: "CONELP",
  subtitle: "건설 업무를 손쉽게 만드는 AI솔루션",
  description: "문서생성 · 공정표 관리",
} as const;

export const PROBLEM = {
  title: "여러분은 지금, 현장 관리할 시간을 빼앗기고 있습니다",
  body: [
    "관리자가 현장에 나가지 못하고, 늦게까지 야근하는 이유가 무엇일까요?",
    "현장 관리를 위해 작성하는 서류들, 오히려 현장 업무를 방해하고 있습니다.",
    "수많은 서류 종류, 서로 다른 양식 … 5분이면 만들 서류를 붙잡고 1~2시간을 소비합니다.",
  ],
  painPoints: [
    { title: "과도한 서류 종류", description: "공사 한 건당 챙겨야 할 서식만 수십 종" },
    { title: "문서별 작업 전환 비용", description: "서류마다 양식과 작성 방식이 달라 매번 다시 적응" },
    { title: "반복되는 수기 입력", description: "비슷한 내용을 문서마다 다시 옮겨 적는 단순 작성 업무" },
  ] satisfies PainPoint[],
  solution: {
    title: "클릭 한 번으로 문서 생성",
    lines: [
      "현장 사진을 한번에 업로드",
      "AI를 통한 현장 맞춤 서류 생성",
      "현장관리자는 작성보다 검토에 집중",
    ],
  },
} as const;

export const DOC_GEN = {
  title: "사진만 올리면 서류가 만들어집니다",
  body: [
    "현장에서 찍은 사진 몇 장이면 충분합니다.",
    "AI가 사진을 분석해 필요한 항목을 채우고, 현장 양식에 맞춰 서류를 자동으로 만들어 줍니다.",
  ],
  steps: [
    { image: { src: ASSETS.docMobile0, alt: "모바일에서 현장 사진 업로드" }, caption: "모바일에서 바로 촬영 후 사진 업로드" },
    { image: { src: ASSETS.docMobile2, alt: "AI 분석으로 서류 자동 생성" }, caption: "AI 분석을 통한 자동 서류 생성" },
    { image: { src: ASSETS.docMobile3, alt: "현장 양식에 맞춘 문서 생성 완료" }, caption: "현장 양식에 맞춘 문서 생성 완료" },
  ] satisfies StepItem[],
} as const;

export const FORM_FIDELITY = {
  title: "현장 양식 그대로 문서를 생성합니다",
  samples: [
    { src: ASSETS.report1, alt: "공사일보 샘플 1" },
    { src: ASSETS.report2, alt: "공사일보 샘플 2" },
    { src: ASSETS.report3, alt: "공사일보 샘플 3" },
  ],
  cards: [
    {
      title: "현장마다 다른 양식, 완벽하게 대응합니다",
      lines: [
        "발주처별·감리사별·자체 양식까지 어떤 양식이든 그대로 학습해서 채워드립니다",
        "한 번 등록 → 다음부터 자동 적용",
        "한글 · 엑셀 · PDF 모두 사용 가능",
        "생성한 문서는 일괄 관리 가능",
      ],
    },
    {
      title: "전문가가 검증하는 완벽한 서류",
      lines: [
        "AI가 만든 서류, CONELP는 건설 전문가가 직접 CROSS-CHECK 합니다",
        "현직 건설업 전문가가 양식·항목 검수",
        "미비 항목 자동 보완",
        "CSI 입력 등 서류 외 업무도 함께 가능",
      ],
    },
  ] satisfies FeatureCard[],
} as const;

export const SCHEDULE = {
  title: "클릭 한 번에, 만들고 고치는 공정표",
  body: ["엑셀로 끌어 옮길 때마다 어긋나는 일정, 이제는 클릭 한 번이면 끝입니다."],
  videos: [
    {
      caption: "클릭 한번에 작업 생성 → 간트 차트 완성",
      video: {
        src: ASSETS.scheduleCreateVideo,
        poster: ASSETS.scheduleCreatePoster,
        label: "클릭 한 번으로 작업을 생성하는 공정표 화면",
      } satisfies VideoAsset,
    },
    {
      caption: "한 공정을 옮기면 후행 공정이 자동으로 재계산",
      video: {
        src: ASSETS.scheduleLinkVideo,
        poster: ASSETS.scheduleLinkPoster,
        label: "공정을 옮기면 후행 공정이 자동 재계산되는 화면",
      } satisfies VideoAsset,
    },
  ],
  painPoints: [
    { title: "수정할수록 어긋나는 일정", description: "한 공정을 옮기면 모든 일정이 어긋납니다. 매주 수정·재배포만으로도 반나절" },
    { title: "계획과 실행의 단절", description: "공정표는 계획일 뿐, 실제 작업 실행은 다르게 흘러갑니다" },
    { title: "검증되지 않은 공정표", description: "보여주기 식으로 만들어진 공정표, 맞지 않는 오류 투성이입니다" },
  ] satisfies PainPoint[],
} as const;

export const PROGRESS = {
  title: "작업일보 연동으로 한 눈에 진척도 파악",
  subtitle: "계획과 실적을 매일 자동 비교 분석합니다",
  image: { src: ASSETS.scheduleDailyCompare, alt: "작업일보 연동 진척도 비교 화면" },
  lines: [
    "작업일보의 항목이 공정표 진행률에 자동 반영",
    "계획 vs 실적 격차를 매일 시각화",
    "지연 임계치 초과 시 알림",
  ],
} as const;

export const CONTACT = {
  brand: "CONELP",
  tagline: "CONSTRUCTION · KNOWLEDGE · AI",
  email: "master@cetaceans.kr",
  phone: "82) 10 9912 3292",
} as const;
