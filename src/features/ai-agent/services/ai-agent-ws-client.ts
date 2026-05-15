import { authApi } from "@/features/auth/services/auth-api";
import { appConfig } from "@/app/bootstrap/config";
import { getAccessToken } from "@/shared/network/access-token";
import type {
  AiAgentStore,
} from "@/features/ai-agent/state/useAiAgentStore";
import type { WsEnvelope } from "@/features/ai-agent/model/ai-agent.types";

const MAX_RECONNECT_DELAY_MS = 30_000;
const BASE_RECONNECT_DELAY_MS = 1_000;

function jitter(value: number): number {
  const factor = 0.8 + Math.random() * 0.4;
  return Math.round(value * factor);
}

function deriveWsUrl(): string {
  if (appConfig.wsUrl) return appConfig.wsUrl;

  const apiBase = appConfig.apiBaseUrl;
  if (/^https?:\/\//i.test(apiBase)) {
    const url = new URL(apiBase);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = url.pathname.replace(/\/api\/?$/, "") + "/ws/chat";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/chat`;
}

class AiAgentWsClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private attempts = 0;
  private explicitClose = false;
  private store: AiAgentStore | null = null;
  private didTryRefresh = false;
  private hasOpenedOnce = false;

  connect(store: AiAgentStore): void {
    this.store = store;
    this.explicitClose = false;
    this.openSocket();
  }

  disconnect(): void {
    this.explicitClose = true;
    this.clearReconnectTimer();
    this.attempts = 0;
    this.didTryRefresh = false;
    this.hasOpenedOnce = false;

    if (this.socket) {
      try {
        this.socket.close(1000, "logout");
      } catch {
        // ignore
      }
      this.socket = null;
    }

    this.store?.setConnectionStatus("closed");
    this.store?.resetReconnect();
  }

  manualReconnect(): void {
    if (!this.store) return;
    this.clearReconnectTimer();
    this.attempts = 0;
    this.openSocket();
  }

  private openSocket(): void {
    if (!this.store) return;

    const token = getAccessToken();
    if (!token) {
      this.store.setConnectionStatus("closed");
      return;
    }

    this.store.setConnectionStatus(
      this.hasOpenedOnce ? "reconnecting" : "connecting",
    );

    const url = `${deriveWsUrl()}?token=${encodeURIComponent(token)}`;
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;

    socket.addEventListener("open", () => this.handleOpen());
    socket.addEventListener("message", (e) => this.handleMessage(e));
    socket.addEventListener("close", (e) => this.handleClose(e));
    socket.addEventListener("error", () => {
      // close will fire after error; defer handling there
    });
  }

  private handleOpen(): void {
    if (!this.store) return;
    this.hasOpenedOnce = true;
    this.attempts = 0;
    this.didTryRefresh = false;
    this.store.setConnectionStatus("open");
    this.store.resetReconnect();
  }

  private handleMessage(event: MessageEvent): void {
    if (!this.store) return;
    if (typeof event.data !== "string") return;

    try {
      const envelope = JSON.parse(event.data) as WsEnvelope;
      this.store.handleWsEvent(envelope);
    } catch {
      // malformed frame — ignore
    }
  }

  private handleClose(event: CloseEvent): void {
    this.socket = null;

    if (this.explicitClose || !this.store) {
      this.store?.setConnectionStatus("closed");
      return;
    }

    const looksLikeAuthFail =
      !this.hasOpenedOnce && event.code === 1006 && !this.didTryRefresh;

    if (looksLikeAuthFail) {
      this.didTryRefresh = true;
      this.store.setConnectionStatus("reconnecting");
      void authApi
        .refresh()
        .then(() => {
          this.attempts = 0;
          this.openSocket();
        })
        .catch(() => {
          this.scheduleReconnect();
        });
      return;
    }

    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (!this.store || this.explicitClose) return;

    this.clearReconnectTimer();
    this.store.setConnectionStatus("reconnecting");
    this.store.incrementReconnectAttempts();

    const delay = jitter(
      Math.min(
        MAX_RECONNECT_DELAY_MS,
        BASE_RECONNECT_DELAY_MS * 2 ** this.attempts,
      ),
    );
    this.attempts += 1;

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export const aiAgentWsClient = new AiAgentWsClient();
