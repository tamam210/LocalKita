# LokalKita

**Etalase online + asisten keuangan untuk UMKM lokal.**

LokalKita adalah layanan yang membantu penjual baru maupun penjual yang sudah lama berjualan untuk:

- berjualan online tanpa harus membangun sistem sendiri;
- mengetahui HPP, harga jual, dan keuntungan yang wajar;
- menghitung diskon dan promo poin sebelum benar-benar dijalankan;
- melihat evaluasi usaha setiap bulan dan setiap tahun tanpa mencatat ulang di Excel.

> **Status:** dokumen rencana produk. "LokalKita" masih nama kerja dan belum menjadi aplikasi jadi.

## Daftar isi

1. [Latar belakang](#1-latar-belakang)
2. [Untuk siapa](#2-untuk-siapa)
3. [Posisi produk](#3-posisi-produk)
4. [Istilah penting](#4-istilah-penting)
5. [Fitur utama](#5-fitur-utama)
6. [Contoh perhitungan](#6-contoh-perhitungan)
7. [Alur pembeli](#7-alur-pembeli)
8. [Alur penjual](#8-alur-penjual)
9. [Aturan sistem](#9-aturan-sistem)
10. [Akun penjual, ruang data, dan keamanan](#10-akun-penjual-ruang-data-dan-keamanan)
11. [Laporan evaluasi bulanan dan tahunan](#11-laporan-evaluasi-bulanan-dan-tahunan)
12. [Rencana pengembangan](#12-rencana-pengembangan)
13. [Stack teknologi dan pembagian tugas](#13-stack-teknologi-dan-pembagian-tugas)
14. [Hal yang masih perlu diputuskan](#14-hal-yang-masih-perlu-diputuskan)

---

## 1. Latar belakang

Banyak pelaku UMKM bisa membuat produk, tetapi belum tentu bisa menghitung apakah usaha mereka benar-benar untung. Masalah yang sering muncul:

- Harga jual ditentukan dengan perkiraan "ikut harga pasar", tanpa tahu HPP per unit.
- Diskon dan promo dijalankan karena ingin ramai, tetapi tidak dihitung apakah masih untung.
- Poin loyalitas dianggap gratis, padahal barang yang ditukar tetap punya HPP.
- Catatan penjualan tersebar di chat pribadi, buku catatan, dan Excel. Rekap bulanan jadi lambat dan sering salah.
- Membangun aplikasi sendiri butuh waktu, biaya, dan orang teknis. Tidak semua penjual siap.

LokalKita ingin menutup jarak itu: penjual tetap bisa berjualan dengan cara yang familiar, tetapi di belakangnya ada alat bantu hitung dan catatan usaha yang otomatis.

## 2. Untuk siapa

| Pengguna | Kebutuhan utama | Yang didapat dari LokalKita |
|---|---|---|
| Penjual baru | Bingung menentukan harga dan mulai berjualan online | Panduan HPP, simulasi harga jual, etalase sederhana |
| Penjual lama | Sudah punya pelanggan, ingin usahanya lebih rapi | Laporan penjualan, simulasi promo, poin pelanggan |
| Pembeli | Mencari produk lokal dan promo yang jelas | Katalog, pesanan yang tercatat, poin per toko |

## 3. Posisi produk

LokalKita bukan sekadar marketplace yang menampilkan produk. LokalKita adalah **etalase online yang dilengkapi alat hitung dan catatan usaha**.

Marketplace umumnya berfokus pada produk yang tampil dan bisa dibeli. LokalKita menambahkan lapisan berikutnya: setelah transaksi terjadi, penjual bisa melihat apakah transaksi itu benar-benar untung, berapa biaya promonya, dan apa yang perlu diperbaiki bulan depan.

Prinsip rancangannya:

- **Komunikasi tetap di dalam LokalKita.** Pembeli dan penjual bisa chat langsung seperti di marketplace, sehingga riwayat percakapan dan pesanan tersimpan di satu tempat.
- **Fokus pada kesehatan usaha, bukan hanya ramainya transaksi.** Promo boleh dijalankan, asal penjual tahu dampaknya.
- **Poin berlaku per toko.** Poin dari Toko A hanya bisa dipakai di Toko A. Ini memudahkan penjual mengatur biaya reward sendiri.
- **Semua angka penting ditampilkan sebelum keputusan diambil.** Diskon, poin, dan promo disimulasikan terlebih dahulu.
- **Laporan dibuat dari transaksi yang tercatat.** Penjual tidak perlu merekap ulang dari nol.

## 4. Istilah penting

| Istilah | Arti |
|---|---|
| HPP | Harga pokok produksi/penjualan, yaitu total biaya untuk menghasilkan atau menyediakan satu unit barang |
| Omzet | Total harga jual sebelum diskon dan sebelum dikurangi biaya |
| Diskon | Potongan harga yang diberikan kepada pembeli |
| Pendapatan bersih | Omzet setelah dikurangi diskon |
| Laba kotor | Pendapatan bersih dikurangi HPP |
| Laba bersih | Laba kotor dikurangi biaya operasional dan biaya promo |
| Margin | Persentase laba dibanding pendapatan bersih |
| Markup | Persentase laba dibanding HPP |
| Harga tebus | Nilai poin yang ditukar ditambah uang tambahan yang dibayar pembeli |

## 5. Fitur utama

### 5.1 Etalase dan pesanan

- Profil toko: nama, kategori, cerita usaha, alamat/wilayah layanan, foto, dan jam operasional.
- Katalog produk: nama, foto, deskripsi, varian, harga, dan stok.
- Pencarian dan filter berdasarkan wilayah serta kategori.
- Detail produk: harga, varian, ketersediaan, dan estimasi poin yang akan didapat.
- Favorit dan riwayat pesanan untuk pembeli yang sudah login.
- Pesanan dengan status yang jelas, dari "menunggu konfirmasi" sampai "selesai".
- Chat internal antara pembeli dan penjual, terhubung dengan pesanan.

### 5.2 Chat pembeli dan penjual

Semua komunikasi pembeli dan penjual dilakukan melalui chat LokalKita, bukan melalui aplikasi lain.

- Pembeli yang sudah login bisa memulai chat dari halaman toko, detail produk, atau detail pesanan.
- Penjual membalas chat dari dashboard, sehingga pertanyaan pembeli tidak tercecer di aplikasi lain.
- Inbox penjual menampilkan daftar percakapan, jumlah pesan belum dibaca, dan tautan ke pesanan terkait.
- Setiap percakapan terhubung dengan pesanan terkait, lengkap dengan riwayat status.
- Chat juga terhubung dengan pengajuan penukaran poin, bukan hanya pesanan biasa.
- Chat mendukung teks, gambar produk, dan lampiran pendukung.
- Pembeli dan penjual menerima notifikasi saat ada pesan baru.
- Riwayat chat tersimpan di LokalKita dan bisa dibuka kembali kapan saja.
- Status pesanan tetap tercatat terpisah dari chat, sehingga proses pesanan tidak bergantung pada percakapan.

### 5.3 Kalkulator HPP dan harga jual

Penjual memasukkan komponen biaya produksi atau pengadaan:

- bahan baku atau harga beli barang;
- tenaga kerja;
- kemasan;
- alokasi overhead (listrik, sewa, transportasi, dan lain-lain);
- jumlah unit yang dihasilkan.

Sistem menghitung HPP per unit, lalu menampilkan simulasi harga jual dan laba berdasarkan target margin yang dipilih.

**Rumus yang dipakai:**

```text
HPP per unit = total biaya produksi / jumlah unit

Harga jual (target margin) = HPP / (1 - margin)

Laba kotor per unit = harga jual - HPP

Margin = (laba kotor / harga jual) x 100%

Markup = (laba kotor / HPP) x 100%
```

> Catatan: margin 30% bukan berarti harga jual = HPP + 30%. Itu namanya markup. Jika ingin margin 30%, harga jual = HPP / 0,70.

### 5.4 Kalkulator diskon dan simulasi promo

Sebelum membuat diskon, penjual bisa memasukkan:

- harga jual normal;
- HPP per unit;
- persentase diskon;
- jumlah barang yang ikut promo;
- biaya tambahan, misalnya biaya kemasan promo atau biaya kirim yang ditanggung penjual.

Sistem menampilkan:

- harga setelah diskon;
- laba atau rugi per unit;
- total laba atau rugi untuk seluruh barang promo;
- batas diskon maksimum agar tidak rugi;
- batas diskon maksimum jika penjual tetap ingin mendapat target laba tertentu;
- peringatan jika diskon melewati batas aman.

**Rumus yang dipakai:**

```text
Harga setelah diskon = harga jual x (1 - diskon)

Laba per unit = harga setelah diskon - HPP

Diskon maksimum agar tidak rugi =
(harga jual - HPP) / harga jual x 100%

Diskon maksimum dengan target laba =
(harga jual - HPP - target laba per unit) / harga jual x 100%
```

Penjual tetap boleh melanjutkan promo meskipun sudah melewati batas aman, tetapi sistem wajib menampilkan peringatan. Tujuannya bukan melarang, melainkan supaya penjual tahu bahwa promo tersebut sedang disubsidi.

### 5.5 Poin pembeli dan simulasi biaya reward

Aturan dasar poin:

- Poin hanya berlaku di toko yang memberikannya.
- Poin diberikan setelah penjual menyetujui bahwa transaksi selesai.
- Jika pesanan ditolak atau dibatalkan sebelum selesai, poin tidak diberikan.
- Poin bisa ditukar dengan produk promo secara **poin penuh** atau **poin + uang**.
- Saat pengajuan penukaran dibuat, poin ditahan sementara dan kuota promo dicadangkan.
- Jika pengajuan ditolak atau dibatalkan, poin dan kuota dikembalikan.
- Setelah penukaran selesai, poin dipotong secara final.
- Pada versi awal, transaksi penukaran promo tidak menghasilkan poin baru. Aturan ini ditampilkan sebelum pembeli mengonfirmasi penukaran.

Bentuk reward yang didukung pada versi awal adalah produk promo. Potongan harga langsung dan merchandise bisa ditambahkan pada versi berikutnya.

Penjual menentukan:

- nilai poin, misalnya 1 poin = Rp100;
- aturan perolehan poin, misalnya 1 poin per Rp2.000 belanja;
- produk yang bisa ditukar;
- jumlah poin yang dibutuhkan;
- tambahan uang, jika ada;
- stok atau kuota promo;
- batas penukaran per pembeli;
- periode promo.

**Simulasi yang harus ditampilkan sistem:**

```text
Nilai poin yang ditukar = jumlah poin x nilai poin

Harga tebus = nilai poin yang ditukar + tambahan uang

Batas minimum harga tebus = HPP + target laba per unit

Selisih terhadap target = harga tebus - HPP - target laba

Kas yang diterima saat penukaran = tambahan uang
```

Dengan rumus ini, penjual bisa melihat:

- apakah harga tebus sudah menutup HPP;
- apakah harga tebus sudah mencapai target laba;
- berapa uang tunai yang benar-benar masuk saat penukaran;
- berapa biaya reward yang harus ditanggung toko.

> Penting: poin penuh bukan berarti produk gratis bagi penjual. HPP tetap keluar. Poin adalah kewajiban yang terbentuk dari transaksi sebelumnya. Karena itu, saat poin diberikan, sistem sebaiknya mencatat **cadangan biaya reward** sebesar poin yang diberikan dikali nilai poin. Dengan begitu, laba bulanan tidak terlihat lebih besar dari yang sebenarnya.

### 5.6 Laporan evaluasi bulanan dan tahunan

Laporan bulanan dan tahunan dihitung otomatis dari transaksi yang sudah selesai. Isinya:

- omzet, diskon, pendapatan bersih, HPP, laba kotor, biaya operasional, biaya promo, dan laba bersih;
- margin bersih;
- produk terlaris berdasarkan jumlah terjual;
- produk paling menguntungkan berdasarkan laba;
- produk yang sering masuk promo dan masih untung atau tidak;
- poin yang diberikan, poin yang ditukar, dan sisa poin beredar;
- perbandingan dengan bulan atau tahun sebelumnya.

Detail laporannya ada di [bagian 11](#11-laporan-evaluasi-bulanan-dan-tahunan).

### 5.7 Dashboard penjual

Dashboard menampilkan:

- pesanan masuk dan transaksi selesai;
- pendapatan dari transaksi yang tercatat;
- estimasi keuntungan berdasarkan HPP yang dimasukkan;
- poin yang diberikan dan ditukarkan;
- biaya produk reward;
- sisa kuota promo;
- statistik kunjungan toko dan chat masuk;
- tombol cepat untuk melihat laporan bulanan.

## 6. Contoh perhitungan

Contoh berikut memakai satu produk dengan total biaya produksi Rp500.000 untuk 50 unit.

### 6.1 Menghitung HPP dan harga jual

| Komponen biaya | Jumlah |
|---|---:|
| Bahan baku | Rp300.000 |
| Tenaga kerja | Rp100.000 |
| Kemasan | Rp50.000 |
| Alokasi overhead | Rp50.000 |
| **Total biaya produksi** | **Rp500.000** |

```text
HPP per unit = Rp500.000 / 50 = Rp10.000
```

Jika penjual ingin margin 30%:

```text
Harga jual = Rp10.000 / (1 - 0,30)
           = Rp14.285,71
           ≈ Rp14.300
```

Pada harga Rp14.300:

- laba kotor per unit = Rp4.300;
- margin = Rp4.300 / Rp14.300 = 30,07%;
- markup = Rp4.300 / Rp10.000 = 43%.

### 6.2 Simulasi diskon

Harga jual Rp14.300 dan HPP Rp10.000.

| Diskon | Harga setelah diskon | Laba per unit | Status |
|---:|---:|---:|---|
| 0% | Rp14.300 | Rp4.300 | aman |
| 20% | Rp11.440 | Rp1.440 | masih untung |
| 30% | Rp10.010 | Rp10 | hampir impas |
| 40% | Rp8.580 | -Rp1.420 | rugi |

Batas diskon agar tidak rugi:

```text
(Rp14.300 - Rp10.000) / Rp14.300 = 30,07%
```

Jika penjual ingin tetap mendapat laba Rp2.000 per unit:

```text
(Rp14.300 - Rp10.000 - Rp2.000) / Rp14.300 = 16,08%
```

Jadi:
- diskon sampai sekitar 16% masih memenuhi target laba Rp2.000 per unit;
- diskon antara 16% dan 30% masih untung, tetapi labanya sudah di bawah target;
- diskon di atas 30% membuat penjual mulai rugi.

### 6.3 Simulasi poin

Asumsi contoh:

- HPP produk = Rp10.000;
- target laba = Rp2.000 per unit;
- 1 poin = Rp100.

| Promo | Nilai poin | Tambahan uang | Harga tebus | Selisih terhadap HPP | Status |
|---|---:|---:|---:|---:|---|
| 50 poin + Rp5.000 | Rp5.000 | Rp5.000 | Rp10.000 | Rp0 | impas, belum mencapai target |
| 70 poin + Rp5.000 | Rp7.000 | Rp5.000 | Rp12.000 | Rp2.000 | sesuai target |
| 100 poin (penuh) | Rp10.000 | Rp0 | Rp10.000 | Rp0 | impas, tidak ada uang masuk |
| 80 poin (penuh) | Rp8.000 | Rp0 | Rp8.000 | -Rp2.000 | penjual menanggung selisih |

Catatan:

- "Selisih terhadap HPP" adalah harga tebus dikurangi HPP. Angka ini belum memperhitungkan cadangan poin.
- Jika poin sudah dicadangkan saat diberikan, selisih negatif berarti penjual masih harus menanggung kekurangan biaya reward.
- Jika poin tidak dicadangkan, seluruh HPP akan terasa sebagai biaya pada saat penukaran.

## 7. Alur pembeli

### 7.1 Pendaftaran dan pencarian produk

1. Pembeli membuka website LokalKita.
2. Pembeli dapat menjelajahi UMKM dan produk tanpa login.
3. Pembeli melakukan registrasi atau login untuk memesan, menyimpan favorit, chat dengan penjual, dan mengumpulkan poin.
4. Pembeli mencari produk melalui kolom pencarian atau filter wilayah dan kategori.
5. Pembeli membuka profil toko atau detail produk.
6. Pembeli melihat harga, varian, ketersediaan, dan estimasi reward poin.
7. Pembeli dapat bertanya kepada penjual melalui chat LokalKita.

### 7.2 Pemesanan dan penyelesaian pembelian

1. Pembeli memilih varian dan jumlah barang.
2. Sistem menampilkan ringkasan pesanan:
   - produk dan jumlah;
   - total pembayaran;
   - estimasi poin yang akan diperoleh.
3. Pembeli mengirim pesanan.
4. Sistem mencatat pesanan dengan status **"Menunggu konfirmasi penjual"**.
5. Pembeli dan penjual dapat berkomunikasi melalui chat yang terhubung dengan pesanan. Seluruh percakapan tersimpan pada pesanan yang sama, lengkap dengan nomor transaksi dan riwayat status.
6. Penjual menerima atau menolak pesanan.
7. Jika diterima, pembeli melakukan pembayaran dan mengatur pengambilan atau pengiriman sesuai metode yang tersedia.
8. Pembeli menerima barang.
9. Penjual memeriksa bahwa pembayaran dan penyerahan barang sudah selesai.
10. Penjual menyetujui penyelesaian transaksi.

### 7.3 Penerimaan poin

1. Setelah penjual menyetujui penyelesaian transaksi, sistem otomatis memberikan poin kepada pembeli.
2. Pembeli menerima notifikasi pemberian poin.
3. Saldo dan riwayat poin pada toko tersebut diperbarui.
4. Jika pesanan ditolak atau dibatalkan sebelum selesai, poin tidak diberikan.

### 7.4 Penukaran poin untuk produk promo

1. Pembeli membuka menu **"Promo Poin"**.
2. Pembeli memilih toko dan produk promo.
3. Pembeli melihat:
   - jumlah poin yang dibutuhkan;
   - tambahan uang, jika menggunakan poin + uang;
   - stok atau kuota;
   - periode serta ketentuan promo.
4. Pembeli mengajukan penukaran.
5. Sistem memeriksa kecukupan saldo dan ketersediaan promo.
6. Poin ditahan sementara dan kuota promo dicadangkan selama pengajuan diproses.
7. Penjual menerima atau menolak pengajuan.
8. Jika diterima, pembeli membayar tambahan uang jika ada dan menerima produk.
9. Setelah transaksi diselesaikan, poin yang ditahan dipotong secara final.
10. Pembeli dapat melihat transaksi pada riwayat penukaran.
11. Jika pengajuan ditolak atau dibatalkan, poin yang ditahan dan kuota promo dikembalikan.

### 7.5 Ringkasan alur pembeli

```text
Daftar / Login
      ↓
Cari toko dan produk
      ↓
Tanya penjual lewat chat (opsional)
      ↓
Buat pesanan
      ↓
Penjual menerima pesanan
      ↓
Bayar dan terima barang
      ↓
Penjual menyetujui transaksi selesai
      ↓
Poin otomatis masuk
      ↓
Pilih produk promo
      ↓
Ajukan penukaran poin
      ↓
Penjual menerima pengajuan
      ↓
Terima produk → Penukaran selesai
```

## 8. Alur penjual

### 8.1 Pendaftaran dan pengaturan toko

1. Penjual melakukan registrasi atau login.
2. Setelah akun diverifikasi, sistem otomatis menyiapkan **ruang data pribadi** untuk toko tersebut. Ruang data ini akan menyimpan produk, penjualan, HPP, chat, poin, dan laporan tokonya.
3. Penjual memilih menu **"Daftarkan Usaha"**.
4. Penjual mengisi profil toko:
   - nama dan kategori usaha;
   - cerita singkat usaha;
   - alamat atau wilayah layanan;
   - foto usaha;
   - jam operasional.
5. Penjual menyimpan dan menerbitkan profil toko.

> Ruang data hanya dapat diakses oleh pemilik akun, staf toko yang diberi izin, dan admin platform untuk keperluan operasional. Aturan lengkapnya ada di [bagian 10](#10-akun-penjual-ruang-data-dan-keamanan).

### 8.2 Menghitung HPP dan menetapkan harga

1. Penjual membuka kalkulator HPP.
2. Penjual memasukkan biaya produksi atau pengadaan sesuai produknya:
   - bahan baku atau harga beli barang;
   - tenaga kerja;
   - kemasan;
   - alokasi overhead;
   - jumlah unit yang dihasilkan.
3. Sistem menampilkan hasil perhitungan HPP per unit.
4. Penjual memasukkan target margin atau harga jual.
5. Sistem menampilkan simulasi keuntungan berdasarkan biaya yang dimasukkan.
6. Sebelum membuat promo, penjual membuka kalkulator diskon untuk melihat batas aman dan target laba.

### 8.3 Menambahkan produk dan reward poin

1. Penjual menambahkan nama, foto, deskripsi, varian, harga, dan stok produk.
2. Penjual menentukan apakah produk memberikan reward poin.
3. Penjual mengatur jumlah poin atau aturan perolehannya.
4. Penjual meninjau ringkasan produk.
5. Penjual menerbitkan produk.

### 8.4 Memproses pembelian dan menyetujui poin

1. Penjual menerima notifikasi pesanan baru.
2. Penjual dapat membalas chat pembeli dari detail pesanan.
3. Penjual memeriksa produk, jumlah, stok, dan detail pemesanan.
4. Penjual menerima atau menolak pesanan.
5. Jika diterima, penjual memproses pembayaran dan penyerahan barang.
6. Setelah pembayaran serta penyerahan barang selesai, penjual menekan tombol **"Selesaikan Transaksi & Berikan Poin"**.
7. Sistem meminta konfirmasi.
8. Setelah dikonfirmasi, sistem:
   - mengubah status transaksi menjadi **"Selesai"**;
   - memberikan poin kepada pembeli;
   - mencatat pemberian poin;
   - mencegah poin diberikan dua kali untuk transaksi yang sama.

### 8.5 Membuat produk promo poin

1. Penjual membuka menu **"Kelola Promo Poin"**.
2. Penjual memilih produk dari katalog.
3. Penjual menentukan metode penukaran:
   - poin penuh;
   - poin + uang.
4. Penjual memasukkan:
   - poin yang dibutuhkan;
   - tambahan uang jika ada;
   - stok atau kuota promo;
   - batas penukaran per pembeli, jika diperlukan;
   - periode promo.
5. Sistem menampilkan HPP produk, harga tebus, dan simulasi biaya promo.
6. Sistem memberi peringatan jika harga tebus berada di bawah HPP atau di bawah target laba.
7. Penjual meninjau ketentuan, lalu menerbitkan promo.

> Untuk produk poin penuh, tidak ada pembayaran uang pada saat penukaran. Karena itu, simulasi harus menampilkan HPP sebagai biaya reward yang ditanggung penjual, bukan menyebut produk tersebut otomatis menghasilkan keuntungan.

### 8.6 Memproses penukaran

1. Penjual menerima pengajuan penukaran.
2. Penjual memeriksa detail promo dan kesiapan barang.
3. Penjual menerima atau menolak pengajuan.
4. Jika diterima, penjual memproses tambahan pembayaran jika ada dan menyerahkan barang.
5. Penjual menyelesaikan transaksi penukaran.
6. Sistem memfinalkan pemotongan poin serta memperbarui stok dan riwayat transaksi.

### 8.7 Memantau dashboard dan evaluasi

Sebelum melihat laporan, penjual dapat mencatat biaya operasional bulanan seperti sewa, listrik, gaji, dan transportasi. Dengan begitu, laba bersih yang ditampilkan bukan hanya laba kotor.

Penjual membuka dashboard untuk melihat:

- pesanan masuk dan transaksi selesai;
- pendapatan dari transaksi yang tercatat;
- estimasi keuntungan berdasarkan biaya yang dimasukkan;
- poin yang diberikan dan ditukarkan;
- biaya produk reward;
- sisa kuota promo;
- statistik kunjungan toko dan chat masuk;
- ringkasan bulanan dan tahunan.

### 8.8 Ringkasan alur penjual

```text
Daftar / Login
      ↓
Sistem menyiapkan ruang data pribadi toko
      ↓
Lengkapi profil toko
      ↓
Hitung HPP → Tetapkan harga
      ↓
Simulasikan diskon dan promo
      ↓
Tambahkan produk dan aturan reward poin
      ↓
Terbitkan produk
      ↓
Terima chat dan pesanan
      ↓
Proses pesanan
      ↓
Konfirmasi transaksi selesai
      ↓
Sistem memberikan poin kepada pembeli
      ↓
Buat produk promo poin
      ↓
Proses pengajuan penukaran
      ↓
Selesaikan penukaran
      ↓
Pantau dashboard dan laporan evaluasi
```

## 9. Aturan sistem

### 9.1 Pesanan dan poin

| Kondisi | Perlakuan sistem |
|---|---|
| Pesanan baru dibuat | Poin masih berupa estimasi |
| Penjual menerima pesanan | Poin belum masuk ke saldo |
| Penjual menyetujui transaksi selesai | Poin otomatis diberikan |
| Pesanan batal sebelum selesai | Poin tidak diberikan |
| Pembeli mengajukan penukaran | Poin ditahan sementara |
| Penukaran ditolak atau dibatalkan | Poin dilepas kembali |
| Penukaran selesai | Poin dipotong secara final |
| Tombol penyelesaian ditekan berulang | Sistem tidak memberikan poin ganda |
| Transaksi penukaran promo selesai | Tidak menghasilkan poin baru pada versi awal |

### 9.2 Diskon dan promo

| Kondisi | Perlakuan sistem |
|---|---|
| Diskon melewati batas aman | Sistem menampilkan peringatan; penjual bisa lanjut dengan konfirmasi |
| Harga tebus poin di bawah HPP | Sistem menampilkan peringatan "promo berpotensi rugi" |
| Harga tebus di atas HPP tetapi di bawah target laba | Sistem menampilkan peringatan "laba di bawah target" |
| Promo poin penuh | Tidak ada uang masuk; HPP barang dicatat sebagai biaya, lalu dikurangi cadangan poin yang sudah dibentuk |
| Promo poin + uang | Tambahan uang dicatat sebagai pendapatan; HPP dicatat sebagai biaya, lalu dikurangi cadangan poin |
| Poin diberikan | Dicatat sebagai cadangan biaya reward (kewajiban) |
| Poin ditukar | Mengurangi cadangan; jika HPP lebih besar dari cadangan ditambah tambahan uang, selisihnya menjadi biaya penjual |

> Agar tidak terjadi pencatatan ganda: poin yang diberikan dicatat sebagai cadangan. Saat poin ditukar, cadangan itu dipakai untuk menutup HPP barang reward. Jika HPP lebih besar dari cadangan + tambahan uang, selisihnya baru dicatat sebagai biaya penjual.

### 9.3 Laporan

| Kondisi | Perlakuan sistem |
|---|---|
| Transaksi penjualan selesai | Masuk ke omzet dan HPP penjualan |
| Penukaran poin selesai | Tidak masuk omzet; HPP barang reward masuk ke biaya reward poin |
| Transaksi batal | Tidak masuk ke omzet |
| Diskon diberikan | Mengurangi pendapatan bersih |
| Biaya operasional dicatat | Mengurangi laba bersih |
| Poin beredar belum ditukar | Ditampilkan sebagai kewajiban poin |
| Bulan belum selesai | Laporan ditandai sebagai sementara |
| Laporan tahunan | Dihitung dari akumulasi 12 bulan |

### 9.4 Chat

| Kondisi | Perlakuan sistem |
|---|---|
| Pembeli belum login mencoba chat | Diarahkan login terlebih dahulu |
| Chat dari halaman toko atau produk | Masuk ke inbox penjual |
| Chat dari detail pesanan | Terhubung dengan nomor pesanan tersebut |
| Penjual membalas chat | Pembeli menerima notifikasi |
| Pesanan selesai | Riwayat chat tetap tersimpan |
| Pesan berisi gambar atau lampiran | Disimpan sebagai bagian dari riwayat percakapan |

## 10. Akun penjual, ruang data, dan keamanan

### 10.1 Ruang data pribadi per penjual

Setiap penjual yang membuat akun dan mendaftarkan usaha otomatis mendapatkan **ruang data pribadi** atau **database toko**. Di dalamnya tersimpan seluruh data operasional tokonya:

- profil dan pengaturan toko;
- produk, varian, stok, HPP, dan harga jual;
- pesanan, pembayaran, dan status transaksi;
- chat dengan pembeli;
- poin, promo, dan riwayat penukaran;
- biaya operasional;
- laporan bulanan dan tahunan.

Data disimpan di server LokalKita, bukan hanya di browser. Jika penjual berganti perangkat atau membersihkan cache, data tokonya tetap ada.

Ada dua cara menyediakan ruang data:

| Cara | Kelebihan | Kekurangan |
|---|---|---|
| Satu database dengan `toko_id` di setiap tabel | Lebih murah, mudah dirawat, cocok untuk MVP | Isolasi bergantung pada kode aplikasi dan aturan akses |
| Database atau schema terpisah per penjual | Isolasi lebih kuat, cocok untuk paket premium | Biaya dan kerumitan operasional lebih tinggi |

Untuk MVP, gunakan satu database dengan `toko_id` dan pemeriksaan akses yang ketat. Struktur ini disiapkan agar bisa ditingkatkan ke database terpisah tanpa mengubah alur produk.

### 10.2 Siapa yang boleh mengakses

| Peran | Hak akses |
|---|---|
| Pemilik akun toko | Seluruh data tokonya |
| Staf toko yang diundang | Sesuai izin yang diberikan pemilik toko |
| Admin platform | Hanya untuk dukungan, keamanan, dan kewajiban hukum; akses terbatas dan tercatat |
| Penjual lain | Tidak boleh mengakses data toko lain, termasuk lewat API |
| Pembeli atau publik | Hanya katalog dan informasi toko yang diterbitkan |

Aturan penting:

- Data keuangan, HPP, laporan, dan chat bersifat privat. Data tersebut tidak boleh muncul di halaman publik atau hasil pencarian.
- Setiap permintaan ke API wajib memeriksa sesi login dan kepemilikan `toko_id`, bukan hanya menyembunyikan tombol di tampilan.
- ID pesanan, produk, dan chat menggunakan UUID agar tidak mudah ditebak.
- Berkas unggulan seperti foto produk dan lampiran chat disimpan di folder privat per toko, lalu diakses lewat tautan yang sah.

### 10.3 Password dan akun

- Password penjual disimpan sebagai **hash** (misalnya Argon2id atau bcrypt), bukan teks biasa.
- **Pemilik platform tidak mengetahui password penjual** dan tidak bisa membacanya dari database. Yang dimiliki admin adalah hak akses administratif, bukan password akun.
- Jika penjual lupa password, sistem mengirim tautan reset ke email terdaftar. Admin tidak mengirim atau membacakan password lama.
- Penjual dapat melihat daftar perangkat yang sedang login dan mengeluarkan sesi yang tidak dikenal.
- Verifikasi email dilakukan sebelum toko bisa menerima pesanan.
- Akun admin platform wajib memakai autentikasi dua faktor (2FA).

> Catatan: "hanya penjual dan pemilik web yang bisa melihat data" bukan berarti pemilik web tahu password penjual. Pemilik web memiliki akses admin untuk kebutuhan operasional, tetapi aksesnya dibatasi dan dicatat. Ini melindungi penjual sekaligus menjaga kepercayaan.

### 10.4 Kewajiban platform

- Menyimpan data dengan enkripsi saat transit (HTTPS) dan enkripsi saat disimpan.
- Mencadangkan data secara terenkripsi dan menguji proses pemulihan.
- Mencatat audit log untuk login admin, perubahan harga atau HPP, ekspor data, dan penghapusan data.
- Tidak memakai data penjualan penjual untuk keperluan lain tanpa izin.
- Menyediakan ekspor data toko (CSV atau PDF) kapan saja.
- Menghapus data setelah akun dihapus, kecuali data yang wajib disimpan menurut hukum.
- Menampilkan ringkasan kebijakan privasi dan meminta persetujuan saat pendaftaran.

### 10.5 Pemeriksaan isolasi data

Sebelum rilis, sistem harus diuji dengan skenario berikut:

- Penjual B membuka ID produk, pesanan, atau chat milik penjual A → sistem menolak dengan **403** atau **404**.
- Laporan penjual hanya menghitung transaksi dari tokonya sendiri.
- Chat hanya bisa dibuka oleh pembeli dan penjual yang terlibat.
- Pencarian publik tidak mengembalikan HPP, margin, atau data keuangan lain.
- Setiap akses admin tercatat di audit log.

## 11. Laporan evaluasi bulanan dan tahunan

### 11.1 Isi laporan bulanan

| Bagian | Yang ditampilkan |
|---|---|
| Ringkasan | Omzet, diskon, pendapatan bersih, HPP, laba kotor, biaya operasional, biaya promo, laba bersih, margin bersih |
| Produk | Produk terlaris, produk paling untung, produk dengan margin terendah |
| Promo | Diskon yang diberikan, poin diberikan, poin ditukar, biaya reward, promo yang merugikan |
| Poin | Saldo poin beredar, poin yang akan kedaluwarsa (jika ada), nilai kewajiban poin |
| Perbandingan | Bulan ini dibanding bulan lalu |
| Catatan | Hal yang perlu diperbaiki, misalnya produk yang terlalu sering didiskon |

### 11.2 Rumus laporan

```text
Omzet = total harga jual sebelum diskon dari transaksi penjualan selesai
        (tidak termasuk penukaran poin)

Diskon = total diskon yang diberikan

Pendapatan bersih = omzet - diskon

HPP = total HPP barang yang terjual lewat transaksi penjualan
      (tidak termasuk barang yang diserahkan lewat penukaran poin)

Laba kotor = pendapatan bersih - HPP

Biaya reward poin = cadangan poin yang diberikan
                    + kekurangan biaya saat penukaran (jika ada)

Biaya promo = biaya reward poin + biaya promo lain (di luar diskon)

Laba bersih = laba kotor - biaya operasional - biaya promo

Margin bersih = (laba bersih / pendapatan bersih) x 100%
```

> Diskon sudah mengurangi pendapatan bersih, jadi diskon tidak dihitung lagi sebagai biaya promo. Kalau dihitung dua kali, laba akan terlihat lebih kecil dari yang sebenarnya. HPP barang yang diserahkan lewat penukaran poin juga tidak dimasukkan ke HPP penjualan; biaya itu masuk ke biaya reward poin.

### 11.3 Contoh ringkasan bulanan

| Komponen | Januari | Februari |
|---|---:|---:|
| Omzet (sebelum diskon) | Rp15.500.000 | Rp19.000.000 |
| Diskon | Rp500.000 | Rp1.000.000 |
| **Pendapatan bersih** | **Rp15.000.000** | **Rp18.000.000** |
| HPP | Rp9.000.000 | Rp10.500.000 |
| **Laba kotor** | **Rp6.000.000** | **Rp7.500.000** |
| Biaya operasional | Rp2.000.000 | Rp2.000.000 |
| Biaya reward poin dan promo lain | Rp300.000 | Rp500.000 |
| **Laba bersih** | **Rp3.700.000** | **Rp5.000.000** |
| Margin bersih | 24,7% | 27,8% |

Dari contoh ini, omzet dan laba bersih Februari naik, tetapi diskon dan biaya promo juga naik. Penjual bisa mengevaluasi apakah kenaikan omzet sebanding dengan tambahan diskon dan biaya promo.

### 11.4 Laporan tahunan

Laporan tahunan membantu penjual melihat:

- total omzet, diskon, pendapatan bersih, HPP, laba kotor, dan laba bersih selama satu tahun;
- bulan terbaik dan bulan terlemah;
- tren kenaikan atau penurunan;
- produk yang konsisten menguntungkan;
- produk yang sering membuat rugi;
- total poin yang diberikan dan ditukar;
- perbandingan tahun ini dengan tahun lalu, jika data sudah tersedia.

Laporan tahunan tidak perlu menunggu akhir tahun. Penjual bisa melihat laporan berjalan dan membandingkannya dengan periode sebelumnya.

## 12. Rencana pengembangan

### Fase 1 — MVP

- Akun, login, dan profil toko.
- Ruang data pribadi per penjual, pembatasan akses, dan audit log dasar.
- Katalog produk dengan varian dan stok.
- Pesanan dan status pesanan.
- Chat pembeli dan penjual yang terhubung dengan pesanan.
- Kalkulator HPP dan harga jual.
- Kalkulator diskon dasar.
- Poin: perolehan, penukaran, penahanan sementara, dan riwayat.
- Ringkasan bulanan sederhana.

### Fase 2 — Evaluasi dan promo

- Laporan tahunan dan perbandingan periode.
- Simulasi promo yang lebih lengkap.
- Peringatan otomatis untuk promo yang berpotensi rugi.
- Ekspor laporan ke CSV atau PDF.
- Notifikasi pesanan dan poin.

### Fase 3 — Otomasi dan kemitraan

- Pembayaran online.
- Integrasi pengiriman.
- Multi-cabang atau multi-gudang.
- Peningkatan fitur chat: balasan cepat, pesan otomatis, dan notifikasi real-time.

## 13. Stack teknologi dan pembagian tugas

### 13.1 Bahasa, framework, dan database

| Lapisan | Pilihan | Catatan |
|---|---|---|
| Frontend | HTML, CSS, JavaScript | Tanpa framework JS; halaman memanggil API lewat `fetch()` |
| Backend | PHP native + PDO | Tanpa Laravel; memakai session, prepared statement, dan `password_hash` |
| Database | MySQL 8 | InnoDB, `utf8mb4`, uang disimpan sebagai integer rupiah |
| API | REST JSON | Endpoint di folder `api/`; format respons `{ok, data, message}` |
| Hitung | Python opsional | Flask/FastAPI hanya untuk HPP/diskon; PHP tetap punya fallback |
| Data inti | MySQL | MongoDB tidak dipakai untuk pesanan, poin, atau laporan |

**Framework yang dipakai:** tidak ada framework PHP. Backend memakai **PHP native + PDO** supaya setup ringan untuk MVP 3 hari, tetapi tetap memakai prepared statement, validasi input, session login, dan CSRF. Frontend juga tanpa framework JavaScript.

**Aturan integrasi:** frontend hanya boleh mengirim request ke API PHP. PHP adalah satu-satunya pihak yang menulis ke MySQL. Python hanya menghitung lalu mengembalikan JSON; Python tidak menulis data inti. Kredensial database tidak boleh ada di JavaScript.

### 13.2 Data room dan alur data

- Setiap penjual punya ruang data pribadi secara logis: satu database MySQL dengan `store_id` di tabel operasional.
- Hanya penjual pemilik toko yang bisa masuk ke data room-nya. Password hanya diketahui penjual; admin tidak bisa membaca password dan setiap akses admin dicatat di `audit_logs`.
- Untuk paket premium, data room bisa ditingkatkan menjadi database atau schema terpisah per penjual tanpa mengubah alur produk.
- Alur data: browser → API PHP → MySQL. Kalau service Python dipakai: PHP → Python untuk hitung → hasil dikembalikan ke PHP → PHP yang menyimpan ke MySQL.

### 13.3 Pembagian tugas coding

Pembagian ini sama dengan dokumen `Pembagian_Tugas_Tim_LokalKita.docx` dan dokumen per orang: `Pembagian_Tugas_Tamam.docx`, `Pembagian_Tugas_Arya_Wira.docx`, dan `Pembagian_Tugas_Rasya_Naufal.docx`. Tabel ini hanya berisi tugas coding.

#### Tamam — Ketua + Coding

| Kode | Hari | Tugas |
|---|---|---|
| A1 | 30 Okt | Setup proyek PHP + MySQL: folder `public/`, `api/`, `lib/`, `sql/`, `python/`; buat `lib/db.php` pakai PDO dan `config.php`; pastikan koneksi MySQL jalan. |
| A2 | 30 Okt | Buat `sql/schema.sql` + `sql/seed.sql` untuk **28 tabel** sesuai `erd.pdf`; isi data dummy (users, stores, categories, products, variants, orders, payments, promotions, poin, laporan, chat). |
| A3 | 30 Okt | Tulis kontrak API untuk Arya/Rasya Naufal: `api/products.php`, `api/hpp.php`, `api/diskon.php`, `api/poin.php`, `api/laporan.php`, `api/chat.php`; format JSON dan nama field tetap. |
| A4 | 31 Okt | Buat `lib/hpp.php` + `python/hitung.py` endpoint `/hitung-hpp`: bahan + tenaga kerja + kemasan + overhead; HPP/unit, margin, harga saran; PHP fallback kalau Python mati. |
| A5 | 31 Okt | Buat `lib/diskon.php` + endpoint Python `/hitung-diskon`: harga normal, diskon %, qty, biaya tambahan; laba/unit, total, batas aman, warning rugi. |
| A6 | 31 Okt | Buat `api/hpp.php` + `api/diskon.php`; sambungkan form Arya ke API; test 3 contoh dan cek JSON. |
| A7 | 1 Nov | Pasang auth/session + data room: login seller/admin, `password_hash`, cek `store_id` di semua query, password hanya seller, tulis `audit_logs` untuk akses sensitif. |
| A8 | 1 Nov | Test end-to-end browser → PHP API → MySQL: katalog, HPP, diskon, poin, laporan; cek console/network dan angka. |
| A9 | 1 Nov | Review & merge: PDO prepared statement, validasi input, CSRF, jangan tampilkan `password_hash`; rapikan kode dan commit final. |

#### Arya Wira — Frontend / UI

| Kode | Hari | Tugas |
|---|---|---|
| B1 | 30 Okt | Buat `index.html`: header, search, filter kategori, grid card produk; ambil data dari `api/products.php` (fallback dummy kalau API belum siap). |
| B2 | 30 Okt | Buat `css/style.css`: warna dari `frontend/rencana.md`, font Lato, card, tombol, loading state, dan error state. |
| B3 | 30 Okt | Buat kerangka `hpp.html`, `poin.html`, `laporan.html`: navbar + section + ID dari Tamam; siapkan `fetch()` kosong. |
| B4 | 31 Okt | Selesaikan UI `hpp.html`: form bahan/tenaga/kemasan/overhead/unit; kirim ke `api/hpp.php`; tampilkan HPP, margin, harga saran; form diskon + warning dari `api/diskon.php`. |
| B5 | 31 Okt | Selesaikan UI `poin.html` (saldo, reward, tukar, riwayat, chat) dan `laporan.html` (kartu omzet/HPP/laba, tabel, chart) dari API. |
| B6 | 31 Okt | Responsive 360–390 px: navbar, form, card, tabel scroll; touch target 44 px. |
| B7 | 1 Nov | Rapikan integrasi API: loading, error, empty state, format rupiah, dan jangan taruh token/secret di JavaScript. |
| B8 | 1 Nov | Responsive final 360, 390, 768 px; tidak ada teks keluar card; tabel bisa scroll. |
| B9 | 1 Nov | Perbaiki bug visual/API dari Tamam/Rasya Naufal; pastikan frontend tidak akses MySQL langsung. |

#### Rasya Naufal — Fitur & Data

| Kode | Hari | Tugas |
|---|---|---|
| C1 | 30 Okt | Buat `lib/poin.php`: saldo awal, `tambahPoin()`, `tukarPoin()`; pakai MySQL transaction; tolak kalau saldo kurang. |
| C2 | 30 Okt | Buat `lib/laporan.php`: query omzet, HPP, laba dari orders/order_items/operational_expenses; simpan hasil ke `monthly_reports`. |
| C3 | 30 Okt | Buat `lib/chat.php` + `api/chat.php` + tabel conversations/messages; isi 1 percakapan dummy. |
| C4 | 31 Okt | Buat `api/poin.php`: earn, redeem, poin + uang, riwayat, validasi saldo, filter `store_id`; tulis ledger `point_transactions`. |
| C5 | 31 Okt | Buat `api/laporan.php`: omzet, HPP, laba kotor/bersih, biaya, produk terlaris; balikin JSON. |
| C6 | 31 Okt | Sambungkan API poin/laporan/chat ke UI Arya; samakan nama field dan format angka. |
| C7 | 1 Nov | Test 3 data berbeda: saldo, riwayat, total laporan; cek transaksi rollback kalau gagal. |
| C8 | 1 Nov | Samakan rumus PHP dan Python (`/hitung-hpp`, `/hitung-diskon`); test fallback kalau service Python mati. |
| C9 | 1 Nov | Bantu Tamam integrasi dan bantu Arya Wira isi data; test chat; pastikan tidak ada data toko lain yang bocor. |

**Target:** 9 tugas per orang selesai 5 November 2026. Buffer 2–5 November untuk bugfix dan commit final. Panduan Belajar, Tanya AI, Cek selesai, dan kolom status ada di masing-masing dokumen Word.

## 14. Hal yang masih perlu diputuskan

| Topik | Yang perlu diputuskan | Saran awal |
|---|---|---|
| Nama produk | "LokalKita" atau nama lain | Pakai LokalKita sebagai nama kerja |
| Model bisnis | Gratis, langganan, atau komisi | Tentukan sebelum diluncurkan |
| Pembayaran | Manual, transfer, atau payment gateway | Manual dulu untuk MVP |
| Pengiriman | Ambil sendiri, kurir lokal, atau ekspedisi | Fleksibel per toko |
| Poin | Nilai poin, masa berlaku, dan apakah lintas toko | Per toko, dengan nilai poin tetap |
| Diskon | Diblokir atau hanya diberi peringatan | Peringatan dan konfirmasi |
| Chat | Apakah wajib login dan apakah penjual boleh mengirim kontak pribadi | Chat untuk pembeli login; transaksi tetap lewat LokalKita |
| Laporan | Berbasis kas sederhana atau akrual | Kas sederhana dulu |
| Penyimpanan data | Satu database dengan `toko_id` atau database terpisah per penjual | Satu database dengan `toko_id` untuk MVP; siapkan migrasi ke database terpisah |
| Akses admin | Seberapa luas admin platform boleh melihat data keuangan penjual | Hanya untuk dukungan, dengan audit log dan persetujuan bila memungkinkan |
| Pemulihan akun | Reset lewat email | Email |
| Target awal | Kota, komunitas, atau kategori tertentu | Mulai dari satu wilayah |

---

Dokumen ini adalah rancangan awal. Bagian alur, rumus, dan fitur bisa disesuaikan lagi setelah ada masukan dari calon penjual dan pembeli.
