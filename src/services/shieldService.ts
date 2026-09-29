/**
 * HONK SHIELD — Client-side Security Service
 * Integrates real camera capture, geolocation, sound synthesis, and backend security API.
 */

import {
  HonkSecurityEvent,
  HonkShieldSettings,
  TrustedContact,
  ShieldStatus,
  SecurityLocationData,
  EvidenceStatus,
} from '../types/shield';

let activeSirenOscillator: { ctx: AudioContext; stop: () => void } | null = null;

export class ShieldService {
  private static instance: ShieldService;

  private constructor() {}

  public static getInstance(): ShieldService {
    if (!ShieldService.instance) {
      ShieldService.instance = new ShieldService();
    }
    return ShieldService.instance;
  }

  public async getStatus(): Promise<{
    status: ShieldStatus;
    isArmed: boolean;
    failedAttempts: number;
    failedAttemptThreshold: number;
    lastEvent: HonkSecurityEvent | null;
    totalEvents: number;
    unresolvedEvents: number;
    contactsCount: number;
    hasOwnerPin: boolean;
  }> {
    const res = await fetch('/api/shield/status');
    if (!res.ok) throw new Error('Failed to load Shield status');
    return res.json();
  }

  public async getSettings(): Promise<HonkShieldSettings> {
    const res = await fetch('/api/shield/settings');
    if (!res.ok) throw new Error('Failed to load Shield settings');
    const data = await res.json();
    return data.settings;
  }

  public async updateSettings(
    settings: Partial<HonkShieldSettings>,
    ownerPin?: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/shield/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings, ownerPin }),
    });
    return res.json();
  }

  public async verifyPin(pin: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/shield/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    return res.json();
  }

  public async setPin(newPin: string, currentPin?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/shield/set-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPin, currentPin }),
    });
    return res.json();
  }

  public async getContacts(): Promise<TrustedContact[]> {
    const res = await fetch('/api/shield/contacts');
    if (!res.ok) throw new Error('Failed to load contacts');
    const data = await res.json();
    return data.contacts || [];
  }

  public async addContact(contact: Omit<TrustedContact, 'id' | 'isVerified'>): Promise<TrustedContact> {
    const res = await fetch('/api/shield/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Failed to add contact');
    return data.contact;
  }

  public async updateContact(id: string, partial: Partial<TrustedContact>): Promise<boolean> {
    const res = await fetch(`/api/shield/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    const data = await res.json();
    return Boolean(data.success);
  }

  public async deleteContact(id: string): Promise<boolean> {
    const res = await fetch(`/api/shield/contacts/${id}`, { method: 'DELETE' });
    const data = await res.json();
    return Boolean(data.success);
  }

  public async testContactAlert(contactId: string): Promise<{ success: boolean; details: string }> {
    const res = await fetch('/api/shield/contacts/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId }),
    });
    return res.json();
  }

  public async getEvents(): Promise<HonkSecurityEvent[]> {
    const res = await fetch('/api/shield/events');
    if (!res.ok) throw new Error('Failed to load security events');
    const data = await res.json();
    return data.events || [];
  }

  public async resolveEvent(eventId: string, status: 'RESOLVED' | 'DISMISSED'): Promise<boolean> {
    const res = await fetch('/api/shield/events/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, status }),
    });
    const data = await res.json();
    return Boolean(data.success);
  }

  public async deleteEvent(eventId: string, ownerPin?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/shield/events/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, ownerPin }),
    });
    return res.json();
  }

  public async clearAllEvents(ownerPin: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/shield/events/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPin }),
    });
    return res.json();
  }

  /**
   * Real camera evidence capture using device's user media (if permitted)
   */
  public async captureSecuritySnapshot(): Promise<{
    photoData?: string;
    photoStatus: EvidenceStatus;
  }> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { photoStatus: 'UNAVAILABLE' };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;
      await video.play();

      // Wait a moment for camera auto-exposure
      await new Promise((r) => setTimeout(r, 300));

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        stream.getTracks().forEach((t) => t.stop());
        return { photoStatus: 'UNAVAILABLE' };
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photoData = canvas.toDataURL('image/jpeg', 0.85);

      // Stop camera tracks immediately
      stream.getTracks().forEach((t) => t.stop());

      return {
        photoData,
        photoStatus: 'CAPTURED',
      };
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        return { photoStatus: 'PERMISSION_DENIED' };
      }
      return { photoStatus: 'UNAVAILABLE' };
    }
  }

  /**
   * Real geolocation capture using device location API (if permitted)
   */
  public async captureSecurityLocation(): Promise<{
    location?: SecurityLocationData;
    locationStatus: EvidenceStatus;
  }> {
    if (!navigator.geolocation) {
      return { locationStatus: 'UNAVAILABLE' };
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const location: SecurityLocationData = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            address: `Lat ${pos.coords.latitude.toFixed(4)}, Lon ${pos.coords.longitude.toFixed(4)} (±${Math.round(pos.coords.accuracy)}m)`,
            timestamp: pos.timestamp || Date.now(),
          };
          resolve({ location, locationStatus: 'CAPTURED' });
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            resolve({ locationStatus: 'PERMISSION_DENIED' });
          } else {
            resolve({ locationStatus: 'UNAVAILABLE' });
          }
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    });
  }

  /**
   * Register failed attempt, gathering real camera and location evidence if enabled
   */
  public async logFailedAttempt(options?: {
    captureEvidence?: boolean;
  }): Promise<{
    currentFailedCount: number;
    threshold: number;
    thresholdReached: boolean;
    event?: HonkSecurityEvent;
  }> {
    const settings = await this.getSettings().catch(() => null);

    let photoData: string | undefined;
    let photoStatus: EvidenceStatus = 'DISABLED';
    let locationData: SecurityLocationData | undefined;
    let locationStatus: EvidenceStatus = 'DISABLED';

    if (settings?.capturePhotoEnabled && options?.captureEvidence !== false) {
      const snap = await this.captureSecuritySnapshot();
      photoData = snap.photoData;
      photoStatus = snap.photoStatus;
    }

    if (settings?.captureLocationEnabled && options?.captureEvidence !== false) {
      const loc = await this.captureSecurityLocation();
      locationData = loc.location;
      locationStatus = loc.locationStatus;
    }

    const res = await fetch('/api/shield/failed-attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceName: `${navigator.platform || 'Client'} (${navigator.userAgent.includes('Windows') ? 'Windows PC' : navigator.userAgent.includes('Android') ? 'Android' : navigator.userAgent.includes('Mac') ? 'Mac' : 'Honk Device'})`,
        platform: navigator.userAgent.includes('Windows') ? 'windows' : navigator.userAgent.includes('Android') ? 'android' : navigator.userAgent.includes('Mac') ? 'macos' : 'web',
        photoData,
        photoStatus,
        locationData,
        locationStatus,
      }),
    });

    const data = await res.json();
    return data;
  }

  /**
   * Execute real emergency action (siren, emergency broadcast, session lock)
   */
  public async triggerEmergencyAction(
    action: 'ALERT_DISPATCH' | 'SESSION_LOCK' | 'SIREN' | 'EMERGENCY_CALL',
    customMessage?: string
  ): Promise<{ success: boolean; state: string; details: string }> {
    if (action === 'SIREN') {
      this.playAcousticSiren();
    }

    const res = await fetch('/api/shield/emergency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, customMessage }),
    });

    return res.json();
  }

  /**
   * Acoustic Siren generator using Web Audio API
   */
  public playAcousticSiren(): void {
    try {
      if (activeSirenOscillator) {
        activeSirenOscillator.stop();
        activeSirenOscillator = null;
        return;
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);

      // Modulate pitch between 600Hz and 1400Hz
      let freq = 600;
      let dir = 1;
      const interval = setInterval(() => {
        freq += dir * 80;
        if (freq >= 1400) dir = -1;
        if (freq <= 600) dir = 1;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
      }, 50);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      activeSirenOscillator = {
        ctx,
        stop: () => {
          clearInterval(interval);
          try {
            osc.stop();
            ctx.close();
          } catch {}
          activeSirenOscillator = null;
        },
      };

      // Auto-stop after 15 seconds
      setTimeout(() => {
        if (activeSirenOscillator) activeSirenOscillator.stop();
      }, 15000);
    } catch {}
  }

  public stopAcousticSiren(): void {
    if (activeSirenOscillator) {
      activeSirenOscillator.stop();
      activeSirenOscillator = null;
    }
  }

  public isSirenActive(): boolean {
    return activeSirenOscillator !== null;
  }
}
