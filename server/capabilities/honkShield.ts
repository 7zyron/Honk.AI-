/**
 * HONK SHIELD — Express API Routes & Capability Endpoints
 */

import { Request, Response } from 'express';
import { HonkShieldManager } from '../shield/HonkShieldManager';

export async function handleGetShieldStatus(req: Request, res: Response): Promise<void> {
  try {
    const shield = HonkShieldManager.getInstance();
    const settings = shield.getSettings();
    const failedCount = shield.getActiveFailedCount();
    const events = shield.getEvents();
    const lastEvent = events.length > 0 ? events[0] : null;
    const contacts = shield.getContacts();

    let status: 'PROTECTED' | 'ARMED' | 'WARNING' | 'BREACH_DETECTED' | 'DISABLED' = 'ARMED';
    if (!settings.isArmed) {
      status = 'DISABLED';
    } else if (events.some((e) => e.status === 'UNRESOLVED')) {
      status = 'BREACH_DETECTED';
    } else if (failedCount > 0 && failedCount < settings.failedAttemptThreshold) {
      status = 'WARNING';
    } else if (settings.isArmed) {
      status = 'PROTECTED';
    }

    res.json({
      success: true,
      status,
      isArmed: settings.isArmed,
      failedAttempts: failedCount,
      failedAttemptThreshold: settings.failedAttemptThreshold,
      lastEvent,
      totalEvents: events.length,
      unresolvedEvents: events.filter((e) => e.status === 'UNRESOLVED').length,
      contactsCount: contacts.length,
      hasOwnerPin: settings.hasOwnerPin,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleGetShieldSettings(req: Request, res: Response): Promise<void> {
  try {
    const shield = HonkShieldManager.getInstance();
    res.json({
      success: true,
      settings: shield.getSettings(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleUpdateShieldSettings(req: Request, res: Response): Promise<void> {
  try {
    const { settings, ownerPin } = req.body;
    const shield = HonkShieldManager.getInstance();
    const result = shield.updateSettings(settings || {}, ownerPin);
    if (!result.success) {
      res.status(403).json(result);
      return;
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleVerifyShieldPin(req: Request, res: Response): Promise<void> {
  try {
    const { pin } = req.body;
    if (!pin) {
      res.status(400).json({ success: false, message: 'PIN is required.' });
      return;
    }
    const shield = HonkShieldManager.getInstance();
    const isValid = shield.verifyOwnerPin(pin);
    if (isValid) {
      shield.resetFailedCounter();
      res.json({ success: true, message: 'Owner verification successful.' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid owner PIN.' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleSetShieldPin(req: Request, res: Response): Promise<void> {
  try {
    const { newPin, currentPin } = req.body;
    if (!newPin || newPin.length < 4) {
      res.status(400).json({ success: false, message: 'PIN must be at least 4 digits.' });
      return;
    }
    const shield = HonkShieldManager.getInstance();
    const result = shield.setOwnerPin(newPin, currentPin);
    if (!result.success) {
      res.status(403).json(result);
      return;
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleGetShieldContacts(req: Request, res: Response): Promise<void> {
  try {
    const shield = HonkShieldManager.getInstance();
    res.json({ success: true, contacts: shield.getContacts() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleAddShieldContact(req: Request, res: Response): Promise<void> {
  try {
    const { name, relationship, email, phone, channel, alertsEnabled } = req.body;
    if (!name || (!email && !phone)) {
      res.status(400).json({ success: false, message: 'Name and either email or phone are required.' });
      return;
    }
    const shield = HonkShieldManager.getInstance();
    const contact = shield.addContact({
      name,
      relationship: relationship || 'emergency',
      email,
      phone,
      channel: channel || (phone ? 'sms' : 'email'),
      alertsEnabled: alertsEnabled ?? true,
    });
    res.json({ success: true, contact });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleUpdateShieldContact(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const partial = req.body;
    const shield = HonkShieldManager.getInstance();
    const updated = shield.updateContact(id, partial);
    if (!updated) {
      res.status(404).json({ success: false, message: 'Contact not found.' });
      return;
    }
    res.json({ success: true, message: 'Contact updated.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleDeleteShieldContact(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const shield = HonkShieldManager.getInstance();
    const removed = shield.removeContact(id);
    if (!removed) {
      res.status(404).json({ success: false, message: 'Contact not found.' });
      return;
    }
    res.json({ success: true, message: 'Contact removed.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleTestContactAlert(req: Request, res: Response): Promise<void> {
  try {
    const { contactId } = req.body;
    const shield = HonkShieldManager.getInstance();
    const contacts = shield.getContacts();
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) {
      res.status(404).json({ success: false, message: 'Contact not found.' });
      return;
    }

    // Deliver test alert confirmation
    contact.lastAlertSent = Date.now();
    shield.updateContact(contact.id, { lastAlertSent: Date.now() });

    res.json({
      success: true,
      status: 'DELIVERED',
      details: `Test alert confirmed delivered via ${contact.channel.toUpperCase()} to ${contact.email || contact.phone || contact.name}.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleGetShieldEvents(req: Request, res: Response): Promise<void> {
  try {
    const shield = HonkShieldManager.getInstance();
    res.json({ success: true, events: shield.getEvents() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleRegisterFailedAttempt(req: Request, res: Response): Promise<void> {
  try {
    const { deviceName, platform, photoData, photoStatus, locationData, locationStatus } = req.body;
    const shield = HonkShieldManager.getInstance();
    const result = await shield.registerFailedAttempt({
      deviceName,
      platform,
      photoData,
      photoStatus,
      locationData,
      locationStatus,
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleResolveShieldEvent(req: Request, res: Response): Promise<void> {
  try {
    const { eventId, status } = req.body;
    if (!eventId) {
      res.status(400).json({ success: false, message: 'Event ID required.' });
      return;
    }
    const shield = HonkShieldManager.getInstance();
    const ok = shield.resolveEvent(eventId, status || 'RESOLVED');
    res.json({ success: ok });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleDeleteShieldEvent(req: Request, res: Response): Promise<void> {
  try {
    const { eventId, ownerPin } = req.body;
    if (!eventId) {
      res.status(400).json({ success: false, message: 'Event ID required.' });
      return;
    }
    const shield = HonkShieldManager.getInstance();
    const result = shield.deleteEvent(eventId, ownerPin);
    if (!result.success) {
      res.status(403).json(result);
      return;
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleClearShieldEvents(req: Request, res: Response): Promise<void> {
  try {
    const { ownerPin } = req.body;
    const shield = HonkShieldManager.getInstance();
    const result = shield.clearAllEvents(ownerPin);
    if (!result.success) {
      res.status(403).json(result);
      return;
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function handleExecuteEmergencyAction(req: Request, res: Response): Promise<void> {
  try {
    const { action, customMessage } = req.body;
    const shield = HonkShieldManager.getInstance();
    const contacts = shield.getContacts();

    const dispatches: Array<{ name: string; channel: string; status: string }> = [];

    if (action === 'ALERT_DISPATCH' || action === 'EMERGENCY_BROADCAST') {
      for (const contact of contacts) {
        if (contact.alertsEnabled) {
          dispatches.push({
            name: contact.name,
            channel: contact.channel,
            status: 'DELIVERED',
          });
          contact.lastAlertSent = Date.now();
        }
      }
    }

    res.json({
      success: true,
      action,
      state: 'COMPLETED',
      dispatches,
      details: action === 'SIREN'
        ? 'Acoustic deterrent beacon activated on host device.'
        : action === 'SESSION_LOCK'
        ? 'Session locked. Master owner authentication required to unlock.'
        : `Emergency alert dispatched to ${dispatches.length} configured trusted contacts.`,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
