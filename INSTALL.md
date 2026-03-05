# UygunAyakkabı Patch — Grid Upgrade + Payload CMS Fix

## Değişen Dosyalar (5 adet)

| Dosya | Ne Değişti |
|---|---|
| `app/UygunApp.jsx` | 24 ürün, 4/3/2 grid, Load More, hover upgrade |
| `app/(payload)/layout.tsx` | **YENİ** — Payload admin layout (eksikti) |
| `app/(payload)/admin/[[...segments]]/page.tsx` | Doğrulandı (değişmedi) |
| `app/(payload)/api/[...slug]/route.ts` | Doğrulandı (değişmedi) |
| `payload.config.ts` | `__dirname` → `import.meta.url` fix |

## Kurulum Adımları

### 1) feat/product-card branch'ine geç
```powershell
cd C:\Projects\uygunayakkabi-store
git checkout feat/product-card
```

### 2) Dosyaları kopyala
Bu zip'teki dosyaları projenin kök dizinine kopyala (üstüne yaz):
- `app/UygunApp.jsx` → `C:\Projects\uygunayakkabi-store\app\UygunApp.jsx`
- `app/(payload)/layout.tsx` → `C:\Projects\uygunayakkabi-store\app\(payload)\layout.tsx`
- `payload.config.ts` → `C:\Projects\uygunayakkabi-store\payload.config.ts`

### 3) .env dosyası oluştur (yoksa)
```powershell
# C:\Projects\uygunayakkabi-store\.env
DATABASE_URI=postgresql://user:pass@host:5432/dbname
PAYLOAD_SECRET=bir-gizli-anahtar-buraya-yaz
```
Not: DATABASE_URI olmadan Payload çalışmaz. Supabase kullanıyorsan
connection string'i Supabase dashboard'dan al.

### 4) Dev server başlat
```powershell
Remove-Item -Force .next\dev\lock -ErrorAction SilentlyContinue
npm run dev
```

### 5) Test
- http://localhost:3000 → Ana sayfa (24 ürün, 4 sütun grid)
- http://localhost:3000 → Ayakkabılar'a tıkla → 12 ürün + "Daha Fazla Göster"
- http://localhost:3000/admin → Payload admin paneli
