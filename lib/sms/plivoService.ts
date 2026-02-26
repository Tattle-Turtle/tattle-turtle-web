/**
 * Plivo SMS Service
 * Single place that sends SMS via Plivo; no escalation logic.
 */

import plivo from 'plivo';

const MAX_SMS_LENGTH = 1600;

let client: plivo.Client | null = null;

export function getPlivoClient(): plivo.Client | null {
  const authId = process.env.PLIVO_AUTH_ID;
  const authToken = process.env.PLIVO_AUTH_TOKEN;
  if (!authId || !authToken || authId.trim() === '' || authToken.trim() === '') {
    return null;
  }
  if (!client) {
    client = new plivo.Client(authId, authToken);
  }
  return client;
}

export async function sendSms(
  to: string,
  text: string
): Promise<{ messageUuid?: string[]; error?: string }> {
  const plivoClient = getPlivoClient();
  const src = process.env.PLIVO_PHONE_NUMBER;
  if (!plivoClient || !src || src.trim() === '') {
    return { error: 'SMS not configured' };
  }
  const trimmedTo = to.trim();
  const trimmedText = text.slice(0, MAX_SMS_LENGTH).trim();
  if (!trimmedTo || !trimmedText) {
    return { error: 'Missing to or text' };
  }
  try {
    // Plivo Node SDK create(src, dst, text) or (src, [dst], text, options)
    const response = await (plivoClient.messages as { create: (a: string, b: string, c: string) => Promise<{ messageUuid?: string[] }> }).create(
      src,
      trimmedTo,
      trimmedText
    );
    return { messageUuid: response.messageUuid };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Send failed';
    return { error: message };
  }
}
