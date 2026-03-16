#!/bin/bash
#
# GovChat Matrix Homeserver — One-Command Setup
# Run this on your Hostinger VPS (Ubuntu 24.04, 8GB RAM)
#
# Usage: curl -sSL <url> | bash
# Or: bash setup-govchat-server.sh
#

set -e

DOMAIN="govchat.askozzy.work"
POSTGRES_PASSWORD="GovChat_DB_$(openssl rand -hex 12)"
SYNAPSE_REGISTRATION_SECRET="reg_$(openssl rand -hex 24)"
ADMIN_USER="govchat-admin"
ADMIN_PASSWORD="GovAdmin_$(openssl rand -hex 8)"

echo ""
echo "══════════════════════════════════════════════════════"
echo "  GovChat Matrix Homeserver Setup"
echo "  Domain: $DOMAIN"
echo "══════════════════════════════════════════════════════"
echo ""

# ─── Step 1: Install Docker ───────────────────────────────
echo "[1/7] Installing Docker..."
if ! command -v docker &> /dev/null; then
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "  ✓ Docker installed"
else
    echo "  ✓ Docker already installed"
fi

# ─── Step 2: Create project directory ─────────────────────
echo "[2/7] Creating project directory..."
mkdir -p /opt/govchat
cd /opt/govchat

# ─── Step 3: Generate Synapse config ──────────────────────
echo "[3/7] Generating Synapse configuration..."
mkdir -p synapse-data postgres-data caddy-data

# Generate Synapse config if not exists
if [ ! -f synapse-data/homeserver.yaml ]; then
    docker run -it --rm \
        -v "$(pwd)/synapse-data:/data" \
        -e SYNAPSE_SERVER_NAME="$DOMAIN" \
        -e SYNAPSE_REPORT_STATS=no \
        matrixdotorg/synapse:latest generate
    echo "  ✓ Synapse config generated"
else
    echo "  ✓ Synapse config already exists"
fi

# ─── Step 4: Configure Synapse for GovChat ────────────────
echo "[4/7] Configuring Synapse for GovChat..."
cat > synapse-data/homeserver.yaml << SYNAPSE_EOF
server_name: "$DOMAIN"
pid_file: /data/homeserver.pid
public_baseurl: "https://$DOMAIN/"

listeners:
  - port: 8008
    tpe: http
    tls: false
    x_forwarded: true
    resources:
      - names: [client, federation]
        compress: false

# Database — PostgreSQL
database:
  name: psycopg2
  args:
    user: synapse
    password: "$POSTGRES_PASSWORD"
    database: synapse
    host: postgres
    cp_min: 5
    cp_max: 10

# Registration — disabled (managed via admin API + invite codes)
enable_registration: false
enable_registration_without_verification: false
registration_shared_secret: "$SYNAPSE_REGISTRATION_SECRET"

# E2E encryption — enabled by default for all rooms
encryption_enabled_by_default_for_room_type: all

# Retention policies
retention:
  enabled: true
  default_policy:
    min_lifetime: 1d
    max_lifetime: 365d
  allowed_lifetime_min: 1d
  allowed_lifetime_max: 2555d

# Rate limiting
rc_message:
  per_second: 5
  burst_count: 30

rc_login:
  address:
    per_second: 0.5
    burst_count: 3

# Media storage
media_store_path: /data/media_store
max_upload_size: 50M
max_image_pixels: 32M
url_preview_enabled: true

# Logging
log_config: "/data/log.config"

# Signing key
signing_key_path: "/data/$DOMAIN.signing.key"

# Trusted key servers — disabled for government isolation
trusted_key_servers: []
suppress_key_server_warning: true

# Federation — disabled for isolated government deployment
# federation_domain_whitelist: []

# Admin API
admin_contact: "mailto:admin@$DOMAIN"

# Report stats
report_stats: false
SYNAPSE_EOF

# Create log config
cat > synapse-data/log.config << LOG_EOF
version: 1
formatters:
  precise:
    format: '%(asctime)s - %(name)s - %(lineno)d - %(levelname)s - %(request)s - %(message)s'
handlers:
  console:
    class: logging.StreamHandler
    formatter: precise
loggers:
  synapse.storage.SQL:
    level: WARNING
root:
  level: WARNING
  handlers: [console]
disable_existing_loggers: false
LOG_EOF

echo "  ✓ Synapse configured"

# ─── Step 5: Create Docker Compose ────────────────────────
echo "[5/7] Creating Docker Compose..."
cat > docker-compose.yml << COMPOSE_EOF
services:
  synapse:
    image: matrixdotorg/synapse:latest
    container_name: govchat-synapse
    restart: unless-stopped
    volumes:
      - ./synapse-data:/data
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      - SYNAPSE_CONFIG_PATH=/data/homeserver.yaml
    healthcheck:
      test: ["CMD", "curl", "-fSs", "http://localhost:8008/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 30s

  postgres:
    image: postgres:16-alpine
    container_name: govchat-db
    restart: unless-stopped
    volumes:
      - ./postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: synapse
      POSTGRES_USER: synapse
      POSTGRES_PASSWORD: "$POSTGRES_PASSWORD"
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U synapse"]
      interval: 5s
      timeout: 5s
      retries: 5

  caddy:
    image: caddy:2-alpine
    container_name: govchat-proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - ./caddy-data:/data
      - ./caddy-config:/config
    depends_on:
      synapse:
        condition: service_healthy
COMPOSE_EOF

# Create Caddyfile
cat > Caddyfile << CADDY_EOF
$DOMAIN {
    # Matrix Client-Server API
    handle /_matrix/* {
        reverse_proxy synapse:8008
    }

    # Synapse Admin API
    handle /_synapse/* {
        reverse_proxy synapse:8008
    }

    # Well-known for client auto-discovery
    handle /.well-known/matrix/client {
        header Content-Type application/json
        header Access-Control-Allow-Origin *
        respond \`{"m.homeserver": {"base_url": "https://$DOMAIN"}}\`
    }

    # Well-known for server federation discovery
    handle /.well-known/matrix/server {
        header Content-Type application/json
        respond \`{"m.server": "$DOMAIN:443"}\`
    }

    # Health check endpoint
    handle /health {
        reverse_proxy synapse:8008
    }

    # Default — simple landing
    handle {
        respond "GovChat Matrix Homeserver" 200
    }
}
CADDY_EOF

echo "  ✓ Docker Compose and Caddy configured"

# ─── Step 6: Start everything ─────────────────────────────
echo "[6/7] Starting services (this may take 1-2 minutes on first run)..."
docker compose up -d

# Wait for Synapse to be healthy
echo "  Waiting for Synapse to start..."
for i in {1..60}; do
    if docker compose exec -T synapse curl -fsSo /dev/null http://localhost:8008/health 2>/dev/null; then
        echo "  ✓ Synapse is healthy"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "  ⚠ Synapse didn't start in 60 seconds. Check logs: docker compose logs synapse"
        exit 1
    fi
    sleep 2
done

# ─── Step 7: Create admin user ────────────────────────────
echo "[7/7] Creating admin user..."
docker compose exec -T synapse register_new_matrix_user \
    -u "$ADMIN_USER" \
    -p "$ADMIN_PASSWORD" \
    -a \
    -c /data/homeserver.yaml \
    http://localhost:8008 2>/dev/null || echo "  (Admin user may already exist)"

echo "  ✓ Admin user created"

# ─── Save credentials ────────────────────────────────────
cat > /opt/govchat/credentials.txt << CREDS_EOF
══════════════════════════════════════════════════════
  GovChat Matrix Homeserver — Credentials
  Generated: $(date)
══════════════════════════════════════════════════════

  Domain:              https://$DOMAIN
  Server Name:         $DOMAIN

  Admin User:          @$ADMIN_USER:$DOMAIN
  Admin Password:      $ADMIN_PASSWORD

  Registration Secret: $SYNAPSE_REGISTRATION_SECRET
  Postgres Password:   $POSTGRES_PASSWORD

  Admin API:           https://$DOMAIN/_synapse/admin/v2/
  Health Check:        https://$DOMAIN/health

══════════════════════════════════════════════════════
  KEEP THIS FILE SECURE. DO NOT SHARE.
══════════════════════════════════════════════════════
CREDS_EOF

chmod 600 /opt/govchat/credentials.txt

# ─── Open firewall ports ──────────────────────────────────
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp 2>/dev/null || true
    ufw allow 443/tcp 2>/dev/null || true
fi

# ─── Final output ─────────────────────────────────────────
echo ""
echo ""
echo "══════════════════════════════════════════════════════"
echo "  ✅ GovChat Matrix Homeserver is LIVE!"
echo "══════════════════════════════════════════════════════"
echo ""
echo "  🌐 URL:           https://$DOMAIN"
echo "  🔑 Admin User:    @$ADMIN_USER:$DOMAIN"
echo "  🔑 Admin Pass:    $ADMIN_PASSWORD"
echo "  🔑 Reg Secret:    $SYNAPSE_REGISTRATION_SECRET"
echo ""
echo "  📋 Credentials saved to: /opt/govchat/credentials.txt"
echo ""
echo "  Test it:  curl https://$DOMAIN/health"
echo ""
echo "  ⚠️  COPY THE REGISTRATION SECRET ABOVE"
echo "  ⚠️  You need to give it to Claude to update"
echo "  ⚠️  the browser code."
echo ""
echo "══════════════════════════════════════════════════════"
echo ""
