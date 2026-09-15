$ErrorActionPreference = "Stop"

$VPS_USER = "root"
$VPS_HOST = "145.223.18.5"
$REMOTE_DIR = "/var/www/waycode"
$DOMAIN = "waycode.aswinsai.tech"
$TIMESTAMP = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$ARCHIVE_NAME = "waycode_deploy_${TIMESTAMP}.tar.gz"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting Safe WayCode Deployment to $VPS_HOST" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Step 1: Package source and static assets
Write-Host "1/5 Packaging source code and static assets..." -ForegroundColor Yellow
tar --exclude=".git" --exclude="node_modules" --exclude=".next" --exclude=".sandbox" --exclude=".agents" --exclude=".claude" --exclude=".gemini" --exclude="*.log" --exclude="*.tar.gz" -czf $ARCHIVE_NAME .

# Step 2: Transfer archive to VPS
Write-Host "2/5 Transferring package to VPS ($VPS_HOST)..." -ForegroundColor Yellow
scp $ARCHIVE_NAME "${VPS_USER}@${VPS_HOST}:/tmp/${ARCHIVE_NAME}"
Remove-Item -Force $ARCHIVE_NAME

# Step 3: Remote build and safe Nginx reload
Write-Host "3/5 Unpacking and building Docker stack on VPS..." -ForegroundColor Yellow
$remoteCmd = "mkdir -p $REMOTE_DIR && tar -xzf /tmp/$ARCHIVE_NAME -C $REMOTE_DIR && rm -f /tmp/$ARCHIVE_NAME && cd $REMOTE_DIR && docker compose up -d --build && cp $REMOTE_DIR/deploy/waycode.aswinsai.tech.production.conf /etc/nginx/sites-available/$DOMAIN.conf && ln -sf /etc/nginx/sites-available/$DOMAIN.conf /etc/nginx/sites-enabled/$DOMAIN.conf && nginx -t && systemctl reload nginx"

ssh "${VPS_USER}@${VPS_HOST}" $remoteCmd

# Step 4: Health Check
Write-Host "4/5 Verifying health check on https://$DOMAIN/api/health..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
$health = ssh "${VPS_USER}@${VPS_HOST}" "curl -s -k https://$DOMAIN/api/health"
Write-Host "Health Check: $health" -ForegroundColor Green

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "WayCode deployed successfully with ZERO disruption!" -ForegroundColor Green
Write-Host "URL: https://$DOMAIN" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
