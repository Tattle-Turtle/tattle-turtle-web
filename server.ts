import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const db = new Database("shelly.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT CHECK(role IN ('user', 'model', 'system')),
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS badges (
    id TEXT PRIMARY KEY,
    name TEXT,
    icon TEXT,
    description TEXT,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS child_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_contact TEXT,
    child_name TEXT,
    child_age INTEGER,
    character_name TEXT DEFAULT 'Shelly',
    character_type TEXT DEFAULT 'Turtle',
    color TEXT DEFAULT 'Emerald',
    level INTEGER DEFAULT 1,
    points INTEGER DEFAULT 0,
    image_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS child_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER,
    request_type TEXT,
    request_text TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS parent_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    summary TEXT,
    suggestions TEXT,
    safety_status TEXT,
    book_recommendations TEXT,
    growth_moments TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS memory (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Migration: Ensure columns exist
try {
  db.exec("ALTER TABLE child_profile ADD COLUMN parent_contact TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE parent_reports ADD COLUMN book_recommendations TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE parent_reports ADD COLUMN growth_moments TEXT;");
} catch (e) {}

const app = express();
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

async function getConversationalResponse(userInput: string, history: any[]) {
  const ai = getAI();
  if (!ai) throw new Error("MISSING_API_KEY");

  const profile = db.prepare("SELECT * FROM child_profile LIMIT 1").get();
  const characterName = profile?.character_name || "Shelly";
  const characterType = profile?.character_type || "Turtle";
  const characterColor = profile?.color || "Emerald";
  const childName = profile?.child_name || "friend";

  const systemInstruction = `You are ${characterName}, a super friendly, wise, and gentle ${characterType}. 
  Your color is ${characterColor}. 
  You are talking to ${childName}. 
  You love helping kids learn and feel happy. Keep your language simple, encouraging, and safe for children aged 4-10. 
  Use metaphors related to being a ${characterType} occasionally. Never break character. 
  If a child asks something unsafe, gently redirect them to a positive topic.`;

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

async function generateParentReport() {
  const ai = getAI();
  if (!ai) throw new Error("MISSING_API_KEY");
  const recentMessages = db.prepare("SELECT * FROM messages ORDER BY timestamp DESC LIMIT 50").all();
  
  const prompt = `You are a child development expert. Based on these recent chat logs between a child and an AI turtle, provide:
  1. A brief summary of what the child is interested in or feeling.
  2. 3 actionable suggestions for the parent to improve their relationship or support the child's current interests.
  3. A safety assessment.
  4. 3 book recommendations for the child based on their current interests.
  5. 2 "Growth Moments" - specific positive behaviors or milestones observed in the chat.
  
  Logs:
  ${JSON.stringify(recentMessages)}
  
  Return as JSON with keys: summary, suggestions (array), safety_status, book_recommendations (array of {title, author, reason}), growth_moments (array of {moment, description}).`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
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
        required: ["summary", "suggestions", "safety_status", "book_recommendations", "growth_moments"]
      }
    }
  });
  
  return JSON.parse(response.text);
}

async function generateCharacterImage(name: string, type: string, color: string) {
  const ai = getAI();
  if (!ai) throw new Error("MISSING_API_KEY");

  const prompt = `A super friendly, cute, and colorful 3D animated style character portrait of a ${color} ${type} named ${name}. 
  The character should look happy, kind, and perfect for a children's app. 
  Solid soft background. High quality, Pixar-style rendering.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}

// --- BADGE LOGIC ---
const BADGE_DEFINITIONS = [
  { id: 'first_hello', name: 'First Hello', icon: '👋', description: 'You said hi to Shelly!' },
  { id: 'chatty_turtle', name: 'Chatty Turtle', icon: '🗣️', description: 'Sent 5 messages!' },
  { id: 'kind_soul', name: 'Kind Soul', icon: '💖', description: 'Used kind words!' },
  { id: 'curious_explorer', name: 'Curious Explorer', icon: '🔍', description: 'Asked a question!' },
];

function checkAndAwardBadges(message: string, totalMessages: number) {
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
    const exists = db.prepare("SELECT id FROM badges WHERE id = 'kind_soul'").get();
    if (!exists) earned.push(BADGE_DEFINITIONS[2]);
  }

  // Question
  if (message.includes('?')) {
    const exists = db.prepare("SELECT id FROM badges WHERE id = 'curious_explorer'").get();
    if (!exists) earned.push(BADGE_DEFINITIONS[3]);
  }

  earned.forEach(badge => {
    db.prepare("INSERT OR IGNORE INTO badges (id, name, icon, description) VALUES (?, ?, ?, ?)").run(badge.id, badge.name, badge.icon, badge.description);
  });

  return earned;
}

// --- ROUTES ---

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  try {
    // 1. Guardrails
    const safetyCheck = await runGuardrails(message);
    if (safetyCheck.startsWith("UNSAFE")) {
      db.prepare("INSERT INTO messages (role, content) VALUES (?, ?)").run('user', message);
      const warning = "Oh, my little friend! Let's talk about something happy and kind instead. How about we talk about your favorite animal?";
      db.prepare("INSERT INTO messages (role, content) VALUES (?, ?)").run('model', warning);
      return res.json({ response: warning, safe: false });
    }

    // 2. Get History
    const history = db.prepare("SELECT role, content FROM messages ORDER BY timestamp ASC LIMIT 10").all();

    // 3. Conversational Agent
    const response = await getConversationalResponse(message, history);

    // 4. Save to DB
    db.prepare("INSERT INTO messages (role, content) VALUES (?, ?)").run('user', message);
    db.prepare("INSERT INTO messages (role, content) VALUES (?, ?)").run('model', response);

    // 5. Update Points and Level
    const pointsPerMessage = 10;
    db.prepare("UPDATE child_profile SET points = points + ?").run(pointsPerMessage);
    
    const profile = db.prepare("SELECT * FROM child_profile LIMIT 1").get();
    if (profile) {
      const nextLevelPoints = profile.level * 100;
      if (profile.points >= nextLevelPoints) {
        db.prepare("UPDATE child_profile SET level = level + 1").run();
      }
    }

    const totalMessages = db.prepare("SELECT COUNT(*) as count FROM messages WHERE role = 'user'").get().count;
    const newBadges = checkAndAwardBadges(message, totalMessages);

    res.json({ response, safe: true, newBadges, updatedProfile: db.prepare("SELECT * FROM child_profile LIMIT 1").get() });
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

app.get("/api/parent/report", async (req, res) => {
  try {
    // Try to get existing report first
    const existing = db.prepare("SELECT * FROM parent_reports ORDER BY timestamp DESC LIMIT 1").get() as any;
    
    if (existing) {
      return res.json({
        ...existing,
        suggestions: JSON.parse(existing.suggestions || '[]'),
        book_recommendations: JSON.parse(existing.book_recommendations || '[]'),
        growth_moments: JSON.parse(existing.growth_moments || '[]')
      });
    }

    // If no report, generate one
    const report = await generateParentReport();
    
    // Save it
    db.prepare(`
      INSERT INTO parent_reports (summary, suggestions, safety_status, book_recommendations, growth_moments)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      report.summary,
      JSON.stringify(report.suggestions),
      report.safety_status,
      JSON.stringify(report.book_recommendations),
      JSON.stringify(report.growth_moments)
    );

    res.json(report);
  } catch (error: any) {
    if (error.message === "MISSING_API_KEY") {
      return res.status(401).json({ error: "API Key missing", isConfigError: true });
    }
    console.error("Report error:", error);
    res.status(500).json({ error: "Could not generate report" });
  }
});

app.get("/api/messages", (req, res) => {
  const messages = db.prepare("SELECT * FROM messages ORDER BY timestamp ASC").all();
  res.json(messages);
});

app.get("/api/badges", (req, res) => {
  const badges = db.prepare("SELECT * FROM badges").all();
  res.json(badges);
});

app.get("/api/profile", (req, res) => {
  const profile = db.prepare("SELECT * FROM child_profile LIMIT 1").get();
  res.json(profile || null);
});

app.post("/api/profile", async (req, res) => {
  const { parent_contact, child_name, child_age, character_name, character_type, color } = req.body;
  
  try {
    const charName = character_name || 'Shelly';
    const charType = character_type || 'Turtle';
    const charColor = color || 'Emerald';
    
    const imageData = await generateCharacterImage(charName, charType, charColor);
    
    db.prepare("DELETE FROM child_profile").run();
    db.prepare("INSERT INTO child_profile (parent_contact, child_name, child_age, character_name, character_type, color, image_data) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      parent_contact, child_name, child_age, charName, charType, charColor, imageData
    );
    
    res.json(db.prepare("SELECT * FROM child_profile LIMIT 1").get());
  } catch (error) {
    console.error(error);
    db.prepare("DELETE FROM child_profile").run();
    db.prepare("INSERT INTO child_profile (parent_contact, child_name, child_age, character_name, character_type, color) VALUES (?, ?, ?, ?, ?, ?)").run(
      parent_contact, child_name, child_age, character_name || 'Shelly', character_type || 'Turtle', color || 'Emerald'
    );
    res.json(db.prepare("SELECT * FROM child_profile LIMIT 1").get());
  }
});

app.get("/api/missions", (req, res) => {
  const missions = [
    { id: 1, title: "Say Hello", description: "Say hi to your friend!", points: 20, completed: false },
    { id: 2, title: "Kind Words", description: "Use a kind word like 'please' or 'thank you'.", points: 30, completed: false },
    { id: 3, title: "Curious Turtle", description: "Ask a question about the ocean.", points: 50, completed: false },
  ];
  res.json(missions);
});

app.get("/api/parent/requests", (req, res) => {
  const requests = db.prepare("SELECT * FROM child_requests WHERE status = 'pending'").all();
  res.json(requests);
});

app.post("/api/parent/requests/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // approved or rejected
  db.prepare("UPDATE child_requests SET status = ? WHERE id = ?").run(status, id);
  res.json({ success: true });
});

app.get("/api/parent/children", (req, res) => {
  const children = db.prepare("SELECT id, child_name, child_age, level, points, image_data FROM child_profile").all();
  res.json(children);
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
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
