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
5. **60-30-10** — 60% netral, 30% biru utama, 10% aksen orange/gold.

### Palet Warna

Palet ini adalah campuran **biru tua untuk trust/keuangan**, **orange untuk CTA marketplace**, dan **gold untuk poin/identitas lokal**. Ini bukan copy Shopee.

| Peran | Hex | Kontras vs putih | Pemakaian |
|---|---|---:|---|
| Primary | `#22466C` | 9.72:1 | Header, navigasi, link, tombol utama |
| Secondary | `#4788AB` | 3.91:1 | Hover, ikon, aksen; jangan untuk teks kecil di putih |
| CTA | `#C2410C` | 5.18:1 | Tombol **Beli**, **Chat**, **Mulai Jualan** |
| Gold | `#BC9313` | 2.87:1 | Badge poin, highlight; teks harus gelap |
| Success | `#1B8215` | 4.94:1 | Laba, transaksi selesai, poin masuk |
| Warning | `#B45309` | 5.02:1 | Promo berpotensi rugi, stok rendah |
| Danger | `#DC2626` | 4.83:1 | Rugi, pesanan batal, error |
| Background | `#FAF7F2` | — | Latar aplikasi yang hangat |
| Surface | `#FFFFFF` | — | Card, tabel, form |
| Text | `#0F172A` | 17.85:1 | Teks utama |
| Muted | `#475569` | 7.58:1 | Teks sekunder |
| Border | `#E2E8F0` | — | Garis dan pemisah |

**Catatan kontras:** angka di atas diukur terhadap background putih. Selalu cek ulang kombinasi warna yang benar-benar dipakai di frontend.

### Penggunaan

#### Katalog dan produk

- Header dan navigasi memakai **Primary**.
- Card produk memakai **Surface** di atas **Background**.
- Tombol beli/chat memakai **CTA**.
- Harga normal memakai **Text**.
- Harga promo/diskon memakai **CTA**, bukan **Danger**. Merah khusus untuk rugi/error agar tidak ambigu dengan laporan keuangan.
- Badge poin memakai **Gold** dengan teks gelap.

#### Kalkulator HPP dan diskon

- Input dan tombol utama memakai **Primary**.
- Hasil untung memakai **Success**.
- Hasil rugi memakai **Danger**.
- Peringatan “promo berpotensi rugi” memakai **Warning**.
- Selalu tampilkan angka, label, dan tanda `+`/`−`, bukan hanya warna.

#### Chat

- Bubble pesan keluar memakai **Primary** dengan teks putih.
- Bubble pesan masuk memakai **Surface** dengan teks gelap.
- Badge pesan belum dibaca memakai **Gold**.
- **Danger** hanya untuk error atau pesan yang benar-benar urgent, bukan semua notifikasi.

#### Poin

- Badge poin memakai **Gold** dengan teks gelap.
- Poin masuk memakai **Success**.
- Poin hangus/expired memakai **Danger**.

#### Dashboard dan laporan

- Background memakai **Background** atau **Surface**.
- Navigasi memakai **Primary**.
- Angka untung memakai **Success**.
- Angka rugi memakai **Danger**.
- Status pending atau butuh perhatian memakai **Warning**.

### Status Pesanan

| Status | Warna | Catatan |
|---|---|---|
| Menunggu konfirmasi | `#B45309` | Butuh tindakan penjual |
| Diproses | `#22466C` | Pesanan sedang berjalan |
| Selesai | `#1B8215` | Masuk omzet |
| Dibatalkan | `#DC2626` | Tidak masuk omzet |

### Catatan Penting

- Jangan pakai orange penuh seperti Shopee. Nanti kelihatan seperti clone, dan fitur keuangannya kurang terasa “trustworthy”. Biru tua + orange/gold lebih membedakan.
- Gold `#BC9313` **jangan** dipakai untuk teks putih — kontrasnya cuma 2.87:1. Kalau gold jadi background, pakai teks gelap `#1A1A1A`.
- Orange `#C2410C` aman untuk tombol dengan teks putih — kontrasnya 5.18:1.
- Merah `#DC2626` khusus untuk rugi, pembatalan, dan error. Jangan dipakai untuk harga promo.
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