export interface User {
  id: string;
  userEmail: string;
  userName: string;
  systemRole: string;
  profileImageUrl: string | null;
  jobTitle: string | null;
  companyName: string | null;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  jobTitle: string | null;
  companyName: string | null;
}

export interface LoginCredentials {
  encryptedEmail: string;
  encryptedPassword: string;
}

export interface SignupCredentials {
  encryptedEmail: string;
  encryptedPassword: string;
  encryptedPasswordConfirm: string;
  userName: string;
  phoneNumber: string;
  jobTitle?: string;
  companyId?: string;
}

export interface SignupInput {
  email: string;
  password: string;
  passwordConfirm: string;
  userName: string;
  phoneNumber: string;
  jobTitle?: string;
  companyId?: string;
}

export type FieldErrors = Record<string, string>;

export interface ApiErrorBody {
  message?: string;
  error?: string;
  messages?: FieldErrors;
  details?: {
    blocked?: boolean;
    remainingSeconds?: number;
  };
}
