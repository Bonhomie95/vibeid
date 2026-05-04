// Shape of API responses. Mirrors the backend's controllers.

export interface ArchetypeMeta {
  id: string;
  name: string;
  description: string;
  palette: string[];
  essence: [string, string, string];
}

export interface VibeResultJSON {
  id: string;
  userId: string | null;
  primaryArchetype: string;
  secondaryArchetype: string | null;
  confidence: number;
  reasoning: string;
  essenceWords: string[];
  palette: string[];
  cardImageUrl: string | null;
  createdAt: string;
}

export interface SafeUser {
  id: string;
  email: string;
  username: string;
  premium: boolean;
  premiumUntil: string | null;
  primaryArchetype: string | null;
  vibeCount: number;
  createdAt: string;
}

export interface AnalyzeResponse {
  result: VibeResultJSON;
  archetype: ArchetypeMeta | null;
  secondaryArchetypeMeta: ArchetypeMeta | null;
}

export interface AuthResponse {
  token: string;
  user: SafeUser;
}

export interface ApiError {
  error: string;
  message: string;
}

export interface ClashResponse {
  score: number;
  blurb: string;
  me: { id: string; username: string; archetype: ArchetypeMeta };
  other: { id: string; username: string; archetype: ArchetypeMeta };
}

export interface FriendUser extends SafeUser {
  archetypeMeta: ArchetypeMeta | null;
}

export interface DistributionEntry {
  id: string;
  count: number;
  pct: number;
}
