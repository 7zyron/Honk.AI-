/**
 * HONK Action Executor & Verifier
 * Mandate: INTENT → PERMISSION CHECK → EXECUTE → VERIFY → SUCCESS.
 * Never claims an action succeeded unless verified on the target device/system.
 */

import { DeviceActionIntent, PermissionManager } from './PermissionManager';
import { PlatformAdapterFactory, PlatformType, PlatformActionResult } from './PlatformAdapters';
import { ScreenUnderstandingEngine } from './ScreenUnderstandingEngine';
import { LocalDeviceAgent } from './LocalDeviceAgent';

export type ActionExecutionStage =
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

export interface DeviceActionCommand {
  action?: string;
  target?: string;
  targetType?: 'application' | 'website' | 'folder' | 'file' | 'element';
  payload?: Record<string, unknown>;
  platform?: PlatformType;
  confirmedActions?: string[];
  userQuery?: string;
  taskId?: string;
}

export interface DeviceActionResult {
  status: 'success' | 'failed' | 'permission_required' | 'disconnected' | 'unsupported';
  verified: boolean;
  stage: ActionExecutionStage;
  message: string;
  target?: string;
  targetType?: string;
  url?: string;
  details?: string;
  error?: string;
  diagnostic?: Record<string, unknown>;
}

export interface ActionExecutionResult {
  intentId: string;
  actionType: string;
  target?: string;
  stage: ActionExecutionStage;
  status: 'completed' | 'denied' | 'failed' | 'stopped' | 'unsupported' | 'disconnected';
  statusMessageDesi: string;
  verified: boolean;
  platformResult?: PlatformActionResult;
  executionDurationMs: number;
  failureReason?: string;
  diagnostic: {
    device: string;
    platform: PlatformType;
    agentStatus: 'Connected' | 'Disconnected' | 'Offline';
    permissionStatus: 'Granted' | 'Denied' | 'Missing';
    command: string;
    target?: string;
    executionStage: ActionExecutionStage;
    result: 'Success' | 'Failed' | 'Unsupported' | 'Denied' | 'Disconnected';
    verification: 'Passed' | 'Failed' | 'Pending' | 'N/A';
    errorMessage?: string;
    latencyMs: number;
    timestamp: number;
  };
}

export class ActionExecutor {
  private static instance: ActionExecutor;

  private constructor() {}

  public static getInstance(): ActionExecutor {
    if (!ActionExecutor.instance) {
      ActionExecutor.instance = new ActionExecutor();
    }
    return ActionExecutor.instance;
  }

  /**
   * Execute action intent following INTENT → EXECUTE → VERIFY → SUCCESS
   */
  public async executeAndVerify(
    intent: DeviceActionIntent,
    platformType: PlatformType = 'web',
    confirmedActions: string[] = []
  ): Promise<ActionExecutionResult> {
    const startTime = Date.now();
    const permMgr = PermissionManager.getInstance();
    const adapter = PlatformAdapterFactory.getAdapter(platformType);
    const targetDisplay = intent.targetApp || intent.targetElement || 'Device Action';

    // 1. CHECK PLATFORM AGENT CONNECTIVITY
    const ping = await adapter.pingAgent();
    if (!ping.connected && platformType !== 'web') {
      const duration = Date.now() - startTime;
      return {
        intentId: intent.id,
        actionType: intent.actionType,
        target: targetDisplay,
        stage: 'DISCONNECTED',
        status: 'disconnected',
        statusMessageDesi: `Connect the Honk Device Agent to control this device.`,
        verified: false,
        executionDurationMs: duration,
        failureReason: ping.error || 'Device agent is offline',
        diagnostic: {
          device: `${platformType.toUpperCase()} Device`,
          platform: platformType,
          agentStatus: 'Disconnected',
          permissionStatus: 'Missing',
          command: intent.actionType,
          target: targetDisplay,
          executionStage: 'DISCONNECTED',
          result: 'Disconnected',
          verification: 'Failed',
          errorMessage: 'Connect the Honk Device Agent to control this device.',
          latencyMs: duration,
          timestamp: Date.now(),
        },
      };
    }

    // 2. CHECK PERMISSION
    const isGranted = permMgr.isPermissionGranted(intent, confirmedActions);
    if (!isGranted) {
      const duration = Date.now() - startTime;
      return {
        intentId: intent.id,
        actionType: intent.actionType,
        target: targetDisplay,
        stage: 'WAITING_FOR_PERMISSION',
        status: 'denied',
        statusMessageDesi: `Device control permission is required to control ${targetDisplay}.`,
        verified: false,
        executionDurationMs: duration,
        failureReason: 'User or OS permission denied for this action.',
        diagnostic: {
          device: `${platformType.toUpperCase()} Device`,
          platform: platformType,
          agentStatus: 'Connected',
          permissionStatus: 'Denied',
          command: intent.actionType,
          target: targetDisplay,
          executionStage: 'WAITING_FOR_PERMISSION',
          result: 'Denied',
          verification: 'N/A',
          errorMessage: 'Device control permission is required.',
          latencyMs: duration,
          timestamp: Date.now(),
        },
      };
    }

    // 3. GET PLATFORM ADAPTER & EXECUTE
    let platformRes: PlatformActionResult;

    try {
      if (intent.actionType === 'open_app') {
        platformRes = await adapter.openApp(intent.targetApp || 'App');
      } else if (intent.actionType === 'tap_element') {
        platformRes = await adapter.tapElement(intent.targetElement || 'element');
      } else if (intent.actionType === 'type_text') {
        const textToType = String(intent.payload?.text || intent.targetElement || '');
        platformRes = await adapter.typeText(textToType, intent.targetElement);
      } else if (intent.actionType === 'swipe_screen') {
        const dir = (intent.payload?.direction as 'up' | 'down' | 'left' | 'right') || 'down';
        platformRes = await adapter.swipeScreen(dir);
      } else {
        platformRes = await adapter.tapElement(intent.targetElement || 'screen_control');
      }

      const duration = Date.now() - startTime;

      // Handle unsupported action
      if (platformRes.error?.includes('isn\'t supported') || platformRes.error?.includes('sandbox')) {
        return {
          intentId: intent.id,
          actionType: intent.actionType,
          target: targetDisplay,
          stage: 'UNSUPPORTED',
          status: 'unsupported',
          statusMessageDesi: `This action isn't supported on this device.`,
          verified: false,
          platformResult: platformRes,
          executionDurationMs: duration,
          failureReason: platformRes.error,
          diagnostic: {
            device: `${platformType.toUpperCase()} Device`,
            platform: platformType,
            agentStatus: 'Connected',
            permissionStatus: 'Granted',
            command: intent.actionType,
            target: targetDisplay,
            executionStage: 'UNSUPPORTED',
            result: 'Unsupported',
            verification: 'N/A',
            errorMessage: platformRes.error,
            latencyMs: duration,
            timestamp: Date.now(),
          },
        };
      }

      // 4. POST-ACTION VERIFICATION
      const isVerified = Boolean(platformRes.success && platformRes.verified);

      if (isVerified) {
        let successMessage = '';
        if (intent.actionType === 'open_app') {
          successMessage = `Opened ${intent.targetApp || 'Application'}.`;
        } else {
          successMessage = `Action completed: ${intent.description}`;
        }

        return {
          intentId: intent.id,
          actionType: intent.actionType,
          target: targetDisplay,
          stage: 'SUCCESS',
          status: 'completed',
          statusMessageDesi: successMessage,
          verified: true,
          platformResult: platformRes,
          executionDurationMs: duration,
          diagnostic: {
            device: `${platformType.toUpperCase()} Device`,
            platform: platformType,
            agentStatus: 'Connected',
            permissionStatus: 'Granted',
            command: intent.actionType,
            target: targetDisplay,
            executionStage: 'SUCCESS',
            result: 'Success',
            verification: 'Passed',
            latencyMs: duration,
            timestamp: Date.now(),
          },
        };
      }

      // Verification failed or execution failed
      const failureMessage = platformRes.error || `The action was attempted, but Honk couldn't verify that it worked.`;
      return {
        intentId: intent.id,
        actionType: intent.actionType,
        target: targetDisplay,
        stage: 'FAILED',
        status: 'failed',
        statusMessageDesi: intent.actionType === 'open_app'
          ? `I couldn't open ${intent.targetApp || 'the target'} because the device agent reported: ${failureMessage}.`
          : `I couldn't execute the action because the device agent reported: ${failureMessage}.`,
        verified: false,
        platformResult: platformRes,
        executionDurationMs: duration,
        failureReason: failureMessage,
        diagnostic: {
          device: `${platformType.toUpperCase()} Device`,
          platform: platformType,
          agentStatus: 'Connected',
          permissionStatus: 'Granted',
          command: intent.actionType,
          target: targetDisplay,
          executionStage: 'FAILED',
          result: 'Failed',
          verification: 'Failed',
          errorMessage: failureMessage,
          latencyMs: duration,
          timestamp: Date.now(),
        },
      };
    } catch (err: any) {
      const duration = Date.now() - startTime;
      return {
        intentId: intent.id,
        actionType: intent.actionType,
        target: targetDisplay,
        stage: 'FAILED',
        status: 'failed',
        statusMessageDesi: `Honk couldn't execute the action.`,
        verified: false,
        executionDurationMs: duration,
        failureReason: err?.message || 'Execution error',
        diagnostic: {
          device: `${platformType.toUpperCase()} Device`,
          platform: platformType,
          agentStatus: 'Offline',
          permissionStatus: 'Missing',
          command: intent.actionType,
          target: targetDisplay,
          executionStage: 'FAILED',
          result: 'Failed',
          verification: 'Failed',
          errorMessage: err?.message || 'Execution error',
          latencyMs: duration,
          timestamp: Date.now(),
        },
      };
    }
  }
}

/**
 * Centralized Device Action Executor
 * Architecture:
 * USER COMMAND -> INTENT DETECTION -> DEVICE CAPABILITY CHECK -> PERMISSION CHECK
 * -> STRUCTURED ACTION -> LOCAL DEVICE AGENT -> REAL OS ACTION -> EXECUTION RESULT -> VERIFICATION -> HONK RESPONSE
 */
export async function executeDeviceAction(command: DeviceActionCommand): Promise<DeviceActionResult> {
  const localAgent = LocalDeviceAgent.getInstance();
  return localAgent.executeAction(command);
}
