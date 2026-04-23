import type {
  DesktopScheduleMilestone,
  DesktopScheduleSourceBundle,
  DesktopScheduleSourceLink,
  DesktopScheduleSourceTask,
} from "@/features/desktop-schedule/model/desktop-schedule.types";

function durationBetweenInclusive(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

function createTask(
  workId: number,
  name: string,
  startDate: string,
  endDate: string,
  division: string,
  workType: string,
  subWorkType: string,
  subWorkTypeId: number,
  positionY: number,
  isWorkingOnHoliday = false,
  annotation = "",
): DesktopScheduleSourceTask {
  return {
    workId,
    name,
    startDate,
    endDate,
    durationDays: durationBetweenInclusive(startDate, endDate),
    division,
    workType,
    subWorkType,
    subWorkTypeId,
    positionY,
    isWorkingOnHoliday,
    annotation,
  };
}

function createLink(
  pathId: number,
  sourceWorkId: number,
  targetWorkId: number,
  color: string,
  critical: boolean,
  lagDays: number | null = null,
  pathName: string | null = null,
): DesktopScheduleSourceLink {
  return {
    pathId,
    sourceWorkId,
    targetWorkId,
    lagDays,
    pathName,
    color,
    critical,
  };
}

const tasks: DesktopScheduleSourceTask[] = [
  createTask(
    101,
    "현장 가설 울타리",
    "2026-01-06",
    "2026-01-10",
    "건축",
    "가설공사",
    "가설 시설",
    11,
    10,
  ),
  createTask(
    102,
    "가설 전기 인입",
    "2026-01-12",
    "2026-01-16",
    "전기",
    "가설공사",
    "가설 시설",
    11,
    12,
  ),
  createTask(
    103,
    "터파기",
    "2026-01-19",
    "2026-01-30",
    "건축",
    "토공사",
    "토공",
    21,
    20,
  ),
  createTask(
    104,
    "흙막이 보강",
    "2026-01-26",
    "2026-02-06",
    "건축",
    "토공사",
    "토공",
    21,
    24,
  ),
  createTask(
    105,
    "버림 콘크리트",
    "2026-02-09",
    "2026-02-12",
    "건축",
    "철근 콘크리트",
    "기초 공사",
    31,
    30,
    true,
  ),
  createTask(
    106,
    "기초 철근 배근",
    "2026-02-16",
    "2026-02-27",
    "건축",
    "철근 콘크리트",
    "기초 공사",
    31,
    32,
  ),
  createTask(
    107,
    "기초 콘크리트 타설",
    "2026-03-02",
    "2026-03-05",
    "건축",
    "철근 콘크리트",
    "기초 공사",
    31,
    34,
    true,
  ),
  createTask(
    108,
    "지하층 기둥·보 배근",
    "2026-03-09",
    "2026-03-23",
    "건축",
    "철근 콘크리트",
    "골조 공사",
    32,
    40,
  ),
  createTask(
    109,
    "지하층 콘크리트 타설",
    "2026-03-24",
    "2026-03-28",
    "건축",
    "철근 콘크리트",
    "골조 공사",
    32,
    42,
    true,
  ),
  createTask(
    110,
    "1층 슬래브 배근",
    "2026-04-06",
    "2026-04-20",
    "건축",
    "철근 콘크리트",
    "골조 공사",
    32,
    44,
  ),
  createTask(
    111,
    "1층 슬래브 콘크리트 타설",
    "2026-04-21",
    "2026-04-25",
    "건축",
    "철근 콘크리트",
    "골조 공사",
    32,
    46,
    true,
  ),
  createTask(
    112,
    "지하층 배관 매립",
    "2026-04-13",
    "2026-04-30",
    "설비",
    "설비공사",
    "배관",
    41,
    54,
  ),
  createTask(
    113,
    "창호 프레임 시공",
    "2026-05-11",
    "2026-05-28",
    "건축",
    "외장공사",
    "창호",
    51,
    62,
  ),
  createTask(
    114,
    "경량 벽체 시공",
    "2026-06-01",
    "2026-06-19",
    "건축",
    "마감공사",
    "벽체",
    61,
    70,
  ),
  createTask(
    115,
    "천장 전기 배선",
    "2026-07-01",
    "2026-07-15",
    "전기",
    "전기공사",
    "배선",
    71,
    80,
  ),
];

const links: DesktopScheduleSourceLink[] = [
  createLink(1001, 101, 102, "#6b7280", false, 0, "현장 준비"),
  createLink(1002, 102, 103, "#cb3a31", true, 0, "토공 주경로"),
  createLink(1002, 103, 105, "#cb3a31", true, 0, "토공 주경로"),
  createLink(1003, 104, 105, "#1f8a70", false, 1, "보강 여유"),
  createLink(1002, 105, 106, "#cb3a31", true, 0, "토공 주경로"),
  createLink(1002, 106, 107, "#cb3a31", true, 0, "토공 주경로"),
  createLink(1002, 107, 108, "#cb3a31", true, 0, "골조 주경로"),
  createLink(1002, 108, 109, "#cb3a31", true, 0, "골조 주경로"),
  createLink(1002, 109, 110, "#cb3a31", true, 0, "골조 주경로"),
  createLink(1002, 110, 111, "#cb3a31", true, 0, "골조 주경로"),
  createLink(1004, 109, 112, "#4661e6", false, 0, "설비 선행"),
  createLink(1005, 111, 113, "#1f8a70", false, 3, "외장 착수"),
  createLink(1006, 112, 114, "#6b7280", false, 2, "마감 준비"),
  createLink(1007, 114, 115, "#6b7280", false, 0, "전기 마감"),
];

const milestones: DesktopScheduleMilestone[] = [
  {
    id: "milestone-1",
    date: "2026-03-05",
    label: "기초 타설",
    rowId: null,
  },
  {
    id: "milestone-2",
    date: "2026-03-28",
    label: "지하층 타설",
    rowId: null,
  },
  {
    id: "milestone-3",
    date: "2026-04-25",
    label: "1층 슬래브 타설",
    rowId: null,
  },
  {
    id: "milestone-4",
    date: "2026-05-11",
    label: "창호 공정 착수",
    rowId: null,
  },
];

export const desktopScheduleSeed: {
  sourceBundle: DesktopScheduleSourceBundle;
  milestones: DesktopScheduleMilestone[];
} = {
  sourceBundle: {
    tasks,
    links,
    source: "mock-seed",
  },
  milestones,
};
