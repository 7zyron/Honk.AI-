import React from 'react';
import { Loader2, Square, Eye, Smartphone, ShieldCheck } from 'lucide-react';

export interface ActiveActionIndicatorProps {
  statusText: string;
  targetApp?: string;
  isExecuting: boolean;
  onStop: () => void;
}

export const ActiveActionIndicator: React.FC<ActiveActionIndicatorProps> = ({
  statusText,
  targetApp,
  isExecuting,
  onStop,
}) => {
  if (!isExecuting && !statusText) return null;

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 my-2 rounded-xl bg-zinc-900/90 border border-amber-500/40 text-amber-300 shadow-md backdrop-blur animate-in fade-in duration-200">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative flex items-center justify-center shrink-0">
          <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
          <span className="absolute h-2 w-2 rounded-full bg-amber-400 animate-ping opacity-75" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-100 truncate">
            <Smartphone className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>{statusText || 'Honk is working...'}</span>
          </div>
          {targetApp && (
            <div className="text-[10px] text-zinc-400 flex items-center gap-1 truncate">
              <Eye className="h-3 w-3 text-zinc-500" />
              <span>Target: {targetApp}</span>
              <span className="text-zinc-600">•</span>
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              <span>Permission Protected</span>
            </div>
          )}
        </div>
      </div>

      {/* Prominent Emergency STOP Button */}
      <button
        type="button"
        onClick={onStop}
        title='Emergency Stop: Say "HONK STOP" or click STOP to cancel'
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-xs transition-all shadow-md shadow-red-600/30 cursor-pointer shrink-0 border border-red-400/50"
      >
        <Square className="h-3.5 w-3.5 fill-current" />
        <span>STOP</span>
      </button>
    </div>
  );
};
