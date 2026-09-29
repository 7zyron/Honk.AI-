/**
 * Universal HONK Device & Agent Protocol Types
 * Core definitions for cross-device agent architecture: Windows, Android, macOS, Linux, iOS, Browser.
 */

export type DevicePlatform = 'android' | 'windows' | 'macos' | 'linux' | 'ios' | 'browser';

export type DeviceType = 'phone' | 'tablet' | 'laptop' | 'desktop' | 'browser';

export type DeviceConnectionState =
  | 'DISCOVERING'
  | 'CONNECTING'
  | 'AUTHENTICATING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'DISCONNECTED'
  | 'PERMISSION_REQUIRED'
  | 'UNAVAILABLE'
  | 'ERROR';

export type DeviceConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'connecting'
  | 'permission_required'
  | 'unsupported'
  | 'pairing'
  | 'action_running'
  | 'action_verified'
  | 'action_failed'
  | 'offline';

export type ActionExecutionState =
  | 'IDLE'
  | 'REQUESTED'
  | 'CHECKING_DEVICE'
  | 'WAITING_FOR_PERMISSION'
  | 'CONNECTING_TO_DEVICE'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'SUCCESS'
  | 'FAILED'
  | 'UNSUPPORTED'
  | 'TIMEOUT'
  | 'DISCONNECTED';

export type ActionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface DevicePermissionState {
  permissionType: string;
  name: string;
  isGranted: boolean;
  isMandatory: boolean;
  platform: DevicePlatform;
  osRequirement: string;
  description: string;
}

export interface DeviceCapabilities {
  screenUnderstanding: boolean;
  accessibilityControl: boolean;
  appLaunching: boolean;
  inputEmulation: boolean;
  fileTransfer: boolean;
  urlNavigation: boolean;
  sessionHandoff: boolean;
  notes: string;
}

export interface HonkDevice {
  id: string;
  name: string;
  model: string;
  type: DeviceType;
  platform: DevicePlatform;
  status: DeviceConnectionStatus;
  connectionState?: DeviceConnectionState;
  localAgentUrl?: string;
  pairingToken?: string | null;
  batteryLevel?: number;
  osVersion: string;
  agentVersion: string;
  isPrimary?: boolean;
  isDefault?: boolean;
  isAuthorized?: boolean;
  latencyMs?: number;
  lastSeen: number;
  lastActive?: number;
  reconnectAttempts?: number;
  capabilities: DeviceCapabilities;
  permissions: Record<string, DevicePermissionState>;
  lastAction?: {
    action: string;
    target?: string;
    timestamp: number;
    verified: boolean;
    details?: string;
    state?: ActionExecutionState;
  };
}

export interface UniversalCommandRequest {
  requestId: string;
  deviceId: string;
  sourceDeviceId?: string;
  platform: DevicePlatform;
  action:
    | 'OPEN_APPLICATION'
    | 'OPEN_WEBSITE'
    | 'OPEN_FILE'
    | 'OPEN_FOLDER'
    | 'STOP_ALL_ACTIONS'
    | 'open_application'
    | 'open_url'
    | 'focus_window'
    | 'type_text'
    | 'click_element'
    | 'press_key'
    | 'read_screen'
    | 'read_ui_tree'
    | 'navigate_url'
    | 'verify_state'
    | 'transfer_payload'
    | 'continue_session'
    | 'close_application'
    | 'ping';
  target?: string;
  payload?: Record<string, unknown>;
  userApproved: boolean;
  riskLevel?: ActionRiskLevel;
}

export interface UniversalCommandResponse {
  requestId: string;
  deviceId: string;
  platform: DevicePlatform;
  action: string;
  target?: string;
  state: ActionExecutionState;
  success: boolean;
  verified: boolean;
  details?: string;
  error?: string;
  latencyMs: number;
  timestamp: number;
  diagnostics?: DeviceDiagnosticInfo;
}

export interface DeviceDiagnosticInfo {
  device: string;
  platform: DevicePlatform;
  agentStatus: 'Connected' | 'Disconnected' | 'Offline';
  permissionStatus: 'Granted' | 'Denied' | 'Missing';
  command: string;
  target?: string;
  executionStage: ActionExecutionState;
  result: 'Success' | 'Failed' | 'Unsupported' | 'Denied' | 'Disconnected';
  verification: 'Passed' | 'Failed' | 'Pending' | 'N/A';
  errorMessage?: string;
  latencyMs: number;
  timestamp: number;
}

export interface CrossDeviceTransferPayload {
  sourceDeviceId: string;
  targetDeviceId: string;
  type: 'url' | 'text' | 'session' | 'file';
  payloadData: string;
  title?: string;
  timestamp: number;
}
