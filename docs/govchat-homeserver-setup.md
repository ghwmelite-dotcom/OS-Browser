# GovChat Homeserver Setup Guide

GovChat uses the [Matrix protocol](https://matrix.org) for secure, federated messaging. This guide covers deploying a Synapse homeserver for government use.

## Quick Start (Docker Compose)

### Prerequisites
- Docker & Docker Compose
- A domain (e.g., `matrix.gov.gh`)
- SSL certificate (Let's Encrypt or government-issued)

### 1. Create `docker-compose.yml`

```yaml
version: "3.8"

services:
  synapse:
    image: matrixdotorg/synapse:latest
    container_name: govchat-synapse
    restart: unless-stopped
    volumes:
      - ./synapse-data:/data
    environment:
      - SYNAPSE_SERVER_NAME=matrix.gov.gh
      - SYNAPSE_REPORT_STATS=no
    ports:
      - "8008:8008"   # Client-Server API
      - "8448:8448"   # Server-Server federation (optional)

  postgres:
    image: postgres:16-alpine
    container_name: govchat-db
    restart: unless-stopped
    volumes:
      - ./postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: synapse
      POSTGRES_USER: synapse
      POSTGRES_PASSWORD: "${POSTGRES_PASSWORD}"
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"

  redis:
    image: redis:7-alpine
    container_name: govchat-redis
    restart: unless-stopped

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
```

### 2. Generate Synapse Config

```bash
docker run -it --rm \
  -v "$(pwd)/synapse-data:/data" \
  -e SYNAPSE_SERVER_NAME=matrix.gov.gh \
  -e SYNAPSE_REPORT_STATS=no \
  matrixdotorg/synapse:latest generate
```

### 3. Configure `synapse-data/homeserver.yaml`

Key settings for government deployment:

```yaml
server_name: "matrix.gov.gh"

# Database (PostgreSQL for production)
database:
  name: psycopg2
  args:
    user: synapse
    password: "${POSTGRES_PASSWORD}"
    database: synapse
    host: postgres
    cp_min: 5
    cp_max: 10

# Disable open registration — users are created via invite codes
enable_registration: false
enable_registration_without_verification: false

# E2E encryption — enable by default for all rooms
encryption_enabled_by_default_for_room_type: all

# Retention policies (matching GovChat classification levels)
retention:
  enabled: true
  default_policy:
    min_lifetime: 1d
    max_lifetime: 365d
  allowed_lifetime_min: 1d
  allowed_lifetime_max: 2555d  # 7 years for SECRET

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

# Logging
log_config: "/data/matrix.gov.gh.log.config"

# Redis for worker mode (optional, for scaling)
redis:
  enabled: true
  host: redis
  port: 6379

# Federation — disable for isolated government deployment
# Enable only if inter-ministry federation is needed
federation_domain_whitelist: []
# Or whitelist specific ministries:
# federation_domain_whitelist:
#   - matrix.mof.gov.gh
#   - matrix.ohcs.gov.gh

# Trusted key servers (disable public ones for gov)
trusted_key_servers: []
suppress_key_server_warning: true
```

### 4. Create Caddyfile (Reverse Proxy + SSL)

```
matrix.gov.gh {
    # Client-Server API
    handle /_matrix/* {
        reverse_proxy synapse:8008
    }

    # Well-known for client discovery
    handle /.well-known/matrix/client {
        header Content-Type application/json
        respond `{"m.homeserver": {"base_url": "https://matrix.gov.gh"}}`
    }

    # Well-known for server discovery (federation)
    handle /.well-known/matrix/server {
        header Content-Type application/json
        respond `{"m.server": "matrix.gov.gh:443"}`
    }
}
```

### 5. Launch

```bash
# Set environment variables
export POSTGRES_PASSWORD="your-secure-password-here"

# Start services
docker compose up -d

# Check logs
docker compose logs -f synapse
```

## User Management via Admin API

GovChat uses invite codes (managed by the OS Browser Worker) to provision users. The worker calls the Synapse Admin API to create accounts.

### Create a User (Admin API)

```bash
curl -X PUT "https://matrix.gov.gh/_synapse/admin/v2/users/@staffid:matrix.gov.gh" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayname": "Kwame Mensah",
    "password": "generated-password",
    "admin": false,
    "deactivated": false
  }'
```

### Create Admin User (first-time setup)

```bash
docker exec -it govchat-synapse register_new_matrix_user \
  -u admin \
  -p admin-password \
  -a \
  -c /data/homeserver.yaml \
  http://localhost:8008
```

## GovChat Worker Configuration

Update `worker/wrangler.toml` with your homeserver URL:

```toml
[vars]
MATRIX_HOMESERVER_URL = "https://matrix.gov.gh"
```

And set the admin token as a secret:

```bash
wrangler secret put MATRIX_ADMIN_TOKEN
```

## Security Checklist

- [ ] SSL/TLS with government-approved certificate
- [ ] PostgreSQL with encrypted connections
- [ ] Synapse admin API restricted to internal network
- [ ] Federation disabled or whitelisted
- [ ] Registration disabled (invite-code only)
- [ ] E2E encryption enabled by default
- [ ] Retention policies configured per classification
- [ ] Backup strategy for database and media store
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] Network segmentation (synapse not directly internet-facing)

## Scaling

For deployments serving 1,000+ users, enable Synapse worker mode:

1. Enable Redis (already in docker-compose)
2. Add worker processes for federation, sync, media
3. Use a load balancer in front of workers
4. Monitor with Prometheus + Grafana

See [Synapse Workers documentation](https://matrix-org.github.io/synapse/latest/workers.html).
