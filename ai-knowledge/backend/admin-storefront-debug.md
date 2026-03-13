# Admin → Storefront Product Visibility Debug Guide

_Created: 2026-03-13_
_Trigger: User confirmed products uploaded via admin panel not appearing on storefront_

---

## Problem Description

After uploading a product in the Payload CMS admin panel, the product does not appear on the storefront at uygunayakkabi.com.

---

## Root Cause Candidates (ordered by likelihood)

### 1. Product status is not `active`
- Admin saves product with `draft` or `soldout` status by default
- `page.tsx` fetches only `status: { equals: 'active' }` products
- **Fix:** Open product in admin → set Status field to `active` → save → reload storefront

### 2. `ENABLE_STATIC_FALLBACK` re-enabled via git conflict
- If a git merge reverted UygunApp.jsx, `ENABLE_STATIC_FALLBACK` may be back to `true`
- When `true`, the storefront renders static hardcoded products instead of DB products
- **Check:** Open `src/app/(app)/UygunApp.jsx` → look for `const ENABLE_STATIC_FALLBACK = false`
- **Fix:** Set to `false`, commit, push to main

### 3. Git branch divergence — production running stale frontend
- If local changes were not pushed to `main` before deploying, Vercel may be serving old code
- **Check:** `git log --oneline origin/main -10` — does it include your latest CMS-first pipeline commits?
- **Fix:** Push current main → Vercel auto-deploys → test again

### 4. Next.js cache
- `page.tsx` uses `export const dynamic = 'force-dynamic'` which should bypass SSG cache
- But browser cache may still serve an old page
- **Check:** Hard reload with Ctrl+Shift+R (or Cmd+Shift+R on Mac)
- **Fix:** Add `cache: 'no-store'` to fetch calls in page.tsx if issue persists

### 5. API endpoint not returning products
- Visit `https://uygunayakkabi.com/api/products?limit=10&where[status][equals]=active`
- If no products returned: DB issue, not frontend issue
- **Check:** Log into admin → Products collection → verify products exist with status=active

### 6. Media/image mapping failure (products appear but images missing)
- Product may appear in storefront but without images
- Check if image was uploaded via Media collection with "İlgili Ürün" field set vs. via the product's `images[]` field directly
- Both paths are handled: direct images[] first, reverse media lookup second
- If still blank: check that Vercel Blob URL is valid (starts with `https://...blob.vercel-storage.com/...`)

---

## Diagnostic Command Sequence

Run these in order before touching any code:

```bash
# 1. Confirm you are on main and it is clean
git status
git branch -a
git log --oneline --graph --all -20

# 2. If on a feature branch, switch to main
git checkout main
git pull origin main

# 3. Confirm ENABLE_STATIC_FALLBACK is false
grep "ENABLE_STATIC_FALLBACK" src/app/\(app\)/UygunApp.jsx

# 4. Restart dev server to apply any schema changes
npm run dev
```

---

## Prevention Rules

- Always set product Status to `active` when creating a test product
- Always verify you are on `main` before pushing (see D-042)
- After any git merge, search for `ENABLE_STATIC_FALLBACK` to confirm it was not reverted
- Do not use `git reset --hard` unless you are certain no local commits will be lost

---

## Related Decisions
- D-031 — Static Products as Fallback (SUPERSEDED in production — `ENABLE_STATIC_FALLBACK = false`)
- D-036 — Reverse Media Lookup
- D-042 — Git Branch Strategy
- D-043 — Admin → Storefront Pipeline Requires End-to-End Validation
