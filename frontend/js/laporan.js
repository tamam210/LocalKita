(function () {
  'use strict';
  var $k = document.getElementById('isi-kartu-laporan');
  var $t = document.getElementById('isi-tabel-laporan');
  var $g = document.getElementById('isi-grafik');
  var $p = document.getElementById('isi-produk-terlaris');
  var $b = document.getElementById('isi-biaya');
  var $pilihAdmin = document.getElementById('pilih-toko-admin');
  var $tokoAdmin = document.getElementById('toko-admin');
  var semua = [$k, $t, $g, $p, $b];
  var storeId = null;

  function th(t) { return LK.el('th', { scope: 'col', text: t }); }
  function td(t) { return LK.el('td', { text: t }); }

  function periode(r) {
    return r.period && r.period.label
      ? r.period.label
      : LK.bulan(r.period_year, r.period_month);
  }

  function ringkasan(r) { return r.summary || {}; }

  // 404 / "tidak ditemukan" berarti bulan itu memang belum punya laporan.
  // Error jaringan atau server tetap dilempar supaya tidak tampil sebagai "kosong".
  function bukanLaporan(e) {
    var m = String((e && e.message) || '').toLowerCase();
    return /tidak ditemukan|belum ada|not found|http 404/.test(m);
  }

  function tanggalSaja(s) {
    var t = String(s || '').slice(0, 10);
    var d = new Date(t ? t + 'T00:00:00' : '');
    return isNaN(d) ? '-' : d.toLocaleDateString('id-ID', { dateStyle: 'medium' });
  }

  function kartu(r) {
    var s = ringkasan(r);
    $k.replaceChildren(
      LK.el('p', { 'class': 'jumlah', text: 'Periode: ' + periode(r) }),
      LK.el('div', { 'class': 'grid-kartu' }, [
        LK.angka('Omzet', LK.rupiah(s.gross_revenue)),
        LK.angka('HPP', LK.rupiah(s.hpp)),
        LK.angka('Laba bersih', LK.rupiah(s.net_profit)),
        LK.angka('Margin', LK.persen(s.net_margin))
      ])
    );
  }

  function tabel(list) {
    var tb = LK.el('tbody');
    list.slice().reverse().forEach(function (r) {
      var s = ringkasan(r);
      tb.appendChild(LK.el('tr', {}, [
        td(periode(r)),
        td(LK.rupiah(s.gross_revenue)),
        td(LK.rupiah(s.net_profit)),
        td(LK.persen(s.net_margin))
      ]));
    });
    $t.replaceChildren(LK.el('table', {}, [
      LK.el('caption', { 'class': 'sr-only', text: 'Laporan bulanan' }),
      LK.el('thead', {}, [
        LK.el('tr', {}, [th('Periode'), th('Omzet'), th('Laba bersih'), th('Margin')])
      ]),
      tb
    ]));
  }

  function produkTerlaris(r) {
    var list = Array.isArray(r.top_products) ? r.top_products : [];
    if (!list.length) {
      LK.status($p, 'kosong', 'Belum ada produk terjual', 'Produk terlaris muncul setelah ada pesanan.');
      return;
    }

    var tb = LK.el('tbody');
    list.forEach(function (x) {
      tb.appendChild(LK.el('tr', {}, [
        td(x.product_name || 'Produk'),
        td(String(Number(x.qty_sold) || 0)),
        td(LK.rupiah(x.revenue)),
        td(LK.rupiah(x.profit))
      ]));
    });

    $p.replaceChildren(LK.el('table', {}, [
      LK.el('caption', { 'class': 'sr-only', text: 'Produk terlaris' }),
      LK.el('thead', {}, [
        LK.el('tr', {}, [th('Produk'), th('Terjual'), th('Omzet'), th('Laba')])
      ]),
      tb
    ]));
  }

  function biaya(r) {
    var list = Array.isArray(r.expenses) ? r.expenses : [];
    if (!list.length) {
      LK.status($b, 'kosong', 'Belum ada biaya', 'Biaya operasional yang dicatat akan muncul di sini.');
      return;
    }

    var tb = LK.el('tbody');
    list.forEach(function (x) {
      tb.appendChild(LK.el('tr', {}, [
        td(tanggalSaja(x.expense_date)),
        td(x.category || '-'),
        td(x.description || '-'),
        td(LK.rupiah(x.amount))
      ]));
    });

    $b.replaceChildren(LK.el('table', {}, [
      LK.el('caption', { 'class': 'sr-only', text: 'Biaya operasional' }),
      LK.el('thead', {}, [
        LK.el('tr', {}, [th('Tanggal'), th('Kategori'), th('Keterangan'), th('Jumlah')])
      ]),
      tb
    ]));
  }

  function bar(ket, cls, v, max) {
    var isi = LK.el('div', { 'class': 'bar ' + cls });
    isi.style.width = Math.max(0, Math.min(100, (Number(v) || 0) / max * 100)).toFixed(1) + '%';
    return LK.el('div', { 'class': 'bar-jalur' }, [
      LK.el('span', { text: ket }),
      LK.el('div', { 'class': 'bar-trek' }, [isi]),
      LK.el('span', { text: LK.rupiah(v) })
    ]);
  }

  function grafik(list) {
    if (window.LK && typeof LK.grafikGaris === 'function') {
      LK.grafikGaris($g, list);
      if (!$g.querySelector('.legenda-grafik')) {
        $g.appendChild(LK.el('div', { 'class': 'legenda-grafik' }, [
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
      return Number(ringkasan(r).gross_revenue) || 0;
    })) || 1;

    $g.replaceChildren.apply($g, list.map(function (r) {
      var s = ringkasan(r);
      return LK.el('div', { 'class': 'bar-baris' }, [
        LK.el('strong', { text: periode(r) }),
        bar('Omzet', 'bar-omzet', s.gross_revenue, max),
        bar('Laba bersih', 'bar-laba', s.net_profit, max)
      ]);
    }));
  }

  function daftarBulan(n) {
    var hasil = [], sekarang = new Date();
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(sekarang.getFullYear(), sekarang.getMonth() - i, 1);
      hasil.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }
    return hasil;
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

  function muatData(id) {
    storeId = id;

    return Promise.all(daftarBulan(6).map(function (b) {
      return LK.apiGet(
        'laporan.php?store_id=' + encodeURIComponent(storeId) +
        '&year=' + b.year + '&month=' + b.month
      ).catch(function (e) {
        if (/Sesi berakhir/.test(e.message)) { throw e; }
        if (bukanLaporan(e)) { return null; }
        throw e;
      });
    }));
  }

  function muat() {
    semua.forEach(function (b) {
      LK.status(b, 'memuat', 'Memuat laporan...');
    });

    LK.sesi().then(function (u) {
      if (!u || !u.user_id) {
        throw new Error('Masuk sebagai penjual atau admin untuk melihat laporan.');
      }

      if (u.role === 'admin') {
        return LK.apiGet('stores.php').then(function (d) {
          var items = Array.isArray(d.items) ? d.items : [];
          if (!items.length) {
            throw new Error('Belum ada toko yang dapat dilihat.');
          }

          var pilih = tokoDipilih(items);
          if ($pilihAdmin) { $pilihAdmin.hidden = false; }
          if ($tokoAdmin) {
            $tokoAdmin.replaceChildren.apply($tokoAdmin, items.map(function (x) {
              return LK.el('option', { value: x.store_id, text: x.name || 'Toko' });
            }));
            $tokoAdmin.value = pilih.store_id;
          }

          return muatData(pilih.store_id);
        });
      }

      if (!u.store_id) {
        throw new Error('Masuk sebagai penjual untuk melihat laporan.');
      }
      if ($pilihAdmin) { $pilihAdmin.hidden = true; }

      return muatData(u.store_id);
    }).then(function (list) {
      list = list.filter(Boolean).sort(function (a, b) {
        var pa = a.period || {}, pb = b.period || {};
        return (pa.year - pb.year) || (pa.month - pb.month);
      });

      if (!list.length) {
        semua.forEach(function (b) {
          LK.status(b, 'kosong', 'Belum ada laporan', 'Laporan bulanan muncul setelah ada pesanan.');
        });
        return;
      }

      var terbaru = list[list.length - 1];
      kartu(terbaru);
      tabel(list);
      grafik(list);
      produkTerlaris(terbaru);
      biaya(terbaru);
    }).catch(function (e) {
      semua.forEach(function (b, i) {
        LK.status(b, 'galat', 'Laporan gagal dimuat', e.message, i === 0 ? LK.ulang(muat) : null);
      });
    });
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
