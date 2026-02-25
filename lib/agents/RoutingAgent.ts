/**
 * Routing Agent
 * Determines which specialist agent should handle the message
 */

import { BaseAgent } from './BaseAgent';
import { RoutingDecision, ConversationContext } from './types';

export class RoutingAgent extends BaseAgent {
  constructor(apiKey: string) {
    super('routing', apiKey);
  }

  /**
   * Determine which specialist agent should handle this message
   */
  async route(
    userMessage: string,
    context?: ConversationContext
  ): Promise<RoutingDecision> {
    try {
      const response = await this.process(userMessage, context);
      const decision = this.parseJsonResponse<RoutingDecision>(response.content);

      if (!decision || decision.confidence < 0.5) {
        // Default to conversational if unsure
        console.log('[RoutingAgent] Low confidence or parse error, defaulting to conversational');
        return {
          agent: 'conversational',
          confidence: 0.5,
          reasoning: 'Default routing due to uncertainty',
        };
      }

      console.log('[RoutingAgent] Routing decision:', decision);
      return decision;
    } catch (error) {
      console.error('[RoutingAgent] Error during routing:', error);

      // Fallback to conversational agent
      return {
        agent: 'conversational',
        confidence: 0.5,
        reasoning: 'Error during routing, using fallback',
      };
    }
  }

  /**
   * Quick rule-based routing for obvious cases (performance optimization)
   */
  quickRoute(message: string): RoutingDecision | null {
    const lowerMessage = message.toLowerCase();

    // Educational keywords
    const educationalKeywords = ['homework', 'math', 'reading', 'science', 'study', 'learn', 'teach', 'explain'];
    if (educationalKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return {
        agent: 'educational',
        confidence: 0.8,
        reasoning: 'Educational keywords detected',
      };
    }

    // Emotional keywords
    const emotionalKeywords = ['sad', 'scared', 'afraid', 'worried', 'angry', 'lonely', 'cry', 'upset'];
    if (emotionalKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return {
        agent: 'emotional',
        confidence: 0.8,
        reasoning: 'Emotional keywords detected',
      };
    }

    // Creative keywords
    const creativeKeywords = ['story', 'game', 'play', 'pretend', 'imagine', 'draw', 'create'];
    if (creativeKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return {
        agent: 'creative',
        confidence: 0.8,
        reasoning: 'Creative keywords detected',
      };
    }

    // Problem-solving keywords
    const problemKeywords = ['problem', 'conflict', 'fight', 'argue', 'disagree', 'help me decide'];
    if (problemKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return {
        agent: 'problem_solving',
        confidence: 0.8,
        reasoning: 'Problem-solving keywords detected',
      };
    }

    // No clear match, let LLM decide
    return null;
  }
}
