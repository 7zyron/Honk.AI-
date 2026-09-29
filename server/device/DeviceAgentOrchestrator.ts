/**
 * HONK Central Device Agent Orchestrator
 * Integrates Screen Understanding, Permission Policy Engine, Action Executor, Coach Mode,
 * and Emergency Stop Controller into an end-to-end verified device agent loop:
 * SEE → THINK → ASK PERMISSION → ACT → VERIFY → SUCCESS
 */

import { PermissionManager, DeviceActionIntent } from './PermissionManager';
import { ScreenUnderstandingEngine, ScreenAnalysisResult } from './ScreenUnderstandingEngine';
import { ActionExecutor, ActionExecutionResult, ActionExecutionStage } from './ActionExecutor';
import { GamingCoachEngine, CoachAdvice } from './GamingCoachEngine';
import { PlatformType, PlatformAdapterFactory } from './PlatformAdapters';

export interface DeviceAgentStep {
  stage: ActionExecutionStage;
  messageDesi: string;
  statusIndicator: string;
  intent?: DeviceActionIntent;
  targetDeviceName?: string;
  targetPlatform?: PlatformType;
  screenResult?: ScreenAnalysisResult;
  executionResult?: ActionExecutionResult;
  coachAdvice?: CoachAdvice;
  requiresUserAction?: boolean;
  ctaAction?: 'connect_device' | 'grant_permission' | 'retry' | 'stop';
  diagnostic?: ActionExecutionResult['diagnostic'];
}

export class DeviceAgentOrchestrator {
  private static instance: DeviceAgentOrchestrator;
  private activeStoppedTasks: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): DeviceAgentOrchestrator {
    if (!DeviceAgentOrchestrator.instance) {
      DeviceAgentOrchestrator.instance = new DeviceAgentOrchestrator();
    }
    return DeviceAgentOrchestrator.instance;
  }

  /**
   * Immediately register an emergency stop command (e.g., "HONK STOP")
   */
  public registerEmergencyStop(taskId?: string) {
    if (taskId) {
      this.activeStoppedTasks.add(taskId);
    } else {
      this.activeStoppedTasks.add('global_stop');
    }
  }

  /**
   * Check if task is stopped
   */
  public isTaskStopped(taskId: string): boolean {
    return this.activeStoppedTasks.has(taskId) || this.activeStoppedTasks.has('global_stop');
  }

  /**
   * Clear stop state
   */
  public clearStop(taskId: string) {
    this.activeStoppedTasks.delete(taskId);
    this.activeStoppedTasks.delete('global_stop');
  }

  /**
   * Detect Target Platform & Device from User Query
   */
  public detectPlatformFromQuery(query: string, currentPlatform: PlatformType = 'web'): {
    platform: PlatformType;
    deviceName: string;
  } {
    const q = query.toLowerCase();

    if (q.includes('on my phone') || q.includes('on android') || q.includes('on phone') || q.includes('mobile')) {
      return { platform: 'android', deviceName: 'Android Phone (Pixel / Galaxy)' };
    }
    if (q.includes('on my pc') || q.includes('on my laptop') || q.includes('on windows') || q.includes('on computer') || q.includes('desktop')) {
      return { platform: 'windows', deviceName: 'Windows 11 Workstation' };
    }
    if (q.includes('on my mac') || q.includes('on macbook') || q.includes('on macos')) {
      return { platform: 'macos', deviceName: 'MacBook Pro' };
    }
    if (q.includes('on my tablet') || q.includes('on ipad') || q.includes('on tablet')) {
      return { platform: 'ios', deviceName: 'iPad Pro' };
    }

    const defaultPlatform: PlatformType = currentPlatform && currentPlatform !== 'web' ? currentPlatform : 'windows';
    return {
      platform: defaultPlatform,
      deviceName: defaultPlatform === 'windows' ? 'Windows 11 Workstation' : `${defaultPlatform.toUpperCase()} Device`,
    };
  }

  /**
   * Process user request through the full Agent Loop
   */
  public async processDeviceRequest(
    userQuery: string,
    confirmedActions: string[] = [],
    platform: PlatformType = 'windows',
    taskId: string = `task_${Date.now()}`
  ): Promise<DeviceAgentStep> {
    const queryTrimmed = (userQuery || '').trim();
    const queryLower = queryTrimmed.toLowerCase();

    // Check emergency stop command
    if (/honk stop|stop honk|\bstop\b/i.test(queryLower)) {
      this.registerEmergencyStop(taskId);
      return {
        stage: 'IDLE',
        messageDesi: 'Honk ne saari active actions aur automation rokk di hai.',
        statusIndicator: 'Honk stopped active actions.',
        ctaAction: 'stop',
      };
    }

    if (this.isTaskStopped(taskId)) {
      return {
        stage: 'IDLE',
        messageDesi: 'Honk is stopped. Say "resume" or start a new request.',
        statusIndicator: 'Honk is stopped.',
      };
    }

    const { platform: targetPlatform, deviceName: targetDeviceName } = this.detectPlatformFromQuery(queryTrimmed, platform);

    // Call centralized executeDeviceAction
    const { executeDeviceAction } = await import('./ActionExecutor');
    const result = await executeDeviceAction({
      userQuery: queryTrimmed,
      platform: targetPlatform,
      confirmedActions,
      taskId,
    });

    let statusIndicator = '';
    let ctaAction: DeviceAgentStep['ctaAction'] = undefined;

    if (result.stage === 'SUCCESS') {
      statusIndicator = `${result.target || 'Action'} opened & verified on ${targetDeviceName}.`;
    } else if (result.stage === 'DISCONNECTED') {
      statusIndicator = `Device Agent disconnected on ${targetDeviceName}.`;
      ctaAction = 'connect_device';
    } else if (result.stage === 'WAITING_FOR_PERMISSION') {
      statusIndicator = `Waiting for permission on ${targetDeviceName}...`;
      ctaAction = 'grant_permission';
    } else if (result.stage === 'UNSUPPORTED') {
      statusIndicator = `Action unsupported on ${targetDeviceName}.`;
    } else {
      statusIndicator = `Couldn't complete action on ${targetDeviceName}.`;
      ctaAction = 'retry';
    }

    return {
      stage: result.stage,
      messageDesi: result.message,
      statusIndicator,
      targetDeviceName,
      targetPlatform,
      requiresUserAction: result.stage === 'WAITING_FOR_PERMISSION' || result.stage === 'DISCONNECTED',
      ctaAction,
      diagnostic: result.diagnostic as any,
    };
  }
}
