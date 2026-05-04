import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../lib/theme';
import { archetypeApi } from '../../lib/api';
import type { ArchetypeMeta } from '../../lib/types';

export default function ArchetypeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [archetype, setArchetype] = useState<ArchetypeMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await archetypeApi.get(id);
        if (!cancelled) setArchetype(r.archetype);
      } catch (e: unknown) {
        if (!cancelled) setError((e as Error).message || 'Could not load.');
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (error) {
    return (
      <SafeAreaView style={s.center}>
        <Text style={s.err}>{error}</Text>
        <Pressable onPress={() => router.back()}><Text style={s.link}>back</Text></Pressable>
      </SafeAreaView>
    );
  }
  if (!archetype) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator color={theme.accent} />
      </SafeAreaView>
    );
  }

  const accent = archetype.palette[0] ?? theme.accent;
  const deep = archetype.palette[archetype.palette.length - 1] ?? '#1A1410';

  return (
    <View style={s.root}>
      <LinearGradient
        colors={[accent + '33', '#0A0A0A', deep + '55']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.head}>
            <Pressable onPress={() => router.back()} hitSlop={20}>
              <Text style={s.back}>← back</Text>
            </Pressable>
          </View>

          <Text style={s.kicker}>archetype</Text>
          <Text style={s.title}>{archetype.name}</Text>
          <Text style={s.tagline}>{archetype.description}</Text>

          <View style={s.section}>
            <Text style={s.sectionLabel}>essence</Text>
            <Text style={s.essence}>{archetype.essence.join('  ·  ')}</Text>
          </View>

          <View style={s.section}>
            <Text style={s.sectionLabel}>palette</Text>
            <View style={s.paletteRow}>
              {archetype.palette.map((c, i) => (
                <View key={i} style={s.swatchBlock}>
                  <View style={[s.swatch, { backgroundColor: c }]} />
                  <Text style={s.swatchHex}>{c}</Text>
                </View>
              ))}
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]}
            onPress={() => router.push('/capture')}
          >
            <Text style={s.btnLabel}>Find my vibe</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  scroll: { paddingHorizontal: 28, paddingBottom: 64 },
  head: { paddingTop: 12 },
  back: { color: theme.textMuted, fontSize: 15 },
  kicker: { color: theme.textFaint, fontSize: 11, letterSpacing: 5, textTransform: 'uppercase', marginTop: 32 },
  title: {
    color: theme.text, fontSize: 56, fontFamily: theme.font.display, fontWeight: '300',
    lineHeight: 60, letterSpacing: -1, marginTop: 8,
  },
  tagline: {
    color: theme.textMuted, fontSize: 18, lineHeight: 25, fontStyle: 'italic',
    fontFamily: theme.font.display, marginTop: 16,
  },
  section: { marginTop: 36 },
  sectionLabel: { color: theme.textFaint, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 },
  essence: { color: theme.text, fontSize: 16, letterSpacing: 2, textTransform: 'lowercase' },
  paletteRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  swatchBlock: { alignItems: 'center', gap: 6 },
  swatch: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: theme.border },
  swatchHex: { color: theme.textFaint, fontSize: 10, letterSpacing: 0.5 },
  btn: { backgroundColor: theme.accent, paddingVertical: 18, borderRadius: theme.radius.xl, alignItems: 'center', marginTop: 48 },
  btnLabel: { color: '#1A1410', fontSize: 16, fontWeight: '600', letterSpacing: 0.4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg, gap: 12 },
  err: { color: theme.danger, paddingHorizontal: 28, textAlign: 'center' },
  link: { color: theme.accent },
});
