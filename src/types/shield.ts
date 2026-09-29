/**
 * HONK SHIELD — Device Security & Intrusion Protection Protocol Types
 */

export type ShieldStatus =
  | 'PROTECTED'
  | 'ARMED'
  | 'WARNING'
  | 'BREACH_DETECTED'
  | 'DISABLED';

export type ContactRelationship =
  | 'parent'
  | 'family'
  | 'spouse'
  | 'emergency'
  | 'colleague'
  | 'friend';

export type NotificationChannel = 'email' | 'sms' | 'push' | 'webhook';

export interface TrustedContact {
  id: string;
  name: string;
  relationship: ContactRelationship;
  email?: string;
  phone?: string;
  channel: NotificationChannel;
  alertsEnabled: boolean;
  isVerified: boolean;
  lastAlertSent?: number;
}

export type EvidenceStatus =
  | 'CAPTURED'
  | 'PERMISSION_DENIED'
  | 'UNAVAILABLE'
  | 'DISABLED';

export interface SecurityLocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  timestamp: number;
}

export interface SecurityAlertDispatch {
  contactId: string;
  contactName: string;
  channel: NotificationChannel;
  status: 'DELIVERED' | 'SENT' | 'FAILED';
  timestamp: number;
  details?: string;
}

export interface HonkSecurityEvent {
  id: string;
  timestamp: number;
  deviceName: string;
  platform: string;
  failedAttempts: number;
  threshold: number;
  status: 'UNRESOLVED' | 'RESOLVED' | 'DISMISSED';
  photoEvidence?: string; // base64 image
  photoStatus: EvidenceStatus;
  location?: SecurityLocationData;
  locationStatus: EvidenceStatus;
  alertsSent: SecurityAlertDispatch[];
  notes?: string;
}

export interface HonkShieldSettings {
  isArmed: boolean;
  failedAttemptThreshold: number; // default 7
  capturePhotoEnabled: boolean;
  captureLocationEnabled: boolean;
  notifyTrustedContacts: boolean;
  autoLockSession: boolean;
  sirenAlarmEnabled: boolean;
  emergencyCustomMessage?: string;
  ownerPinHash?: string;
  hasOwnerPin?: boolean;
  webAuthnEnabled?: boolean;
  retentionDays: number;
}

export interface EmergencyActionRecord {
  id: string;
  action: 'ALERT_DISPATCH' | 'SESSION_LOCK' | 'SIREN' | 'EMERGENCY_CALL';
  state: 'REQUESTED' | 'COMPLETED' | 'FAILED';
  details: string;
  timestamp: number;
}
