export { systemAdminApi } from "@/features/system-admin/services/system-admin.api";
export { superDocumentApi } from "@/features/system-admin/services/super-document.api";

export type {
  SuperDocStatus,
  SuperDocType,
  SuperDocumentJob,
  SuperDocumentJobListParams,
  SuperDocumentSource,
  SuperDocumentSourceLine,
  SuperDocumentSourcePhoto,
} from "@/features/system-admin/model/super-document.types";

export type {
  ApiKeyMasked,
  ApiKeyScope,
  Company,
  CompanyRole,
  CompanyToProject,
  CreateApiKeyPayload,
  CreateApiKeyResponse,
  CreateCompanyPayload,
  CreateCompanyToProjectPayload,
  CreateProjectPayload,
  CreateUserToProjectPayload,
  Project,
  SystemRole,
  UpdateCompanyPayload,
  UpdateCompanyToProjectPayload,
  UpdateProjectPayload,
  UpdateUserPayload,
  UpdateUserToProjectPayload,
  User,
  UserToProject,
  WorkType,
} from "@/features/system-admin/model/system-admin.types";

export { default as SystemAdminLayout } from "@/features/system-admin/ui/SystemAdminLayout.vue";
export { default as AdminPlaceholderPage } from "@/features/system-admin/ui/components/AdminPlaceholderPage.vue";
