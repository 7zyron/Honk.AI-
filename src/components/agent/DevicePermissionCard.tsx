import React from 'react';
import { Shield, ShieldAlert, CheckCircle2, XCircle, Smartphone, AlertTriangle } from 'lucide-react';

export interface DevicePermissionCardProps {
  intentId: string;
  actionType: string;
  targetApp?: string;
  targetElement?: string;
  explanationDesi: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiredOSPermission: string;
  isSensitive?: boolean;
  sensitiveCategory?: string;
  onAllow: (intentId: string) => void;
  onDeny: (intentId: string) => void;
  isResolved?: boolean;
  resolvedOutcome?: 'allowed' | 'denied';
}

export const DevicePermissionCard: React.FC<DevicePermissionCardProps> = ({
  intentId,
  actionType,
  targetApp,
  targetElement,
  explanationDesi,
  riskLevel,
  requiredOSPermission,
  isSensitive,
  sensitiveCategory,
  onAllow,
  onDeny,
  isResolved = false,
  resolvedOutcome,
}) => {
  const isCritical = riskLevel === 'CRITICAL' || isSensitive;

  const getRiskBadge = () => {
    switch (riskLevel) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      case 'LOW':
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className={`my-3 overflow-hidden rounded-xl border p-4 text-xs transition-all shadow-lg ${
      isCritical
        ? 'bg-red-950/20 border-red-500/40 shadow-red-500/5'
        : 'bg-zinc-900/90 border-amber-500/30 shadow-amber-500/5'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          {isCritical ? (
            <ShieldAlert className="h-4 w-4 text-red-400 animate-pulse" />
          ) : (
            <Shield className="h-4 w-4 text-amber-400" />
          )}
          <span className="font-bold text-zinc-100 tracking-tight">HONK PERMISSION REQUEST</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${getRiskBadge()}`}>
            {riskLevel} RISK
          </span>
          <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
            <Smartphone className="h-3 w-3 text-zinc-500" />
            {requiredOSPermission}
          </span>
        </div>
      </div>

      {/* Main Body */}
      <div className="py-3 space-y-2">
        <p className="text-zinc-200 text-sm font-medium leading-relaxed">
          {explanationDesi || `I need device permission to execute this action. Would you like to allow it?`}
        </p>

        {isSensitive && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Sensitive Device Action ({sensitiveCategory || 'Security/Finance'})</span>
              <span className="text-[11px] text-red-300/80">
                Honk will never act automatically or expose passwords, OTPs, or credentials.
              </span>
            </div>
          </div>
        )}

        <div className="text-[11px] text-zinc-400 bg-zinc-950/60 p-2 rounded border border-zinc-800/80 font-mono space-y-1">
          <div><span className="text-zinc-500">Action Type:</span> {actionType}</div>
          {targetApp && <div><span className="text-zinc-500">Target App:</span> {targetApp}</div>}
          {targetElement && <div><span className="text-zinc-500">Target Element:</span> {targetElement}</div>}
          <div><span className="text-zinc-500">Tagline:</span> Made by India. Made for India. Permission First. Action Second.</div>
        </div>
      </div>

      {/* Action Buttons / Outcome State */}
      {!isResolved ? (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={() => onDeny(intentId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors cursor-pointer border border-zinc-700"
          >
            <XCircle className="h-3.5 w-3.5 text-zinc-400" />
            <span>Deny</span>
          </button>
          <button
            type="button"
            onClick={() => onAllow(intentId)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-semibold transition-all cursor-pointer shadow-md ${
              isCritical
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
                : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{isCritical ? 'Confirm Action' : 'Allow Access'}</span>
          </button>
        </div>
      ) : (
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
          <span className="text-zinc-400">Permission State:</span>
          {resolvedOutcome === 'allowed' ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Permission Granted
            </span>
          ) : (
            <span className="text-red-400 font-semibold flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5" /> Denied (Honk stopped)
            </span>
          )}
        </div>
      )}
    </div>
  );
};
