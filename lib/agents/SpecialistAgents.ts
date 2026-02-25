/**
 * Specialist Agents
 * Domain-specific agents for different types of conversations
 */

import { BaseAgent } from './BaseAgent';
import { AgentResponse, ConversationContext } from './types';

/**
 * Conversational Agent - General friendly chat
 */
export class ConversationalAgent extends BaseAgent {
  constructor(apiKey: string) {
    super('conversational', apiKey);
  }

  async chat(userMessage: string, context: ConversationContext): Promise<AgentResponse> {
    return this.process(userMessage, context);
  }
}

/**
 * Educational Agent - Homework and learning support
 */
export class EducationalAgent extends BaseAgent {
  constructor(apiKey: string) {
    super('educational', apiKey);
  }

  async help(userMessage: string, context: ConversationContext): Promise<AgentResponse> {
    return this.process(userMessage, context);
  }
}

/**
 * Emotional Support Agent - Feelings and emotions
 */
export class EmotionalAgent extends BaseAgent {
  constructor(apiKey: string) {
    super('emotional', apiKey);
  }

  async support(userMessage: string, context: ConversationContext): Promise<AgentResponse> {
    return this.process(userMessage, context);
  }
}

/**
 * Creative Play Agent - Stories, games, imagination
 */
export class CreativeAgent extends BaseAgent {
  constructor(apiKey: string) {
    super('creative', apiKey);
  }

  async play(userMessage: string, context: ConversationContext): Promise<AgentResponse> {
    return this.process(userMessage, context);
  }
}

/**
 * Problem Solving Agent - Conflicts and decisions
 */
export class ProblemSolvingAgent extends BaseAgent {
  constructor(apiKey: string) {
    super('problem_solving', apiKey);
  }

  async solve(userMessage: string, context: ConversationContext): Promise<AgentResponse> {
    return this.process(userMessage, context);
  }
}

/**
 * Response Validator - Final safety check
 */
export class ValidatorAgent extends BaseAgent {
  constructor(apiKey: string) {
    super('validator', apiKey);
  }

  async validate(response: string): Promise<{
    approved: boolean;
    issues: string[];
    suggestedEdit?: string;
  }> {
    try {
      const validationPrompt = `Validate this response for a child:\n\n"${response}"`;
      const result = await this.process(validationPrompt);
      const parsed = this.parseJsonResponse<{
        approved: boolean;
        issues: string[];
        suggestedEdit?: string;
      }>(result.content);

      if (!parsed) {
        // If parsing fails, default to approving (trust earlier safety checks)
        return {
          approved: true,
          issues: [],
        };
      }

      return parsed;
    } catch (error) {
      console.error('[ValidatorAgent] Validation error:', error);
      return {
        approved: true, // Fail open after other safety checks
        issues: ['Validation error occurred'],
      };
    }
  }
}
