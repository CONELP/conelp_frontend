import type { ServicePresentationSiteId } from "@/features/service-presentation-demo/model/service-presentation-demo.types";

export type DailyReportHomepageWorkSection = {
  name: string;
  items: string[];
};

export type DailyReportHomepagePhoto = {
  index: number;
  caption: string;
  filename: string;
};

export type DailyReportHomepagePayload = {
  normalized?: {
    today?: {
      sections?: DailyReportHomepageWorkSection[];
    };
    tomorrow?: {
      sections?: DailyReportHomepageWorkSection[];
    };
    photos?: DailyReportHomepagePhoto[];
  };
};

export type DailyReportHomepageImportConfig = {
  jsonPath: string;
  photoFolderPath: string;
};

const dailyReportHomepageImportConfigBySiteId: Partial<
  Record<ServicePresentationSiteId, DailyReportHomepageImportConfig>
> = {
  cheongun_church: {
    jsonPath: "data/청운교회/1. 작업일보/daily_20260502.json",
    photoFolderPath: "data/청운교회/1. 작업일보/청운_사진_260502",
  },
};

export function resolveDailyReportHomepageImportConfig(
  siteId: ServicePresentationSiteId | null | undefined,
) {
  return siteId ? dailyReportHomepageImportConfigBySiteId[siteId] ?? null : null;
}

export function toDemoDataUrl(path: string) {
  return `/${path.split("/").map(encodeURIComponent).join("/")}`;
}
