# Spring Boot Integration Reference

This file is loaded by the `react-native-mentor` skill when the user asks about
connecting React Native to a Spring Boot backend.

---

## Axios HTTP Client with JWT Interceptor

```typescript
// src/api/client.ts
import axios from "axios";
import * as SecureStore from "expo-secure-store";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});

// REQUEST interceptor — attach JWT on every call
// Equivalent to Spring's ClientHttpRequestInterceptor / OncePerRequestFilter
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("jwt_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// RESPONSE interceptor — handle token expiry (401)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync("jwt_token");
      // Navigate to login — use your navigation ref here
      // navigationRef.navigate('Login');
    }
    return Promise.reject(error);
  },
);
```

---

## Typed API Functions (mirrors Spring @RestController endpoints)

```typescript
// src/api/products.ts
import { apiClient } from "./client";

export interface ProductDTO {
  id: string;
  name: string;
  price: number;
  category: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

// GET /api/products — mirrors Spring @GetMapping("/api/products")
export const getProducts = (page = 0, size = 20) =>
  apiClient
    .get<PageResponse<ProductDTO>>("/api/products", { params: { page, size } })
    .then((r) => r.data);

// GET /api/products/:id
export const getProductById = (id: string) =>
  apiClient.get<ProductDTO>(`/api/products/${id}`).then((r) => r.data);

// POST /api/products — mirrors Spring @PostMapping
export const createProduct = (payload: Omit<ProductDTO, "id">) =>
  apiClient.post<ProductDTO>("/api/products", payload).then((r) => r.data);

// PUT /api/products/:id — mirrors Spring @PutMapping
export const updateProduct = (id: string, payload: Partial<ProductDTO>) =>
  apiClient.put<ProductDTO>(`/api/products/${id}`, payload).then((r) => r.data);

// DELETE /api/products/:id
export const deleteProduct = (id: string) =>
  apiClient.delete(`/api/products/${id}`);
```

---

## React Query Integration

```typescript
// src/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
} from "../api/products";

// Read — like @Cacheable with automatic background refresh
export const useProducts = (page = 0) =>
  useQuery({
    queryKey: ["products", page],
    queryFn: () => getProducts(page),
    staleTime: 1000 * 60 * 5, // 5 min cache — like @Cacheable TTL
    placeholderData: (prev) => prev, // keep old data while fetching new page
  });

export const useProduct = (id: string) =>
  useQuery({
    queryKey: ["products", id],
    queryFn: () => getProductById(id),
    enabled: !!id,
  });

// Write — invalidates cache after mutation (like @CacheEvict)
export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};
```

```tsx
// Usage in a screen component
import { useProducts } from "../hooks/useProducts";

export const ProductListScreen = () => {
  const { data, isLoading, isError } = useProducts();

  if (isLoading) return <ActivityIndicator />;
  if (isError) return <Text>Failed to load products.</Text>;

  return (
    <FlatList
      data={data?.content}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ProductCard product={item} />}
    />
  );
};
```

---

## Authentication with Spring Security JWT

```typescript
// src/api/auth.ts
import { apiClient } from "./client";
import * as SecureStore from "expo-secure-store";

interface LoginRequest {
  username: string;
  password: string;
}
interface AuthResponse {
  token: string;
  refreshToken?: string;
}

export const login = async (credentials: LoginRequest): Promise<void> => {
  const { data } = await apiClient.post<AuthResponse>(
    "/api/auth/login",
    credentials,
  );
  await SecureStore.setItemAsync("jwt_token", data.token);
  if (data.refreshToken) {
    await SecureStore.setItemAsync("refresh_token", data.refreshToken);
  }
};

export const logout = async (): Promise<void> => {
  await SecureStore.deleteItemAsync("jwt_token");
  await SecureStore.deleteItemAsync("refresh_token");
};

export const isAuthenticated = async (): Promise<boolean> => {
  const token = await SecureStore.getItemAsync("jwt_token");
  return token !== null;
};
```

---

## Environment Configuration

```bash
# .env.local  (never commit real credentials)
EXPO_PUBLIC_API_URL=http://localhost:8080
EXPO_PUBLIC_ENV=development

# .env.production
EXPO_PUBLIC_API_URL=https://api.myapp.com
EXPO_PUBLIC_ENV=production
```

```typescript
// Access in code — Expo only exposes EXPO_PUBLIC_* prefixed vars
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const env = process.env.EXPO_PUBLIC_ENV;
```

---

## CORS — Spring Boot Side

Ensure your Spring Boot app allows requests from the Expo dev client:

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins(
                "http://localhost:8081",   // Expo dev server
                "https://myapp.com"        // production
            )
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true);
    }
}
```

---

## DTO Sync Strategy

Mirror your Spring DTOs as TypeScript interfaces. For larger projects, use
`openapi-generator-cli` to auto-generate from your Swagger/OpenAPI spec:

```bash
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:8080/v3/api-docs \
  -g typescript-axios \
  -o src/api/generated
```

This keeps mobile types always in sync with the Spring contract — the same
discipline as generating a client from a WSDL or Protobuf schema.
