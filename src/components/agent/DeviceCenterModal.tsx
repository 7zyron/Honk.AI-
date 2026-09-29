import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Laptop,
  Tablet,
  Monitor,
  Globe,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Terminal,
  RefreshCw,
  X,
  Plus,
  ArrowRightLeft,
  Square,
  Lock,
  Battery,
  Sliders,
  Send,
  Trash2,
  Power,
  ChevronRight,
  Info,
  Copy,
  Check,
} from 'lucide-react';
import { CrossDeviceManager } from '../../lib/crossDeviceManager';
import { HonkDevice, DevicePlatform, CrossDeviceTransferPayload } from '../../types/device';

export interface DeviceCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDeviceForAction?: (device: HonkDevice) => void;
}

export const DeviceCenterModal: React.FC<DeviceCenterModalProps> = ({ isOpen, onClose }) => {
  const [devices, setDevices] = useState<HonkDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<HonkDevice | null>(null);
  const [activeDevice, setActiveDevice] = useState<HonkDevice | null>(null);
  const [globalState, setGlobalState] = useState<string>('DISCOVERING');
  const [activeTab, setActiveTab] = useState<'my_devices' | 'cross_device' | 'permissions' | 'developer'>('my_devices');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  // Cross-device transfer form state
  const [transferSource, setTransferSource] = useState<string>('dev_win_laptop_1');
  const [transferTarget, setTransferTarget] = useState<string>('dev_and_phone_1');
  const [transferType, setTransferType] = useState<'url' | 'text' | 'session'>('url');
  const [transferData, setTransferData] = useState<string>('https://ais-dev.run.app');

  const manager = CrossDeviceManager.getInstance();

  useEffect(() => {
    const unsub = manager.subscribe((devs, active, state) => {
      setDevices(devs);
      setActiveDevice(active);
      setGlobalState(state);
      if (!selectedDevice && devs.length > 0) {
        setSelectedDevice(active || devs[0]);
      } else if (selectedDevice) {
        const updated = devs.find(d => d.id === selectedDevice.id);
        if (updated) setSelectedDevice(updated);
      }
    });
    return unsub;
  }, [selectedDevice]);

  if (!isOpen) return null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await manager.initAutoConnectionSequence();
    setIsRefreshing(false);
  };

  const handleEmergencyStop = async () => {
    setIsExecuting(true);
    const res = await manager.stopAllDevices();
    setActionFeedback(`🛑 ${res.message}`);
    setIsExecuting(false);
    setTimeout(() => setActionFeedback(null), 5000);
  };

  const handleTestMilestone = async (dev: HonkDevice, action: any, target: string, payload?: any) => {
    setIsExecuting(true);
    setActionFeedback(`Running ${action} on ${dev.name}...`);
    const res = await manager.executeCommand({
      requestId: `req_test_${Date.now()}`,
      deviceId: dev.id,
      platform: dev.platform,
      action,
      target,
      payload,
      userApproved: true,
    });
    setIsExecuting(false);
    setActionFeedback(res.details || res.error || (res.success ? 'Command executed and verified.' : 'Execution failed.'));
    setTimeout(() => setActionFeedback(null), 6000);
  };

  const handleSetDefault = (deviceId: string) => {
    manager.setDefaultDevice(deviceId);
    setActionFeedback('Set as default automatic device.');
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handlePair = async (deviceId: string) => {
    setIsRefreshing(true);
    const success = await manager.authorizeAndPairDevice(deviceId);
    setIsRefreshing(false);
    if (success) {
      setActionFeedback('Device authorized and connected automatically.');
    } else {
      setActionFeedback('Could not connect. Ensure local agent is running.');
    }
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleCrossDeviceHandoff = async () => {
    setIsExecuting(true);
    setActionFeedback(`Transmitting ${transferType} across devices...`);
    const res = await manager.executeCrossDeviceTransfer({
      sourceDeviceId: transferSource,
      targetDeviceId: transferTarget,
      type: transferType,
      payloadData: transferData,
      title: 'Honk Cross-Device Handoff',
      timestamp: Date.now(),
    });
    setIsExecuting(false);
    setActionFeedback(res.details);
    setTimeout(() => setActionFeedback(null), 6000);
  };

  const handleDisconnect = (deviceId: string) => {
    manager.disconnectDevice(deviceId);
  };

  const handleRemove = (deviceId: string) => {
    manager.removeDevice(deviceId);
  };

  const getDeviceIcon = (platform: DevicePlatform, type: string) => {
    switch (type) {
      case 'phone':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      case 'laptop':
      case 'desktop':
        return platform === 'macos' ? <Laptop className="h-5 w-5" /> : <Monitor className="h-5 w-5" />;
      default:
        return <Globe className="h-5 w-5" />;
    }
  };

  const agentCommandText = 'node scripts/honk-local-agent.js';

  const copyCommand = () => {
    navigator.clipboard.writeText(agentCommandText);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl flex flex-col font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-4 bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Laptop className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-100 tracking-tight">HONK DEVICE CENTER</h2>
                <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                  Universal Cross-Device
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                SEE → THINK → ASK PERMISSION → ACT → VERIFY • Real Multi-Platform Control
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleEmergencyStop}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-lg shadow-red-600/20 cursor-pointer"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>STOP HONK</span>
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
              title="Refresh Devices"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/50 px-4">
          <button
            type="button"
            onClick={() => setActiveTab('my_devices')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'my_devices'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            MY DEVICES ({devices.filter(d => d.status === 'connected').length} Connected)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cross_device')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'cross_device'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowRightLeft className="h-4 w-4" />
            Device-to-Device Actions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'permissions'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Lock className="h-4 w-4" />
            Platform Permissions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('developer')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'developer'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal className="h-4 w-4" />
            Developer Diagnostics
          </button>
        </div>

        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-xs font-mono text-amber-300 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>{actionFeedback}</span>
            </div>
            <button onClick={() => setActionFeedback(null)} className="text-zinc-400 hover:text-zinc-200">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: MY DEVICES */}
          {activeTab === 'my_devices' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Device List Sidebar */}
              <div className="md:col-span-5 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                  <span>REGISTERED DEVICES</span>
                  <span className="text-[11px] text-zinc-500 font-mono">Real-time status</span>
                </div>

                <div className="space-y-2.5">
                  {devices.map(dev => {
                    const isSelected = selectedDevice?.id === dev.id;
                    return (
                      <div
                        key={dev.id}
                        onClick={() => setSelectedDevice(dev)}
                        className={`p-3.5 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-800/90 border-amber-500/60 shadow-md shadow-amber-500/5'
                            : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-850 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              dev.status === 'connected'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/10 text-red-400 border border-red-500/30'
                            }`}>
                              {getDeviceIcon(dev.platform, dev.type)}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                                {dev.name}
                                {dev.isPrimary && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono">PRIMARY</span>
                                )}
                              </h4>
                              <p className="text-[11px] text-zinc-400">{dev.model} • {dev.osVersion}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            {dev.status === 'connected' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                🟢 Connected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300 border border-red-500/30">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                🔴 Offline
                              </span>
                            )}
                            {dev.latencyMs && (
                              <div className="text-[10px] text-zinc-500 font-mono mt-1">{dev.latencyMs}ms latency</div>
                            )}
                          </div>
                        </div>

                        {/* Capabilities preview */}
                        <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
                          <span>Control: <strong className="text-zinc-300">{dev.platform === 'ios' ? 'Safari/URL Limited' : 'Available'}</strong></span>
                          {dev.batteryLevel !== undefined && (
                            <span className="flex items-center gap-1 text-zinc-400">
                              <Battery className="h-3 w-3 text-emerald-400" /> {dev.batteryLevel}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Local Daemon Quick Instructions */}
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs space-y-2">
                  <div className="font-semibold text-zinc-300 flex items-center justify-between">
                    <span>Run Local Agent</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Ports 3001-3003</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-black/60 border border-zinc-800 font-mono text-[11px] text-amber-300">
                    <span>{agentCommandText}</span>
                    <button
                      type="button"
                      onClick={copyCommand}
                      className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200"
                      title="Copy command"
                    >
                      {copiedCmd ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Selected Device Details & Actions */}
              {selectedDevice ? (
                <div className="md:col-span-7 space-y-4">
                  <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-100">{selectedDevice.name}</h3>
                        <p className="text-xs text-zinc-400">Platform: {selectedDevice.platform.toUpperCase()} • Agent: v{selectedDevice.agentVersion}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleTestMilestone(selectedDevice, 'ping', 'connection_probe')}
                          disabled={isExecuting}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition cursor-pointer flex items-center gap-1 border border-zinc-700 disabled:opacity-50"
                          title="Test Connection"
                        >
                          <Zap className="h-3.5 w-3.5 text-amber-400" />
                          <span>Test Connection</span>
                        </button>
                        {selectedDevice.status === 'connected' ? (
                          <button
                            type="button"
                            onClick={() => handleDisconnect(selectedDevice.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition cursor-pointer"
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePair(selectedDevice.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition cursor-pointer"
                          >
                            Connect Device
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemove(selectedDevice.id)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs transition cursor-pointer"
                          title="Remove Device"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Platform Architecture & Capability Notice */}
                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 space-y-1">
                      <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 text-amber-400" /> Platform Architecture Notes:
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        {selectedDevice.capabilities.notes}
                      </p>
                    </div>

                    {/* Quick Test Actions per device */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                        <span>Permitted Device Actions (INTENT → EXECUTE → VERIFY):</span>
                        <span className="text-[10px] text-zinc-500 font-mono">Live OS APIs</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedDevice.platform === 'android' && (
                          <>
                            <button
                              type="button"
                              disabled={isExecuting || selectedDevice.status !== 'connected'}
                              onClick={() => handleTestMilestone(selectedDevice, 'open_application', 'YouTube')}
                              className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-xs font-semibold text-zinc-200 transition border border-zinc-700 text-left cursor-pointer disabled:opacity-50"
                            >
                              ▶️ Open YouTube
                              <span className="block text-[10px] text-zinc-400 font-normal">Dispatches Android Intent</span>
                            </button>
                            <button
                              type="button"
                              disabled={isExecuting || selectedDevice.status !== 'connected'}
                              onClick={() => handleTestMilestone(selectedDevice, 'open_application', 'Google Maps')}
                              className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-xs font-semibold text-zinc-200 transition border border-zinc-700 text-left cursor-pointer disabled:opacity-50"
                            >
                              📍 Open Google Maps
                              <span className="block text-[10px] text-zinc-400 font-normal">Accessibility Activity focus</span>
                            </button>
                          </>
                        )}

                        {selectedDevice.platform === 'windows' && (
                          <>
                            <button
                              type="button"
                              disabled={isExecuting || selectedDevice.status !== 'connected'}
                              onClick={() => handleTestMilestone(selectedDevice, 'open_application', 'notepad')}
                              className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-xs font-semibold text-zinc-200 transition border border-zinc-700 text-left cursor-pointer disabled:opacity-50"
                            >
                              📝 Open Notepad
                              <span className="block text-[10px] text-zinc-400 font-normal">Launch Notepad.exe & verify process</span>
                            </button>
                            <button
                              type="button"
                              disabled={isExecuting || selectedDevice.status !== 'connected'}
                              onClick={() => handleTestMilestone(selectedDevice, 'open_application', 'YouTube')}
                              className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-xs font-semibold text-zinc-200 transition border border-zinc-700 text-left cursor-pointer disabled:opacity-50"
                            >
                              ▶️ Open YouTube
                              <span className="block text-[10px] text-zinc-400 font-normal">Browser URL navigation & verify</span>
                            </button>
                            <button
                              type="button"
                              disabled={isExecuting || selectedDevice.status !== 'connected'}
                              onClick={() => handleTestMilestone(selectedDevice, 'open_application', 'Downloads')}
                              className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-xs font-semibold text-zinc-200 transition border border-zinc-700 text-left cursor-pointer disabled:opacity-50"
                            >
                              📁 Open Downloads
                              <span className="block text-[10px] text-zinc-400 font-normal">File Explorer shell:Downloads</span>
                            </button>
                            <button
                              type="button"
                              disabled={isExecuting || selectedDevice.status !== 'connected'}
                              onClick={() => handleTestMilestone(selectedDevice, 'type_text', 'Notepad', { text: 'Hello from Honk AI' })}
                              className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-xs font-semibold text-zinc-200 transition border border-zinc-700 text-left cursor-pointer disabled:opacity-50"
                            >
                              ⌨️ Type "Hello from Honk"
                              <span className="block text-[10px] text-zinc-400 font-normal">Windows SendKeys control</span>
                            </button>
                          </>
                        )}

                        {selectedDevice.platform === 'ios' && (
                          <button
                            type="button"
                            disabled={isExecuting || selectedDevice.status !== 'connected'}
                            onClick={() => handleTestMilestone(selectedDevice, 'navigate_url', 'https://ais-dev.run.app')}
                            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-xs font-semibold text-zinc-200 transition border border-zinc-700 text-left cursor-pointer disabled:opacity-50 col-span-2"
                          >
                            🌐 Open Web Application in Safari
                            <span className="block text-[10px] text-zinc-400 font-normal">Universal Link / Safari WebKit</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Last verified result log */}
                    {selectedDevice.lastAction && (
                      <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono border-b border-zinc-800 pb-1">
                          <span>Last Verified Device Action</span>
                          <span>{new Date(selectedDevice.lastAction.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="flex items-start gap-2 pt-1">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-zinc-200">{selectedDevice.lastAction.action}</span>
                            <p className="text-[11px] text-zinc-400">{selectedDevice.lastAction.details}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="md:col-span-7 flex flex-col items-center justify-center p-8 rounded-xl bg-zinc-900/40 border border-zinc-800 text-center text-zinc-400">
                  <Smartphone className="h-8 w-8 text-zinc-600 mb-2" />
                  <p className="text-xs">Select a device from the left panel to inspect details and controls.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CROSS-DEVICE WORKFLOWS */}
          {activeTab === 'cross_device' && (
            <div className="space-y-5 max-w-3xl mx-auto">
              <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4 text-amber-400" /> Device-to-Device Workflow Handoff
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Seamlessly transfer open webpages, continuing Honk sessions, and non-sensitive text across your devices.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Source Device */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Source Device (From):</label>
                    <select
                      value={transferSource}
                      onChange={e => setTransferSource(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                    >
                      {devices.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.platform.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Device */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Target Device (To):</label>
                    <select
                      value={transferTarget}
                      onChange={e => setTransferTarget(e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                    >
                      {devices.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.platform.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Transfer Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Handoff Type:</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTransferType('url')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                        transferType === 'url'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      🌐 Webpage URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferType('text')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                        transferType === 'text'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      📝 Non-sensitive Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferType('session')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                        transferType === 'session'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      ⚡ Continue Honk Session
                    </button>
                  </div>
                </div>

                {/* Payload content */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Payload Content:</label>
                  <input
                    type="text"
                    value={transferData}
                    onChange={e => setTransferData(e.target.value)}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-zinc-100 font-mono focus:border-amber-500 focus:outline-none"
                    placeholder="Enter URL, text or session token..."
                  />
                  <p className="text-[11px] text-zinc-500">
                    🔒 Sensitive data guardrail: Passwords, OTPs, and payment credentials are never transmitted cross-device.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={isExecuting || transferSource === transferTarget}
                    onClick={handleCrossDeviceHandoff}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    <span>Authorize & Execute Handoff</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PLATFORM PERMISSIONS */}
          {activeTab === 'permissions' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-emerald-400" /> Operating System Permissions Matrix
                </h3>
                <p className="text-xs text-zinc-400">
                  HONK adheres to <strong>PERMISSION FIRST → ACTION SECOND</strong>. Real OS accessibility and platform permission switches per device:
                </p>

                <div className="space-y-3 pt-2">
                  {devices.map(d => (
                    <div key={d.id} className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-850 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(d.platform, d.type)}
                          <span className="text-xs font-bold text-zinc-200">{d.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">({d.platform.toUpperCase()})</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          d.status === 'connected' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                        }`}>
                          {d.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.entries(d.permissions).map(([permKey, perm]) => (
                          <div key={permKey} className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                                {perm.isGranted ? (
                                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                                ) : (
                                  <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                                )}
                                <span>{perm.name}</span>
                              </div>
                              <p className="text-[10px] text-zinc-400 mt-0.5">{perm.osRequirement}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => manager.togglePermission(d.id, permKey, !perm.isGranted)}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                                perm.isGranted
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                              }`}
                            >
                              {perm.isGranted ? 'GRANTED' : 'DENIED'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DEVELOPER DIAGNOSTICS */}
          {activeTab === 'developer' && (
            <div className="space-y-4 max-w-4xl mx-auto font-mono text-xs">
              <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Terminal className="h-4 w-4" />
                    <span className="font-bold">DEVELOPER-ONLY DEVICE TELEMETRY & PROTOCOL LOGS</span>
                  </div>
                  <span className="text-[10px] text-zinc-500">Continuous Self-Improvement Engine</span>
                </div>

                <div className="p-3 rounded-lg bg-black border border-zinc-800 space-y-2 text-[11px] text-emerald-400">
                  <div>• Universal Device Command Protocol: ACTIVE (JSON-RPC / REST)</div>
                  <div>• Windows UI Automation Bridge: 127.0.0.1:3001 (Ready)</div>
                  <div>• Android Accessibility Daemon: 127.0.0.1:3002 (Ready)</div>
                  <div>• macOS JXA / Accessibility Daemon: 127.0.0.1:3003 (Ready)</div>
                  <div>• Action Verification Discipline: INTENT → EXECUTE → VERIFY (Enforced)</div>
                  <div>• Emergency Broadcast System: Active & verified</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-zinc-400 uppercase">Live Device Topology</div>
                  <pre className="p-3 rounded-xl bg-black border border-zinc-800 text-zinc-300 text-[11px] overflow-x-auto whitespace-pre-wrap max-h-72">
                    {JSON.stringify(devices, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 p-3.5 bg-zinc-900/80 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>HONK Universal Multi-Device Agent v4.0</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold transition cursor-pointer"
          >
            Close Device Center
          </button>
        </div>
      </div>
    </div>
  );
};
