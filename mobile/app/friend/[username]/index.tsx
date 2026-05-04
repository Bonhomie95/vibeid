import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../../lib/theme';
import { friendsApi, ApiException } from '../../../lib/api';
import type { ArchetypeMeta, VibeResultJSON, SafeUser } from '../../../lib/types';
import { VibeCard } from '../../../components/VibeCard';

export default function FriendVibeScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const [data, setData] = useState<{
    user: SafeUser;
    latestResult: VibeResultJSON | null;
    archetype: ArchetypeMeta | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await friendsApi.vibe(username);
        if (!cancelled) setData(r);
      } catch (e: unknown) {
        if (!cancelled) setError((e as ApiException).message || 'Could not load.');
      }
    })();
    return () => { cancelled = true; };
  }, [username]);

  if (error) {
    return (
      <SafeAreaView style={s.center}>
        <Text style={s.err}>{error}</Text>
        <Pressable onPress={() => router.back()}><Text style={s.link}>back</Text></Pressable>
      </SafeAreaView>
    );
  }
  if (!data) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator color={theme.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.head}>
          <Pressable onPress={() => router.back()} hitSlop={20}>
            <Text style={s.back}>← back</Text>
          </Pressable>
        </View>

        <Text style={s.title}>@{data.user.username}</Text>

        {data.latestResult && data.archetype ? (
          <>
            <View style={s.cardCenter}>
              <VibeCard archetype={data.archetype} result={data.latestResult} />
            </View>
            <Text style={s.reasoningLabel}>their reading</Text>
            <Text style={s.reasoning}>{data.latestResult.reasoning}</Text>
            <Pressable
              onPress={() => router.push({ pathname: '/clash/[username]', params: { username: data.user.username } })}
              style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]}
            >
              <Text style={s.btnLabel}>Clash with {data.user.username}</Text>
            </Pressable>
          </>
        ) : (
          <Text style={s.empty}>{data.user.username} hasn't taken a reading yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  scroll: { paddingHorizontal: 28, paddingBottom: 64 },
  head: { paddingTop: 12 },
  back: { color: theme.textMuted, fontSize: 15 },
  title: { color: theme.text, fontSize: 32, fontFamily: theme.font.display, fontWeight: '300', marginTop: 24 },
  cardCenter: { alignItems: 'center', marginTop: 24 },
  reasoningLabel: {
    color: theme.textFaint, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', marginTop: 28,
  },
  reasoning: { color: theme.text, fontSize: 17, lineHeight: 25, fontFamily: theme.font.display, marginTop: 12 },
  btn: {
    backgroundColor: theme.accent,
    paddingVertical: 16, borderRadius: theme.radius.xl, alignItems: 'center', marginTop: 28,
  },
  btnLabel: { color: '#1A1410', fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg, gap: 12 },
  err: { color: theme.danger, paddingHorizontal: 28, textAlign: 'center' },
  link: { color: theme.accent },
  empty: { color: theme.textMuted, fontSize: 16, marginTop: 32, fontStyle: 'italic' },
});
