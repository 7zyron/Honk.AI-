import React, { useState, useEffect } from 'react';
import { Terminal, X, RefreshCw, Cpu, Activity, ShieldAlert, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { WindowsAgentClient } from '../../lib/windowsAgentClient';
import { CrossDeviceManager } from '../../lib/crossDeviceManager';
import { DeviceDiagnosticInfo } from '../../types/device';

export interface HonkDesktopDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HonkDesktopDiagnosticsModal: React.FC<HonkDesktopDiagnosticsModalProps> = ({ isOpen, onClose }) => {
  const [diagnosticsData, setDiagnosticsData] = useState<unknown>(null);
  const [telemetryLogs, setTelemetryLogs] = useState<DeviceDiagnosticInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'raw'>('telemetry');

  const fetchDiagnostics = async () => {
    setIsLoading(true);
    try {
      const client = WindowsAgentClient.getInstance();
      const data = await client.fetchDiagnostics();
      setDiagnosticsData(data);
      const manager = CrossDeviceManager.getInstance();
      setTelemetryLogs(manager.getDiagnostics());
    } catch (e) {}
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[88vh] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl flex flex-col font-mono text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-4 bg-zinc-900/90">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-amber-400" />
            <h3 className="font-bold text-zinc-100">HONK UNIVERSAL AGENT - DEVELOPER DIAGNOSTICS & TELEMETRY</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchDiagnostics}
              disabled={isLoading}
              className="rounded p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/50 px-4">
          <button
            type="button"
            onClick={() => setActiveTab('telemetry')}
            className={`px-3 py-2 border-b-2 font-bold transition cursor-pointer ${
              activeTab === 'telemetry' ? 'border-amber-400 text-amber-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Real-Time Action Telemetry Table
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('raw')}
            className={`px-3 py-2 border-b-2 font-bold transition cursor-pointer ${
              activeTab === 'raw' ? 'border-amber-400 text-amber-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Raw System JSON Feed
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] space-y-1">
              <span className="text-zinc-500 block">Active Ports</span>
              <span className="text-zinc-200 font-bold">3001 (Win) | 3002 (And) | 3003 (Mac)</span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] space-y-1">
              <span className="text-zinc-500 block">Execution Rule</span>
              <span className="text-amber-400 font-bold">INTENT → EXECUTE → VERIFY</span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] space-y-1">
              <span className="text-zinc-500 block">Verification Integrity</span>
              <span className="text-emerald-400 font-bold">Strict OS Process / State Check</span>
            </div>
          </div>

          {activeTab === 'telemetry' && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Recent Action Diagnostics Log</span>
                <span className="text-zinc-500">{telemetryLogs.length} events recorded</span>
              </div>

              {telemetryLogs.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                  No action telemetry events recorded yet. Perform a device action like "Open YouTube" or test connection to see real-time diagnostics.
                </div>
              ) : (
                <div className="overflow-x-auto border border-zinc-800 rounded-xl">
                  <table className="w-full text-left text-[11px] whitespace-nowrap">
                    <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-semibold">
                      <tr>
                        <th className="p-2.5">DEVICE</th>
                        <th className="p-2.5">AGENT</th>
                        <th className="p-2.5">PERMISSION</th>
                        <th className="p-2.5">COMMAND</th>
                        <th className="p-2.5">TARGET</th>
                        <th className="p-2.5">STAGE</th>
                        <th className="p-2.5">RESULT</th>
                        <th className="p-2.5">VERIFICATION</th>
                        <th className="p-2.5">LATENCY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850 bg-black/40 text-zinc-300">
                      {telemetryLogs.map((log, idx) => (
                        <tr key={idx} className="hover:bg-zinc-900/50 transition">
                          <td className="p-2.5 font-bold text-zinc-200">{log.device}</td>
                          <td className="p-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                              log.agentStatus === 'Connected' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}>
                              {log.agentStatus}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                              log.permissionStatus === 'Granted' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              {log.permissionStatus}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-amber-400">{log.command}</td>
                          <td className="p-2.5 text-zinc-300">{log.target || '-'}</td>
                          <td className="p-2.5 font-mono text-zinc-400">{log.executionStage}</td>
                          <td className="p-2.5">
                            <span className={`font-bold ${log.result === 'Success' ? 'text-emerald-400' : log.result === 'Disconnected' ? 'text-red-400' : 'text-amber-400'}`}>
                              {log.result}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                              log.verification === 'Passed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : log.verification === 'Failed' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {log.verification}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-zinc-400">{log.latencyMs}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'raw' && (
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Raw Diagnostics JSON</div>
              <pre className="p-4 rounded-xl bg-black border border-zinc-800 text-emerald-400 text-[11px] overflow-x-auto whitespace-pre-wrap max-h-96">
                {diagnosticsData ? JSON.stringify(diagnosticsData, null, 2) : 'Loading diagnostics...'}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 p-3 bg-zinc-900/80 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Developer Diagnostic & Telemetry Console</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
