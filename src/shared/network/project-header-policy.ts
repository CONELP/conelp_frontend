const PROJECT_HEADER_OPTIONAL_PATHS = [
  "/auth/me",
  "/auth/updateUser",
  "/project/getProjectList",
  "/company/getCompanyList",
  "/file/downloadFile",
  "/file/convertFiles",
  "/guide/endpoints",
] as const;

function normalizePath(rawPath: string | undefined | null): string {
  if (!rawPath) return "";
  const withoutQuery = rawPath.split("?")[0] ?? "";
  if (!withoutQuery) return "";
  try {
    const url = new URL(withoutQuery, "http://placeholder.local");
    return url.pathname.replace(/^\/api(?=\/)/, "");
  } catch {
    return withoutQuery.replace(/^\/api(?=\/)/, "");
  }
}

export function shouldSendProjectHeader(rawPath: string | undefined | null): boolean {
  const path = normalizePath(rawPath);
  if (!path) return true;
  return !PROJECT_HEADER_OPTIONAL_PATHS.some((optional) => path === optional);
}
