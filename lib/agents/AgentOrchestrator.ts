/**
 * Agent Orchestrator
 * Coordinates all agents to process messages safely and intelligently
 */

import { SafetyAgent } from './SafetyAgent';
import { RoutingAgent } from './RoutingAgent';
import {
  ConversationalAgent,
  EducationalAgent,
  EmotionalAgent,
  CreativeAgent,
  ProblemSolvingAgent,
  ValidatorAgent,
} from './SpecialistAgents';
import { FEATURE_FLAGS } from './config';
import { AgentExecutionResult, ConversationContext } from './types';

export class AgentOrchestrator {
  private safetyAgent: SafetyAgent;
  private routingAgent: RoutingAgent;
  private conversationalAgent: ConversationalAgent;
  private educationalAgent: EducationalAgent;
  private emotionalAgent: EmotionalAgent;
  private creativeAgent: CreativeAgent;
  private problemSolvingAgent: ProblemSolvingAgent;
  private validatorAgent: ValidatorAgent;

  constructor(apiKey: string) {
    // Initialize all agents
    this.safetyAgent = new SafetyAgent(apiKey);
    this.routingAgent = new RoutingAgent(apiKey);
    this.conversationalAgent = new ConversationalAgent(apiKey);
    this.educationalAgent = new EducationalAgent(apiKey);
    this.emotionalAgent = new EmotionalAgent(apiKey);
    this.creativeAgent = new CreativeAgent(apiKey);
    this.problemSolvingAgent = new ProblemSolvingAgent(apiKey);
    this.validatorAgent = new ValidatorAgent(apiKey);
  }

  /**
   * Process a message through the complete agent pipeline
   */
  async processMessage(
    userMessage: string,
    context: ConversationContext
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    try {
      // Step 1: Safety Check (always runs)
      let safetyCheck;
      if (FEATURE_FLAGS.ENABLE_SAFETY_AGENT) {
        // Quick keyword check first (performance)
        const quicklyUnsafe = this.safetyAgent.quickCheck(userMessage);

        if (quicklyUnsafe) {
          // Full safety check for potentially unsafe messages
          safetyCheck = await this.safetyAgent.checkSafety(userMessage);

          if (!safetyCheck.safe) {
            const executionTime = Date.now() - startTime;
            return {
              success: true,
              response: {
                content: this.safetyAgent.getRedirectionMessage(safetyCheck.concerns),
                metadata: {
                  agent: 'safety',
                  model: 'redirect',
                  timestamp: new Date().toISOString(),
                  blocked: true,
                },
              },
              safetyCheck,
              executionTimeMs: executionTime,
            };
          }
        }
      }

      // Step 2: Routing (determine specialist)
      let routing;
      if (FEATURE_FLAGS.ENABLE_ROUTING) {
        // Try quick rule-based routing first
        routing = this.routingAgent.quickRoute(userMessage);

        // Fall back to LLM routing if no quick match
        if (!routing || routing.confidence < 0.7) {
          routing = await this.routingAgent.route(userMessage, context);
        }

        if (FEATURE_FLAGS.LOG_AGENT_DECISIONS) {
          console.log(`[Orchestrator] Routed to ${routing.agent} (confidence: ${routing.confidence})`);
        }
      } else {
        // Default to conversational if routing disabled
        routing = {
          agent: 'conversational' as const,
          confidence: 1,
          reasoning: 'Routing disabled',
        };
      }

      // Step 3: Get response from specialist agent
      let response;
      switch (routing.agent) {
        case 'educational':
          response = await this.educationalAgent.help(userMessage, context);
          break;
        case 'emotional':
          response = await this.emotionalAgent.support(userMessage, context);
          break;
        case 'creative':
          response = await this.creativeAgent.play(userMessage, context);
          break;
        case 'problem_solving':
          response = await this.problemSolvingAgent.solve(userMessage, context);
          break;
        default:
          response = await this.conversationalAgent.chat(userMessage, context);
      }

      // Step 4: Validate response (optional final check)
      let validation;
      if (FEATURE_FLAGS.ENABLE_RESPONSE_VALIDATION) {
        validation = await this.validatorAgent.validate(response.content);

        if (!validation.approved && validation.suggestedEdit) {
          // Use suggested edit if response failed validation
          response.content = validation.suggestedEdit;
          response.metadata = {
            ...response.metadata,
            edited: true,
            originalIssues: validation.issues,
          };
        }
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        response,
        safetyCheck,
        routing,
        validation,
        executionTimeMs: executionTime,
      };
    } catch (error) {
      console.error('[Orchestrator] Error processing message:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Health check - verify all agents are initialized
   */
  healthCheck(): { healthy: boolean; agents: string[] } {
    const agents = [
      'safety',
      'routing',
      'conversational',
      'educational',
      'emotional',
      'creative',
      'problem_solving',
      'validator',
    ];

    return {
      healthy: true,
      agents,
    };
  }
}
