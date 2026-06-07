import { router } from 'expo-router';
import { useRef, useState } from 'react';
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

type Role = 'TEACHER' | 'STUDENT' | '';

export default function RegisterScreen() {
  const { width } = useWindowDimensions();
  const isMedium = width > 768;
  const { register } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  async function handleSubmit() {
    setError('');
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword || !role) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await register(firstName.trim(), lastName.trim(), email.trim(), password, role);
      router.replace(role === 'TEACHER' ? '/(teacher)/dashboard' : '/(student)/dashboard');
    } catch (e: unknown) {
      setError((e as Error).message || 'Registration failed. Please try again.');
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
        <View style={[styles.card, isMedium && styles.cardMedium]} testID="register-card">
          {/* Header */}
          <View style={styles.cardHeader}>
            <Text style={styles.heading} testID="register-heading">Create Account</Text>
            <Text style={styles.subheading}>Join TestCreator today</Text>
          </View>
          <View style={styles.divider} />

          {/* Body */}
          <View style={styles.cardBody}>
            {/* Name row */}
            <View style={[styles.nameRow, isMedium && styles.nameRowMedium]}>
              <View style={[styles.field, isMedium && styles.fieldHalf]}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  testID="register-first-name"
                  style={styles.input}
                  placeholder="John"
                  placeholderTextColor={C.TEXT_SEC}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>
              <View style={[styles.field, isMedium && styles.fieldHalf]}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  ref={lastNameRef}
                  testID="register-last-name"
                  style={styles.input}
                  placeholder="Doe"
                  placeholderTextColor={C.TEXT_SEC}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                ref={emailRef}
                testID="register-email"
                style={styles.input}
                placeholder="john@example.com"
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
                testID="register-password"
                style={styles.input}
                placeholder="At least 8 characters"
                placeholderTextColor={C.TEXT_SEC}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                ref={confirmRef}
                testID="register-confirm-password"
                style={styles.input}
                placeholder="Confirm your password"
                placeholderTextColor={C.TEXT_SEC}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>

            {/* Role selector */}
            <View style={styles.field}>
              <Text style={styles.label}>I am a...</Text>
              <View style={styles.roleRow}>
                <TouchableOpacity
                  testID="register-role-teacher"
                  style={[styles.roleBtn, role === 'TEACHER' && styles.roleBtnActive]}
                  onPress={() => setRole('TEACHER')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.roleBtnTitle, role === 'TEACHER' && styles.roleBtnTitleActive]}>
                    Teacher
                  </Text>
                  <Text style={[styles.roleBtnSub, role === 'TEACHER' && styles.roleBtnSubActive]}>
                    Create and manage tests
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="register-role-student"
                  style={[styles.roleBtn, role === 'STUDENT' && styles.roleBtnActive]}
                  onPress={() => setRole('STUDENT')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.roleBtnTitle, role === 'STUDENT' && styles.roleBtnTitleActive]}>
                    Student
                  </Text>
                  <Text style={[styles.roleBtnSub, role === 'STUDENT' && styles.roleBtnSubActive]}>
                    Take tests
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              testID="register-submit"
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>Create Account</Text>
              }
            </TouchableOpacity>

            {!!error && <Text testID="register-error" style={styles.errorText}>{error}</Text>}

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.orLine} />
            </View>

            <Text style={styles.footerText}>
              Already have an account?{' '}
              <Text style={styles.link} onPress={() => router.push('/(auth)/login')}>
                Sign in
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
    paddingVertical: 64,
  },
  card: {
    width: '100%',
    maxWidth: 440,
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
    maxWidth: 480,
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
  nameRow: {
    gap: 12,
  },
  nameRowMedium: {
    flexDirection: 'row',
  },
  field: {
    marginBottom: 20,
  },
  fieldHalf: {
    flex: 1,
    marginBottom: 0,
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
  roleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.BORDER,
    borderRadius: 10,
    padding: 14,
    backgroundColor: C.SURFACE,
  },
  roleBtnActive: {
    borderColor: C.ACCENT,
    backgroundColor: 'rgba(99,102,241,0.12)',
  },
  roleBtnTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.TEXT_SEC,
    marginBottom: 4,
  },
  roleBtnTitleActive: {
    color: C.ACCENT_LIGHT,
  },
  roleBtnSub: {
    fontSize: 12,
    color: C.TEXT_SEC,
  },
  roleBtnSubActive: {
    color: C.TEXT_SEC,
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
