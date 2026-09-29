import React, { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, AlertCircle, Sparkles } from 'lucide-react';

interface HonestDisclaimerProps {
  isLowData?: boolean;
}

export const HonestDisclaimer: React.FC<HonestDisclaimerProps> = ({ isLowData }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-2.5 text-[11px] text-zinc-400">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
          <Shield className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span>Honest AI Verification & Guidance</span>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 transition"
        >
          <span>{isExpanded ? 'Hide info' : 'Verification Notes'}</span>
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-zinc-800/80 space-y-2 text-zinc-300 leading-relaxed animate-in fade-in duration-150">
          <p>
            Honk AI is an AI assistant created by Zyron. It does not invent facts, court judgments, or legal authority. For time-sensitive government rules, tax slabs, or APMC mandi rates, always check the designated official department services:
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
            <span className="rounded-lg bg-zinc-800 px-2 py-0.5 text-amber-300 border border-zinc-700/60">
              National Portal of India
            </span>
            <span className="rounded-lg bg-zinc-800 px-2 py-0.5 text-amber-300 border border-zinc-700/60">
              UIDAI Aadhaar Services
            </span>
            <span className="rounded-lg bg-zinc-800 px-2 py-0.5 text-amber-300 border border-zinc-700/60">
              Income Tax e-Filing Portal
            </span>
            <span className="rounded-lg bg-zinc-800 px-2 py-0.5 text-amber-300 border border-zinc-700/60">
              GST Official Network
            </span>
            <span className="rounded-lg bg-zinc-800 px-2 py-0.5 text-amber-300 border border-zinc-700/60">
              AGMARKNET & e-NAM Agri Portals
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

