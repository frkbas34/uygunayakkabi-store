#!/usr/bin/env bash
# Optional OpenClaw VPS skill sync. Hermes/Mentix is current; OpenClaw is
# historical/optional and must be deliberately reactivated before this runs.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash scripts/vps-deploy.sh --reactivate-openclaw --confirm-vps-sync

This script writes the OpenClaw VPS configuration, copies repo skills, and
restarts the OpenClaw container. Hermes/Mentix is the current agent-control
layer. Run the read-only verification checklist first:
  mentix-skills/OPENCLAW_VPS_VERIFICATION.md

Both flags are required. A normal invocation always exits without contacting
the VPS or changing files.
EOF
}

reactivate_openclaw=false
confirm_vps_sync=false

for arg in "$@"; do
  case "$arg" in
    --reactivate-openclaw) reactivate_openclaw=true ;;
    --confirm-vps-sync) confirm_vps_sync=true ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ "$reactivate_openclaw" != true || "$confirm_vps_sync" != true ]]; then
  echo "Refusing OpenClaw VPS sync: it is historical/optional while Hermes/Mentix is current." >&2
  echo "Run the read-only verification checklist, then supply both explicit reactivation flags." >&2
  usage >&2
  exit 2
fi

OPENCLAW_DIR="/home/furkan/.openclaw"
SKILLS_DIR="$OPENCLAW_DIR/skills"
MEMORY_DIR="$OPENCLAW_DIR/mentix-memory"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OPENCLAW_CONFIG="$OPENCLAW_DIR/openclaw.json"
OPERATOR_TELEGRAM_ID="5232747260"

if [[ ! -f "$OPENCLAW_CONFIG" ]]; then
  echo "Missing OpenClaw config: $OPENCLAW_CONFIG" >&2
  exit 2
fi

if [[ ! -d /opt/openclaw ]]; then
  echo "Missing OpenClaw installation: /opt/openclaw" >&2
  exit 2
fi

echo "Optional OpenClaw VPS sync started: $(date '+%Y-%m-%d %H:%M:%S')"
echo "OpenClaw was explicitly reactivated for this run."

echo "[1/5] Updating group allowlist..."
cp "$OPENCLAW_CONFIG" "$OPENCLAW_CONFIG.bak.$(date +%s)"
python3 - "$OPENCLAW_CONFIG" "$OPERATOR_TELEGRAM_ID" <<'PY'
import json
import sys

path, operator_id = sys.argv[1], int(sys.argv[2])
with open(path, encoding='utf-8') as source:
    config = json.load(source)

updated = False
if 'groupAllowFrom' in config:
    if operator_id not in config['groupAllowFrom']:
        config['groupAllowFrom'].append(operator_id)
        updated = True
elif 'channels' in config and 'telegram' in config['channels']:
    telegram = config['channels']['telegram']
    if 'groupAllowFrom' in telegram:
        if operator_id not in telegram['groupAllowFrom']:
            telegram['groupAllowFrom'].append(operator_id)
            updated = True
    else:
        telegram['groupAllowFrom'] = [5450039553, 8049990232, operator_id]
        updated = True

with open(path, 'w', encoding='utf-8') as destination:
    json.dump(config, destination, indent=2)

allowlist = config.get('groupAllowFrom') or config.get('channels', {}).get('telegram', {}).get('groupAllowFrom', [])
print(f'  operator allowlist entry: {"added" if updated else "already present"}')
print(f'  groupAllowFrom: {allowlist}')
PY

echo "[2/5] Deploying reviewed mentix-skills..."
mkdir -p "$SKILLS_DIR"
cp -r "$REPO_DIR/mentix-skills/." "$SKILLS_DIR/"
echo "  Skills deployed: $(ls "$SKILLS_DIR" | tr '\n' ' ')"

echo "[3/5] Creating mentix-memory structure..."
for layer in identity policies runbooks incidents traces patterns decisions evaluations rewards evals summaries archive; do
  mkdir -p "$MEMORY_DIR/$layer"
done
cp "$REPO_DIR/mentix-memory/traces/TRACE_SCHEMA.json" "$MEMORY_DIR/traces/" 2>/dev/null || true
cp "$REPO_DIR/mentix-memory/evals/GOLDEN_CASES.json" "$MEMORY_DIR/evals/" 2>/dev/null || true
for directory in runbooks policies identity; do
  if [[ -d "$REPO_DIR/mentix-memory/$directory" ]]; then
    cp "$REPO_DIR/mentix-memory/$directory/"*.md "$MEMORY_DIR/$directory/" 2>/dev/null || true
  fi
done
echo "  Layers: $(ls "$MEMORY_DIR" | tr '\n' ' ')"

echo "[4/5] Restarting OpenClaw..."
(
  cd /opt/openclaw
  docker compose restart
)
sleep 6

echo "[5/5] Verifying OpenClaw..."
python3 - "$OPENCLAW_CONFIG" "$OPERATOR_TELEGRAM_ID" <<'PY'
import json
import sys

path, operator_id = sys.argv[1], int(sys.argv[2])
with open(path, encoding='utf-8') as source:
    config = json.load(source)
allowlist = config.get('groupAllowFrom') or config.get('channels', {}).get('telegram', {}).get('groupAllowFrom', [])
print(f'  groupAllowFrom: {allowlist}')
print(f'  operator allowlist entry: {"present" if operator_id in allowlist else "missing"}')
PY
echo "  Skills on VPS: $(ls "$SKILLS_DIR")"
echo "  Last 15 OpenClaw log lines:"
docker logs openclaw-openclaw-gateway-1 --tail 15 2>&1
echo "Optional OpenClaw VPS sync completed. Run only the read-only Telegram prompts from OPENCLAW_VPS_VERIFICATION.md next."
