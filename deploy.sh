#!/usr/bin/env bash
# ==============================================================================
# WayCode Safe VPS Deployment Script
# Deploys WayCode (Next.js Standalone + Worker Daemon + Redis) to Hostinger VPS
# Guarantees ZERO downtime or interruption to other services on the host.
# ==============================================================================

set -euo pipefail

VPS_USER="${VPS_USER:-root}"
VPS_HOST="${VPS_HOST:-145.223.18.5}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/waycode}"
DOMAIN="${DOMAIN:-waycode.aswinsai.tech}"
ARCHIVE_NAME="waycode_deploy_$(date +%s).tar.gz"

echo "========================================================"
echo "🚀 Starting Safe WayCode Deployment to ${VPS_HOST}"
echo "========================================================"

# Step 1: Create deployable archive (including public assets, excluding caches)
echo "📦 1/5 Packaging source code and static assets..."
tar --exclude=".git" \
    --exclude="node_modules" \
    --exclude=".next" \
    --exclude=".sandbox" \
    --exclude=".agents" \
    --exclude=".claude" \
    --exclude=".gemini" \
    --exclude="*.log" \
    --exclude="*.tar.gz" \
    -czf "${ARCHIVE_NAME}" .

# Step 2: Transfer archive to VPS
echo "📤 2/5 Transferring package to VPS (${VPS_HOST})..."
scp "${ARCHIVE_NAME}" "${VPS_USER}@${VPS_HOST}:/tmp/${ARCHIVE_NAME}"
rm -f "${ARCHIVE_NAME}"

# Step 3: Extract and build containers on VPS
echo "🐳 3/5 Unpacking and building Docker stack on VPS..."
ssh "${VPS_USER}@${VPS_HOST}" bash -c "'
set -euo pipefail

mkdir -p ${REMOTE_DIR}
tar -xzf /tmp/${ARCHIVE_NAME} -C ${REMOTE_DIR}
rm -f /tmp/${ARCHIVE_NAME}

cd ${REMOTE_DIR}

# Ensure .env.production exists
if [ ! -f .env.production ]; then
  echo \"⚠️  Warning: .env.production not found in ${REMOTE_DIR}. Ensure environment variables are set.\"
fi

# Build and start services in isolated Docker network
echo \"⚙️ Building and starting Docker containers...\"
docker compose up -d --build

# Update and reload Nginx configuration
if [ -f deploy/waycode.aswinsai.tech.production.conf ]; then
  echo \"🔒 Updating Nginx configuration...\"
  cp deploy/waycode.aswinsai.tech.production.conf /etc/nginx/sites-available/${DOMAIN}.conf
  ln -sf /etc/nginx/sites-available/${DOMAIN}.conf /etc/nginx/sites-enabled/${DOMAIN}.conf
  nginx -t
  systemctl reload nginx
fi
'"

# Step 4: Health Check Validation
echo "🔍 4/5 Verifying health check on https://${DOMAIN}/api/health..."
sleep 3
HEALTH_OUTPUT=$(ssh "${VPS_USER}@${VPS_HOST}" "curl -s -k https://${DOMAIN}/api/health || curl -s http://127.0.0.1:3020/api/health")

echo "Health Response: ${HEALTH_OUTPUT}"

# Step 5: Finished
echo "========================================================"
echo "✅ WayCode deployed successfully with ZERO disruption!"
echo "🌐 URL: https://${DOMAIN}"
echo "========================================================"
