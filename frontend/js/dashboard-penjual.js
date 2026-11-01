/* dashboard-penjual.html. Tampilan data contoh sampai endpoint dashboard tersedia. */
(function () {
  'use strict';

  // Ganti bagian ini dengan data dari API dashboard saat backend sudah menyediakannya.
  var DEMO = {
    toko: 'Dapur Bu Sari',
    ringkasan: [
      { label: 'Pesanan masuk', nilai: '12', tren: '+3 dari bulan lalu', arah: 'naik', ket: '3 menunggu konfirmasi' },
      { label: 'Transaksi selesai', nilai: '8', tren: '+2 dari bulan lalu', arah: 'naik', ket: '67% dari pesanan masuk' },
      { label: 'Pendapatan', nilai: 4850000, tren: '+12,4% dari bulan lalu', arah: 'naik', ket: 'Dari 8 transaksi tercatat' },
      { label: 'Estimasi keuntungan', nilai: 1920000, tren: 'Margin 39,6%', arah: 'naik', ket: 'Setelah HPP dan biaya reward' },
      { label: 'Kunjungan toko', nilai: '486', tren: '+18% dari bulan lalu', arah: 'naik', ket: '42 datang dari chat' }
    ],
    pesanan: [
      { id: 'LK-1042', pembeli: 'Rina', produk: 'Sambal Roa × 2', total: 70000, status: 'menunggu', waktu: '5 menit lalu' },
      { id: 'LK-1041', pembeli: 'Bagas', produk: 'Keripik Singkong × 4', total: 60000, status: 'menunggu', waktu: '18 menit lalu' },
      { id: 'LK-1040', pembeli: 'Sari', produk: 'Kopi Lokal × 1', total: 45000, status: 'diproses', waktu: '1 jam lalu' },
      { id: 'LK-1039', pembeli: 'Dewi', produk: 'Paket Oleh-oleh × 1', total: 125000, status: 'selesai', waktu: 'Kemarin' },
      { id: 'LK-1038', pembeli: 'Andi', produk: 'Sambal Roa × 1', total: 35000, status: 'batal', waktu: 'Kemarin' }
    ],
    poin: [
      { label: 'Poin diberikan', nilai: '1.240 poin' },
      { label: 'Poin ditukar', nilai: '320 poin' },
      { label: 'Biaya reward', nilai: 96000 },
      { label: 'Sisa kuota promo', nilai: '18 slot' }
    ],
    chat: [
      { nama: 'Rina', pesan: 'Kak, sambal roa-nya masih ada?', belum: 2 },
      { nama: 'Bagas', pesan: 'Bisa dikirim hari ini?', belum: 1 },
      { nama: 'Dewi', pesan: 'Terima kasih, paketnya sudah sampai.', belum: 0 }
    ],
    kesehatan: [
      { label: 'Margin laba', nilai: '39,6%', ket: 'Di atas target 35%', persen: 100, kelas: 'bar-omzet', status: 'Sehat', statusKelas: 'tren-naik' },
      { label: 'Promo masih untung', nilai: '7 dari 8', ket: '1 promo mendekati HPP', persen: 87.5, kelas: 'bar-laba', status: 'Perlu dicek', statusKelas: 'tren-turun' },
      { label: 'Stok menipis', nilai: '3 produk', ket: 'Stok di bawah 5 unit', persen: 60, kelas: 'bar-laba', status: 'Perlu restock', statusKelas: 'tren-turun' }
    ],
    grafik: [
      { bulan: 'Mei', omzet: 3200000, laba: 1100000 },
      { bulan: 'Jun', omzet: 3750000, laba: 1320000 },
      { bulan: 'Jul', omzet: 3500000, laba: 1240000 },
      { bulan: 'Agu', omzet: 4100000, laba: 1550000 },
      { bulan: 'Sep', omzet: 4400000, laba: 1710000 },
      { bulan: 'Okt', omzet: 4850000, laba: 1920000 }
    ]
  };

  var STATUS = {
    menunggu: { teks: 'Menunggu konfirmasi', kelas: 'status-menunggu' },
    diproses: { teks: 'Diproses', kelas: 'status-diproses' },
    selesai: { teks: 'Selesai', kelas: 'status-selesai' },
    batal: { teks: 'Dibatalkan', kelas: 'status-batal' }
  };

  var $ringkasan = document.getElementById('isi-ringkasan');
  var $pesanan = document.getElementById('isi-pesanan');
  var $perlu = document.getElementById('jumlah-perlu-aksi');
  var $poin = document.getElementById('isi-poin-promo');
  var $chat = document.getElementById('isi-chat-masuk');
  var $kesehatan = document.getElementById('isi-kesehatan');
  var $grafik = document.getElementById('isi-grafik');
  var $kuotaBar = document.getElementById('kuota-bar');

  document.getElementById('nama-toko').textContent = DEMO.toko;

  function nilaiTampil(n) {
    return typeof n === 'number' ? LK.rupiah(n) : n;
  }
  function kartuAngka(label, nilai, tren, arah, ket) {
    var isi = [
      LK.el('span', { 'class': 'label', text: label }),
      LK.el('strong', { 'class': 'nilai', text: nilaiTampil(nilai) })
    ];
    if (tren) { isi.push(LK.el('span', { 'class': 'tren ' + (arah === 'turun' ? 'tren-turun' : 'tren-naik'), text: tren })); }
    if (ket) { isi.push(LK.el('span', { 'class': 'label', text: ket })); }
    return LK.el('article', { 'class': 'kartu-angka' }, isi);
  }

  function renderRingkasan() {
    $ringkasan.replaceChildren.apply($ringkasan, DEMO.ringkasan.map(function (r) {
      return kartuAngka(r.label, r.nilai, r.tren, r.arah, r.ket);
    }));
  }

  function th(teks) { return LK.el('th', { scope: 'col', text: teks }); }
  function td(teks) { return LK.el('td', { text: teks }); }

  function tombolAksi(p) {
    var bungkus = LK.el('div', { 'class': 'tabel-aksi' });
    if (p.status === 'menunggu') {
      bungkus.appendChild(LK.el('button', { type: 'button', 'class': 'tombol', 'data-aksi': 'terima', 'data-id': p.id, text: 'Terima' }));
      bungkus.appendChild(LK.el('button', { type: 'button', 'class': 'tombol tombol-garis', 'data-aksi': 'tolak', 'data-id': p.id, text: 'Tolak' }));
    } else if (p.status === 'diproses') {
      bungkus.appendChild(LK.el('button', { type: 'button', 'class': 'tombol', 'data-aksi': 'selesai', 'data-id': p.id, text: 'Selesaikan' }));
    } else {
      bungkus.appendChild(LK.el('span', { 'class': 'label', text: '—' }));
    }
    return bungkus;
  }

  function renderPesanan() {
    var perlu = DEMO.pesanan.filter(function (p) { return p.status === 'menunggu'; }).length;
    $perlu.textContent = perlu + ' perlu tindakan';

    var tb = LK.el('tbody');
    DEMO.pesanan.forEach(function (p) {
      var st = STATUS[p.status] || STATUS.menunggu;
      tb.appendChild(LK.el('tr', {}, [
        LK.el('td', {}, [LK.el('strong', { text: p.id }), LK.el('br'), LK.el('span', { 'class': 'label', text: p.waktu })]),
        td(p.pembeli),
        td(p.produk),
        td(LK.rupiah(p.total)),
        LK.el('td', {}, [LK.el('span', { 'class': 'lencana-status ' + st.kelas, text: st.teks })]),
        LK.el('td', {}, [tombolAksi(p)])
      ]));
    });
    $pesanan.replaceChildren(LK.el('table', {}, [
      LK.el('caption', { 'class': 'sr-only', text: 'Pesanan terbaru' }),
      LK.el('thead', {}, [LK.el('tr', {}, [th('Pesanan'), th('Pembeli'), th('Produk'), th('Total'), th('Status'), th('Aksi')])]),
      tb
    ]));
  }

  var KONFIRMASI = {
    terima: {
      label: 'Pesanan masuk',
      judul: 'Terima pesanan',
      pesan: 'Pembeli akan melihat status pesanan berubah menjadi Diproses.',
      teksYa: 'Ya, terima'
    },
    tolak: {
      label: 'Pesanan masuk',
      judul: 'Tolak pesanan',
      pesan: 'Pembeli akan melihat status Dibatalkan. Tindakan ini tidak bisa dibatalkan.',
      teksYa: 'Ya, tolak',
      jenis: 'bahaya'
    },
    selesai: {
      label: 'Transaksi',
      judul: 'Selesaikan transaksi',
      pesan: 'Poin pembeli akan dicatat setelah transaksi selesai.',
      teksYa: 'Ya, selesaikan'
    }
  };

  $pesanan.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-aksi]');
    if (!b) { return; }
    var id = b.dataset.id;
    var aksi = b.dataset.aksi;
    var pesanan = DEMO.pesanan.filter(function (p) { return p.id === id; })[0];
    var opsi = KONFIRMASI[aksi];
    if (!pesanan || !opsi) { return; }

    LK.konfirmasi({
      label: opsi.label,
      judul: opsi.judul + ' ' + id + '?',
      pesan: opsi.pesan,
      teksYa: opsi.teksYa,
      jenis: opsi.jenis
    }).then(function (lanjut) {
      if (!lanjut) { return; }
      if (aksi === 'terima') {
        pesanan.status = 'diproses';
        LK.notif('Pesanan ' + id + ' diterima. Status berubah menjadi Diproses.', 'sukses', 'Pesanan diterima');
      } else if (aksi === 'tolak') {
        pesanan.status = 'batal';
        LK.notif('Pesanan ' + id + ' ditolak. Pembeli melihat status Dibatalkan.', 'bahaya', 'Pesanan ditolak');
      } else if (aksi === 'selesai') {
        pesanan.status = 'selesai';
        LK.notif('Transaksi ' + id + ' selesai. Poin pembeli sudah dicatat.', 'sukses', 'Transaksi selesai');
      }
      renderPesanan();
    });
  });

  function renderPoinPromo() {
    $poin.replaceChildren.apply($poin, DEMO.poin.map(function (p) {
      return kartuAngka(p.label, p.nilai);
    }));
    var terpakai = 32, total = 50;
    document.getElementById('kuota-teks').textContent = terpakai + ' dari ' + total;
    $kuotaBar.style.width = (terpakai / total * 100).toFixed(1) + '%';
  }

  function renderChat() {
    $chat.replaceChildren.apply($chat, DEMO.chat.map(function (c) {
      var isi = [
        LK.el('span', { 'class': 'avatar', 'aria-hidden': 'true', text: c.nama.charAt(0).toUpperCase() }),
        LK.el('div', { 'class': 'item-chat-isi' }, [
          LK.el('strong', { text: c.nama }),
          LK.el('span', { text: c.pesan })
        ])
      ];
      if (c.belum > 0) {
        isi.push(LK.el('span', { 'class': 'lencana-unread', text: String(c.belum), 'aria-label': c.belum + ' pesan belum dibaca' }));
      }
      return LK.el('li', {}, [LK.el('a', { 'class': 'item-chat', href: 'poin.html#chat' }, isi)]);
    }));
  }

  function renderKesehatan() {
    $kesehatan.replaceChildren.apply($kesehatan, DEMO.kesehatan.map(function (k) {
      var bar = LK.el('div', { 'class': 'bar ' + k.kelas });
      bar.style.width = Math.max(0, Math.min(100, k.persen)) + '%';
      return LK.el('li', {}, [
        LK.el('div', { 'class': 'kesehatan-baris' }, [
          LK.el('strong', { text: k.label }),
          LK.el('span', { 'class': k.statusKelas, text: k.status })
        ]),
        LK.el('div', { 'class': 'kesehatan-baris' }, [
          LK.el('strong', { text: k.nilai }),
          LK.el('span', { text: k.ket })
        ]),
        LK.el('div', { 'class': 'bar-trek', role: 'img', 'aria-label': k.label + ': ' + k.nilai }, [bar])
      ]);
    }));
  }

  function renderGrafik() {
    var max = Math.max.apply(null, DEMO.grafik.map(function (g) { return g.omzet; })) || 1;
    function bar(label, kelas, nilai) {
      var isi = LK.el('div', { 'class': 'bar ' + kelas });
      isi.style.width = Math.max(0, Math.min(100, nilai / max * 100)).toFixed(1) + '%';
      return LK.el('div', { 'class': 'bar-jalur' }, [
        LK.el('span', { text: label }),
        LK.el('div', { 'class': 'bar-trek' }, [isi]),
        LK.el('span', { text: LK.rupiah(nilai) })
      ]);
    }
    $grafik.replaceChildren.apply($grafik, DEMO.grafik.map(function (g) {
      return LK.el('div', { 'class': 'bar-baris' }, [
        LK.el('strong', { text: g.bulan }),
        bar('Omzet', 'bar-omzet', g.omzet),
        bar('Laba', 'bar-laba', g.laba)
      ]);
    }));
  }

  renderRingkasan();
  renderPesanan();
  renderPoinPromo();
  renderChat();
  renderKesehatan();
  renderGrafik();
})();
