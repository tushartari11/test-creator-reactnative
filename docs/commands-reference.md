# Commands Reference

## Backend (run from `backend/`)

```bash
mvn spring-boot:run                                      # Start dev server
mvn spring-boot:run -Dspring-boot.run.profiles=local     # With local profile
mvn test                                                 # All tests
mvn test -Dtest=TestServiceTest                          # Single class
mvn test -Dtest=TestServiceTest#methodName               # Single method
mvn clean test jacoco:report                             # With coverage report
mvn clean install -DskipTests                            # Fast build
mvn clean package -P production                          # Production build
mvn checkstyle:check                                     # Lint
mvn spotbugs:check                                       # Static analysis
mvn flyway:migrate                                       # Run pending migrations
mvn flyway:info                                          # Migration status
```

## Frontend (run from `frontend/`)

```bash
npm start          # Expo dev server
npm run web        # Web browser
npx expo export --platform web   # Build for Spring Boot static serving (outputs to frontend/dist/)
# Then copy dist/ contents to backend/src/main/resources/static/
```

## Docker (run from project root)

```bash
docker-compose up -d postgres redis              # Infra only
docker-compose --profile full-stack up --build   # Full stack
./scripts/build-deploy.sh                        # Deploy preserving data
./scripts/build-deploy-fresh.sh                  # Clean deploy (deletes data)
```
