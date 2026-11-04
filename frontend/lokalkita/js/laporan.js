/* laporan.html (B5). Membaca monthly_reports: period_year, period_month, gross_revenue, net_profit, net_margin, detail_json. */
(function () {
  'use strict';
  var $k = document.getElementById('isi-kartu-laporan'), $t = document.getElementById('isi-tabel-laporan'), $g = document.getElementById('isi-grafik');
  var semua = [$k, $t, $g];
  function detail(r) {
    var d = r.detail_json;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = null; } }
    return d && typeof d === 'object' ? d : {};
  }
  function th(t) { return LK.el('th', { scope: 'col', text: t }); }
  function td(t) { return LK.el('td', { text: t }); }
  function periode(r) { return LK.bulan(r.period_year, r.period_month); }

  function kartu(r) {
    var hpp = detail(r).hpp; // HPP bukan kolom monthly_reports; dibaca dari detail_json.hpp bila ada
    $k.replaceChildren(LK.el('p', { 'class': 'jumlah', text: 'Periode: ' + periode(r) }), LK.el('div', { 'class': 'grid-kartu' }, [
      LK.angka('Omzet', LK.rupiah(r.gross_revenue)), LK.angka('HPP', hpp === null || hpp === undefined ? '-' : LK.rupiah(hpp)),
      LK.angka('Laba bersih', LK.rupiah(r.net_profit)), LK.angka('Margin', LK.persen(r.net_margin))]));
  }
  function tabel(list) {
    var tb = LK.el('tbody');
    list.slice().reverse().forEach(function (r) {
      tb.appendChild(LK.el('tr', {}, [td(periode(r)), td(LK.rupiah(r.gross_revenue)), td(LK.rupiah(r.net_profit)), td(LK.persen(r.net_margin))]));
    });
    $t.replaceChildren(LK.el('table', {}, [LK.el('caption', { 'class': 'sr-only', text: 'Laporan bulanan' }),
      LK.el('thead', {}, [LK.el('tr', {}, [th('Periode'), th('Omzet'), th('Laba bersih'), th('Margin')])]), tb]));
  }
  function bar(ket, cls, v, max) {
    var isi = LK.el('div', { 'class': 'bar ' + cls });
    isi.style.width = Math.max(0, Math.min(100, (Number(v) || 0) / max * 100)).toFixed(1) + '%';
    return LK.el('div', { 'class': 'bar-jalur' }, [LK.el('span', { text: ket }), LK.el('div', { 'class': 'bar-trek' }, [isi]), LK.el('span', { text: LK.rupiah(v) })]);
  }
  function grafik(list) {
    var max = Math.max.apply(null, list.map(function (r) { return Number(r.gross_revenue) || 0; })) || 1;
    $g.replaceChildren.apply($g, list.map(function (r) {
      return LK.el('div', { 'class': 'bar-baris' }, [LK.el('strong', { text: periode(r) }), bar('Omzet', 'bar-omzet', r.gross_revenue, max), bar('Laba bersih', 'bar-laba', r.net_profit, max)]);
    }));
  }
  function muat() {
    semua.forEach(function (b) { LK.status(b, 'memuat', 'Memuat laporan...'); });
    LK.apiGet('laporan.php').then(function (d) {
      if (!Array.isArray(d)) { throw new Error('Format data laporan tidak sesuai.'); }
      if (!d.length) { semua.forEach(function (b) { LK.status(b, 'kosong', 'Belum ada laporan', 'Laporan bulanan muncul setelah ada pesanan.'); }); return; }
      d = d.slice().sort(function (a, b) { return (a.period_year - b.period_year) || (a.period_month - b.period_month); });
      kartu(d[d.length - 1]); tabel(d); grafik(d.slice(-6));
    }).catch(function (e) {
      semua.forEach(function (b, i) { LK.status(b, 'galat', 'Laporan gagal dimuat', e.message, i === 0 ? LK.ulang(muat) : null); });
    });
  }
  muat();
})();
