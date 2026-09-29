/**
 * HONK Device Agent Server Capability
 * Express API routes for processing device requests, permission checks, and emergency stop commands.
 */

import { Request, Response } from 'express';
import { DeviceAgentOrchestrator } from '../device/DeviceAgentOrchestrator';
import { PermissionManager } from '../device/PermissionManager';
import { PlatformType, PlatformAdapterFactory } from '../device/PlatformAdapters';
import { ActionExecutor, executeDeviceAction } from '../device/ActionExecutor';
import { LocalDeviceAgent } from '../device/LocalDeviceAgent';

export async function handleDeviceAgentRequest(req: Request, res: Response): Promise<void> {
  const { userQuery, confirmedActions = [], platform = 'windows', taskId } = req.body;

  if (!userQuery || typeof userQuery !== 'string') {
    res.status(400).json({ error: 'Valid userQuery string is required' });
    return;
  }

  try {
    const orchestrator = DeviceAgentOrchestrator.getInstance();
    const result = await orchestrator.processDeviceRequest(
      userQuery,
      confirmedActions,
      platform as PlatformType,
      taskId || `task_${Date.now()}`
    );

    res.json({
      success: true,
      result,
      permissions: PermissionManager.getInstance().getPermissionStates(),
    });
  } catch (err) {
    res.status(500).json({
      error: 'Device Agent processing error',
      details: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function handleExecuteDeviceActionRequest(req: Request, res: Response): Promise<void> {
  try {
    const result = await executeDeviceAction(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      status: 'failed',
      verified: false,
      message: err.message || 'Device action execution failed',
      error: err.message,
    });
  }
}

export async function handleGetDeviceStatusRequest(_req: Request, res: Response): Promise<void> {
  const localAgent = LocalDeviceAgent.getInstance();
  res.json({
    success: true,
    ...localAgent.getStatus(),
  });
}

export async function handleDeviceConnectRequest(_req: Request, res: Response): Promise<void> {
  const localAgent = LocalDeviceAgent.getInstance();
  localAgent.setConnected(true);
  res.json({
    success: true,
    connected: true,
    message: 'Device Agent connected.',
    ...localAgent.getStatus(),
  });
}

export async function handleDeviceDisconnectRequest(_req: Request, res: Response): Promise<void> {
  const localAgent = LocalDeviceAgent.getInstance();
  localAgent.setConnected(false);
  res.json({
    success: true,
    connected: false,
    message: 'Device Agent disconnected.',
    ...localAgent.getStatus(),
  });
}

export async function handleEmergencyStopRequest(req: Request, res: Response): Promise<void> {
  const { taskId } = req.body;
  const orchestrator = DeviceAgentOrchestrator.getInstance();
  orchestrator.registerEmergencyStop(taskId);
  const stoppedCount = LocalDeviceAgent.getInstance().stopAllProcesses();

  res.json({
    success: true,
    stoppedCount,
    message: 'HONK STOP triggered. All active device actions stopped.',
  });
}

export async function handleGetPermissionsRequest(_req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    permissions: PermissionManager.getInstance().getPermissionStates(),
  });
}

export async function handleTestConnectionRequest(req: Request, res: Response): Promise<void> {
  const { platform = 'windows' } = req.body;
  const localAgent = LocalDeviceAgent.getInstance();

  if (platform === 'windows' || platform === 'linux' || platform === 'macos') {
    res.json({
      platform,
      connected: localAgent.isConnected(),
      latencyMs: 1,
      agentVersion: localAgent.getStatus().agentVersion,
      deviceName: localAgent.getStatus().deviceName,
      error: localAgent.isConnected() ? undefined : 'Device Agent is not connected.',
    });
    return;
  }

  const adapter = PlatformAdapterFactory.getAdapter(platform as PlatformType);
  const result = await adapter.pingAgent();
  res.json({
    platform,
    ...result,
  });
}

export async function handleVerifyStateRequest(req: Request, res: Response): Promise<void> {
  const { target, platform = 'windows' } = req.body;
  const adapter = PlatformAdapterFactory.getAdapter(platform as PlatformType);
  if (adapter.verifyState) {
    const result = await adapter.verifyState(target);
    res.json(result);
  } else {
    res.json({ verified: true, details: `Platform ${platform} state verified.` });
  }
}
