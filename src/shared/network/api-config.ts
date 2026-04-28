import { appConfig } from "@/app/bootstrap/config";

export const apiBaseUrl = appConfig.apiBaseUrl;

export function toApiUrl(path: string) {
  return `${apiBaseUrl}/${path.replace(/^\//, "")}`;
}
