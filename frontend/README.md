# Frontend LokalKita

Frontend LokalKita dibangun pakai **HTML, CSS, dan Vanilla JavaScript** tanpa framework. Tujuannya biar simpel, gampang dipahami, dan langsung nyambung ke Backend PHP API LokalKita.

## Daftar Isi

- [Struktur Folder](#struktur-folder)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Konfigurasi Base URL API](#konfigurasi-base-url-api)
- [Menjalankan Frontend](#menjalankan-frontend)
- [Daftar Halaman](#daftar-halaman)
- [Struktur JavaScript](#struktur-javascript)
- [Alur Autentikasi & Session](#alur-autentikasi--session)
- [Integrasi dengan Backend](#integrasi-dengan-backend)
- [Identitas Visual](#identitas-visual)
- [Alur Penggunaan Singkat](#alur-penggunaan-singkat)
- [Akun Demo Untuk Testing](#akun-demo-untuk-testing)
- [Troubleshooting](#troubleshooting)
- [Catatan Pengembangan](#catatan-pengembangan)

## Struktur Folder

```text
frontend/
├── assets/            # Asset statis (gambar/icon jika ada)
├── css/               # File CSS styling per halaman/komponen
├── js/                # File JavaScript untuk logika & integrasi API
├── index.html         # Halaman utama (beranda/katalog)
├── katalog.html       # Halaman katalog produk
├── login.html         # Halaman login
├── dashboard-penjual.html # Warung Saya (Warung Saya)
├── hpp.html           # Halaman simulasi & perhitungan HPP
├── diskon.html        # Halaman simulasi diskon (jika tersedia)
├── laporan.html       # Halaman laporan bulanan penjual
├── poin.html          # Halaman poin pembeli
├── chat.html          # Halaman chat pembeli-penjual
├── produk-detail.html # Detail produk
├── keranjang.html     # Keranjang belanja
├── checkout.html      # Halaman checkout
├── pesanan.html       # Daftar pesanan
├── profil.html        # Profil user
├── rencana.md         # Rencana UI/UX & identitas visual
└── README.md          # Panduan ini
```

## Teknologi yang Digunakan

| Teknologi | Kegunaan |
|---|---|
| **HTML5** | Struktur halaman |
| **CSS3** | Styling, layout, warna & responsif |
| **Vanilla JavaScript (ES6+)** | Logika interaksi, fetch API, validasi form, render data |
| **Fetch API** | Komunikasi ke Backend PHP REST API |

## Konfigurasi Base URL API

Semua request ke backend lewat `frontend/js/api.js`. Di sinilah base URL API diatur.

Buka `frontend/js/api.js` dan pastiin arahnya ke PHP server kamu.

```js
// Contoh konfigurasi yang biasa dipake
const API_BASE = "http://127.0.0.1:8000/backend/api";
```

Kalo kamu ganti port PHP (mis. jadi `8001`), wajib ganti juga di file ini.

> **Penting:** Karena backend pakai session berbasis cookie (`PHPSESSID`), **wajib** pakai `credentials: 'include'` di setiap `fetch` yang butuh auth/session.

Contoh pola pemakaian di file JS:

```js
fetch(`${API_BASE}/auth.php?action=me`, {
  method: "GET",
  credentials: "include"
})
  .then(res => res.json())
  .then(data => { /* ... */ });
```

## Menjalankan Frontend

Frontend harus dijalanin barengan sama **Backend PHP API** dan **Flask Microservice** biar semua fitur bisa dipake normal.

Ada 2 cara untuk menjalankannya:

### Opsi 1: VS Code Live Server (Rekomendasi)

1. Buka folder `LocalKita/` di Visual Studio Code
2. Pasang extension **[Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)**
3. Buka `frontend/index.html`
4. Klik kanan -> `Open with Live Server`
5. Otomatis kebuka di `http://127.0.0.1:5500`

### Opsi 2: PHP Built-in Server

Dari folder `frontend/`:

```bash
cd frontend
php -S 127.0.0.1:5500
```

Lalu buka `http://127.0.0.1:5500` di browser kamu.

> **Pastikan urutannya:** `Database` -> `Flask (:5001)` -> `PHP API (:8000)` -> `Frontend (:5500)`

## Daftar Halaman

| Halaman | Akses | Keterangan |
|---|---|---|
| `index.html` | Publik | Beranda LokalKita |
| `katalog.html` | Publik | Daftar produk per toko/kategori |
| `produk-detail.html` | Publik | Detail produk & varian. HPP **tidak ditampilkan** buat pengunjung |
| `login.html` | Publik | Form login (email/username/phone + password) |
| `keranjang.html` | Pembeli (login) | Keranjang belanja |
| `checkout.html` | Pembeli (login) | Proses checkout pesanan |
| `pesanan.html` | Pembeli (login) | Riwayat pesanan pembeli |
| `poin.html` | Pembeli (login) | Saldo & riwayat poin per toko |
| `chat.html` | Pembeli/Penjual (login) | Chat antara pembeli & penjual |
| `profil.html` | Login | Profil user yang sedang login |
| `dashboard-penjual.html` | Seller (login) | Dashboard utama penjual (ringkasan toko) |
| `hpp.html` | Seller (login) | Simulasi & perhitungan HPP, bisa simpan perhitungan |
| `diskon.html` | Seller (login) | Simulasi diskon, hitung margin, status `safe/loss/below_target` |
| `laporan.html` | Seller/Admin (login) | Laporan bulanan toko (omzet, HPP, laba kotor/bersih, pengeluaran, top produk) |

## Struktur JavaScript

File JS di `frontend/js/` dipisah per fungsi biar gampang dirawat.

| File | Fungsi |
|---|---|
| `api.js` | Konfigurasi `API_BASE`, helper fetch & utilitas umum |
| `sesi-ui.js` | Cek session user, update UI header/navbar (login/logout) |
| `login.js` | Logika form login, redirect setelah berhasil login |
| `katalog.js` | Render daftar produk, filter & pencarian |
| `hpp.js` | Form hitung HPP, integrasi ke API, tampilkan hasil perhitungan |
| `diskon.js` | Form simulasi diskon, analisis margin & peringatan |
| `laporan.js` | Ambil & render laporan bulanan per toko |
| `poin.js` | Tampilkan saldo & history poin pembeli |
| `dashboard-penjual.js` | Logika Warung Saya |
| `app.js` / file lain | Logika pendukung halaman terkait |

## Alur Autentikasi & Session

1. User buka `login.html` lalu isi kredensial
2. `login.js` kirim `POST` ke `/backend/api/auth.php?action=login` dengan `credentials: 'include'`
3. Backend set cookie `PHPSESSID` dengan konfigurasi aman (`HttpOnly`, `SameSite=Lax`)
4. Setelah login, `sesi-ui.js` akan cek status login lewat `/auth.php?action=me`
5. Navbar/header otomatis berubah jadi "Dashboard", "Profil", atau "Logout" tergantung role
6. Logout menghapus session lewat `/auth.php?action=logout`

> Karena pakai cookie berbasis session, frontend **harus tetap dijalanin di origin yang konsisten** (Live Server/PHP server lokal). Jangan buka file HTML langsung pakai `file://` karena cookie/session bisa bermasalah.

## Integrasi dengan Backend

Frontend memanggil endpoint sesuai [`API_CONTRACT.md`](../API_CONTRACT.md). Beberapa poin penting:

| Fitur | Endpoint | Keterangan |
|---|---|---|
| **Login/Me/Logout** | `auth.php?action=...` | Butuh/handle session cookie |
| **Katalog Produk** | `products.php` | Publik bisa lihat, `hpp_unit` akan `null` kalo bukan pemilik toko |
| **Hitung HPP** | `hpp.php` | Khusus seller yang login & punya akses toko |
| **Simulasi Diskon** | `diskon.php` | Khusus seller yang login |
| **Poin** | `poin.php` | Khusus pembeli. Seller akan ditolak sesuai aturan bisnis |
| **Laporan Bulanan** | `laporan.php` | Khusus seller/admin pemilik toko yang valid |
| **Chat** | `chat.php` | Butuh login, hanya bisa chat terkait toko/percakapan yang valid |

Semua request ke endpoint yang butuh login wajib pakai `credentials: "include"`.

## Identitas Visual

Berdasarkan `frontend/rencana.md`, LokalKita pakai palet warna yang menonjolkan kesan **hangat, lokal, dan terpercaya**.

| Warna | Kode HEX | Penggunaan |
|---|---|---|
| **Primary** | `#22466C` | Header, navigasi, tombol utama |
| **CTA** | `#C2410C` | Tombol aksi utama (Beli, Chat, Mulai Jualan) |
| **Gold** | `#BC9313` | Badge poin & highlight |
| **Success** | `#1B8215` | Status berhasil, untung/laba |
| **Warning** | `#B45309` | Peringatan (margin berpotensi tipis/rugi) |
| **Danger** | `#DC2626` | Error, batal, rugi |
| **Background** | `#FAF7F2` | Latar belakang utama |
| **Surface/Card** | `#FFFFFF` | Card, form, tabel |
| **Text** | `#0F172A` | Teks utama |
| **Muted** | `#475569` | Teks sekunder |

> Prinsip: warna dipakai konsisten, selalu disertai label/ikon biar nggak mengandalkan warna aja buat nunjukin untung/rugi.

## Alur Penggunaan Singkat

### Sebagai Pembeli
1. Buka `katalog.html` / `index.html` -> pilih produk
2. Login via `login.html` (bisa pakai akun `arya@lokalkita.test` / `sari@lokalkita.test`)
3. Masuk ke keranjang -> `checkout.html`
4. Lihat pesanan di `pesanan.html`
5. Cek poin di `poin.html`
6. Bisa chat penjual lewat `chat.html`

### Sebagai Penjual
1. Login pakai akun seller (`tamam@lokalkita.test` / `rasya@lokalkita.test`)
2. Masuk ke `dashboard-penjual.html`
3. Coba simulasi HPP di `hpp.html` (bisa pakai fallback PHP kalo Flask mati)
4. Simulasi diskon di `diskon.html` buat liat dampak ke margin
5. Lihat laporan bulanan di `laporan.html` (omzet, HPP, laba, pengeluaran, top produk)

## Akun Demo Untuk Testing

Semua pakai password: **`password123`**

| Email | Role | Kegunaan Testing |
|---|---|---|
| `admin@lokalkita.test` | `admin` | Akses umum sebagai admin |
| `tamam@lokalkita.test` | `seller` | Tes fitur penjual (HPP, Diskon, Laporan) |
| `rasya@lokalkita.test` | `seller` | Tes isolasi toko (coba akses toko lain harus ditolak/404) |
| `arya@lokalkita.test` | `buyer` | Tes pembelian, keranjang, poin, chat |
| `sari@lokalkita.test` | `buyer` | Tes pembelian & riwayat poin |

## Troubleshooting

| Masalah | Penyebab | Solusi |
|---|---|---|
| **Data nggak muncul / loading terus** | API belum nyala / salah `API_BASE` | Pastiin PHP API di `:8000` udah jalan & `js/api.js` arahinnya bener |
| **Langsung logout / selalu minta login** | Cookie/session nggak kebawa | Pastiin pakai `credentials: "include"`. Jangan buka HTML via `file://`. Pakai Live Server / PHP server |
| **CORS error di console** | Origin beda / preflight bermasalah | Pastiin frontend & backend jalan di `127.0.0.1` (bukan `localhost` campur). Backend udah handle `OPTIONS` preflight |
| **HPP/Diskon gagal** | Flask mati & ada kendala fallback | Cek Flask di `http://127.0.0.1:5001/health`. Kalo mati, nyalain lagi atau biarin fallback PHP |
| **HPP Unit muncul ke publik** | Bug filter HPP | Seharusnya udah disembunyiin. Coba clear cache atau pastiin file `products.php` terbaru |
| **Laporan kosong/error** | Belum login / salah `store_id` / role bukan seller | Login sebagai seller pemilik toko, pastiin `store_id` yang dipilih bener |
| **CSS/JS nggak ke-load** | Path salah pas run dari folder beda | Kalo pakai Live Server buka dari root `LocalKita/` atau langsung `frontend/`. Kalo pakai PHP server di `frontend/`, path relatif harus tetep valid |

## Catatan Pengembangan

- **Vanilla only**: Nggak pake bundler, langsung include file JS per halaman
- **Session-based auth**: Semua auth bergantung ke cookie `PHPSESSID`
- **Credentials wajib**: Setiap request yang butuh user/session harus pakai `credentials: "include"`
- **Patuhin kontrak**: Lihat [`API_CONTRACT.md`](../API_CONTRACT.md) buat field, format, & aturan response
- **Jangan expose HPP**: Hanya owner toko/admin yang boleh liat `hpp_unit`
- **Konsisten sama backend**: Frontend harus ikut aturan isolasi toko & validasi dari API
- **Tes di local**: Disarankan tes bareng backend + flask biar semua fitur (HPP/Diskon/Laporan/Poin/Chat) bisa dicoba utuh
