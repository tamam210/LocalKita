(function () {
  'use strict';
  var $k = document.getElementById('isi-kartu-laporan');
  var $t = document.getElementById('isi-tabel-laporan');
  var $g = document.getElementById('isi-grafik');
  var semua = [$k, $t, $g];
  var storeId = null;

  function th(t) { return LK.el('th', { scope: 'col', text: t }); }
  function td(t) { return LK.el('td', { text: t }); }

  function periode(r) {
    return r.period && r.period.label
      ? r.period.label
      : LK.bulan(r.period_year, r.period_month);
  }

  function ringkasan(r) { return r.summary || {}; }

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

  function muat() {
    semua.forEach(function (b) {
      LK.status(b, 'memuat', 'Memuat laporan...');
    });

    LK.sesi().then(function (u) {
      if (!u || !u.store_id) {
        throw new Error('Masuk sebagai penjual untuk melihat laporan.');
      }
      storeId = u.store_id;

      return Promise.all(daftarBulan(6).map(function (b) {
        return LK.apiGet(
          'laporan.php?store_id=' + encodeURIComponent(storeId) +
          '&year=' + b.year + '&month=' + b.month
        ).catch(function (e) {
          if (/Sesi berakhir/.test(e.message)) { throw e; }
          return null; // bulan belum punya laporan
        });
      }));
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

      kartu(list[list.length - 1]);
      tabel(list);
      grafik(list);
    }).catch(function (e) {
      semua.forEach(function (b, i) {
        LK.status(b, 'galat', 'Laporan gagal dimuat', e.message, i === 0 ? LK.ulang(muat) : null);
      });
    });
  }

  muat();
})();