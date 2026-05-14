# React Native Design Patterns — Code Examples

This reference is loaded by the `react-native-mentor` skill when the user asks about
design patterns, component architecture, or how to structure specific features.

Patterns are drawn from _Hands-On Design Patterns with React Native_ (Grzesiukiewicz)
and _React Native Cookbook, 2nd Ed._ (Ward), updated for modern hooks and TypeScript.

---

## Table of Contents

1. [Presentational / Container Pattern](#1-presentational--container-pattern)
2. [Higher-Order Component (HOC)](#2-higher-order-component-hoc)
3. [Custom Hook Pattern](#3-custom-hook-pattern)
4. [Render Props Pattern](#4-render-props-pattern)
5. [Compound Component Pattern](#5-compound-component-pattern)
6. [Provider Pattern (Context)](#6-provider-pattern-context)
7. [Observer Pattern with Zustand](#7-observer-pattern-with-zustand)
8. [Repository Pattern for API Layer](#8-repository-pattern-for-api-layer)
9. [Flux / Redux Pattern](#9-flux--redux-pattern)
10. [Error Boundary Pattern](#10-error-boundary-pattern)
11. [Conditional Rendering Patterns](#11-conditional-rendering-patterns)
12. [List Virtualisation Pattern](#12-list-virtualisation-pattern)
13. [Navigation Patterns](#13-navigation-patterns)
14. [Form Pattern with Validation](#14-form-pattern-with-validation)
15. [Optimistic Update Pattern](#15-optimistic-update-pattern)

---

## 1. Presentational / Container Pattern

**What it is**: Separate _what to render_ (Presentational) from _how data is fetched and managed_
(Container). Directly equivalent to the Spring MVC split between `@Controller` (presentation)
and `@Service` (logic).

```tsx
// ---- Presentational Component ----
// Pure, stateless, receives everything via props. Easy to test and reuse.
// src/components/ProductCard.tsx

interface ProductCardProps {
  name: string;
  price: number;
  category: string;
  onPress: () => void;
}

export const ProductCard = ({
  name,
  price,
  category,
  onPress,
}: ProductCardProps) => (
  <TouchableOpacity
    className="bg-surface rounded-lg p-4 mb-3 shadow-sm active:opacity-70"
    onPress={onPress}
  >
    <Text className="text-text font-semibold text-base">{name}</Text>
    <Text className="text-text-muted text-sm mt-1">{category}</Text>
    <Text className="text-primary font-bold text-lg mt-2">
      ${price.toFixed(2)}
    </Text>
  </TouchableOpacity>
);

// ---- Container Component ----
// Owns data fetching and business logic. Renders the presentational component.
// src/screens/ProductListScreen.tsx

import { useProducts } from "../hooks/useProducts";
import { ProductCard } from "../components/ProductCard";

export const ProductListScreen = () => {
  const { data, isLoading, isError } = useProducts();
  const navigation = useNavigation();

  if (isLoading) return <ActivityIndicator className="flex-1 justify-center" />;
  if (isError)
    return <Text className="text-danger p-4">Failed to load products.</Text>;

  return (
    <FlatList
      data={data?.content}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ProductCard
          name={item.name}
          price={item.price}
          category={item.category}
          onPress={() => navigation.navigate("ProductDetail", { id: item.id })}
        />
      )}
    />
  );
};
```

---

## 2. Higher-Order Component (HOC)

**What it is**: A function that takes a component and returns an enhanced version. Equivalent to
a Spring AOP `@Aspect` that wraps behaviour around a target without modifying it.

```tsx
// src/hoc/withAuth.tsx
// Wraps any screen and redirects to login if no JWT is present.

import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { isAuthenticated } from "../api/auth";

export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
) {
  return function AuthGuard(props: P) {
    const [checking, setChecking] = useState(true);
    const [authed, setAuthed] = useState(false);
    const navigation = useNavigation();

    useEffect(() => {
      isAuthenticated().then((ok) => {
        if (!ok) navigation.navigate("Login" as never);
        else {
          setAuthed(true);
        }
        setChecking(false);
      });
    }, []);

    if (checking)
      return (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      );
    if (!authed) return null;
    return <WrappedComponent {...props} />;
  };
}

// Usage
export const ProfileScreen = withAuth(() => {
  return (
    <View>
      <Text>Protected Profile</Text>
    </View>
  );
});
```

---

## 3. Custom Hook Pattern

**What it is**: Extract stateful logic into a reusable function. The mobile equivalent of a
Spring `@Service` — encapsulates a concern, hides implementation, exposes a clean interface.

```tsx
// src/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

// src/hooks/useProductSearch.ts
// Composes multiple hooks — like a Spring service calling other services.
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';
import { searchProducts } from '../api/products';

export function useProductSearch(query: string) {
  const debouncedQuery = useDebounce(query, 300);

  return useQuery({
    queryKey: ['products', 'search', debouncedQuery],
    queryFn: () => searchProducts(debouncedQuery),
    enabled: debouncedQuery.length > 1,
  });
}

// Usage in a screen
const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const { data, isLoading } = useProductSearch(query);

  return (
    <View className="flex-1 p-4">
      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
        placeholder="Search products..."
        value={query}
        onChangeText={setQuery}
      />
      {isLoading && <ActivityIndicator />}
      <FlatList data={data} keyExtractor={(i) => i.id} renderItem={...} />
    </View>
  );
};
```

---

## 4. Render Props Pattern

**What it is**: A component receives a function as a prop and calls it to render its output.
Useful for sharing behaviour while keeping rendering flexible. Analogy: a Spring `@Template`
method that lets subclasses fill in the render step.

```tsx
// src/components/DataLoader.tsx
// Reusable loading/error wrapper — takes a render prop for the success case.

interface DataLoaderProps<T> {
  isLoading: boolean;
  isError: boolean;
  data: T | undefined;
  renderData: (data: T) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
}

export function DataLoader<T>({
  isLoading,
  isError,
  data,
  renderData,
  renderEmpty,
}: DataLoaderProps<T>) {
  if (isLoading) return <ActivityIndicator className="py-8" />;
  if (isError)
    return (
      <Text className="text-danger text-center py-8">
        Something went wrong.
      </Text>
    );
  if (!data) return renderEmpty ? renderEmpty() : null;
  return <>{renderData(data)}</>;
}

// Usage
const ProductListScreen = () => {
  const { data, isLoading, isError } = useProducts();

  return (
    <DataLoader
      isLoading={isLoading}
      isError={isError}
      data={data?.content}
      renderEmpty={() => (
        <Text className="text-center text-muted">No products found.</Text>
      )}
      renderData={(products) => (
        <FlatList
          data={products}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <ProductCard {...item} onPress={() => {}} />
          )}
        />
      )}
    />
  );
};
```

---

## 5. Compound Component Pattern

**What it is**: Multiple components designed to work together, sharing implicit state via Context.
Equivalent to a set of nested Spring components that share a parent-managed lifecycle context.

```tsx
// src/components/Accordion.tsx
// Accordion.Root manages state; Accordion.Item and Accordion.Content are children.

import { createContext, useContext, useState } from "react";

interface AccordionContextValue {
  openId: string | null;
  toggle: (id: string) => void;
}

const AccordionCtx = createContext<AccordionContextValue | null>(null);
const useAccordion = () => {
  const ctx = useContext(AccordionCtx);
  if (!ctx) throw new Error("Must be used within Accordion.Root");
  return ctx;
};

const Root = ({ children }: { children: React.ReactNode }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));
  return (
    <AccordionCtx.Provider value={{ openId, toggle }}>
      {children}
    </AccordionCtx.Provider>
  );
};

const Item = ({ id, title }: { id: string; title: string }) => {
  const { openId, toggle } = useAccordion();
  return (
    <TouchableOpacity
      onPress={() => toggle(id)}
      className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200"
    >
      <Text className="text-text font-medium">{title}</Text>
      <Text className="text-primary">{openId === id ? "▲" : "▼"}</Text>
    </TouchableOpacity>
  );
};

const Content = ({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) => {
  const { openId } = useAccordion();
  if (openId !== id) return null;
  return <View className="px-4 py-3 bg-gray-50">{children}</View>;
};

export const Accordion = { Root, Item, Content };

// Usage
<Accordion.Root>
  <Accordion.Item id="shipping" title="Shipping Info" />
  <Accordion.Content id="shipping">
    <Text>Free shipping over $50.</Text>
  </Accordion.Content>
  <Accordion.Item id="returns" title="Return Policy" />
  <Accordion.Content id="returns">
    <Text>30-day returns on all items.</Text>
  </Accordion.Content>
</Accordion.Root>;
```

---

## 6. Provider Pattern (Context)

**What it is**: Share state across a component tree without prop drilling. Equivalent to
Spring `ApplicationContext` — a container that holds beans (values) available anywhere.

```tsx
// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { login as apiLogin, logout as apiLogout } from "../api/auth";

interface AuthContextValue {
  isLoggedIn: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync("jwt_token").then((t) => setIsLoggedIn(!!t));
  }, []);

  const login = async (username: string, password: string) => {
    await apiLogin({ username, password });
    setIsLoggedIn(true);
  };

  const logout = async () => {
    await apiLogout();
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook — always expose context via a named hook, not raw useContext
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

// Wire up at app root
// app/_layout.tsx
export default function RootLayout() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <Stack />
      </QueryClientProvider>
    </AuthProvider>
  );
}
```

---

## 7. Observer Pattern with Zustand

**What it is**: Components subscribe to a store and re-render only when their slice of state
changes. Zustand implements this cleanly without Redux boilerplate. Analogy: Spring's
`ApplicationEventPublisher` — components react to state changes they care about.

```typescript
// src/stores/cartStore.ts
import { create } from 'zustand';

interface CartItem { id: string; name: string; price: number; quantity: number; }

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity: 1 }] };
    }),

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  updateQty: (id, quantity) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
    })),

  clearCart: () => set({ items: [] }),

  // Derived value — like a @Transient computed field in a JPA entity
  total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
}));

// Usage — components subscribe to only the slice they need
const CartBadge = () => {
  const itemCount = useCartStore((state) => state.items.length); // only re-renders on count change
  return <Text className="text-white font-bold">{itemCount}</Text>;
};

const CartTotal = () => {
  const total = useCartStore((state) => state.total());
  return <Text className="text-primary font-bold text-xl">${total.toFixed(2)}</Text>;
};
```

---

## 8. Repository Pattern for API Layer

**What it is**: Centralise all data-access logic behind a typed interface. Components never
call `axios` directly — they go through the repository. This is the exact same pattern as
Spring's `@Repository` / `JpaRepository`.

```typescript
// src/api/repositories/productRepository.ts
import { apiClient } from "../client";
import type { ProductDTO, PageResponse } from "../types";

// The repository — a pure data-access object, no UI concerns
export const productRepository = {
  findAll: (page = 0, size = 20) =>
    apiClient
      .get<
        PageResponse<ProductDTO>
      >("/api/products", { params: { page, size } })
      .then((r) => r.data),

  findById: (id: string) =>
    apiClient.get<ProductDTO>(`/api/products/${id}`).then((r) => r.data),

  findByCategory: (category: string) =>
    apiClient
      .get<PageResponse<ProductDTO>>("/api/products", { params: { category } })
      .then((r) => r.data),

  create: (dto: Omit<ProductDTO, "id">) =>
    apiClient.post<ProductDTO>("/api/products", dto).then((r) => r.data),

  update: (id: string, dto: Partial<ProductDTO>) =>
    apiClient.put<ProductDTO>(`/api/products/${id}`, dto).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/api/products/${id}`),
};

// React Query hooks wrap the repository — like a Spring @Service wrapping a @Repository
// src/hooks/useProductRepository.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productRepository } from "../api/repositories/productRepository";

export const useProductsPage = (page: number) =>
  useQuery({
    queryKey: ["products", "page", page],
    queryFn: () => productRepository.findAll(page),
  });

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: productRepository.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
};
```

---

## 9. Flux / Redux Pattern

**What it is**: Unidirectional data flow — `Action → Reducer → State → View → Action`.
Useful for complex shared state. Analogy: Command pattern + event sourcing in Spring.

```typescript
// Using Redux Toolkit (modern Redux — no boilerplate)
// src/stores/redux/productsSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { productRepository } from "../../api/repositories/productRepository";
import type { ProductDTO } from "../../api/types";

// Async action — like a Spring @Async service method
export const fetchProducts = createAsyncThunk("products/fetchAll", () =>
  productRepository.findAll(),
);

interface ProductsState {
  items: ProductDTO[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const productsSlice = createSlice({
  name: "products",
  initialState: { items: [], status: "idle", error: null } as ProductsState,
  reducers: {
    productAdded: (state, action: PayloadAction<ProductDTO>) => {
      state.items.push(action.payload); // Immer makes mutation safe here
    },
    productRemoved: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((p) => p.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.content;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Unknown error";
      });
  },
});

export const { productAdded, productRemoved } = productsSlice.actions;
export default productsSlice.reducer;
```

> **When to use Redux vs Zustand**: Use Zustand for most apps. Reach for Redux Toolkit only
> when you need time-travel debugging, complex async flows (Redux Saga), or your team already
> knows Redux deeply. The architectural concept (unidirectional flow) is the same in both.

---

## 10. Error Boundary Pattern

**What it is**: Catch rendering errors in a subtree and show a fallback UI instead of crashing
the whole app. Equivalent to a Spring `@ControllerAdvice` that catches uncaught exceptions
and returns an error response instead of a 500.

```tsx
// src/components/ErrorBoundary.tsx
import { Component, ErrorInfo } from "react";
import { View, Text, TouchableOpacity } from "react-native";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}
interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Send to your error tracker (Sentry, Bugsnag, etc.)
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <View className="flex-1 items-center justify-center p-8">
            <Text className="text-danger text-lg font-semibold mb-2">
              Something went wrong
            </Text>
            <Text className="text-text-muted text-sm text-center mb-6">
              {this.state.error?.message}
            </Text>
            <TouchableOpacity
              className="bg-primary px-6 py-3 rounded-lg"
              onPress={this.handleReset}
            >
              <Text className="text-white font-semibold">Try Again</Text>
            </TouchableOpacity>
          </View>
        )
      );
    }
    return this.props.children;
  }
}

// Usage — wrap screen trees or individual risky components
<ErrorBoundary>
  <ProductListScreen />
</ErrorBoundary>;
```

---

## 11. Conditional Rendering Patterns

**What it is**: Standard patterns for showing/hiding UI based on state. In JSX there are
several idiomatic approaches — know when to use each.

```tsx
// Pattern A: && operator (show or nothing)
// Use when: you only want to render something if a condition is true
{
  isLoggedIn && <ProfileButton />;
}

// Pattern B: Ternary (show one of two things)
// Use when: you have two distinct states to display
{
  isLoading ? <ActivityIndicator /> : <ProductList data={data} />;
}

// Pattern C: Early return (guards at top of component)
// Use when: multiple conditions each fully replace the screen
const ProductDetailScreen = ({ id }: { id: string }) => {
  const { data, isLoading, isError } = useProduct(id);

  if (isLoading) return <LoadingScreen />;
  if (isError) return <ErrorScreen />;
  if (!data) return <EmptyScreen message="Product not found" />;

  // Happy path renders below the guards — cleaner than nested ternaries
  return (
    <ScrollView>
      <Text className="text-2xl font-bold">{data.name}</Text>
      <Text className="text-primary text-xl mt-2">${data.price}</Text>
    </ScrollView>
  );
};

// Pattern D: Map over arrays (always add a key)
{
  products.map((product) => (
    <ProductCard key={product.id} {...product} onPress={() => {}} />
  ));
}
```

---

## 12. List Virtualisation Pattern

**What it is**: Render only the visible items in a large list, recycling views as the user
scrolls. Equivalent to server-side pagination — never load everything at once.

```tsx
// src/components/ProductFeed.tsx
import { FlatList, ActivityIndicator } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { productRepository } from "../api/repositories/productRepository";

export const ProductFeed = () => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["products", "infinite"],
      queryFn: ({ pageParam = 0 }) => productRepository.findAll(pageParam),
      getNextPageParam: (lastPage) =>
        lastPage.number + 1 < lastPage.totalPages
          ? lastPage.number + 1
          : undefined,
      initialPageParam: 0,
    });

  const products = data?.pages.flatMap((p) => p.content) ?? [];

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ProductCard {...item} onPress={() => {}} />}
      onEndReached={() => {
        if (hasNextPage) fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? <ActivityIndicator className="py-4" /> : null
      }
      // Performance props
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={5}
    />
  );
};
```

---

## 13. Navigation Patterns

### Protected Stack (Auth Guard)

```tsx
// app/_layout.tsx — Expo Router example
import { Redirect, Stack } from "expo-router";
import { useAuth } from "../src/context/AuthContext";

export default function RootLayout() {
  const { isLoggedIn } = useAuth();

  return (
    <Stack>
      {isLoggedIn ? (
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      ) : (
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      )}
    </Stack>
  );
}
```

### Typed Navigation (React Navigation)

```typescript
// src/navigation/types.ts
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type RootStackParamList = {
  ProductList: undefined;
  ProductDetail: { productId: string };
  Cart: undefined;
  Checkout: { cartItems: string[] }; // pass IDs, not full objects
};

export type RootStackNavProp = NativeStackNavigationProp<RootStackParamList>;

// Usage in any component
const navigation = useNavigation<RootStackNavProp>();
navigation.navigate("ProductDetail", { productId: "123" });
```

---

## 14. Form Pattern with Validation

**What it is**: React Hook Form + Zod provides a validation approach equivalent to Spring's
Bean Validation (`@NotNull`, `@Size`, `@Email` annotations).

```tsx
// src/screens/LoginScreen.tsx
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Zod schema — equivalent to a Bean Validation annotated DTO
const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginScreen = () => {
  const { login } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    await login(data.username, data.password);
  };

  return (
    <View className="flex-1 p-6 justify-center">
      <Text className="text-2xl font-bold text-text mb-8">Sign In</Text>

      <Controller
        control={control}
        name="username"
        render={({ field: { onChange, value } }) => (
          <View className="mb-4">
            <TextInput
              className={`border rounded-lg px-4 py-3 text-text ${
                errors.username ? "border-danger" : "border-gray-300"
              }`}
              placeholder="Username"
              autoCapitalize="none"
              value={value}
              onChangeText={onChange}
            />
            {errors.username && (
              <Text className="text-danger text-sm mt-1">
                {errors.username.message}
              </Text>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <View className="mb-6">
            <TextInput
              className={`border rounded-lg px-4 py-3 text-text ${
                errors.password ? "border-danger" : "border-gray-300"
              }`}
              placeholder="Password"
              secureTextEntry
              value={value}
              onChangeText={onChange}
            />
            {errors.password && (
              <Text className="text-danger text-sm mt-1">
                {errors.password.message}
              </Text>
            )}
          </View>
        )}
      />

      <TouchableOpacity
        className="bg-primary py-4 rounded-lg items-center active:opacity-80"
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-semibold text-base">Sign In</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};
```

---

## 15. Optimistic Update Pattern

**What it is**: Update UI immediately before the server confirms, then rollback on failure.
Equivalent to a local transaction that commits optimistically and rolls back on conflict —
familiar from optimistic locking in JPA (`@Version`).

```typescript
// src/hooks/useToggleFavourite.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { productRepository } from "../api/repositories/productRepository";

export const useToggleFavourite = (productId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => productRepository.toggleFavourite(productId),

    // Fire before the request — optimistic update
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["products", productId] });

      // Snapshot the previous value (for rollback)
      const previous = queryClient.getQueryData(["products", productId]);

      // Optimistically flip the favourite flag
      queryClient.setQueryData(["products", productId], (old: any) => ({
        ...old,
        isFavourite: !old.isFavourite,
      }));

      return { previous }; // context passed to onError
    },

    // Rollback on failure — like a JPA transaction rollback
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["products", productId], context?.previous);
    },

    // Always re-sync with server after success or failure
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["products", productId] });
    },
  });
};
```
