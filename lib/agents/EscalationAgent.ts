/**
 * Escalation Agent
 * Determines tier (0-3) from distress signals and safety result.
 * Tier 3 only triggers parent SMS; Tiers 1-2 shape in-app response only.
 */

import type { SafetyCheckResult } from './types';
import type { EscalationResult, EscalationTier, EscalationResponseShape } from './types';
import type { ConversationContext } from './types';

const DISTRESS_WORDS = [
  'sad', 'scared', 'worried', 'upset', 'afraid', 'mad', 'angry', 'hurt',
  'sad.', 'scared.', 'worried.', 'upset.', 'afraid.', 'mad.', 'angry.', 'hurt.',
  'sad,', 'scared,', 'worried,', 'upset,', 'afraid,', 'mad,', 'angry,', 'hurt,',
  'sad ', 'scared ', 'worried ', 'upset ', 'afraid ', 'mad ', 'angry ', 'hurt ',
  'unhappy', 'frustrated', 'lonely', 'anxious', 'nervous', 'stressed',
  'hate', 'don\'t like', 'dont like', 'bad', 'terrible', 'awful',
];

const REPEATED_DISTRESS_THRESHOLD = 2;
const RECENT_USER_MESSAGES_FOR_DISTRESS = 5;

export interface EscalationInput {
  userMessage: string;
  recentMessages: Array<{ role: string; content: string }>;
  safetyCheck: SafetyCheckResult | null | undefined;
  context?: ConversationContext;
  /** True if distress-themed messages on >=2 different days in last 7 days */
  patternOverDays?: boolean;
}

function countDistressInText(text: string): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const word of DISTRESS_WORDS) {
    if (lower.includes(word)) count += 1;
  }
  return count;
}

function getRecentUserMessages(messages: Array<{ role: string; content: string }>): string[] {
  return messages
    .filter((m) => m.role === 'user')
    .slice(-RECENT_USER_MESSAGES_FOR_DISTRESS)
    .map((m) => m.content);
}

function hasRepeatedDistress(userMessage: string, recentMessages: Array<{ role: string; content: string }>): boolean {
  const recentUser = getRecentUserMessages(recentMessages);
  const allText = [userMessage, ...recentUser].join(' ');
  const count = countDistressInText(allText);
  return count >= REPEATED_DISTRESS_THRESHOLD;
}

function isTier3Severe(safetyCheck: SafetyCheckResult | null | undefined): boolean {
  if (!safetyCheck) return false;
  if (safetyCheck.suggestedAction === 'alert_parent' || safetyCheck.suggestedAction === 'crisis_protocol') {
    return true;
  }
  if (safetyCheck.severity === 'high' || safetyCheck.severity === 'critical') {
    return true;
  }
  if (safetyCheck.flagForParent && (safetyCheck.severity === 'medium' || safetyCheck.severity === 'high' || safetyCheck.severity === 'critical')) {
    return true;
  }
  return false;
}

function buildMessageToParent(childName: string, reason?: string): string {
  const base = `Brave Call: ${childName} may need your support. Please check in when you can.`;
  if (reason && reason.trim()) {
    return `${base} (${reason.trim()})`;
  }
  return base;
}

/**
 * Compute escalation tier and response shape. No I/O; pure function of inputs.
 */
export function evaluateEscalation(input: EscalationInput): EscalationResult {
  const { userMessage, recentMessages, safetyCheck, context, patternOverDays } = input;
  const childName = context?.childName ?? 'Your child';

  // Tier 3: Severe keywords / crisis / alert_parent
  if (isTier3Severe(safetyCheck)) {
    return {
      tier: 3,
      responseShape: 'calm_plus_alert',
      reason: safetyCheck?.concerns?.join('; ') ?? 'Safety concern',
      messageToParent: buildMessageToParent(childName, safetyCheck?.concerns?.[0]),
    };
  }

  // Tier 2: Pattern over days
  if (patternOverDays === true) {
    return {
      tier: 2,
      responseShape: 'add_grown_up_suggestion',
      reason: 'Distress pattern over multiple days',
    };
  }

  // Tier 1: Repeated distress in current/session
  if (hasRepeatedDistress(userMessage, recentMessages)) {
    return {
      tier: 1,
      responseShape: 'longer_empathy',
      reason: 'Repeated distress words',
    };
  }

  // Tier 0: Normal
  return {
    tier: 0,
    responseShape: 'normal',
  };
}
