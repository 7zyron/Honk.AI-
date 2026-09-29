import React, { useState } from 'react';
import {
  ShieldAlert,
  Camera,
  MapPin,
  Clock,
  Smartphone,
  AlertTriangle,
  X,
  CheckCircle2,
  Send,
  Lock,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { HonkSecurityEvent } from '../../types/shield';
import { OwnerVerificationModal } from './OwnerVerificationModal';
import { ShieldService } from '../../services/shieldService';

export interface SecurityAlertModalProps {
  isOpen: boolean;
  event: HonkSecurityEvent | null;
  onClose: () => void;
  onResolved?: () => void;
}

export const SecurityAlertModal: React.FC<SecurityAlertModalProps> = ({
  isOpen,
  event,
  onClose,
  onResolved,
}) => {
  const [isVerifyingOwner, setIsVerifyingOwner] = useState(false);
  const [actionType, setActionType] = useState<'resolve' | 'dismiss' | 'delete' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !event) return null;

  const handleResolveClick = (type: 'resolve' | 'dismiss' | 'delete') => {
    setActionType(type);
    setIsVerifyingOwner(true);
  };

  const handleOwnerVerified = async (pin: string) => {
    setIsProcessing(true);
    const shield = ShieldService.getInstance();

    try {
      if (actionType === 'resolve') {
        await shield.resolveEvent(event.id, 'RESOLVED');
      } else if (actionType === 'dismiss') {
        await shield.resolveEvent(event.id, 'DISMISSED');
      } else if (actionType === 'delete') {
        await shield.deleteEvent(event.id, pin);
      }
      if (onResolved) onResolved();
      onClose();
    } catch (err) {
      console.error('Error resolving security event:', err);
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  const dateFormatted = new Date(event.timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200 font-sans">
        <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border-2 border-red-500/60 bg-zinc-950 p-6 text-zinc-100 shadow-2xl shadow-red-950/60">
          {/* Header Banner */}
          <div className="flex items-start justify-between border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/20 border border-red-500/50 text-red-400 animate-pulse">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-red-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-red-400 border border-red-500/40">
                    SECURITY ALERT
                  </span>
                  <span className="text-xs font-mono text-zinc-500">ID: {event.id}</span>
                </div>
                <h2 className="text-lg font-black text-zinc-100 tracking-tight mt-0.5">
                  Multiple Failed Access Attempts Detected
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Metrics HUD */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                <span>Failed Attempts</span>
              </div>
              <div className="text-xl font-black text-red-400 mt-1 font-mono">
                {event.failedAttempts} <span className="text-xs font-normal text-zinc-500">/ threshold {event.threshold}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-amber-400" />
                <span>Protected Device</span>
              </div>
              <div className="text-sm font-bold text-zinc-200 mt-1 truncate">
                {event.deviceName}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 col-span-2 sm:col-span-1">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-sky-400" />
                <span>Timestamp</span>
              </div>
              <div className="text-xs font-mono text-zinc-300 mt-1">
                {dateFormatted}
              </div>
            </div>
          </div>

          {/* Evidence Showcase: Photo & Location */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Photo Evidence */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-red-400" /> Camera Snapshot
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  event.photoStatus === 'CAPTURED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {event.photoStatus}
                </span>
              </div>

              {event.photoEvidence ? (
                <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-zinc-700 bg-black">
                  <img
                    src={event.photoEvidence}
                    alt="Security Intrusion Snapshot"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-[9px] font-mono text-zinc-300">
                    Security Snapshot
                  </div>
                </div>
              ) : (
                <div className="aspect-video w-full rounded-lg border border-dashed border-zinc-800 bg-zinc-950/70 flex flex-col items-center justify-center p-4 text-center">
                  <Camera className="h-6 w-6 text-zinc-600 mb-1" />
                  <p className="text-xs text-zinc-500">
                    {event.photoStatus === 'PERMISSION_DENIED'
                      ? 'Camera permission denied by user'
                      : event.photoStatus === 'DISABLED'
                      ? 'Camera capture disabled in settings'
                      : 'Camera evidence unavailable on this device'}
                  </p>
                </div>
              )}
            </div>

            {/* Location Evidence */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-red-400" /> Device Geolocation
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  event.locationStatus === 'CAPTURED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {event.locationStatus}
                </span>
              </div>

              {event.location ? (
                <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-3 space-y-2">
                  <div className="text-xs font-mono text-zinc-200">
                    Coordinates: {event.location.latitude.toFixed(4)}, {event.location.longitude.toFixed(4)}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Accuracy: ±{event.location.accuracy || 10} meters
                  </div>
                  {event.location.address && (
                    <div className="text-xs text-amber-300/90 font-mono">
                      {event.location.address}
                    </div>
                  )}
                  <a
                    href={`https://www.google.com/maps?q=${event.location.latitude},${event.location.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-semibold pt-1"
                  >
                    <span>View on Maps</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <div className="aspect-video w-full rounded-lg border border-dashed border-zinc-800 bg-zinc-950/70 flex flex-col items-center justify-center p-4 text-center">
                  <MapPin className="h-6 w-6 text-zinc-600 mb-1" />
                  <p className="text-xs text-zinc-500">
                    {event.locationStatus === 'PERMISSION_DENIED'
                      ? 'Location permission denied by user'
                      : event.locationStatus === 'DISABLED'
                      ? 'Location sharing disabled in settings'
                      : 'Location unavailable'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Trusted Contacts Alert Delivery Record */}
          <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
            <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-2">
              <Send className="h-3.5 w-3.5 text-red-400" />
              <span>Trusted Contacts Notification Status</span>
            </h4>

            {event.alertsSent && event.alertsSent.length > 0 ? (
              <div className="space-y-2">
                {event.alertsSent.map((dispatch, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-850 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-200">{dispatch.contactName}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 uppercase">
                        {dispatch.channel}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{dispatch.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">No contacts configured or notification disabled.</p>
            )}
          </div>

          {/* Action Footer (Owner authenticated) */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">
            <button
              type="button"
              onClick={() => handleResolveClick('delete')}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-red-400 text-xs font-semibold border border-red-950 transition cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Event</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleResolveClick('dismiss')}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-700 transition cursor-pointer disabled:opacity-50"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => handleResolveClick('resolve')}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Mark Resolved (I am Safe)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Owner PIN Verification Modal */}
      <OwnerVerificationModal
        isOpen={isVerifyingOwner}
        onClose={() => {
          setIsVerifyingOwner(false);
          setActionType(null);
        }}
        onVerified={handleOwnerVerified}
        title="Owner Security Clearance"
        description="Verify your Honk Shield Master PIN to update this security incident."
      />
    </>
  );
};
