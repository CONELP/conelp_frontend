export interface RouteViewPayload {
  routeName?: unknown;
  routePath?: string;
}

type AnalyticsValue = string | number | boolean;
type AnalyticsPayload = Record<string, unknown>;
type AnalyticsResult = "success" | "fail" | "attempt";
type GtagArguments =
  | ["js", Date]
  | ["set", Record<string, unknown>]
  | ["config", string, Record<string, unknown>?]
  | ["event", string, Record<string, AnalyticsValue>?];

declare global {
  interface Window {
    dataLayer?: GtagArguments[];
    gtag?: (...args: GtagArguments) => void;
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() ?? "";
const ANALYTICS_DEBUG_STORAGE_KEY = "conelp.analytics.debug";
const MAX_STRING_PARAM_LENGTH = 120;

let isGtagInitialized = false;
let currentUserId: string | null = null;

function isBrowserEnvironment() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function readStoredDebugFlag() {
  if (!isBrowserEnvironment()) {
    return false;
  }

  try {
    return window.localStorage.getItem(ANALYTICS_DEBUG_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function shouldDebugAnalytics() {
  return import.meta.env.DEV || readStoredDebugFlag();
}

function toAnalyticsValue(value: unknown): AnalyticsValue | undefined {
  if (typeof value === "string") {
    return value.length > MAX_STRING_PARAM_LENGTH
      ? value.slice(0, MAX_STRING_PARAM_LENGTH)
      : value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return undefined;
}

function normalizePayload(payload: AnalyticsPayload = {}) {
  const normalized: Record<string, AnalyticsValue> = {};

  Object.entries(payload).forEach(([key, value]) => {
    const nextValue = toAnalyticsValue(value);
    if (nextValue !== undefined) {
      normalized[key] = nextValue;
    }
  });

  if (currentUserId) {
    normalized.user_id = currentUserId;
  }

  if (shouldDebugAnalytics()) {
    normalized.debug_mode = true;
  }

  return normalized;
}

function ensureGtag() {
  if (isGtagInitialized || !GA_MEASUREMENT_ID || !isBrowserEnvironment()) {
    return;
  }

  isGtagInitialized = true;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    ((...args: GtagArguments) => {
      window.dataLayer?.push(args);
    });

  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false,
    ...(currentUserId ? { user_id: currentUserId } : {}),
    ...(shouldDebugAnalytics() ? { debug_mode: true } : {}),
  });

  if (document.querySelector("script[data-conelp-ga]")) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
    GA_MEASUREMENT_ID,
  )}`;
  script.dataset.conelpGa = GA_MEASUREMENT_ID;
  document.head.appendChild(script);
}

function syncUserIdToGtag() {
  if (!GA_MEASUREMENT_ID || !isBrowserEnvironment()) {
    return;
  }

  ensureGtag();
  window.gtag?.("set", {
    user_id: currentUserId,
  });
  window.gtag?.("config", GA_MEASUREMENT_ID, {
    send_page_view: false,
    user_id: currentUserId,
    ...(shouldDebugAnalytics() ? { debug_mode: true } : {}),
  });
}

function mirrorEvent(eventName: string, payload: Record<string, AnalyticsValue>) {
  if (!shouldDebugAnalytics()) {
    return;
  }

  console.info("[analytics]", eventName, payload);
}

function trackEvent(eventName: string, payload: AnalyticsPayload = {}) {
  const normalizedPayload = normalizePayload(payload);
  mirrorEvent(eventName, normalizedPayload);

  if (!GA_MEASUREMENT_ID || !isBrowserEnvironment()) {
    return;
  }

  ensureGtag();
  window.gtag?.("event", eventName, normalizedPayload);
}

function normalizeRouteName(routeName: unknown) {
  if (typeof routeName === "string") {
    return routeName;
  }

  if (typeof routeName === "symbol") {
    return routeName.description;
  }

  return undefined;
}

function resolvePageLocation(routePath?: string) {
  if (!routePath || !isBrowserEnvironment()) {
    return undefined;
  }

  return `${window.location.origin}${routePath}`;
}

export const analyticsClient = {
  setUserId(userId: string | number | null | undefined) {
    const nextUserId =
      typeof userId === "string" || typeof userId === "number"
        ? toAnalyticsValue(String(userId)) ?? null
        : null;

    currentUserId = typeof nextUserId === "string" ? nextUserId : null;
    syncUserIdToGtag();
  },
  trackRouteView(payload: RouteViewPayload) {
    const routeName = normalizeRouteName(payload.routeName);

    trackEvent("route_view", {
      route_name: routeName,
      page_title: routeName,
      page_path: payload.routePath,
      page_location: resolvePageLocation(payload.routePath),
    });
  },
  trackError(feature: string, statusGroup: string, meta?: Record<string, unknown>) {
    trackEvent("app_error", {
      feature,
      status_group: statusGroup,
      ...meta,
    });
  },
  track(event: string, props?: Record<string, unknown>) {
    trackEvent(event, props);
  },
  trackAction(
    feature: string,
    action: string,
    result: AnalyticsResult,
    meta?: Record<string, unknown>,
  ) {
    trackEvent("app_action", {
      feature,
      action,
      result,
      ...meta,
    });
  },
};
