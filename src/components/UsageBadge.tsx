import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle, Clock, Info } from 'lucide-react';
import { DailyUsage } from '../types';

interface UsageBadgeProps {
  usage: DailyUsage | null;
  onRefresh?: () => void;
}

export const UsageBadge: React.FC<UsageBadgeProps> = ({ usage }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  useEffect(() => {
    if (!usage?.resetAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, usage.resetAt - now);
      if (diff <= 0) {
        setTimeUntilReset('Resetting now...');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeUntilReset(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [usage?.resetAt]);

  if (!usage) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-zinc-800/80 px-2.5 py-1 text-xs text-zinc-400 border border-zinc-700/50">
        <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
        <span>100 msgs/day quota</span>
      </div>
    );
  }

  const { limit, used, remaining } = usage;
  const isExhausted = remaining <= 0;
  const isWarning = remaining > 0 && remaining <= 15;

  return (
    <div className="relative inline-block">
      <button
        id="usage-quota-badge-btn"
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border transition ${
          isExhausted
            ? 'bg-rose-950/60 text-rose-300 border-rose-800/70 hover:bg-rose-900/60'
            : isWarning
            ? 'bg-amber-950/60 text-amber-300 border-amber-700/60 hover:bg-amber-900/60'
            : 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60 hover:bg-zinc-800 hover:text-zinc-100'
        }`}
      >
        {isExhausted ? (
          <AlertCircle className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
        ) : (
          <ShieldCheck className={`h-3.5 w-3.5 ${isWarning ? 'text-amber-400' : 'text-emerald-400'}`} />
        )}
        <span className="font-semibold">{remaining}</span>
        <span className="text-[11px] opacity-75">/ {limit} left</span>
      </button>

      {showTooltip && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-zinc-700/80 bg-zinc-900 p-3.5 shadow-2xl text-xs text-zinc-300 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-100">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span>Backend Quota Status</span>
            </div>
            <span className={`text-[11px] font-bold ${isExhausted ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isExhausted ? 'Limit Reached' : `${remaining} Remaining`}
            </span>
          </div>

          <div className="mt-2.5 space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-zinc-400">Used today:</span>
              <span className="font-medium text-zinc-200">{used} of {limit}</span>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isExhausted ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-amber-400'
                }`}
                style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <div className="flex items-center gap-1 text-zinc-400">
                <Clock className="h-3 w-3" />
                <span>Next 24h reset:</span>
              </div>
              <span className="font-mono font-medium text-amber-300">{timeUntilReset || 'Calculating...'}</span>
            </div>

            {isExhausted && (
              <div className="rounded-lg bg-rose-900/40 p-2 text-rose-200 text-[11px] border border-rose-800/50">
                ⚠️ Daily limit reached — try again tomorrow. Counter will automatically refresh after 24h.
              </div>
            )}

            <div className="flex items-start gap-1.5 text-[10px] text-zinc-400 border-t border-zinc-800/70 pt-2">
              <Info className="h-3 w-3 mt-0.5 shrink-0 text-zinc-400" />
              <span>Server-enforced rate limit prevents abuse and guarantees 100 high-speed messages daily.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
