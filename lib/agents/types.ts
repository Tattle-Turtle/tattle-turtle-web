/**
 * Agent System Types
 * Type definitions for the multi-agent system
 */

import { AgentType, SafetyLevel, AgentAction } from './config';

// Safety check result
export interface SafetyCheckResult {
  safe: boolean;
  severity: SafetyLevel;
  concerns: string[];
  suggestedAction: AgentAction;
  flagForParent?: boolean;
}

// Routing decision
export interface RoutingDecision {
  agent: Exclude<AgentType, 'safety' | 'routing' | 'validator'>;
  confidence: number;
  reasoning: string;
}

// Validation result
export interface ValidationResult {
  approved: boolean;
  issues: string[];
  suggestedEdit?: string;
}

// Agent response
export interface AgentResponse {
  content: string;
  metadata?: {
    agent: AgentType;
    model: string;
    timestamp: string;
    tokensUsed?: number;
    [key: string]: any;
  };
}

// Conversation context
export interface ConversationContext {
  childName: string;
  characterName: string;
  characterType: string;
  recentMessages: Array<{
    role: 'user' | 'model';
    content: string;
    timestamp: string;
  }>;
  childAge?: number;
}

// Agent execution result
export interface AgentExecutionResult {
  success: boolean;
  response?: AgentResponse;
  safetyCheck?: SafetyCheckResult;
  routing?: RoutingDecision;
  validation?: ValidationResult;
  error?: string;
  executionTimeMs?: number;
}

// Parent alert
export interface ParentAlert {
  severity: SafetyLevel;
  message: string;
  childMessage: string;
  timestamp: string;
  action: AgentAction;
  reviewed: boolean;
}
