#!/usr/bin/env bash
# Build and upload the Cargontainer Marketplace frontend to Loopia (marketplace.cargontainer.com).
# Same pattern as TMS Agency's deploy.sh. FTP credentials come from .env.deploy (gitignored):
# LOOPIA_FTP_SERVER, LOOPIA_FTP_USERNAME, LOOPIA_FTP_PASSWORD,
# LOOPIA_FTP_DOCROOT (marketplace.cargontainer.com/public_html).
# Supabase URL/anon key come from .env.supabase; the API points at the Render backend.
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ./.env.deploy; set +a
: "${LOOPIA_FTP_SERVER:?}" "${LOOPIA_FTP_USERNAME:?}" "${LOOPIA_FTP_PASSWORD:?}" "${LOOPIA_FTP_DOCROOT:?}"

API="https://cargontainer-marketplace-api.onrender.com"
VITE_API_ORIGIN="$API" VITE_API_BASE_URL="$API" VITE_API_BASE="$API" npx vite build --mode supabase

BASE="ftp://${LOOPIA_FTP_SERVER}/${LOOPIA_FTP_DOCROOT}"
AUTH="${LOOPIA_FTP_USERNAME}:${LOOPIA_FTP_PASSWORD}"
cd dist
# assets first, index.html last, so visitors never get an index pointing at missing files
find . -type f ! -name index.html | sed 's#^\./##' | sort | while read -r f; do
  echo "upload $f"
  curl -sS --ssl-reqd --ftp-create-dirs --max-time 120 -T "$f" "$BASE/$f" --user "$AUTH"
done
echo "upload index.html"
curl -sS --ssl-reqd --max-time 60 -T index.html "$BASE/index.html" --user "$AUTH"
echo "done: https://marketplace.cargontainer.com/"
