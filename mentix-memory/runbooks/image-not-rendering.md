# Runbook: Image Not Rendering

_Category: product-data | Severity: MEDIUM | Debugger: product-flow-debugger_

---

## Symptom
A product shows an SVG placeholder or no image instead of the real product photo.

## Diagnostic Sequence

### Step 1 — Check product.images array
```sql
SELECT p.id, p.title, p.images FROM products WHERE id = 'PRODUCT_ID';
```
If `images` is null or empty array → images not linked at product level.

### Step 2 — Check reverse media lookup
page.tsx uses a fallback: queries media collection where `media.product = productId`.
```sql
SELECT * FROM media WHERE product_id = 'PRODUCT_ID';
```
If media record exists but not in products.images → reverse lookup should catch it.
If reverse lookup also empty → media was never created.

### Step 3 — Check media record URL
```sql
SELECT id, url, filename FROM media WHERE product_id = 'PRODUCT_ID';
```
Is the URL absolute (https://...blob.vercel-storage.com/...)?
If relative (/media/filename) → production upload may have failed.

### Step 4 — Check Vercel Blob Storage
Is BLOB_READ_WRITE_TOKEN set in Vercel env vars?
Try fetching the blob URL directly in browser: does it return the image?
If 403 → blob token expired or wrong scope.

### Step 5 — Check media type
media.type should be 'original' (not 'enhanced').
'enhanced' type may not be displayed in all storefront contexts.

### Step 6 — Check SVG placeholder condition
In page.tsx / ProductCard.tsx:
SVG placeholder should only show when `allImages.length === 0`.
If it's showing alongside real images → rendering logic bug.

## Common Root Causes
| Root Cause | Fix |
|-----------|-----|
| Vercel Blob token expired | Rotate BLOB_READ_WRITE_TOKEN in Vercel |
| Media uploaded locally (not blob) | Re-upload via admin in production |
| products.images not linked | Open product in admin, manually link media |
| Telegram media download failed | Re-send message or manually upload image |
| extractMediaUrls() returned relative URL | Fixed in Step 15 — check deploy |

## Resolution Record Template
```json
{
  "incident": "image-not-rendering",
  "product_id": "",
  "media_id": "",
  "root_cause": "",
  "url_format": "relative | absolute | missing",
  "fix_applied": "",
  "resolved_at": ""
}
```
