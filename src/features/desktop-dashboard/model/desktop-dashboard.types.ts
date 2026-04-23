export interface DashboardHeaderBadge {
  label: string;
  tone: "neutral" | "primary" | "alert";
}

export interface DashboardQuickLink {
  label: string;
  to: string;
  variant: "primary" | "secondary";
}

export interface DashboardSummaryMetric {
  label: string;
  value: string;
  note: string;
}

export interface DashboardComparisonPoint {
  label: string;
  value: number;
}

export interface DashboardComparisonChart {
  id: string;
  title: string;
  plannedSeries: DashboardComparisonPoint[];
  actualSeries: DashboardComparisonPoint[];
  plannedValueLabel: string;
  actualValueLabel: string;
}

export interface DashboardOverallProgress {
  percent: number;
  detail: string;
  plannedLabel: string;
  deltaLabel: string;
}

export interface DashboardProgressStage {
  label: string;
  progress: number;
  caption: string;
  tone: "complete" | "active" | "upcoming";
}

export interface DashboardProgressPoint {
  label: string;
  value: number;
  tone: "actual" | "forecast";
}

export interface DashboardCurrentProcess {
  name: string;
  windowLabel: string;
  summary: string;
}

export interface DashboardTodayWorkSection {
  title: string;
  tasks: string[];
}

export interface DashboardWorkforceItem {
  label: string;
  yesterdayCount: number;
  todayCount: number;
}

export interface DashboardWorkforceSnapshot {
  totalLabel: string;
  note: string;
  directLabel: string;
  partnerLabel: string;
}

export interface DashboardResourceItem {
  label: string;
  unit: string;
  yesterdayValue: string;
  todayValue: string;
  status: string;
  group: "material" | "equipment";
}

export interface DashboardCalendarDay {
  day: number | null;
  tone: "muted" | "default" | "today" | "issue" | "milestone";
  agenda?: string;
}

export interface DashboardCalendarWeek {
  label: string;
  days: DashboardCalendarDay[];
}

export interface DashboardTodoItem {
  title: string;
  category: string;
  owner: string;
  dueLabel: string;
  priority: "high" | "medium" | "low";
}

export interface DesktopDashboardSeed {
  siteName: string;
  siteChipLabel: string;
  siteSubtitle: string;
  updatedAtLabel: string;
  headerBadges: DashboardHeaderBadge[];
  quickLinks: DashboardQuickLink[];
  summaryMetrics: DashboardSummaryMetric[];
  overallProgress: DashboardOverallProgress;
  overallComparisonChart: DashboardComparisonChart;
  currentProcess: DashboardCurrentProcess;
  currentProcessPoints: DashboardProgressPoint[];
  currentComparisonChart: DashboardComparisonChart;
  progressStages: DashboardProgressStage[];
  todayWorkRawText: string;
  workforceSnapshot: DashboardWorkforceSnapshot;
  workforceBreakdown: DashboardWorkforceItem[];
  resourceItems: DashboardResourceItem[];
  calendarMonthLabel: string;
  calendarWeekdays: string[];
  calendarWeeks: DashboardCalendarWeek[];
  todoItems: DashboardTodoItem[];
}
