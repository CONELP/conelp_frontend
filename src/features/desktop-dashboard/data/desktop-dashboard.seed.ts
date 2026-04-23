import type { DesktopDashboardSeed } from "@/features/desktop-dashboard/model/desktop-dashboard.types";

export const desktopDashboardSeed: DesktopDashboardSeed = {
  siteName: "청운교회 현장",
  siteChipLabel: "청운교회 현장",
  siteSubtitle: "공정, 인력, 일정 흐름을 한 화면에서 보는 데스크탑 대시보드",
  updatedAtLabel: "2026.04.22 수요일 08:30 기준",
  headerBadges: [
    {
      label: "정상 운영",
      tone: "primary",
    },
    {
      label: "A동 12F 외장 시공",
      tone: "neutral",
    },
    {
      label: "오늘 마감 이슈 2건",
      tone: "alert",
    },
  ],
  quickLinks: [
    {
      label: "문서 생성",
      to: "/preview/documents",
      variant: "primary",
    },
    {
      label: "생성 문서",
      to: "/preview/generated-documents",
      variant: "secondary",
    },
  ],
  summaryMetrics: [
    {
      label: "누적 공정률",
      value: "67%",
      note: "지난주 대비 +4.2%p",
    },
    {
      label: "오늘 출력",
      value: "48명",
      note: "직영 18명 · 협력 30명",
    },
    {
      label: "활성 이슈",
      value: "5건",
      note: "오늘 조치 필요 2건",
    },
  ],
  overallProgress: {
    percent: 67,
    detail: "골조 완료 이후 외장과 내장이 동시에 속도를 내고 있어요.",
    plannedLabel: "준공 목표 2026.08.31",
    deltaLabel: "금주 계획 대비 +2.4%p",
  },
  overallComparisonChart: {
    id: "overall-progress",
    title: "전체 공정률",
    plannedSeries: [
      { label: "04.08", value: 17 },
      { label: "04.10", value: 18 },
      { label: "04.12", value: 20 },
      { label: "04.14", value: 23 },
      { label: "04.16", value: 25 },
      { label: "04.18", value: 26 },
      { label: "04.20", value: 26 },
      { label: "04.22", value: 27 },
    ],
    actualSeries: [
      { label: "04.08", value: 16 },
      { label: "04.10", value: 17 },
      { label: "04.12", value: 21 },
      { label: "04.14", value: 26 },
      { label: "04.16", value: 31 },
      { label: "04.18", value: 33 },
      { label: "04.20", value: 34 },
      { label: "04.22", value: 34 },
    ],
    plannedValueLabel: "27%",
    actualValueLabel: "34%",
  },
  currentProcess: {
    name: "철근 콘크리트 공정",
    windowLabel: "4.18 - 4.28",
    summary: "지하층 및 1층 구간 배근, 거푸집, 타설 진행",
  },
  currentProcessPoints: [
    {
      label: "04/18",
      value: 32,
      tone: "actual",
    },
    {
      label: "04/19",
      value: 46,
      tone: "actual",
    },
    {
      label: "04/20",
      value: 61,
      tone: "actual",
    },
    {
      label: "04/21",
      value: 82,
      tone: "actual",
    },
    {
      label: "04/22",
      value: 88,
      tone: "forecast",
    },
    {
      label: "04/23",
      value: 92,
      tone: "forecast",
    },
  ],
  currentComparisonChart: {
    id: "concrete-progress",
    title: "철근 콘크리트 공정률",
    plannedSeries: [
      { label: "04.08", value: 12 },
      { label: "04.10", value: 15 },
      { label: "04.12", value: 22 },
      { label: "04.14", value: 34 },
      { label: "04.16", value: 47 },
      { label: "04.18", value: 58 },
      { label: "04.20", value: 66 },
      { label: "04.22", value: 70 },
    ],
    actualSeries: [
      { label: "04.08", value: 9 },
      { label: "04.10", value: 11 },
      { label: "04.12", value: 17 },
      { label: "04.14", value: 28 },
      { label: "04.16", value: 42 },
      { label: "04.18", value: 53 },
      { label: "04.20", value: 60 },
      { label: "04.22", value: 64 },
    ],
    plannedValueLabel: "70%",
    actualValueLabel: "64%",
  },
  progressStages: [
    {
      label: "골조",
      progress: 100,
      caption: "완료",
      tone: "complete",
    },
    {
      label: "MEP",
      progress: 74,
      caption: "천장 배관 분기 진행",
      tone: "active",
    },
    {
      label: "외장",
      progress: 82,
      caption: "동측 패널 양중 진행",
      tone: "active",
    },
    {
      label: "내장",
      progress: 36,
      caption: "세대 바닥 미장 착수",
      tone: "upcoming",
    },
    {
      label: "준공 점검",
      progress: 12,
      caption: "사전 체크리스트 준비",
      tone: "upcoming",
    },
  ],
  todayWorkRawText: `
■ 철근콘크리트공사
- 지상4층 바닥보 거푸집 설치
- 지상3~4층 계단실 거푸집 설치
- 지하3층 방수턱 및 장비패드 철근가공 및 조립
- 지하1층 방수턱 거푸집 설치
- 지상3층 시스템동바리 설치

■ 시스템비계공사
- 지상3층 테라스 시스템비계 설치

■ 전기공사
- 지하층 입선작업

■ 설비공사
- 지하3층 위생배관 설치
- 지하3층 SP배관 시공

■ 직영공사
- 안전시설물 설치
- 현장정리
  `.trim(),
  workforceSnapshot: {
    totalLabel: "48명",
    note: "전일 대비 +6명",
    directLabel: "직영 18명",
    partnerLabel: "협력 30명",
  },
  workforceBreakdown: [
    {
      label: "형틀/목공",
      yesterdayCount: 8,
      todayCount: 10,
    },
    {
      label: "철근",
      yesterdayCount: 7,
      todayCount: 8,
    },
    {
      label: "외장",
      yesterdayCount: 10,
      todayCount: 12,
    },
    {
      label: "전기/설비",
      yesterdayCount: 9,
      todayCount: 9,
    },
    {
      label: "안전/정리",
      yesterdayCount: 8,
      todayCount: 9,
    },
  ],
  resourceItems: [
    {
      label: "레미콘",
      unit: "㎥",
      yesterdayValue: "52",
      todayValue: "64",
      status: "오전 타설 완료",
      group: "material",
    },
    {
      label: "철근",
      unit: "t",
      yesterdayValue: "10.8",
      todayValue: "12.4",
      status: "오후 반입분 확보",
      group: "material",
    },
    {
      label: "커튼월 패널",
      unit: "EA",
      yesterdayValue: "31",
      todayValue: "38",
      status: "동측 물량 우선 투입",
      group: "material",
    },
    {
      label: "고소작업대",
      unit: "대",
      yesterdayValue: "3",
      todayValue: "4",
      status: "1대 점검 중",
      group: "equipment",
    },
    {
      label: "타워크레인",
      unit: "대",
      yesterdayValue: "2",
      todayValue: "2",
      status: "정상 운용",
      group: "equipment",
    },
    {
      label: "발전기",
      unit: "대",
      yesterdayValue: "1",
      todayValue: "1",
      status: "예비 1대 대기",
      group: "equipment",
    },
  ],
  calendarMonthLabel: "3주 일정",
  calendarWeekdays: ["일", "월", "화", "수", "목", "금", "토"],
  calendarWeeks: [
    {
      label: "지난주",
      days: [
        { day: 12, tone: "default" },
        { day: 13, tone: "default" },
        { day: 14, tone: "default" },
        { day: 15, tone: "default" },
        { day: 16, tone: "default" },
        { day: 17, tone: "issue", agenda: "방수 자재 발주" },
        { day: 18, tone: "default" },
      ],
    },
    {
      label: "이번주",
      days: [
        { day: 19, tone: "default" },
        { day: 20, tone: "default" },
        { day: 21, tone: "default", agenda: "외장 패널 양중" },
        { day: 22, tone: "today", agenda: "지하층 배관 협의" },
        { day: 23, tone: "issue", agenda: "패널 12F 완료" },
        { day: 24, tone: "issue", agenda: "방수 자재 납기 확인" },
        { day: 25, tone: "default" },
      ],
    },
    {
      label: "다음주",
      days: [
        { day: 26, tone: "default" },
        { day: 27, tone: "default" },
        { day: 28, tone: "milestone", agenda: "내장 샘플 검토" },
        { day: 29, tone: "default" },
        { day: 30, tone: "default" },
        { day: 1, tone: "default", agenda: "노무 계획 조정" },
        { day: 2, tone: "default" },
      ],
    },
  ],
  todoItems: [
    {
      title: "방수 자재 납기 재확인",
      category: "자재",
      owner: "구매팀",
      dueLabel: "오늘 14:00",
      priority: "high",
    },
    {
      title: "외장 패널 설치 사진 검수",
      category: "품질",
      owner: "현장대리인",
      dueLabel: "오늘 16:30",
      priority: "medium",
    },
    {
      title: "전기실 안전통로 정리 요청",
      category: "안전",
      owner: "안전관리자",
      dueLabel: "오늘 18:00",
      priority: "high",
    },
    {
      title: "내장 샘플 회의 자료 공유",
      category: "일정",
      owner: "공무팀",
      dueLabel: "4월 28일",
      priority: "low",
    },
  ],
};
