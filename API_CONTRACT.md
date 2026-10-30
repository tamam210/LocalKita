# API Contract — LokalKita

Versi: 1.0  
Tanggal: 30 Oktober 2026  
Berlaku untuk: frontend (Arya) dan backend (Tamam/Rasya)

Dokumen ini adalah kesepakatan format request/response. Nama field, tipe data,
status code, dan format JSON tidak boleh diubah sepihak.

---

## 1. Base URL dan CORS

- Backend: `http://localhost:8000/api`
- Frontend: `http://localhost:5500`
- Semua response: `Content-Type: application/json; charset=utf-8`

### Header CORS

Backend wajib mengirim:

```http
Access-Control-Allow-Origin: http://localhost:5500
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With
Access-Control-Max-Age: 86400
Vary: Origin
```

Catatan:

- `Access-Control-Allow-Origin` tidak boleh `*` karena memakai credentials.
- Kalau frontend dibuka dari `http://127.0.0.1:5500`, origin itu juga boleh.
- Request `OPTIONS` (preflight) dibalas `204 No Content` tanpa body.
- Frontend wajib memakai `credentials: 'include'`.

Contoh preflight:

```http
OPTIONS /api/poin.php HTTP/1.1
Origin: http://localhost:5500
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type
```

---

## 2. Format Response JSON

### Sukses

```json
{
  "ok": true,
  "data": {},
  "message": "OK"
}
```

### Gagal

```json
{
  "ok": false,
  "data": null,
  "message": "Pesan error untuk manusia",
  "error_code": "VALIDATION_ERROR",
  "errors": {
    "field": "Pesan error per field"
  }
}
```

`errors` opsional. `error_code` wajib ada di semua response gagal.

---

## 3. HTTP Status Code

| Status | Kapan dipakai |
|---|---|
| `200` | GET/update berhasil |
| `201` | create berhasil |
| `204` | delete berhasil / preflight OPTIONS |
| `400` | input tidak valid / JSON rusak |
| `401` | belum login |
| `403` | login, tapi bukan pemilik toko / tidak punya akses |
| `404` | data tidak ditemukan |
| `405` | method tidak diizinkan |
| `409` | konflik, misal stok/poin tidak cukup |
| `500` | error server |

### Daftar error_code

| error_code | Status | Arti |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Field wajib/format salah |
| `UNAUTHORIZED` | 401 | Belum login |
| `FORBIDDEN` | 403 | Tidak punya akses ke store/data |
| `NOT_FOUND` | 404 | Data tidak ada |
| `METHOD_NOT_ALLOWED` | 405 | Method salah |
| `CONFLICT` | 409 | Konflik data |
| `INSUFFICIENT_STOCK` | 409 | Stok kurang |
| `INSUFFICIENT_POINTS` | 409 | Saldo poin kurang |
| `SERVER_ERROR` | 500 | Error tak terduga |

---

## 4. Standar Data

- **Uang**: integer rupiah. Contoh `15000`, bukan `"15.000"` atau `15000.00`.
- **Persentase/margin**: number, maksimal 2 desimal. Contoh `30.5`.
- **Tanggal/waktu**: ISO-8601 dengan timezone. Contoh `2026-01-31T10:00:00+07:00`.
- **Tanggal saja**: `YYYY-MM-DD`. Contoh `2026-01-31`.
- **ID**: string UUID. Contoh `40000000-0000-4000-8000-000000000001`.
- **Boolean**: `true` / `false`, bukan `1` / `0`.
- **Kosong**: `null`, bukan string `"null"`.
- **Status diskon**: `"safe"`, `"loss"`, `"below_target"`.
  - `safe` = margin aman / memenuhi target.
  - `below_target` = masih untung, tapi margin di bawah target.
  - `loss` = rugi.
  - Frontend yang menerjemahkan ke warna hijau/kuning/merah.

---

## 5. Auth dan Hak Akses

- Auth memakai session cookie `PHPSESSID`.
- Frontend `fetch()` wajib `credentials: 'include'`.
- Belum login → `401 UNAUTHORIZED`.
- Sudah login tapi bukan pemilik `store_id` → `403 FORBIDDEN`.
- Role:
  - `admin`: boleh akses semua toko.
  - `seller`: hanya toko miliknya.
  - `buyer`: hanya data poin/chat miliknya.
- `hpp_unit` tidak boleh dikirim ke pembeli publik. Hanya seller pemilik toko/admin.

---

## 6. Endpoint

### 6.1 Produk — `GET /products.php`

Ambil daftar produk.

Auth: publik untuk produk `active`; seller/admin bisa melihat draft/inactive miliknya.

Query:

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `q` | string | tidak | Cari nama produk |
| `category_id` | uuid | tidak | Filter kategori |
| `store_id` | uuid | tidak | Filter toko |
| `status` | string | tidak | Default `active` |
| `page` | int | tidak | Default `1` |
| `per_page` | int | tidak | Default `12`, maksimal `50` |
| `sort` | string | tidak | `newest`, `price_asc`, `price_desc`, `name_asc` |

Response `200`:

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "product_id": "40000000-0000-4000-8000-000000000001",
        "store_id": "20000000-0000-4000-8000-000000000001",
        "store_name": "Dapur Bu Tamam",
        "category_id": "10000000-0000-4000-8000-000000000001",
        "category_name": "Makanan",
        "slug": "risoles-frozen",
        "name": "Risoles Frozen",
        "description": "Risoles siap goreng dengan isian ayam dan sayur.",
        "status": "active",
        "earns_points": true,
        "point_multiplier": 1.0,
        "primary_image_url": "uploads/products/risoles-frozen.jpg",
        "min_price": 15000,
        "max_price": 16000,
        "total_stock": 73,
        "variants": [
          {
            "variant_id": "50000000-0000-4000-8000-000000000001",
            "sku": "RISOL-ORI",
            "name": "Original",
            "price": 15000,
            "hpp_unit": null,
            "stock": 38,
            "status": "active"
          }
        ],
        "created_at": "2026-01-01T08:00:00+07:00",
        "updated_at": "2026-01-01T08:00:00+07:00"
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 12,
      "total": 4,
      "total_pages": 1
    }
  },
  "message": "Daftar produk berhasil diambil."
}
```

Detail produk:

`GET /products.php?product_id=<uuid>`

Response `200`:

```json
{
  "ok": true,
  "data": {
    "product_id": "40000000-0000-4000-8000-000000000001",
    "store_id": "20000000-0000-4000-8000-000000000001",
    "store_name": "Dapur Bu Tamam",
    "category_id": "10000000-0000-4000-8000-000000000001",
    "category_name": "Makanan",
    "slug": "risoles-frozen",
    "name": "Risoles Frozen",
    "description": "Risoles siap goreng dengan isian ayam dan sayur.",
    "status": "active",
    "earns_points": true,
    "point_multiplier": 1.0,
    "images": [
      {
        "image_id": "a5000000-0000-4000-8000-000000000001",
        "url": "uploads/products/risoles-frozen.jpg",
        "alt_text": "Risoles Frozen",
        "is_primary": true,
        "sort_order": 0
      }
    ],
    "variants": [
      {
        "variant_id": "50000000-0000-4000-8000-000000000001",
        "sku": "RISOL-ORI",
        "name": "Original",
        "price": 15000,
        "hpp_unit": null,
        "stock": 38,
        "status": "active"
      }
    ],
    "created_at": "2026-01-01T08:00:00+07:00",
    "updated_at": "2026-01-01T08:00:00+07:00"
  },
  "message": "Detail produk berhasil diambil."
}
```

Error: `404 NOT_FOUND`, `400 VALIDATION_ERROR`.

---

### 6.2 HPP — `POST /hpp.php`

Auth: seller pemilik toko/admin.

Request:

```json
{
  "store_id": "20000000-0000-4000-8000-000000000001",
  "product_id": "40000000-0000-4000-8000-000000000001",
  "variant_id": "50000000-0000-4000-8000-000000000001",
  "units_produced": 50,
  "material_cost": 300000,
  "labor_cost": 100000,
  "packaging_cost": 50000,
  "overhead_cost": 25000,
  "target_margin_percent": 30,
  "save": false
}
```

Field:

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `store_id` | uuid | ya | Toko pemilik |
| `product_id` | uuid | tidak | Untuk simpan hasil |
| `variant_id` | uuid | tidak | Untuk simpan hasil |
| `units_produced` | int | ya | Harus > 0 |
| `material_cost` | int | ya | Rupiah |
| `labor_cost` | int | ya | Rupiah |
| `packaging_cost` | int | ya | Rupiah |
| `overhead_cost` | int | ya | Rupiah |
| `target_margin_percent` | number | ya | 0–100 |
| `save` | boolean | tidak | Default `false` |

Response `200`:

```json
{
  "ok": true,
  "data": {
    "total_cost": 475000,
    "units_produced": 50,
    "hpp_per_unit": 9500,
    "target_margin_percent": 30,
    "suggested_price": 13571,
    "margin_percent": 30.0,
    "saved": false,
    "calculation_id": null
  },
  "message": "HPP berhasil dihitung."
}
```

Kalau `save: true`, `saved` jadi `true` dan `calculation_id` berisi UUID hasil simpan.

Error: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `500 SERVER_ERROR`.

---

### 6.3 Diskon — `POST /diskon.php`

Auth: seller pemilik toko/admin.

Request:

```json
{
  "normal_price": 15000,
  "discount_percent": 20,
  "quantity": 3,
  "additional_cost": 0,
  "hpp_per_unit": 9500,
  "target_margin_percent": 30
}
```

Response `200`:

```json
{
  "ok": true,
  "data": {
    "normal_price": 15000,
    "discount_percent": 20,
    "discount_amount_per_unit": 3000,
    "final_price_per_unit": 12000,
    "quantity": 3,
    "total_revenue": 36000,
    "effective_hpp_per_unit": 9500,
    "profit_per_unit": 2500,
    "total_profit": 7500,
    "margin_percent": 20.83,
    "target_margin_percent": 30,
    "status": "below_target",
    "message": "Masih untung, tetapi margin di bawah target."
  },
  "message": "Simulasi diskon berhasil dihitung."
}
```

Aturan `status`:

- `loss` jika `profit_per_unit < 0`.
- `below_target` jika untung tetapi `margin_percent < target_margin_percent`.
- `safe` jika `margin_percent >= target_margin_percent`.

Error: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`.

---

### 6.4 Poin — `GET/POST /poin.php`

Auth: buyer untuk saldo/riwayat/reward/redeem; seller/admin untuk earn.

#### A. Saldo

`GET /poin.php?action=balance&store_id=<uuid>`

Response `200`:

```json
{
  "ok": true,
  "data": {
    "point_account_id": "a2000000-0000-4000-8000-000000000001",
    "store_id": "20000000-0000-4000-8000-000000000001",
    "buyer_user_id": "00000000-0000-4000-8000-000000000004",
    "balance": 3000,
    "reserved_balance": 500,
    "available_balance": 2500,
    "lifetime_earned": 3000,
    "lifetime_redeemed": 500,
    "point_value_rp": 100,
    "earn_rate_rp": 2000
  },
  "message": "Saldo poin berhasil diambil."
}
```

#### B. Riwayat

`GET /poin.php?action=history&store_id=<uuid>&page=1&per_page=20`

Response `200`:

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "point_tx_id": "a3000000-0000-4000-8000-000000000001",
        "type": "earn",
        "points": 20,
        "balance_after": 20,
        "order_id": "90000000-0000-4000-8000-000000000001",
        "reference_id": null,
        "created_at": "2026-01-15T10:30:00+07:00"
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 1,
      "total_pages": 1
    }
  },
  "message": "Riwayat poin berhasil diambil."
}
```

#### C. Reward

`GET /poin.php?action=rewards&store_id=<uuid>`

Response `200`:

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "reward_id": "a4000000-0000-4000-8000-000000000001",
        "name": "Risoles Gratis",
        "points_required": 500,
        "cash_addon": 0,
        "quota": 10,
        "per_buyer_limit": 1,
        "starts_at": "2026-01-01T00:00:00+07:00",
        "ends_at": null,
        "status": "active"
      }
    ]
  },
  "message": "Daftar reward berhasil diambil."
}
```

#### D. Earn

`POST /poin.php`

```json
{
  "action": "earn",
  "store_id": "20000000-0000-4000-8000-000000000001",
  "order_id": "90000000-0000-4000-8000-000000000001"
}
```

Response `201`:

```json
{
  "ok": true,
  "data": {
    "point_tx_id": "a3000000-0000-4000-8000-000000000001",
    "points_earned": 20,
    "balance_after": 20
  },
  "message": "Poin berhasil ditambahkan."
}
```

#### E. Redeem

`POST /poin.php`

```json
{
  "action": "redeem",
  "store_id": "20000000-0000-4000-8000-000000000001",
  "reward_id": "a4000000-0000-4000-8000-000000000001",
  "quantity": 1
}
```

Response `201`:

```json
{
  "ok": true,
  "data": {
    "redemption_id": "a6000000-0000-4000-8000-000000000001",
    "points_used": 500,
    "cash_addon": 0,
    "status": "pending",
    "balance_after": 2500,
    "created_at": "2026-01-29T10:00:00+07:00"
  },
  "message": "Penukaran poin berhasil diajukan."
}
```

Error: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 INSUFFICIENT_POINTS`.

---

### 6.5 Laporan — `GET /laporan.php`

Auth: seller pemilik toko/admin.

Query:

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `store_id` | uuid | ya | Toko |
| `year` | int | ya | Contoh `2026` |
| `month` | int | ya | `1`–`12` |

Response `200`:

```json
{
  "ok": true,
  "data": {
    "store_id": "20000000-0000-4000-8000-000000000001",
    "period": {
      "year": 2026,
      "month": 1,
      "label": "Januari 2026"
    },
    "summary": {
      "gross_revenue": 15500000,
      "discounts": 500000,
      "net_revenue": 15000000,
      "hpp": 9000000,
      "gross_profit": 6000000,
      "operating_expenses": 2000000,
      "promo_costs": 300000,
      "net_profit": 3700000,
      "net_margin": 24.67
    },
    "top_products": [
      {
        "product_name": "Risoles Frozen",
        "qty_sold": 620,
        "revenue": 9300000,
        "profit": 3100000
      }
    ],
    "expenses": [
      {
        "expense_id": "96000000-0000-4000-8000-000000000001",
        "category": "Operasional",
        "description": "Listrik dan air",
        "amount": 500000,
        "expense_date": "2026-01-31"
      }
    ],
    "generated_at": "2026-02-01T08:00:00+07:00"
  },
  "message": "Laporan berhasil diambil."
}
```

Error: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

---

### 6.6 Chat — `GET/POST /chat.php`

Auth: hanya peserta percakapan (buyer/seller terkait) atau admin.

#### A. Daftar percakapan

`GET /chat.php?action=conversations&store_id=<uuid>`

Response `200`:

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "conversation_id": "a8000000-0000-4000-8000-000000000001",
        "store_id": "20000000-0000-4000-8000-000000000001",
        "store_name": "Dapur Bu Tamam",
        "buyer_user_id": "00000000-0000-4000-8000-000000000004",
        "buyer_name": "Arya Wira",
        "order_id": null,
        "status": "open",
        "last_message_at": "2026-01-29T10:00:00+07:00",
        "unread_count": 2,
        "last_message": "Masih ready?"
      }
    ]
  },
  "message": "Daftar percakapan berhasil diambil."
}
```

#### B. Pesan

`GET /chat.php?action=messages&conversation_id=<uuid>&page=1&per_page=30`

Response `200`:

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "message_id": "a9000000-0000-4000-8000-000000000001",
        "conversation_id": "a8000000-0000-4000-8000-000000000001",
        "sender_user_id": "00000000-0000-4000-8000-000000000004",
        "sender_name": "Arya Wira",
        "type": "text",
        "body": "Masih ready?",
        "file_url": null,
        "read_at": null,
        "created_at": "2026-01-29T10:00:00+07:00"
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 30,
      "total": 1,
      "total_pages": 1
    }
  },
  "message": "Pesan berhasil diambil."
}
```

#### C. Buat percakapan

`POST /chat.php`

```json
{
  "action": "create",
  "store_id": "20000000-0000-4000-8000-000000000001",
  "order_id": null
}
```

Response `201`:

```json
{
  "ok": true,
  "data": {
    "conversation_id": "a8000000-0000-4000-8000-000000000001",
    "status": "open",
    "created_at": "2026-01-29T10:00:00+07:00"
  },
  "message": "Percakapan berhasil dibuat."
}
```

#### D. Kirim pesan

`POST /chat.php`

```json
{
  "action": "send",
  "conversation_id": "a8000000-0000-4000-8000-000000000001",
  "type": "text",
  "body": "Masih ready?"
}
```

Response `201`:

```json
{
  "ok": true,
  "data": {
    "message_id": "a9000000-0000-4000-8000-000000000001",
    "conversation_id": "a8000000-0000-4000-8000-000000000001",
    "type": "text",
    "body": "Masih ready?",
    "created_at": "2026-01-29T10:00:00+07:00"
  },
  "message": "Pesan berhasil dikirim."
}
```

#### E. Tandai sudah dibaca

`POST /chat.php`

```json
{
  "action": "read",
  "conversation_id": "a8000000-0000-4000-8000-000000000001"
}
```

Response `200`:

```json
{
  "ok": true,
  "data": {
    "conversation_id": "a8000000-0000-4000-8000-000000000001",
    "unread_count": 0
  },
  "message": "Pesan ditandai sudah dibaca."
}
```

Error: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

---

## 7. Catatan Implementasi

- `backend/lib/response.php` saat ini belum mengirim `error_code`. Tambahkan sebelum endpoint dibuat.
- `backend/lib/httpx.php` dipakai untuk helper CORS + preflight `OPTIONS`.
- File `backend/api/product.php` sebaiknya di-rename menjadi `backend/api/products.php` agar sesuai kontrak.
- Semua error harus tetap JSON, bukan HTML/PHP warning.
- Jangan tampilkan stack trace, password hash, atau `hpp_unit` ke pembeli publik.
- Semua query pakai prepared statement dan cek `store_id` untuk seller.
- Request POST membaca JSON dari `php://input`; JSON rusak → `400 VALIDATION_ERROR`.
