/**
 * HONK Windows Local Agent Client Bridge
 * Connects browser UI directly to the Local Honk Windows Agent running at http://127.0.0.1:3001
 * or proxies via /api/device/ endpoints.
 */

export interface WindowsAgentStatus {
  connected: boolean;
  agentVersion?: string;
  isPaired?: boolean;
  pairingToken?: string | null;
  os?: string;
  deviceName?: string;
  lastSeen?: number;
  supportedCapabilities?: string[];
  latencyMs?: number;
  error?: string;
}

export interface WindowsCommandRequest {
  action:
    | 'OPEN_APPLICATION'
    | 'OPEN_WEBSITE'
    | 'OPEN_FILE'
    | 'OPEN_FOLDER'
    | 'STOP_ALL_ACTIONS'
    | 'open_application'
    | 'focus_window'
    | 'type_text'
    | 'click_element'
    | 'read_ui_tree'
    | 'close_application';
  target?: string;
  payload?: Record<string, unknown>;
  userApproved?: boolean;
}

export interface WindowsCommandResponse {
  requestId: string;
  action: string;
  target?: string;
  success: boolean;
  verified: boolean;
  details?: string;
  error?: string;
  latencyMs: number;
  timestamp: number;
}

export class WindowsAgentClient {
  private static instance: WindowsAgentClient;
  private localAgentUrl = 'http://127.0.0.1:3001';
  private pairingToken: string | null = null;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): WindowsAgentClient {
    if (!WindowsAgentClient.instance) {
      WindowsAgentClient.instance = new WindowsAgentClient();
    }
    return WindowsAgentClient.instance;
  }

  /**
   * Ping and check connection status with Local Agent or Server Proxy
   */
  public async checkStatus(): Promise<WindowsAgentStatus> {
    const t0 = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      // Try local agent directly first
      let res: Response;
      try {
        res = await fetch(`${this.localAgentUrl}/api/status`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
      } catch {
        // Fallback to server proxy
        res = await fetch('/api/device/status', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      if (!res.ok) {
        this.isConnected = false;
        return { connected: false, error: `Local agent returned status ${res.status}` };
      }

      const data = await res.json();
      this.isConnected = data.connected || false;
      if (data.pairingToken) this.pairingToken = data.pairingToken;

      return {
        connected: Boolean(data.connected),
        agentVersion: data.agentVersion || '1.0.0-windows',
        isPaired: data.isPaired ?? true,
        pairingToken: data.pairingToken || null,
        os: data.platform === 'windows' ? 'Windows Desktop' : data.platform || 'Windows',
        deviceName: data.deviceName || 'Honk Windows Agent',
        lastSeen: data.lastSeen || Date.now(),
        supportedCapabilities: data.capabilities || [
          'Open apps',
          'Open files',
          'Open folders',
          'Open websites',
          'Keyboard',
          'Mouse',
          'Screen interaction',
        ],
        latencyMs: Date.now() - t0,
      };
    } catch (err) {
      this.isConnected = false;
      return {
        connected: false,
        error: 'Install and run the Honk Local Agent on your Windows computer to enable desktop control.',
      };
    }
  }

  /**
   * Pair browser with Local Agent
   */
  public async pairAgent(): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      let res: Response;
      try {
        res = await fetch(`${this.localAgentUrl}/api/pair`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ app: 'Honk Web App', timestamp: Date.now() }),
        });
      } catch {
        res = await fetch('/api/device/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ app: 'Honk Web App', timestamp: Date.now() }),
        });
      }

      if (!res.ok) return { success: false, error: 'Pairing endpoint rejected request' };

      const data = await res.json();
      this.pairingToken = data.pairingToken || 'honk_paired';
      this.isConnected = true;
      return { success: true, token: this.pairingToken };
    } catch (err) {
      return {
        success: false,
        error: 'Could not connect to http://127.0.0.1:3001. Ensure the local agent process is running.',
      };
    }
  }

  /**
   * Send a structured, verified command to Local Agent
   */
  public async executeCommand(command: WindowsCommandRequest): Promise<WindowsCommandResponse> {
    const t0 = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      let res: Response;
      const body = JSON.stringify({
        id: requestId,
        action: command.action,
        target_type: command.payload?.targetType || (command.action.includes('WEBSITE') ? 'website' : command.action.includes('FOLDER') ? 'folder' : command.action.includes('FILE') ? 'file' : 'application'),
        target: command.target,
        payload: command.payload,
        userApproved: command.userApproved ?? true,
        token: this.pairingToken,
        requestId,
      });

      try {
        res = await fetch(`${this.localAgentUrl}/api/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
      } catch {
        res = await fetch('/api/device/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
      }

      if (!res.ok) {
        return {
          requestId,
          action: command.action,
          target: command.target,
          success: false,
          verified: false,
          error: `HTTP ${res.status}: ${await res.text()}`,
          latencyMs: Date.now() - t0,
          timestamp: Date.now(),
        };
      }

      const data = await res.json();
      return {
        requestId: data.command_id || data.requestId || requestId,
        action: data.action || command.action,
        target: data.target || command.target,
        success: data.status === 'SUCCESS' || data.success === true,
        verified: data.verified === true,
        details: data.details || data.message,
        error: data.error,
        latencyMs: data.latencyMs || Date.now() - t0,
        timestamp: Date.now(),
      };
    } catch (err) {
      return {
        requestId,
        action: command.action,
        target: command.target,
        success: false,
        verified: false,
        error: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - t0,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Emergency Stop Command
   */
  public async triggerEmergencyStop(): Promise<boolean> {
    try {
      let res: Response;
      try {
        res = await fetch(`${this.localAgentUrl}/api/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stop: true }),
        });
      } catch {
        res = await fetch('/api/device/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stop: true }),
        });
      }
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  /**
   * Fetch Developer Diagnostics
   */
  public async fetchDiagnostics(): Promise<unknown> {
    try {
      let res: Response;
      try {
        res = await fetch(`${this.localAgentUrl}/api/diagnostics`);
      } catch {
        res = await fetch('/api/device/status');
      }
      return await res.json();
    } catch (e) {
      return { error: 'Diagnostics fetch failed' };
    }
  }
}
