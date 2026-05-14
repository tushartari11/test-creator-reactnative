# Tailwind v4 & NativeWind Snippets

This reference is loaded by the `tailwind-expert` skill when the user needs
component patterns, animations, layout recipes, or dark mode examples.

---

## Table of Contents

1. [Button Variants](#1-button-variants)
2. [Card Component](#2-card-component)
3. [Input Field with Error State](#3-input-field-with-error-state)
4. [Badge / Chip](#4-badge--chip)
5. [Bottom Sheet Header](#5-bottom-sheet-header)
6. [Avatar with Fallback](#6-avatar-with-fallback)
7. [Skeleton Loader](#7-skeleton-loader)
8. [Tab Bar Item](#8-tab-bar-item)
9. [List Row](#9-list-row)
10. [Section Header](#10-section-header)
11. [Dark Mode Toggle](#11-dark-mode-toggle)
12. [Responsive Layout (Web)](#12-responsive-layout-web)
13. [Animation with Reanimated + Tailwind](#13-animation-with-reanimated--tailwind)
14. [Global Theme (@theme block)](#14-global-theme-theme-block)

---

## 1. Button Variants

```tsx
// src/components/Button.tsx
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary active:bg-primary-hover",
  secondary: "bg-transparent border border-primary",
  ghost: "bg-transparent",
  danger: "bg-danger active:opacity-80",
};

const labelClasses: Record<ButtonVariant, string> = {
  primary: "text-white",
  secondary: "text-primary",
  ghost: "text-primary",
  danger: "text-white",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-2",
  md: "px-4 py-3",
  lg: "px-6 py-4",
};

const labelSizeClasses: Record<ButtonSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export const Button = ({
  label,
  variant = "primary",
  size = "md",
  onPress,
  loading,
  disabled,
  fullWidth,
}: ButtonProps) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || loading}
    className={`
      rounded-lg items-center justify-center flex-row gap-2
      ${variantClasses[variant]}
      ${sizeClasses[size]}
      ${disabled || loading ? "opacity-40" : ""}
      ${fullWidth ? "w-full" : "self-start"}
    `}
  >
    {loading ? (
      <ActivityIndicator
        color={
          variant === "primary" || variant === "danger" ? "white" : undefined
        }
        size="small"
      />
    ) : (
      <Text
        className={`font-semibold ${labelSizeClasses[size]} ${labelClasses[variant]}`}
      >
        {label}
      </Text>
    )}
  </TouchableOpacity>
);
```

---

## 2. Card Component

```tsx
// src/components/Card.tsx
import { View } from "react-native";
import type { PropsWithChildren } from "react";

interface CardProps {
  className?: string;
  elevated?: boolean;
}

export const Card = ({
  children,
  className = "",
  elevated = false,
}: PropsWithChildren<CardProps>) => (
  <View
    className={`
      bg-surface rounded-xl p-4
      ${elevated ? "shadow-md" : "border border-gray-100"}
      ${className}
    `}
  >
    {children}
  </View>
);

// Usage
<Card elevated>
  <Text className="text-text font-semibold text-base">Product Title</Text>
  <Text className="text-text-muted text-sm mt-1">Category</Text>
  <Text className="text-primary font-bold text-lg mt-2">$49.99</Text>
</Card>;
```

---

## 3. Input Field with Error State

```tsx
// src/components/FormInput.tsx
import { TextInput, Text, View } from "react-native";
import type { TextInputProps } from "react-native";

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
}

export const FormInput = ({
  label,
  error,
  hint,
  ...inputProps
}: FormInputProps) => (
  <View className="mb-4">
    <Text className="text-text text-sm font-medium mb-1">{label}</Text>
    <TextInput
      className={`
        border rounded-lg px-4 py-3 text-text bg-surface text-base
        ${error ? "border-danger bg-red-50" : "border-gray-300 focus:border-primary"}
      `}
      placeholderTextColor="#9ca3af"
      {...inputProps}
    />
    {error && <Text className="text-danger text-xs mt-1">{error}</Text>}
    {hint && !error && (
      <Text className="text-text-muted text-xs mt-1">{hint}</Text>
    )}
  </View>
);
```

---

## 4. Badge / Chip

```tsx
// src/components/Badge.tsx
type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

const badgeClasses: Record<BadgeVariant, { container: string; text: string }> =
  {
    default: { container: "bg-gray-100", text: "text-gray-700" },
    success: { container: "bg-green-100", text: "text-green-700" },
    warning: { container: "bg-yellow-100", text: "text-yellow-700" },
    danger: { container: "bg-red-100", text: "text-red-700" },
    info: { container: "bg-blue-100", text: "text-blue-700" },
  };

export const Badge = ({
  label,
  variant = "default",
}: {
  label: string;
  variant?: BadgeVariant;
}) => {
  const styles = badgeClasses[variant];
  return (
    <View
      className={`self-start rounded-full px-2.5 py-0.5 ${styles.container}`}
    >
      <Text className={`text-xs font-medium ${styles.text}`}>{label}</Text>
    </View>
  );
};
```

---

## 5. Bottom Sheet Header

```tsx
// Drag handle + title for use with @gorhom/bottom-sheet or react-native-reanimated
export const BottomSheetHeader = ({ title }: { title: string }) => (
  <View className="items-center pt-3 pb-4 border-b border-gray-100">
    {/* Drag handle */}
    <View className="w-10 h-1 rounded-full bg-gray-300 mb-4" />
    <Text className="text-text text-base font-semibold">{title}</Text>
  </View>
);
```

---

## 6. Avatar with Fallback

```tsx
import { Image, Text, View } from "react-native";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-8 h-8 text-xs",
  md: "w-12 h-12 text-sm",
  lg: "w-16 h-16 text-base",
};
const imgSize = { sm: 32, md: 48, lg: 64 };

export const Avatar = ({ src, name, size = "md" }: AvatarProps) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (src) {
    return (
      <Image
        source={{ uri: src }}
        className={`rounded-full ${sizeMap[size].split(" ").slice(0, 2).join(" ")}`}
        width={imgSize[size]}
        height={imgSize[size]}
      />
    );
  }

  return (
    <View
      className={`rounded-full bg-primary items-center justify-center ${sizeMap[size].split(" ").slice(0, 2).join(" ")}`}
    >
      <Text
        className={`text-white font-semibold ${sizeMap[size].split(" ")[2]}`}
      >
        {initials}
      </Text>
    </View>
  );
};
```

---

## 7. Skeleton Loader

```tsx
// Animated shimmer skeleton — install: expo install react-native-reanimated
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";

const SkeletonBox = ({ className }: { className: string }) => {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.3, { duration: 800 }), -1, true);
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={animStyle}
      className={`bg-gray-200 rounded-md ${className}`}
    />
  );
};

export const ProductCardSkeleton = () => (
  <View className="bg-surface rounded-xl p-4 mb-3 border border-gray-100">
    <SkeletonBox className="h-4 w-3/4 mb-2" />
    <SkeletonBox className="h-3 w-1/2 mb-4" />
    <SkeletonBox className="h-5 w-1/3" />
  </View>
);
```

---

## 8. Tab Bar Item

```tsx
// Custom tab bar item with active indicator
interface TabItemProps {
  icon: string; // emoji or icon name
  label: string;
  isActive: boolean;
  onPress: () => void;
  badgeCount?: number;
}

export const TabItem = ({
  icon,
  label,
  isActive,
  onPress,
  badgeCount,
}: TabItemProps) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex-1 items-center justify-center py-2 relative"
  >
    <View className="relative">
      <Text className={`text-2xl ${isActive ? "" : "opacity-50"}`}>{icon}</Text>
      {badgeCount ? (
        <View className="absolute -top-1 -right-2 bg-danger rounded-full min-w-4 h-4 items-center justify-center px-1">
          <Text className="text-white text-xs font-bold">
            {badgeCount > 99 ? "99+" : badgeCount}
          </Text>
        </View>
      ) : null}
    </View>
    <Text
      className={`text-xs mt-0.5 ${isActive ? "text-primary font-semibold" : "text-text-muted"}`}
    >
      {label}
    </Text>
    {isActive && (
      <View className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
    )}
  </TouchableOpacity>
);
```

---

## 9. List Row

```tsx
// Reusable list row — like a settings or menu row
import { Text, TouchableOpacity, View } from "react-native";

interface ListRowProps {
  label: string;
  value?: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
}

export const ListRow = ({
  label,
  value,
  icon,
  onPress,
  showChevron = true,
  destructive,
}: ListRowProps) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex-row items-center px-4 py-3.5 bg-surface active:bg-gray-50"
    disabled={!onPress}
  >
    {icon && <View className="mr-3">{icon}</View>}
    <Text
      className={`flex-1 text-base ${destructive ? "text-danger" : "text-text"}`}
    >
      {label}
    </Text>
    {value && <Text className="text-text-muted text-sm mr-2">{value}</Text>}
    {showChevron && onPress && <Text className="text-gray-400">›</Text>}
  </TouchableOpacity>
);
```

---

## 10. Section Header

```tsx
export const SectionHeader = ({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) => (
  <View className="flex-row items-center justify-between px-4 py-2 bg-gray-50">
    <Text className="text-text-muted text-sm font-semibold uppercase tracking-wide">
      {title}
    </Text>
    {action && (
      <TouchableOpacity onPress={onAction}>
        <Text className="text-primary text-sm font-medium">{action}</Text>
      </TouchableOpacity>
    )}
  </View>
);
```

---

## 11. Dark Mode Toggle

```tsx
// src/components/DarkModeToggle.tsx
import { useColorScheme } from "nativewind";
import { Switch, Text, View } from "react-native";

export const DarkModeToggle = () => {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <Text className="text-text text-base">
        {isDark ? "🌙 Dark Mode" : "☀️ Light Mode"}
      </Text>
      <Switch
        value={isDark}
        onValueChange={toggleColorScheme}
        trackColor={{ false: "#d1d5db", true: "var(--color-primary)" }}
      />
    </View>
  );
};
```

---

## 12. Responsive Layout (Web / Next.js with Tailwind v4)

```tsx
// Web-only — NativeWind doesn't support responsive breakpoints
// Tailwind v4 keeps the same responsive prefix syntax

// Grid that stacks on mobile, goes 2-col on tablet, 3-col on desktop
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
  {products.map((p) => <ProductCard key={p.id} {...p} />)}
</div>

// Sidebar layout — stacks on mobile, side-by-side on desktop
<div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto p-4">
  <aside className="w-full lg:w-64 shrink-0">
    <FilterPanel />
  </aside>
  <main className="flex-1 min-w-0">
    <ProductGrid />
  </main>
</div>

// Custom breakpoint defined in @theme
// @theme { --breakpoint-xs: 480px; }
<div className="text-sm xs:text-base md:text-lg">Responsive text</div>
```

---

## 13. Animation with Reanimated + Tailwind

```tsx
// Fade-in animation on mount
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";

export const FadeIn = ({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    setTimeout(() => {
      opacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.quad),
      });
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    }, delay);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // Combine Reanimated style with NativeWind className
  return (
    <Animated.View style={style} className="w-full">
      {children}
    </Animated.View>
  );
};

// Press scale feedback
export const PressScale = ({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) => {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={style}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => {
          scale.value = withSpring(0.96);
        }}
        onPressOut={() => {
          scale.value = withSpring(1);
        }}
        onPress={onPress}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};
```

---

## 14. Global Theme (@theme block)

Complete production-ready `global.css` for a React Native / NativeWind project:

```css
/* global.css */
@import "tailwindcss";

@theme {
  /* === Primitive Palette === */
  --color-indigo-400: #818cf8;
  --color-indigo-500: #6366f1;
  --color-indigo-600: #4f46e5;
  --color-red-500: #ef4444;
  --color-green-500: #22c55e;
  --color-amber-500: #f59e0b;

  /* === Semantic Tokens (use these in components) === */
  --color-primary: var(--color-indigo-500);
  --color-primary-hover: var(--color-indigo-600);
  --color-primary-light: var(--color-indigo-400);
  --color-danger: var(--color-red-500);
  --color-success: var(--color-green-500);
  --color-warning: var(--color-amber-500);

  /* Light mode surfaces and text */
  --color-surface: #ffffff;
  --color-surface-raised: #f9fafb;
  --color-text: #111827;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;

  /* === Spacing === */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 40px;
  --spacing-2xl: 64px;

  /* === Typography === */
  --font-sans: "Inter", system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;

  /* === Radii === */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-pill: 9999px;
}

/* Dark mode — override surface and text tokens only */
@media (prefers-color-scheme: dark) {
  :root {
    --color-surface: #0f172a;
    --color-surface-raised: #1e293b;
    --color-text: #f1f5f9;
    --color-text-muted: #94a3b8;
    --color-border: #334155;
  }
}
```
