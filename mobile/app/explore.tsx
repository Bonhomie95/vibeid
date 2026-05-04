import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../lib/theme';
import { archetypeApi } from '../lib/api';
import type { ArchetypeMeta, DistributionEntry } from '../lib/types';

export default function ExploreScreen() {
  const router = useRouter();
  const [archetypes, setArchetypes] = useState<ArchetypeMeta[]>([]);
  const [dist, setDist] = useState<Map<string, DistributionEntry>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [a, d] = await Promise.all([
          archetypeApi.list(),
          archetypeApi.distribution(),
        ]);
        setArchetypes(a.archetypes);
        const m = new Map<string, DistributionEntry>();
        d.distribution.forEach((e) => m.set(e.id, e));
        setDist(m);
      } catch (e: unknown) {
        setError((e as Error).message || 'Could not load.');
      }
    })();
  }, []);

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.head}>
          <Pressable onPress={() => router.back()} hitSlop={20}>
            <Text style={s.back}>← back</Text>
          </Pressable>
        </View>
        <Text style={s.title}>archetypes</Text>
        <Text style={s.subtitle}>
          {archetypes.length} aesthetic archetypes. New seasonal drops every month.
        </Text>

        {error && <Text style={s.err}>{error}</Text>}

        <View style={s.grid}>
          {archetypes.map((a) => {
            const d = dist.get(a.id);
            return (
              <Pressable
                key={a.id}
                onPress={() => router.push({ pathname: '/archetype/[id]', params: { id: a.id } })}
                style={({ pressed }) => [s.card, { borderColor: a.palette[0] + '55' }, pressed && { opacity: 0.7 }]}
              >
                <View style={s.swatchRow}>
                  {a.palette.slice(0, 4).map((c, i) => (
                    <View key={i} style={[s.swatch, { backgroundColor: c }]} />
                  ))}
                </View>
                <Text style={s.archeName}>{a.name}</Text>
                <Text style={s.archeDesc} numberOfLines={2}>
                  {a.description}
                </Text>
                <View style={s.metaRow}>
                  <Text style={s.essence}>
                    {a.essence.join(' · ')}
                  </Text>
                  {d && d.count > 0 && (
                    <Text style={s.dist}>{d.pct}%</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
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
  },
  subtitle: { color: theme.textMuted, fontSize: 15, marginTop: 8, marginBottom: 24 },
  grid: { gap: 12 },
  card: {
    padding: 18,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 8,
  },
  swatchRow: { flexDirection: 'row', gap: 4 },
  swatch: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  archeName: { color: theme.text, fontSize: 22, fontFamily: theme.font.display, fontWeight: '300', marginTop: 4 },
  archeDesc: { color: theme.textMuted, fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  essence: {
    color: theme.textFaint,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    flex: 1,
  },
  dist: { color: theme.accent, fontSize: 12, fontWeight: '500' },
  err: { color: theme.danger, marginVertical: 8 },
});
