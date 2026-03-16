#!/bin/bash
# Mentix VPS Deploy Script
# Çalıştır: bash scripts/vps-deploy.sh (repo root'tan, VPS'te)

set -e
OPENCLAW_DIR="/home/furkan/.openclaw"
SKILLS_DIR="$OPENCLAW_DIR/skills"
MEMORY_DIR="$OPENCLAW_DIR/mentix-memory"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Mentix VPS Deploy — $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════════════"

# 1. Bahriyar allowlist
echo ""
echo "[ 1/5 ] Updating groupAllowFrom..."
cp "$OPENCLAW_DIR/openclaw.json" "$OPENCLAW_DIR/openclaw.json.bak.$(date +%s)"
python3 -c "
import json
path = '/home/furkan/.openclaw/openclaw.json'
with open(path) as f: cfg = json.load(f)
bahriyar = 5232747260
updated = False
if 'groupAllowFrom' in cfg:
    if bahriyar not in cfg['groupAllowFrom']:
        cfg['groupAllowFrom'].append(bahriyar); updated = True
elif 'channels' in cfg and 'telegram' in cfg['channels']:
    tg = cfg['channels']['telegram']
    if 'groupAllowFrom' in tg:
        if bahriyar not in tg['groupAllowFrom']:
            tg['groupAllowFrom'].append(bahriyar); updated = True
    else:
        tg['groupAllowFrom'] = [5450039553, 8049990232, bahriyar]; updated = True
with open(path, 'w') as f: json.dump(cfg, f, indent=2)
gaf = cfg.get('groupAllowFrom') or cfg.get('channels',{}).get('telegram',{}).get('groupAllowFrom',[])
print(f'  Bahriyar: {\"ADDED\" if updated else \"already present\"}')
print(f'  groupAllowFrom: {gaf}')
"

# 2. Deploy skills
echo ""
echo "[ 2/5 ] Deploying mentix-skills to $SKILLS_DIR..."
mkdir -p "$SKILLS_DIR"
cp -r "$REPO_DIR/mentix-skills/"* "$SKILLS_DIR/"
echo "  Skills deployed: $(ls $SKILLS_DIR | tr '\n' ' ')"

# 3. mentix-memory structure
echo ""
echo "[ 3/5 ] Creating mentix-memory at $MEMORY_DIR..."
for layer in identity policies runbooks incidents traces patterns decisions evaluations rewards evals summaries archive; do
    mkdir -p "$MEMORY_DIR/$layer"
done
# Copy only schema/template files (not sim data)
cp "$REPO_DIR/mentix-memory/traces/TRACE_SCHEMA.json"   "$MEMORY_DIR/traces/"  2>/dev/null || true
cp "$REPO_DIR/mentix-memory/evals/GOLDEN_CASES.json"    "$MEMORY_DIR/evals/"   2>/dev/null || true
for f in runbooks policies identity; do
    [ -d "$REPO_DIR/mentix-memory/$f" ] && cp "$REPO_DIR/mentix-memory/$f/"*.md "$MEMORY_DIR/$f/" 2>/dev/null || true
done
echo "  Layers: $(ls $MEMORY_DIR | tr '\n' ' ')"

# 4. Restart
echo ""
echo "[ 4/5 ] Restarting OpenClaw..."
cd /opt/openclaw && docker compose restart
sleep 6

# 5. Verify
echo ""
echo "[ 5/5 ] Verify..."
python3 -c "
import json
with open('/home/furkan/.openclaw/openclaw.json') as f: cfg = json.load(f)
gaf = cfg.get('groupAllowFrom') or cfg.get('channels',{}).get('telegram',{}).get('groupAllowFrom',[])
print(f'  groupAllowFrom: {gaf}')
print(f'  Bahriyar 5232747260: {\"✅\" if 5232747260 in gaf else \"❌ NOT FOUND\"}')
"
echo "  Skills on VPS: $(ls $SKILLS_DIR)"
echo ""
echo "  Last 15 log lines:"
docker logs openclaw-openclaw-gateway-1 --tail 15 2>&1
echo ""
echo "═══════════════════════════════════════════════════"
echo "  Deploy tamamlandı ✅"
echo "  Test: Grupta @Mentix mention at → yanıt bekle"
echo "═══════════════════════════════════════════════════"
