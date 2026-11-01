# LokalKita

**Etalase online + asisten keuangan untuk UMKM lokal.**

LokalKita adalah aplikasi web yang menggabungkan marketplace UMKM dengan alat bantu keuangan. Penjual bisa menghitung HPP, simulasi harga jual & diskon, mengelola pesanan, chat dengan pembeli, pakai sistem poin per toko, serta melihat laporan keuangan bulanan per tokonya.

## Daftar Isi

- [1. Struktur Project](#1-struktur-project)
- [2. Prasyarat](#2-prasyarat)
- [3. Clone Project](#3-clone-project)
- [4. Konfigurasi Database](#4-konfigurasi-database)
- [5. Import Schema & Seed Database](#5-import-schema--seed-database)
- [6. Jalankan Microservice Flask (HPP & Diskon)](#6-jalankan-microservice-flask-hpp--diskon)
- [7. Jalankan Backend PHP API](#7-jalankan-backend-php-api)
- [8. Jalankan Frontend](#8-jalankan-frontend)
- [9. Akun Demo Untuk Testing](#9-akun-demo-untuk-testing)
- [10. Tes Cepat Untuk Pastikan Semua Nyambung](#10-tes-cepat-untuk-pastikan-semua-nyambung)
- [11. Troubleshooting](#11-troubleshooting)
- [12. Dokumentasi Tambahan](#12-dokumentasi-tambahan)

## 1. Struktur Project

```text
LocalKita/
├── API_CONTRACT.md      # Kontrak endpoint API (Frontend wajib patuhin ini)
├── README.md            # Panduan utama (file ini)
├── backend/             # Backend PHP + Microservice Flask
│   ├── api/             # Semua endpoint API (.php)
│   ├── lib/             # Helper (db.php, auth.php, session.php, response.php, dll)
│   ├── python/          # Microservice Flask untuk perhitungan HPP & Diskon
│   ├── sql/             # schema.sql dan seed.sql
│   └── README.md        # Panduan spesifik backend
├── frontend/            # Frontend HTML, CSS, JavaScript (Vanilla)
│   ├── assets/          # Gambar, icon, dll
│   ├── js/              # File JavaScript per halaman/fungsi
│   └── README.md        # Panduan spesifik frontend
├── rencana.md           # Rencana & konsep awal project
└── frontend/rencana.md  # Rencana & identitas visual frontend
```

## 2. Prasyarat

Sebelum jalanin, pastiin tools ini udah ke-install:

| Tools | Versi Minimal | Keterangan |
| --- | -------------- | ----------- |
| **[PHP](https://www.php.net/)** | 8.2+ | Untuk menjalankan REST API Backend |
| **[Python](https://www.python.org/)** | 3.10+ | Untuk menjalankan Microservice Flask (HPP & Diskon) |
| **[MySQL](https://www.mysql.com/)** atau **[Docker](https://www.docker.com/)** | MySQL 8+ / Docker terbaru | Untuk database `lokalkita`. Pada repo ini umumnya pakai container `lokalkita-db` |
| **[Git](https://git-scm.com/)** | Terbaru | Untuk clone repository |
| **Browser](https://www.google.com/chrome/)** | Chrome/Firefox/Edge | Untuk membuka frontend |

Cek instalasinya bisa pakai:

```bash
php -v
python3 --version
git --version
docker --version  # skip kalo pake MySQL lokal
```

## 3. Clone Project

Buka terminal, lalu clone repo ini ke direktori yang kamu mau.

```bash
git clone https://github.com/tamam210/LocalKita.git
cd LocalKita
```

## 4. Konfigurasi Database

Dari **root folder** `LocalKita/`, salin file konfigurasi contoh.

```bash
cp backend/config.example.php backend/config.php
```

Buka file `backend/config.php` lalu sesuaikan isinya dengan koneksi MySQL kamu.

```php
<?php
declare(strict_types=1);

return [
    'db' => [
        'host'    => '127.0.0.1',
        'port'    => 3306,
        'name'    => 'lokalkita',
        'user'    => 'lokalkita',  // ganti kalo beda
        'pass'    => 'lokalkita',  // ganti kalo beda
        'charset' => 'utf8mb4',
    ],
    'app' => [
        'env'   => 'local',
        'debug' => true,
    ],
];
```

> **Catatan:** `backend/config.php` sudah masuk `.gitignore`, jadi aman buat diisi lokal dan **TIDAK BOLEH** di-commit ke Git.

## 5. Import Schema & Seed Database

Kamu harus punya database `lokalkita` yang udah siap. Ada 2 cara, pilih salah satu yang kamu pake.

### Opsi A: Pakai Docker (Rekomendasi)

Pastikan container `lokalkita-db` kamu udah jalan.

```bash
# Cek container yang berjalan
docker ps
```

Lalu import schema dan datanya:

```bash
# 1. Import struktur tabel
docker exec -i lokalkita-db mysql -uroot -prootpw < backend/sql/schema.sql

# 2. Import data dummy (akun demo, toko, produk, pesanan, laporan, dll)
docker exec -i lokalkita-db mysql -uroot -prootpw < backend/sql/seed.sql
```

### Opsi B: Pakai MySQL Lokal

Buat database dulu (kalo belum ada), lalu import.

```bash
# Masuk ke MySQL
mysql -u root -p

# Di dalam mysql
CREATE DATABASE IF NOT EXISTS lokalkita CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

Lalu import filenya:

```bash
mysql -u root -p lokalkita < backend/sql/schema.sql
mysql -u root -p lokalkita < backend/sql/seed.sql
```

Setelah berhasil, di database `lokalkita` bakal ada sekitar **28 tabel**.

## 6. Jalankan Microservice Flask (HPP & Diskon)

Buka **Terminal 1**. Arahkan ke folder `backend/python/`.

```bash
cd backend/python
```

Buat virtual environment (cukup sekali aja pas pertama kali).

```bash
# Buat venv
python3 -m venv .venv

# Aktifkan venv
# Untuk Linux / WSL / macOS
source .venv/bin/activate

# Untuk Windows (PowerShell)
# .\.venv\Scripts\Activate.ps1

# Untuk Windows (CMD)
# .\.venv\Scripts\activate.bat
```

Install dependency yang dibutuhkan.

```bash
pip install -r requirements.txt
```

Jalanin Flask-nya.

```bash
python hitung.py
```

Kalo berhasil, bakal muncul seperti ini:

```text
 * Running on http://127.0.0.1:5001
 * Press CTRL+C to quit
```

Biarkan terminal ini tetap **nyala** selama development.

> **Note:** Kalo misalnya Flask dimatikan, endpoint `hpp.php` dan `diskon.php` di PHP bakal otomatis pakai **fallback PHP** biar perhitungan tetap bisa jalan.

## 7. Jalankan Backend PHP API

Buka **Terminal 2**. Pastiin kamu masih di **root folder** `LocalKita/` (bukan di `backend/`).

```bash
# Dari root LocalKita/
php -S 127.0.0.1:8000 -t .
```

Kalo berhasil bakal muncul:

```text
PHP 8.x Development Server (http://127.0.0.1:8000) started
```

Semua endpoint backend bisa diakses lewat:

```text
http://127.0.0.1:8000/backend/api/[nama-endpoint].php
```

Biarkan terminal ini tetap **nyala**.

## 8. Jalankan Frontend

Buka **Terminal 3** di folder `frontend/`.

### Cara 1: VS Code Live Server (Paling gampang & recommended)

1. Buka folder `LocalKita` di **Visual Studio Code**
2. Install extension [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
3. Buka file `frontend/index.html`
4. Klik kanan -> `Open with Live Server`
5. Browser bakal otomatis kebuka di `http://127.0.0.1:5500`

### Cara 2: PHP Built-in Server

Kalo kamu nggak mau pake Live Server, bisa langsung pake PHP juga.

```bash
cd frontend
php -S 127.0.0.1:5500
```

Lalu buka browser ke `http://127.0.0.1:5500`

> Frontend udah disetting buat manggil API ke `http://127.0.0.1:8000`. Jadi pastiin **Backend PHP** udah jalan dulu sebelum buka frontend.

## 9. Akun Demo Untuk Testing

Semua akun di bawah ini pakai password yang **sama persis**:

```text
password123
```

| Email | Role | Keterangan |
| --- | ---- | ----------- |
| `admin@lokalkita.test` | `admin` | Akun Admin LokalKita |
| `tamam@lokalkita.test` | `seller` | Penjual - **Dapur Bu Tamam** |
| `rasya@lokalkita.test` | `seller` | Penjual - **Kriya Rasya** |
| `arya@lokalkita.test` | `buyer` | Pembeli |
| `sari@lokalkita.test` | `buyer` | Pembeli |

## 10. Tes Cepat Untuk Pastikan Semua Nyambung

Bisa langsung diuji dari terminal buat ngecek koneksi.

### Tes 1: Cek Backend PHP
```bash
curl http://127.0.0.1:8000/backend/api/ping.php
```

Harus keluar JSON seperti `{"ok":true,...}`

### Tes 2: Cek Microservice Flask
```bash
curl http://127.0.0.1:5001/health
```

Harus keluar response JSON yang nunjukin service aktif.

### Tes 3: Tes Login
```bash
curl -X POST "http://127.0.0.1:8000/backend/api/auth.php?action=login" \
  -H "Content-Type: application/json" \
  -d '{"email":"tamam@lokalkita.test","password":"password123"}' \
  -c cookies.txt -i
```

Kalo sukses bakal ada `Set-Cookie: PHPSESSID=...` dan response `ok: true` tanpa `password_hash`.

### Tes 4: Tes Lihat Produk (Tanpa Login)
```bash
curl -s "http://127.0.0.1:8000/backend/api/products.php?store_id=20000000-0000-4000-8000-000000000001" | python3 -m json.tool | head -40
```

Yang perlu diperhatiin: buat yang belum login, field `hpp_unit` harus **`null`** (HPP disembunyiin).

## 11. Troubleshooting

| Masalah | Penyebab | Solusi |
| --- | --------- | ------- |
| **`Failed to open stream: backend/config.php`** | File `config.php` belum dibuat | Jalankan `cp backend/config.example.php backend/config.php` lalu isi kredensial DB |
| **Koneksi DB gagal** | Salah user/pass/host atau MySQL belum nyala | Cek `backend/config.php` & pastiin MySQL/Docker container udah running |
| **`Class 'PDO' not found`** | Ekstensi `pdo_mysql` belum aktif | Aktifin `extension=pdo_mysql` di `php.ini`, lalu restart terminal/Apache kalo dipake |
| **Port 5001 sudah dipakai** | Ada proses Flask lain yang masih jalan | Kill prosesnya: `pkill -f hitung.py` lalu jalanin `python hitung.py` lagi |
| **Port 8000 / 5500 sudah dipakai** | Ada server lain yang nyangkut di port itu | Ganti port, misal `php -S 127.0.0.1:8001 -t .` (tapi frontend harus disesuaikan kalo diganti) |
| **Session / Cookie nggak kebawa** | Lupa pakai `credentials: 'include'` di fetch JS | Di frontend wajib pakai `fetch(url, { credentials: 'include' })` biar cookie `PHPSESSID` terkirim |
| **Flask mati, HPP/Diskon error** | Microservice Flask down | Nyalain lagi `python hitung.py` di `backend/python/`. Atau biarin aja, soalnya udah ada fallback PHP |
| **Laporan bisa muncul / ada error aneh** | DB lama beda skema | Pastiin schema udah di-import ulang atau sesuaikan sama `backend/sql/schema.sql` terbaru |

## 12. Dokumentasi Tambahan

Biar lebih detail, bisa langsung baca file-file ini:

| File | Kegunaan |
| --- | --------- |
| **[`backend/README.md`](backend/README.md)** | Penjelasan khusus backend, struktur `api/`, `lib/`, Flask, akun demo & catatan keamanan |
| **[`frontend/README.md`](frontend/README.md)** | Penjelasan frontend, struktur folder, routing, serta identitas visual LokalKita |
| **[`API_CONTRACT.md`](API_CONTRACT.md)** | Kontrak lengkap semua endpoint, method, parameter, format request/response, auth, CORS & error code |
| **[`rencana.md`](rencana.md)** | Latar belakang, tujuan, fitur utama, alur bisnis & pembagian tugas project |
| **[`frontend/rencana.md`](frontend/rencana.md)** | Acuan desain UI/UX & palet warna LokalKita |

**Urutan jalanin yang disaranin:** `Database (import schema+seed) -> Flask (:5001) -> PHP API (:8000) -> Frontend (:5500)` 

Kalo urutannya gitu, semua fitur LokalKita bisa langsung dicoba tanpa kendala.