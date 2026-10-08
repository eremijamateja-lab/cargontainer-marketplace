#!/usr/bin/env bash
# One-time: create .env.deploy (gitignored) from TMS Agency's FTP settings, same Loopia
# account, only the docroot switched to marketplace.cargontainer.com.
set -euo pipefail
cd "$(dirname "$0")"
SRC="../../../cargontainer-tms/.env.deploy"
sed "s#tms-agency.cargontainer#marketplace.cargontainer#" "$SRC" > .env.deploy
grep -q "marketplace.cargontainer.com" .env.deploy && echo "OK: .env.deploy created for marketplace.cargontainer.com"
