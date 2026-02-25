# 🤖 Multi-Agent LangChain Architecture

## 🎯 Goal

Create a multi-agent system using LangChain that provides layered safety and specialized capabilities for child interactions.

## 🏗️ Proposed Architecture

```
User Message
    ↓
┌─────────────────────────────┐
│  LangChain Orchestrator     │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│  Safety Agent Layer         │
│  - Content Filter           │
│  - Harm Detection           │
│  - Age Appropriateness      │
└─────────────────────────────┘
    ↓ (if safe)
┌─────────────────────────────┐
│  Routing Agent              │
│  - Determines intent        │
│  - Routes to specialist     │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│  Specialist Agents          │
│  ├─ Conversational Agent    │
│  ├─ Educational Agent       │
│  ├─ Emotional Support Agent │
│  ├─ Creative Play Agent     │
│  └─ Problem Solving Agent   │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│  Response Validator         │
│  - Double-check safety      │
│  - Tone verification        │
└─────────────────────────────┘
    ↓
Final Response to Child
```

## 🤖 Agent Definitions

### 1. **Safety Guardian Agent**
**Purpose**: First line of defense
**Tools**:
- Content moderation API
- Keyword detection
- Context analysis
- Sentiment analysis

**Actions**:
- Block harmful content
- Flag concerning topics
- Alert parents if needed
- Gentle redirection

### 2. **Routing Agent**
**Purpose**: Understand intent and route to specialist
**Tools**:
- Intent classification
- Topic detection
- Emotion detection

**Routes to**:
- Conversational (general chat)
- Educational (homework, learning)
- Emotional (feeling sad, scared)
- Creative (stories, games)
- Problem Solving (conflicts, dilemmas)

### 3. **Conversational Agent**
**Purpose**: General friendly chat
**Personality**: Warm, encouraging, playful
**Capabilities**:
- Small talk
- Storytelling
- Jokes and riddles
- Character consistency

### 4. **Educational Agent**
**Purpose**: Help with learning
**Tools**:
- Math solver
- Reading comprehension
- Science explanations
- Homework guidance (without giving answers)

**Capabilities**:
- Explain concepts simply
- Ask guiding questions
- Encourage critical thinking
- Praise effort

### 5. **Emotional Support Agent**
**Purpose**: Handle feelings and emotions
**Tools**:
- Emotion detection
- Coping strategies database
- Parent notification system

**Capabilities**:
- Validate feelings
- Teach coping skills
- Suggest talking to trusted adults
- Mindfulness exercises

### 6. **Creative Play Agent**
**Purpose**: Imaginative play and creativity
**Tools**:
- Story generation
- Game creation
- Drawing prompts
- Music suggestions

**Capabilities**:
- Interactive stories
- Collaborative games
- Art projects
- Imaginative scenarios

### 7. **Problem Solving Agent**
**Purpose**: Help with social conflicts
**Tools**:
- Conflict resolution strategies
- Social skills database
- Role-playing scenarios

**Capabilities**:
- Listen to problems
- Suggest solutions
- Practice responses
- Encourage empathy

### 8. **Response Validator Agent**
**Purpose**: Final safety check
**Actions**:
- Verify age-appropriateness
- Check tone
- Ensure encouragement
- Flag for human review if needed

## 📦 LangChain Implementation

### Stack:
- **Framework**: LangChain.js
- **LLM**: Google Gemini (already integrated)
- **Memory**: Supabase (conversation history)
- **Tools**: Custom tools for each agent
- **Orchestration**: LangChain Agent Executor

### Key Components:

```typescript
// Agent definitions
const safetyAgent = new Agent({
  llm: gemini,
  tools: [contentFilter, harmDetection],
  memory: conversationMemory
});

const routingAgent = new Agent({
  llm: gemini,
  tools: [intentClassifier],
  memory: conversationMemory
});

const specialists = {
  conversational: new Agent({ ... }),
  educational: new Agent({ ... }),
  emotional: new Agent({ ... }),
  creative: new Agent({ ... }),
  problemSolving: new Agent({ ... })
};

// Orchestrator
const orchestrator = new AgentExecutor({
  agents: [safetyAgent, routingAgent, ...specialists],
  memory: conversationMemory,
  maxIterations: 5
});
```

## 🔄 Conversation Flow

1. **Message Received**
   ```
   User: "I'm scared of the dark"
   ```

2. **Safety Agent**
   ```
   ✅ No harmful content
   ✅ Age-appropriate topic
   ✅ Emotional topic detected → Flag for Emotional Agent
   ```

3. **Routing Agent**
   ```
   Intent: Emotional Support
   Emotion: Fear/Anxiety
   Route to: Emotional Support Agent
   ```

4. **Emotional Support Agent**
   ```
   Response Strategy:
   - Validate feeling
   - Normalize fear
   - Suggest coping strategy
   - Encourage talking to parent
   ```

5. **Response Validator**
   ```
   ✅ Supportive tone
   ✅ Age-appropriate advice
   ✅ Encourages parent involvement
   ✅ No medical/therapeutic advice
   ```

6. **Final Response**
   ```
   "I understand feeling scared of the dark - lots of kids feel that way!
   It's really brave that you're talking about it. Here's what helps some
   kids: keeping a nightlight on, or having a favorite stuffed animal for
   company. What helps you feel safe? Also, maybe you could talk to your
   grown-up about this - they might have good ideas too! 💡"
   ```

## 🛡️ Multi-Layer Safety

### Layer 1: Input Safety (Safety Agent)
- Harmful content detection
- Self-harm language
- Bullying language
- Inappropriate topics

### Layer 2: Routing Safety
- Age-appropriate routing
- Sensitive topic handling
- Crisis detection → Parent alert

### Layer 3: Response Safety (Validator)
- Tone check
- Content double-check
- Boundary verification

### Layer 4: Parent Monitoring
- All flagged conversations
- Summary reports
- Real-time alerts for serious concerns

## 📊 Benefits

### For Kids:
- ✅ More specialized, helpful responses
- ✅ Better emotional support
- ✅ Educational assistance
- ✅ Creative engagement
- ✅ Multiple safety checks

### For Parents:
- ✅ Layered protection
- ✅ Specialized expertise per topic
- ✅ Better insights into child's needs
- ✅ Crisis detection
- ✅ Detailed reports

### For Development:
- ✅ Modular, testable agents
- ✅ Easy to add new specialists
- ✅ Clear responsibility separation
- ✅ Better debugging
- ✅ Scalable architecture

## 🚀 Implementation Plan

### Phase 1: Setup (Day 1)
- [ ] Install LangChain dependencies
- [ ] Set up agent framework
- [ ] Create base agent classes
- [ ] Test basic orchestration

### Phase 2: Core Agents (Day 2-3)
- [ ] Implement Safety Agent
- [ ] Implement Routing Agent
- [ ] Implement Conversational Agent
- [ ] Test agent chain

### Phase 3: Specialists (Day 4-5)
- [ ] Educational Agent
- [ ] Emotional Support Agent
- [ ] Creative Play Agent
- [ ] Problem Solving Agent

### Phase 4: Safety & Validation (Day 6)
- [ ] Response Validator
- [ ] Parent alerting system
- [ ] Logging and monitoring
- [ ] Safety testing

### Phase 5: Integration (Day 7)
- [ ] Connect to existing UI
- [ ] Database integration
- [ ] TTS integration
- [ ] End-to-end testing

## 📦 Dependencies

```bash
npm install langchain @langchain/core @langchain/community
npm install @langchain/google-genai  # Gemini integration
npm install zod  # Schema validation
```

## 🔧 Configuration

```typescript
// config/agents.ts
export const AGENT_CONFIG = {
  safety: {
    model: 'gemini-3-flash-preview',
    temperature: 0,  // Deterministic for safety
    maxTokens: 500
  },
  routing: {
    model: 'gemini-3-flash-preview',
    temperature: 0.3,
    maxTokens: 200
  },
  conversational: {
    model: 'gemini-3-flash-preview',
    temperature: 0.9,  // Creative
    maxTokens: 1000
  },
  emotional: {
    model: 'gemini-3-flash-preview',
    temperature: 0.7,
    maxTokens: 800
  }
};
```

## 🎯 Success Metrics

- **Safety**: 99.9% harmful content blocked
- **Routing Accuracy**: >95% correct agent selection
- **Response Quality**: Parent satisfaction >90%
- **Latency**: <2 seconds end-to-end
- **Engagement**: Increased session duration

## 🔮 Future Enhancements

- **Multimodal**: Image understanding for drawings
- **Voice Analysis**: Emotion from tone of voice
- **Proactive Support**: Detect patterns, offer help
- **Personalization**: Learn individual child's needs
- **Collaboration**: Multiple agents work together

Would you like me to start implementing this architecture?
