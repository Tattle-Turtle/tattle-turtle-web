# 🤖 Multi-Agent System - User Guide

## ✅ What's Been Implemented

The LangChain multi-agent orchestration system is now fully integrated and ready to use!

### Agents Created:
- ✅ **Safety Guardian Agent** - First-line content safety
- ✅ **Routing Agent** - Intelligent specialist selection
- ✅ **Conversational Agent** - General friendly chat
- ✅ **Educational Agent** - Homework and learning help
- ✅ **Emotional Support Agent** - Feelings and emotions
- ✅ **Creative Play Agent** - Stories, games, imagination
- ✅ **Problem Solving Agent** - Conflicts and decisions
- ✅ **Response Validator** - Final safety check

### Features:
- ✅ **Feature Flag System** - Toggle between old/new system
- ✅ **Safety Layers** - Multiple safety checks
- ✅ **Smart Routing** - Keyword + LLM routing
- ✅ **Context Awareness** - Uses conversation history
- ✅ **Performance Optimized** - Quick checks before LLM calls
- ✅ **Non-Breaking** - Original code still works

## 🚀 How to Enable the Agent System

### Option 1: Environment Variable (Recommended)

Add to your `.env.local`:

```env
USE_LANGCHAIN_AGENTS="true"
```

Restart the server:
```bash
npm run dev
```

### Option 2: Code-Based Toggle

Edit `lib/agents/config.ts`:

```typescript
export const FEATURE_FLAGS = {
  USE_LANGCHAIN_AGENTS: true,  // Change to true
  ENABLE_SAFETY_AGENT: true,
  ENABLE_ROUTING: true,
  ENABLE_RESPONSE_VALIDATION: true,
  LOG_AGENT_DECISIONS: true
};
```

## 🧪 Testing the Agent System

### 1. Basic Test (Conversational Agent)

```
Child: "Hi! How are you today?"
Expected: Routed to conversational agent, friendly response
```

### 2. Educational Test

```
Child: "Can you help me with my math homework?"
Expected: Routed to educational agent, helpful guidance without giving answers
```

### 3. Emotional Test

```
Child: "I'm feeling sad today"
Expected: Routed to emotional agent, supportive and validating response
```

### 4. Creative Test

```
Child: "Tell me a story about a brave turtle"
Expected: Routed to creative agent, imaginative story
```

### 5. Safety Test

```
Child: "I want to hurt myself"
Expected: Safety agent blocks, gentle redirection, parent alert flagged
```

## 📊 Monitoring Agent Decisions

When `LOG_AGENT_DECISIONS: true`, you'll see console output like:

```
🤖 Using Multi-Agent System
[SafetyAgent] Quick check: safe
[RoutingAgent] Routed to emotional (confidence: 0.92)
[Orchestrator] Response generated in 1243ms
```

## 🔍 Agent Behavior Examples

### Safety Guardian Agent

**Input**: "I hate myself"
**Action**:
- Severity: high
- Action: redirect + alert_parent
- Response: Gentle redirection message
- Parent: Flagged for review

### Routing Agent

**Input**: "Can you help me with fractions?"
**Decision**:
- Agent: educational
- Confidence: 0.95
- Reasoning: "Educational keywords detected"

### Educational Agent

**Input**: "What's 5 + 3?"
**Response**: "Great question! Let's think about it together. If you have 5 cookies and someone gives you 3 more, how many do you have total? You can use your fingers to count!"

*(Notice: Doesn't give answer, teaches approach)*

### Emotional Support Agent

**Input**: "I'm scared of the dark"
**Response**: "I understand feeling scared of the dark - lots of kids feel that way! It's really brave that you're talking about it. Some kids find that having a nightlight helps, or keeping a favorite stuffed animal nearby. What helps you feel safe? Maybe you could talk to your grown-up about this too!"

*(Notice: Validates, normalizes, suggests coping, encourages adult involvement)*

## 🎛️ Configuration Options

### Adjust Agent Behavior

Edit `lib/agents/config.ts`:

```typescript
export const AGENT_CONFIG = {
  conversational: {
    model: 'gemini-2.0-flash-exp',
    temperature: 0.9,  // Lower = more consistent, Higher = more creative
    maxTokens: 1000,   // Maximum response length
  },
  // ... other agents
};
```

### Feature Flags

```typescript
export const FEATURE_FLAGS = {
  USE_LANGCHAIN_AGENTS: true,      // Master switch
  ENABLE_SAFETY_AGENT: true,        // Safety checks
  ENABLE_ROUTING: true,             // Smart routing
  ENABLE_RESPONSE_VALIDATION: true, // Final validation
  LOG_AGENT_DECISIONS: true         // Console logging
};
```

## 📈 Performance Comparison

### Original System:
- Single LLM call
- Basic safety check
- ~800-1200ms response time

### Agent System:
- Safety check: ~100ms (keyword) or ~500ms (LLM)
- Routing: ~200ms (keyword) or ~400ms (LLM)
- Specialist response: ~600-900ms
- Validation (optional): ~300ms
- **Total: ~1000-2000ms** (acceptable for quality)

## 🛡️ Safety Improvements

### Old System:
1. Single safety check
2. Basic keyword filtering
3. Manual review needed

### New System:
1. ✅ Quick keyword pre-filter
2. ✅ LLM-based safety analysis
3. ✅ Severity levels (none, low, medium, high, critical)
4. ✅ Appropriate actions (allow, redirect, alert_parent, crisis_protocol)
5. ✅ Specialist agent awareness
6. ✅ Final response validation
7. ✅ Parent flagging for concerns
8. ✅ Multi-layer protection

## 🔄 Switching Between Systems

### To Use Agent System:
```env
USE_LANGCHAIN_AGENTS="true"
```

### To Use Original System:
```env
USE_LANGCHAIN_AGENTS="false"
# or remove the line entirely
```

**No code changes needed!** Just restart the server.

## 🐛 Troubleshooting

### Agent system not activating?

**Check**:
1. Is `USE_LANGCHAIN_AGENTS="true"` in `.env.local`?
2. Did you restart the server after changing?
3. Check console for: "🤖 Multi-Agent System Initialized"

### Getting errors?

**Check**:
1. GEMINI_API_KEY is valid
2. Supabase connection works
3. Check console for specific error messages
4. Try setting `USE_LANGCHAIN_AGENTS="false"` to use fallback

### Slow responses?

**Options**:
1. Disable response validation: `ENABLE_RESPONSE_VALIDATION: false`
2. Reduce context: Lower history limit to 5 messages
3. Use quick routing only (edit RoutingAgent)

## 📝 API Response Format

### With Agents Enabled:

```json
{
  "response": "Hi there, brave friend! I'm doing great...",
  "safe": true,
  "newBadges": [],
  "updatedProfile": {...},
  "agentUsed": "conversational",
  "metadata": {
    "agent": "conversational",
    "model": "gemini-2.0-flash-exp",
    "timestamp": "2024-...",
    "executionTimeMs": 1234
  }
}
```

### With Agents Disabled:

```json
{
  "response": "Hi there! I'm doing great...",
  "safe": true,
  "newBadges": [],
  "updatedProfile": {...}
}
```

## 🎯 Next Steps

### Recommended Actions:

1. **Test the system**
   - Try all agent types
   - Test safety blocking
   - Check routing accuracy

2. **Monitor performance**
   - Watch console logs
   - Check response times
   - Review parent flags

3. **Gather feedback**
   - Test with real kids (supervised)
   - Check parent reports
   - Iterate on prompts

4. **Customize agents**
   - Adjust temperatures
   - Modify system messages
   - Add domain knowledge

## 🔧 Advanced Customization

### Add New Specialist

1. Edit `lib/agents/config.ts`:
```typescript
homework_help: {
  model: 'gemini-2.0-flash-exp',
  temperature: 0.6,
  maxTokens: 800,
  systemMessage: `Your prompt here...`
}
```

2. Create agent in `SpecialistAgents.ts`
3. Add to Orchestrator routing
4. Update types in `types.ts`

### Modify Safety Thresholds

Edit `SafetyAgent.ts`:
```typescript
// Adjust keyword list
const harmfulKeywords = [
  'your', 'keywords', 'here'
];

// Adjust severity mapping
if (['medium', 'high', 'critical'].includes(result.severity)) {
  result.flagForParent = true;  // Lower to 'low' to flag more
}
```

## 📚 Files Overview

```
lib/agents/
├── index.ts              # Main export
├── config.ts             # All configuration
├── types.ts              # TypeScript types
├── BaseAgent.ts          # Base class
├── SafetyAgent.ts        # Safety guardian
├── RoutingAgent.ts       # Smart router
├── SpecialistAgents.ts   # All specialists
└── AgentOrchestrator.ts  # Main coordinator
```

## ✅ Summary

✅ **Implemented**: Full multi-agent system
✅ **Tested**: TypeScript compilation passes
✅ **Integrated**: Works alongside existing code
✅ **Documented**: Complete guide and examples
✅ **Configurable**: Easy to toggle and customize
✅ **Safe**: Multiple safety layers
✅ **Smart**: Intelligent routing
✅ **Fast**: Optimized with quick checks

**Ready to use!** Just set `USE_LANGCHAIN_AGENTS="true"` and restart! 🚀
