import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Lock,
  Unlock,
  AlertTriangle,
  Camera,
  MapPin,
  Users,
  Bell,
  Settings,
  Flame,
  Volume2,
  VolumeX,
  RefreshCw,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  KeyRound,
  ExternalLink,
  Phone,
  Mail,
  Zap,
  Radio,
  FileText,
  Smartphone,
  Eye,
} from 'lucide-react';
import {
  HonkSecurityEvent,
  HonkShieldSettings,
  TrustedContact,
  ShieldStatus,
  NotificationChannel,
  ContactRelationship,
} from '../../types/shield';
import { ShieldService } from '../../services/shieldService';
import { SecurityAlertModal } from './SecurityAlertModal';
import { OwnerVerificationModal } from './OwnerVerificationModal';

export interface HonkShieldDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDeviceCenter?: () => void;
}

export const HonkShieldDashboard: React.FC<HonkShieldDashboardProps> = ({
  isOpen,
  onClose,
  onOpenDeviceCenter,
}) => {
  const [status, setStatus] = useState<ShieldStatus>('ARMED');
  const [isArmed, setIsArmed] = useState(true);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [threshold, setThreshold] = useState(7);
  const [events, setEvents] = useState<HonkSecurityEvent[]>([]);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [settings, setSettings] = useState<HonkShieldSettings | null>(null);

  const [activeTab, setActiveTab] = useState<
    'hud' | 'events' | 'contacts' | 'settings' | 'emergency' | 'test_trigger'
  >('hud');

  const [isLoading, setIsLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<HonkSecurityEvent | null>(null);

  // Modals state
  const [isVerifyOwnerOpen, setIsVerifyOwnerOpen] = useState(false);
  const [ownerPendingAction, setOwnerPendingAction] = useState<(() => void) | null>(null);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);

  // New Contact Form
  const [newContactName, setNewContactName] = useState('');
  const [newContactRelationship, setNewContactRelationship] = useState<ContactRelationship>('family');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactChannel, setNewContactChannel] = useState<NotificationChannel>('email');

  // New PIN Form
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');

  // Siren State
  const [sirenPlaying, setSirenPlaying] = useState(false);

  const shieldService = ShieldService.getInstance();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statusRes, settingsRes, contactsRes, eventsRes] = await Promise.all([
        shieldService.getStatus(),
        shieldService.getSettings(),
        shieldService.getContacts(),
        shieldService.getEvents(),
      ]);

      setStatus(statusRes.status);
      setIsArmed(statusRes.isArmed);
      setFailedAttempts(statusRes.failedAttempts);
      setThreshold(statusRes.failedAttemptThreshold);
      setSettings(settingsRes);
      setContacts(contactsRes);
      setEvents(eventsRes);
    } catch (err: any) {
      console.error('Failed to load Shield data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      const interval = setInterval(loadData, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleArmed = () => {
    setOwnerPendingAction(() => async () => {
      const targetState = !isArmed;
      const res = await shieldService.updateSettings({ isArmed: targetState });
      if (res.success) {
        setIsArmed(targetState);
        setStatus(targetState ? 'PROTECTED' : 'DISABLED');
        setActionFeedback(`Honk Shield ${targetState ? 'ARMED' : 'DISARMED'}.`);
        setTimeout(() => setActionFeedback(null), 4000);
      }
    });
    setIsVerifyOwnerOpen(true);
  };

  const handleAddContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName || (!newContactEmail && !newContactPhone)) {
      setActionFeedback('Please provide a name and at least an email or phone number.');
      return;
    }

    try {
      await shieldService.addContact({
        name: newContactName,
        relationship: newContactRelationship,
        email: newContactEmail || undefined,
        phone: newContactPhone || undefined,
        channel: newContactChannel,
        alertsEnabled: true,
      });

      setNewContactName('');
      setNewContactEmail('');
      setNewContactPhone('');
      setIsAddContactOpen(false);
      setActionFeedback('Trusted contact registered successfully.');
      loadData();
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionFeedback(err.message || 'Failed to add contact.');
    }
  };

  const handleDeleteContact = (id: string) => {
    setOwnerPendingAction(() => async () => {
      await shieldService.deleteContact(id);
      loadData();
      setActionFeedback('Contact removed.');
      setTimeout(() => setActionFeedback(null), 3000);
    });
    setIsVerifyOwnerOpen(true);
  };

  const handleTestContactAlert = async (id: string) => {
    try {
      const res = await shieldService.testContactAlert(id);
      setActionFeedback(`✅ ${res.details}`);
      setTimeout(() => setActionFeedback(null), 5000);
    } catch (err: any) {
      setActionFeedback(`❌ Alert test failed: ${err.message}`);
    }
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinInput !== confirmPinInput) {
      setActionFeedback('New PIN entries do not match.');
      return;
    }
    if (newPinInput.length < 4) {
      setActionFeedback('PIN must be at least 4 digits.');
      return;
    }

    try {
      const res = await shieldService.setPin(newPinInput, currentPinInput);
      if (res.success) {
        setIsChangePinOpen(false);
        setCurrentPinInput('');
        setNewPinInput('');
        setConfirmPinInput('');
        setActionFeedback('Master Security PIN updated.');
        setTimeout(() => setActionFeedback(null), 4000);
      } else {
        setActionFeedback(res.message);
      }
    } catch (err: any) {
      setActionFeedback(err.message || 'PIN update failed.');
    }
  };

  const handleToggleSiren = () => {
    if (shieldService.isSirenActive()) {
      shieldService.stopAcousticSiren();
      setSirenPlaying(false);
      setActionFeedback('Acoustic siren silenced.');
    } else {
      shieldService.playAcousticSiren();
      setSirenPlaying(true);
      setActionFeedback('🚨 ACOUSTIC DETERRENT SIREN ACTIVATED.');
    }
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleTriggerEmergencyBroadcast = async () => {
    try {
      const res = await shieldService.triggerEmergencyAction('ALERT_DISPATCH');
      setActionFeedback(`🚨 ${res.details}`);
      loadData();
      setTimeout(() => setActionFeedback(null), 6000);
    } catch (err: any) {
      setActionFeedback(`Emergency broadcast failed: ${err.message}`);
    }
  };

  // Real Test Breach Trigger on Device
  const handleSimulateFailedAttempt = async () => {
    setActionFeedback('Processing authentication failure probe with real sensors...');
    try {
      const result = await shieldService.logFailedAttempt({ captureEvidence: true });
      loadData();
      if (result.thresholdReached) {
        setActionFeedback(`🚨 BREACH THRESHOLD REACHED (${result.currentFailedCount}/${result.threshold})! Security countermeasures triggered.`);
        if (result.event) {
          setSelectedEvent(result.event);
        }
      } else {
        setActionFeedback(`⚠️ Failed attempt recorded (${result.currentFailedCount}/${result.threshold}).`);
      }
      setTimeout(() => setActionFeedback(null), 6000);
    } catch (err: any) {
      setActionFeedback(`Failed probe error: ${err.message}`);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'BREACH_DETECTED':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/30 text-red-300 border border-red-500 font-black text-xs animate-pulse">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            <span>BREACH DETECTED</span>
          </span>
        );
      case 'WARNING':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-xs">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span>SUSPICIOUS ACTIVITY</span>
          </span>
        );
      case 'PROTECTED':
      case 'ARMED':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>PROTECTED & ARMED</span>
          </span>
        );
      case 'DISABLED':
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 font-semibold text-xs">
            <ShieldX className="h-4 w-4" />
            <span>DISARMED</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg p-3 sm:p-5 animate-in fade-in duration-200 font-sans">
      <div className="relative w-full max-w-5xl max-h-[94vh] overflow-hidden rounded-3xl border border-red-500/30 bg-zinc-950 text-zinc-100 shadow-2xl shadow-red-950/40 flex flex-col">
        {/* Top High-Tech HUD Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-zinc-800/80 bg-zinc-900/90 p-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 via-red-700 to-zinc-950 border border-red-500/50 text-white shadow-lg shadow-red-600/30">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  HONK <span className="text-red-500">SHIELD</span>
                </h1>
                <span className="rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-mono text-red-400 border border-red-500/30 uppercase tracking-widest">
                  PRO-SECURITY V1
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Unauthorized Intrusion Detection • Real Sensor Evidence • Trusted Alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 mt-2 sm:mt-0">
            {getStatusBadge()}

            <button
              type="button"
              onClick={handleToggleArmed}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                isArmed
                  ? 'bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-lg shadow-red-600/30'
                  : 'bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
              }`}
            >
              {isArmed ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              <span>{isArmed ? 'ARMED' : 'DISARMED'}</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition border border-zinc-800"
              title="Refresh Security Status"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-red-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition border border-zinc-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div className="bg-red-950/80 border-b border-red-500/40 px-6 py-2 text-xs font-mono text-red-200 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-red-400 shrink-0" />
              <span>{actionFeedback}</span>
            </div>
            <button onClick={() => setActionFeedback(null)} className="text-zinc-400 hover:text-zinc-200">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800/80 bg-zinc-900/60 px-4 sm:px-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('hud')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'hud'
                ? 'border-red-500 text-red-400 bg-red-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Shield className="h-4 w-4" />
            DASHBOARD HUD
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('events')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'events'
                ? 'border-red-500 text-red-400 bg-red-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Clock className="h-4 w-4" />
            SECURITY HISTORY ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contacts')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'contacts'
                ? 'border-red-500 text-red-400 bg-red-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="h-4 w-4" />
            TRUSTED CONTACTS ({contacts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('emergency')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'emergency'
                ? 'border-red-500 text-red-400 bg-red-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Flame className="h-4 w-4 text-red-400" />
            EMERGENCY CONTROL
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'settings'
                ? 'border-red-500 text-red-400 bg-red-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Settings className="h-4 w-4" />
            SHIELD SETTINGS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('test_trigger')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'test_trigger'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Radio className="h-4 w-4 text-amber-400" />
            BREACH SIMULATOR
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: HUD / OVERVIEW */}
          {activeTab === 'hud' && (
            <div className="space-y-6">
              {/* Primary Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-red-500/30 relative overflow-hidden shadow-lg">
                  <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                    <span>FAILED ATTEMPTS</span>
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                  </div>
                  <div className="text-3xl font-black text-white mt-2 font-mono flex items-baseline gap-2">
                    <span className={failedAttempts >= threshold ? 'text-red-500 animate-pulse' : 'text-zinc-100'}>
                      {failedAttempts}
                    </span>
                    <span className="text-xs text-zinc-500 font-normal">/ threshold {threshold}</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        failedAttempts >= threshold ? 'bg-red-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, (failedAttempts / threshold) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-lg">
                  <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                    <span>PROTECTION STATUS</span>
                    <Shield className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-bold text-white mt-2">
                    {isArmed ? 'Active Defense' : 'Disarmed'}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    {isArmed ? 'Monitoring unauthorized attempts' : 'Protection currently paused'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-lg">
                  <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                    <span>TRUSTED CONTACTS</span>
                    <Users className="h-4 w-4 text-sky-400" />
                  </div>
                  <div className="text-3xl font-black text-white mt-2 font-mono">
                    {contacts.filter((c) => c.alertsEnabled).length}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Ready for instant emergency alert dispatch
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-lg">
                  <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                    <span>SECURITY EVENTS</span>
                    <Clock className="h-4 w-4 text-purple-400" />
                  </div>
                  <div className="text-3xl font-black text-white mt-2 font-mono">
                    {events.length}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    {events.filter((e) => e.status === 'UNRESOLVED').length} unresolved incidents
                  </div>
                </div>
              </div>

              {/* Sensor & Countermeasures Matrix */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Active Countermeasures Config */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-red-400" />
                    <span>Active Countermeasures</span>
                  </h3>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs">
                      <div className="flex items-center gap-2.5">
                        <Camera className="h-4 w-4 text-red-400" />
                        <div>
                          <div className="font-semibold text-zinc-200">Camera Evidence Capture</div>
                          <div className="text-[11px] text-zinc-400">Captures intruder snapshot upon breach</div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        settings?.capturePhotoEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {settings?.capturePhotoEnabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs">
                      <div className="flex items-center gap-2.5">
                        <MapPin className="h-4 w-4 text-amber-400" />
                        <div>
                          <div className="font-semibold text-zinc-200">Device Geolocation</div>
                          <div className="text-[11px] text-zinc-400">Attaches GPS coordinates to alert</div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        settings?.captureLocationEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {settings?.captureLocationEnabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs">
                      <div className="flex items-center gap-2.5">
                        <Bell className="h-4 w-4 text-sky-400" />
                        <div>
                          <div className="font-semibold text-zinc-200">Trusted Family Alert Dispatch</div>
                          <div className="text-[11px] text-zinc-400">Transmits instant incident report</div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        settings?.notifyTrustedContacts ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {settings?.notifyTrustedContacts ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Emergency Actions Box */}
                <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/30 via-zinc-950 to-zinc-950 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                    <Flame className="h-4 w-4" />
                    <span>Quick Emergency Controls</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleToggleSiren}
                      className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        sirenPlaying
                          ? 'bg-red-600 text-white border-red-400 animate-pulse'
                          : 'bg-zinc-900/80 hover:bg-zinc-850 text-zinc-200 border-zinc-800'
                      }`}
                    >
                      {sirenPlaying ? <VolumeX className="h-5 w-5 mb-2" /> : <Volume2 className="h-5 w-5 text-red-400 mb-2" />}
                      <span className="text-xs font-bold">{sirenPlaying ? 'Stop Siren' : 'Acoustic Siren'}</span>
                      <span className="text-[10px] text-zinc-400">Deterrent alarm</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTriggerEmergencyBroadcast}
                      className="p-3.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 text-left transition cursor-pointer flex flex-col justify-between"
                    >
                      <Bell className="h-5 w-5 text-amber-400 mb-2" />
                      <span className="text-xs font-bold text-zinc-100">Send SOS Alert</span>
                      <span className="text-[10px] text-zinc-400">Notify all contacts</span>
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-850 text-xs text-zinc-400 flex items-center justify-between">
                    <span>Emergency Call:</span>
                    <a
                      href="tel:112"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[11px]"
                    >
                      <Phone className="h-3 w-3" />
                      <span>Call 112 / 911</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Recent Security Incidents */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-zinc-400" />
                    <span>Recent Security Incidents</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('events')}
                    className="text-xs text-red-400 hover:underline font-semibold"
                  >
                    View All ({events.length})
                  </button>
                </div>

                {events.length > 0 ? (
                  <div className="space-y-2.5">
                    {events.slice(0, 3).map((evt) => (
                      <div
                        key={evt.id}
                        onClick={() => setSelectedEvent(evt)}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            evt.status === 'UNRESOLVED'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            <ShieldAlert className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-zinc-200">
                              {evt.failedAttempts} Failed Attempts on {evt.deviceName}
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              {new Date(evt.timestamp).toLocaleString()} • {evt.photoStatus === 'CAPTURED' ? '📸 Photo captured' : 'No photo'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            evt.status === 'UNRESOLVED' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {evt.status}
                          </span>
                          <Eye className="h-4 w-4 text-zinc-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-xl bg-zinc-950/60 border border-dashed border-zinc-800 text-zinc-500 text-xs">
                    No security breach incidents recorded. Your device is secure.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SECURITY EVENTS HISTORY */}
          {activeTab === 'events' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Security Breach History</h3>
                  <p className="text-xs text-zinc-400">Audited intrusion logs with photo and location evidence</p>
                </div>
                {events.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setOwnerPendingAction(() => async () => {
                        await shieldService.clearAllEvents('1234');
                        loadData();
                        setActionFeedback('All security events purged.');
                      });
                      setIsVerifyOwnerOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-red-400 text-xs font-semibold border border-red-950"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear History</span>
                  </button>
                )}
              </div>

              {events.length > 0 ? (
                <div className="space-y-3">
                  {events.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${
                            evt.status === 'UNRESOLVED'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          }`}>
                            <ShieldAlert className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-zinc-100">
                              {evt.failedAttempts} Failed Attempts Recorded
                            </h4>
                            <p className="text-xs text-zinc-400">
                              Device: {evt.deviceName} ({evt.platform}) • {new Date(evt.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            evt.status === 'UNRESOLVED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {evt.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedEvent(evt)}
                            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
                          >
                            Inspect
                          </button>
                        </div>
                      </div>

                      {/* Evidence snapshot summary */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-800/60 text-[11px] font-mono text-zinc-400">
                        <div>
                          📸 Photo: <strong className="text-zinc-300">{evt.photoStatus}</strong>
                        </div>
                        <div>
                          📍 Location: <strong className="text-zinc-300">{evt.locationStatus}</strong>
                        </div>
                        <div>
                          🚨 Alerts: <strong className="text-emerald-400">{evt.alertsSent?.length || 0} Delivered</strong>
                        </div>
                        <div>
                          🆔 ID: <strong className="text-zinc-400">{evt.id.substring(0, 14)}...</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 text-zinc-500 text-xs space-y-2">
                  <ShieldCheck className="h-8 w-8 text-emerald-500/50 mx-auto" />
                  <p className="font-semibold text-zinc-300">Clean Security Slate</p>
                  <p>No unauthorized access attempts or security breaches detected.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TRUSTED CONTACTS */}
          {activeTab === 'contacts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Trusted Emergency Contacts</h3>
                  <p className="text-xs text-zinc-400">Configure family or emergency contacts to receive intrusion alerts</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddContactOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/20"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Contact</span>
                </button>
              </div>

              {/* Add Contact Modal / Section */}
              {isAddContactOpen && (
                <form
                  onSubmit={handleAddContactSubmit}
                  className="p-5 rounded-2xl bg-zinc-900 border border-red-500/40 space-y-4 animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <h4 className="text-xs font-bold text-zinc-200">Register New Trusted Recipient</h4>
                    <button type="button" onClick={() => setIsAddContactOpen(false)} className="text-zinc-400">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 mb-1">Contact Name</label>
                      <input
                        type="text"
                        required
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        placeholder="e.g. Mom, Brother, Home"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 mb-1">Relationship</label>
                      <select
                        value={newContactRelationship}
                        onChange={(e) => setNewContactRelationship(e.target.value as ContactRelationship)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100"
                      >
                        <option value="parent">Parent</option>
                        <option value="family">Family Member</option>
                        <option value="spouse">Spouse / Partner</option>
                        <option value="emergency">Emergency Responder</option>
                        <option value="colleague">Colleague</option>
                        <option value="friend">Friend</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={newContactEmail}
                        onChange={(e) => setNewContactEmail(e.target.value)}
                        placeholder="emergency@family.com"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 mb-1">Phone Number (SMS)</label>
                      <input
                        type="tel"
                        value={newContactPhone}
                        onChange={(e) => setNewContactPhone(e.target.value)}
                        placeholder="+1 (555) 019-2834"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-100"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setIsAddContactOpen(false)}
                      className="px-4 py-1.5 rounded-xl text-xs font-semibold text-zinc-400 hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                    >
                      Save Recipient
                    </button>
                  </div>
                </form>
              )}

              {/* Contacts List */}
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-sm">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-zinc-100">{contact.name}</span>
                          <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[9px] font-mono text-zinc-400 uppercase">
                            {contact.relationship}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400 flex items-center gap-3 mt-0.5">
                          {contact.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-zinc-500" /> {contact.email}
                            </span>
                          )}
                          {contact.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-zinc-500" /> {contact.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTestContactAlert(contact.id)}
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
                        title="Send Test Notification"
                      >
                        Test Alert
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteContact(contact.id)}
                        className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
                        title="Delete Contact"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: EMERGENCY CONTROLS */}
          {activeTab === 'emergency' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                  <Flame className="h-4 w-4" />
                  <span>Emergency Countermeasures & Fast Response</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Direct physical and network emergency controls on this device
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Acoustic Deterrent Siren */}
                <div className="p-5 rounded-2xl bg-zinc-900 border border-red-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-red-400" /> Acoustic Siren Alarm
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      sirenPlaying ? 'bg-red-500 text-white animate-pulse' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {sirenPlaying ? 'ACTIVE' : 'IDLE'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Plays a high-frequency alternating deterrent tone directly through your device speakers to discourage physical tampering.
                  </p>
                  <button
                    type="button"
                    onClick={handleToggleSiren}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
                      sirenPlaying
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                        : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30'
                    }`}
                  >
                    {sirenPlaying ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    <span>{sirenPlaying ? 'Silence Siren Alarm' : 'Sound Deterrent Siren Now'}</span>
                  </button>
                </div>

                {/* Instant SOS Broadcast */}
                <div className="p-5 rounded-2xl bg-zinc-900 border border-red-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                      <Radio className="h-4 w-4 text-red-400" /> SOS Emergency Broadcast
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      {contacts.length} Contacts
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Immediately transmits an urgent emergency SOS broadcast with your latest device coordinates to all configured trusted contacts.
                  </p>
                  <button
                    type="button"
                    onClick={handleTriggerEmergencyBroadcast}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 font-bold text-xs text-white shadow-lg shadow-red-600/30 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Flame className="h-4 w-4" />
                    <span>Broadcast Emergency SOS</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SHIELD SETTINGS */}
          {activeTab === 'settings' && settings && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Honk Shield Protection Settings</h3>
                  <p className="text-xs text-zinc-400">Custom threshold, sensor permissions, and master owner PIN</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChangePinOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
                >
                  <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                  <span>Change Master PIN</span>
                </button>
              </div>

              {/* Change PIN Card Form */}
              {isChangePinOpen && (
                <form
                  onSubmit={handleChangePinSubmit}
                  className="p-5 rounded-2xl bg-zinc-900 border border-amber-500/40 space-y-4 animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <h4 className="text-xs font-bold text-amber-300">Update Master Security PIN</h4>
                    <button type="button" onClick={() => setIsChangePinOpen(false)} className="text-zinc-400">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 mb-1">Current PIN</label>
                      <input
                        type="password"
                        required
                        value={currentPinInput}
                        onChange={(e) => setCurrentPinInput(e.target.value)}
                        placeholder="••••"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 mb-1">New PIN</label>
                      <input
                        type="password"
                        required
                        value={newPinInput}
                        onChange={(e) => setNewPinInput(e.target.value)}
                        placeholder="••••"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 mb-1">Confirm New PIN</label>
                      <input
                        type="password"
                        required
                        value={confirmPinInput}
                        onChange={(e) => setConfirmPinInput(e.target.value)}
                        placeholder="••••"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setIsChangePinOpen(false)}
                      className="px-4 py-1.5 rounded-xl text-xs font-semibold text-zinc-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs"
                    >
                      Update Master PIN
                    </button>
                  </div>
                </form>
              )}

              {/* Threshold & Sensor Toggles */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-200 mb-1">
                    Failed Attempt Threshold:
                  </label>
                  <p className="text-[11px] text-zinc-400 mb-2.5">
                    Trigger intrusion alert after this number of failed password/PIN entries:
                  </p>
                  <div className="flex gap-2">
                    {[3, 5, 7, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          setOwnerPendingAction(() => async () => {
                            await shieldService.updateSettings({ failedAttemptThreshold: num });
                            loadData();
                            setActionFeedback(`Failed attempt threshold set to ${num}.`);
                          });
                          setIsVerifyOwnerOpen(true);
                        }}
                        className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition cursor-pointer border ${
                          threshold === num
                            ? 'bg-red-600 text-white border-red-500'
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {num} Attempts {num === 7 ? '(Default)' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-zinc-200">Capture Camera Snapshot</div>
                      <div className="text-[11px] text-zinc-400">Capture photo when threshold is reached (requires camera permission)</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOwnerPendingAction(() => async () => {
                          await shieldService.updateSettings({ capturePhotoEnabled: !settings.capturePhotoEnabled });
                          loadData();
                        });
                        setIsVerifyOwnerOpen(true);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        settings.capturePhotoEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      {settings.capturePhotoEnabled ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-zinc-200">Attach Device Geolocation</div>
                      <div className="text-[11px] text-zinc-400">Include GPS location in security incident alerts</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOwnerPendingAction(() => async () => {
                          await shieldService.updateSettings({ captureLocationEnabled: !settings.captureLocationEnabled });
                          loadData();
                        });
                        setIsVerifyOwnerOpen(true);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        settings.captureLocationEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      {settings.captureLocationEnabled ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-zinc-200">Notify Trusted Contacts</div>
                      <div className="text-[11px] text-zinc-400">Dispatch alert transmissions to configured family / emergency contacts</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOwnerPendingAction(() => async () => {
                          await shieldService.updateSettings({ notifyTrustedContacts: !settings.notifyTrustedContacts });
                          loadData();
                        });
                        setIsVerifyOwnerOpen(true);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        settings.notifyTrustedContacts
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      {settings.notifyTrustedContacts ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: BREACH SIMULATOR / TEST TRIGGER */}
          {activeTab === 'test_trigger' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-400">
                  <Radio className="h-5 w-5" />
                  <h3 className="text-sm font-bold">Real Breach Verification Probe</h3>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Test your device&apos;s real security defenses: this triggers a real failed authentication probe, checks camera and location permissions, tests threshold counters, and verifies that alert delivery works seamlessly.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSimulateFailedAttempt}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 cursor-pointer flex items-center gap-2"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <span>Trigger Failed Attempt Probe (+1)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      shieldService.verifyPin('1234').then(() => {
                        loadData();
                        setActionFeedback('Counter reset to 0.');
                      });
                    }}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
                  >
                    Reset Counter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Alert Inspector Modal */}
      <SecurityAlertModal
        isOpen={Boolean(selectedEvent)}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onResolved={loadData}
      />

      {/* Owner PIN Verification Modal */}
      <OwnerVerificationModal
        isOpen={isVerifyOwnerOpen}
        onClose={() => {
          setIsVerifyOwnerOpen(false);
          setOwnerPendingAction(null);
        }}
        onVerified={() => {
          if (ownerPendingAction) {
            ownerPendingAction();
            setOwnerPendingAction(null);
          }
          setIsVerifyOwnerOpen(false);
        }}
        title="Owner Security Clearance"
        description="Verify your Honk Shield Master PIN to authorize this change."
      />
    </div>
  );
};
