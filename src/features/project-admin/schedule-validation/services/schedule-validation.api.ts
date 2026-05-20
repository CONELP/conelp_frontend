import { apiFetch } from "@/shared/network/api-client";

export interface ScheduleValidationRule {
  workTypeId: number;
  siteRule: string | null;
  companyRule: string | null;
}

export interface ScheduleValidationRuleUpsertBody {
  workTypeId?: number;
  siteRule?: string | null;
  companyRule?: string | null;
}

export interface ScheduleValidationViolation {
  workId: number;
  detail: string;
}

export interface ScheduleValidationResponse {
  scheduleVersionId: number;
  violations: ScheduleValidationViolation[];
  failedWorkTypeIds: number[];
}

function encodePathSegment(value: string | number) {
  return encodeURIComponent(String(value));
}

export const scheduleValidationApi = {
  // POST /api/scheduleValidationRule/createRule
  createRule(body: {
    workTypeId: number;
    siteRule?: string | null;
    companyRule?: string | null;
  }) {
    return apiFetch<ScheduleValidationRule>("/scheduleValidationRule/createRule", {
      method: "POST",
      body: body as unknown as Record<string, unknown>,
    });
  },

  // GET /api/scheduleValidationRule/getRuleList
  getRuleList() {
    return apiFetch<ScheduleValidationRule[]>("/scheduleValidationRule/getRuleList");
  },

  // GET /api/scheduleValidationRule/getRule/{workTypeId}
  getRule(workTypeId: number) {
    return apiFetch<ScheduleValidationRule>(
      `/scheduleValidationRule/getRule/${encodePathSegment(workTypeId)}`,
    );
  },

  // PUT /api/scheduleValidationRule/updateRule/{workTypeId}
  updateRule(
    workTypeId: number,
    body: { siteRule?: string | null; companyRule?: string | null },
  ) {
    return apiFetch<ScheduleValidationRule>(
      `/scheduleValidationRule/updateRule/${encodePathSegment(workTypeId)}`,
      {
        method: "PUT",
        body: body as unknown as Record<string, unknown>,
      },
    );
  },

  // POST /api/scheduleValidation/validateSchedule
  validateSchedule(scheduleVersionId: number) {
    return apiFetch<ScheduleValidationResponse>("/scheduleValidation/validateSchedule", {
      method: "POST",
      body: { scheduleVersionId } as unknown as Record<string, unknown>,
    });
  },
};
