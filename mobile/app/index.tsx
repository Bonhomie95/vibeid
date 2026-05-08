import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../lib/theme';
import { authApi } from '../lib/api';

export default function HomeScreen() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    authApi.hasToken().then(setSignedIn);
  }, []);

  return (
    <View style={s.root}>
      <LinearGradient
        colors={['#1A1410', '#0A0A0A', '#0A0A0A']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.heroBlock}>
          <Text style={s.kicker}>vibe id</Text>
          <Text style={s.title}>What's your{'\n'}vibe?</Text>
          <Text style={s.subtitle}>
            One photo. One archetype.{'\n'}A reading you'll want to share.
          </Text>
        </View>

        <View style={s.cta}>
          <Pressable
            style={({ pressed }) => [s.primary, pressed && { opacity: 0.85 }]}
            onPress={() => router.push('/capture')}
          >
            <Text style={s.primaryLabel}>Find My Vibe</Text>
          </Pressable>

          {signedIn ? (
            <Pressable
              onPress={() => router.push('/profile')}
              style={({ pressed }) => [s.secondary, pressed && { opacity: 0.7 }]}
            >
              <Text style={s.secondaryLabel}>My Profile</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push('/auth')}
              style={({ pressed }) => [s.secondary, pressed && { opacity: 0.7 }]}
            >
              <Text style={s.secondaryLabel}>Sign in / create account</Text>
            </Pressable>
          )}
        </View>

        <View style={s.footer}>
          <Text style={s.footerLink}>your vibe is waiting</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  safe: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between' },
  heroBlock: { paddingTop: 64 },
  kicker: {
    color: theme.textFaint,
    fontSize: 13,
    letterSpacing: 6,
    textTransform: 'uppercase',
    marginBottom: 32,
  },
  title: {
    color: theme.text,
    fontSize: 64,
    fontWeight: '300',
    fontFamily: theme.font.display,
    lineHeight: 70,
    letterSpacing: -1,
  },
  subtitle: {
    color: theme.textMuted,
    fontSize: 17,
    marginTop: 24,
    lineHeight: 24,
  },
  cta: { gap: 14 },
  primary: {
    backgroundColor: theme.accent,
    paddingVertical: 18,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
  },
  primaryLabel: {
    color: '#1A1410',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  secondary: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryLabel: { color: theme.textMuted, fontSize: 15 },
  footer: { alignItems: 'center', paddingBottom: 12 },
  footerLink: { color: theme.textFaint, fontSize: 14, letterSpacing: 0.5 },
});
