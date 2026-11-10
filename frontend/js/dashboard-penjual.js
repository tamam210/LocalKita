(function () {
  'use strict';
  var $namaToko = document.getElementById('nama-toko');
  var $info = document.getElementById('info-dashboard');
  var $ringkasan = document.getElementById('isi-ringkasan');
  var $produk = document.getElementById('isi-produk-terlaris');
  var $poin = document.getElementById('isi-poin-promo');
  var $chat = document.getElementById('isi-chat-masuk');
  var $kesehatan = document.getElementById('isi-kesehatan');
  var $grafik = document.getElementById('isi-grafik');
  var $pilihAdmin = document.getElementById('pilih-toko-admin');
  var $tokoAdmin = document.getElementById('toko-admin');
  var $tautanChat = document.querySelector('.tautan-chat');
  var $btnTambah = document.getElementById('btn-tambah-produk');
  var storeAktif = null;
  var kategoriCache = null;

  function th(t) { return LK.el('th', { scope: 'col', text: t }); }
  function td(t) { return LK.el('td', { text: t }); }

  function kartu(label, nilai, ket) {
    return LK.el('article', { 'class': 'kartu-angka' }, [
      LK.el('span', { 'class': 'label', text: label }),
      LK.el('strong', { 'class': 'nilai', text: nilai }),
      ket ? LK.el('span', { 'class': 'label', text: ket }) : null
    ]);
  }

  function periode(r) {
    return r.period && r.period.label
      ? r.period.label
      : LK.bulan(r.period_year, r.period_month);
  }

  function daftarBulan(n) {
    var hasil = [], sekarang = new Date();
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(sekarang.getFullYear(), sekarang.getMonth() - i, 1);
      hasil.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }
    return hasil;
  }

  function bukanLaporan(e) {
    var m = String((e && e.message) || '').toLowerCase();
    return /tidak ditemukan|belum ada|not found|http 404/.test(m);
  }

  function aman(p) {
    return p.then(
      function (data) { return { ok: true, data: data }; },
      function (error) { return { ok: false, error: error }; }
    );
  }

  function muatLaporan(storeId) {
    var sekarang = new Date();
    var bulanIni = { year: sekarang.getFullYear(), month: sekarang.getMonth() + 1 };

    return Promise.all(daftarBulan(6).map(function (b) {
      var refresh = b.year === bulanIni.year && b.month === bulanIni.month ? '1' : '0';
      return LK.apiGet(
        'laporan.php?store_id=' + encodeURIComponent(storeId) +
        '&year=' + b.year + '&month=' + b.month + '&refresh=' + refresh
      ).catch(function (e) {
        if (/Sesi berakhir/.test(e.message)) { throw e; }
        if (bukanLaporan(e)) { return null; }
        throw e;
      });
    })).then(function (list) {
      return list.filter(Boolean).sort(function (a, b) {
        var pa = a.period || {}, pb = b.period || {};
        return (pa.year - pb.year) || (pa.month - pb.month);
      });
    });
  }

  function muatProduk(storeId) {
    return LK.apiGet(
      'products.php?store_id=' + encodeURIComponent(storeId) +
      '&status=active&page=1&per_page=50'
    );
  }

  function muatChat(storeId) {
    return LK.apiGet('chat.php?action=conversations&store_id=' + encodeURIComponent(storeId));
  }

  function renderRingkasan(laporan, produk, chat) {
    if (!laporan.ok) {
      LK.status($ringkasan, 'galat', 'Ringkasan gagal dimuat', laporan.error.message);
      return;
    }

    var list = laporan.data;
    if (!list.length) {
      LK.status($ringkasan, 'kosong', 'Belum ada laporan', 'Laporan muncul setelah ada pesanan selesai.');
      return;
    }

    var s = list[list.length - 1].summary || {};
    var jumlahProduk = produk.ok
      ? Number((produk.data.pagination || {}).total || (produk.data.items || []).length)
      : null;
    var belum = chat.ok
      ? (chat.data.items || []).reduce(function (n, c) {
        return n + (Number(c.unread_count) || 0);
      }, 0)
      : null;

    $ringkasan.replaceChildren.apply($ringkasan, [
      kartu('Omzet bulan ini', LK.rupiah(s.gross_revenue), 'Dari pesanan selesai'),
      kartu('Laba bersih', LK.rupiah(s.net_profit), 'Setelah HPP, biaya, dan reward'),
      kartu('Margin', LK.persen(s.net_margin), 'Laba bersih dibagi pendapatan'),
      kartu('Produk aktif', jumlahProduk === null ? '-' : String(jumlahProduk), 'Produk yang tampil di etalase'),
      kartu('Chat belum dibaca', belum === null ? '-' : String(belum), 'Pesan dari pembeli')
    ]);
  }

  function renderProdukTerlaris(laporan) {
    if (!laporan.ok) {
      LK.status($produk, 'galat', 'Produk terlaris gagal dimuat', laporan.error.message);
      return;
    }

    var list = laporan.data;
    if (!list.length) {
      LK.status($produk, 'kosong', 'Belum ada produk terjual', 'Produk terlaris muncul setelah ada pesanan selesai.');
      return;
    }

    var terlaris = Array.isArray(list[list.length - 1].top_products)
      ? list[list.length - 1].top_products
      : [];
    if (!terlaris.length) {
      LK.status($produk, 'kosong', 'Belum ada produk terjual', 'Produk terlaris muncul setelah ada pesanan selesai.');
      return;
    }

    var tb = LK.el('tbody');
    terlaris.forEach(function (x) {
      tb.appendChild(LK.el('tr', {}, [
        td(x.product_name || 'Produk'),
        td(String(Number(x.qty_sold) || 0)),
        td(LK.rupiah(x.revenue)),
        td(LK.rupiah(x.profit))
      ]));
    });

    $produk.replaceChildren(LK.el('table', {}, [
      LK.el('caption', { 'class': 'sr-only', text: 'Produk terlaris bulan ini' }),
      LK.el('thead', {}, [
        LK.el('tr', {}, [th('Produk'), th('Terjual'), th('Omzet'), th('Laba')])
      ]),
      tb
    ]));
  }

  function renderPoinPromo(laporan, produk) {
    if (!laporan.ok) {
      LK.status($poin, 'galat', 'Data promo gagal dimuat', laporan.error.message);
      return;
    }

    var list = laporan.data;
    if (!list.length) {
      LK.status($poin, 'kosong', 'Belum ada data promo', 'Data muncul setelah ada transaksi.');
      return;
    }

    var s = list[list.length - 1].summary || {};
    var berpoin = produk.ok
      ? (produk.data.items || []).filter(function (x) { return !!x.earns_points; }).length
      : null;

    $poin.replaceChildren.apply($poin, [
      kartu('Diskon', LK.rupiah(s.discounts), 'Diskon pesanan bulan ini'),
      kartu('Biaya reward', LK.rupiah(s.promo_costs), 'Poin yang diberikan ke pembeli'),
      kartu('Biaya operasional', LK.rupiah(s.operating_expenses), 'Pengeluaran toko bulan ini'),
      kartu('Produk berpoin', berpoin === null ? '-' : String(berpoin), 'Produk aktif yang memberi poin')
    ]);
  }

  function renderChat(chat) {
    if (!chat.ok) {
      LK.status($chat, 'galat', 'Chat gagal dimuat', chat.error.message);
      return;
    }

    var list = Array.isArray(chat.data.items) ? chat.data.items : [];
    if (!list.length) {
      LK.status($chat, 'kosong', 'Belum ada chat', 'Percakapan dari pembeli akan muncul di sini.');
      return;
    }

    $chat.replaceChildren.apply($chat, list.map(function (c) {
      var nama = c.buyer_name || 'Pembeli';
      var isi = [
        LK.el('span', { 'class': 'avatar', 'aria-hidden': 'true', text: String(nama).charAt(0).toUpperCase() || '?' }),
        LK.el('div', { 'class': 'item-chat-isi' }, [
          LK.el('strong', { text: nama }),
          LK.el('span', { text: c.last_message || 'Belum ada pesan' })
        ])
      ];
      var belum = Number(c.unread_count) || 0;
      if (belum > 0) {
        isi.push(LK.el('span', {
          'class': 'lencana-unread',
          text: String(belum),
          'aria-label': belum + ' pesan belum dibaca'
        }));
      }
      return LK.el('li', {}, [
        LK.el('a', { 'class': 'item-chat', href: 'poin.html#chat' }, isi)
      ]);
    }));
  }

  function renderKesehatan(laporan, produk) {
    if (!laporan.ok) {
      LK.status($kesehatan, 'galat', 'Kesehatan usaha gagal dimuat', laporan.error.message);
      return;
    }

    var list = laporan.data;
    if (!list.length) {
      LK.status($kesehatan, 'kosong', 'Belum ada data', 'Data kesehatan muncul setelah ada laporan.');
      return;
    }

    var s = list[list.length - 1].summary || {};
    var margin = Number(s.net_margin) || 0;
    var netRevenue = Number(s.net_revenue) || 0;
    var opex = Number(s.operating_expenses) || 0;
    var opexPersen = netRevenue > 0 ? Math.min(100, opex / netRevenue * 100) : 0;
    var produkList = produk.ok ? (produk.data.items || []) : [];
    var stok = produk.ok
      ? produkList.filter(function (x) { return Number(x.total_stock) < 5; }).length
      : null;
    var stokPersen = stok === null ? 0 : Math.min(100, stok / Math.max(1, produkList.length) * 100);

    var data = [
      {
        label: 'Margin laba',
        nilai: LK.persen(margin),
        ket: 'Dari laporan bulan ini',
        persen: Math.max(0, Math.min(100, margin)),
        kelas: 'bar-omzet',
        status: margin >= 0 ? 'Positif' : 'Negatif',
        statusKelas: margin >= 0 ? 'tren-naik' : 'tren-turun'
      },
      {
        label: 'Stok menipis',
        nilai: stok === null ? '-' : stok + ' produk',
        ket: 'Stok di bawah 5 unit',
        persen: stokPersen,
        kelas: 'bar-laba',
        status: stok === null ? 'Data gagal' : (stok > 0 ? 'Perlu restock' : 'Aman'),
        statusKelas: stok === null ? '' : (stok > 0 ? 'tren-turun' : 'tren-naik')
      },
      {
        label: 'Biaya operasional',
        nilai: LK.rupiah(opex),
        ket: 'Dari laporan bulan ini',
        persen: opexPersen,
        kelas: 'bar-laba',
        status: 'Tercatat',
        statusKelas: 'tren-naik'
      }
    ];

    $kesehatan.replaceChildren.apply($kesehatan, data.map(function (k) {
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

  function renderGrafik(laporan) {
    if (!laporan.ok) {
      LK.status($grafik, 'galat', 'Grafik gagal dimuat', laporan.error.message);
      return;
    }

    var list = laporan.data;
    if (!list.length) {
      LK.status($grafik, 'kosong', 'Belum ada grafik', 'Grafik muncul setelah ada laporan bulanan.');
      return;
    }

    if (window.LK && typeof LK.grafikGaris === 'function') {
      LK.grafikGaris($grafik, list);
      if (!$grafik.querySelector('.legenda-grafik')) {
        $grafik.appendChild(LK.el('div', { 'class': 'legenda-grafik' }, [
          LK.el('span', { 'class': 'butir' }, [
            LK.el('span', { 'class': 'swatch omzet', 'aria-hidden': 'true' }),
            LK.el('span', { text: 'Omzet' })
          ]),
          LK.el('span', { 'class': 'butir' }, [
            LK.el('span', { 'class': 'swatch laba', 'aria-hidden': 'true' }),
            LK.el('span', { text: 'Laba bersih' })
          ])
        ]));
      }
      return;
    }

    var max = Math.max.apply(null, list.map(function (r) {
      return Number((r.summary || {}).gross_revenue) || 0;
    })) || 1;

    function bar(label, kelas, nilai) {
      var isi = LK.el('div', { 'class': 'bar ' + kelas });
      isi.style.width = Math.max(0, Math.min(100, nilai / max * 100)).toFixed(1) + '%';
      return LK.el('div', { 'class': 'bar-jalur' }, [
        LK.el('span', { text: label }),
        LK.el('div', { 'class': 'bar-trek' }, [isi]),
        LK.el('span', { text: LK.rupiah(nilai) })
      ]);
    }

    $grafik.replaceChildren.apply($grafik, list.map(function (r) {
      var s = r.summary || {};
      return LK.el('div', { 'class': 'bar-baris' }, [
        LK.el('strong', { text: periode(r) }),
        bar('Omzet', 'bar-omzet', Number(s.gross_revenue) || 0),
        bar('Laba bersih', 'bar-laba', Number(s.net_profit) || 0)
      ]);
    }));
  }

  function renderSemua(hasil) {
    var laporan = hasil[0], produk = hasil[1], chat = hasil[2];

    renderRingkasan(laporan, produk, chat);
    renderProdukTerlaris(laporan);
    renderPoinPromo(laporan, produk);
    renderChat(chat);
    renderKesehatan(laporan, produk);
    renderGrafik(laporan);

    var gagal = !laporan.ok || !produk.ok || !chat.ok;
    $info.hidden = !gagal;
    if (gagal) {
      $info.replaceChildren(LK.el('p', { text: 'Sebagian data gagal dimuat. Coba muat ulang halaman.' }));
    }
  }

  function tokoDariUrl() {
    var m = /[?&]store_id=([^&]+)/.exec(window.location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function tokoDipilih(items) {
    var id = tokoDariUrl();
    return items.filter(function (x) {
      return String(x.store_id) === String(id);
    })[0] || items[0];
  }

  function muatPembayaran(storeId) {
    var form = document.getElementById('form-pembayaran');
    var cek = document.getElementById('bayar-online');
    var isi = document.getElementById('bayar-isi');
    var pesan = document.getElementById('pesan-pembayaran');
    if (!form || !cek || !isi) { return; }

    function tampilIsi() { isi.hidden = !cek.checked; }
    if (!cek._lkBound) {
      cek.addEventListener('change', tampilIsi);
      cek._lkBound = true;
    }
    if (!form._lkBound) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (pesan) { pesan.hidden = true; pesan.textContent = ''; }
        var payload = {
          store_id: storeAktif || storeId,
          payment_online: cek.checked,
          payment_bank_name: (document.getElementById('bayar-bank') || {}).value || '',
          payment_account_number: (document.getElementById('bayar-rek') || {}).value || '',
          payment_account_name: (document.getElementById('bayar-pemilik') || {}).value || '',
          payment_va_number: (document.getElementById('bayar-va') || {}).value || '',
          payment_qris_image_url: (document.getElementById('bayar-qris') || {}).value || ''
        };
        LK.apiPost('store_settings.php', payload).then(function () {
          if (pesan) { pesan.textContent = 'Pengaturan pembayaran disimpan.'; pesan.hidden = false; }
          LK.notif('Pengaturan pembayaran disimpan.', 'sukses', 'Pembayaran');
        }).catch(function (err) {
          if (pesan) { pesan.textContent = err.message || 'Gagal menyimpan.'; pesan.hidden = false; }
          LK.notif(err.message || 'Gagal menyimpan pengaturan pembayaran.', 'bahaya', 'Pembayaran');
        });
      });
      form._lkBound = true;
    }

    LK.apiGet('store_settings.php?store_id=' + encodeURIComponent(storeId)).then(function (d) {
      if (!d) { return; }
      cek.checked = !!d.payment_online_enabled;
      var map = {
        'bayar-bank': d.payment_bank_name || '',
        'bayar-rek': d.payment_account_number || '',
        'bayar-pemilik': d.payment_account_name || '',
        'bayar-va': d.payment_va_number || '',
        'bayar-qris': d.payment_qris_image_url || ''
      };
      Object.keys(map).forEach(function (id) {
        var el = document.getElementById(id);
        if (el) { el.value = map[id]; }
      });
      tampilIsi();
    }).catch(function () {
      cek.checked = false;
      tampilIsi();
    });
  }

  function muatData(storeId, storeName) {
    storeAktif = storeId;
    $namaToko.textContent = storeName || 'Toko saya';
    muatPembayaran(storeId);
    return Promise.all([
      aman(muatLaporan(storeId)),
      aman(muatProduk(storeId)),
      aman(muatChat(storeId))
    ]).then(renderSemua);
  }

  function muatKategori() {
    if (kategoriCache) {
      return Promise.resolve(kategoriCache);
    }
    return LK.apiGet('categories.php').then(function (d) {
      kategoriCache = d && Array.isArray(d.items) ? d.items : [];
      return kategoriCache;
    });
  }

  function bidangForm(label, input, bantuan) {
    return LK.el('div', { 'class': 'bidang' }, [
      LK.el('label', { 'for': input.id, text: label }),
      input,
      bantuan ? LK.el('small', { text: bantuan }) : null
    ]);
  }

  function bukaTambahProduk() {
    if (!storeAktif) {
      LK.notif('Pilih toko terlebih dahulu sebelum menambah produk.', 'bahaya', 'Tambah produk');
      return;
    }

    muatKategori().catch(function () { return []; }).then(function (kategori) {
      tampilFormTambahProduk(kategori);
    });
  }

  function tampilFormTambahProduk(kategori) {
    var fokusAsal = document.activeElement;
    var idJudul = 'lk-tambah-produk-judul';

    var nama = LK.el('input', {
      id: 'produk-nama', name: 'nama', type: 'text', required: 'required',
      maxlength: '180', autocomplete: 'off', placeholder: 'Contoh: Risoles Frozen'
    });
    var kategoriSelect = LK.el('select', { id: 'produk-kategori', name: 'kategori' });
    kategoriSelect.appendChild(LK.el('option', { value: '', text: 'Tanpa kategori' }));
    kategori.forEach(function (k) {
      if (k && k.category_id && k.name) {
        kategoriSelect.appendChild(LK.el('option', { value: k.category_id, text: k.name }));
      }
    });

    var harga = LK.el('input', {
      id: 'produk-harga', name: 'harga', type: 'number', required: 'required',
      min: '0', step: '500', inputmode: 'numeric', placeholder: '15000'
    });
    var stok = LK.el('input', {
      id: 'produk-stok', name: 'stok', type: 'number', required: 'required',
      min: '0', step: '1', inputmode: 'numeric', placeholder: '10'
    });
    var hpp = LK.el('input', {
      id: 'produk-hpp', name: 'hpp', type: 'number', min: '0',
      step: '100', inputmode: 'numeric', placeholder: 'Opsional'
    });
    var status = LK.el('select', { id: 'produk-status', name: 'status' }, [
      LK.el('option', { value: 'active', text: 'Aktif' }),
      LK.el('option', { value: 'draft', text: 'Draf' }),
      LK.el('option', { value: 'inactive', text: 'Nonaktif' })
    ]);
    var deskripsi = LK.el('textarea', {
      id: 'produk-deskripsi', name: 'deskripsi', maxlength: '5000',
      rows: '3', placeholder: 'Ceritakan singkat tentang produk ini'
    });
    var foto = LK.el('input', {
      id: 'produk-foto', name: 'foto', type: 'file',
      accept: 'image/jpeg,image/png,image/webp'
    });
    var poin = LK.el('input', {
      id: 'produk-poin', name: 'poin', type: 'checkbox', checked: 'checked'
    });

    var grid = LK.el('div', { 'class': 'form-grid' }, [
      LK.el('div', { 'class': 'bidang bidang-lebar' }, [
        LK.el('label', { 'for': 'produk-nama', text: 'Nama produk' }),
        nama
      ]),
      bidangForm('Kategori', kategoriSelect),
      bidangForm('Status', status),
      bidangForm('Harga jual', harga, 'Harga satuan dalam rupiah.'),
      bidangForm('Stok awal', stok, 'Jumlah unit yang tersedia.'),
      bidangForm('HPP per unit', hpp, 'Opsional, dipakai untuk laporan laba.'),
      LK.el('div', { 'class': 'bidang bidang-lebar' }, [
        LK.el('label', { 'for': 'produk-deskripsi', text: 'Deskripsi' }),
        deskripsi
      ]),
      LK.el('div', { 'class': 'bidang bidang-lebar' }, [
        LK.el('label', { 'for': 'produk-foto', text: 'Foto produk' }),
        foto,
        LK.el('small', { text: 'Opsional. JPG, PNG, atau WebP maksimal 3 MB.' })
      ]),
      LK.el('label', { 'class': 'cek bidang-lebar' }, [
        poin,
        LK.el('span', { text: 'Produk ini memberi poin untuk pembeli' })
      ])
    ]);

    var pesan = LK.el('p', { 'class': 'pesan-form', role: 'alert', hidden: 'hidden' });
    var batal = LK.el('button', { type: 'button', 'class': 'tombol tombol-garis', text: 'Batal' });
    var simpan = LK.el('button', { type: 'submit', 'class': 'tombol', text: 'Simpan produk' });
    var form = LK.el('form', { 'class': 'form-produk', novalidate: 'novalidate' }, [
      grid,
      pesan,
      LK.el('div', { 'class': 'popup-aksi' }, [batal, simpan])
    ]);

    var dialog = LK.el('div', {
      'class': 'popup popup-form kaca',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': idJudul
    }, [
      LK.el('p', { 'class': 'eyebrow', text: 'Produk baru' }),
      LK.el('h2', { id: idJudul, text: 'Tambah Produk' }),
      LK.el('p', { text: 'Isi informasi produk yang akan tampil di etalase tokomu.' }),
      form
    ]);

    var latar = LK.el('div', { 'class': 'popup-latar' }, [dialog]);
    var gulirAsal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function tutup() {
      document.removeEventListener('keydown', kunci, true);
      if (latar.parentNode) {
        latar.parentNode.removeChild(latar);
      }
      document.body.style.overflow = gulirAsal;
      if (fokusAsal && typeof fokusAsal.focus === 'function') {
        fokusAsal.focus();
      }
    }

    function kunci(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        tutup();
      }
    }

    function tampilPesan(teks) {
      pesan.textContent = teks;
      pesan.hidden = false;
    }

    batal.addEventListener('click', tutup);
    latar.addEventListener('mousedown', function (e) {
      if (e.target === latar) {
        tutup();
      }
    });
    document.addEventListener('keydown', kunci, true);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      pesan.hidden = true;

      var namaNilai = nama.value.trim();
      var hargaNilai = Number(harga.value);
      var stokNilai = Number(stok.value);
      var hppNilai = hpp.value === '' ? 0 : Number(hpp.value);

      if (namaNilai.length < 2) {
        tampilPesan('Nama produk minimal 2 karakter.');
        nama.focus();
        return;
      }
      if (!isFinite(hargaNilai) || hargaNilai < 0) {
        tampilPesan('Harga jual harus berupa angka 0 atau lebih.');
        harga.focus();
        return;
      }
      if (!isFinite(stokNilai) || stokNilai < 0 || Math.floor(stokNilai) !== stokNilai) {
        tampilPesan('Stok awal harus berupa bilangan bulat 0 atau lebih.');
        stok.focus();
        return;
      }
      if (!isFinite(hppNilai) || hppNilai < 0) {
        tampilPesan('HPP per unit harus berupa angka 0 atau lebih.');
        hpp.focus();
        return;
      }

      var berkas = foto.files && foto.files[0] ? foto.files[0] : null;
      if (berkas && berkas.size > 3 * 1024 * 1024) {
        tampilPesan('Ukuran foto maksimal 3 MB.');
        foto.focus();
        return;
      }

      simpan.disabled = true;
      simpan.textContent = 'Menyimpan...';

      LK.apiPost('products.php', {
        store_id: storeAktif,
        name: namaNilai,
        category_id: kategoriSelect.value || null,
        description: deskripsi.value.trim(),
        price: Math.round(hargaNilai),
        stock: stokNilai,
        hpp_unit: hppNilai,
        status: status.value,
        earns_points: poin.checked
      }).then(function (data) {
        if (!berkas) {
          return data;
        }
        return LK.apiUpload('product_image.php', {
          product_id: data.product_id,
          image: berkas
        }).then(function () {
          return data;
        }, function (err) {
          LK.notif('Produk tersimpan, tetapi foto gagal diunggah: ' + err.message, 'info', 'Foto produk');
          return data;
        });
      }).then(function (data) {
        tutup();
        LK.notif('Produk "' + data.name + '" berhasil ditambahkan.', 'sukses', 'Produk');
        muat();
      }).catch(function (err) {
        simpan.disabled = false;
        simpan.textContent = 'Simpan produk';
        tampilPesan(err.message || 'Gagal menyimpan produk.');
      });
    });

    document.body.appendChild(latar);
    nama.focus();
  }

  function muat() {
    [$ringkasan, $produk, $poin, $chat, $kesehatan, $grafik].forEach(function (b) {
      LK.status(b, 'memuat', 'Memuat data...');
    });
    $info.hidden = false;
    $info.replaceChildren(LK.el('p', { text: 'Memuat data toko...' }));

    LK.sesi().then(function (u) {
      if (!u || !u.user_id) {
        throw new Error('Masuk sebagai penjual atau admin untuk melihat dashboard.');
      }

      if (u.role === 'seller') {
        if (!u.store_id) {
          throw new Error('Akun ini belum terhubung ke toko.');
        }
        if ($pilihAdmin) { $pilihAdmin.hidden = true; }
        if ($btnTambah) { $btnTambah.hidden = false; }
        return muatData(u.store_id, u.store_name);
      }

      if (u.role !== 'admin') {
        throw new Error('Dashboard ini hanya untuk akun penjual atau admin.');
      }

      return LK.apiGet('stores.php').then(function (d) {
        var items = Array.isArray(d.items) ? d.items : [];
        if (!items.length) {
          throw new Error('Belum ada toko yang dapat dilihat.');
        }

        var pilih = tokoDipilih(items);
        if ($pilihAdmin) { $pilihAdmin.hidden = false; }
        if ($btnTambah) { $btnTambah.hidden = false; }
        if ($tautanChat) { $tautanChat.hidden = true; }
        if ($tokoAdmin) {
          $tokoAdmin.replaceChildren.apply($tokoAdmin, items.map(function (x) {
            return LK.el('option', { value: x.store_id, text: x.name || 'Toko' });
          }));
          $tokoAdmin.value = pilih.store_id;
        }

        return muatData(pilih.store_id, pilih.name);
      });
    }).catch(function (e) {
      $info.hidden = false;
      $info.replaceChildren(LK.el('p', { text: 'Data toko gagal dimuat: ' + e.message }));
      [$ringkasan, $produk, $poin, $chat, $kesehatan, $grafik].forEach(function (b) {
        LK.status(b, 'galat', 'Data gagal dimuat', e.message, LK.ulang(muat));
      });
    });
  }

  if ($btnTambah) {
    $btnTambah.addEventListener('click', bukaTambahProduk);
  }

  if ($tokoAdmin) {
    $tokoAdmin.addEventListener('change', function () {
      var url = new URL(window.location.href);
      url.searchParams.set('store_id', $tokoAdmin.value);
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      muat();
    });
  }

  muat();
})();
