import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { useAuth } from '../../src/lib/auth';
import { C } from '../../src/lib/theme';

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const isMedium = width > 768;
  const { login, isLoggedIn, isTeacher } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isLoggedIn) {
      router.replace(isTeacher ? '/(teacher)/dashboard' : '/(student)/dashboard');
    }
  }, [isLoggedIn]);

  async function handleSubmit() {
    setError('');
    if (!email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e: unknown) {
      setError((e as Error).message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, isMedium && styles.scrollMedium]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, isMedium && styles.cardMedium]}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <Text style={styles.heading}>Welcome Back</Text>
            <Text style={styles.subheading}>Sign in to your account</Text>
          </View>
          <View style={styles.divider} />

          {/* Body */}
          <View style={styles.cardBody}>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={C.TEXT_SEC}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={C.TEXT_SEC}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>Sign In</Text>
              }
            </TouchableOpacity>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.orLine} />
            </View>

            <Text style={styles.footerText}>
              Don&apos;t have an account?{' '}
              <Text style={styles.link} onPress={() => router.push('/(auth)/register')}>
                Create one
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.BG,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  scrollMedium: {
    paddingVertical: 80,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: C.ELEVATED,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.BORDER,
    ...Platform.select({
      web: { boxShadow: '0 8px 32px rgba(0,0,0,0.5)' } as object,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
        elevation: 12,
      },
    }),
  },
  cardMedium: {
    maxWidth: 440,
  },
  cardHeader: {
    paddingHorizontal: 28,
    paddingVertical: 24,
    alignItems: 'center',
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: C.TEXT,
    marginBottom: 6,
  },
  subheading: {
    fontSize: 14,
    color: C.TEXT_SEC,
  },
  divider: {
    height: 1,
    backgroundColor: C.BORDER,
  },
  cardBody: {
    paddingHorizontal: 28,
    paddingVertical: 28,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: C.TEXT,
    marginBottom: 8,
  },
  input: {
    backgroundColor: C.SURFACE,
    borderWidth: 1,
    borderColor: C.BORDER,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.TEXT,
  },
  submitBtn: {
    backgroundColor: C.ACCENT,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: C.DANGER,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.BORDER,
  },
  orText: {
    color: C.TEXT_SEC,
    fontSize: 13,
  },
  footerText: {
    color: C.TEXT_SEC,
    fontSize: 14,
    textAlign: 'center',
  },
  link: {
    color: C.ACCENT_LIGHT,
    fontWeight: '500',
  },
});
