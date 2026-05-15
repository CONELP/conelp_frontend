export interface RouteViewPayload {
  routeName?: unknown;
  routePath?: string;
}

export const analyticsClient = {
  trackRouteView(_payload: RouteViewPayload) {},
  trackError(_feature: string, _statusGroup: string, _meta?: Record<string, unknown>) {},
  track(_event: string, _props?: Record<string, unknown>) {},
  trackAction(_feature: string, _action: string, _result: "success" | "fail", _meta?: Record<string, unknown>) {},
};
