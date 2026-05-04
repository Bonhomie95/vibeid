import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../lib/theme';
import { vibeApi, ApiException } from '../lib/api';

export default function CaptureScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Reading your vibe…');

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Enable camera in Settings to take a selfie.');
      return;
    }
    const r = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
      cameraType: ImagePicker.CameraType.front,
    });
    if (!r.canceled && r.assets[0]?.base64) {
      await analyze(r.assets[0].base64, r.assets[0].mimeType);
    }
  }

  async function pickFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo access needed', 'Enable photo access in Settings to upload.');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (!r.canceled && r.assets[0]?.base64) {
      await analyze(r.assets[0].base64, r.assets[0].mimeType);
    }
  }

  async function analyze(base64: string, mime?: string) {
    try {
      setLoading(true);
      setLoadingLabel('Reading your vibe…');
      const labels = [
        'Reading your vibe…',
        'Looking past the surface…',
        'Naming what you already are…',
      ];
      let idx = 0;
      const tick = setInterval(() => {
        idx = (idx + 1) % labels.length;
        setLoadingLabel(labels[idx]);
      }, 1800);
      const r = await vibeApi.analyze(base64, mime);
      clearInterval(tick);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: '/result/[id]', params: { id: r.result.id } });
    } catch (e: unknown) {
      const err = e as ApiException;
      if (err.code === 'quota_exceeded') {
        Alert.alert(
          'Daily vibe used',
          err.message + '\n\nUpgrade to Premium for unlimited reads.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Could not read your vibe', err.message || 'Try again in a moment.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={s.loading}>
        <ActivityIndicator color={theme.accent} size="large" />
        <Text style={s.loadingLabel}>{loadingLabel}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.head}>
        <Pressable onPress={() => router.back()} hitSlop={20}>
          <Text style={s.back}>← back</Text>
        </Pressable>
      </View>

      <View style={s.body}>
        <Text style={s.title}>Show us{'\n'}your face</Text>
        <Text style={s.subtitle}>Front-facing camera, even light, no filter. Trust us.</Text>

        <View style={s.actions}>
          <Pressable style={({ pressed }) => [s.bigBtn, pressed && { opacity: 0.85 }]} onPress={pickFromCamera}>
            <Text style={s.bigBtnLabel}>Take selfie</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.bigBtn, s.bigBtnGhost, pressed && { opacity: 0.7 }]}
            onPress={pickFromLibrary}
          >
            <Text style={[s.bigBtnLabel, s.bigBtnLabelGhost]}>Upload from library</Text>
          </Pressable>
        </View>
      </View>

      <Text style={s.foot}>One vibe per day on the free plan.</Text>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 28 },
  head: { paddingTop: 12 },
  back: { color: theme.textMuted, fontSize: 15 },
  body: { flex: 1, justifyContent: 'center', gap: 24 },
  title: {
    color: theme.text,
    fontSize: 48,
    fontWeight: '300',
    fontFamily: theme.font.display,
    lineHeight: 52,
  },
  subtitle: { color: theme.textMuted, fontSize: 17, lineHeight: 24 },
  actions: { gap: 12, marginTop: 24 },
  bigBtn: {
    backgroundColor: theme.accent,
    paddingVertical: 18,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
  },
  bigBtnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.borderStrong,
  },
  bigBtnLabel: { color: '#1A1410', fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
  bigBtnLabelGhost: { color: theme.text },
  foot: { color: theme.textFaint, fontSize: 12, textAlign: 'center', paddingBottom: 16 },
  loading: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  loadingLabel: {
    color: theme.textMuted,
    fontSize: 17,
    fontFamily: theme.font.display,
    fontStyle: 'italic',
  },
});
