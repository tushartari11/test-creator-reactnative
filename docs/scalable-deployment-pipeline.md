# Hetzner VPS Deployment Guide (Option A)

Single VPS, Docker + Docker Compose only. No Kubernetes, no orchestration overhead.
Right for active development and early production.

**Server:** Hetzner CX23  
**Stack:** Docker Compose + Caddy (HTTPS + reverse proxy)  
**Deploy method:** GitHub Actions → SSH → `deploy-prod.sh`

---

## Architecture

```
Internet (443/80)
     │
  Caddy (host process)  ← TLS termination + reverse proxy
     │
  testcreator-app (Docker, port 8080)  ← Spring Boot: API + Expo static files
     │
  testcreator-postgres   testcreator-redis   (Docker, internal network only)
```

Spring Boot serves both the REST API (`/api/**`) and the Expo web build (static files at `/`).
Caddy handles HTTPS automatically via Let's Encrypt and proxies all traffic to `localhost:8080`.

---

## 1. Create the VPS

1. Log in to [console.hetzner.com](https://console.hetzner.com)
2. Create a new server: **CX23**, Ubuntu 24.04, add your SSH public key
3. Note the server IP — you'll use it in the steps below

---

## 2. One-Time Server Setup

SSH in as root (`~/.ssh/config` has `Host hetzner-server` pointing to `167.233.130.104`):

```bash
ssh root@hetzner-server
```

### Install Docker

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
```

### Install Caddy

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install caddy
```

### Create deploy user

```bash
useradd -m -s /bin/bash deploy
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
```

### Clone the repository

```bash
su - deploy
mkdir -p ~/apps
cd ~/apps
git clone https://github.com/YOUR_ORG/test-creator-reactnative.git test-creator
cd test-creator
```

### Create `.env`

```bash
cp .env.example .env
nano .env   # fill in real values
```

---

## 3. HTTPS with Caddy

Edit `/etc/caddy/Caddyfile`:

```
yourdomain.com {
    reverse_proxy localhost:8080
}
```

Then reload Caddy:

```bash
systemctl reload caddy
```

Caddy automatically obtains and renews a Let's Encrypt certificate. No manual certificate management needed.

> **No domain yet?** Point Caddy directly at the IP for testing:
> ```
> :80 {
>     reverse_proxy localhost:8080
> }
> ```
> Then access via `http://167.233.130.104` (port 80 via Caddy) or `http://167.233.130.104:8080` (direct to Spring Boot).
> Update `frontend/.env.production` → `EXPO_PUBLIC_API_URL=http://167.233.130.104:8080/api` until a domain is set up.

---

## 4. First Deploy (manual)

Run this once from the VPS to verify everything works before enabling automated deploys:

```bash
su - deploy
cd ~/apps/test-creator
./scripts/deploy-prod.sh
```

Verify:

```bash
# Health check
curl http://localhost:8080/actuator/health

# Via Caddy (HTTPS)
curl https://yourdomain.com/actuator/health
```

---

## 5. GitHub Actions: Automated Deploy

The workflow `.github/workflows/deploy-prod.yml` SSHs into the VPS and runs `deploy-prod.sh`
automatically after CI passes on `main`.

### Generate a deploy SSH key (on your local machine)

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy -N ""
```

### Authorize it on the VPS

```bash
ssh deploy@hetzner-server
cat >> ~/.ssh/authorized_keys << 'EOF'
<paste contents of ~/.ssh/github_actions_deploy.pub>
EOF
```

Verify (uses raw IP since this simulates GitHub Actions, not your SSH config):

```bash
ssh -i ~/.ssh/github_actions_deploy deploy@167.233.130.104 echo "ok"
```

### Add GitHub repository secrets

**Repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret name        | Value                                                   |
|--------------------|---------------------------------------------------------|
| `HETZNER_HOST`     | `167.233.130.104` (raw IP — GitHub Actions ignores ~/.ssh/config) |
| `HETZNER_USER`     | `deploy`                                                |
| `HETZNER_SSH_KEY`  | Full contents of `~/.ssh/github_actions_deploy`         |

### Create a GitHub Environment

**Repo → Settings → Environments → New environment** → name it `production`.

The deploy workflow references this environment, which lets you add deployment protection
rules (e.g. required reviewer) later if needed.

---

## 6. Routine Operations

```bash
# All commands run on the VPS as the deploy user
ssh deploy@hetzner-server   # or: ssh deploy@167.233.130.104

# Manual deploy
cd ~/apps/test-creator
git pull origin main
./scripts/deploy-prod.sh

# View logs
docker compose -f docker-compose.prod.yml logs -f app

# Restart app only (no rebuild)
docker compose -f docker-compose.prod.yml restart app

# Stop everything
docker compose -f docker-compose.prod.yml down

# Health checks
curl http://localhost:8080/actuator/health
curl http://localhost:8080/actuator/health/db
curl http://localhost:8080/actuator/health/redis

# Resource usage
docker stats --no-stream
docker system df
```

---

## 7. Database Backups

Create a daily backup cron job on the VPS:

```bash
crontab -e
# Add:
0 2 * * * cd /home/deploy/apps/test-creator && ./scripts/backup-db.sh --prod >> /home/deploy/backup.log 2>&1
```

Backups are stored in `backups/` and auto-pruned to keep the last 10. To restore:

```bash
./scripts/restore-db.sh --prod backups/testcreator_prod_20260621_020000.sql
```

---

## 8. Monitoring

Prometheus + Grafana are available in the `monitoring/` directory. To enable:

```bash
cd monitoring
docker compose up -d
```

- Grafana: `http://localhost:3000` (or proxy via Caddy on a sub-path)
- Spring Boot metrics: `http://localhost:8080/actuator/prometheus`

For a quick overview without Grafana, `docker stats` and the actuator endpoints are usually enough
during active development.

---

## 9. Rollback

```bash
cd ~/apps/test-creator

# Find last known-good commit
git log --oneline -10

# Roll back the code and redeploy
git checkout <GOOD_SHA> -- backend/
./scripts/deploy-prod.sh

# Or full rollback
git checkout <GOOD_SHA>
./scripts/deploy-prod.sh
```

---

## 10. Upgrade Path (Option B)

When the project is ready for production and needs horizontal scaling, the upgrade path is:

- Add a separate `frontend` Docker container (Nginx serving the Expo web export)
- Add an `nginx-lb` container as a load balancer in front of both
- Update `docker-compose.prod.yml` to allow `--scale backend=N`
- Switch Caddy to proxy to `localhost:80` (nginx-lb) instead of `localhost:8080`

This requires adding 2x CX22 worker nodes and setting up k3s, or staying on a single larger VPS
with multiple container replicas. Defer until there's real traffic requiring it.
