#!/usr/bin/env bash
# One-shot setup for a fresh Ubuntu 22.04 / 24.04 VPS (Node + systemd + nginx + free HTTPS).
#   sudo bash deploy/setup-vps.sh your-domain.com you@email.com
# Point your domain's A record at the server's IP first.
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"
APP_DIR=/opt/safari-rescue
ENV_FILE=/etc/safari-rescue.env

[ "$(id -u)" -eq 0 ] || { echo "Run as root:  sudo bash deploy/setup-vps.sh <domain> [email]"; exit 1; }
[ -n "$DOMAIN" ] || { echo "Usage: sudo bash deploy/setup-vps.sh <domain> [email]"; exit 1; }
SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Installing packages"
apt-get update -y
apt-get install -y curl ca-certificates nginx

if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  echo "==> Installing Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "==> Installing the app into $APP_DIR"
id safari >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin safari
mkdir -p "$APP_DIR"
if [ "$SRC_DIR" != "$APP_DIR" ]; then cp -a "$SRC_DIR"/. "$APP_DIR"/; fi
mkdir -p "$APP_DIR/data"
(cd "$APP_DIR" && npm install --omit=dev)
chown -R safari:safari "$APP_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "==> Writing $ENV_FILE"
  SECRET="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  ADMIN="$(head -c 18 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  cat > "$ENV_FILE" <<EOT
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
SESSION_SECRET=$SECRET
ADMIN_TOKEN=$ADMIN
DEMO_MODE=1
# DATABASE_URL=postgres://user:password@localhost:5432/safari
# PGSSL=disable
EOT
  chmod 600 "$ENV_FILE"
  echo "    Your /admin password is: $ADMIN   (also saved in $ENV_FILE)"
fi

echo "==> Starting the service"
cp "$APP_DIR/deploy/safari-rescue.service" /etc/systemd/system/safari-rescue.service
systemctl daemon-reload
systemctl enable --now safari-rescue

echo "==> Configuring nginx for $DOMAIN"
sed "s/YOUR_DOMAIN/$DOMAIN/g" "$APP_DIR/deploy/nginx.conf" > /etc/nginx/sites-available/safari-rescue
ln -sf /etc/nginx/sites-available/safari-rescue /etc/nginx/sites-enabled/safari-rescue
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

if [ -n "$EMAIL" ]; then
  echo "==> Getting a free HTTPS certificate"
  apt-get install -y certbot python3-certbot-nginx
  certbot --nginx -d "$DOMAIN" -m "$EMAIL" --agree-tos --no-eff-email --redirect -n
else
  echo "==> Skipped HTTPS. When your DNS is ready run:  apt-get install -y certbot python3-certbot-nginx && certbot --nginx -d $DOMAIN"
fi

echo "Done. Open http://$DOMAIN  (logs: journalctl -u safari-rescue -f)"
