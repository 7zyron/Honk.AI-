import React from 'react';
import { Zap, Wifi, WifiOff, ShieldCheck } from 'lucide-react';

interface LowDataBadgeProps {
  isLowData: boolean;
  onToggleLowData: () => void;
  isOffline?: boolean;
}

export const LowDataBadge: React.FC<LowDataBadgeProps> = ({
  isLowData,
  onToggleLowData,
  isOffline,
}) => {
  return (
    <button
      id="low-data-mode-toggle-btn"
      type="button"
      onClick={onToggleLowData}
      className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${
        isLowData
          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-sm hover:bg-emerald-900/60'
          : 'bg-zinc-900 border-zinc-700/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
      }`}
      title={
        isLowData
          ? 'Low-Data Mode Active (2G / Slow Network Optimized)'
          : 'Enable Low-Data Mode for 2G / slow connections'
      }
    >
      {isOffline ? (
        <WifiOff className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
      ) : isLowData ? (
        <Zap className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400/30" />
      ) : (
        <Wifi className="h-3.5 w-3.5 text-zinc-400" />
      )}
      <span className="hidden sm:inline">
        {isOffline ? 'Offline' : isLowData ? '2G Low-Data ON' : 'Low-Data'}
      </span>
      {isLowData && (
        <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
      )}
    </button>
  );
};
