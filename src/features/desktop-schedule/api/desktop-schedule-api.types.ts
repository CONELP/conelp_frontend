export type DesktopScheduleProjectId = string;
export type DesktopScheduleVersionId = number;
export type DesktopScheduleWorkId = number;
export type DesktopScheduleWorkDepId = number;
export type DesktopScheduleDivisionId = number;
export type DesktopScheduleWorkTypeId = number;
export type DesktopScheduleSubWorkTypeId = number;
export type DesktopScheduleMilestoneId = number;

export interface DesktopScheduleProjectResponse {
  id: DesktopScheduleProjectId;
  projectName: string;
  startDate: string;
  completionDate: string;
}

export interface DesktopScheduleVersionResponse {
  id: DesktopScheduleVersionId;
  versionName: string;
  isMain: boolean;
  setMainAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface DesktopScheduleVersionCreateRequest {
  versionName: string;
}

export interface DesktopScheduleVersionUpdateRequest {
  versionName?: string | null;
}

export interface DesktopScheduleCalendarDateResponse {
  date: string;
  dayOfWeek: number;
  weekNumber: number;
  isHoliday: boolean;
  isHolManual: boolean;
  holidayName: string | null;
  isActivated: boolean;
  deactivatedReason: string | null;
  weather: string | null;
  minTemperature: number | null;
  maxTemperature: number | null;
}

export interface DesktopScheduleCalendarResponse {
  projectStartDate: string;
  projectEndDate: string;
  dates: DesktopScheduleCalendarDateResponse[];
}

export interface DesktopScheduleDivisionResponse {
  id: DesktopScheduleDivisionId;
  name: string;
}

export interface DesktopScheduleWorkTypeResponse {
  id: DesktopScheduleWorkTypeId;
  name: string;
  divisionId: DesktopScheduleDivisionId;
}

export interface DesktopScheduleSubWorkTypeResponse {
  id: DesktopScheduleSubWorkTypeId;
  name: string;
  workTypeId: DesktopScheduleWorkTypeId;
  color: string | null;
}

export interface DesktopScheduleReferenceHierarchyItem {
  divisionId: DesktopScheduleDivisionId;
  divisionName: string;
  workTypeId: DesktopScheduleWorkTypeId;
  workTypeName: string;
  subWorkTypeId: DesktopScheduleSubWorkTypeId;
  subWorkTypeName: string;
  subWorkTypeColor: string | null;
}

export interface DesktopScheduleDivisionCreateRequest {
  scheduleVersionId: DesktopScheduleVersionId;
  name: string;
}

export interface DesktopScheduleWorkTypeCreateRequest {
  scheduleVersionId: DesktopScheduleVersionId;
  divisionId: DesktopScheduleDivisionId;
  name: string;
}

export interface DesktopScheduleSubWorkTypeCreateRequest {
  scheduleVersionId: DesktopScheduleVersionId;
  workTypeId: DesktopScheduleWorkTypeId;
  name: string;
  color?: string | null;
}

export interface DesktopScheduleReferenceUpdateRequest {
  scheduleVersionId?: DesktopScheduleVersionId;
  id?: number;
  name?: string;
  color?: string | null;
  parentId?: number;
  ids?: number[];
}

export interface DesktopScheduleMilestoneResponse {
  id: DesktopScheduleMilestoneId;
  date: string;
  name: string;
}

export interface DesktopScheduleMilestoneCreateRequest {
  scheduleVersionId: DesktopScheduleVersionId;
  date: string;
  name: string;
}

export interface DesktopScheduleMilestoneUpdateRequest {
  scheduleVersionId: DesktopScheduleVersionId;
  id: DesktopScheduleMilestoneId;
  date: string;
  name: string;
}

export interface DesktopScheduleWorkPhotoResponse {
  photoId: number;
  url: string;
  thumbnailUrl: string;
  description: string | null;
}

export interface DesktopScheduleWorkResponse {
  workId: DesktopScheduleWorkId;
  projectId: DesktopScheduleProjectId;
  workName: string;
  startDate: string;
  workLeadTime: number;
  completionDate: string;
  subWorkTypeId: number;
  division: string;
  workType: string;
  subWorkType: string;
  progress?: number | null;
  photos?: DesktopScheduleWorkPhotoResponse[];
}

export interface DesktopScheduleExportRequest {
  scheduleVersionId: DesktopScheduleVersionId;
  excludedSubWorkTypeIds: number[];
}

export interface DesktopScheduleWorkCreateRequest {
  startDate: string;
  workLeadTime: number;
  subWorkTypeId: number;
  scheduleVersionId: DesktopScheduleVersionId;
}

export interface DesktopScheduleWorkUpdateItem {
  workId: DesktopScheduleWorkId;
  workName?: string;
  startDate?: string;
  workLeadTime?: number;
  subWorkTypeId?: number;
}

export interface DesktopScheduleWorkUpdateRequest {
  items: DesktopScheduleWorkUpdateItem[];
}

export interface DesktopScheduleWorkDepResponse {
  id: DesktopScheduleWorkDepId;
  sourceWorkId: DesktopScheduleWorkId;
  targetWorkId: DesktopScheduleWorkId;
  lagDays: number;
  scheduleVersionId: DesktopScheduleVersionId;
}

export interface DesktopScheduleWorkDepCreateRequest {
  sourceWorkId: DesktopScheduleWorkId;
  targetWorkId: DesktopScheduleWorkId;
  lagDays: number;
  scheduleVersionId: DesktopScheduleVersionId;
}

export interface DesktopScheduleWorkDepUpdateRequest {
  lagDays: number;
}

export interface DesktopScheduleMutationResponse {
  updatedWorks: DesktopScheduleWorkResponse[];
  updatedWorkDeps: DesktopScheduleWorkDepResponse[];
}

export interface DesktopScheduleWorkPeriodQuery {
  scheduleVersionId: DesktopScheduleVersionId;
  startDate: string;
  endDate: string;
}

export interface DesktopScheduleBootstrapOptions {
  projectId?: DesktopScheduleProjectId;
  scheduleVersionId?: DesktopScheduleVersionId;
  persistSelection?: boolean;
  period?: {
    startDate: string;
    endDate: string;
  };
}

export interface DesktopScheduleBootstrapData {
  projects: DesktopScheduleProjectResponse[];
  selectedProject: DesktopScheduleProjectResponse;
  scheduleVersions: DesktopScheduleVersionResponse[];
  selectedScheduleVersion: DesktopScheduleVersionResponse;
  calendar: DesktopScheduleCalendarResponse;
  workHierarchy: DesktopScheduleReferenceHierarchyItem[];
  works: DesktopScheduleWorkResponse[];
  workDeps: DesktopScheduleWorkDepResponse[];
  milestones: DesktopScheduleMilestoneResponse[];
}

export type DesktopScheduleApiLoadStatus = "idle" | "loading" | "success" | "error";

export interface DesktopScheduleApiLoadState<TData> {
  status: DesktopScheduleApiLoadStatus;
  data: TData | null;
  error: Error | null;
}
