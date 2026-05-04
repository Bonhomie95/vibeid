import { View, Text, StyleSheet, Image, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { ArchetypeMeta, VibeResultJSON } from '../lib/types';
import { theme } from '../lib/theme';

interface Props {
  archetype: ArchetypeMeta;
  result: VibeResultJSON;
  height?: number;
}

/**
 * The shareable card. Designed to look great as a screenshot
 * on Instagram stories, WhatsApp, etc. (9:16 vertical).
 */
export function VibeCard({ archetype, result, height = 600 }: Props) {
  const palette = result.palette.length ? result.palette : archetype.palette;
  const accentDark = palette[palette.length - 1] || '#1A1410';
  const accentLight = palette[0] || '#E8C896';
  const aspectHeight = height;
  const aspectWidth = aspectHeight * (9 / 16);

  return (
    <View style={[s.cardWrap, { width: aspectWidth, height: aspectHeight }]} collapsable={false}>
      {result.cardImageUrl ? (
        <ImageBackground source={{ uri: result.cardImageUrl }} style={s.bg} blurRadius={0}>
          <LinearGradient
            colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <CardContent archetype={archetype} result={result} accentLight={accentLight} />
        </ImageBackground>
      ) : (
        <View style={[s.bg, { backgroundColor: accentDark }]}>
          <LinearGradient
            colors={[accentLight + '33', 'transparent', '#000000']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <CardContent archetype={archetype} result={result} accentLight={accentLight} />
        </View>
      )}
    </View>
  );
}

function CardContent({
  archetype,
  result,
  accentLight,
}: {
  archetype: ArchetypeMeta;
  result: VibeResultJSON;
  accentLight: string;
}) {
  return (
    <View style={s.content}>
      <View style={s.top}>
        <Text style={[s.kicker, { color: accentLight }]}>vibe id</Text>
      </View>

      <View style={s.middle}>
        <Text style={s.essenceRow}>
          {result.essenceWords.map((w, i) => (
            <Text key={i} style={s.essenceWord}>
              {i > 0 ? '  ·  ' : ''}
              {w}
            </Text>
          ))}
        </Text>
        <Text style={s.archetypeName}>{archetype.name}</Text>
        <Text style={s.tagline}>{archetype.description}</Text>
      </View>

      <View style={s.bottom}>
        <View style={s.paletteRow}>
          {(result.palette.length ? result.palette : archetype.palette).slice(0, 5).map((c, i) => (
            <View key={i} style={[s.swatch, { backgroundColor: c }]} />
          ))}
        </View>
        <Text style={[s.footMark, { color: accentLight }]}>vibeid.app</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  cardWrap: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  bg: { flex: 1 },
  content: {
    flex: 1,
    padding: 22,
    justifyContent: 'space-between',
  },
  top: { },
  kicker: {
    fontSize: 11,
    letterSpacing: 5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  middle: { gap: 10 },
  essenceRow: { color: 'rgba(255,255,255,0.85)', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' },
  essenceWord: { color: 'rgba(255,255,255,0.85)', fontSize: 12, letterSpacing: 2 },
  archetypeName: {
    color: theme.text,
    fontSize: 38,
    fontWeight: '300',
    fontFamily: theme.font.display,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  tagline: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    fontFamily: theme.font.display,
  },
  bottom: { gap: 16 },
  paletteRow: { flexDirection: 'row', gap: 6 },
  swatch: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  footMark: { fontSize: 11, letterSpacing: 3, textTransform: 'lowercase', fontWeight: '500' },
});
