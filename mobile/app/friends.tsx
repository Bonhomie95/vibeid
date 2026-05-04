import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../lib/theme';
import { friendsApi, ApiException } from '../lib/api';
import type { ClashResponse, FriendUser } from '../lib/types';

export default function FriendsScreen() {
  const router = useRouter();
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [usernameInput, setUsernameInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [clashWith, setClashWith] = useState<string | null>(null);
  const [clash, setClash] = useState<ClashResponse | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await friendsApi.list();
      setFriends(r.friends);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add() {
    const u = usernameInput.trim();
    if (!u) return;
    try {
      setBusy(true);
      await friendsApi.add(u);
      setUsernameInput('');
      await load();
    } catch (e: unknown) {
      Alert.alert('Could not add', (e as ApiException).message);
    } finally {
      setBusy(false);
    }
  }

  async function runClash(other: string) {
    try {
      setClashWith(other);
      setClash(null);
      const r = await friendsApi.clash(other);
      setClash(r);
    } catch (e: unknown) {
      Alert.alert('Clash failed', (e as ApiException).message);
      setClashWith(null);
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.head}>
          <Pressable onPress={() => router.back()} hitSlop={20}>
            <Text style={s.back}>← back</Text>
          </Pressable>
        </View>

        <Text style={s.title}>friends</Text>

        <View style={s.addRow}>
          <TextInput
            style={s.input}
            placeholder="add by username"
            placeholderTextColor={theme.textFaint}
            value={usernameInput}
            onChangeText={setUsernameInput}
            autoCapitalize="none"
            onSubmitEditing={add}
          />
          <Pressable
            onPress={add}
            disabled={busy || !usernameInput.trim()}
            style={({ pressed }) => [s.addBtn, (busy || !usernameInput.trim()) && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}
          >
            <Text style={s.addBtnLabel}>add</Text>
          </Pressable>
        </View>

        {friends.length === 0 ? (
          <Text style={s.empty}>add a friend to compare your vibes.</Text>
        ) : (
          <View style={s.list}>
            {friends.map((f) => (
              <View key={f.id} style={s.row}>
                <View style={[s.dot, { backgroundColor: f.archetypeMeta?.palette[0] || theme.borderStrong }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.user}>{f.username}</Text>
                  <Text style={s.subtle}>{f.archetypeMeta?.name ?? 'no reading yet'}</Text>
                </View>
                <Pressable onPress={() => runClash(f.username)}>
                  <Text style={s.clashBtn}>clash</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {clashWith && (
          <View style={s.clashBlock}>
            <Text style={s.kicker}>vibe clash with {clashWith}</Text>
            {clash ? (
              <>
                <Text style={s.score}>{clash.score}</Text>
                <Text style={s.scoreCaption}>compatibility</Text>
                <Text style={s.blurb}>{clash.blurb}</Text>
                <View style={s.clashRow}>
                  <View style={s.clashCard}>
                    <Text style={s.clashUser}>{clash.me.username}</Text>
                    <Text style={s.clashArche}>{clash.me.archetype.name}</Text>
                  </View>
                  <View style={s.clashCard}>
                    <Text style={s.clashUser}>{clash.other.username}</Text>
                    <Text style={s.clashArche}>{clash.other.archetype.name}</Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={s.subtle}>computing…</Text>
            )}
          </View>
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
  title: {
    color: theme.text,
    fontSize: 40,
    fontFamily: theme.font.display,
    fontWeight: '300',
    marginTop: 24,
    marginBottom: 24,
  },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  input: {
    flex: 1,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: theme.text,
    fontSize: 15,
    borderRadius: theme.radius.md,
  },
  addBtn: {
    backgroundColor: theme.accent,
    paddingHorizontal: 24,
    justifyContent: 'center',
    borderRadius: theme.radius.md,
  },
  addBtnLabel: { color: '#1A1410', fontWeight: '600', fontSize: 15 },
  list: { gap: 8 },
  row: {
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
  dot: { width: 12, height: 12, borderRadius: 6 },
  user: { color: theme.text, fontSize: 15, fontWeight: '500' },
  subtle: { color: theme.textMuted, fontSize: 13, marginTop: 2 },
  clashBtn: { color: theme.accent, fontSize: 14, fontWeight: '500' },
  empty: { color: theme.textFaint, fontSize: 14, paddingVertical: 12 },
  clashBlock: {
    marginTop: 32,
    padding: 24,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 8,
  },
  kicker: { color: theme.textFaint, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase' },
  score: { color: theme.accent, fontSize: 64, fontFamily: theme.font.display, fontWeight: '300' },
  scoreCaption: { color: theme.textFaint, fontSize: 12, letterSpacing: 2 },
  blurb: { color: theme.text, fontSize: 16, lineHeight: 23, fontStyle: 'italic', marginTop: 8 },
  clashRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  clashCard: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius.md,
  },
  clashUser: { color: theme.text, fontWeight: '500' },
  clashArche: { color: theme.textMuted, fontSize: 13, marginTop: 4 },
});
