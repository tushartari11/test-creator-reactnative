# Swagger UI & OpenAPI Documentation

## Overview

This project uses **SpringDoc OpenAPI** to automatically generate interactive API documentation. All API endpoints are documented with Swagger UI, providing a user-friendly interface to explore and test the API.

## Accessing Swagger UI

### Local Development

- **Swagger UI**: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **OpenAPI JSON**: [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)
- **OpenAPI YAML**: [http://localhost:8080/v3/api-docs.yaml](http://localhost:8080/v3/api-docs.yaml)

### Production

- **Swagger UI**: [https://api.testcreator.com/swagger-ui.html](https://api.testcreator.com/swagger-ui.html)
- **OpenAPI JSON**: [https://api.testcreator.com/v3/api-docs](https://api.testcreator.com/v3/api-docs)

## Starting the Application

1. **Build the project:**

   ```bash
   mvn clean build -DskipTests
   ```

2. **Start Docker containers** (if using Docker):

   ```bash
   docker-compose up -d
   ```

3. **Run the application:**

   ```bash
   mvn spring-boot:run
   ```

4. **Access Swagger UI:**
   Open your browser and navigate to: `http://localhost:8080/swagger-ui.html`

## Features

### Authentication in Swagger UI

1. **JWT Token Integration:**
   - Click the green "Authorize" button in the top-right corner
   - Select "Bearer Authentication"
   - Paste your JWT token from the `/api/auth/login` response
   - Click "Authorize" to apply the token to all subsequent requests

2. **Testing Protected Endpoints:**
   - Once authenticated, all endpoints requiring authorization will include the JWT token automatically
   - Try out any protected endpoint (marked with a lock icon 🔒)

### Exploring APIs

1. **Browse by Category:**
   - APIs are organized by tags (Authentication, Test Management, Student Test Endpoints, Results, Proctoring)
   - Click on any tag to expand/collapse that section

2. **View Endpoint Details:**
   - Click on any endpoint to see:
     - Method type (GET, POST, PUT, DELETE)
     - Request body schema with example data
     - Response schemas with status codes
     - Required parameters
     - Authorization requirements

3. **Try It Out:**
   - Each endpoint has a "Try it out" button
   - Click it to modify the request parameters
   - Click "Execute" to send the request
   - View the response immediately below

## API Tags

### Authentication

- User registration, login, token refresh, and profile management
- Endpoints: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`

### Test Management (Teacher)

- Create, update, publish, and delete tests
- Endpoints: `POST /api/tests`, `GET /api/tests`, `PUT /api/tests/{id}`, etc.

### Student Test Endpoints

- View available tests, start attempts, submit answers
- Endpoints: `GET /api/student/tests/available`, `POST /api/student/tests/{testId}/start`, etc.

### Results Endpoints (Teacher)

- View detailed results and analytics
- Endpoints: `GET /api/results/tests`, `GET /api/results/tests/{testId}`

### Proctoring

- Handle proctoring violations and heartbeat monitoring
- Endpoints: `POST /api/student/attempts/{attemptId}/violation`

## Configuration

### Swagger Properties (application.yml)

```yaml
springdoc:
  api-docs:
    path: /v3/api-docs # OpenAPI docs path
    enabled: true # Enable OpenAPI documentation
  swagger-ui:
    path: /swagger-ui.html # Swagger UI path
    enabled: true # Enable Swagger UI
    title: Test Creator API Documentation # Custom title
    tags-sorter: alpha # Sort tags alphabetically
    operations-sorter: alpha # Sort operations alphabetically
    doc-expansion: list # Expand all endpoints by default
    filter: true # Show filter search
    display-request-duration: true # Show request duration
    try-it-out-enabled: true # Enable Try It Out
```

### OpenAPI Configuration (OpenAPIConfig.java)

The [src/main/java/com/testcreator/config/OpenAPIConfig.java](src/main/java/com/testcreator/config/OpenAPIConfig.java) file contains:

- Server definitions (development and production)
- API information (title, version, description)
- Security scheme configuration (JWT Bearer authentication)
- Global security requirements

## Adding Swagger Documentation to Endpoints

### Example: Annotating a Controller Method

```java
@PostMapping("/example")
@Operation(
    summary = "Brief description of what this endpoint does",
    description = "Detailed description explaining the purpose and behavior"
)
@ApiResponses({
    @ApiResponse(responseCode = "200", description = "Success response"),
    @ApiResponse(responseCode = "400", description = "Bad request"),
    @ApiResponse(responseCode = "401", description = "Unauthorized"),
    @ApiResponse(responseCode = "403", description = "Forbidden")
})
public ResponseEntity<?> exampleEndpoint(
    @RequestBody ExampleRequest request,
    @AuthenticationPrincipal UserDetails userDetails) {
    // Implementation
}
```

### Class-Level Documentation

```java
@RestController
@RequestMapping("/api/example")
@Tag(
    name = "Example Endpoints",
    description = "Endpoints for managing example resources"
)
public class ExampleController {
    // Controller methods
}
```

### DTO Documentation

```java
@Data
@Builder
public class ExampleDTO {

    @Schema(
        description = "Unique identifier",
        example = "123"
    )
    private Long id;

    @Schema(
        description = "User email address",
        example = "user@example.com"
    )
    @Email
    private String email;
}
```

## Security in Swagger UI

### JWT Authentication Flow

1. **Register/Login:**

   ```
   POST /api/auth/register
   POST /api/auth/login
   ```

   - Receive `token` and `refreshToken` in response

2. **Authorize:**
   - Copy the `token` value
   - Click "Authorize" button in Swagger UI
   - Paste token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. **Make Authenticated Requests:**
   - All subsequent requests include the JWT token automatically
   - Protected endpoints will work without modification

### Bearer Token Format

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

## Common Use Cases

### 1. Register a New User

1. Expand "Authentication" section
2. Click on `POST /api/auth/register`
3. Click "Try it out"
4. Fill in the request body:
   ```json
   {
     "email": "user@example.com",
     "password": "SecurePassword123!",
     "name": "John Doe",
     "role": "STUDENT"
   }
   ```
5. Click "Execute"

### 2. Login and Get JWT Token

1. Expand "Authentication" section
2. Click on `POST /api/auth/login`
3. Click "Try it out"
4. Fill in the request body:
   ```json
   {
     "email": "user@example.com",
     "password": "SecurePassword123!"
   }
   ```
5. Click "Execute"
6. Copy the `token` from the response

### 3. Authorize with JWT Token

1. Click the green "Authorize" button
2. Paste your token in the "Bearer token" field
3. Click "Authorize"
4. You're now authenticated for all subsequent requests

### 4. Create a Test (as Teacher)

1. Authorize with teacher account JWT token
2. Expand "Test Management" section
3. Click on `POST /tests`
4. Click "Try it out"
5. Fill in the test details
6. Click "Execute"

## Troubleshooting

### Swagger UI Not Loading

**Problem:** Blank page or 404 error

- **Solution:** Ensure endpoints are not blocked by Spring Security
- **Check:** Verify `/swagger-ui/**`, `/v3/api-docs/**` are permitted in SecurityConfig

### Authentication Not Working

**Problem:** JWT token not being sent with requests

- **Solution:** Click "Authorize" button and enter the full token including any prefixes
- **Format:** Use `Bearer <token>` or just `<token>` depending on configuration

### Missing Endpoint Documentation

**Problem:** Some endpoints not showing in Swagger UI

- **Solution:** Add `@Operation` and `@ApiResponse` annotations to controller methods
- **Example:** See [src/main/java/com/testcreator/controller/AuthController.java](src/main/java/com/testcreator/controller/AuthController.java)

### CORS Issues in Swagger UI

**Problem:** Requests show CORS errors

- **Solution:** Verify CORS configuration in SecurityConfig
- **Check:** Ensure your frontend URL is in the allowed-origins list

## Advanced Features

### Generate Client SDK

The OpenAPI specification can be used to generate client SDKs:

```bash
# Generate JavaScript/TypeScript client
npx openapi-generator-cli generate \
  -i http://localhost:8080/v3/api-docs \
  -g typescript-axios \
  -o ./generated-client

# Generate Java client
openapi-generator-cli generate \
  -i http://localhost:8080/v3/api-docs \
  -g java \
  -o ./generated-client
```

### Export OpenAPI Specification

- JSON: `http://localhost:8080/v3/api-docs`
- YAML: `http://localhost:8080/v3/api-docs.yaml`

Use these in:

- Postman: Import from URL
- IntelliJ API Client: File > Open from URL
- ThunderClient, Insomnia, or other REST clients

## Dependencies

- **springdoc-openapi-starter-webmvc-ui**: v2.3.0
  - Provides automatic API documentation generation
  - Integrates with Spring Web MVC
  - Includes Swagger UI

## References

- [SpringDoc OpenAPI Documentation](https://springdoc.org/)
- [OpenAPI 3.0 Specification](https://spec.openapis.org/oas/v3.0.3)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [Project API Reference](API_REFERENCE.md)

## Support

For issues or questions about Swagger UI integration, refer to:

- [API_REFERENCE.md](API_REFERENCE.md) - Complete API documentation
- [src/main/java/com/testcreator/config/OpenAPIConfig.java](src/main/java/com/testcreator/config/OpenAPIConfig.java) - Configuration
- Controller annotations in [src/main/java/com/testcreator/controller/](src/main/java/com/testcreator/controller/)

---

**Last Updated:** February 11, 2026
