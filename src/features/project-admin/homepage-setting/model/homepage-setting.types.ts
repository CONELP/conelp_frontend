export type TomorrowWorkMode = 1 | 2;

export interface HomepageCredentials {
  id: string;
  password: string;
  url: string;
  safetyCheck: string;
  tomorrowWorkMode: TomorrowWorkMode;
}

export const HOMEPAGE_CREDENTIALS_KEY = "homepage-credentials";
