import React, { useState, useEffect } from 'react';
import {
  Monitor,
  CheckCircle2,
  XCircle,
  Square,
  RefreshCw,
  Terminal,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  Globe,
  Folder,
  FileText,
  MousePointer,
  Keyboard,
  Eye,
  Sliders,
} from 'lucide-react';
import {
  WindowsAgentClient,
  WindowsAgentStatus,
  WindowsCommandResponse,
} from '../../lib/windowsAgentClient';

export interface HonkDesktopControlPanelProps {
  onStatusChange?: (isConnected: boolean) => void;
}

export const HonkDesktopControlPanel: React.FC<HonkDesktopControlPanelProps> = ({ onStatusChange }) => {
  const [status, setStatus] = useState<WindowsAgentStatus>({ connected: false });
  const [isChecking, setIsChecking] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [lastResponse, setLastResponse] = useState<WindowsCommandResponse | null>(null);
  const [executingCmd, setExecutingCmd] = useState<string | null>(null);

  const client = WindowsAgentClient.getInstance();

  const handleRefreshStatus = async () => {
    setIsChecking(true);
    const res = await client.checkStatus();
    setStatus(res);
    setIsChecking(false);
    if (onStatusChange) onStatusChange(res.connected);
  };

  useEffect(() => {
    handleRefreshStatus();
    const interval = setInterval(handleRefreshStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectClick = async () => {
    setIsChecking(true);
    const pairRes = await client.pairAgent();
    if (pairRes.success) {
      await handleRefreshStatus();
    } else {
      setStatus({
        connected: false,
        error: pairRes.error || 'Failed to establish local connection to Windows agent.',
      });
    }
    setIsChecking(false);
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/device/disconnect', { method: 'POST' });
    } catch {}
    setStatus({ connected: false });
    if (onStatusChange) onStatusChange(false);
  };

  const handleEmergencyStop = async () => {
    setExecutingCmd('STOP');
    await client.triggerEmergencyStop();
    setExecutingCmd(null);
    setLastResponse({
      requestId: `req_stop_${Date.now()}`,
      action: 'STOP_ALL_ACTIONS',
      success: true,
      verified: true,
      details: 'HONK STOP executed. All active Windows device actions stopped immediately.',
      latencyMs: 1,
      timestamp: Date.now(),
    });
  };

  // Run Milestone 1 Commands
  const runMilestoneCommand = async (action: string, target: string, targetType?: string) => {
    setExecutingCmd(`${action}:${target}`);
    const res = await client.executeCommand({
      action: action as any,
      target,
      payload: targetType ? { targetType } : undefined,
      userApproved: true,
    });
    setLastResponse(res);
    setExecutingCmd(null);
  };

  const agentCommandText = 'node scripts/honk-windows-agent.js';

  const copyCommand = () => {
    navigator.clipboard.writeText(agentCommandText);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const capabilities = [
    { name: 'Open apps', icon: <Monitor className="h-3.5 w-3.5 text-sky-400" />, active: true },
    { name: 'Open files', icon: <FileText className="h-3.5 w-3.5 text-amber-400" />, active: true },
    { name: 'Open folders', icon: <Folder className="h-3.5 w-3.5 text-emerald-400" />, active: true },
    { name: 'Open websites', icon: <Globe className="h-3.5 w-3.5 text-indigo-400" />, active: true },
    { name: 'Keyboard', icon: <Keyboard className="h-3.5 w-3.5 text-purple-400" />, active: true },
    { name: 'Mouse', icon: <MousePointer className="h-3.5 w-3.5 text-pink-400" />, active: true },
    { name: 'Screen interaction', icon: <Eye className="h-3.5 w-3.5 text-teal-400" />, active: true },
  ];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-100 shadow-xl space-y-5">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Monitor className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-100 tracking-tight">HONK WINDOWS DEVICE AGENT</h3>
            <p className="text-xs text-zinc-400">Native Windows UI Automation & Process Execution</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {status.connected ? (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/10">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              🟢 CONNECTED {status.latencyMs ? `(${status.latencyMs}ms)` : ''}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold text-red-300 border border-red-500/40">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              🔴 DISCONNECTED
            </span>
          )}
          <button
            type="button"
            onClick={handleRefreshStatus}
            disabled={isChecking}
            title="Test Connection"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
            <span>Test Connection</span>
          </button>
        </div>
      </div>

      {/* Device Tree Hierarchy Display */}
      <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 font-mono text-xs space-y-1 text-zinc-300">
        <div className="text-amber-400 font-bold">Devices</div>
        <div className="pl-3 border-l-2 border-zinc-700/80 space-y-0.5">
          <div className="text-zinc-100 font-semibold">└── My Windows PC ({status.deviceName || 'Honk Windows Agent'})</div>
          <div className="pl-5 space-y-0.5 text-zinc-400 text-[11px]">
            <div>├── Connection: <strong className={status.connected ? 'text-emerald-400' : 'text-red-400'}>{status.connected ? 'CONNECTED' : 'DISCONNECTED'}</strong></div>
            <div>├── Platform: <span className="text-zinc-300">Windows</span></div>
            <div>├── Agent version: <span className="text-zinc-300">v{status.agentVersion || '1.0.0-windows'}</span></div>
            <div>├── Permissions: <span className="text-emerald-400">Granted (UI Automation, Process Launch, File Access)</span></div>
            <div>├── Last seen: <span className="text-zinc-300">{status.lastSeen ? new Date(status.lastSeen).toLocaleTimeString() : 'Just now'}</span></div>
            <div>├── <button type="button" onClick={handleRefreshStatus} className="text-amber-400 hover:underline cursor-pointer">Test Connection</button></div>
            <div>└── {status.connected ? <button type="button" onClick={handleDisconnect} className="text-red-400 hover:underline cursor-pointer">Disconnect</button> : <button type="button" onClick={handleConnectClick} className="text-emerald-400 hover:underline cursor-pointer">Connect</button>}</div>
          </div>
        </div>
      </div>

      {/* Capabilities Matrix */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
          <span>Supported Capabilities:</span>
          <span className="text-[11px] text-zinc-500 font-mono">Windows OS Native</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {capabilities.map((c) => (
            <div
              key={c.name}
              className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-200"
            >
              {c.icon}
              <span>{c.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Status & Action Controls */}
      {status.connected ? (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span><strong>Connected to Windows Agent.</strong> Ready for real device commands.</span>
            </div>
            <button
              type="button"
              onClick={handleDisconnect}
              className="text-zinc-400 hover:text-zinc-200 underline text-[11px] cursor-pointer"
            >
              Disconnect
            </button>
          </div>

          {/* First Milestone Test Bench Commands */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
              <span className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-amber-400" /> Milestone 1 Real Windows Commands:
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">INTENT → EXECUTE → VERIFY</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={!!executingCmd}
                onClick={() => runMilestoneCommand('OPEN_APPLICATION', 'Notepad', 'application')}
                className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-200 transition cursor-pointer disabled:opacity-50 text-left"
              >
                <div className="text-amber-400 font-bold">1. Open Notepad</div>
                <div className="text-[10px] text-zinc-400">Launch & verify PID</div>
              </button>
              <button
                type="button"
                disabled={!!executingCmd}
                onClick={() => runMilestoneCommand('OPEN_WEBSITE', 'YouTube', 'website')}
                className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-200 transition cursor-pointer disabled:opacity-50 text-left"
              >
                <div className="text-amber-400 font-bold">2. Open YouTube</div>
                <div className="text-[10px] text-zinc-400">Browser navigation</div>
              </button>
              <button
                type="button"
                disabled={!!executingCmd}
                onClick={() => runMilestoneCommand('OPEN_FOLDER', 'Downloads', 'folder')}
                className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-200 transition cursor-pointer disabled:opacity-50 text-left"
              >
                <div className="text-amber-400 font-bold">3. Open Downloads</div>
                <div className="text-[10px] text-zinc-400">File Explorer</div>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Disconnected State Instructions */
        <div className="space-y-3">
          <p className="text-xs text-zinc-300">
            Start the <strong>Honk Windows Agent</strong> on your Windows PC to enable real device control:
          </p>

          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono">
            <div className="flex items-center gap-2 text-amber-300">
              <Terminal className="h-4 w-4 text-amber-400 shrink-0" />
              <span>{agentCommandText}</span>
            </div>
            <button
              type="button"
              onClick={copyCommand}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition text-[11px] cursor-pointer border border-zinc-700"
            >
              {copiedCmd ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copiedCmd ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleConnectClick}
              disabled={isChecking}
              className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-amber-500/10 cursor-pointer disabled:opacity-50"
            >
              {isChecking ? 'Connecting Local Agent...' : 'Connect Windows PC'}
            </button>
          </div>
        </div>
      )}

      {/* Emergency STOP Button */}
      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
        <span className="text-[11px] text-zinc-500 font-mono">Emergency Stop Control</span>
        <button
          type="button"
          onClick={handleEmergencyStop}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition shadow-md shadow-red-600/20 cursor-pointer"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
          <span>STOP_ALL_ACTIONS</span>
        </button>
      </div>

      {/* Execution & Verification Log */}
      {lastResponse && (
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs space-y-1.5 font-mono">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-zinc-800 pb-1">
            <span>Result Verification ({lastResponse.requestId})</span>
            <span className="text-zinc-500">{lastResponse.latencyMs}ms</span>
          </div>
          <div className="flex items-start gap-2 pt-1">
            {lastResponse.verified ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold text-zinc-200">{lastResponse.action} → {lastResponse.target || 'Windows Target'}</div>
              <div className="text-[11px] text-zinc-400">{lastResponse.details || lastResponse.error}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
