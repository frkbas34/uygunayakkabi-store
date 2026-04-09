#!/bin/bash
# ──────────────────────────────────────────────────────────────────────
# Vercel ignoreCommand — skip builds when only non-runtime files changed
# ──────────────────────────────────────────────────────────────────────
# Exit 0 = SKIP build   |   Exit 1 = PROCEED with build
#
# Runtime-relevant paths (trigger builds):
#   src/           — Next.js app, API routes, Payload collections, libs
#   public/        — static assets
#   payload.config.ts, next.config.ts, tsconfig.json
#   package.json, package-lock.json
#   tailwind.config.ts, postcss.config.mjs, eslint.config.mjs
#   vercel.json    — crons, redirects, build config
#   seed.ts        — Payload seed
#   .npmrc         — npm config
#
# Non-runtime paths (safe to skip):
#   project-control/  ai-knowledge/  docs/  mentix-memory/
#   mentix-skills/  n8n-workflows/  scripts/  media/
#   *.md  *.txt  *.html (at root)  *.docx (at root)
#   .env.example  .gitignore
# ──────────────────────────────────────────────────────────────────────

echo "🔍 Checking if build is needed..."

# Safety: if no previous SHA, always build (first deploy / forced redeploy)
if [ -z "$VERCEL_GIT_PREVIOUS_SHA" ]; then
  echo "⚡ No previous SHA — first deploy or forced redeploy. Building."
  exit 1
fi

# Get changed files between previous and current commit
CHANGED=$(git diff --name-only "$VERCEL_GIT_PREVIOUS_SHA" "$VERCEL_GIT_COMMIT_SHA" 2>/dev/null)

if [ -z "$CHANGED" ]; then
  echo "⚡ No changed files detected (empty diff). Building as safety fallback."
  exit 1
fi

echo "Changed files:"
echo "$CHANGED"
echo ""

# Check each changed file against runtime patterns
# If ANY file matches a runtime path → must build
NEEDS_BUILD=false

while IFS= read -r file; do
  case "$file" in
    # Runtime directories
    src/*)                    NEEDS_BUILD=true; echo "🔨 Runtime: $file" ;;
    public/*)                 NEEDS_BUILD=true; echo "🔨 Runtime: $file" ;;

    # Runtime config files (exact match at root)
    payload.config.ts)        NEEDS_BUILD=true; echo "🔨 Runtime: $file" ;;
    next.config.ts)           NEEDS_BUILD=true; echo "🔨 Runtime: $file" ;;
    tsconfig.json)            NEEDS_BUILD=true; echo "🔨 Runtime: $file" ;;
    package.json)             NEEDS_BUILD=true; echo "🔨 Runtime: $file" ;;
    package-lock.json)        NEEDS_BUILD=true; echo "🔨 Runtime: $file" ;;
    tailwind.config.ts)       NEEDS_BUILD=true; echo "🔨 Runtime: $file" ;;
    postcss.config.mjs)       NEEDS_BUILD=true; echo "🔨 Runtime: $file" ;;
    eslint.config.mjs)        NEEDS_BUILD=true; echo "🔨 Runtime: $file" ;;
    vercel.json)              NEEDS_BUILD=true; echo "🔨 Runtime: $file" ;;
    seed.ts)                  NEEDS_BUILD=true; echo "🔨 Runtime: $file" ;;
    .npmrc)                   NEEDS_BUILD=true; echo "🔨 Runtime: $file" ;;

    # Everything else is non-runtime
    *)                        echo "📄 Skip-safe: $file" ;;
  esac
done <<< "$CHANGED"

echo ""

if [ "$NEEDS_BUILD" = true ]; then
  echo "⚡ Runtime files changed — proceeding with build."
  exit 1
else
  echo "✅ Only non-runtime files changed — skipping build."
  exit 0
fi
