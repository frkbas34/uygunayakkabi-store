# Mentix Intake Skill
# Telegram Group → n8n → Payload CMS product intake pipeline
# Version: 2.0 — group-first, caption-aware

## Trigger
Bu skill şu durumlarda devreye girer:
- Telegram grubunda @mentix_aibot etiketlenerek ürün bilgisi girildiğinde
- Gruba fotoğraf yüklenip caption'a ürün bilgisi yazıldığında (fotoğraf + açıklama)
- Gruba sadece fotoğraf yüklenip bot etiketlendiğinde (başlık sonradan eklenecek)
- Gruba/DM'e sadece metin olarak ürün bilgisi girildiğinde

## Mesaj Formatı (operatör grup'ta şöyle gönderir)
Fotoğraflı (en yaygın kullanım):
```
[fotoğraf yükle] + caption: @mentix_aibot Nike Air Max 90 Siyah ₺1200 adet:3
```

Metinli:
```
@mentix_aibot Adidas Stan Smith Beyaz ₺850 SKU:ADI-SS-WHT adet:2
```

## Metni Nereden Oku
ÖNEMLİ — Telegram'da iki farklı alan var:
- `message.text` → sadece metin mesajlarında dolu
- `message.caption` → fotoğraf/medya mesajlarında dolu (text null olur)

**Her zaman önce `message.caption` kontrol et. Boşsa `message.text` kullan.**

```
const rawText = message.caption || message.text || ''
```

## @Mention Temizliği
Grup mesajlarında text/caption başında `@mentix_aibot` veya `@[herhangi_bot_adi]` olabilir.
Parse etmeden önce kaldır:

```
const cleanText = rawText.replace(/^@\w+\s*/g, '').trim()
```

Örnekler:
- "@mentix_aibot Nike Air Max ₺1200" → "Nike Air Max ₺1200"
- "@mentix_aibot" → "" (sadece mention, başlık yok)

## Parse Edilecek Alanlar (cleanText üzerinden)
- **title**: Ürün adı — ilk anlamlı cümle/kelime grubu, fiyat ve hashtag hariç
- **price**: Sayısal fiyat — "₺1200", "1200 tl", "1.200₺" formatlarından çıkar → integer
- **sku**: Stok kodu — "#ABC-123", "SKU:ABC-123", "kod:ABC" formatlarından çıkar
- **quantity**: Adet — "adet:3", "3 adet", "qty:3", "x3" formatlarından çıkar → integer
- **notes**: Ürün hakkında ekstra notlar (renk, materyal, beden aralığı vs.)

## Medya Kontrolü
```
const hasMedia = !!(message.photo || message.video || message.document)
const mediaFileId = message.photo
  ? message.photo[message.photo.length - 1].file_id  // en büyük boyut
  : null
const mediaType = message.photo ? 'photo' : message.video ? 'video' : null
```

## Chat ve Kullanıcı Bilgisi
```
const chatId    = String(message.chat?.id || message.chat_id || '')
const messageId = String(message.message_id || '')
const fromUserId = String(message.from?.id || '')
const fromUsername = message.from?.username || message.from?.first_name || ''
```

NOT: Grup chat_id'leri negatif sayıdır (ör: -1001234567890). Bu normaldir, kaydet.

## n8n'e Gönderilecek JSON Payload
exec tool ile şu curl komutunu çalıştır (--max-time 15):

```bash
exec: curl -s -X POST http://n8n:5678/webhook/mentix-intake \
  -H "Content-Type: application/json" \
  -d '{
    "source": "telegram",
    "intent": "product_intake",
    "telegram": {
      "chat_id": "<chatId>",
      "chat_type": "<message.chat.type>",
      "message_id": "<messageId>",
      "from_user_id": "<fromUserId>",
      "from_username": "<fromUsername>"
    },
    "message": {
      "text": "<cleanText>",
      "has_media": <hasMedia>,
      "media_file_id": <mediaFileId veya null>,
      "media_type": "<mediaType veya null>",
      "chat_id": "<chatId>",
      "message_id": "<messageId>",
      "from_user_id": "<fromUserId>"
    },
    "parsed": {
      "title": "<title veya boşsa Yeni Ürün>",
      "price": <price veya null>,
      "stock_code": "<sku veya null>",
      "quantity": <quantity veya null>,
      "notes": "<notes veya null>"
    },
    "timestamp": "<ISO timestamp>",
    "session_id": "<session_id>"
  }' --max-time 15
```

## Başlık Fallback Kuralları
title parse edilemezse sırayla dene:
1. cleanText'in ilk 50 karakteri (fiyat/hashtag hariç)
2. Fotoğraf varsa: "Yeni Ürün (fotoğraflı)"
3. Hiçbiri yoksa: "Yeni Ürün"

## Kullanıcıya Yanıt (Türkçe, grup'ta reply)
curl başarılıysa (HTTP 200/201):
```
✅ Kaydedildi! [title] ürünü taslak olarak oluşturuldu.
[Fiyat varsa: 💰 ₺{price}]
[Fotoğraf varsa: 📸 Görsel eklendi]
Admin panelinden inceleyebilirsin: uygunayakkabi.com/admin
```

curl başarısızsa (timeout veya hata):
```
⚠️ Kayıt sırasında sorun oluştu. Lütfen tekrar dene veya admin panelinden manuel ekle.
```

Sadece etiketlenme varsa (içerik yok, örn. sadece "@mentix_aibot"):
```
Merhaba! Ürün eklemek için şu formatı kullan:
@mentix_aibot [Ürün Adı] ₺[Fiyat] adet:[Adet]
Fotoğraf ile de gönderebilirsin — caption'a ürün bilgisini yaz.
```

## Önemli Notlar
- Grup mesajları için chat_id negatif olabilir → normaldir, olduğu gibi kaydet
- DM'ler de hâlâ çalışır (caption olmaz, message.text kullanılır)
- Fotoğraf media_file_id n8n üzerinden Payload'a ayrıca yüklenir (ikinci adım)
- parse edilemeyen alanlar null gönderilir, admin panelinde sonradan doldurulur
- quantity alanı stockQuantity olarak Payload'a kaydedilir (n8n mapping'de)
