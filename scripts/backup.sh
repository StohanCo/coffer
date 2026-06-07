#!/usr/bin/env bash
# Back up the SQLite database + uploaded receipts to ./backups on the host.
#
# Data lives in the Docker named volumes `finops_data` and `finops_uploads`.
# This tars both into a timestamped archive you can copy off-server / cron.
#
#   ./scripts/backup.sh
#   # restore with: ./scripts/restore.sh backups/finops-backup-YYYY-MM-DD_HHMM.tgz
#
# Cron example (daily 02:30, keep it simple):
#   30 2 * * * cd /opt/finops-local && ./scripts/backup.sh >> backups/backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p backups
STAMP="$(date +%F_%H%M)"
OUT="finops-backup-${STAMP}.tgz"

docker run --rm \
  -v finops_data:/data:ro \
  -v finops_uploads:/uploads:ro \
  -v "$PWD/backups:/backup" \
  alpine sh -c "tar czf /backup/${OUT} -C / data uploads"

echo "Backup written: backups/${OUT}"

# Prune backups older than 30 days (best-effort).
find backups -name 'finops-backup-*.tgz' -mtime +30 -delete 2>/dev/null || true
