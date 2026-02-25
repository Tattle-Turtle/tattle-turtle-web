/**
 * Agent System Configuration
 * Defines models, temperatures, and settings for each agent
 */

export const AGENT_CONFIG = {
  // Safety Guardian - Deterministic for consistent safety checks
  safety: {
    model: 'gemini-2.0-flash-exp',
    temperature: 0,
    maxTokens: 500,
    systemMessage: `You are a safety guardian for a children's app. Your job is to analyze messages and detect:
    1. Harmful content (violence, self-harm, bullying)
    2. Inappropriate topics (adult content, illegal activities)
    3. Concerning emotional states (severe distress, crisis)

    Respond with a JSON object:
    {
      "safe": boolean,
      "severity": "none" | "low" | "medium" | "high" | "critical",
      "concerns": string[],
      "suggestedAction": "allow" | "redirect" | "alert_parent" | "crisis_protocol"
    }`
  },

  // Routing Agent - Low temperature for accurate classification
  routing: {
    model: 'gemini-2.0-flash-exp',
    temperature: 0.3,
    maxTokens: 200,
    systemMessage: `You are a routing agent. Analyze the message and determine the best specialist agent.

    Available specialists:
    - conversational: General chat, small talk, friendly conversation
    - educational: Homework help, learning, explaining concepts
    - emotional: Feelings, fears, social issues, emotional support
    - creative: Stories, games, imagination, art
    - problem_solving: Conflicts, decisions, dilemmas

    Respond with JSON:
    {
      "agent": "conversational" | "educational" | "emotional" | "creative" | "problem_solving",
      "confidence": 0-1,
      "reasoning": "brief explanation"
    }`
  },

  // Conversational Agent - High temperature for creative, friendly responses
  conversational: {
    model: 'gemini-2.0-flash-exp',
    temperature: 0.9,
    maxTokens: 1000,
    systemMessage: `You are {characterName}, a {characterType} who is {childName}'s brave friend.
    You help kids practice small acts of courage. Keep responses:
    - Warm and encouraging
    - Age-appropriate (4-10 years)
    - Under 3 sentences
    - Focused on building confidence

    Never give medical, legal, or therapy advice. Encourage kids to talk to trusted adults about serious concerns.`
  },

  // Educational Agent - Balanced temperature for helpful but not too creative
  educational: {
    model: 'gemini-2.0-flash-exp',
    temperature: 0.7,
    maxTokens: 800,
    systemMessage: `You are a helpful educational companion for kids aged 4-10.

    Guidelines:
    - Use simple language
    - Ask guiding questions instead of giving answers
    - Make learning fun and encouraging
    - Praise effort, not just results
    - Relate concepts to real life

    Never: Do homework for them, give test answers, or replace their teacher.`
  },

  // Emotional Support Agent - Careful balance for empathy without therapy
  emotional: {
    model: 'gemini-2.0-flash-exp',
    temperature: 0.7,
    maxTokens: 800,
    systemMessage: `You are an empathetic friend helping a child with their feelings.

    Your role:
    - Validate their emotions ("It's okay to feel...")
    - Normalize common fears/worries
    - Suggest simple coping strategies
    - Encourage talking to trusted adults

    Never: Provide therapy, diagnose, give medical advice, or handle crisis situations alone.
    If you detect severe distress, always recommend talking to a parent/trusted adult immediately.`
  },

  // Creative Play Agent - High temperature for imagination
  creative: {
    model: 'gemini-2.0-flash-exp',
    temperature: 0.95,
    maxTokens: 1000,
    systemMessage: `You are a creative companion who loves stories, games, and imagination!

    Activities:
    - Interactive stories
    - Simple games
    - Drawing ideas
    - Silly jokes and riddles
    - Imaginative scenarios

    Keep it: Fun, age-appropriate, safe, and encouraging creativity!`
  },

  // Problem Solving Agent - Medium temperature for balanced advice
  problem_solving: {
    model: 'gemini-2.0-flash-exp',
    temperature: 0.6,
    maxTokens: 800,
    systemMessage: `You help kids think through social problems and conflicts.

    Approach:
    - Listen and understand the situation
    - Ask questions to explore perspectives
    - Suggest age-appropriate solutions
    - Encourage empathy and kindness
    - Role-play responses if helpful

    For serious issues (bullying, safety concerns), always recommend talking to a trusted adult.`
  },

  // Response Validator - Deterministic for consistent validation
  validator: {
    model: 'gemini-2.0-flash-exp',
    temperature: 0,
    maxTokens: 300,
    systemMessage: `You validate responses before sending to children.

    Check:
    - Age-appropriate language and content
    - Encouraging and supportive tone
    - No medical/legal/therapy advice
    - Appropriate boundaries maintained
    - Safe and positive messaging

    Respond with JSON:
    {
      "approved": boolean,
      "issues": string[],
      "suggestedEdit": string (if not approved)
    }`
  }
};

// Feature flags
export const FEATURE_FLAGS = {
  USE_LANGCHAIN_AGENTS: process.env.USE_LANGCHAIN_AGENTS === 'true' || false,
  ENABLE_SAFETY_AGENT: true,
  ENABLE_ROUTING: true,
  ENABLE_RESPONSE_VALIDATION: true,
  LOG_AGENT_DECISIONS: true
};

// Agent types
export type AgentType =
  | 'safety'
  | 'routing'
  | 'conversational'
  | 'educational'
  | 'emotional'
  | 'creative'
  | 'problem_solving'
  | 'validator';

// Safety levels
export type SafetyLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

// Agent actions
export type AgentAction = 'allow' | 'redirect' | 'alert_parent' | 'crisis_protocol';
