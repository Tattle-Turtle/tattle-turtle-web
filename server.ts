import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { generateCharacterAvatar } from "./lib/avatars.js";
import { AgentOrchestrator, FEATURE_FLAGS } from "./lib/agents/index.js";

// Load environment variables from .env.local (preferred) or .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config(); // Fallback to .env

console.log("🔧 Environment Check:");
console.log("  - GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "✓ Set" : "✗ Missing");
console.log("  - SUPABASE_URL:", process.env.SUPABASE_URL ? "✓ Set" : "✗ Missing");
console.log("  - SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "✓ Set" : "✗ Missing");

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("⚠️  SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env.local file");
  console.error("⚠️  Copy .env.example to .env.local and add your Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseKey);
// Service role client: bypasses RLS, use for server-side only (profile creation, scoped writes)
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase;

// Auth: decode JWT payload to read custom claim "role" (set by Custom Access Token Hook)
function decodeJwtPayload(token: string): { sub?: string; email?: string; role?: string } {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return {};
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    );
    return {
      sub: payload.sub,
      email: payload.email ?? payload.email_address,
      role: payload.role ?? payload.app_metadata?.role,
    };
  } catch {
    return {};
  }
}

export type AuthUser = { id: string; email?: string; role: string };

const APP_ROLES = ["admin", "school", "parent", "child"] as const;

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized", code: "auth_required" });
  }
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: "Invalid or expired token", code: "auth_invalid" });
  }
  const payload = decodeJwtPayload(token);
  const userId = String(user.id);
  let role: string = payload.role ?? "";
  if (!APP_ROLES.includes(role as any)) {
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", userId).single();
    if (profile?.role) {
      role = String(profile.role);
    } else {
      const { data: inserted, error: insertErr } = await supabaseAdmin.from("profiles").insert({
        id: userId,
        role: "parent",
        email: user.email ?? payload.email ?? null,
        full_name: (user as any).user_metadata?.full_name ?? (user as any).user_metadata?.name ?? payload.email?.split("@")[0] ?? null,
      }).select("role").single();
      if (insertErr?.code === "23505") {
        const { data: existing } = await supabaseAdmin.from("profiles").select("role").eq("id", userId).single();
        role = existing?.role ? String(existing.role) : "parent";
      } else {
        role = inserted?.role ? String(inserted.role) : "parent";
      }
    }
  }
  (req as express.Request & { user?: AuthUser }).user = {
    id: userId,
    email: user.email ?? payload.email,
    role,
  };
  next();
}

function requireRole(role: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as express.Request & { user?: AuthUser }).user;
    if (!user || user.role !== role) {
      return res.status(403).json({ error: "Forbidden", code: "role_required" });
    }
    next();
  };
}

function getAuthUser(req: express.Request): AuthUser | undefined {
  return (req as express.Request & { user?: AuthUser }).user;
}

// Resolve child_id for parent: from query, body, or header; ensure parent owns the child.
// If none provided, use the parent's first child (same as /api/profile) so calls always work.
async function resolveChildId(
  req: express.Request,
  parentId: string
): Promise<{ childId: number | null; error?: string }> {
  let childId =
    Number(req.query.child_id) ||
    Number((req as any).body?.child_id) ||
    Number(req.headers["x-child-id"]) ||
    null;
  if (childId == null || isNaN(childId)) {
    const { data: first } = await supabaseAdmin
      .from("child_profile")
      .select("id")
      .eq("parent_id", parentId)
      .limit(1)
      .maybeSingle();
    if (first?.id != null) {
      return { childId: first.id };
    }
    return { childId: null, error: "child_id required" };
  }
  const { data: row } = await supabaseAdmin
    .from("child_profile")
    .select("id")
    .eq("id", childId)
    .eq("parent_id", parentId)
    .single();
  if (!row) {
    return { childId: null, error: "Child not found or access denied" };
  }
  return { childId };
}

export const app = express();
app.use(express.json());

const PORT = 3000;

// AI Setup
let aiClient: GoogleGenAI | null = null;

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Multi-Agent System Setup
let agentOrchestrator: AgentOrchestrator | null = null;

function getAgentOrchestrator() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  if (!agentOrchestrator && FEATURE_FLAGS.USE_LANGCHAIN_AGENTS) {
    agentOrchestrator = new AgentOrchestrator(apiKey);
    console.log("🤖 Multi-Agent System Initialized");
    console.log("  - Safety Agent: ✓");
    console.log("  - Routing Agent: ✓");
    console.log("  - Specialist Agents: ✓");
  }
  return agentOrchestrator;
}

// --- AGENTS LOGIC ---

async function runGuardrails(userInput: string) {
  const ai = getAI();
  if (!ai) throw new Error("MISSING_API_KEY");
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a safety guardrail agent for a children's app. 
    Analyze the following message from a child. 
    If it contains harmful content, self-harm, bullying, or inappropriate topics, return "UNSAFE: [Reason]". 
    Otherwise, return "SAFE".
    
    Message: "${userInput}"`
  });
  
  return response.text.trim();
}

async function getConversationalResponse(userInput: string, history: any[], childId?: number | null) {
  const ai = getAI();
  if (!ai) throw new Error("MISSING_API_KEY");

  const q = supabaseAdmin.from("child_profile").select("*");
  const { data: profile } = childId != null
    ? await q.eq("id", childId).single()
    : await q.limit(1).single();

  const characterName = profile?.character_name || "Shelly";
  const characterType = profile?.character_type || "Turtle";
  const characterColor = profile?.color || "Emerald";
  const childName = profile?.child_name || "friend";

  const pastPatterns = await getMemoryPatterns();
  const patternRecall = pastPatterns.length > 0
    ? ` Past brave-moment patterns (use only for gentle recall; never quote the child): ${pastPatterns.join("; ")}. If relevant, you can say something like "You've tried brave things like this before."`
    : "";

  const systemInstruction = `You are ${characterName}, a warm and caring ${characterType} friend talking with ${childName}. Your color is ${characterColor}.

**Your personality:**
- You're a great listener who loves hearing what's on ${childName}'s mind
- You're calm, patient, and speak in a gentle, friendly voice
- You keep things simple and fun - perfect for ages 4-10
- You sometimes use ${characterType} comparisons to explain things

**How you talk:**
- Use SHORT responses (1-3 sentences max)
- Ask gentle questions to understand better: "Tell me more about that" or "How did that feel?"
- Listen more than you talk - let ${childName} lead the conversation
- Validate their feelings: "That makes sense" or "I can see why you feel that way"
- If they share something hard, offer ONE small brave idea, not a list
- Use simple, everyday words a kid would use with a friend

**Important:**
- Never lecture or give long advice
- Never break character as ${characterName} the ${characterType}
- If something seems unsafe, gently suggest: "Maybe a grown-up could help with this one?"
- Call them a "Brave Explorer" when they share something courageous
- Be warm and encouraging, like a trusted friend${patternRecall}`;

  const contents = history.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));
  contents.push({ role: 'user', parts: [{ text: userInput }] });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents,
    config: {
      systemInstruction
    }
  });

  return response.text;
}

async function getMemoryPatterns(): Promise<string[]> {
  const { data: row } = await supabaseAdmin.from("memory").select("value").eq("key", "situation_patterns").single();
  if (!row?.value) return [];
  try {
    const arr = JSON.parse(row.value);
    return Array.isArray(arr) ? arr.slice(-10) : [];
  } catch {
    return [];
  }
}

async function saveStructuredMemory(userMessage: string, modelResponse: string, _childId?: number | null) {
  const ai = getAI();
  if (!ai) return;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `From this exchange, extract ONE short situation pattern (e.g. "nervous about saying hi" or "friend conflict") and ONE courage category: social, performance, or repair. Do NOT quote the child. Return JSON only: { "pattern": "short phrase", "category": "social"|"performance"|"repair" }.
User: ${userMessage.slice(0, 200)}
Model: ${modelResponse.slice(0, 200)}`,
      config: { responseMimeType: "application/json" }
    });
    let text = response.text?.trim() || "{}";
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) text = objMatch[0];
    const { pattern, category } = JSON.parse(text);
    if (!pattern || typeof pattern !== "string") return;
    const patterns = await getMemoryPatterns();
    if (!patterns.includes(pattern)) patterns.push(pattern);
    await supabaseAdmin.from("memory").upsert({ child_id: null, key: "situation_patterns", value: JSON.stringify(patterns.slice(-20)) }, { onConflict: "key" });
  } catch (e) {
    console.error("Memory save failed:", e);
  }
}

async function generateParentReport(childId?: number | null) {
  const ai = getAI();
  if (!ai) throw new Error("MISSING_API_KEY");

  const q = supabaseAdmin.from("messages").select("*").order("timestamp", { ascending: false }).limit(50);
  const { data: recentMessages } = childId != null ? await q.eq("child_id", childId) : await q;
  
  const prompt = `You are a child development expert. Based on these recent chat logs between a child and an AI turtle (Brave Call app — small acts of courage), provide a WEEKLY summary for the parent. Do NOT quote or repeat specific things the child said. Keep it privacy-first: no transcripts, no emotional details, no incidents.
  1. A brief summary (1-2 sentences) of what the child explored or practiced this week — high level only.
  2. Courage categories: Estimate how many times this week the child practiced each type: Social courage (e.g. saying hi, sharing), Performance bravery (e.g. trying something new, speaking up), Repair courage (e.g. apologizing, making up). Return counts as: { "social": number, "performance": number, "repair": number }.
  3. One suggested dinner question for the parent to ask the child, e.g. "What was your favorite brave moment?" — short, warm, open-ended.
  4. 3 actionable suggestions for the parent (relationship/support).
  5. A brief safety assessment (one word or short phrase: e.g. Stable, Positive).
  6. 3 book recommendations (title, author, reason).
  7. 2 "Growth Moments" — positive behaviors or milestones (moment + description), no quotes from child.
  
  Logs (use only for pattern/category inference; do not quote or expose in output):
  ${JSON.stringify(recentMessages)}
  
  Return as JSON with keys: summary, courage_counts (object with social, performance, repair numbers), suggested_dinner_question (string), suggestions (array), safety_status, book_recommendations (array of {title, author, reason}), growth_moments (array of {moment, description}).`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          courage_counts: {
            type: Type.OBJECT,
            properties: {
              social: { type: Type.NUMBER },
              performance: { type: Type.NUMBER },
              repair: { type: Type.NUMBER }
            }
          },
          suggested_dinner_question: { type: Type.STRING },
          suggestions: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          safety_status: { type: Type.STRING },
          book_recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                author: { type: Type.STRING },
                reason: { type: Type.STRING }
              }
            }
          },
          growth_moments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                moment: { type: Type.STRING },
                description: { type: Type.STRING }
              }
            }
          }
        },
        required: ["summary", "courage_counts", "suggested_dinner_question", "suggestions", "safety_status", "book_recommendations", "growth_moments"]
      }
    }
  });
  
  return JSON.parse(response.text);
}

// Generate character avatar instantly (no API calls!)
function generateCharacterImage(name: string, type: string, color: string) {
  // Use instant SVG avatar generation - no waiting, no API costs!
  return generateCharacterAvatar(name, type, color);
}

// --- CONVERSATION ANALYSIS (for reporting & guiding the student) ---
export type CallAnalysisResult = {
  summary: string;
  issues: string[];
  suggestions: string[];
};

async function analyzeCallConversation(messages: { role: string; content: string }[]): Promise<CallAnalysisResult | null> {
  const ai = getAI();
  if (!ai || !messages.length) return null;
  const transcript = messages
    .map((m) => `${m.role === "user" ? "Child" : "Character"}: ${m.content}`)
    .join("\n");
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: `You are analyzing a short conversation between a child and a supportive character (e.g. a turtle friend) in a kids' app. The goal is to summarize the conversation, note any issues to report (safety, emotional distress, bullying, etc.), and suggest 1–3 simple "ideas for the child" to guide them (e.g. "Try telling a grown-up how you felt", "You could try one small brave thing tomorrow").

Conversation:
${transcript}

Respond with a JSON object only, no other text:
{
  "summary": "1–2 sentence kid-friendly summary of what they talked about",
  "issues": ["list", "of", "any", "concerns", "or", "empty", "array"],
  "suggestions": ["idea 1 for the child", "idea 2", "idea 3"]
}`,
    config: { responseMimeType: "application/json" },
  });
  const text = response.text?.trim() || "{}";
  const parsed = JSON.parse(text) as CallAnalysisResult;
  return {
    summary: parsed.summary || "",
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
  };
}

// --- BADGE LOGIC ---
const BADGE_DEFINITIONS = [
  { id: 'first_hello', name: 'First Hello', icon: '👋', description: 'You said hi to Shelly!' },
  { id: 'chatty_turtle', name: 'Chatty Turtle', icon: '🗣️', description: 'Sent 5 messages!' },
  { id: 'kind_soul', name: 'Kind Soul', icon: '💖', description: 'Used kind words!' },
  { id: 'curious_explorer', name: 'Curious Explorer', icon: '🔍', description: 'Asked a question!' },
];

async function checkAndAwardBadges(message: string, totalMessages: number, childId?: number | null) {
  const earned: any[] = [];

  // First Hello
  if (totalMessages === 1) {
    earned.push(BADGE_DEFINITIONS[0]);
  }

  // Chatty Turtle
  if (totalMessages === 5) {
    earned.push(BADGE_DEFINITIONS[1]);
  }

  // Kind words (simple check)
  const kindWords = ['please', 'thank you', 'love', 'happy', 'nice'];
  if (kindWords.some(word => message.toLowerCase().includes(word))) {
    const q = supabaseAdmin.from("badges").select("id").eq("id", "kind_soul");
    const { data: exists } = childId != null ? await q.eq("child_id", childId).single() : await q.limit(1).single();
    if (!exists) earned.push(BADGE_DEFINITIONS[2]);
  }

  // Question
  if (message.includes('?')) {
    const q = supabaseAdmin.from("badges").select("id").eq("id", "curious_explorer");
    const { data: exists } = childId != null ? await q.eq("child_id", childId).single() : await q.limit(1).single();
    if (!exists) earned.push(BADGE_DEFINITIONS[3]);
  }

  // Insert badges (PK is id only; badges remain global until schema has (child_id, id) unique)
  for (const badge of earned) {
    await supabaseAdmin
      .from("badges")
      .upsert({
        id: badge.id,
        name: badge.name,
        icon: badge.icon,
        description: badge.description,
      }, { onConflict: 'id' });
  }

  return earned;
}

// --- ROUTES ---

// Optional: ensure profile exists after signup (trigger creates it; this syncs email/name)
app.post("/api/auth/profile", requireAuth, async (req, res) => {
  const user = getAuthUser(req)!;
  const { data: existing } = await supabaseAdmin.from("profiles").select("id").eq("id", user.id).single();
  if (existing) return res.json({ ok: true });
  const { error } = await supabaseAdmin.from("profiles").insert({
    id: user.id,
    role: "parent",
    email: user.email,
    full_name: user.email?.split("@")[0],
  });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// Seed opening line for Brave Call when chat is empty (requires auth + child_id)
app.post("/api/chat/opening", requireAuth, async (req, res) => {
  const user = getAuthUser(req)!;
  const resolved = await resolveChildId(req, user.id);
  if (resolved.error || resolved.childId == null) {
    return res.status(400).json({ error: resolved.error ?? "child_id required" });
  }
  const childId = resolved.childId;
  try {
    const { data: existing } = await supabaseAdmin
      .from("messages")
      .select("id")
      .eq("child_id", childId)
      .limit(1);
    if (existing && existing.length > 0) return res.json({ ok: true, alreadyHadMessages: true });
    await supabaseAdmin
      .from("messages")
      .insert({ role: "model", content: "Hey… what happened?", child_id: childId });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Could not add opening" });
  }
});

app.post("/api/chat", requireAuth, async (req, res) => {
  const user = getAuthUser(req)!;
  const resolved = await resolveChildId(req, user.id);
  if (resolved.error || resolved.childId == null) {
    return res.status(400).json({ error: resolved.error ?? "child_id required" });
  }
  const childId = resolved.childId;
  const { message } = req.body;

  try {
    // === NEW: Multi-Agent System (when enabled) ===
    const orchestrator = getAgentOrchestrator();

    if (orchestrator && FEATURE_FLAGS.USE_LANGCHAIN_AGENTS) {
      console.log("🤖 Using Multi-Agent System");

      // Get profile for context
      const { data: profile } = await supabaseAdmin
        .from("child_profile")
        .select("*")
        .eq("id", childId)
        .single();

      // Get conversation history
      const { data: history } = await supabaseAdmin
        .from("messages")
        .select("role, content, timestamp")
        .eq("child_id", childId)
        .order("timestamp", { ascending: true })
        .limit(10);

      // Build context
      const context = {
        childName: profile?.child_name || "friend",
        characterName: profile?.character_name || "Shelly",
        characterType: profile?.character_type || "Turtle",
        recentMessages: (history || []).map(m => ({
          role: m.role as 'user' | 'model',
          content: m.content,
          timestamp: m.timestamp
        })),
        childAge: profile?.child_age
      };

      // Process with agents
      const result = await orchestrator.processMessage(message, context);

      if (!result.success) {
        throw new Error(result.error || "Agent processing failed");
      }

      const response = result.response!.content;

      // Save messages
      await supabaseAdmin.from("messages").insert({ role: 'user', content: message, child_id: childId });
      await supabaseAdmin.from("messages").insert({ role: 'model', content: response, child_id: childId });

      // Update points and badges (same as before)
      const pointsPerMessage = 10;
      if (profile) {
        const newPoints = profile.points + pointsPerMessage;
        const nextLevelPoints = profile.level * 100;
        const newLevel = newPoints >= nextLevelPoints ? profile.level + 1 : profile.level;

        await supabaseAdmin
          .from("child_profile")
          .update({ points: newPoints, level: newLevel })
          .eq("id", profile.id);
      }

      const { count } = await supabaseAdmin
        .from("messages")
        .select("*", { count: 'exact', head: true })
        .eq("role", "user")
        .eq("child_id", childId);

      const totalMessages = count || 0;
      const newBadges = await checkAndAwardBadges(message, totalMessages, childId);

      const { data: updatedProfile } = await supabaseAdmin
        .from("child_profile")
        .select("*")
        .eq("id", childId)
        .single();

      return res.json({
        response,
        safe: result.safetyCheck?.safe !== false,
        newBadges,
        updatedProfile,
        agentUsed: result.routing?.agent || 'safety',
        metadata: result.response.metadata
      });
    }

    // === OLD: Original logic (fallback) ===
    console.log("📝 Using original chat logic");

    // 1. Guardrails
    const safetyCheck = await runGuardrails(message);
    if (safetyCheck.startsWith("UNSAFE")) {
      await supabaseAdmin.from("messages").insert({ role: 'user', content: message, child_id: childId });
      const warning = "Oh, my little friend! Let's talk about something happy and kind instead. How about we talk about your favorite animal?";
      await supabaseAdmin.from("messages").insert({ role: 'model', content: warning, child_id: childId });
      return res.json({ response: warning, safe: false });
    }

    // 2. Get History
    const { data: history } = await supabaseAdmin
      .from("messages")
      .select("role, content")
      .order("timestamp", { ascending: true })
      .limit(10);

    // 3. Conversational Agent
    const response = await getConversationalResponse(message, history || [], childId);

    // 4. Save to DB
    await supabaseAdmin.from("messages").insert({ role: 'user', content: message, child_id: childId });
    await supabaseAdmin.from("messages").insert({ role: 'model', content: response, child_id: childId });

    // 4b. Store structured memory (pattern only, no quotes)
    saveStructuredMemory(message, response, childId).catch(() => {});

    // 5. Update Points and Level
    const pointsPerMessage = 10;

    const { data: profile } = await supabaseAdmin
      .from("child_profile")
      .select("*")
      .eq("id", childId)
      .single();

    if (profile) {
      const newPoints = profile.points + pointsPerMessage;
      const nextLevelPoints = profile.level * 100;
      const newLevel = newPoints >= nextLevelPoints ? profile.level + 1 : profile.level;

      await supabaseAdmin
        .from("child_profile")
        .update({ points: newPoints, level: newLevel })
        .eq("id", profile.id);
    }

    // 6. Check badges
    const { count } = await supabaseAdmin
      .from("messages")
      .select("*", { count: 'exact', head: true })
      .eq("role", "user")
      .eq("child_id", childId);

    const totalMessages = count || 0;
    const newBadges = await checkAndAwardBadges(message, totalMessages, childId);

    const { data: updatedProfile } = await supabaseAdmin
      .from("child_profile")
      .select("*")
      .eq("id", childId)
      .single();

    res.json({ response, safe: true, newBadges, updatedProfile });
  } catch (error: any) {
    if (error.message === "MISSING_API_KEY") {
      return res.status(401).json({
        error: "Shelly needs her magic key! Please set your GEMINI_API_KEY in the Secrets panel.",
        isConfigError: true
      });
    }
    console.error(error);
    res.status(500).json({ error: "Shelly is taking a nap. Try again soon!" });
  }
});

app.get("/api/parent/report", requireAuth, async (req, res) => {
  const user = getAuthUser(req)!;
  const resolved = await resolveChildId(req, user.id);
  const childId = resolved.childId;
  try {
    const q = supabaseAdmin.from("parent_reports").select("*").order("timestamp", { ascending: false }).limit(1);
    const { data: existing } = childId != null ? await q.eq("child_id", childId).single() : await q.single();

    if (existing) {
      return res.json({
        ...existing,
        suggestions: existing.suggestions || [],
        book_recommendations: existing.book_recommendations || [],
        growth_moments: existing.growth_moments || [],
        courage_counts: existing.courage_counts || { social: 0, performance: 0, repair: 0 },
        suggested_dinner_question: existing.suggested_dinner_question || ""
      });
    }

    const report = await generateParentReport(childId ?? undefined);

    await supabaseAdmin
      .from("parent_reports")
      .insert({
        summary: report.summary,
        suggestions: report.suggestions,
        safety_status: report.safety_status,
        book_recommendations: report.book_recommendations,
        growth_moments: report.growth_moments,
        courage_counts: report.courage_counts || { social: 0, performance: 0, repair: 0 },
        suggested_dinner_question: report.suggested_dinner_question || "",
        ...(childId != null && { child_id: childId }),
      });

    res.json(report);
  } catch (error: any) {
    if (error.message === "MISSING_API_KEY") {
      return res.status(401).json({ error: "API Key missing", isConfigError: true });
    }
    console.error("Report error:", error);
    res.status(500).json({ error: "Could not generate report" });
  }
});

app.get("/api/messages", requireAuth, async (req, res) => {
  const user = getAuthUser(req)!;
  const resolved = await resolveChildId(req, user.id);
  if (resolved.error || resolved.childId == null) {
    return res.status(400).json({ error: resolved.error ?? "child_id required" });
  }
  const { data: messages } = await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("child_id", resolved.childId)
    .order("timestamp", { ascending: true });
  res.json(messages || []);
});

app.post("/api/call/analyze", requireAuth, async (req, res) => {
  try {
    const messages = req.body?.messages as { role: string; content: string }[] | undefined;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array required" });
    }
    const analysis = await analyzeCallConversation(messages);
    if (!analysis) {
      return res.status(503).json({ error: "Analysis not available" });
    }
    res.json(analysis);
  } catch (e: any) {
    console.error("Call analysis error:", e);
    res.status(500).json({ error: e.message || "Analysis failed" });
  }
});

app.get("/api/badges", requireAuth, async (req, res) => {
  const user = getAuthUser(req)!;
  const resolved = await resolveChildId(req, user.id);
  const { data: badges } = resolved.childId != null
    ? await supabaseAdmin.from("badges").select("*").eq("child_id", resolved.childId)
    : await supabaseAdmin.from("badges").select("*");
  res.json(badges || []);
});

app.get("/api/profile", requireAuth, async (req, res) => {
  const user = getAuthUser(req)!;
  const resolved = await resolveChildId(req, user.id);
  if (resolved.childId != null) {
    const { data: profile } = await supabaseAdmin
      .from("child_profile")
      .select("*")
      .eq("id", resolved.childId)
      .single();
    return res.json(profile ?? null);
  }
  const { data: rows } = await supabaseAdmin
    .from("child_profile")
    .select("*")
    .eq("parent_id", user.id)
    .limit(1);
  res.json(rows?.[0] ?? null);
});

function generateAccessCode(): string {
  return String(1000 + Math.floor(Math.random() * 9000));
}

app.post("/api/profile", requireAuth, async (req, res) => {
  const user = getAuthUser(req)!;
  const { parent_contact, child_name, child_age, character_name, character_type, color } = req.body;

  try {
    const charName = character_name || 'Shelly';
    const charType = character_type || 'Turtle';
    const charColor = color || 'Emerald';
    const imageData = generateCharacterImage(charName, charType, charColor);
    const access_code = generateAccessCode();

    const { data: newProfile } = await supabaseAdmin
      .from("child_profile")
      .insert({
        parent_id: user.id,
        parent_contact: parent_contact ?? user.email,
        child_name,
        child_age,
        character_name: charName,
        character_type: charType,
        color: charColor,
        image_data: imageData,
        access_code,
        access_allowed: true
      })
      .select()
      .single();

    res.json(newProfile);
  } catch (error) {
    console.error("Profile creation error:", error);
    res.status(500).json({ error: "Failed to create profile" });
  }
});

app.put("/api/profile", requireAuth, async (req, res) => {
  const user = getAuthUser(req)!;
  const resolved = await resolveChildId(req, user.id);
  if (resolved.error || resolved.childId == null) {
    return res.status(400).json({ error: resolved.error ?? "child_id required" });
  }
  const childId = resolved.childId;
  const { points, character_name, character_type, color, image_data, access_code, access_allowed } = req.body;

  try {
    const updates: Record<string, unknown> = {};
    if (typeof points === "number") updates.points = points;
    if (character_name != null) updates.character_name = character_name;
    if (character_type != null) updates.character_type = character_type;
    if (color != null) updates.color = color;
    if (image_data != null) updates.image_data = image_data;
    if (access_code !== undefined) updates.access_code = access_code === "" ? null : String(access_code);
    if (typeof access_allowed === "boolean") updates.access_allowed = access_allowed;

    if (Object.keys(updates).length === 0) {
      const { data: profile } = await supabaseAdmin.from("child_profile").select("*").eq("id", childId).single();
      return res.json(profile ?? null);
    }

    const { data: updated } = await supabaseAdmin
      .from("child_profile")
      .update(updates)
      .eq("id", childId)
      .eq("parent_id", user.id)
      .select()
      .single();

    if (!updated) return res.status(404).json({ error: "Child not found" });
    res.json(updated);
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

app.post("/api/child/verify", requireAuth, async (req, res) => {
  const user = getAuthUser(req)!;
  const { code } = req.body;
  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Code required" });
  }
  const trimmed = String(code).trim().replace(/\s/g, "");
  const { data: child } = await supabaseAdmin
    .from("child_profile")
    .select("id")
    .eq("parent_id", user.id)
    .eq("access_code", trimmed)
    .eq("access_allowed", true)
    .maybeSingle();

  if (!child) {
    return res.status(401).json({ error: "Invalid code or access not allowed" });
  }
  res.json({ child_id: child.id });
});

// Get predefined character options
app.get("/api/characters", (req, res) => {
  const characters = [
    { name: 'Shelly', type: 'Turtle', color: 'Emerald', description: 'A wise and gentle turtle' },
    { name: 'Splash', type: 'Dolphin', color: 'Ocean', description: 'A playful and smart dolphin' },
    { name: 'Snippy', type: 'Crab', color: 'Sunset', description: 'A friendly and brave crab' },
    { name: 'Hoppy', type: 'Bunny', color: 'Mint', description: 'A cheerful and energetic bunny' },
    { name: 'Felix', type: 'Fox', color: 'Sunset', description: 'A clever and kind fox' },
    { name: 'Hoot', type: 'Owl', color: 'Purple', description: 'A wise and thoughtful owl' },
  ];

  // Generate preview images for each character
  const charactersWithImages = characters.map(char => ({
    ...char,
    preview: generateCharacterImage(char.name, char.type, char.color)
  }));

  res.json(charactersWithImages);
});

app.get("/api/missions", requireAuth, async (req, res) => {
  const user = getAuthUser(req)!;
  const resolved = await resolveChildId(req, user.id);
  const childId = resolved.childId;
  const fallbackMissions = [
    { id: 1, title: "Say Hello", description: "Say hi to your friend!", difficulty: "easy", points: 20, completed: false },
    { id: 2, title: "Kind Words", description: "Use a kind word like 'please' or 'thank you'.", difficulty: "medium", points: 35, completed: false },
    { id: 3, title: "Curious Turtle", description: "Ask a question about the ocean.", difficulty: "stretch", points: 50, completed: false },
  ];

  try {
    const q = supabaseAdmin.from("messages").select("role, content").order("timestamp", { ascending: false }).limit(10);
    const { data: recentMessages } = childId != null ? await q.eq("child_id", childId) : await q;
    if (!recentMessages || recentMessages.length === 0) return res.json(fallbackMissions);

    const ai = getAI();
    if (!ai) return res.json(fallbackMissions);

    const prompt = `Based on this short conversation between a child and a Brave Call turtle (helping with small brave moves), suggest exactly 3 "brave missions" the child could try now. One EASY, one MEDIUM, one STRETCH. Keep each mission one sentence, specific to the situation. Return JSON array of 3 objects: { "title": string, "description": string, "difficulty": "easy"|"medium"|"stretch" }. No other text.
Conversation:
${JSON.stringify(recentMessages)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    let text = response.text?.trim() || "[]";
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) text = arrayMatch[0];
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed) ? parsed.slice(0, 3) : [];
    const pointsByDifficulty: Record<string, number> = { easy: 20, medium: 35, stretch: 50 };
    const missions = list.map((m: any, i: number) => ({
      id: i + 1,
      title: m.title || fallbackMissions[i].title,
      description: m.description || fallbackMissions[i].description,
      difficulty: m.difficulty || ["easy", "medium", "stretch"][i],
      points: pointsByDifficulty[m.difficulty] || pointsByDifficulty["medium"],
      completed: false,
    }));
    if (missions.length < 3) {
      while (missions.length < 3) missions.push(fallbackMissions[missions.length]);
    }
    res.json(missions);
  } catch (e) {
    console.error("Missions generation failed:", e);
    res.json(fallbackMissions);
  }
});

app.get("/api/parent/requests", requireAuth, async (req, res) => {
  const user = getAuthUser(req)!;
  const childIds = (await supabaseAdmin.from("child_profile").select("id").eq("parent_id", user.id)).data?.map((c: { id: number }) => c.id) ?? [];
  if (childIds.length === 0) return res.json([]);
  const { data: requests } = await supabaseAdmin
    .from("child_requests")
    .select("*")
    .eq("status", "pending")
    .in("child_id", childIds);
  res.json(requests || []);
});

app.post("/api/parent/requests/:id", requireAuth, async (req, res) => {
  const user = getAuthUser(req)!;
  const { id } = req.params;
  const { status } = req.body;
  const childIds = (await supabaseAdmin.from("child_profile").select("id").eq("parent_id", user.id)).data?.map((c: { id: number }) => c.id) ?? [];
  const { data: reqRow } = await supabaseAdmin.from("child_requests").select("child_id").eq("id", id).single();
  if (!reqRow || !childIds.includes(reqRow.child_id)) return res.status(404).json({ error: "Request not found" });
  await supabaseAdmin.from("child_requests").update({ status }).eq("id", id);
  res.json({ success: true });
});

app.get("/api/parent/children", requireAuth, async (req, res) => {
  const user = getAuthUser(req)!;
  const { data: children } = await supabaseAdmin
    .from("child_profile")
    .select("id, child_name, child_age, level, points, image_data")
    .eq("parent_id", user.id);
  res.json(children || []);
});

app.post("/api/parent/children", requireAuth, async (req, res) => {
  const user = getAuthUser(req)!;
  const { child_name, child_age, character_name, character_type, color } = req.body;
  if (!child_name || child_age == null) {
    return res.status(400).json({ error: "child_name and child_age required" });
  }
  const charName = character_name || "Shelly";
  const charType = character_type || "Turtle";
  const charColor = color || "Emerald";
  const imageData = generateCharacterImage(charName, charType, charColor);
  const { data: newProfile, error } = await supabaseAdmin
    .from("child_profile")
    .insert({
      parent_id: user.id,
      parent_contact: user.email ?? "",
      child_name,
      child_age: Number(child_age),
      character_name: charName,
      character_type: charType,
      color: charColor,
      image_data: imageData,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(newProfile);
});

app.get("/api/admin/users", requireAuth, requireRole("admin"), async (req, res) => {
  const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return res.status(500).json({ error: error.message });
  const { data: profiles } = await supabaseAdmin.from("profiles").select("id, role, email, full_name");
  const byId = (profiles ?? []).reduce((acc: Record<string, { role: string; email?: string; full_name?: string }>, p: any) => {
    acc[p.id] = { role: p.role, email: p.email, full_name: p.full_name };
    return acc;
  }, {});
  const list = (users?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    ...byId[u.id],
  }));
  res.json(list);
});

app.patch("/api/admin/users/:id/role", requireAuth, requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!role || !["admin", "school", "parent", "child"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  const { error } = await supabaseAdmin.rpc("set_user_role", { target_user_id: id, new_role: role });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Vite Middleware
if (process.env.NODE_ENV !== "production") {
  createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  }).then((vite) => {
    app.use(vite.middlewares);
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
} else {
  app.use(express.static("dist"));
  // SPA fallback: serve index.html for non-API routes so client router works on refresh
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
