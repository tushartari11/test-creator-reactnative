import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { GuestAPI, GuestTestDetailDTO, TestAttemptDTO } from '../../src/lib/api';
import { C } from '../../src/lib/theme';

export default function GuestPreview() {
  const { guestToken } = useLocalSearchParams<{ guestToken: string }>();

  const [detail, setDetail] = useState<GuestTestDetailDTO | null>(null);
  const [guestName, setGuestName] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!guestToken) { setError('Missing session token.'); setLoadingDetail(false); return; }
    GuestAPI.getTestDetail(guestToken)
      .then(setDetail)
      .catch(e => setError((e as Error).message || 'Failed to load test details.'))
      .finally(() => setLoadingDetail(false));
  }, [guestToken]);

  async function handleStartTest() {
    if (!guestToken || !guestName.trim()) return;
    setStarting(true);
    setError('');
    try {
      const attempt: TestAttemptDTO = await GuestAPI.startAttempt(guestToken, guestName.trim());
      router.replace({
        pathname: '/(guest)/test',
        params: {
          attemptId: String(attempt.id),
          guestToken,
          attemptData: JSON.stringify(attempt),
        },
      });
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to start test. The link may have expired.');
      setStarting(false);
    }
  }

  if (loadingDetail) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={C.ACCENT} size="large" />
      </View>
    );
  }

  if (error && !detail) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(guest)' as any)}>
          <Text style={styles.backBtnText}>Try Another Code</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.root} contentContainerStyle={styles.inner}>
        <View style={styles.card}>
          <Text style={styles.heading}>{detail?.title ?? 'Loading…'}</Text>
          {detail?.description ? (
            <Text style={styles.description}>{detail.description}</Text>
          ) : null}

          <View style={styles.infoRow}>
            <InfoBadge label="Questions" value={String(detail?.totalQuestions ?? '—')} />
            <InfoBadge label="Duration" value={`${detail?.durationMinutes ?? '—'} min`} />
            <InfoBadge label="Pass Mark" value={`${detail?.passingScore ?? '—'}%`} />
          </View>

          <Text style={styles.fieldLabel}>Your Name</Text>
          <TextInput
            style={[styles.input, !!error && styles.inputError]}
            value={guestName}
            onChangeText={t => { setGuestName(t); setError(''); }}
            placeholder="Enter your full name"
            placeholderTextColor={C.TEXT_SEC}
            autoCapitalize="words"
            returnKeyType="go"
            onSubmitEditing={handleStartTest}
            editable={!starting}
          />

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.startBtn, (!guestName.trim() || starting) && styles.startBtnDisabled]}
            onPress={handleStartTest}
            disabled={!guestName.trim() || starting}
            activeOpacity={0.8}
          >
            {starting
              ? <ActivityIndicator color="#07091a" />
              : <Text style={styles.startBtnText}>Start Test</Text>
            }
          </TouchableOpacity>

          <Text style={styles.note}>
            Once you start, the timer will begin. Make sure you have a stable internet connection.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InfoBadge({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoBadge}>
      <Text style={styles.infoBadgeValue}>{value}</Text>
      <Text style={styles.infoBadgeLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.BG },
  inner: { padding: 24, alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
  centered: { flex: 1, backgroundColor: C.BG, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: C.ELEVATED,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.BORDER,
    padding: 28,
    ...Platform.select({
      web: { boxShadow: '0 8px 32px rgba(0,0,0,0.5)' } as object,
      default: { elevation: 8 },
    }),
  },
  heading: { fontSize: 22, fontWeight: '700', color: C.TEXT, marginBottom: 10, textAlign: 'center' },
  description: { fontSize: 14, color: C.TEXT_SEC, lineHeight: 20, marginBottom: 20, textAlign: 'center' },
  infoRow: { flexDirection: 'row', gap: 10, marginBottom: 24, justifyContent: 'center', flexWrap: 'wrap' },
  infoBadge: {
    backgroundColor: C.BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.BORDER,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 90,
  },
  infoBadgeValue: { fontSize: 18, fontWeight: '700', color: C.ACCENT, marginBottom: 2 },
  infoBadgeLabel: { fontSize: 11, color: C.TEXT_SEC, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  fieldLabel: { fontSize: 13, color: C.TEXT_SEC, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: C.BG,
    borderWidth: 1,
    borderColor: C.BORDER_STRONG,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: C.TEXT,
    marginBottom: 8,
  },
  inputError: { borderColor: C.DANGER },
  errorText: { color: C.DANGER, fontSize: 13, marginBottom: 12 },
  startBtn: {
    backgroundColor: C.SUCCESS,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText: { fontSize: 16, fontWeight: '700', color: '#07091a' },
  note: { fontSize: 12, color: C.TEXT_SEC, textAlign: 'center', lineHeight: 18 },
  backBtn: {
    backgroundColor: C.ELEVATED,
    borderWidth: 1,
    borderColor: C.BORDER_STRONG,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backBtnText: { fontSize: 14, fontWeight: '600', color: C.TEXT },
});
