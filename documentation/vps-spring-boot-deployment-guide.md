# Deploying Test Creator on DigitalOcean (Ubuntu 24.04 + Docker)

Concrete, project-specific guide for deploying this application to a DigitalOcean droplet.

---

## Prerequisites

| Item                                            | Status      |
|-------------------------------------------------|-------------|
| DigitalOcean droplet (Ubuntu 24.04, 2 GB+ RAM)  | Required    |
| SSH key-based access                            | Required    |
| Docker + Docker Compose v2 installed on droplet | Required    |
| Domain name (for HTTPS)                         | Recommended |

---

## 1. Server Preparation (One-Time)

### Create a deploy user

```bash
ssh root@YOUR_DROPLET_IP

adduser deploy
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
```

### Install Docker Compose plugin (if missing)

```bash
docker compose version
# If not installed:
apt update && apt install -y docker-compose-plugin
```

### Firewall

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
# Do NOT open 8080 — Caddy will proxy to it
ufw enable
```

### Reconnect as deploy user

```bash
ssh deploy@YOUR_DROPLET_IP
mkdir -p ~/apps/test-creator
```

---

## 2. Transfer Project to Server

### Option A — Git clone (recommended)

```bash
cd ~/apps
git clone YOUR_REPO_URL test-creator
cd test-creator
```

### Option B — rsync from local machine

```bash
# Run from your local project root
rsync -avz \
  --exclude 'target/' --exclude '.idea/' --exclude 'logs/' --exclude '.env' \
  ./ deploy@YOUR_DROPLET_IP:~/apps/test-creator/
```

---

## 3. Configure Environment

```bash
cd ~/apps/test-creator
cp .env.example .env
nano .env
```

Generate strong passwords:

```bash
openssl rand -base64 32   # run once per password
```

Fill in `.env`:

```
DB_NAME=testcreator
DB_USERNAME=testcreator_user
DB_PASSWORD=<strong-random-password>
REDIS_PASSWORD=<strong-random-password>
JWT_SECRET=<64-char-random-string>
BASE_URL=https://yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
GUEST_TOKEN_EXPIRY_HOURS=24
```

---

## 4. Build and Start

```bash
cd ~/apps/test-creator

# Build and start (first time or after code changes)
docker compose -f docker-compose.prod.yml up -d --build

# Check all services are healthy
docker compose -f docker-compose.prod.yml ps

# Follow app logs
docker compose -f docker-compose.prod.yml logs -f app
```

The app will be available at `http://YOUR_DROPLET_IP:8080`.

---

## 5. HTTPS with Caddy (Recommended)

Caddy auto-provisions Let's Encrypt TLS certificates.

### Install Caddy on the host

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

### Configure reverse proxy

```bash
sudo nano /etc/caddy/Caddyfile
```

```
yourdomain.com {
    reverse_proxy localhost:8080
}
```

```bash
sudo systemctl restart caddy
```

### Lock down the app port

Edit `docker-compose.prod.yml` to bind only to localhost:

```yaml
ports:
  - "127.0.0.1:8080:8080"
```

Then restart:

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## 6. Update / Redeploy

```bash
cd ~/apps/test-creator
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 7. Database Operations

### Backup

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U testcreator_user testcreator > backup_$(date +%Y%m%d).sql
```

### Restore

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U testcreator_user -d testcreator < backup_20260215.sql
```

---

## 8. Logs

### View logs in real-time

```bash
# App logs (last 50 lines, then follow)
docker compose -f docker-compose.prod.yml logs -f --tail 50 app

# All services
docker compose -f docker-compose.prod.yml logs -f

# Database logs
docker compose -f docker-compose.prod.yml logs -f postgres

# Logs from the last 30 minutes
docker compose -f docker-compose.prod.yml logs --since 30m app
```

### Download logs to local machine

Since the app container uses a named Docker volume for logs, copy from the container first:

```bash
# On the droplet — copy logs from container to a host directory
docker cp testcreator-app:/app/logs /tmp/app-logs
```

Then from your **local machine**:

```bash
scp -r root@YOUR_DROPLET_IP:/tmp/app-logs ./logs-prod/
```

---

## 9. Connecting to Production Database from Local Machine

The production database is not exposed to the internet. Use an SSH tunnel to connect
from a local SQL client (e.g. DbGate, DBeaver, pgAdmin).

### Prerequisites

`docker-compose.prod.yml` must have the postgres port bound to localhost:

```yaml
postgres:
  ports:
    - "127.0.0.1:5432:5432"
```

If you changed this, apply it on the droplet:

```bash
docker compose -f docker-compose.prod.yml up -d postgres
```

This is safe — `127.0.0.1` means the port is only accessible from the droplet itself,
not from the internet.

### Open SSH tunnel (from your local machine)

```bash
ssh -N -L 5433:127.0.0.1:5432 root@YOUR_DROPLET_IP
```

This forwards your local port `5433` to the droplet's postgres port `5432`.
The command will hang with no output — that means it's working. Leave the terminal open.

If it fails, debug with:

```bash
ssh -v -N -L 5433:127.0.0.1:5432 root@YOUR_DROPLET_IP
```

> **Note:** Use port `5433` (not `5432`) locally to avoid conflicts if you have
> PostgreSQL running on your local machine.

### Connect from your SQL client

| Field    | Value                          |
|----------|--------------------------------|
| Host     | `localhost`                    |
| Port     | `5433`                         |
| Database | your `DB_NAME` from `.env`     |
| Username | your `DB_USERNAME` from `.env` |
| Password | your `DB_PASSWORD` from `.env` |

No SSH tunnel settings needed in the client — the terminal command handles it.

### Alternative: Use DbGate's built-in SSH tunnel

Instead of the manual tunnel, configure it directly in DbGate:

1. New Connection → PostgreSQL
2. **Host**: `127.0.0.1`, **Port**: `5432`, fill in DB credentials from `.env`
3. Enable the **SSH Tunnel** tab:
    - Host: `YOUR_DROPLET_IP`
    - Port: `22`
    - User: `root`
    - Auth: Private key → select your `~/.ssh/id_rsa`

---

## 10. Useful Commands

| Action            | Command                                                                                           |
|-------------------|---------------------------------------------------------------------------------------------------|
| Start all         | `docker compose -f docker-compose.prod.yml up -d`                                                 |
| Stop all          | `docker compose -f docker-compose.prod.yml down`                                                  |
| Rebuild & restart | `docker compose -f docker-compose.prod.yml up -d --build`                                         |
| App logs          | `docker compose -f docker-compose.prod.yml logs -f app`                                           |
| DB logs           | `docker compose -f docker-compose.prod.yml logs -f postgres`                                      |
| Health check      | `curl http://localhost:8080/actuator/health`                                                      |
| Shell into app    | `docker compose -f docker-compose.prod.yml exec app sh`                                           |
| Shell into DB     | `docker compose -f docker-compose.prod.yml exec postgres psql -U testcreator_user -d testcreator` |
| Prune old images  | `docker image prune -f`                                                                           |
| Disk usage        | `docker system df`                                                                                |

---

## 11. Production Checklist

- [ ] Strong, unique passwords in `.env` for DB, Redis, JWT
- [ ] `.env` is NOT committed to git
- [ ] DB and Redis ports are NOT exposed to the internet (only Docker-internal)
- [ ] App port bound to `127.0.0.1` behind Caddy
- [ ] UFW enabled — only 22, 80, 443 open
- [ ] HTTPS via Caddy with auto-renewed Let's Encrypt certs
- [ ] `restart: unless-stopped` on all services
- [ ] Docker log rotation configured (json-file driver, 10m x 5 files)
- [ ] Non-root user inside Docker container (spring:spring)
- [ ] Non-root deploy user on the host
- [ ] Regular DB backups (automate via cron)
- [ ] Keep OS and Docker updated: `sudo apt update && sudo apt upgrade`
- [ ] Periodically prune unused Docker images: `docker image prune -f`

---

## 12. Automated Backup via Cron

```bash
crontab -e
```

Add (runs daily at 2 AM):

```
0 2 * * * cd ~/apps/test-creator && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U testcreator_user testcreator > ~/backups/testcreator_$(date +\%Y\%m\%d).sql 2>&1
```

```bash
mkdir -p ~/backups
```

---

## 13. Monitoring (Optional)

The app exposes Prometheus metrics at `/actuator/prometheus`. For full monitoring:

```bash
# Quick health check
curl -s http://localhost:8080/actuator/health | jq .

# Memory / CPU usage
docker stats
```

For Prometheus + Grafana dashboards, add a `docker-compose.monitoring.yml` with Prometheus scraping
`localhost:8080/actuator/prometheus`.

---

## 14. Monitoring & Logs Setup

### Overview

For complete monitoring and log aggregation:

- **Prometheus**: Scrapes app metrics from `/actuator/prometheus`
- **Loki + Promtail**: Collects and indexes container logs
- **Grafana**: Dashboards for both metrics and logs

### 1. Add Config Files

- Place `prometheus.yml` in your project root:

```yaml
# prometheus.yml
# ...see project file...
```

- Place `promtail.yml` in your project root:

```yaml
# promtail.yml
# ...see project file...
```

### 2. Add Monitoring Compose File

- Add `docker-compose.monitoring.yml`:

```yaml
# docker-compose.monitoring.yml
# ...see project file...
```

### 3. Start Monitoring Stack

```bash
cd ~/apps/test-creator
# Start monitoring containers

docker compose -f docker-compose.monitoring.yml up -d
```

### 4. Access Dashboards

- **Grafana**: `http://YOUR_DROPLET_IP:3000` (default admin password: `admin`)
- **Prometheus**: `http://YOUR_DROPLET_IP:9090`
- **Loki**: `http://YOUR_DROPLET_IP:3100`

### 5. Configure Grafana

- Add Prometheus as a data source (URL: `http://prometheus:9090`)
- Add Loki as a data source (URL: `http://loki:3100`)
- Import dashboards for JVM, Spring Boot, Docker logs

### 6. Checking Logs on Your Local Machine

#### Option 1: Download Raw Logs

1. Copy logs from the app container to the droplet host:
   ```bash
   docker cp testcreator-app:/app/logs /tmp/app-logs
   ```
2. Download logs to your local machine:
   ```bash
   scp -r deploy@YOUR_DROPLET_IP:/tmp/app-logs ./logs-prod/
   ```

#### Option 2: View Logs in Grafana (via Loki)

- In Grafana, add Loki as a data source.
- Use the Explore tab to query logs (e.g., `{container="app"}`).
- Filter, search, and visualize logs directly in the browser.

#### Option 3: Download Logs from Loki

- Use the Loki API or Grafana's export feature to download logs for analysis.

---

**Last Updated:** February 2026
