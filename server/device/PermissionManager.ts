/**
 * HONK Device Agent - Permission & Safety Policy Manager
 * Mandate: PERMISSION FIRST → ACTION SECOND.
 * Enforces Risk Classification (LOW, MEDIUM, HIGH, CRITICAL), Sensitive Action Guardrails,
 * and Operating System Permission Validation across Web, Android, iOS, Windows, macOS, Linux.
 */

export type ActionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type OSPermissionType =
  | 'screen_recording'
  | 'accessibility_control'
  | 'app_launch'
  | 'input_emulation'
  | 'file_system'
  | 'camera_mic'
  | 'notifications'
  | 'location';

export interface DeviceActionIntent {
  id: string;
  actionType:
    | 'open_app'
    | 'tap_element'
    | 'swipe_screen'
    | 'type_text'
    | 'read_screen'
    | 'accessibility_action'
    | 'sensitive_transaction'
    | 'game_coach'
    | 'transfer_data';
  targetApp?: string;
  targetElement?: string;
  description: string;
  explanationDesi: string;
  riskLevel: ActionRiskLevel;
  requiredOSPermission: OSPermissionType;
  isSensitive: boolean;
  sensitiveCategory?: 'banking' | 'upi' | 'payment' | 'password' | 'otp' | 'financial' | 'auth_security';
  payload?: Record<string, unknown>;
}

export interface PermissionState {
  permissionType: OSPermissionType;
  isGranted: boolean;
  grantedAt?: number;
  revokedAt?: number;
  platform: 'web' | 'android' | 'ios' | 'windows' | 'macos' | 'linux';
  details?: string;
}

export class PermissionManager {
  private static instance: PermissionManager;
  private permissionStore: Map<string, PermissionState> = new Map();
  private userSessionGrants: Set<string> = new Set(); // Granted action IDs or types for current session

  private constructor() {
    this.initializeDefaultPermissions();
  }

  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  private initializeDefaultPermissions() {
    const defaultTypes: OSPermissionType[] = [
      'screen_recording',
      'accessibility_control',
      'app_launch',
      'input_emulation',
      'file_system',
      'camera_mic',
      'notifications',
      'location',
    ];

    defaultTypes.forEach((p) => {
      this.permissionStore.set(p, {
        permissionType: p,
        isGranted: false,
        platform: 'web',
        details: 'Awaiting explicit user OS permission grant.',
      });
    });
  }

  /**
   * Classify an incoming intent into risk levels and sensitive categories
   */
  public classifyIntent(
    actionType: DeviceActionIntent['actionType'],
    userQuery: string,
    targetApp?: string,
    targetElement?: string
  ): { riskLevel: ActionRiskLevel; isSensitive: boolean; sensitiveCategory?: DeviceActionIntent['sensitiveCategory'] } {
    const queryLower = (userQuery || '').toLowerCase();
    const appLower = (targetApp || '').toLowerCase();
    const elemLower = (targetElement || '').toLowerCase();

    // CRITICAL / SECURITY SENSITIVE KEYWORDS
    const isBankingOrUPI = /upi|gpay|phonepe|paytm|bhim|bank|hdbc|icici|sbi|axis|kotak|transfer|payment|send money|pay bill|balance|pin|cvv|card/i.test(queryLower + ' ' + appLower);
    const isAuthOrPassword = /password|otp|2fa|authenticator|cred|secret|login key|auth code|account security|reset pass/i.test(queryLower + ' ' + elemLower);

    if (isBankingOrUPI || isAuthOrPassword) {
      return {
        riskLevel: 'CRITICAL',
        isSensitive: true,
        sensitiveCategory: isBankingOrUPI ? 'upi' : 'password',
      };
    }

    // HIGH RISK: App settings changes, data deletion, submitting forms
    if (/delete|remove|clear data|uninstall|change setting|system setting|submit form/i.test(queryLower)) {
      return {
        riskLevel: 'HIGH',
        isSensitive: false,
      };
    }

    // MEDIUM RISK: Navigating apps, typing text into fields, swiping
    if (actionType === 'type_text' || actionType === 'swipe_screen' || actionType === 'tap_element') {
      return {
        riskLevel: 'MEDIUM',
        isSensitive: false,
      };
    }

    // LOW RISK: Reading screen text, inspecting UI, opening safe apps (e.g. YouTube, Calculator, Camera)
    return {
      riskLevel: 'LOW',
      isSensitive: false,
    };
  }

  /**
   * Create structured DeviceActionIntent with Desi explanation & OS permission specs
   */
  public createIntent(
    actionType: DeviceActionIntent['actionType'],
    userQuery: string,
    targetApp?: string,
    targetElement?: string,
    payload?: Record<string, unknown>
  ): DeviceActionIntent {
    const { riskLevel, isSensitive, sensitiveCategory } = this.classifyIntent(actionType, userQuery, targetApp, targetElement);
    const id = `intent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let requiredOSPermission: OSPermissionType = 'accessibility_control';
    if (actionType === 'open_app') requiredOSPermission = 'app_launch';
    if (actionType === 'read_screen' || actionType === 'game_coach') requiredOSPermission = 'screen_recording';
    if (actionType === 'type_text' || actionType === 'tap_element' || actionType === 'swipe_screen') requiredOSPermission = 'input_emulation';

    let explanationDesi = '';
    const appName = targetApp || 'app';

    if (riskLevel === 'CRITICAL') {
      explanationDesi = `⚠️ Bhai, yeh ek sensitive action hai (${sensitiveCategory || 'financial/security'}). Main bina aapke explicit confirm kiye aage nahi badhunga. Permission doge?`;
    } else if (actionType === 'open_app') {
      explanationDesi = `Bhai, ${appName} open karne ke liye mujhe device app-launch permission chahiye. Kya allow karein?`;
    } else if (actionType === 'read_screen' || actionType === 'game_coach') {
      explanationDesi = `Bhai, aapki current screen samajhne ke liye mujhe screen access chahiye. Permission doge?`;
    } else {
      explanationDesi = `Bhai, ${targetElement || 'screen controls'} par action perform karne ke liye device control permission chahiye. Allow karein?`;
    }

    return {
      id,
      actionType,
      targetApp,
      targetElement,
      description: `Requesting permission to ${actionType} on ${targetApp || 'current screen'}`,
      explanationDesi,
      riskLevel,
      requiredOSPermission,
      isSensitive,
      sensitiveCategory,
      payload,
    };
  }

  /**
   * Check if permission is granted for a specific intent
   */
  public isPermissionGranted(intent: DeviceActionIntent, confirmedActions: string[] = []): boolean {
    // Critical risk ALWAYS requires explicit confirmation per call
    if (intent.riskLevel === 'CRITICAL') {
      return confirmedActions.includes(intent.id) || confirmedActions.includes(`confirm_${intent.id}`);
    }

    // Check session grants
    if (this.userSessionGrants.has(intent.id) || confirmedActions.includes(intent.id) || confirmedActions.includes(intent.actionType)) {
      return true;
    }

    // Check OS level permission store
    const osPerm = this.permissionStore.get(intent.requiredOSPermission);
    return osPerm?.isGranted || false;
  }

  /**
   * Grant OS or intent permission
   */
  public grantPermission(permissionTypeOrIntentId: string, details?: string) {
    if (this.permissionStore.has(permissionTypeOrIntentId as OSPermissionType)) {
      this.permissionStore.set(permissionTypeOrIntentId as OSPermissionType, {
        permissionType: permissionTypeOrIntentId as OSPermissionType,
        isGranted: true,
        grantedAt: Date.now(),
        platform: 'web',
        details: details || 'Permission granted by user in UI.',
      });
    }
    this.userSessionGrants.add(permissionTypeOrIntentId);
  }

  /**
   * Revoke permission
   */
  public revokePermission(permissionTypeOrIntentId: string) {
    if (this.permissionStore.has(permissionTypeOrIntentId as OSPermissionType)) {
      this.permissionStore.set(permissionTypeOrIntentId as OSPermissionType, {
        permissionType: permissionTypeOrIntentId as OSPermissionType,
        isGranted: false,
        revokedAt: Date.now(),
        platform: 'web',
        details: 'Permission revoked by user.',
      });
    }
    this.userSessionGrants.delete(permissionTypeOrIntentId);
  }

  /**
   * Get overall permissions summary table
   */
  public getPermissionStates(): Record<string, PermissionState> {
    const result: Record<string, PermissionState> = {};
    this.permissionStore.forEach((val, key) => {
      result[key] = { ...val };
    });
    return result;
  }
}
