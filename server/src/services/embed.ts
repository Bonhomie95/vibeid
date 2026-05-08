// Person embedding service.
//
// When PERSON_MATCHING=clip, the backend POSTs the selfie to a local
// CLIP embedding endpoint (see scripts/embed-server.py — runs on your
// M5 in 1-2GB of RAM, under 200ms per image) and gets back a 512-dim
// vector. We store the vector with the result, then on subsequent
// anonymous analyses we cosine-compare against recent embeddings and,
// if similarity > threshold, reuse the prior archetype. This makes
// "different photo of the same person" return the same vibe.
//
// When PERSON_MATCHING is unset (default), all of this is a no-op and
// the system behaves exactly like before.

import { config } from '../config/env';

export interface EmbedResult {
  embedding: number[]; // length 512 for CLIP ViT-B/32
}

export async function embedImage(imageBase64: string): Promise<number[] | null> {
  if (config.personMatching !== 'clip' || !config.embedUrl) return null;

  const cleaned = imageBase64.startsWith('data:')
    ? imageBase64.replace(/^data:[^;]+;base64,/, '')
    : imageBase64;

  try {
    const res = await fetch(config.embedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: cleaned }),
      // local server, should be fast — bail if it's not
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Partial<EmbedResult>;
    if (!Array.isArray(json.embedding) || json.embedding.length === 0) return null;
    return json.embedding as number[];
  } catch {
    // If the embed server is down or slow, gracefully fall back to
    // pure classification — never fail the user-facing request.
    return null;
  }
}

export function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
