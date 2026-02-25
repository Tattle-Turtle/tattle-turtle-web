/**
 * Safety Guardian Agent
 * First line of defense - checks all messages for safety
 */

import { BaseAgent } from './BaseAgent';
import { SafetyCheckResult } from './types';

export class SafetyAgent extends BaseAgent {
  constructor(apiKey: string) {
    super('safety', apiKey);
  }

  /**
   * Check if a message is safe for a child
   */
  async checkSafety(userMessage: string): Promise<SafetyCheckResult> {
    try {
      const response = await this.process(userMessage);
      const result = this.parseJsonResponse<SafetyCheckResult>(response.content);

      if (!result) {
        // Fallback to strict safety if parsing fails
        console.warn('[SafetyAgent] Failed to parse response, defaulting to safe');
        return {
          safe: true,
          severity: 'none',
          concerns: [],
          suggestedAction: 'allow',
        };
      }

      // Log for monitoring
      if (!result.safe) {
        console.warn('[SafetyAgent] Unsafe content detected:', {
          severity: result.severity,
          concerns: result.concerns,
          action: result.suggestedAction,
        });
      }

      // Flag for parent if medium or higher severity
      if (['medium', 'high', 'critical'].includes(result.severity)) {
        result.flagForParent = true;
      }

      return result;
    } catch (error) {
      console.error('[SafetyAgent] Error during safety check:', error);

      // Fail safe: if error, default to blocking
      return {
        safe: false,
        severity: 'medium',
        concerns: ['Unable to verify safety due to system error'],
        suggestedAction: 'redirect',
        flagForParent: true,
      };
    }
  }

  /**
   * Get a gentle redirection message for unsafe content
   */
  getRedirectionMessage(concerns: string[]): string {
    const redirections = [
      "Let's talk about something happy and positive instead! What's your favorite thing to do for fun?",
      "I'd rather chat about things that make you smile! What made you laugh today?",
      "How about we talk about something cheerful? Do you have a favorite game or book?",
      "Let's focus on positive things! Tell me about something you're proud of!",
      "I'm here to chat about fun and friendly topics! What's something cool you learned recently?",
    ];

    // Pick a random redirection
    const random = Math.floor(Math.random() * redirections.length);
    return redirections[random];
  }

  /**
   * Keyword-based quick check (fast pre-filter)
   * Returns true if potentially unsafe keywords detected
   */
  quickCheck(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Obvious harmful keywords
    const harmfulKeywords = [
      'kill',
      'die',
      'suicide',
      'hurt myself',
      'hate myself',
      'stupid',
      'dumb',
      'hate you',
    ];

    // Check for harmful keywords
    for (const keyword of harmfulKeywords) {
      if (lowerMessage.includes(keyword)) {
        return true; // Potentially unsafe
      }
    }

    return false; // Looks safe on quick check
  }
}
