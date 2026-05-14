import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  TextInput,
  StyleSheet,
  Platform,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  BG: '#07091a',
  ELEVATED: '#0d1128',
  SURFACE: 'rgba(255,255,255,0.06)',
  BORDER: 'rgba(255,255,255,0.10)',
  BORDER_STRONG: 'rgba(255,255,255,0.20)',
  TEXT: '#f1f5f9',
  TEXT_SEC: '#94a3b8',
  ACCENT: '#6366f1',
  ACCENT_DARK: '#4f46e5',
  ACCENT_LIGHT: '#a5b4fc',
  SUCCESS: '#34d399',
  STAR: '#fbbf24',
} as const;

// Calistoga serif is loaded from Google Fonts in +html.tsx (web only)
const HEADING_FONT = Platform.OS === 'web' ? 'Calistoga, serif' : undefined;

// ─── Static Data ──────────────────────────────────────────────────────────────
const NAV_ITEMS = ['Features', 'How It Works', 'Testimonials'];

const FEATURES = [
  { icon: '📝', title: 'Create Tests', description: 'Build professional assessments with our intuitive test builder. Multiple question types supported.' },
  { icon: '🔗', title: 'Share Instantly', description: 'Share tests via link or access code with students worldwide. No student account required.' },
  { icon: '✅', title: 'Auto Grading', description: 'Save time with automatic grading and instant results delivered to your dashboard.' },
  { icon: '📊', title: 'Analytics Dashboard', description: 'Track performance with detailed analytics, item analysis, and class insights.' },
  { icon: '📚', title: 'Question Bank', description: 'Access thousands of pre-built questions or build your own searchable library.' },
  { icon: '🔒', title: 'Secure Exams', description: 'Advanced proctoring, tab-switch detection, and anti-cheat features for exam integrity.' },
];

const STEPS = [
  { num: '1', title: 'Create Your Test', desc: 'Build assessments with multiple question types in minutes using our intuitive editor.' },
  { num: '2', title: 'Share with Students', desc: 'Distribute via link or access code. No student account required for guest exams.' },
  { num: '3', title: 'Review Results', desc: 'Get instant analytics, grade distributions, and detailed performance insights.' },
];

const TESTIMONIALS = [
  {
    name: 'Sarah Johnson',
    role: 'High School Teacher',
    image: 'https://i.pravatar.cc/150?img=1',
    review: 'TestCreator has transformed how I assess my students. The auto-grading feature alone saves me hours every week!',
  },
  {
    name: 'Michael Chen',
    role: 'University Professor',
    image: 'https://i.pravatar.cc/150?img=3',
    review: 'The analytics dashboard gives me insights I never had before. I can identify struggling students early and adjust my teaching.',
  },
  {
    name: 'Emily Rodriguez',
    role: 'Corporate Trainer',
    image: 'https://i.pravatar.cc/150?img=5',
    review: "We use TestCreator for all our employee assessments. It's professional, reliable, and incredibly easy to use.",
  },
];

// ─── Blob Orb ─────────────────────────────────────────────────────────────────
type BlobOrbProps = {
  color: string;
  size: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  duration?: number;
  reverse?: boolean;
};

function BlobOrb({ color, size, top, left, right, bottom, duration = 20000, reverse = false }: BlobOrbProps) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sc = useSharedValue(1);
  const dir = reverse ? -1 : 1;

  useEffect(() => {
    tx.value = withRepeat(withTiming(dir * 35, { duration, easing: Easing.inOut(Easing.ease) }), -1, true);
    ty.value = withRepeat(withTiming(dir * -40, { duration: duration * 0.85, easing: Easing.inOut(Easing.ease) }), -1, true);
    sc.value = withRepeat(withTiming(1.07, { duration: duration * 0.5, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: sc.value }],
  }));

  const blobBg = Platform.OS === 'web'
    ? ({ backgroundImage: `radial-gradient(circle, ${color}, transparent 70%)` } as any)
    : { backgroundColor: color, opacity: 0.35 };

  return (
    <Animated.View
      style={[
        { position: 'absolute', width: size, height: size, borderRadius: size / 2, top, left, right, bottom },
        blobBg,
        animStyle,
      ]}
    />
  );
}

// ─── Pulse Dot ────────────────────────────────────────────────────────────────
function PulseDot() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.35, { duration: 1200, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.SUCCESS }, animStyle]} />;
}

// ─── Mock Test Card ───────────────────────────────────────────────────────────
function MockTestCard() {
  const floatY = useSharedValue(0);

  useEffect(() => {
    floatY.value = withRepeat(withTiming(-12, { duration: 3000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateY: floatY.value }] }));

  const glassExtra = Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)' } as any)
    : {};

  const progressFillStyle = Platform.OS === 'web'
    ? ({ backgroundImage: 'linear-gradient(90deg, #6366f1, #a78bfa)' } as any)
    : { backgroundColor: C.ACCENT };

  return (
    <Animated.View style={[styles.mockCard, glassExtra, animStyle]}>
      {/* Header */}
      <View style={styles.mockCardHeader}>
        <Text style={styles.mockCardTitle}>Mathematics Quiz</Text>
        <View style={styles.mockTimer}>
          <PulseDot />
          <Text style={styles.mockTimerText}> 23:45</Text>
        </View>
      </View>

      {/* Question */}
      <Text style={styles.mockQuestion}>If f(x) = x² + 2x − 3, find f(2)</Text>

      {/* Options */}
      {['A.  5', 'B.  7', 'C.  9'].map((opt, i) => (
        <View key={opt} style={[styles.mockOpt, i === 0 && styles.mockOptActive]}>
          <Text style={[styles.mockOptText, i === 0 && styles.mockOptTextActive]}>{opt}</Text>
        </View>
      ))}

      {/* Progress */}
      <View style={styles.mockProgressWrap}>
        <View style={styles.mockProgressTrack}>
          <View style={[styles.mockProgressFill, progressFillStyle]} />
        </View>
        <Text style={styles.mockProgressLabel}>Q 4 of 10</Text>
      </View>

      {/* Proctoring badge */}
      <View style={styles.proctorBadge}>
        <PulseDot />
        <Text style={styles.proctorText}> Proctoring Active</Text>
      </View>
    </Animated.View>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 1024;
  const isMediumScreen = width > 768;
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const headerGlass = Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as any)
    : {};

  const ctaGlow = Platform.OS === 'web'
    ? ({ backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(99,102,241,0.2), transparent)' } as any)
    : {};

  return (
    <View style={styles.container}>

      {/* ── HEADER ── */}
      <View style={[styles.header, isLargeScreen && styles.headerLarge, headerGlass]}>
        <View style={styles.headerInner}>
          <View style={styles.logo}>
            <Text style={styles.logoIcon}>📖</Text>
            <Text style={[styles.logoText, { fontFamily: HEADING_FONT }]}>TestCreator</Text>
          </View>

          {isMediumScreen && (
            <View style={styles.navLinks}>
              {NAV_ITEMS.map(item => (
                <TouchableOpacity key={item} style={styles.navItem}>
                  <Text style={styles.navText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginBtnText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.getStartedBtn} onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.getStartedBtnText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── SCROLL CONTENT ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── HERO ── */}
        <View style={[styles.hero, isLargeScreen && styles.heroLarge]}>
          {/* Animated background blobs */}
          <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
            <BlobOrb color="#4f46e5" size={600} top={-100} left={-150} duration={20000} />
            <BlobOrb color="#7c3aed" size={480} top={-40} right={-100} duration={24000} reverse />
            <BlobOrb color="#1d4ed8" size={380} bottom={-60} left={80} duration={17000} />
          </View>

          <View style={[styles.heroInner, isLargeScreen && styles.heroInnerLarge]}>
            {/* Left column */}
            <View style={[styles.heroLeft, isLargeScreen && styles.heroLeftLarge]}>
              <View style={styles.eyebrow}>
                <View style={styles.eyebrowDot} />
                <Text style={styles.eyebrowText}>Trusted by 5,000+ educators worldwide</Text>
              </View>

              <Text style={[styles.heroTitle, isLargeScreen && styles.heroTitleLarge, { fontFamily: HEADING_FONT }]}>
                Empower Learning,{'\n'}Transform Assessment
              </Text>

              <Text style={styles.heroSub}>
                Create, share, and analyze tests effortlessly. Professional proctoring, instant grading, and deep analytics — all in one platform.
              </Text>

              <View style={styles.heroButtons}>
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    Platform.OS === 'web' && ({ boxShadow: '0 0 24px rgba(99,102,241,0.4)' } as any),
                  ]}
                >
                  <Text style={styles.primaryBtnText}>Start Free Trial</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ghostBtn}>
                  <Text style={styles.ghostBtnText}>See How It Works</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Right column — mock test card, desktop only */}
            {isLargeScreen && (
              <View style={styles.heroRight}>
                <MockTestCard />
              </View>
            )}
          </View>
        </View>

        {/* ── FEATURES ── */}
        <View style={[styles.section, isLargeScreen && styles.sectionLarge]}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>WHAT WE OFFER</Text>
            <Text style={[styles.sectionTitle, isLargeScreen && styles.sectionTitleLarge, { fontFamily: HEADING_FONT }]}>
              Everything You Need to Succeed
            </Text>
            <Text style={styles.sectionSub}>
              A complete assessment platform built for educators at every level.
            </Text>
          </View>

          <View style={[styles.featureGrid, isLargeScreen && styles.featureGridLarge, isMediumScreen && !isLargeScreen && styles.featureGridMed]}>
            {FEATURES.map(f => {
              const isHovered = hoveredCard === f.title;
              const hoverStyle = Platform.OS === 'web' && isHovered
                ? ({ boxShadow: '0 20px 60px rgba(0,0,0,0.5)', transform: [{ translateY: -4 }] } as any)
                : {};
              const cardGlass = Platform.OS === 'web'
                ? ({ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', transition: 'all 0.25s ease' } as any)
                : {};
              return (
                <Pressable
                  key={f.title}
                  onHoverIn={() => setHoveredCard(f.title)}
                  onHoverOut={() => setHoveredCard(null)}
                  style={[
                    styles.featureCard,
                    isLargeScreen && styles.featureCardLarge,
                    isMediumScreen && !isLargeScreen && styles.featureCardMed,
                    cardGlass,
                    hoverStyle,
                  ]}
                >
                  <View style={styles.featureIconWrap}>
                    <Text style={styles.featureIconText}>{f.icon}</Text>
                  </View>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.description}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── HOW IT WORKS ── */}
        <View style={[styles.section, styles.sectionAlt, isLargeScreen && styles.sectionLarge]}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
            <Text style={[styles.sectionTitle, isLargeScreen && styles.sectionTitleLarge, { fontFamily: HEADING_FONT }]}>
              Up and Running in Minutes
            </Text>
          </View>

          <View style={[styles.stepsRow, isLargeScreen && styles.stepsRowLarge]}>
            {STEPS.map(s => (
              <View key={s.num} style={[styles.stepItem, isLargeScreen && styles.stepItemLarge]}>
                <View style={styles.stepCircle}>
                  <Text style={styles.stepNum}>{s.num}</Text>
                </View>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepDesc}>{s.desc}</Text>
              </View>
            ))}
          </View>

          {/* Stats */}
          <View style={[styles.statsRow, isLargeScreen && styles.statsRowLarge]}>
            {[['50K+', 'Educators'], ['1M+', 'Tests Created'], ['98%', 'Satisfaction']].map(([n, l]) => (
              <View key={l} style={styles.statItem}>
                <Text style={styles.statNum}>{n}</Text>
                <Text style={styles.statLabel}>{l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── TESTIMONIALS ── */}
        <View style={[styles.section, isLargeScreen && styles.sectionLarge]}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>TESTIMONIALS</Text>
            <Text style={[styles.sectionTitle, isLargeScreen && styles.sectionTitleLarge, { fontFamily: HEADING_FONT }]}>
              Loved by Educators Worldwide
            </Text>
          </View>

          <View style={[styles.testGrid, isLargeScreen && styles.testGridLarge]}>
            {TESTIMONIALS.map(t => {
              const cardGlass = Platform.OS === 'web'
                ? ({ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' } as any)
                : {};
              return (
                <View key={t.name} style={[styles.testCard, isLargeScreen && styles.testCardLarge, cardGlass]}>
                  <Text style={styles.quoteOpen}>❝</Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map(s => <Text key={s} style={styles.star}>★</Text>)}
                  </View>
                  <Text style={styles.reviewText}>{t.review}</Text>
                  <View style={styles.authorRow}>
                    <Image source={{ uri: t.image }} style={styles.authorImg} />
                    <View>
                      <Text style={styles.authorName}>{t.name}</Text>
                      <Text style={styles.authorRole}>{t.role}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── CTA ── */}
        <View style={[styles.ctaSection, isLargeScreen && styles.ctaSectionLarge, ctaGlow]}>
          <Text style={[styles.ctaTitle, isLargeScreen && styles.ctaTitleLarge, { fontFamily: HEADING_FONT }]}>
            Ready to Transform Your Assessments?
          </Text>
          <Text style={styles.ctaSub}>
            Join thousands of educators who trust TestCreator. Start your free trial today.
          </Text>
          <View style={[styles.emailRow, isLargeScreen && styles.emailRowLarge]}>
            <TextInput
              placeholder="Enter your email"
              placeholderTextColor="rgba(148,163,184,0.6)"
              style={styles.emailInput}
            />
            <TouchableOpacity style={styles.emailBtn}>
              <Text style={styles.emailBtnText}>Get Started</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.ctaNote}>Free 14-day trial. No credit card required.</Text>
        </View>

        {/* ── FOOTER ── */}
        <View style={[styles.footer, isLargeScreen && styles.footerLarge]}>
          <View style={[styles.footerTop, isLargeScreen && styles.footerTopLarge]}>
            <View style={styles.footerBrand}>
              <View style={styles.logo}>
                <Text style={styles.logoIcon}>📖</Text>
                <Text style={[styles.logoText, { fontFamily: HEADING_FONT }]}>TestCreator</Text>
              </View>
              <Text style={styles.footerDesc}>
                Empowering educators with modern, intelligent assessment tools.
              </Text>
            </View>

            {isLargeScreen && (
              <View style={styles.footerLinks}>
                {(
                  [
                    ['Product', ['Features', 'Pricing', 'Integrations', 'Changelog']],
                    ['Company', ['About', 'Blog', 'Careers', 'Press']],
                    ['Support', ['Help Center', 'Contact', 'Privacy', 'Terms']],
                  ] as [string, string[]][]
                ).map(([col, links]) => (
                  <View key={col} style={styles.footerCol}>
                    <Text style={styles.footerColHead}>{col}</Text>
                    {links.map(link => (
                      <Text key={link} style={styles.footerLink}>{link}</Text>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.footerBottom}>
            <Text style={styles.footerCopy}>© 2026 TestCreator. All rights reserved.</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.BG },

  // Header
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0, zIndex: 100,
    backgroundColor: 'rgba(7,9,26,0.85)',
    borderBottomWidth: 1,
    borderBottomColor: C.BORDER,
    paddingHorizontal: 16,
  },
  headerLarge: { paddingHorizontal: 64 },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 72,
  },
  logo: { flexDirection: 'row', alignItems: 'center' },
  logoIcon: { fontSize: 24 },
  logoText: { fontSize: 20, fontWeight: '700', marginLeft: 8, color: C.TEXT },
  navLinks: { flexDirection: 'row', alignItems: 'center', gap: 32 },
  navItem: { paddingVertical: 4 },
  navText: { fontSize: 15, color: C.TEXT_SEC, fontWeight: '500' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  loginBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: C.BORDER,
  },
  loginBtnText: { color: C.TEXT, fontWeight: '500', fontSize: 14 },
  getStartedBtn: {
    backgroundColor: C.ACCENT,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8,
  },
  getStartedBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 72 },

  // Hero
  hero: {
    minHeight: 600,
    paddingHorizontal: 24,
    paddingVertical: 80,
    overflow: 'hidden',
    position: 'relative',
  },
  heroLarge: { paddingHorizontal: 64, paddingVertical: 120, minHeight: 720 },
  heroInner: { position: 'relative', zIndex: 1 },
  heroInnerLarge: { flexDirection: 'row', alignItems: 'center', gap: 48 },
  heroLeft: {},
  heroLeftLarge: { flex: 1 },
  eyebrow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.SURFACE,
    borderRadius: 100, paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: C.BORDER,
    alignSelf: 'flex-start', marginBottom: 24,
  },
  eyebrowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.SUCCESS, marginRight: 8 },
  eyebrowText: { color: C.TEXT_SEC, fontSize: 13, fontWeight: '500' },
  heroTitle: {
    fontSize: 36, fontWeight: '800', color: C.TEXT,
    marginBottom: 20, lineHeight: 44,
  },
  heroTitleLarge: { fontSize: 52, lineHeight: 62 },
  heroSub: { fontSize: 17, color: C.TEXT_SEC, lineHeight: 28, marginBottom: 36 },
  heroButtons: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  primaryBtn: {
    backgroundColor: C.ACCENT,
    paddingHorizontal: 28, paddingVertical: 16, borderRadius: 10,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  ghostBtn: {
    backgroundColor: C.SURFACE,
    borderWidth: 1, borderColor: C.BORDER,
    paddingHorizontal: 28, paddingVertical: 15, borderRadius: 10,
  },
  ghostBtnText: { color: C.TEXT, fontWeight: '600', fontSize: 16 },
  heroRight: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingLeft: 24 },

  // Mock Card
  mockCard: {
    backgroundColor: C.SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    padding: 20,
    maxWidth: 360,
    width: '100%',
    ...Platform.select({
      web: { boxShadow: '0 16px 40px rgba(0,0,0,0.5)' } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.5,
        shadowRadius: 40,
        elevation: 16,
      },
    }),
  },
  mockCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  mockCardTitle: { fontSize: 15, fontWeight: '600', color: C.TEXT },
  mockTimer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(52,211,153,0.15)',
    borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)',
  },
  mockTimerText: { color: C.SUCCESS, fontSize: 13, fontWeight: '600' },
  mockQuestion: { fontSize: 14, color: C.TEXT, lineHeight: 22, marginBottom: 14 },
  mockOpt: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8, borderWidth: 1, borderColor: C.BORDER,
    paddingHorizontal: 12, paddingVertical: 9, marginBottom: 8,
  },
  mockOptActive: { backgroundColor: 'rgba(99,102,241,0.2)', borderColor: 'rgba(99,102,241,0.5)' },
  mockOptText: { fontSize: 13, color: C.TEXT_SEC },
  mockOptTextActive: { color: C.ACCENT_LIGHT, fontWeight: '600' },
  mockProgressWrap: { marginTop: 4, marginBottom: 10 },
  mockProgressTrack: {
    height: 4, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2, overflow: 'hidden', marginBottom: 6,
  },
  mockProgressFill: { height: 4, width: '40%', borderRadius: 2 },
  mockProgressLabel: { fontSize: 11, color: C.TEXT_SEC, textAlign: 'right' },
  proctorBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(52,211,153,0.1)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.2)',
    alignSelf: 'flex-start',
  },
  proctorText: { fontSize: 12, color: C.SUCCESS, fontWeight: '500' },

  // Sections
  section: { paddingVertical: 80, paddingHorizontal: 24 },
  sectionLarge: { paddingVertical: 104, paddingHorizontal: 64 },
  sectionAlt: { backgroundColor: 'rgba(13,17,40,0.8)' },
  sectionHead: { alignItems: 'center', marginBottom: 56 },
  sectionLabel: {
    color: C.ACCENT_LIGHT, fontWeight: '600', fontSize: 12,
    letterSpacing: 1.5, marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 30, fontWeight: '700', color: C.TEXT,
    textAlign: 'center', marginBottom: 16,
  },
  sectionTitleLarge: { fontSize: 40 },
  sectionSub: {
    fontSize: 16, color: C.TEXT_SEC, textAlign: 'center',
    maxWidth: 520, lineHeight: 26,
  },

  // Features
  featureGrid: { gap: 16 },
  featureGridLarge: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, justifyContent: 'center' },
  featureGridMed: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  featureCard: {
    backgroundColor: C.SURFACE,
    borderRadius: 16, borderWidth: 1, borderColor: C.BORDER,
    padding: 24,
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.3)' } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  },
  featureCardLarge: { width: '30%', minWidth: 260 },
  featureCardMed: { width: '47%' },
  featureIconWrap: {
    width: 48, height: 48, borderRadius: 10,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  featureIconText: { fontSize: 22 },
  featureTitle: { fontSize: 17, fontWeight: '600', color: C.TEXT, marginBottom: 8 },
  featureDesc: { fontSize: 14, color: C.TEXT_SEC, lineHeight: 22 },

  // Steps
  stepsRow: { gap: 32, marginBottom: 56 },
  stepsRowLarge: { flexDirection: 'row', gap: 0, marginBottom: 64 },
  stepItem: { alignItems: 'center' },
  stepItemLarge: { flex: 1, paddingHorizontal: 24 },
  stepCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 2, borderColor: C.ACCENT,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  stepNum: { fontSize: 20, fontWeight: '700', color: C.ACCENT },
  stepTitle: { fontSize: 16, fontWeight: '600', color: C.TEXT, textAlign: 'center', marginBottom: 8 },
  stepDesc: { fontSize: 14, color: C.TEXT_SEC, textAlign: 'center', lineHeight: 22 },

  // Stats
  statsRow: { gap: 24 },
  statsRowLarge: { flexDirection: 'row', justifyContent: 'center', gap: 80 },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 36, fontWeight: '800', color: C.ACCENT },
  statLabel: { fontSize: 14, color: C.TEXT_SEC, marginTop: 4 },

  // Testimonials
  testGrid: { gap: 16 },
  testGridLarge: { flexDirection: 'row', gap: 24 },
  testCard: {
    backgroundColor: C.SURFACE,
    borderRadius: 16, borderWidth: 1, borderColor: C.BORDER,
    padding: 24,
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.3)' } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  },
  testCardLarge: { flex: 1 },
  quoteOpen: { fontSize: 40, color: C.ACCENT, lineHeight: 40, marginBottom: 8 },
  starsRow: { flexDirection: 'row', marginBottom: 12 },
  star: { color: C.STAR, fontSize: 16 },
  reviewText: { fontSize: 14, color: C.TEXT_SEC, lineHeight: 24, fontStyle: 'italic', marginBottom: 20 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  authorImg: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: C.BORDER_STRONG },
  authorName: { fontSize: 14, fontWeight: '600', color: C.TEXT },
  authorRole: { fontSize: 12, color: C.TEXT_SEC },

  // CTA
  ctaSection: {
    backgroundColor: C.ELEVATED,
    paddingVertical: 80, paddingHorizontal: 24,
    alignItems: 'center',
    borderTopWidth: 1, borderTopColor: C.BORDER,
  },
  ctaSectionLarge: { paddingVertical: 104, paddingHorizontal: 64 },
  ctaTitle: { fontSize: 30, fontWeight: '700', color: C.TEXT, textAlign: 'center', marginBottom: 16 },
  ctaTitleLarge: { fontSize: 40 },
  ctaSub: {
    fontSize: 16, color: C.TEXT_SEC, textAlign: 'center',
    marginBottom: 40, maxWidth: 500, lineHeight: 26,
  },
  emailRow: {
    flexDirection: 'row',
    backgroundColor: C.SURFACE,
    borderRadius: 12, borderWidth: 1, borderColor: C.BORDER,
    overflow: 'hidden', width: '100%', maxWidth: 480, marginBottom: 16,
  },
  emailRowLarge: { width: 480 },
  emailInput: { flex: 1, paddingHorizontal: 20, paddingVertical: 16, fontSize: 15, color: C.TEXT },
  emailBtn: { backgroundColor: C.ACCENT, paddingHorizontal: 24, justifyContent: 'center' },
  emailBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  ctaNote: { color: C.TEXT_SEC, fontSize: 13 },

  // Footer
  footer: {
    backgroundColor: C.ELEVATED,
    paddingTop: 56, paddingHorizontal: 24,
    borderTopWidth: 1, borderTopColor: C.BORDER,
  },
  footerLarge: { paddingTop: 72, paddingHorizontal: 64 },
  footerTop: { gap: 40 },
  footerTopLarge: { flexDirection: 'row', justifyContent: 'space-between', gap: 64 },
  footerBrand: { maxWidth: 300 },
  footerDesc: { color: C.TEXT_SEC, fontSize: 14, lineHeight: 22, marginTop: 16 },
  footerLinks: { flexDirection: 'row', gap: 48 },
  footerCol: { gap: 10 },
  footerColHead: { color: C.TEXT, fontWeight: '600', fontSize: 13, marginBottom: 4 },
  footerLink: { color: C.TEXT_SEC, fontSize: 13 },
  footerBottom: {
    borderTopWidth: 1, borderTopColor: C.BORDER,
    marginTop: 48, paddingVertical: 24, alignItems: 'center',
  },
  footerCopy: { color: C.TEXT_SEC, fontSize: 13 },
});
