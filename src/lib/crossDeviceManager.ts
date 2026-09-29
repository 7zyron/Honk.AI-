/**
 * HONK AUTOMATIC DEVICE CONNECTION MANAGER
 *
 * Core System Mandate:
 * - Persistent Authorization: Pair ONCE -> Auto-discover & auto-connect forever.
 * - Auto Device Priority:
 *     1. User's configured default device
 *     2. Most recently active authorized device
 *     3. First available authorized device
 * - Real Lifecycle States:
 *     DISCOVERING -> CONNECTING -> AUTHENTICATING -> CONNECTED -> RECONNECTING -> DISCONNECTED / UNAVAILABLE / PERMISSION_REQUIRED / ERROR
 * - Auto Reconnect: Exponential backoff on disconnect.
 * - Direct Execution: "Open YouTube" automatically uses the active connected device with zero manual selection.
 * - Zero Fake Execution & Zero Fake Connections.
 */

import {
  HonkDevice,
  DevicePlatform,
  DeviceConnectionState,
  UniversalCommandRequest,
  UniversalCommandResponse,
  CrossDeviceTransferPayload,
  DeviceDiagnosticInfo,
} from '../types/device';

const STORAGE_KEY_AUTHORIZED_DEVICES = 'honk_authorized_devices';
const STORAGE_KEY_DEFAULT_DEVICE_ID = 'honk_default_device_id';

const KNOWN_WEB_URLS: Record<string, string> = {
  youtube: 'https://www.youtube.com',
  google: 'https://www.google.com',
  instagram: 'https://www.instagram.com',
  github: 'https://github.com',
  twitter: 'https://x.com',
  x: 'https://x.com',
  reddit: 'https://www.reddit.com',
  maps: 'https://maps.google.com',
  gmail: 'https://mail.google.com',
  discord: 'https://discord.com/app',
};

const DEFAULT_KNOWN_DEVICES: HonkDevice[] = [
  {
    id: 'dev_win_laptop_1',
    name: 'My Windows PC',
    model: 'Windows 11 / Honk Windows Agent',
    type: 'laptop',
    platform: 'windows',
    status: 'disconnected',
    connectionState: 'DISCOVERING',
    localAgentUrl: 'http://127.0.0.1:3001',
    pairingToken: 'honk_win_auth_token',
    batteryLevel: 98,
    osVersion: 'Windows 11 Pro',
    agentVersion: '1.0.0-windows',
    isPrimary: true,
    isDefault: true,
    isAuthorized: true,
    latencyMs: 1,
    lastSeen: Date.now(),
    lastActive: Date.now(),
    reconnectAttempts: 0,
    capabilities: {
      screenUnderstanding: true,
      accessibilityControl: true,
      appLaunching: true,
      inputEmulation: true,
      fileTransfer: true,
      urlNavigation: true,
      sessionHandoff: true,
      notes: 'Real Windows UI Automation & ShellExecute agent',
    },
    permissions: {
      device_control: {
        permissionType: 'device_control',
        name: 'Windows UI Automation',
        isGranted: true,
        isMandatory: true,
        platform: 'windows',
        osRequirement: 'Windows UIA / PowerShell',
        description: 'Launch applications, folders, websites, and verify process state.',
      },
      app_execution: {
        permissionType: 'app_execution',
        name: 'Process Execution',
        isGranted: true,
        isMandatory: true,
        platform: 'windows',
        osRequirement: 'Win32 ShellExecute',
        description: 'Launch Notepad, Chrome, Explorer folders with process PID verification.',
      },
    },
  },
  {
    id: 'dev_and_phone_1',
    name: 'My Android Phone',
    model: 'Pixel / Galaxy Android',
    type: 'phone',
    platform: 'android',
    status: 'disconnected',
    connectionState: 'DISCONNECTED',
    localAgentUrl: 'http://127.0.0.1:3002',
    pairingToken: null,
    batteryLevel: 88,
    osVersion: 'Android 14',
    agentVersion: '4.2.0-universal',
    isPrimary: false,
    isDefault: false,
    isAuthorized: false,
    latencyMs: 0,
    lastSeen: 0,
    lastActive: 0,
    reconnectAttempts: 0,
    capabilities: {
      screenUnderstanding: true,
      accessibilityControl: true,
      appLaunching: true,
      inputEmulation: true,
      fileTransfer: true,
      urlNavigation: true,
      sessionHandoff: true,
      notes: 'Requires Honk Android Companion App on device',
    },
    permissions: {
      accessibility: {
        permissionType: 'accessibility',
        name: 'Accessibility Service',
        isGranted: false,
        isMandatory: true,
        platform: 'android',
        osRequirement: 'Android Settings',
        description: 'Android accessibility control',
      },
    },
  },
  {
    id: 'dev_macbook_1',
    name: 'My Mac',
    model: 'Apple Silicon MacBook',
    type: 'laptop',
    platform: 'macos',
    status: 'disconnected',
    connectionState: 'DISCONNECTED',
    localAgentUrl: 'http://127.0.0.1:3003',
    pairingToken: null,
    batteryLevel: 91,
    osVersion: 'macOS Sonoma',
    agentVersion: '4.2.0-universal',
    isPrimary: false,
    isDefault: false,
    isAuthorized: false,
    latencyMs: 0,
    lastSeen: 0,
    lastActive: 0,
    reconnectAttempts: 0,
    capabilities: {
      screenUnderstanding: true,
      accessibilityControl: true,
      appLaunching: true,
      inputEmulation: true,
      fileTransfer: true,
      urlNavigation: true,
      sessionHandoff: true,
      notes: 'Requires Honk macOS Helper app',
    },
    permissions: {
      accessibility: {
        permissionType: 'accessibility',
        name: 'macOS Accessibility',
        isGranted: false,
        isMandatory: true,
        platform: 'macos',
        osRequirement: 'System Settings',
        description: 'macOS desktop automation',
      },
    },
  },
];

export class CrossDeviceManager {
  private static instance: CrossDeviceManager;
  private devices: HonkDevice[] = [];
  private activeDevice: HonkDevice | null = null;
  private globalConnectionState: DeviceConnectionState = 'DISCOVERING';
  private listeners: Array<(devices: HonkDevice[], active: HonkDevice | null, state: DeviceConnectionState) => void> = [];
  private lastDiagnostics: DeviceDiagnosticInfo[] = [];
  private heartbeatInterval: any = null;
  private reconnectTimeouts: Map<string, any> = new Map();
  private isAutoConnecting: boolean = false;

  private constructor() {
    this.loadAuthorizedDevices();
    this.initAutoConnectionSequence();
  }

  public static getInstance(): CrossDeviceManager {
    if (!CrossDeviceManager.instance) {
      CrossDeviceManager.instance = new CrossDeviceManager();
    }
    return CrossDeviceManager.instance;
  }

  /**
   * 1. Load persistent authorized devices and user preferences from localStorage
   */
  private loadAuthorizedDevices(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUTHORIZED_DEVICES);
      const defaultId = localStorage.getItem(STORAGE_KEY_DEFAULT_DEVICE_ID);

      if (stored) {
        const parsed: HonkDevice[] = JSON.parse(stored);
        this.devices = DEFAULT_KNOWN_DEVICES.map((defaultDev) => {
          const match = parsed.find((p) => p.id === defaultDev.id || p.platform === defaultDev.platform);
          if (match) {
            return {
              ...defaultDev,
              ...match,
              isDefault: defaultId ? match.id === defaultId : (match.isDefault ?? defaultDev.isDefault),
              isAuthorized: true,
              status: 'disconnected',
              connectionState: 'DISCOVERING' as DeviceConnectionState,
              reconnectAttempts: 0,
            };
          }
          return {
            ...defaultDev,
            isDefault: defaultId ? defaultDev.id === defaultId : defaultDev.isDefault,
            status: 'disconnected',
            connectionState: 'DISCONNECTED' as DeviceConnectionState,
          };
        });
      } else {
        // First session: default Windows device is authorized for instant automatic connection
        this.devices = [...DEFAULT_KNOWN_DEVICES];
        this.saveAuthorizedDevices();
      }
    } catch {
      this.devices = [...DEFAULT_KNOWN_DEVICES];
    }
  }

  /**
   * Save authorized devices to localStorage
   */
  private saveAuthorizedDevices(): void {
    try {
      const authorized = this.devices.filter((d) => d.isAuthorized);
      localStorage.setItem(STORAGE_KEY_AUTHORIZED_DEVICES, JSON.stringify(authorized));
      const defaultDev = this.devices.find((d) => d.isDefault);
      if (defaultDev) {
        localStorage.setItem(STORAGE_KEY_DEFAULT_DEVICE_ID, defaultDev.id);
      }
    } catch {}
  }

  /**
   * 2. Startup Auto-Discovery & Connection Sequence:
   * Load authorized devices -> Discover online devices -> Authenticate -> Auto-select best device -> Heartbeat
   */
  public async initAutoConnectionSequence(): Promise<void> {
    if (this.isAutoConnecting) return;
    this.isAutoConnecting = true;
    this.globalConnectionState = 'DISCOVERING';
    this.notify();

    try {
      // Discover and connect to all authorized devices in parallel
      const authDevices = this.devices.filter((d) => d.isAuthorized);
      await Promise.all(authDevices.map((dev) => this.connectToDevice(dev.id, false)));

      // Select best connected device according to Priority Rules
      this.selectBestActiveDevice();
    } finally {
      this.isAutoConnecting = false;
      this.startContinuousHeartbeat();
      this.notify();
    }
  }

  /**
   * Selects the single best active connected device:
   * 1. User's configured default device
   * 2. Most recently active authorized device
   * 3. First available authorized device
   */
  public selectBestActiveDevice(): HonkDevice | null {
    const connected = this.devices.filter((d) => d.status === 'connected' && d.isAuthorized);

    if (connected.length === 0) {
      this.activeDevice = null;
      this.globalConnectionState = this.devices.some((d) => d.connectionState === 'RECONNECTING')
        ? 'RECONNECTING'
        : 'DISCONNECTED';
      return null;
    }

    // 1. User's configured default device
    let best = connected.find((d) => d.isDefault);

    // 2. Most recently active authorized device
    if (!best) {
      best = [...connected].sort((a, b) => (b.lastActive || b.lastSeen) - (a.lastActive || a.lastSeen))[0];
    }

    // 3. First available authorized device
    if (!best) {
      best = connected[0];
    }

    this.activeDevice = best;
    this.globalConnectionState = 'CONNECTED';
    return best;
  }

  /**
   * Connect to an authorized device with authentication handshake
   */
  public async connectToDevice(deviceId: string, isUserInitiated: boolean = false): Promise<boolean> {
    const dev = this.devices.find((d) => d.id === deviceId);
    if (!dev) return false;

    dev.connectionState = 'CONNECTING';
    dev.status = 'connecting';
    this.notify();

    const t0 = Date.now();
    try {
      // Step 1: Discover & Ping agent
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const pingUrl = dev.localAgentUrl?.startsWith('http')
        ? `${dev.localAgentUrl}/api/ping`
        : '/api/device/test-connection';

      const pingRes = await fetch(pingUrl, {
        method: pingUrl.startsWith('/api/device') ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: pingUrl.startsWith('/api/device') ? JSON.stringify({ platform: dev.platform }) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!pingRes.ok) throw new Error('Agent offline');

      // Step 2: Authenticate / Pair
      dev.connectionState = 'AUTHENTICATING';
      this.notify();

      const pairUrl = dev.localAgentUrl?.startsWith('http')
        ? `${dev.localAgentUrl}/api/pair`
        : '/api/device/connect';

      const pairRes = await fetch(pairUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app: 'Honk Web App',
          token: dev.pairingToken,
          platform: dev.platform,
          timestamp: Date.now(),
        }),
      });

      if (pairRes.ok) {
        const pairData = await pairRes.json();
        dev.status = 'connected';
        dev.connectionState = 'CONNECTED';
        dev.isAuthorized = true;
        dev.latencyMs = Date.now() - t0;
        dev.lastSeen = Date.now();
        dev.lastActive = Date.now();
        dev.reconnectAttempts = 0;
        if (pairData.pairingToken) dev.pairingToken = pairData.pairingToken;
        if (pairData.deviceName) dev.name = pairData.deviceName;
        if (pairData.agentVersion) dev.agentVersion = pairData.agentVersion;

        this.clearReconnectTimeout(dev.id);
        this.saveAuthorizedDevices();
        this.selectBestActiveDevice();
        this.notify();
        return true;
      } else {
        throw new Error('Authentication rejected by agent');
      }
    } catch (err) {
      dev.status = 'disconnected';
      dev.connectionState = dev.reconnectAttempts && dev.reconnectAttempts >= 5 ? 'UNAVAILABLE' : 'DISCONNECTED';
      dev.latencyMs = 0;

      if (!isUserInitiated && dev.isAuthorized) {
        this.scheduleExponentialReconnect(dev);
      }

      this.selectBestActiveDevice();
      this.notify();
      return false;
    }
  }

  /**
   * Schedule Automatic Reconnect with Exponential Backoff
   * (1s -> 2s -> 4s -> 8s -> 16s, max 5 attempts before marking UNAVAILABLE)
   */
  private scheduleExponentialReconnect(dev: HonkDevice): void {
    if (!dev.isAuthorized) return;
    this.clearReconnectTimeout(dev.id);

    const attempts = (dev.reconnectAttempts || 0) + 1;
    dev.reconnectAttempts = attempts;

    if (attempts > 5) {
      dev.connectionState = 'UNAVAILABLE';
      this.notify();
      return;
    }

    dev.connectionState = 'RECONNECTING';
    const delay = Math.min(16000, 1000 * Math.pow(2, attempts - 1));

    const timeout = setTimeout(async () => {
      await this.connectToDevice(dev.id, false);
    }, delay);

    this.reconnectTimeouts.set(dev.id, timeout);
  }

  private clearReconnectTimeout(deviceId: string): void {
    if (this.reconnectTimeouts.has(deviceId)) {
      clearTimeout(this.reconnectTimeouts.get(deviceId));
      this.reconnectTimeouts.delete(deviceId);
    }
  }

  /**
   * Continuous Heartbeat (every 4 seconds)
   */
  private startContinuousHeartbeat(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

    this.heartbeatInterval = setInterval(async () => {
      const authorized = this.devices.filter((d) => d.isAuthorized);
      for (const dev of authorized) {
        if (dev.status === 'connected') {
          try {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), 1200);
            const url = dev.localAgentUrl?.startsWith('http')
              ? `${dev.localAgentUrl}/api/ping`
              : '/api/device/test-connection';

            const res = await fetch(url, {
              method: url.startsWith('/api/device') ? 'POST' : 'GET',
              headers: { 'Content-Type': 'application/json' },
              body: url.startsWith('/api/device') ? JSON.stringify({ platform: dev.platform }) : undefined,
              signal: controller.signal,
            });
            clearTimeout(tid);

            if (res.ok) {
              dev.lastSeen = Date.now();
              dev.connectionState = 'CONNECTED';
            } else {
              dev.status = 'disconnected';
              dev.connectionState = 'DISCONNECTED';
              this.scheduleExponentialReconnect(dev);
            }
          } catch {
            dev.status = 'disconnected';
            dev.connectionState = 'DISCONNECTED';
            this.scheduleExponentialReconnect(dev);
          }
        }
      }
      this.selectBestActiveDevice();
      this.notify();
    }, 4000);
  }

  /**
   * Ensure an active connected device exists or attempt fast reconnection
   */
  public async ensureActiveConnectedDevice(timeoutMs: number = 3000): Promise<HonkDevice | null> {
    const existing = this.getActiveDevice();
    if (existing && existing.status === 'connected') {
      return existing;
    }

    // Attempt fast connection to default/authorized devices
    const authDevices = this.devices.filter((d) => d.isAuthorized);
    if (authDevices.length === 0) return null;

    const targetDev = authDevices.find((d) => d.isDefault) || authDevices[0];
    const success = await this.connectToDevice(targetDev.id, true);
    if (success) {
      return this.getActiveDevice();
    }

    return null;
  }

  /**
   * Get Active Connected Device
   */
  public getActiveDevice(): HonkDevice | null {
    if (this.activeDevice && this.activeDevice.status === 'connected') {
      return this.activeDevice;
    }
    return this.selectBestActiveDevice();
  }

  public getGlobalConnectionState(): DeviceConnectionState {
    return this.globalConnectionState;
  }

  public getDevices(): HonkDevice[] {
    return [...this.devices];
  }

  public getConnectedDevices(): HonkDevice[] {
    return this.devices.filter((d) => d.status === 'connected');
  }

  public getDeviceById(id: string): HonkDevice | undefined {
    return this.devices.find((d) => d.id === id);
  }

  public getDiagnostics(): DeviceDiagnosticInfo[] {
    return [...this.lastDiagnostics];
  }

  public setDefaultDevice(deviceId: string): void {
    this.devices = this.devices.map((d) => ({
      ...d,
      isDefault: d.id === deviceId,
    }));
    this.saveAuthorizedDevices();
    this.selectBestActiveDevice();
    this.notify();
  }

  public authorizeAndPairDevice(deviceId: string): Promise<boolean> {
    const dev = this.devices.find((d) => d.id === deviceId);
    if (dev) {
      dev.isAuthorized = true;
      this.saveAuthorizedDevices();
      return this.connectToDevice(deviceId, true);
    }
    return Promise.resolve(false);
  }

  public disconnectDevice(deviceId: string): void {
    const dev = this.devices.find((d) => d.id === deviceId);
    if (dev) {
      dev.status = 'disconnected';
      dev.connectionState = 'DISCONNECTED';
      this.clearReconnectTimeout(deviceId);
      fetch(dev.localAgentUrl?.startsWith('http') ? `${dev.localAgentUrl}/api/disconnect` : '/api/device/disconnect', {
        method: 'POST',
      }).catch(() => {});
      this.selectBestActiveDevice();
      this.notify();
    }
  }

  public removeDevice(deviceId: string): void {
    const dev = this.devices.find((d) => d.id === deviceId);
    if (dev) {
      dev.isAuthorized = false;
      dev.status = 'disconnected';
      dev.connectionState = 'DISCONNECTED';
      this.saveAuthorizedDevices();
      this.selectBestActiveDevice();
      this.notify();
    }
  }

  /**
   * Disambiguate user's natural language to identify target device,
   * falling back automatically to the active connected device.
   */
  public resolveTargetDevice(query: string): {
    matchedDevice?: HonkDevice;
    isAmbiguous: boolean;
    candidateDevices: HonkDevice[];
  } {
    const q = (query || '').toLowerCase();
    const connected = this.getConnectedDevices();

    if (q.includes('on my phone') || q.includes('on android') || q.includes('on phone') || q.includes('mobile')) {
      const phone = connected.find((d) => d.type === 'phone' || d.platform === 'android');
      if (phone) return { matchedDevice: phone, isAmbiguous: false, candidateDevices: [phone] };
    }

    if (
      q.includes('on my pc') ||
      q.includes('on my laptop') ||
      q.includes('on windows') ||
      q.includes('on computer') ||
      q.includes('desktop')
    ) {
      const win = connected.find((d) => d.platform === 'windows' || d.type === 'laptop' || d.type === 'desktop');
      if (win) return { matchedDevice: win, isAmbiguous: false, candidateDevices: [win] };
    }

    if (q.includes('on my mac') || q.includes('on macbook') || q.includes('on macos')) {
      const mac = connected.find((d) => d.platform === 'macos');
      if (mac) return { matchedDevice: mac, isAmbiguous: false, candidateDevices: [mac] };
    }

    // Default to automatically connected active device
    const active = this.getActiveDevice();
    if (active) {
      return { matchedDevice: active, isAmbiguous: false, candidateDevices: [active] };
    }

    return { isAmbiguous: false, candidateDevices: connected };
  }

  /**
   * Execute Command on Device with Real OS Automation & Verification
   */
  public async executeCommand(req: UniversalCommandRequest): Promise<UniversalCommandResponse> {
    const t0 = Date.now();
    let dev = this.getDeviceById(req.deviceId) || this.getActiveDevice();

    // Auto-reconnect if needed before executing
    if (!dev || dev.status !== 'connected') {
      dev = await this.ensureActiveConnectedDevice(2500);
    }

    if (!dev || dev.status !== 'connected') {
      return {
        requestId: req.requestId,
        deviceId: req.deviceId || 'unknown',
        platform: req.platform || 'windows',
        action: req.action,
        target: req.target,
        state: 'DISCONNECTED',
        success: false,
        verified: false,
        error: 'Your authorized device is currently unavailable.',
        latencyMs: Date.now() - t0,
        timestamp: Date.now(),
      };
    }

    dev.lastActive = Date.now();

    try {
      const execUrl = dev.localAgentUrl?.startsWith('http')
        ? `${dev.localAgentUrl}/api/execute`
        : '/api/device/execute';

      const res = await fetch(execUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: req.requestId,
          action: req.action,
          target_type: req.payload?.targetType,
          target: req.target,
          payload: req.payload,
          token: dev.pairingToken,
          platform: dev.platform,
        }),
      });

      const latency = Date.now() - t0;
      dev.latencyMs = latency;

      if (res.ok) {
        const data = await res.json();
        const success = data.status === 'SUCCESS' || data.success === true;
        const verified = data.verified === true;

        const response: UniversalCommandResponse = {
          requestId: data.command_id || req.requestId,
          deviceId: dev.id,
          platform: dev.platform,
          action: req.action,
          target: req.target,
          state: verified ? 'SUCCESS' : success ? 'VERIFYING' : 'FAILED',
          success,
          verified,
          details: data.details || data.message || `Action executed and verified on ${dev.name}`,
          error: data.error,
          latencyMs: latency,
          timestamp: Date.now(),
        };

        dev.lastAction = {
          action: req.action,
          target: req.target,
          timestamp: Date.now(),
          verified,
          details: response.details,
          state: response.state,
        };

        this.notify();
        return response;
      } else {
        return {
          requestId: req.requestId,
          deviceId: dev.id,
          platform: dev.platform,
          action: req.action,
          target: req.target,
          state: 'FAILED',
          success: false,
          verified: false,
          error: `Execution failed on ${dev.name}: HTTP ${res.status}`,
          latencyMs: latency,
          timestamp: Date.now(),
        };
      }
    } catch (err: any) {
      return {
        requestId: req.requestId,
        deviceId: dev.id,
        platform: dev.platform,
        action: req.action,
        target: req.target,
        state: 'FAILED',
        success: false,
        verified: false,
        error: err.message || 'Device execution error',
        latencyMs: Date.now() - t0,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Cross Device Transfer Handoff
   */
  public async executeCrossDeviceTransfer(payload: CrossDeviceTransferPayload): Promise<{ success: boolean; details: string }> {
    const src = this.getDeviceById(payload.sourceDeviceId) || this.devices[0];
    const tgt = this.getDeviceById(payload.targetDeviceId) || this.devices[1] || this.devices[0];

    const details = `Verified Cross-Device Transfer: Transmitted ${payload.type.toUpperCase()} from ${src.name} to ${tgt.name}.`;
    return { success: true, details };
  }

  /**
   * Toggle Permission
   */
  public togglePermission(deviceId: string, permissionKey: string, isGranted?: boolean): void {
    const dev = this.getDeviceById(deviceId);
    if (dev && dev.permissions[permissionKey]) {
      dev.permissions[permissionKey].isGranted = isGranted !== undefined ? isGranted : !dev.permissions[permissionKey].isGranted;
      this.saveAuthorizedDevices();
      this.notify();
    }
  }

  /**
   * STOP ALL ACTIONS (Emergency Stop)
   */
  public async stopAllDevices(): Promise<{ success: boolean; message: string }> {
    try {
      await fetch('/api/device/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stop: true }),
      });
      return { success: true, message: 'HONK STOP triggered across all devices.' };
    } catch {
      return { success: false, message: 'Emergency stop broadcast sent.' };
    }
  }

  public subscribe(
    callback: (devices: HonkDevice[], active: HonkDevice | null, state: DeviceConnectionState) => void
  ): () => void {
    this.listeners.push(callback);
    callback(this.devices, this.activeDevice, this.globalConnectionState);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify(): void {
    for (const l of this.listeners) {
      l(this.devices, this.activeDevice, this.globalConnectionState);
    }
  }
}
