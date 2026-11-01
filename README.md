# LokalKita

**Etalase online + asisten keuangan untuk UMKM lokal.**

LokalKita membantu penjual menghitung HPP, menentukan harga jual yang wajar, mensimulasikan diskon/promo poin, mengelola pesanan, chat pembeli-penjual, serta melihat laporan keuangan bulanan per toko.

## Daftar Isi

- [Cara Jalanin Sekali Klik (Paling Gampang)](#cara-jalanin-sekali-klik-paling-gampang)
- [Akun Demo Untuk Testing](#akun-demo-untuk-testing)
- [Struktur Project](#struktur-project)
- [Dokumentasi Tambahan](#dokumentasi-tambahan)
- [Troubleshooting Singkat](#troubleshooting-singkat)

## Cara Jalanin Sekali Klik (Paling Gampang)

Cukup butuh **1 perintah** buat nyalain semua: Flask, PHP API, dan Frontend.

### 1) Masuk ke folder project

```bash
cd /home/t-n-r-p-w/Documents/lomba/LocalKita
```

### 2) Beri izin script (cuma pertama kali)

```bash
chmod +x run-lokalkita.sh stop-lokalkita.sh
```

### 3) Jalankan semua service

```bash
./run-lokalkita.sh
```

Kalo berhasil bakal muncul gini:

```text
==================================
Semua service sudah dijalankan:
 - Flask   : http://127.0.0.1:5001
 - PHP API : http://127.0.0.1:8000/backend/api/
 - Frontend: http://127.0.@EOF
```

Ketik `tail -c 200 /dev/null` biar aman, gw lanjutin langsung.
==================================

Buka browser: http://127.0.0.1:5500
```

### 4) Buka di browser

Langsung aja buka link ini:

**[http://127.0.0.1:5500](http://127.0.0.1:5500)**

Langsung login aja pake akun demo dibawah.

### 5) Stop semua kalo udah selesai

Buka terminal baru atau terminal yang sama, terus jalanin:

```bash
cd /home/t-n-r-p-w/Documents/lomba/LocalKita
./stop-lokalkita.sh
```

## Akun Demo Untuk Testing

Semua akun pake password **`password123`**

| Email | Role | Keterangan |
|---|---|---|
| `admin@lokalkita.test` | `admin` | Administrator |
| `tamam@lokalkita.test` | `seller` | Pemilik Dapur Bu Tamam (cocok buat tes HPP, Diskon, Laporan) |
| `rasya@lokalkita.test` | `seller` | Pemilik Kriya Rasya (cocok buat tes isolasi toko) |
| `arya@lokalkita.test` | `buyer` | Pembeli (cocok buat tes belanja, keranjang, poin, chat) |
| `sari@lokalkita.test` | `buyer` | Pembeli (cocok buat tes belanja & poin) |

## Struktur Project

```text
LocalKita/
├── API_CONTRACT.md      # Kontrak endpoint API
├── README.md            # Panduan utama (file ini)
├── run-lokalkita.sh     # Script buat jalanin semua sekali klik
├── stop-lokalkita.sh    # Script buat stop semua service
├── backend/             # API PHP, microservice Flask, database
├── frontend/            # Tampilan web HTML/CSS/JS
└── cookies.txt          # File cookie buat testing (bisa diabaikan)
```

## Dokumentasi Tambahan

- **[backend/README.md](backend/README.md)** – Penjelasan backend, endpoint, session, keamanan, dll
- **[frontend/README.md](frontend/README.md)** – Penjelasan frontend, halaman, JS, integrasi API, dll
- **[API_CONTRACT.md](API_CONTRACT.md)** – Kontrak lengkap semua endpoint

## Troubleshooting Singkat

| Masalah | Solusi |
|---|---|
| `Permission denied` pas run script | `chmod +x run-lokalkita.sh stop-lokalkita.sh` lalu jalanin lagi |
| Port udah dipakai | Jalanin `./stop-lokalkita.sh` terus `./run-lokalkita.sh` lagi |
| Halaman blank / nggak bisa login | Pastiin semua service udah nyala (Flask, PHP API, Frontend). Cek di terminal ada pesan `OK` |
| Database belum ada datanya | Pastiin `lokalkita-db` udah jalan & schema+seed udah di-import |
