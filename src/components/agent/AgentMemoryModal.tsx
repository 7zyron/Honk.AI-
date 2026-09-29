import React, { useState, useEffect } from 'react';
import {
  X,
  Brain,
  Shield,
  Trash2,
  Plus,
  Search,
  Lock,
  Check,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
} from 'lucide-react';
import { MemoryEntry, MemoryPreferences } from '../../types/agent';
import {
  fetchAgentMemories,
  saveAgentMemory,
  updateAgentMemoryPreferences,
  deleteAgentMemory,
  clearAllAgentMemories,
} from '../../services/agentService';

interface AgentMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export const AgentMemoryModal: React.FC<AgentMemoryModalProps> = ({
  isOpen,
  onClose,
  userId = 'guest_user',
}) => {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [preferences, setPreferences] = useState<MemoryPreferences>({
    enabled: true,
    allowPersonalization: true,
    allowFactExtraction: true,
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'preference' | 'fact' | 'instruction' | 'project'>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // New Memory Form State
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newType, setNewType] = useState<'preference' | 'fact' | 'instruction' | 'project'>('preference');
  const [newLayer, setNewLayer] = useState<'long_term' | 'short_term' | 'project'>('long_term');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, userId]);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchAgentMemories(userId);
      setMemories(data.memories || []);
      if (data.preferences) setPreferences(data.preferences);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load memories');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMemory = async () => {
    const nextState = !preferences.enabled;
    try {
      const updated = await updateAgentMemoryPreferences(userId, { enabled: nextState });
      setPreferences(updated);
      setSuccessMsg(nextState ? 'Honk Memory enabled' : 'Honk Memory disabled');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update preferences');
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    setErrorMsg('');
    try {
      const saved = await saveAgentMemory(userId, {
        key: newKey.trim(),
        value: newValue.trim(),
        type: newType,
        layer: newLayer,
      });
      setMemories((prev) => [saved, ...prev.filter((m) => m.id !== saved.id)]);
      setNewKey('');
      setNewValue('');
      setShowAddForm(false);
      setSuccessMsg('Memory saved successfully');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to add memory');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAgentMemory(userId, id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete memory');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all Honk memories for your workspace?')) return;
    try {
      await clearAllAgentMemories(userId);
      setMemories([]);
      setSuccessMsg('All memories cleared');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to clear memories');
    }
  };

  if (!isOpen) return null;

  const filteredMemories = memories.filter((m) => {
    if (activeTab !== 'all' && m.type !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return m.key.toLowerCase().includes(q) || m.value.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                Honk Memory
                <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/30">
                  Private & Isolated
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Internet That Remembers YOU — Transparent, editable personal knowledge layer.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Global Privacy Controls */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/50 px-6 py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-zinc-300">
              Memory Status: <strong className={preferences.enabled ? 'text-emerald-400' : 'text-zinc-500'}>{preferences.enabled ? 'Active' : 'Disabled'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleToggleMemory}
              className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white cursor-pointer"
            >
              {preferences.enabled ? (
                <ToggleRight className="h-6 w-6 text-emerald-400" />
              ) : (
                <ToggleLeft className="h-6 w-6 text-zinc-600" />
              )}
              <span>{preferences.enabled ? 'Enabled' : 'Turn On'}</span>
            </button>
            {memories.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Feedback banners */}
        {errorMsg && (
          <div className="flex items-center gap-2 bg-rose-500/10 px-6 py-2 text-xs text-rose-400 border-b border-rose-500/20">
            <AlertCircle className="h-4 w-4" />
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 bg-emerald-500/10 px-6 py-2 text-xs text-emerald-400 border-b border-emerald-500/20">
            <Check className="h-4 w-4" />
            {successMsg}
          </div>
        )}

        {/* Search & Actions Bar */}
        <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search your memories, preferences, and facts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 py-1.5 pl-9 pr-3 text-xs text-zinc-200 placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Memory
          </button>
        </div>

        {/* Add Memory Form */}
        {showAddForm && (
          <form onSubmit={handleAddMemory} className="border-b border-zinc-800 bg-zinc-900/80 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-zinc-400">Memory Key / Title</label>
                <input
                  type="text"
                  placeholder="e.g. coding_preference"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  required
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-zinc-400">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="preference">Preference</option>
                    <option value="fact">Fact</option>
                    <option value="instruction">Instruction</option>
                    <option value="project">Project Note</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400">Layer</label>
                  <select
                    value={newLayer}
                    onChange={(e) => setNewLayer(e.target.value as any)}
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="long_term">Long-Term</option>
                    <option value="short_term">Short-Term</option>
                    <option value="project">Project</option>
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="text-[11px] text-zinc-400">Value / Information</label>
              <textarea
                placeholder="What should Honk remember? e.g. Always write full TypeScript types and provide unit tests."
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                required
                rows={2}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded px-3 py-1 text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-500"
              >
                Save
              </button>
            </div>
          </form>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-zinc-800/80 px-6 pt-2">
          {(['all', 'preference', 'fact', 'instruction', 'project'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-3 py-2 text-xs font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'border-purple-500 text-purple-300'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Memory List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
          {loading ? (
            <div className="flex h-32 items-center justify-center text-xs text-zinc-500">
              Loading memories...
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Brain className="h-8 w-8 text-zinc-600 mb-2" />
              <p className="text-xs font-semibold text-zinc-300">No memories stored in this category</p>
              <p className="text-[11px] text-zinc-500 max-w-sm mt-1">
                Honk learns your preferences naturally as you converse, or you can add specific facts directly above.
              </p>
            </div>
          ) : (
            filteredMemories.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between rounded-xl border border-zinc-800/90 bg-zinc-900/60 p-3.5 hover:border-zinc-700 transition-all"
              >
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-zinc-100">{entry.key}</span>
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-purple-300 border border-zinc-700">
                      {entry.type}
                    </span>
                    <span className="rounded bg-zinc-800/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-400">
                      {entry.layer}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{entry.value}</p>
                  <span className="text-[10px] text-zinc-500">
                    Updated {new Date(entry.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(entry.id)}
                  className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-rose-400 transition-colors"
                  title="Delete memory"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Privacy Guarantee */}
        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 px-6 py-3 text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-zinc-400" />
            <span>Strict Client-Controlled Storage. Zero Cross-User Leakage.</span>
          </div>
          <span>Honk Memory v2.0</span>
        </div>
      </div>
    </div>
  );
};
