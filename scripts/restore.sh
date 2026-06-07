#!/usr/bin/env bash
# Restore a backup produced by backup.sh into the Docker volumes.
#
#   ./scripts/restore.sh backups/finops-backup-YYYY-MM-DD_HHMM.tgz
#
# WARNING: this overwrites the current database and uploads. Stop the app first.
set -euo pipefail

cd "$(dirname "$0")/.."

ARCHIVE="${1:-}"
if [[ -z "$ARCHIVE" || ! -f "$ARCHIVE" ]]; then
  echo "Usage: ./scripts/restore.sh <path-to-backup.tgz>" >&2
  echo "Available backups:" >&2
  ls -1 backups/finops-backup-*.tgz 2>/dev/null || echo "  (none)" >&2
  exit 1
fi

read -r -p "This OVERWRITES current data with $ARCHIVE. Continue? [y/N] " ans
[[ "$ans" == "y" || "$ans" == "Y" ]] || { echo "Aborted."; exit 1; }

echo "Stopping app…"
docker compose -f docker-compose.prod.yml stop app || true

ABS="$(cd "$(dirname "$ARCHIVE")" && pwd)/$(basename "$ARCHIVE")"
docker run --rm \
  -v finops_data:/data \
  -v finops_uploads:/uploads \
  -v "$ABS:/restore.tgz:ro" \
  alpine sh -c "rm -rf /data/* /uploads/* && tar xzf /restore.tgz -C /"

echo "Starting app…"
docker compose -f docker-compose.prod.yml start app
echo "Restore complete from $ARCHIVE"
