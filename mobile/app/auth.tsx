import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../lib/theme';
import { authApi, ApiException } from '../lib/api';

type Mode = 'login' | 'signup';

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    try {
      setBusy(true);
      if (mode === 'signup') {
        await authApi.signup(email.trim(), username.trim(), password);
      } else {
        await authApi.login(email.trim(), password);
      }
      router.replace('/profile');
    } catch (e: unknown) {
      const err = e as ApiException;
      Alert.alert('Could not continue', err.message || 'Please check your details.');
    } finally {
      setBusy(false);
    }
  }

  const valid =
    email.includes('@') &&
    password.length >= 8 &&
    (mode === 'login' || username.trim().length >= 3);

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        style={s.kbWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.head}>
          <Pressable onPress={() => router.back()} hitSlop={20}>
            <Text style={s.back}>← back</Text>
          </Pressable>
        </View>

        <View style={s.body}>
          <Text style={s.title}>{mode === 'signup' ? 'Save your\nvibe.' : 'Welcome\nback.'}</Text>
          <Text style={s.subtitle}>
            {mode === 'signup'
              ? 'Track how your vibe evolves. Add friends. Compare readings.'
              : 'Sign in to your Vibe ID account.'}
          </Text>

          <View style={s.form}>
            <TextInput
              style={s.input}
              placeholder="email"
              placeholderTextColor={theme.textFaint}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            {mode === 'signup' && (
              <TextInput
                style={s.input}
                placeholder="username"
                placeholderTextColor={theme.textFaint}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoComplete="username"
              />
            )}
            <TextInput
              style={s.input}
              placeholder="password (8+)"
              placeholderTextColor={theme.textFaint}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />

            <Pressable
              style={({ pressed }) => [s.primary, !valid && s.primaryDisabled, pressed && valid && { opacity: 0.85 }]}
              disabled={!valid || busy}
              onPress={submit}
            >
              {busy ? (
                <ActivityIndicator color="#1A1410" />
              ) : (
                <Text style={s.primaryLabel}>{mode === 'signup' ? 'Create account' : 'Sign in'}</Text>
              )}
            </Pressable>

            <Pressable onPress={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
              <Text style={s.switchLabel}>
                {mode === 'signup' ? 'I already have an account →' : 'Create a new account →'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  kbWrap: { flex: 1, paddingHorizontal: 28 },
  head: { paddingTop: 12 },
  back: { color: theme.textMuted, fontSize: 15 },
  body: { flex: 1, justifyContent: 'center', paddingBottom: 32 },
  title: {
    color: theme.text,
    fontSize: 48,
    fontWeight: '300',
    fontFamily: theme.font.display,
    lineHeight: 52,
  },
  subtitle: { color: theme.textMuted, fontSize: 16, marginTop: 16, lineHeight: 22 },
  form: { gap: 12, marginTop: 32 },
  input: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.md,
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: theme.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  primary: {
    backgroundColor: theme.accent,
    paddingVertical: 18,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryDisabled: { opacity: 0.4 },
  primaryLabel: { color: '#1A1410', fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },
  switchLabel: { color: theme.textMuted, textAlign: 'center', paddingVertical: 14, fontSize: 14 },
});
