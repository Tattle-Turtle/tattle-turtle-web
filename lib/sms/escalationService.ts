/**
 * Escalation Service
 * For Tier 3 only: sends SMS to parent via plivoService.
 * Caller supplies parent contact (from child_profile); fire-and-forget from server.
 */

import { sendSms } from './plivoService.js';

/** E.164: starts with + and digits */
export function looksLikeE164(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 10 || trimmed.length > 16) return false;
  if (trimmed[0] !== '+') return false;
  const rest = trimmed.slice(1).replace(/\s/g, '');
  return /^\d+$/.test(rest);
}

export interface NotifyParentOptions {
  /** Parent phone (E.164) or email; only E.164 will be used for SMS */
  parentContact: string;
  messageToParent: string;
}

/**
 * Send SMS to parent. Call only when EscalationAgent returns Tier 3.
 * Returns { sent: true } or { sent: false, error }.
 */
export async function notifyParent(options: NotifyParentOptions): Promise<{ sent: boolean; error?: string }> {
  const { parentContact, messageToParent } = options;
  const contact = parentContact.trim();

  if (!contact) {
    return { sent: false, error: 'no_parent_contact' };
  }
  if (!looksLikeE164(contact)) {
    return { sent: false, error: 'parent_contact_not_phone' };
  }

  const result = await sendSms(contact, messageToParent);
  if (result.error) {
    return { sent: false, error: result.error };
  }
  return { sent: true };
}
