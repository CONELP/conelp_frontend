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
type GtagDataLayerCommand = GtagArguments | IArguments;

declare global {
  interface Window {
    dataLayer?: GtagDataLayerCommand[];
    gtag?: (...args: GtagArguments) => void;
  }
}

const GA_TAG_ID = import.meta.env.VITE_GA_TAG_ID?.trim() ?? "";
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() ?? "";
const GA_LOADER_ID = GA_TAG_ID || GA_MEASUREMENT_ID;
const GA_CONFIG_ID = GA_TAG_ID || GA_MEASUREMENT_ID;
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

function hasAnalyticsConfig() {
  return !!GA_LOADER_ID && !!GA_CONFIG_ID;
}

function hasCurrentGtagScript() {
  return Array.from(document.querySelectorAll<HTMLScriptElement>("script[data-conelp-ga]")).some(
    (script) => script.dataset.conelpGa === GA_LOADER_ID,
  );
}

function createGtagQueue() {
  return function gtag(..._args: GtagArguments) {
    window.dataLayer?.push(arguments);
  };
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
  if (isGtagInitialized || !hasAnalyticsConfig() || !isBrowserEnvironment()) {
    return;
  }

  isGtagInitialized = true;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = window.gtag ?? createGtagQueue();

  window.gtag("js", new Date());
  window.gtag("config", GA_CONFIG_ID, {
    send_page_view: false,
    ...(currentUserId ? { user_id: currentUserId } : {}),
    ...(shouldDebugAnalytics() ? { debug_mode: true } : {}),
  });

  if (hasCurrentGtagScript()) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
    GA_LOADER_ID,
  )}`;
  script.dataset.conelpGa = GA_LOADER_ID;
  document.head.appendChild(script);
}

function syncUserIdToGtag() {
  if (!hasAnalyticsConfig() || !isBrowserEnvironment()) {
    return;
  }

  ensureGtag();
  window.gtag?.("set", {
    user_id: currentUserId,
  });
  window.gtag?.("config", GA_CONFIG_ID, {
    send_page_view: false,
    user_id: currentUserId,
    ...(shouldDebugAnalytics() ? { debug_mode: true } : {}),
  });
}

function trackEvent(eventName: string, payload: AnalyticsPayload = {}) {
  const normalizedPayload = normalizePayload(payload);

  if (!hasAnalyticsConfig() || !isBrowserEnvironment()) {
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
    const pagePayload = {
      page_title: routeName,
      page_path: payload.routePath,
      page_location: resolvePageLocation(payload.routePath),
    };

    trackEvent("page_view", pagePayload);

    trackEvent("route_view", {
      route_name: routeName,
      ...pagePayload,
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
