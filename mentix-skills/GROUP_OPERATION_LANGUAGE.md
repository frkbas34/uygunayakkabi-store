# Mentix Grup Operasyon Dili v1

_Policy: Chat Scope v3 — DM ve approved ops group capability olarak aynı_
_Trigger farkı: DM = her mesaj, Ops Group = sadece @mention_
_Created: 2026-03-17_

---

## 1. Temel Kullanım Kuralı

```
Mentix grupta her mesajı DINLEMEZ.
Sadece etiketlenince aktive olur.
Aktive olduğunda DM ile aynı tüm skill kapasitesine sahiptir.
```

**Tetikleme formatı:**
```
@Mentix [aksiyon] [hedef] [opsiyonel not]
```

**Geçerli tetikleyiciler:**
- Mesajda `@Mentix` mention'ı
- Mentix'in bir mesajına doğrudan reply

---

## 2. Job ID Sistemi

Her aktivasyon otomatik bir `JOB_ID` üretir. Format:

```
JOB-YYYYMMDD-NNN
```

Örnekler:
- `JOB-20260317-001`
- `JOB-20260317-042`

**Kurallar:**
- Aynı operasyon boyunca aynı JOB ID kullanılır
- Onay, iptal, soru — hepsi bu ID ile yapılır
- JOB ID hafızaya yazılır, restart sonrası korunur

---

## 3. Komut Seti

### A. Ürün Intake

| Durum | Komut |
|-------|-------|
| Yeni ürün ekle | `@Mentix bunu ürüne çevir` |
| Varyantlı ürün | `@Mentix bunu ürün olarak işle, varyantları çıkar` |
| Var olan ürünü güncelle | `@Mentix bu ürünü güncelle` |
| Belirli alan güncelle | `@Mentix bu ürünün fiyatını güncelle` |
| | `@Mentix bu ürünün stok bilgisini güncelle` |
| | `@Mentix bu ürünün görsellerini güncelle` |

### B. Debug / Analiz

| Durum | Komut |
|-------|-------|
| Ürün görünmüyor | `@Mentix bu ürün neden görünmüyor` |
| Genel akış debug | `@Mentix bu ürünün veri akışını debug et` |
| Stok yanlış | `@Mentix stok sorununu analiz et` |
| Fiyat güncellenmemiş | `@Mentix bu ürünün fiyatı neden güncellenmemiş` |
| Görsel sorunu | `@Mentix bu ürünün görseli neden görünmüyor` |

### C. Yayın Kontrolü

| Durum | Komut |
|-------|-------|
| Yayın hazırlık kontrolü | `@Mentix publish readiness check yap` |
| Canlı olmaya hazır mı | `@Mentix bu ürün live olmaya hazır mı` |
| Yayın öncesi doğrula | `@Mentix bu ürünü yayın öncesi kontrol et` |

### D. Görsel İşlemleri

| Durum | Komut |
|-------|-------|
| Görsel analiz | `@Mentix bu görseli analiz et` |
| Enhancement öner | `@Mentix bu görseli iyileştirme öner` |

### E. Araştırma

| Durum | Komut |
|-------|-------|
| Benzer ürün | `@Mentix bu model için benzer ürün araştır` |
| Kategori analizi | `@Mentix bu ürün kategorisini analiz et` |
| Rakip araştırma | `@Mentix bu tarz ürün için rakip araştır` |

### F. Onay Komutları

| Aksiyon | Komut |
|---------|-------|
| Onayla | `@Mentix onayla JOB-xxx` |
| İptal et | `@Mentix iptal JOB-xxx` |
| Yeniden değerlendir | `@Mentix tekrar değerlendir JOB-xxx` |
| Sadece raporla | `@Mentix sadece raporla JOB-xxx` |
| Detay göster | `@Mentix detay göster JOB-xxx` |

### G. Durum / Takip

| Aksiyon | Komut |
|---------|-------|
| İş durumu | `@Mentix durum JOB-xxx` |
| Son karar | `@Mentix karar özeti JOB-xxx` |
| Incident detay | `@Mentix incident göster INC-xxx` |
| Son işlemler | `@Mentix son işlemleri göster` |
| Bekleyen onaylar | `@Mentix bekleyen onayları göster` |

### H. Eksik Veri Tamamlama

Mentix eksik alan istediğinde, aynı thread'e reply ile yanıtla:

```
@Mentix JOB-021 eksik alanlar:
fiyat: 3290
stok: 2
kategori: loafer
sku: LFR-TBS-42
```

---

## 4. Rol Modeli

Gruptaki kullanıcılar farklı yetki seviyelerine sahip olabilir:

| Rol | Intake başlatabilir | Write onaylayabilir | Publish onaylayabilir | Destructive onaylayabilir |
|-----|---------------------|--------------------|-----------------------|--------------------------|
| viewer | ❌ | ❌ | ❌ | ❌ |
| operator | ✅ | ❌ | ❌ | ❌ |
| approver | ✅ | ✅ | ✅ | ❌ |
| admin | ✅ | ✅ | ✅ | ✅ |

**Şu an varsayılan:** `groupAllowFrom` listesindeki tüm kullanıcılar `approver` seviyesinde.

---

## 5. Standart Cevap Formatları

### Operasyon başladı (kısa)
```
JOB-021 | new_product_intake

Parse edildi:
- Loafer / Tobacco / Suede / 42 / 2 adet / 3290 TL

Eksik: sku
Confidence: 0.84  Risk: medium
→ @Mentix JOB-021 eksik alanlar: sku: LFR-TBS-42
```

### Onay isteği
```
JOB-021 | confirmation required

Önerilen aksiyon:
- ürün kaydı oluştur
- kategori: loafer / fiyat: 3290 / stok: 2

Confidence: 0.88  Risk: medium

Onay:  @Mentix onayla JOB-021
İptal: @Mentix iptal JOB-021
```

### Debug sonucu
```
JOB-034 | product_visibility_debug

Bulgu: ürün DB'de mevcut, storefront'ta görünmüyor.
Neden: publish flag kapalı.
Evidence: status=draft, storefront=null
Confidence: 0.91  Risk: low

@Mentix onayla JOB-034 → düzeltme uygula
```

### REPORT_ONLY (kanıt yetersiz)
```
JOB-012 | REPORT_ONLY

Teşhis güvenilir değil. 4 olası kök neden var, daraltamadım.
Önerilen adım: admin panelinden products.images[] kontrol et.
Confidence: 0.47  Decision: NO_ACTION
```

---

## 6. Örnek Senaryolar

### Senaryo 1 — Yeni ürün intake
```
Furkan:
[fotoğraf]
Tobacco süet loafer, 42 numara, 2 adet, 3290 TL
@Mentix bunu ürüne çevir

Mentix:
JOB-021 | new_product_intake
Parse edildi: Loafer / Tobacco / Suede / 42 / 2 adet / 3290 TL
Eksik: sku
→ @Mentix JOB-021 eksik alanlar: sku: ...

Furkan:
@Mentix JOB-021 eksik alanlar:
sku: LFR-TBS-42

Mentix:
JOB-021 hazır.
Önerilen: ürün kaydı oluştur
Confidence: 0.91  Risk: medium
Onay: @Mentix onayla JOB-021

Furkan:
@Mentix onayla JOB-021

Mentix:
JOB-021 tamamlandı.
Ürün oluşturuldu. Admin'de draft olarak bekliyor.
```

### Senaryo 2 — Görünmeme debug
```
Furkan:
@Mentix bu ürün neden görünmüyor

Mentix:
JOB-034 | product_visibility_debug
Bulgu: status=draft, publish=false
Confidence: 0.89  Risk: low
Öneri: admin'den aktif et veya @Mentix onayla JOB-034

Furkan:
@Mentix onayla JOB-034

Mentix:
JOB-034 tamamlandı. Publish flag güncellendi.
```

### Senaryo 3 — Bekleyen onayları görme
```
Bahriyar:
@Mentix bekleyen onayları göster

Mentix:
Bekleyen işlemler:
- JOB-021 | new_product_intake | Confidence: 0.91
- JOB-034 | product_visibility_debug | Confidence: 0.89
Onay: @Mentix onayla JOB-xxx
```

---

## 7. Gruba Sabitlenecek Özet Mesaj (Pin)

```
📌 Mentix Kullanım — Operasyon Grubu

1. Mentix sadece etiketlenince çalışır.
2. Yeni ürün:   @Mentix bunu ürüne çevir
3. Debug:       @Mentix bu ürünün veri akışını debug et
4. Durum:       @Mentix durum JOB-xxx
5. Onay:        @Mentix onayla JOB-xxx
6. İptal:       @Mentix iptal JOB-xxx
7. Bekleyen:    @Mentix bekleyen onayları göster

⚠️ Fotoğraf + açıklama + mention aynı mesajda olmalı.
```

---

## 8. Direkt / Onaylı Aksiyon Sınırı

| Aksiyon | Direkt | Onaylı |
|---------|--------|--------|
| Parse + analiz | ✅ | — |
| Debug (read-only) | ✅ | — |
| Eksik alan tespiti | ✅ | — |
| Publish readiness check | ✅ | — |
| Görsel kalite analizi | ✅ | — |
| Health check | ✅ | — |
| Araştırma | ✅ | — |
| DB write | — | ✅ |
| Ürün oluşturma | — | ✅ |
| Ürün güncelleme | — | ✅ |
| Fiyat değişikliği | — | ✅ |
| Stok yazımı | — | ✅ |
| Publish | — | ✅ |
| Toplu işlem | — | ✅ |
| Repo write/push | — | ✅ |
