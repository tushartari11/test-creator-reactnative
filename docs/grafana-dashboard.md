# Grafana Production Dashboard

Dashboard file: `monitoring/provisioning/dashboards/testcreator-production.json`

---

## Design Principles

The dashboard is built on two industry-standard observability frameworks applied at the right layer:

| Framework | Applies to | Metrics |
|-----------|------------|---------|
| **RED** — Rate, Errors, Duration | Services (HTTP API) | req/s, 4xx/5xx rate, P50/P95/P99 latency |
| **USE** — Utilization, Saturation, Errors | Resources (JVM, DB pool, CPU) | heap %, thread count, pool pending, CPU % |

> **Why both?** RED tells you *something is wrong from a user perspective*. USE tells you *why* — which resource is the bottleneck.

---

## Dashboard Structure

### Row 1 — Overview (6 stat panels)
Six single-number panels form a quick health summary visible at a glance.

| Panel | Query | Alert threshold |
|-------|-------|-----------------|
| App Status | `up{job="springboot-app"}` — 1=UP, 0=DOWN | Any 0 |
| Request Rate | `sum(rate(http_server_requests_seconds_count[1m]))` | — |
| 5xx Error Rate | 5xx count / total count × 100 | > 1% |
| P95 Latency | `histogram_quantile(0.95, ...)` | > 500 ms |
| JVM Heap % | used / max × 100 | > 85% |
| DB Active Connections | `hikaricp_connections_active` | > 12 |

Stat panels use **colour-coded thresholds** (green → yellow → red) so degradation is visible without reading numbers.

### Row 2 — HTTP Performance
- **Request Rate by HTTP Status** — stacked time series, colour-coded by status family. Lets you distinguish a traffic spike from an error spike at a glance.
- **Response Time Percentiles (P50/P95/P99)** — from histogram buckets. P99 spikes without a P50 spike indicate tail latency in a specific slow path, not general slowness.

### Row 3 — HTTP Errors & Endpoint Analysis
- **4xx / 5xx Error Rate** — separate lines. 4xx spikes usually mean client misuse; 5xx spikes are backend faults requiring immediate action.
- **Slowest Endpoints Table** — `topk(10, histogram_quantile(0.95, ... by (uri)))`. Identifies which specific URIs to optimise. Sorted by P95 descending, colour-coded.

### Row 4 — JVM
- **Heap Memory (Used / Committed / Max)** — three lines. If Used approaches Max without GC releasing it, an OOM is imminent. Committed growing without Used growth means heap fragmentation.
- **Non-Heap (Metaspace / Code Cache)** — steady growth here signals a class-loader leak (common in hot-reload or plugin architectures).
- **JVM Threads (Live / Daemon / Peak)** — Live should be stable under steady traffic. A growing peak with stable Live indicates blocked threads accumulating.

### Row 5 — GC & System
- **GC Pause Duration rate** — `rate(jvm_gc_pause_seconds_sum[1m])`. High values mean the app is stop-the-world pausing frequently — tune `JAVA_OPTS` or investigate memory leaks.
- **CPU Usage (Process vs System)** — two lines. Process = JVM only. System = entire host. A large gap means other processes (Docker daemon, Caddy, Postgres) are competing.
- **Process Uptime** — a recent reset is an unplanned restart. Combine with the log stream below to find the cause.

### Row 6 — Database (HikariCP)
- **Connection States (Active / Idle / Pending / Max)** — Max shown as a dashed line ceiling. Pending > 0 sustained means pool exhaustion — increase `spring.datasource.hikari.maximum-pool-size` or fix slow queries holding connections.
- **Connection Acquisition Time (P50 / P95)** — time a thread waits for a DB connection. Values > 50 ms signal contention.

### Row 7 — Logs (Loki)
- **Log Level Rate** — Loki LogQL `rate()` for ERROR / WARN / INFO. An ERROR spike without a traffic spike points to a backend fault not visible in HTTP metrics (e.g. a background job failure, Redis timeout).
- **Application Log Stream** — live tail of all production logs. Use the Grafana search bar to filter inline:
  - `|= "ERROR"` — errors only
  - `|= "auth"` — auth-related lines
  - `|~ "Exception"` — any exception

---

## Metric Sources

All metrics come from two sources wired in `monitoring/docker-compose.prod.yml`:

| Source | How | Config |
|--------|-----|--------|
| Prometheus | Scrapes `testcreator-app:8080/actuator/prometheus` every 15s | `monitoring/prometheus.yml` |
| Loki | Promtail tails `/app/logs/*.log` + Docker container logs | `monitoring/promtail-prod.yml` |

Spring Boot exposes metrics automatically via `micrometer-registry-prometheus` (`pom.xml`) with the endpoint enabled in `application.yml`:
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  metrics:
    export:
      prometheus:
        enabled: true
```

---

## Automatic Provisioning

Grafana loads the dashboard and datasources automatically on first start via the provisioning mount in `docker-compose.prod.yml`:

```yaml
volumes:
  - ./provisioning:/etc/grafana/provisioning:ro
```

File layout:
```
monitoring/provisioning/
├── datasources/
│   └── datasources.yml          # Prometheus + Loki auto-configured
└── dashboards/
    ├── dashboards.yml           # Tells Grafana where to find dashboard files
    └── testcreator-production.json   # The dashboard
```

Provisioned datasources show a **lock icon** in the Grafana UI — they cannot be accidentally edited or deleted via the UI.

Provisioned dashboards show a **lock icon** too. To make local edits: copy the JSON, import as a new dashboard, make changes, then export and overwrite the file.

---

## Importing the Dashboard Manually

If you want to import via the Grafana UI instead of provisioning (e.g. on a fresh instance):

1. Open Grafana → **Dashboards → Import** (or `http://localhost:3000/dashboard/import`)
2. Click **Upload dashboard JSON file**
3. Select `monitoring/provisioning/dashboards/testcreator-production.json`
4. On the import screen, map the two datasource inputs:
   - **Prometheus** → select your Prometheus datasource
   - **Loki** → select your Loki datasource
5. Click **Import**

The dashboard uses `__inputs` in the JSON for this mapping — Grafana reads them automatically and presents the dropdowns.

---

## Useful Filters & Queries to Try

Once the dashboard is running, these are useful ad-hoc explorations in the Explore tab:

```promql
# Which endpoints have the most errors?
sum by (uri, status) (rate(http_server_requests_seconds_count{job="springboot-app", status=~"5.."}[5m]))

# Is the Redis rate limiter causing 429s?
sum(rate(http_server_requests_seconds_count{job="springboot-app", status="429"}[1m]))

# GC activity broken down by collector
rate(jvm_gc_pause_seconds_count{job="springboot-app"}[1m])
```

```logql
# Errors in the last hour with context
{job="test-creator", environment="production"} |= "ERROR" | line_format "{{.message}}"

# Auth failures
{job="test-creator", environment="production"} |= "BadCredentialsException"

# Slow queries (if Hibernate logging is enabled)
{job="test-creator", environment="production"} |= "ms;" | regexp `(?P<duration>\d+)ms;` | duration > 500ms
```
