## Identitas Visual & Warna

Bagian ini adalah acuan warna untuk frontend LokalKita. Tujuannya bukan sekadar mempercantik tampilan, tetapi membuat penjual dan pembeli:

- **percaya** saat melihat perhitungan HPP, diskon, poin, dan laporan;
- **mudah** membedakan aksi utama, status berhasil, peringatan, dan error;
- **nyaman** karena tampilan marketplace tetap terasa lokal dan hangat.

Palet ini disusun dari riset warna website UMKM Indonesia, riset warna dan trust, panduan aksesibilitas W3C, serta referensi identitas visual UMKM. Studi [Warna sebagai Identitas Merek pada Website](https://garuda.kemdiktisaintek.go.id/documents/detail/530850) menunjukkan bahwa warna yang konsisten membantu membangun identitas merek.

Karena LokalKita gabungan **marketplace UMKM + alat keuangan + dashboard + chat**, arah warnanya perlu dua sisi:

- **hangat dan lokal** untuk aktivitas jual beli;
- **tenang dan terpercaya** untuk fitur hitung-menghitung dan laporan.

### Prinsip

1. **Konsisten** — satu warna punya satu arti di seluruh aplikasi.
2. **Terbatas** — pakai palet utama dan warna netral. Jangan menambah warna baru tanpa alasan.
3. **Aksesibel** — kontras teks minimal 4.5:1; elemen UI minimal 3:1.
4. **Tidak mengandalkan warna saja** — untung/rugi selalu disertai label, ikon, atau tanda `+`/`−`.
5. **60-30-10** — 60% krem/netral, 30% sogan, 10% aksen terracotta.

### Palet Warna

Palet ini memakai **sogan** untuk header, navigasi, dan teks utama, **krem** sebagai latar hangat, serta **terracotta** untuk CTA. Nuansanya lokal dan hangat, tetapi tetap cukup kontras untuk fitur keuangan.

| Peran | Hex | Kontras vs putih | Pemakaian |
|---|---|---:|---|
| Sogan (Primary) | `#5B3A29` | 10.09:1 | Header, navigasi, link, teks utama, bubble pesan keluar |
| Krem (Background) | `#EADCC6` | 10.76:1 vs `#3A2418` | Latar aplikasi, hover, bubble pesan masuk, badge |
| Terracotta (Aksen) | `#C86B45` | 3.72:1 | Motif, aksen, garis; jangan untuk teks kecil di putih |
| Terracotta tua (CTA) | `#A9522F` | 5.34:1 | Tombol **Beli**, **Chat**, **Mulai Jualan**, harga |
| Success | `#1B8215` | 4.94:1 | Laba, transaksi selesai, poin masuk |
| Warning | `#F6E3C9` latar / `#8A4A08` teks | — | Promo berpotensi rugi, stok rendah |
| Danger | `#9B2C1F` | 7.57:1 | Rugi, pesanan batal, error |
| Background | `#FBF4E8` | — | Latar aplikasi yang hangat |
| Surface | `#FFFBF4` | — | Card, tabel, form |
| Text | `#3A2418` | 14.53:1 | Teks utama |
| Muted | `#7A5A47` | 6.21:1 | Teks sekunder |
| Border | `rgba(91,58,41,.16)` | — | Garis dan pemisah |

**Catatan kontras:** angka di atas diukur terhadap background putih, kecuali Krem yang diukur terhadap teks `#3A2418`. Selalu cek ulang kombinasi warna yang benar-benar dipakai di frontend.

### Penggunaan

#### Katalog dan produk

- Header dan navigasi memakai **Sogan**.
- Card produk memakai **Surface** di atas **Background**.
- Tombol beli/chat memakai **Terracotta tua**.
- Harga normal memakai **Text**.
- Harga promo/diskon memakai **Terracotta tua**, bukan **Danger**. Merah khusus untuk rugi/error agar tidak ambigu dengan laporan keuangan.
- Badge poin memakai **Krem** dengan teks **Sogan**.

#### Kalkulator HPP dan diskon

- Input dan tombol utama memakai **Sogan** atau **Terracotta tua**.
- Hasil untung memakai **Success**.
- Hasil rugi memakai **Danger**.
- Peringatan “promo berpotensi rugi” memakai **Warning** (`#F6E3C9` dengan teks `#8A4A08`).
- Selalu tampilkan angka, label, dan tanda `+`/`−`, bukan hanya warna.

#### Chat

- Bubble pesan keluar memakai **Sogan** dengan teks putih.
- Bubble pesan masuk memakai **Krem** dengan teks gelap.
- Badge pesan belum dibaca memakai **Krem** dengan teks **Sogan**.
- **Danger** hanya untuk error atau pesan yang benar-benar urgent, bukan semua notifikasi.

#### Poin

- Badge poin memakai **Krem** dengan teks **Sogan**.
- Poin masuk memakai **Success**.
- Poin hangus/expired memakai **Danger**.

#### Dashboard dan laporan

- Background memakai **Background** atau **Surface**.
- Navigasi memakai **Sogan**.
- Angka untung memakai **Success**.
- Angka rugi memakai **Danger**.
- Status pending atau butuh perhatian memakai **Warning** (`#F6E3C9` dengan teks `#8A4A08`).

### Status Pesanan

| Status | Warna | Catatan |
|---|---|---|
| Menunggu konfirmasi | `#8A4A08` | Butuh tindakan penjual |
| Diproses | `#5B3A29` | Pesanan sedang berjalan |
| Selesai | `#1B6B17` | Masuk omzet |
| Dibatalkan | `#9B2C1F` | Tidak masuk omzet |

### Catatan Penting

- Palet sogan, krem, dan terracotta dipilih supaya terasa lokal dan hangat. Jangan menambah warna baru di luar palet tanpa alasan.
- Terracotta asli `#C86B45` hanya 3.72:1 terhadap putih. Untuk teks atau tombol dengan teks putih, pakai **Terracotta tua** `#A9522F` (5.34:1).
- Krem `#EADCC6` aman dipakai sebagai latar dengan teks `#3A2418` (10.76:1).
- Merah `#9B2C1F` khusus untuk rugi, pembatalan, dan error. Jangan dipakai untuk harga promo.
- Jangan andalkan warna saja untuk menandai untung/rugi. Kasih label, ikon, atau tanda `+`/`−`.
- Riset warna tidak universal. Tetap tes ke calon penjual dan pembeli Indonesia.
- Cek kontras pakai [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) sebelum dipakai.

### Referensi

| Sumber | Yang bisa diambil |
|---|---|
| [Warna sebagai Identitas Merek pada Website](https://garuda.kemdiktisaintek.go.id/documents/detail/530850) | Warna harus konsisten dan mencerminkan identitas usaha, bukan sekadar bagus di mata |
| [Pengaruh Website UMKM terhadap Minat Beli Konsumen](https://doi.org/10.24912/jmbk.v6i6.20776) | Tampilan website, termasuk warna, memengaruhi kepercayaan dan minat beli |
| [NN/g — Using Color to Enhance Your Design](https://www.nngroup.com/articles/color-enhance-design/) | Batasi palet, pakai aturan 60-30-10, dan konsisten di semua halaman |
| [NN/g — Trustworthiness in Web Design](https://www.nngroup.com/articles/trustworthy-design/) | Warna harus cocok dengan jenis layanan; warna memengaruhi kesan profesional |
| [Color matters: color as trustworthiness cue in web sites](https://research.utwente.nl/en/publications/color-matters-color-as-trustworthiness-cue-in-web-sites/) | Biru paling sering diasosiasikan dengan trust, tapi efeknya terbatas dan tergantung konteks |
| [W3C WAI — Designing for Web Accessibility](https://www.w3.org/WAI/tips/designing/) dan [MDN — Color contrast](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Understanding_WCAG/Perceivable/Color_contrast) | Kontras teks minimal 4.5:1, elemen UI 3:1, dan jangan pakai warna doang untuk menyampaikan arti |
| [Filosofi Logo Kementerian UMKM](https://umkm.go.id/filosofi) | Referensi lokal: **Infinity Blue** `#22466C`–`#6397B1` dan **Golden Flake** `#BC9313`–`#F6E2AC` |
| [Mozilla Marketplace UX — Palettes](https://marketplaceux.github.io/marketplace-style-guides/palette.html) | Blue untuk aksi beli/kontak, green untuk sukses, red untuk error |