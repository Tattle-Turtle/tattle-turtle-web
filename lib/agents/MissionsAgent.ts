/**
 * Missions Agent
 * Generates 3 brave missions with steps from a conversation (post-call).
 */

import { BaseAgent } from './BaseAgent';
import { ConversationContext } from './types';

export interface MissionSpec {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'stretch';
  points: number;
  steps: string[];
}

const POINTS_BY_DIFFICULTY: Record<string, number> = {
  easy: 20,
  medium: 35,
  stretch: 50,
};

const FALLBACK_MISSIONS: MissionSpec[] = [
  { title: 'Say Hello', description: 'Say hi to your friend!', difficulty: 'easy', points: 20, steps: ['Say hi to someone', 'Smile when you say it'] },
  { title: 'Kind Words', description: "Use a kind word like 'please' or 'thank you'.", difficulty: 'medium', points: 35, steps: ['Pick one kind word', 'Use it with someone today'] },
  { title: 'Curious Turtle', description: 'Ask a question about something you wonder about.', difficulty: 'stretch', points: 50, steps: ['Think of one question', 'Ask a grown-up or friend'] },
];

export class MissionsAgent extends BaseAgent {
  constructor(apiKey: string) {
    super('missions', apiKey);
  }

  /**
   * Generate exactly 3 missions with steps from a conversation.
   * Used after a call ends (when no serious concern) to create Feed Tammy missions.
   */
  async generateMissions(
    messages: Array<{ role: string; content: string }>,
    context?: ConversationContext
  ): Promise<MissionSpec[]> {
    if (!messages || messages.length === 0) {
      return FALLBACK_MISSIONS;
    }

    const prompt = `Based on this conversation between a child and their brave friend, create exactly 3 brave missions. Each mission must have "title", "description", "difficulty" ("easy"|"medium"|"stretch"), and "steps" (array of 2-4 short actionable step strings). One easy, one medium, one stretch. Tailor to what the child talked about. Return only a JSON array of 3 objects, no other text.

Conversation:
${JSON.stringify(messages)}

Example format:
[{"title":"Finish homework first","description":"Get your homework done before screen time.","difficulty":"easy","steps":["Find your homework","Set a 10-minute timer","Do one page"]},{"title":"One non-screen activity","description":"Do something fun without a screen.","difficulty":"medium","steps":["Pick an activity","Do it for 5 minutes"]},{"title":"Tell a grown-up one win","description":"Share something you did well today.","difficulty":"stretch","steps":["Think of one thing you did well","Tell your grown-up"]}]`;

    try {
      const response = await this.process(prompt, context);
      const content = response.content;
      const cleaned = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
      const jsonStr = arrayMatch ? arrayMatch[0] : cleaned;
      const parsed = JSON.parse(jsonStr) as unknown;

      if (!Array.isArray(parsed) || parsed.length === 0) {
        return FALLBACK_MISSIONS;
      }

      const missions: MissionSpec[] = parsed.slice(0, 3).map((m: any, i: number) => {
        const difficulty = ['easy', 'medium', 'stretch'].includes(m?.difficulty) ? m.difficulty : (['easy', 'medium', 'stretch'] as const)[i];
        const steps = Array.isArray(m?.steps) ? m.steps.filter((s: unknown) => typeof s === 'string').slice(0, 4) : [];
        if (steps.length === 0) steps.push('Give it a try!');
        return {
          title: typeof m?.title === 'string' && m.title.trim() ? m.title.trim() : FALLBACK_MISSIONS[i].title,
          description: typeof m?.description === 'string' ? m.description.trim() : FALLBACK_MISSIONS[i].description,
          difficulty,
          points: typeof m?.points === 'number' ? m.points : POINTS_BY_DIFFICULTY[difficulty] ?? 35,
          steps,
        };
      });

      while (missions.length < 3) {
        missions.push(FALLBACK_MISSIONS[missions.length]);
      }
      return missions;
    } catch (error) {
      console.error('[MissionsAgent] generateMissions failed:', error);
      return FALLBACK_MISSIONS;
    }
  }
}
