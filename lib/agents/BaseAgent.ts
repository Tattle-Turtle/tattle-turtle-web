/**
 * Base Agent Class
 * Foundation for all specialized agents using LangChain (OpenAI or Google)
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { AGENT_CONFIG, AgentType } from './config';
import { AgentResponse, ConversationContext } from './types';

export type AIProvider = 'openai' | 'google';

export class BaseAgent {
  protected llm: BaseChatModel;
  protected agentType: AgentType;
  protected systemMessage: string;

  constructor(agentType: AgentType, apiKey: string, provider: AIProvider = 'google') {
    this.agentType = agentType;
    const config = AGENT_CONFIG[agentType] as { model: string; openaiModel?: string; temperature: number; maxTokens: number; systemMessage: string };

    if (provider === 'openai') {
      this.llm = new ChatOpenAI({
        modelName: config.openaiModel ?? 'gpt-4o-mini',
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        openAIApiKey: apiKey,
      });
    } else {
      this.llm = new ChatGoogleGenerativeAI({
        model: config.model,
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
        apiKey: apiKey,
      });
    }

    this.systemMessage = config.systemMessage;
  }

  /**
   * Process a message with context
   */
  async process(
    userMessage: string,
    context?: ConversationContext
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      // Build message chain
      const messages = this.buildMessageChain(userMessage, context);

      // Invoke LLM
      const response = await this.llm.invoke(messages);

      const executionTime = Date.now() - startTime;

      return {
        content: response.content.toString(),
        metadata: {
          agent: this.agentType,
          model: AGENT_CONFIG[this.agentType].model,
          timestamp: new Date().toISOString(),
          executionTimeMs: executionTime,
        },
      };
    } catch (error) {
      console.error(`[${this.agentType}] Error:`, error);
      throw new Error(`Agent ${this.agentType} failed: ${error}`);
    }
  }

  /**
   * Build message chain with context
   */
  protected buildMessageChain(
    userMessage: string,
    context?: ConversationContext
  ) {
    const messages: (SystemMessage | HumanMessage | AIMessage)[] = [];

    // Add system message with context interpolation
    let systemMsg = this.systemMessage;
    if (context) {
      systemMsg = systemMsg
        .replace('{characterName}', context.characterName)
        .replace('{characterType}', context.characterType)
        .replace('{childName}', context.childName);
    }
    messages.push(new SystemMessage(systemMsg));

    // Add recent conversation history (last 5 messages for context)
    if (context?.recentMessages) {
      const recentHistory = context.recentMessages.slice(-5);
      recentHistory.forEach((msg) => {
        if (msg.role === 'user') {
          messages.push(new HumanMessage(msg.content));
        } else {
          messages.push(new AIMessage(msg.content));
        }
      });
    }

    // Add current message
    messages.push(new HumanMessage(userMessage));

    return messages;
  }

  /**
   * Parse JSON response safely
   */
  protected parseJsonResponse<T>(content: string): T | null {
    try {
      // Remove markdown code blocks if present
      const cleaned = content
        .replace(/```json\n/g, '')
        .replace(/```\n/g, '')
        .replace(/```/g, '')
        .trim();

      return JSON.parse(cleaned) as T;
    } catch (error) {
      console.error(`[${this.agentType}] JSON parse error:`, error);
      return null;
    }
  }
}
