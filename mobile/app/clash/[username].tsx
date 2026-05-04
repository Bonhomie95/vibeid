import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { theme } from '../../lib/theme';
import { friendsApi, ApiException } from '../../lib/api';
import type { ClashResponse } from '../../lib/types';

export default function ClashScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const [clash, setClash] = useState<ClashResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await friendsApi.clash(username);
        if (!cancelled) {
          setClash(r);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (e: unknown) {
        if (!cancelled) setError((e as ApiException).message || 'Could not run clash.');
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
  if (!clash) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator color={theme.accent} />
        <Text style={s.muted}>computing…</Text>
      </SafeAreaView>
    );
  }

  const meColor = clash.me.archetype.palette[0] ?? theme.accent;
  const otherColor = clash.other.archetype.palette[0] ?? theme.accentDeep;

  return (
    <View style={s.root}>
      <LinearGradient
        colors={[meColor + '22', '#0A0A0A', otherColor + '22']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SafeAreaView style={s.safe}>
        <View style={s.head}>
          <Pressable onPress={() => router.back()} hitSlop={20}>
            <Text style={s.back}>← back</Text>
          </Pressable>
        </View>

        <View style={s.scoreBlock}>
          <Text style={s.kicker}>vibe clash</Text>
          <Text style={s.score}>{clash.score}</Text>
          <Text style={s.scoreCaption}>compatibility</Text>
        </View>

        <View style={s.usersRow}>
          <View style={[s.userCard, { borderColor: meColor + '88' }]}>
            <View style={[s.dot, { backgroundColor: meColor }]} />
            <Text style={s.userName}>{clash.me.username}</Text>
            <Text style={s.userArche}>{clash.me.archetype.name}</Text>
          </View>
          <Text style={s.versus}>×</Text>
          <View style={[s.userCard, { borderColor: otherColor + '88' }]}>
            <View style={[s.dot, { backgroundColor: otherColor }]} />
            <Text style={s.userName}>{clash.other.username}</Text>
            <Text style={s.userArche}>{clash.other.archetype.name}</Text>
          </View>
        </View>

        <Text style={s.blurb}>{clash.blurb}</Text>

        <View style={{ flex: 1 }} />

        <Pressable onPress={() => router.back()} style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]}>
          <Text style={s.btnLabel}>Done</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  safe: { flex: 1, paddingHorizontal: 28 },
  head: { paddingTop: 12 },
  back: { color: theme.textMuted, fontSize: 15 },
  scoreBlock: { alignItems: 'center', marginTop: 48, marginBottom: 32, gap: 4 },
  kicker: {
    color: theme.textFaint, fontSize: 12, letterSpacing: 5, textTransform: 'uppercase',
  },
  score: { color: theme.accent, fontSize: 120, fontFamily: theme.font.display, fontWeight: '300', lineHeight: 130 },
  scoreCaption: { color: theme.textMuted, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' },
  usersRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginVertical: 24 },
  userCard: {
    flex: 1, padding: 16, borderRadius: theme.radius.lg,
    backgroundColor: theme.bgCard, borderWidth: 1, alignItems: 'center', gap: 6,
  },
  dot: { width: 16, height: 16, borderRadius: 8, marginBottom: 4 },
  userName: { color: theme.text, fontSize: 15, fontWeight: '500' },
  userArche: { color: theme.textMuted, fontSize: 13, textAlign: 'center' },
  versus: { color: theme.textFaint, fontSize: 28, fontFamily: theme.font.display },
  blurb: {
    color: theme.text, fontSize: 18, lineHeight: 26, fontStyle: 'italic',
    fontFamily: theme.font.display, textAlign: 'center', paddingHorizontal: 8, marginTop: 16,
  },
  btn: {
    backgroundColor: theme.accent, paddingVertical: 16, borderRadius: theme.radius.xl,
    alignItems: 'center', marginBottom: 12,
  },
  btnLabel: { color: '#1A1410', fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg, gap: 16 },
  err: { color: theme.danger, paddingHorizontal: 28, textAlign: 'center' },
  link: { color: theme.accent },
  muted: { color: theme.textMuted },
});
