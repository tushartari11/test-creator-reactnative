import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { GuestAPI } from '../../src/lib/api';
import { C } from '../../src/lib/theme';

export default function GuestEntry() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleContinue() {
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      const access = await GuestAPI.validateAccessCode(trimmed);
      router.push({
        pathname: '/(guest)/preview',
        params: { guestToken: access.guestToken, testTitle: access.testTitle },
      });
    } catch (e: unknown) {
      setError((e as Error).message || 'Invalid access code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={styles.heading}>Enter Access Code</Text>
        <Text style={styles.subheading}>
          Get the code from your teacher to start your test.
        </Text>

        <TextInput
          style={[styles.input, !!error && styles.inputError]}
          value={code}
          onChangeText={t => { setCode(t); setError(''); }}
          placeholder="e.g. ABC123"
          placeholderTextColor={C.TEXT_SEC}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={handleContinue}
          editable={!loading}
        />

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.btn, (!code.trim() || loading) && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!code.trim() || loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Continue</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/')} activeOpacity={0.7}>
          <Text style={styles.backLink}>← Back to home</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.BG,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: C.ELEVATED,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.BORDER,
    padding: 32,
    alignItems: 'stretch',
    ...Platform.select({
      web: { boxShadow: '0 8px 32px rgba(0,0,0,0.5)' } as object,
      default: { elevation: 8 },
    }),
  },
  heading: { fontSize: 24, fontWeight: '700', color: C.TEXT, marginBottom: 8, textAlign: 'center' },
  subheading: { fontSize: 14, color: C.TEXT_SEC, textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  input: {
    backgroundColor: C.BG,
    borderWidth: 1,
    borderColor: C.BORDER_STRONG,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: '700',
    color: C.TEXT,
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 8,
  },
  inputError: { borderColor: C.DANGER },
  errorText: { color: C.DANGER, fontSize: 13, textAlign: 'center', marginBottom: 12 },
  btn: {
    backgroundColor: C.ACCENT,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  backLink: { color: C.TEXT_SEC, fontSize: 14, textAlign: 'center' },
});
