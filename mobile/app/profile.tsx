import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../lib/theme';
import { authApi, vibeApi, friendsApi, ApiException } from '../lib/api';
import type { ArchetypeMeta, FriendUser, SafeUser, VibeResultJSON } from '../lib/types';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<SafeUser | null>(null);
  const [history, setHistory] = useState<VibeResultJSON[]>([]);
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [archetypeMap, setArchetypeMap] = useState<Map<string, ArchetypeMeta>>(new Map());
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [meRes, histRes, frRes] = await Promise.all([
        authApi.me(),
        vibeApi.history().catch(() => ({ results: [] as VibeResultJSON[] })),
        friendsApi.list().catch(() => ({ friends: [] as FriendUser[] })),
      ]);
      setUser(meRes.user);
      setHistory(histRes.results);
      setFriends(frRes.friends);
      // Lazy-load archetype meta only for ids we actually reference.
      const ids = new Set<string>();
      histRes.results.forEach((r) => ids.add(r.primaryArchetype));
      meRes.user.primaryArchetype && ids.add(meRes.user.primaryArchetype);
      const newMap = new Map(archetypeMap);
      const missing = [...ids].filter((id) => !newMap.has(id));
      const { archetypeApi } = await import('../lib/api');
      const fetched = await Promise.all(
        missing.map((id) => archetypeApi.get(id).then((r) => r.archetype).catch(() => null))
      );
      fetched.forEach((a) => { if (a) newMap.set(a.id, a); });
      setArchetypeMap(newMap);
    } catch (e: unknown) {
      const err = e as ApiException;
      if (err.status === 401) {
        await authApi.logout();
        router.replace('/auth');
        return;
      }
      setError(err.message || 'Could not load your profile.');
    }
  }, [router]); // archetypeMap intentionally excluded to avoid loop

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => { load(); }, [load]);

  async function onLogout() {
    Alert.alert('Sign out?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await authApi.logout();
          router.replace('/');
        },
      },
    ]);
  }

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const userArche = user?.primaryArchetype ? archetypeMap.get(user.primaryArchetype) : null;

  return (
    <SafeAreaView style={s.root}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      >
        <View style={s.head}>
          <Pressable onPress={() => router.replace('/')} hitSlop={20}>
            <Text style={s.back}>← home</Text>
          </Pressable>
          <Pressable onPress={onLogout}>
            <Text style={s.signOut}>sign out</Text>
          </Pressable>
        </View>

        {error && <Text style={s.err}>{error}</Text>}

        {user && (
          <View style={s.userBlock}>
            <Text style={s.kicker}>your vibe</Text>
            {userArche ? (
              <>
                <Text style={s.archeName}>{userArche.name}</Text>
                <Text style={s.archeDesc}>{userArche.description}</Text>
                <View style={s.paletteRow}>
                  {userArche.palette.slice(0, 5).map((c, i) => (
                    <View key={i} style={[s.swatch, { backgroundColor: c }]} />
                  ))}
                </View>
                <Pressable
                  onPress={() => router.push({ pathname: '/capture', params: { force: '1' } })}
                  style={s.rereadBtn}
                  hitSlop={8}
                >
                  <Text style={s.reread}>re-read my vibe →</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={s.archeName}>not yet read</Text>
                <Pressable onPress={() => router.push('/capture')}>
                  <Text style={s.cta}>find my vibe →</Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>history</Text>
            <Text style={s.sectionMeta}>{history.length} reading{history.length === 1 ? '' : 's'}</Text>
          </View>
          {history.length === 0 ? (
            <Text style={s.empty}>no readings yet.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {history.map((h) => {
                const a = archetypeMap.get(h.primaryArchetype);
                return (
                  <Pressable
                    key={h.id}
                    onPress={() => router.push({ pathname: '/result/[id]', params: { id: h.id } })}
                    style={({ pressed }) => [s.historyRow, pressed && { opacity: 0.7 }]}
                  >
                    <View style={[s.dot, { backgroundColor: a?.palette[0] || theme.accent }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.historyName}>{a?.name ?? h.primaryArchetype}</Text>
                      <Text style={s.historyDate}>
                        {new Date(h.createdAt).toLocaleDateString()} · {Math.round(h.confidence * 100)}%
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>friends</Text>
            <Pressable onPress={() => router.push('/friends')}>
              <Text style={s.sectionMeta}>manage →</Text>
            </Pressable>
          </View>
          {friends.length === 0 ? (
            <Text style={s.empty}>no friends added yet.</Text>
          ) : (
            <View style={s.friendGrid}>
              {friends.map((f) => (
                <View key={f.id} style={s.friendChip}>
                  <View style={[s.dot, { backgroundColor: f.archetypeMeta?.palette[0] || theme.borderStrong }]} />
                  <Text style={s.friendUser}>{f.username}</Text>
                  <Text style={s.friendArche}>{f.archetypeMeta?.name ?? '—'}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  scroll: { paddingHorizontal: 28, paddingBottom: 64 },
  head: {
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  back: { color: theme.textMuted, fontSize: 15 },
  signOut: { color: theme.textFaint, fontSize: 13 },
  userBlock: { paddingTop: 36, gap: 10 },
  kicker: { color: theme.textFaint, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase' },
  archeName: {
    color: theme.text,
    fontSize: 40,
    fontFamily: theme.font.display,
    fontWeight: '300',
    lineHeight: 44,
  },
  archeDesc: { color: theme.textMuted, fontSize: 16, lineHeight: 22, fontStyle: 'italic' },
  paletteRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: theme.border },
  cta: { color: theme.accent, fontSize: 16, marginTop: 8 },
  rereadBtn: { marginTop: 14, alignSelf: 'flex-start' },
  reread: { color: theme.textMuted, fontSize: 13, letterSpacing: 0.5 },
  section: { marginTop: 40 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 },
  sectionTitle: {
    color: theme.text,
    fontSize: 22,
    fontFamily: theme.font.display,
    fontWeight: '300',
  },
  sectionMeta: { color: theme.textFaint, fontSize: 13 },
  empty: { color: theme.textFaint, fontSize: 14, paddingVertical: 8 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  historyName: { color: theme.text, fontSize: 15, fontWeight: '500' },
  historyDate: { color: theme.textFaint, fontSize: 12, marginTop: 2 },
  friendGrid: { gap: 8 },
  friendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  friendUser: { color: theme.text, fontSize: 15, fontWeight: '500' },
  friendArche: { color: theme.textMuted, fontSize: 13, marginLeft: 'auto' },
  err: { color: theme.danger, paddingTop: 16 },
});
