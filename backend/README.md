# Backend LokalKita

Backend LokalKita dibangun dengan **PHP (Vanilla)** untuk REST API, **MySQL** sebagai database, dan **Flask (Python)** sebagai microservice untuk perhitungan HPP & Diskon.

## Daftar Isi

- [Struktur Folder](#struktur-folder)
- [Konfigurasi](#konfigurasi)
- [Database](#database)
- [Menjalankan Backend](#menjalankan-backend)
- [Daftar Endpoint API](#daftar-endpoint-api)
- [Arsitektur Perhitungan HPP & Diskon](#arsitektur-perhitungan-hpp--diskon)
- [Autentikasi, Session & Keamanan](#autentikasi-session--keamanan)
- [Isolasi Toko & Audit Log](#isolasi-toko--audit-log)
- [Integritas Transaksi (Snapshot HPP)](#integritas-transaksi-snapshot-hpp)
- [Akun Demo](#akun-demo)
- [Testing](#testing)
- [Catatan Pengembangan](#catatan-pengembangan)

## Struktur Folder

```text
backend/
├── api/           # Endpoint REST API (dipanggil langsung oleh frontend)
├── lib/           # Core library (helper, business logic, validasi)
├── python/        # Microservice Flask untuk hitung-hpp & hitung-diskon
├── sql/           # Schema & seed database
├── tests/         # Skrip pengujian
├── config.php     # Konfigurasi lokal (TIDAK di-commit)
└── config.example.php # Template konfigurasi
```

### `api/` - Endpoint

| File | Fungsi |
|---|---|
| `ping.php` | Health check API + koneksi database |
| `auth.php` | Login, logout, & info user saat ini (`/auth.php?action=...`) |
| `products.php` | Daftar & detail produk. `hpp_unit` disembunyikan untuk non-owner/publik |
| `hpp.php` | Kalkulasi & simpan perhitungan HPP per toko |
| `diskon.php` | Simulasi diskon, margin, status (safe/loss/below_target) |
| `poin.php` | Saldo, history, & transaksi poin per toko (khusus pembeli) |
| `laporan.php` | Laporan bulanan per toko (ringkasan, top produk, pengeluaran, promo) |
| `chat.php` | Percakapan & pesan antara pembeli & penjual |

### `lib/` - Library

| File | Fungsi |
|---|---|
| `db.php` | Koneksi PDO singleton ke MySQL |
| `response.php` | Helper `json_success()`, `json_error()`, `handle_preflight()` |
| `session.php` | Konfigurasi session aman (`HttpOnly`, `SameSite=Lax`, `strict mode`) |
| `auth.php` | Helper auth, `require_auth()`, `require_role()`, `require_store_access()`, `audit_log()`, `client_ip()` |
| `access.php` | Helper akses berbasis role & kepemilikan toko |
| `validate.php` | Validasi input (UUID, integer, boolean, dll) |
| `hpp.php` | Logika perhitungan HPP (PHP fallback) |
| `diskon.php` | Logika perhitungan diskon (PHP fallback) |
| `hitung_client.php` | HTTP client ke Flask microservice dengan fallback otomatis ke PHP |
| `laporan.php` | Business logic laporan bulanan, snapshot & format ISO-8601 |
| `poin.php` | Logika poin loyalitas per toko |
| `chat.php` | Logika chat pembeli-penjual |
| `httpx.php` | HTTP helper sederhana |

### `python/` - Microservice Flask

| File | Fungsi |
|---|---|
| `hitung.py` | Flask app dengan endpoint `POST /hitung-hpp` & `POST /hitung-diskon` |
| `requirements.txt` | Dependency Flask |
| `Dockerfile` | Dockerfile untuk menjalankan microservice (opsional) |

## Konfigurasi

### 1) Buat file config

Dari root project:

```bash
cp backend/config.example.php backend/config.php
```

### 2) Isi kredensial

Edit `backend/config.php`:

```php
<?php
declare(strict_types=1);

return [
    'db' => [
        'host'    => '127.0.0.1',
        'port'    => 3306,
        'name'    => 'lokalkita',
        'user'    => 'lokalkita',
        'pass'    => 'lokalkita',
        'charset' => 'utf8mb4',
    ],
    'app' => [
        'env'   => 'local',
        'debug' => true,
    ],
];
```

> `backend/config.php` **wajib ada di lokal** tapi **tidak boleh di-commit**. Sudah di-ignore oleh `.gitignore`.

## Database

### Skema

Semua struktur tabel ada di `backend/sql/schema.sql`. Beberapa tabel penting:

| Tabel | Kegunaan |
|---|---|
| `users` | Akun pengguna (admin/seller/buyer) |
| `stores` | Data toko per penjual |
| `store_members` | Anggota toko (jika ada) |
| `categories` | Kategori produk |
| `products` | Produk per toko |
| `product_variants` | Varian produk + `hpp_unit`, `price`, `stock` |
| `orders` | Pesanan pembeli |
| `order_items` | Item pesanan dengan `hpp_unit_snapshot` (snapshot HPP saat checkout) |
| `cart_items` | Keranjang belanja |
| `conversations` / `messages` | Chat pembeli-penjual |
| `point_balances` / `point_transactions` | Sistem poin per toko |
| `operational_expenses` | Pengeluaran operasional toko untuk laporan |
| `monthly_reports` | Snapshot laporan bulanan per toko |
| `audit_logs` | Catatan audit aktivitas penting |
| `hpp_calculations` / `hpp_components` | Riwayat perhitungan HPP |

### Import

#### Pakai Docker

```bash
docker exec -i lokalkita-db mysql -uroot -prootpw < backend/sql/schema.sql
docker exec -i lokalkita-db mysql -uroot -prootpw < backend/sql/seed.sql
```

#### Pakai MySQL Lokal

```bash
mysql -u root -p < backend/sql/schema.sql
mysql -u root -p lokalkita < backend/sql/seed.sql
```

## Menjalankan Backend

Kamu butuh **2 terminal** terpisah.

### Terminal 1: Microservice Flask

```bash
cd backend/python

# Buat & aktifkan venv (hanya pertama kali)
python3 -m venv .venv
source .venv/bin/activate  # Linux/WSL/macOS
# .venv\Scripts\activate   # Windows

# Install dependency
pip install -r requirements.txt

# Jalankan Flask
python hitung.py
```

Berjalan di: `http://127.0.0.1:5001`

### Terminal 2: PHP API Server

Dari **root project** `LocalKita/`:

```bash
php -S 127.0.0.1:8000 -t .
```

Berjalan di: `http://127.0.0.1:8000`

Tes cepat:

```bash
curl http://127.0.0.1:8000/backend/api/ping.php
```

## Daftar Endpoint API

Semua endpoint mengembalikan format JSON konsisten:

```json
{
  "ok": true|false,
  "data": {...} | null,
  "message": "...",
  "error_code": "..."
}
```

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| `GET` | `/backend/api/ping.php` | Tidak wajib | Health check |
| `POST` | `/backend/api/auth.php?action=login` | Tidak wajib | Login dengan email/username/phone + password |
| `POST` | `/backend/api/auth.php?action=logout` | Opsional | Logout & hapus session |
| `GET/POST` | `/backend/api/auth.php?action=me` | Tidak wajib | Info user yang sedang login |
| `GET` | `/backend/api/products.php` | Tidak wajib | List/detail produk. `hpp_unit` disembunyiin kalo bukan owner/admin |
| `POST` | `/backend/api/hpp.php` | Wajib | Hitung & simpan HPP. Validasi input ketat |
| `POST` | `/backend/api/diskon.php` | Wajib | Simulasi diskon & analisis margin |
| `GET` | `/backend/api/poin.php?action=balance` | Wajib (pembeli) | Saldo poin per toko |
| `GET` | `/backend/api/poin.php?action=history` | Wajib (pembeli) | Riwayat transaksi poin |
| `GET` | `/backend/api/laporan.php` | Wajib (seller/admin) | Laporan bulanan per toko (butuh `store_id`, `year`, `month`) |
| `GET/POST` | `/backend/api/chat.php` | Wajib | List percakapan / kirim & baca pesan |

> Untuk detail lengkap request/response, lihat [`API_CONTRACT.md`](../API_CONTRACT.md).

## Arsitektur Perhitungan HPP & Diskon

1. Frontend kirim request ke `backend/api/hpp.php` atau `backend/api/diskon.php`
2. `hitung_client.php` coba kirim ke Flask: `http://127.0.0.1:5001/hitung-hpp` atau `/hitung-diskon`
3. **Kalo Flask gagal/tidak reachable** -> otomatis fallback ke fungsi PHP di `lib/hpp.php` atau `lib/diskon.php`
4. Hasil perhitungan dikembalikan dengan format konsisten ke frontend

**Validasi penting:**
- `unit_count > 0`
- `quantity > 0`
- `normal_price > 0`
- Persentase margin/diskon dalam range yang wajar
- Nilai uang tetap integer (Rupiah)

## Autentikasi, Session & Keamanan

### Session Aman

Dikonfigurasi di `lib/session.php` via `session_start_secure()`:

- `session.use_strict_mode = 1`
- `session.use_only_cookies = 1`
- Cookie: `HttpOnly`, `SameSite=Lax`, `secure` auto-detect (HTTPS)
- Session ID **diregenerasi** (`session_regenerate_id(true)`) saat login berhasil

### Password

- Saat registrasi/seed pakai `password_hash()` (bcrypt)
- Saat login wajib pakai `password_verify()`
- **`password_hash` TIDAK PERNAH dikembalikan** ke response API

### CORS & Preflight

Semua endpoint yang dipanggil frontend handle `OPTIONS` dengan balasan `204 No Content`. Header CORS diset konsisten.

### SQL Injection Prevention

**Semua query wajib pakai prepared statement** (`prepare()` + `execute()` dengan binding parameter). Hanya ada pengecualian minimal untuk konstanta yang aman (seperti `SELECT 1`, `SELECT UUID()` di healthcheck).

## Isolasi Toko & Audit Log

### Isolasi Toko

- Setiap query yang menyentuh data toko **harus difilter `store_id` langsung di SQL WHERE**
- Fungsi `require_store_access($pdo, $storeId)` ngecek kepemilikan/keanggotaan toko
- **Kalo user bukan pemilik & bukan anggota toko yang diakses -> balas `404 Not Found`** (bukan `403`) biar ID toko nggak gampang ditebak
- Role `admin` bisa mengakses toko yang valid

### Audit Log

Fungsi `audit_log()` nyimpen aktivitas penting ke tabel `audit_logs`:

- `auth.login_success` / `auth.login_failed` / `auth.logout`
- Perubahan harga/HPP sensitif
- Aksi penting lainnya (export/delete) sesuai kebutuhan

Yang dicatat: `actor_user_id`, `store_id`, `action`, `entity_type`, `entity_id`, `ip_address`, `metadata` (JSON), `created_at`.

## Integritas Transaksi (Snapshot HPP)

Di tabel `order_items` ada kolom **`hpp_unit_snapshot`**.

Pas proses checkout/order dibuat, **HPP produk saat itu disimpan sebagai snapshot** ke `order_items`. Artinya:

- Kalo penjual ubah `hpp_unit` di `product_variants` di kemudian hari, **laporan & perhitungan profit lama TIDAK berubah**
- Laporan bulanan tetap akurat berdasarkan HPP real saat transaksi terjadi
- Terjaga integritas data keuangan toko

## Akun Demo

Semua password: **`password123`**

| Email | Role | Keterangan |
|---|---|---|
| `admin@lokalkita.test` | `admin` | Administrator |
| `tamam@lokalkita.test` | `seller` | Pemilik Dapur Bu Tamam |
| `rasya@lokalkita.test` | `seller` | Pemilik Kriya Rasya |
| `arya@lokalkita.test` | `buyer` | Pembeli |
| `sari@lokalkita.test` | `buyer` | Pembeli |

## Testing

Ada skrip testing di `backend/tests/`:

```bash
# Lihat daftar test
ls backend/tests/
```

Beberapa file: `hitung_test.php`, `laporan_test.php`, `poin_test.php`, `rollback_test.php`, `login.php`, `whoami.php`, `run.sh`.

Kalo mau run via Docker bisa ikutin `backend/tests/docker-compose.yml` atau `run.sh`. Untuk testing manual, lebih gampang pakai `curl` langsung ke endpoint seperti dicontoh di README utama.

## Catatan Pengembangan

- **Response Format**: Konsisten `{ok, data, message, error_code}`
- **Uang (Rupiah)**: Selalu integer, **tanpa koma/desimal**
- **Tanggal/Waktu**: Pakai format ISO-8601, timezone `Asia/Jakarta`
- **Jangan commit rahasia**: `config.php`, file `.env`, log, dll (udah di-ignore)
- **Fallback**: Flask down -> PHP tetap bisa hitung HPP/Diskon
- **404 untuk cross-store**: Biar ID toko lebih aman dari probing
- **Hide sensitive data**: Jangan pernah kembalikan `password_hash` ke client
