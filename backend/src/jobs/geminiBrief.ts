import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DesignBrief } from '../types/genesis.js';

export interface CadIntent {
  motorCount: 3 | 4 | 6 | 8;
  applicationHint?: DesignBrief['application'];
  ducted?: boolean;
  landingGear?: boolean;
  notesSummary?: string;
}

/**
 * Gemini turns free-text mission notes into structured CAD intent.
 * It does NOT write Blender Python to paste into the console (unsafe / brittle).
 * Your own GEMINI_API_KEY must be set in backend/.env — never share keys in chat.
 */
export async function interpretBriefWithGemini(brief: DesignBrief): Promise<CadIntent | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  });

  const prompt = `You convert a drone design brief into JSON CAD intent for a parametric Blender generator.
Return ONLY valid JSON, no markdown, shape:
{"motorCount":4|6|8,"applicationHint":"racing"|"freestyle"|"cinema"|"long-range"|"heavy-lift"|"industrial","ducted":boolean,"landingGear":boolean,"notesSummary":"short"}

Brief:
application=${brief.application}
payloadG=${brief.payloadG}
flightTimeMin=${brief.flightTimeMin}
budgetInr=${brief.budgetInr}
material=${brief.material}
manufacturing=${brief.manufacturing}
notes=${brief.notes || ''}

Rules:
- octa/octo/agricultural/spray → motorCount 8, applicationHint industrial
- hexa/heavy lift/cargo → motorCount 6, applicationHint heavy-lift
- whoop/duct/cine indoor → ducted true
- cinema/long-range/industrial/heavy-lift → landingGear true unless racing`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end < 0) return null;
    const parsed = JSON.parse(text.slice(start, end + 1)) as CadIntent;
    const mc = Number(parsed.motorCount);
    if (![3, 4, 6, 8].includes(mc)) return null;
    return {
      motorCount: mc as CadIntent['motorCount'],
      applicationHint: parsed.applicationHint,
      ducted: !!parsed.ducted,
      landingGear: parsed.landingGear !== false,
      notesSummary: parsed.notesSummary,
    };
  } catch (err) {
    console.warn('Gemini brief interpret failed, using local planner only:', (err as Error)?.message);
    return null;
  }
}
