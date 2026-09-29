import React, { useState } from 'react';
import { Shield, Lock, KeyRound, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ShieldService } from '../../services/shieldService';

export interface OwnerVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (pin: string) => void;
  title?: string;
  description?: string;
}

export const OwnerVerificationModal: React.FC<OwnerVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerified,
  title = 'Owner Verification Required',
  description = 'Enter your Honk Shield Master PIN to authorize this security action.',
}) => {
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin || pin.length < 4) {
      setError('Please enter your 4-digit Master PIN.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const shield = ShieldService.getInstance();
      const res = await shield.verifyPin(pin);
      if (res.success) {
        onVerified(pin);
        setPin('');
        onClose();
      } else {
        setError(res.message || 'Invalid Master PIN.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-red-500/40 bg-zinc-950 p-6 text-zinc-100 shadow-2xl shadow-red-950/40">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 tracking-tight">{title}</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Honk Shield Owner Authentication</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleVerify} className="mt-5 space-y-4">
          <p className="text-xs text-zinc-300 leading-relaxed">{description}</p>

          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">
              Master Security PIN
            </label>
            <div className="relative">
              <input
                type="password"
                maxLength={8}
                autoFocus
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 px-4 py-2.5 text-center text-lg tracking-[0.4em] font-mono text-zinc-100 placeholder-zinc-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition"
              />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">Default test PIN: 1234 (can be changed in settings)</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-2.5 text-xs text-red-300 font-mono">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying || pin.length < 4}
              className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-red-600/30 transition cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>{isVerifying ? 'Authenticating...' : 'Authorize Action'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
