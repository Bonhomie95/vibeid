import { config } from '../config/env';
import { Archetype } from '../data/archetypes';

export interface GeneratedImage {
  url: string;
  provider: string;
}

/**
 * Generate the aesthetic art card background for the given archetype.
 * Pollinations (https://image.pollinations.ai) is keyless and free —
 * fine for testing. Swap to Replicate/FLUX in production.
 */
export function generateArchetypeImage(archetype: Archetype, seedSalt = ''): GeneratedImage {
  const palette = archetype.palette.slice(0, 4).join(', ');
  const fullPrompt =
    `Aesthetic art card for ${archetype.name} vibe. ${archetype.visualPrompt}. ` +
    `Painterly, editorial, fashion-forward magazine quality. No faces. No text. ` +
    `Color palette: ${palette}. Vertical 9:16.`;

  const seed = (hash(archetype.id + seedSalt) % 1_000_000).toString();

  if (config.imageProvider === 'pollinations') {
    const url = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}`);
    url.searchParams.set('width', '720');
    url.searchParams.set('height', '1280');
    url.searchParams.set('nologo', 'true');
    url.searchParams.set('enhance', 'true');
    url.searchParams.set('seed', seed);
    url.searchParams.set('model', 'flux');
    return { url: url.toString(), provider: 'pollinations' };
  }

  // Fallback: same as pollinations
  const url = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}`);
  url.searchParams.set('width', '720');
  url.searchParams.set('height', '1280');
  url.searchParams.set('nologo', 'true');
  url.searchParams.set('seed', seed);
  return { url: url.toString(), provider: 'pollinations-fallback' };
}

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
