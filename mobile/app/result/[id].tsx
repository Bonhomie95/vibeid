import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { theme } from '../../lib/theme';
import { vibeApi, authApi, getBaseUrl } from '../../lib/api';
import type { ArchetypeMeta, VibeResultJSON } from '../../lib/types';
import { VibeCard } from '../../components/VibeCard';

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<{ result: VibeResultJSON; archetype: ArchetypeMeta | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const cardRef = useRef<ViewShot | null>(null);

  useEffect(() => {
    authApi.hasToken().then(setSignedIn);
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await vibeApi.result(id);
        if (!cancelled) setData({ result: r.result, archetype: r.archetype });
      } catch (e: unknown) {
        if (!cancelled) setError((e as Error).message || 'Could not load result');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function onShare() {
    Haptics.selectionAsync();
    try {
      if (cardRef.current?.capture) {
        const uri = await cardRef.current.capture();
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'My Vibe ID' });
          return;
        }
      }
      // fallback to text-only share
      await Share.share({
        message: `I'm ${data?.archetype?.name ?? 'a vibe'} on Vibe ID. Find yours → ${getBaseUrl()}/r/${id}`,
      });
    } catch {
      /* user cancelled */
    }
  }

  if (error) {
    return (
      <SafeAreaView style={s.center}>
        <Text style={s.err}>{error}</Text>
        <Pressable onPress={() => router.replace('/')}>
          <Text style={s.link}>back home</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!data || !data.archetype) {
    return (
      <SafeAreaView style={s.center}>
        <Text style={s.muted}>loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.head}>
          <Pressable onPress={() => router.replace('/')} hitSlop={20}>
            <Text style={s.back}>← home</Text>
          </Pressable>
        </View>

        <View style={s.cardCenter}>
          <ViewShot ref={cardRef} options={{ format: 'png', quality: 0.95, result: 'tmpfile' }}>
            <VibeCard archetype={data.archetype} result={data.result} />
          </ViewShot>
        </View>

        <View style={s.reasoning}>
          <Text style={s.reasoningTitle}>your reading</Text>
          <Text style={s.reasoningBody}>{data.result.reasoning}</Text>
          <Text style={s.confidence}>
            confidence · {Math.round(data.result.confidence * 100)}%
          </Text>
        </View>

        <View style={s.actions}>
          <Pressable style={({ pressed }) => [s.primary, pressed && { opacity: 0.85 }]} onPress={onShare}>
            <Text style={s.primaryLabel}>Share my vibe</Text>
          </Pressable>
          <Pressable style={s.secondary} onPress={() => router.replace('/capture')}>
            <Text style={s.secondaryLabel}>Try another photo</Text>
          </Pressable>
          {!signedIn && (
            <Pressable style={s.secondary} onPress={() => router.push('/auth')}>
              <Text style={s.secondaryLabel}>Save your vibe ↗</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  scroll: { paddingBottom: 48 },
  head: { paddingHorizontal: 24, paddingTop: 12 },
  back: { color: theme.textMuted, fontSize: 15 },
  cardCenter: { alignItems: 'center', paddingTop: 16, paddingBottom: 24 },
  reasoning: { paddingHorizontal: 28, gap: 12 },
  reasoningTitle: {
    color: theme.textFaint,
    fontSize: 11,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  reasoningBody: {
    color: theme.text,
    fontSize: 18,
    lineHeight: 26,
    fontFamily: theme.font.display,
  },
  confidence: { color: theme.textFaint, fontSize: 12, letterSpacing: 1 },
  actions: { paddingHorizontal: 28, marginTop: 28, gap: 8 },
  primary: {
    backgroundColor: theme.accent,
    paddingVertical: 18,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
  },
  primaryLabel: { color: '#1A1410', fontSize: 17, fontWeight: '600', letterSpacing: 0.4 },
  secondary: { paddingVertical: 14, alignItems: 'center' },
  secondaryLabel: { color: theme.textMuted, fontSize: 15 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg, gap: 12 },
  muted: { color: theme.textMuted },
  err: { color: theme.danger, paddingHorizontal: 28, textAlign: 'center' },
  link: { color: theme.accent, marginTop: 12 },
});
