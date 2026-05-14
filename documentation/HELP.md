## Remote Debugging (Docker)

Set up remote debugging in IntelliJ:

1. Run → Edit Configurations → + → Remote JVM Debug
2. Configure:
   - Name: Docker Debug
   - Host: localhost
   - Port: 5005
   - Use module classpath: test-creator
3. Click OK

```shell
# Restart Docker to apply changes
docker compose --profile full-stack up -d

# Then in IntelliJ: Run → Debug "Docker Debug"
```

| Method       | When to Use                                                   |
|--------------|---------------------------------------------------------------|
| Local Debug  | Fast iteration, full IDE features, breakpoints work instantly |
| Remote Debug | Test exact Docker environment, container networking           |

For day-to-day development, use local debug with `docker compose up -d` (postgres + redis only) —
it's faster and easier.

---

## Docker Container Management

### Start / Stop App Stack

```shell
# Start app stack (postgres, redis, app)
docker compose --profile full-stack up -d

# Stop app stack
docker compose --profile full-stack down

# Start only infra (postgres, redis) for local dev
docker compose up -d
```

### Build & Deploy

```shell
# Build and deploy (local)
./scripts/build-deploy.sh

# Build and deploy (production)
./scripts/deploy-prod.sh
```

---

## Monitoring Stack

### Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Spring Boot │────▶│  Prometheus  │────▶│   Grafana    │
│  /actuator/  │     │  :9090       │     │   :3000      │
│  prometheus  │     └──────────────┘     └──────┬───────┘
└──────────────┘                                 │
                                                 │ datasources
┌──────────────┐     ┌──────────────┐            │
│  App Logs    │────▶│  Promtail    │────▶┌──────┴───────┐
│  /app/logs/  │     │  (collector) │     │    Loki      │
├──────────────┤     └──────────────┘     │    :3100     │
│ Docker Logs  │────────────┘             └──────────────┘
└──────────────┘
```

**How it works:**

- **Prometheus** scrapes metrics from the Spring Boot app's `/actuator/prometheus` endpoint every
  15s
- **Promtail** collects log files from `/app/logs/*.log` and Docker container stdout/stderr, then
  pushes them to Loki
- **Loki** stores and indexes logs
- **Grafana** visualizes both metrics (from Prometheus) and logs (from Loki)

### File Structure

```
test-creator/
├── monitoring/
│   ├── docker-compose.yml    # Monitoring stack (Prometheus, Loki, Promtail, Grafana)
│   ├── prometheus.yml        # Prometheus scrape config
│   └── promtail.yml          # Promtail log collection config
├── scripts/
│   └── monitoring.sh         # Monitoring management script
├── docker-compose.yml        # App stack (Postgres, Redis, App)
```

### Usage

```shell
./scripts/monitoring.sh start     # Start all monitoring services
./scripts/monitoring.sh stop      # Stop all monitoring services
./scripts/monitoring.sh restart   # Restart all monitoring services
./scripts/monitoring.sh status    # Check container status
./scripts/monitoring.sh logs      # Tail all monitoring logs
./scripts/monitoring.sh logs loki # Tail a specific service log
```

### Startup Order

The monitoring stack requires the app network to exist. Always start the app stack first:

```shell
# 1. Start app stack (creates the Docker network)
docker compose up -d
# or
./scripts/build-deploy.sh

# 2. Start monitoring stack (joins the existing network)
./scripts/monitoring.sh start
```

### Shutdown Order

Stop monitoring first, then the app stack:

```shell
# 1. Stop monitoring (detaches from the network)
./scripts/monitoring.sh stop

# 2. Stop app stack (removes the network)
docker compose down
```

### Access URLs

| Service    | URL                         | Credentials   |
|------------|-----------------------------|---------------|
| Grafana    | http://localhost:3000       | admin / admin |
| Prometheus | http://localhost:9090       | —             |
| Loki       | http://localhost:3100       | —             |
| Loki Ready | http://localhost:3100/ready | —             |

### Grafana Setup

1. Go to **Connections** → **Data sources** → **Add data source**
2. Select **Loki**
3. Set URL to: `http://loki:3100` (not localhost — Grafana runs inside Docker)
4. Click **Save & test**
5. Repeat for **Prometheus** with URL: `http://prometheus:9090`

### Grafana Log Queries (LogQL)

Use these in the **Explore** tab with the Loki datasource:

```logql
# All application logs
{job="test-creator"}

# Filter by log level
{job="test-creator"} |= "ERROR"
{job="test-creator"} |= "WARN"
{job="test-creator"} |= "INFO"

# Search for a specific term
{job="test-creator"} |= "NullPointerException"

# Docker container logs
{container="testcreator-app"}
{container="testcreator-postgres"}
{container="testcreator-redis"}

# All Docker container logs
{container=~".+"}

# Parse structured/JSON logs and filter
{job="test-creator"} | json | level="ERROR"

# Combine filters
{job="test-creator"} |= "TestService" |= "ERROR"

# Exclude noisy log lines
{job="test-creator"} != "healthcheck" != "actuator"

# Rate of errors over time (useful for dashboards)
rate({job="test-creator"} |= "ERROR" [5m])
```

### Prometheus Metrics Queries (PromQL)

Use these in the **Explore** tab with the Prometheus datasource:

```promql
# JVM memory usage
jvm_memory_used_bytes

# HTTP request count by endpoint
http_server_requests_seconds_count

# HTTP request latency (p95)
histogram_quantile(0.95, rate(http_server_requests_seconds_bucket[5m]))

# Active threads
jvm_threads_live_threads

# CPU usage
process_cpu_usage
```

### Troubleshooting

**Can't add Loki as datasource in Grafana:**

- Use `http://loki:3100` not `http://localhost:3100` — Grafana is inside Docker

**Prometheus can't scrape metrics:**

- Ensure `/actuator/prometheus` is in Spring Security's `permitAll()` list
- Verify with: `curl http://localhost:8080/actuator/prometheus`

**No app logs in Loki:**

- Check that `./logs` directory exists and contains `.log` files
- Check promtail logs: `./scripts/monitoring.sh logs promtail`

**Network not found error:**

- Start the app stack first: `docker compose up -d`

---

### Production Monitoring

Production monitoring uses separate configs with security hardening, persistent storage, and log
retention.

#### File Structure (Production)

```
monitoring/
├── docker-compose.yml          # Local dev (existing)
├── docker-compose.prod.yml     # Production
├── prometheus.yml               # Shared Prometheus config
├── promtail.yml                 # Local Promtail config
├── promtail-prod.yml            # Production Promtail config (environment labels)
└── loki-config.yml              # Production Loki config (30d retention)
```

#### Key Differences from Local

| Feature              | Local                  | Production                    |
|----------------------|------------------------|-------------------------------|
| Ports                | Open on all interfaces | Bound to 127.0.0.1 only       |
| Grafana password     | admin                  | From .env `GF_ADMIN_PASSWORD` |
| Image tags           | latest                 | Pinned versions               |
| Restart policy       | None                   | unless-stopped                |
| Data persistence     | None (lost on restart) | Named volumes                 |
| Loki retention       | Unlimited              | 30 days                       |
| Prometheus retention | Default                | 30 days / 5GB max             |
| Log volumes          | Bind mount (./logs)    | Named volume from app stack   |
| Config files         | Read-write             | Read-only (:ro)               |

#### Production Setup

1. Add `GF_ADMIN_PASSWORD` to your `.env` file on the server:

   ```shell
   echo "GF_ADMIN_PASSWORD=your_secure_password" >> .env
   ```

2. Deploy the app first, then start monitoring:

   ```shell
   ./scripts/deploy-prod.sh
   ./scripts/monitoring.sh --prod start
   ```

3. Access Grafana via SSH tunnel (ports are not exposed publicly):
   ```shell
   ssh -L 3000:127.0.0.1:3000 -L 9090:127.0.0.1:9090 user@your-server
   ```
   Then open http://localhost:3000 in your browser.

#### Production Commands

```shell
./scripts/monitoring.sh --prod start     # Start production monitoring
./scripts/monitoring.sh --prod stop      # Stop production monitoring
./scripts/monitoring.sh --prod restart   # Restart production monitoring
./scripts/monitoring.sh --prod status    # Check status
./scripts/monitoring.sh --prod logs      # Tail all logs
./scripts/monitoring.sh --prod logs loki # Tail specific service
```

---

## Quick Reference

### Start everything (first time or after full shutdown)

```shell
# Local
docker compose up -d              # Infra (postgres, redis)
./scripts/build-deploy.sh         # App
./scripts/monitoring.sh start     # Monitoring

# Production
./scripts/deploy-prod.sh          # App + infra
./scripts/monitoring.sh --prod start  # Monitoring
```

### Day-to-day: restart only the app after code changes

```shell
./scripts/build-deploy.sh         # Rebuilds and restarts app only
                                   # Monitoring stays running
```

---

## Database Backup & Restore

### Will deploy-prod.sh destroy my data?

**No.** The script only stops/removes the **app** container, then runs `docker compose up -d` which
leaves already-running postgres and redis untouched. Data lives in named volumes (`postgres_data`,
`redis_data`) which persist across container restarts.

The only command that destroys data is `docker compose down -v` (the `-v` flag removes volumes). \*
\*Never use `-v` in production unless you intend to wipe everything.\*\*

### Backup Commands

```shell
# Local backup
./scripts/backup-db.sh

# Production backup
./scripts/backup-db.sh --prod

# Backups are saved to: backups/testcreator_YYYYMMDD_HHMMSS.sql
# Production backups:   backups/testcreator_prod_YYYYMMDD_HHMMSS.sql
# Last 10 backups kept per environment, older ones auto-deleted
```

### Restore Commands

```shell
# List available backups
./scripts/restore-db.sh                    # Local backups
./scripts/restore-db.sh --prod             # Production backups

# Restore latest backup
./scripts/restore-db.sh latest             # Local
./scripts/restore-db.sh --prod latest      # Production

# Restore specific backup
./scripts/restore-db.sh backups/testcreator_20260217_120000.sql
./scripts/restore-db.sh --prod backups/testcreator_prod_20260217_120000.sql
```

The restore script will:

1. Stop the app container (prevents writes during restore)
2. Drop and recreate the database schema
3. Restore from the backup file
4. Restart the app container

### Recommended Deployment Workflow (Production)

```shell
# 1. SSH into your server
ssh deployuser@your-vps-ip

# 2. Take a backup BEFORE deploying
./scripts/backup-db.sh --prod

# 3. Deploy the new version
./scripts/deploy-prod.sh

# 4. Verify the app is healthy
curl http://localhost:8080/actuator/health

# 5. If something went wrong, restore the backup
./scripts/restore-db.sh --prod latest
```

### Download Production Backup to Local Machine

```shell
# From your local machine
scp deployuser@your-vps-ip:/path/to/test-creator/backups/testcreator_prod_*.sql ./backups/

rsync -avz deployuser@your-vps-ip:/home/deploy/apps/test-creator/backups/ ./backups/
```

---

## SSH & Server Access

```shell
# Start SSH agent
eval "$(ssh-agent -s)"
ssh-add -l

# SSH to VPS
ssh deployuser@your-vps-ip

# SSH with monitoring tunnel
ssh -L 3000:127.0.0.1:3000 -L 9090:127.0.0.1:9090 deployuser@your-vps-ip

# Copy logs from production
docker cp testcreator-app:/app/logs /tmp/app-logs
scp -r deploy@<vps-ip>:/tmp/app-logs ./logs-prod/
```

---

## Useful Commands

```shell
# Check all running containers
docker ps

# View app logs
docker logs testcreator-app -f --tail 100

# Check app health
curl http://localhost:8080/actuator/health

# Check Prometheus metrics
curl http://localhost:8080/actuator/prometheus

# Check Loki readiness
curl http://localhost:3100/ready
```

# Production Usage

On your server: deploy app, then start monitoring

```
./scripts/deploy-prod.sh
./scripts/monitoring.sh --prod start

```

# From your local machine: SSH tunnel to access Grafana

```
ssh -L 3000:127.0.0.1:3000 user@your-server

```

Then open http://localhost:3000

# Your deployment workflow on the droplet

# 1. SSH in

ssh deployuser@your-vps-ip

# 2. Backup first (always!)

./scripts/backup-db.sh --prod

# 3. Deploy

./scripts/deploy-prod.sh

# 4. Verify

curl http://localhost:8080/actuator/health

# 5. Start monitoring (if not already running)

./scripts/monitoring.sh --prod start

# 6. If anything goes wrong

./scripts/restore-db.sh --prod latest
