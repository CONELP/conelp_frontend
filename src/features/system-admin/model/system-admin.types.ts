// Company
export interface Company {
  id: string;
  companyName: string;
  companyAddress: string | null;
  registrationNumber: string | null;
  phoneNumber: string | null;
  bankingAccount: string | null;
  displayName: string | null;
}

export interface CreateCompanyPayload {
  name: string;
  address?: string;
  registrationNumber?: string;
  phoneNumber?: string;
  bankingAccount?: string;
  displayName?: string;
}

// Project
export interface Project {
  id: string;
  projectName: string;
  siteAddress: string | null;
  startDate: string;
  completionDate: string;
  weatherNx: number | null;
  weatherNy: number | null;
}

export interface CreateProjectPayload {
  name: string;
  address?: string;
  startDate: string;
  completionDate: string;
  weatherNx?: number;
  weatherNy?: number;
}

// Roles
export interface SystemRole {
  id: number;
  name: string;
}

export interface CompanyRole {
  id: number;
  name: string;
}

// WorkType
export interface WorkType {
  id: number;
  name: string;
}

// Company-Project Mapping
export interface CompanyToProject {
  id: number;
  companyId: string;
  companyName: string;
  projectId: string;
  projectName: string;
  roleId: number;
  roleName: string;
  workTypeId: number | null;
  workTypeName: string | null;
}

export interface CreateCompanyToProjectPayload {
  companyId: string;
  projectId: string;
  roleId: number;
  workTypeId?: number;
}

// User-Project Mapping
export interface UserToProject {
  id: number;
  userId: string;
  userName: string;
  userEmail: string;
  projectId: string;
  projectName: string;
  companyToProjectId: number;
  companyName: string;
  projectRole: string | null;
  systemRoleId: number;
  systemRoleName: string;
}

export interface CreateUserToProjectPayload {
  userId: string;
  projectId: string;
  companyToProjectId: number;
  projectRole?: string;
  systemRoleId: number;
}

// User
export interface User {
  id: string;
  userEmail: string;
  userName: string;
  phoneNumber: string;
  companyId: string;
  companyName: string;
  jobTitle: string | null;
  systemRole: string;
  currentStatus: string;
  createdAt: string;
}

export interface UpdateUserPayload {
  userName?: string | null;
  phoneNumber?: string | null;
  jobTitle?: string | null;
  companyId?: string | null;
}

export interface UpdateCompanyPayload {
  name: string;
  address?: string;
  registrationNumber?: string;
  phoneNumber?: string;
  bankingAccount?: string;
  displayName?: string;
}

export interface UpdateProjectPayload {
  name: string;
  address?: string;
  startDate: string;
  completionDate: string;
  weatherNx?: number;
  weatherNy?: number;
}

export interface UpdateCompanyToProjectPayload {
  roleId: number;
  workTypeId?: number;
}

export interface UpdateUserToProjectPayload {
  companyToProjectId: number;
  projectRole?: string;
  systemRoleId: number;
}

// API Key
export type ApiKeyScope = "READ_ONLY" | "READ_WRITE";

export interface CreateApiKeyPayload {
  name: string;
  comId: string;
  projectId: string;
  scope: ApiKeyScope;
  expiresAt: string | null;
  allowedIps: string[] | null;
  rateLimit: number | null;
}

export interface CreateApiKeyResponse {
  apiKeyId: string;
  plaintextKey: string;
  keyPrefix: string;
  name: string;
  scope: ApiKeyScope;
  projectId: string;
  expiresAt: string | null;
}

export interface ApiKeyMasked {
  apiKeyId: string;
  keyPrefix: string;
  keyLast4: string;
  name: string;
  comId: string;
  scope: ApiKeyScope;
  projectId: string;
  expiresAt: string | null;
  allowedIps: string[] | null;
  rateLimit: number | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}
