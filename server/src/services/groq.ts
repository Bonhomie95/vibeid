import { config } from '../config/env';
import { ARCHETYPES, archetypeById, archetypeNames } from '../data/archetypes';

export interface Classification {
  primaryArchetype: string;
  secondaryArchetype: string | null;
  confidence: number;
  reasoning: string;
  essenceWords: string[];
  palette: string[];
}

const SYSTEM_PROMPT = `You are a cultural aesthetic classifier for the Vibe ID app. You analyze visual cues in a user-submitted selfie or photo to assign that person to ONE of a fixed set of named aesthetic archetypes.

Be generous, specific, and emotionally resonant. NEVER assign anything that could feel insulting, body-shaming, age-shaming, or negative. Every result should feel aspirational or affirming — like a horoscope that is somehow correct.

Analyze visual cues such as:
- facial expression, mood, energy
- apparent coloring (skin undertone, hair, eyes are clues for palette only — never a basis for stereotyping)
- visible clothing styles, fabrics, accessories
- background environment, lighting, time of day
- overall composition and styling intent of the photo

Pick the SINGLE best archetype, plus a thoughtful secondary archetype.

You MUST respond with ONLY valid minified JSON (no markdown fences, no preamble) of shape:
{"primary_archetype":"<id>","secondary_archetype":"<id>","confidence":0.0-1.0,"reasoning":"2-3 sentences in second person ('You ...')","essence_words":["word","word","word"],"color_palette":["#hex","#hex","#hex"]}

The primary_archetype and secondary_archetype values MUST be ids from the archetype list provided. The reasoning must address the user directly and feel personal, warm, and slightly poetic — not clinical.`;

function buildArchetypeMenu(): string {
  return ARCHETYPES.map(
    (a) =>
      `- ${a.id}: ${a.name} — ${a.description} signals: ${a.signals.join(', ')}.`
  ).join('\n');
}

function deterministicMockArchetype(seed: string): Classification {
  // Stable archetype assignment for tests / offline mode.
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const a = ARCHETYPES[h % ARCHETYPES.length];
  const b = ARCHETYPES[(h * 7 + 3) % ARCHETYPES.length];
  return {
    primaryArchetype: a.id,
    secondaryArchetype: b.id === a.id ? ARCHETYPES[(h + 1) % ARCHETYPES.length].id : b.id,
    confidence: 0.78,
    reasoning: `You carry the ${a.name} energy clearly — ${a.description.toLowerCase()} There is also a hint of ${b.name} in the way you compose yourself.`,
    essenceWords: [...a.essence],
    palette: [...a.palette].slice(0, 4),
  };
}

interface GroqResponseChoiceMessage {
  content?: string | { type: string; text?: string }[];
}
interface GroqResponse {
  choices?: { message?: GroqResponseChoiceMessage }[];
  error?: { message?: string };
}

function extractText(msg: GroqResponseChoiceMessage | undefined): string {
  if (!msg) return '';
  if (typeof msg.content === 'string') return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content.map((c) => c.text || '').join('\n');
  }
  return '';
}

function tryParseClassification(raw: string): Classification | null {
  // Strip code fences if present
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

  // If the model added preamble, find the first { and last }
  const firstBrace = s.indexOf('{');
  const lastBrace = s.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return null;
  s = s.slice(firstBrace, lastBrace + 1);

  try {
    const parsed = JSON.parse(s);
    const ids = new Set(archetypeNames());
    let primary = String(parsed.primary_archetype || '').trim();
    let secondary = parsed.secondary_archetype ? String(parsed.secondary_archetype).trim() : null;
    if (!ids.has(primary)) {
      // try matching by name
      const found = ARCHETYPES.find(
        (a) => a.name.toLowerCase() === primary.toLowerCase() || a.id === primary.toLowerCase().replace(/\s+/g, '_')
      );
      if (found) primary = found.id;
      else return null;
    }
    if (secondary && !ids.has(secondary)) {
      const found = ARCHETYPES.find(
        (a) =>
          a.name.toLowerCase() === secondary!.toLowerCase() ||
          a.id === secondary!.toLowerCase().replace(/\s+/g, '_')
      );
      secondary = found ? found.id : null;
    }
    const confRaw = Number(parsed.confidence);
    const confidence = isFinite(confRaw) ? Math.max(0, Math.min(1, confRaw)) : 0.7;
    const reasoning = String(parsed.reasoning || '').trim();
    const essence: string[] = Array.isArray(parsed.essence_words)
      ? parsed.essence_words.map((w: unknown) => String(w)).slice(0, 3)
      : [];
    const palette: string[] = Array.isArray(parsed.color_palette)
      ? parsed.color_palette.map((p: unknown) => String(p)).slice(0, 5)
      : [];
    const arche = archetypeById(primary);
    return {
      primaryArchetype: primary,
      secondaryArchetype: secondary,
      confidence,
      reasoning,
      essenceWords: essence.length === 3 ? (essence as string[]) : (arche ? [...arche.essence] : ['radiant', 'self', 'becoming']),
      palette: palette.length >= 3 ? palette : (arche ? [...arche.palette].slice(0, 4) : ['#1A1A1A', '#F2F2F2', '#A8A8A8']),
    };
  } catch {
    return null;
  }
}

export async function classifyImage(imageBase64: string, mimeType = 'image/jpeg'): Promise<Classification> {
  if (config.mockAi || !config.groqApiKey) {
    return deterministicMockArchetype(imageBase64.slice(0, 64) + imageBase64.slice(-64));
  }

  const dataUrl = `data:${mimeType};base64,${imageBase64}`;
  const userText = `Available archetypes (use these ids exactly):\n${buildArchetypeMenu()}\n\nClassify the person in this photo. Respond with JSON only.`;

  const body = {
    model: config.groqVisionModel,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    temperature: 0.5,
    max_tokens: 600,
    response_format: { type: 'json_object' },
  };

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.groqApiKey}`,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as GroqResponse;
  if (!res.ok) {
    const msg = json?.error?.message || `Groq error ${res.status}`;
    throw new Error(`Vision classify failed: ${msg}`);
  }
  const text = extractText(json.choices?.[0]?.message);
  const parsed = tryParseClassification(text);
  if (!parsed) {
    // graceful fallback so the user always gets a result
    return deterministicMockArchetype(text || imageBase64.slice(0, 64));
  }
  return parsed;
}
