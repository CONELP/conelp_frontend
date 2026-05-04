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
  isStructure: boolean;
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
  isStructure: boolean;
  subWorkTypeId: DesktopScheduleSubWorkTypeId;
  subWorkTypeName: string;
  subWorkTypeColor: string | null;
}

export interface DesktopScheduleDivisionCreateRequest {
  name: string;
}

export interface DesktopScheduleWorkTypeCreateRequest {
  divisionId: DesktopScheduleDivisionId;
  name: string;
  isStructure: boolean;
}

export interface DesktopScheduleSubWorkTypeCreateRequest {
  workTypeId: DesktopScheduleWorkTypeId;
  name: string;
  color?: string | null;
}

export interface DesktopScheduleReferenceUpdateRequest {
  id?: number;
  name?: string;
  color?: string | null;
  isStructure?: boolean;
  parentId?: number;
  ids?: number[];
}

export interface DesktopScheduleMilestoneResponse {
  id: DesktopScheduleMilestoneId;
  date: string;
  name: string;
}

export interface DesktopScheduleMilestoneCreateRequest {
  date: string;
  name: string;
}

export interface DesktopScheduleMilestoneUpdateRequest {
  id: DesktopScheduleMilestoneId;
  date: string;
  name: string;
}

export interface DesktopScheduleComponentTypeGroup {
  componentDivisionId: number;
  componentTypeIds: number[];
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
  isWorkingOnHoliday: boolean;
  subWorkTypeId: number;
  division: string;
  workType: string;
  subWorkType: string;
  zoneIds: number[];
  zoneNames: string[];
  floorIds: number[];
  floorNames: string[];
  componentTypes: DesktopScheduleComponentTypeGroup[];
  positionY: number | null;
  annotation: string | null;
  photos?: DesktopScheduleWorkPhotoResponse[];
}

export interface DesktopScheduleWorkCreateRequest {
  startDate: string;
  workLeadTime: number;
  subWorkTypeId: number;
  scheduleVersionId: DesktopScheduleVersionId;
  annotation?: string;
}

export interface DesktopScheduleWorkUpdateItem {
  workId: DesktopScheduleWorkId;
  workName?: string;
  startDate?: string;
  workLeadTime?: number;
  subWorkTypeId?: number;
  positionY?: number;
  zoneIds?: number[];
  floorIds?: number[];
  componentTypes?: DesktopScheduleComponentTypeGroup[];
  annotation?: string;
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
