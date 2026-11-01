/* hpp.html (B4). Perhitungan dilakukan API; frontend hanya mengirim input dan menampilkan hasil. */
(function () {
  'use strict';
  var $f = document.getElementById('form-hpp'), $h = document.getElementById('isi-hasil-hpp');
  var $d = document.getElementById('form-diskon'), $w = document.getElementById('peringatan-diskon');
  var hppTerakhir = null;

  function baca(form, nama, min) {
    var n = form.elements[nama].valueAsNumber;
    return isFinite(n) && n >= min ? n : NaN;
  }
  function galat(id, teks) { var p = document.getElementById(id); p.textContent = teks || ''; p.hidden = !teks; }

  $f.addEventListener('submit', function (e) {
    e.preventDefault();
    var p = { bahan: baca($f, 'bahan', 0), tenaga: baca($f, 'tenaga', 0), kemasan: baca($f, 'kemasan', 0), overhead: baca($f, 'overhead', 0), unit: baca($f, 'unit', 1) };
    var salah = Object.keys(p).filter(function (k) { return isNaN(p[k]); });
    if (salah.length) { galat('pesan-hpp', 'Isi semua kolom dengan angka. Biaya tidak boleh negatif dan jumlah unit minimal 1.'); return; }
    galat('pesan-hpp'); // kirim tanpa store_id: toko ditentukan sesi di server
    var tb = document.getElementById('tombol-hpp'); tb.disabled = true;
    LK.status($h, 'memuat', 'Menghitung...');
    LK.apiPost('hpp.php', p).then(function (d) {
      d = d || {}; hppTerakhir = Number(d.hpp);
      $h.replaceChildren(LK.el('div', { 'class': 'grid-kartu' }, [
        LK.angka('HPP', LK.rupiah(d.hpp)), LK.angka('Margin', LK.persen(d.margin)), LK.angka('Harga saran', LK.rupiah(d.harga_saran))]));
    }).catch(function (err) {
      LK.status($h, 'galat', 'Perhitungan gagal', err.message);
    }).then(function () { tb.disabled = false; });
  });

  $d.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!isFinite(hppTerakhir)) { galat('pesan-diskon', 'Hitung HPP dulu agar diskon bisa dicek terhadap HPP.'); return; }
    var p = { hpp: hppTerakhir, harga_jual: baca($d, 'harga_jual', 0), discount_type: $d.elements.discount_type.value, discount_value: baca($d, 'discount_value', 0) };
    if (isNaN(p.harga_jual) || isNaN(p.discount_value)) { galat('pesan-diskon', 'Isi harga jual dan nilai diskon dengan angka yang tidak negatif.'); return; }
    galat('pesan-diskon');
    var tb = document.getElementById('tombol-diskon'); tb.disabled = true;
    LK.status($w, 'memuat', 'Memeriksa diskon...');
    LK.apiPost('diskon.php', p).then(function (d) {
      d = d || {};
      var isi = [LK.el('div', { 'class': 'grid-kartu' }, [LK.angka('Harga setelah diskon', LK.rupiah(d.harga_setelah_diskon)), LK.angka('Margin', LK.persen(d.margin))])];
      if (d.warning) { isi.push(LK.el('p', { 'class': 'peringatan', role: 'alert', text: String(d.warning) })); }
      $w.replaceChildren.apply($w, isi);
    }).catch(function (err) {
      $w.replaceChildren(LK.el('p', { 'class': 'pesan-galat', role: 'alert', text: 'Cek diskon gagal: ' + err.message }));
    }).then(function () { tb.disabled = false; });
  });
})();
