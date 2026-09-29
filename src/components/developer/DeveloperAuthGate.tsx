import React, { useState } from 'react';
import { Shield, Key, Lock, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { loginDeveloper } from '../../services/developerService';
import { UserProfile } from '../../types';

interface DeveloperAuthGateProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onDeveloperAuthenticated: (updatedUser: UserProfile) => void;
}

export const DeveloperAuthGate: React.FC<DeveloperAuthGateProps> = ({
  isOpen,
  onClose,
  currentUser,
  onDeveloperAuthenticated,
}) => {
  const [email, setEmail] = useState(currentUser.email || '7.zyron@gmail.com');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await loginDeveloper(email, secretKey);
      if (res.success && res.session) {
        setSuccess(true);
        const updated: UserProfile = {
          ...currentUser,
          role: 'DEVELOPER',
          email: res.session.email,
          name: res.session.name,
          developerToken: res.session.token,
          isAuthenticated: true,
        };
        setTimeout(() => {
          onDeveloperAuthenticated(updated);
          onClose();
        }, 600);
      } else {
        setError(res.error || 'Access Denied: Only verified developer Zyron is authorized.');
      }
    } catch (err: any) {
      setError(err.message || 'Developer verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl border border-red-500/30 bg-zinc-950 p-6 shadow-2xl text-zinc-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              Developer Authorization
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                Restricted
              </span>
            </h3>
            <p className="text-xs text-zinc-400">Zyron Developer Clearance & RBAC Gate</p>
          </div>
        </div>

        <div className="p-3.5 mb-5 rounded-xl bg-red-950/20 border border-red-900/40 text-xs text-zinc-300 leading-relaxed">
          <div className="flex items-start gap-2">
            <Lock className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-red-300">Strict Server-Side Isolation:</span> Self-improvement,
              experiments, telemetry, and deployment pipelines belong exclusively to the authenticated developer account.
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Developer Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="7.zyron@gmail.com"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/60 text-sm text-zinc-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
              <span>Developer Master Secret</span>
              <span className="text-[10px] text-zinc-500 font-normal">Optional if email matches</span>
            </label>
            <div className="relative">
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Enter developer master key..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/60 text-sm text-zinc-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 pr-10"
              />
              <Key className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Clearance granted. Unlocking Developer Improvement Center...</span>
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-lg shadow-red-900/30 transition disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Authenticate Developer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
