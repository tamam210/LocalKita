(function () {
  'use strict';
  var $f = document.getElementById('form-hpp'), $h = document.getElementById('isi-hasil-hpp');
  var $d = document.getElementById('form-diskon'), $w = document.getElementById('peringatan-diskon');
  var $pilihAdmin = document.getElementById('pilih-toko-admin');
  var $tokoAdmin = document.getElementById('toko-admin');
  var hppTerakhir = null, storeId = null;

  function baca(form, nama, min) {
    var n = form.elements[nama].valueAsNumber;
    return isFinite(n) && n >= min ? n : NaN;
  }

  function galat(id, teks) {
    var p = document.getElementById(id);
    p.textContent = teks || '';
    p.hidden = !teks;
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

  function muatTokoAdmin() {
    return LK.apiGet('stores.php').then(function (d) {
      var items = Array.isArray(d.items) ? d.items : [];
      if (!items.length) {
        throw new Error('Belum ada toko yang dapat digunakan.');
      }

      var pilih = tokoDipilih(items);
      storeId = pilih.store_id;
      if ($pilihAdmin) { $pilihAdmin.hidden = false; }
      if ($tokoAdmin) {
        $tokoAdmin.replaceChildren.apply($tokoAdmin, items.map(function (x) {
          return LK.el('option', { value: x.store_id, text: x.name || 'Toko' });
        }));
        $tokoAdmin.value = pilih.store_id;
      }
      return storeId;
    });
  }

  function siapkanToko() {
    if (storeId) { return Promise.resolve(storeId); }
    return LK.sesi().then(function (u) {
      if (!u || !u.user_id) {
        throw new Error('Masuk sebagai penjual atau admin untuk menghitung HPP.');
      }

      if (u.role === 'admin') {
        return muatTokoAdmin();
      }

      if (!u.store_id) {
        throw new Error('Akun ini belum terhubung ke toko. Masuk sebagai penjual.');
      }
      if ($pilihAdmin) { $pilihAdmin.hidden = true; }
      storeId = u.store_id;
      return storeId;
    });
  }

  $f.addEventListener('submit', function (e) {
    e.preventDefault();

    var p = {
      units_produced: baca($f, 'unit', 1),
      material_cost: baca($f, 'bahan', 0),
      labor_cost: baca($f, 'tenaga', 0),
      packaging_cost: baca($f, 'kemasan', 0),
      overhead_cost: baca($f, 'overhead', 0),
      target_margin_percent: baca($f, 'target_margin', 0)
    };

    var salah = Object.keys(p).filter(function (k) { return isNaN(p[k]); });
    if (salah.length) {
      galat('pesan-hpp', 'Isi semua kolom dengan angka. Biaya tidak boleh negatif, unit minimal 1, target margin 0-99.');
      return;
    }

    galat('pesan-hpp');
    var tb = document.getElementById('tombol-hpp');
    tb.disabled = true;
    LK.status($h, 'memuat', 'Menghitung...');

    siapkanToko().then(function (id) {
      p.store_id = id;
      return LK.apiPost('hpp.php', p);
    }).then(function (d) {
      d = d || {};
      hppTerakhir = Number(d.hpp_per_unit);
      if (!isFinite(hppTerakhir)) {
        throw new Error('Respons HPP tidak berisi hpp_per_unit.');
      }
      $h.replaceChildren(LK.el('div', { 'class': 'grid-kartu' }, [
        LK.angka('HPP per unit', LK.rupiah(d.hpp_per_unit)),
        LK.angka('Margin', LK.persen(d.margin_percent)),
        LK.angka('Harga saran', LK.rupiah(d.suggested_price)),
        LK.angka('Total biaya', LK.rupiah(d.total_cost))
      ]));
    }).catch(function (err) {
      LK.status($h, 'galat', 'Perhitungan gagal', err.message);
    }).then(function () {
      tb.disabled = false;
    });
  });

  $d.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!isFinite(hppTerakhir)) {
      galat('pesan-diskon', 'Hitung HPP dulu agar diskon bisa dicek terhadap HPP.');
      return;
    }

    var harga = baca($d, 'harga_jual', 0);
    var nilai = baca($d, 'discount_value', 0);
    var qty = baca($d, 'quantity', 1);
    var target = baca($f, 'target_margin', 0);

    if (isNaN(harga) || isNaN(nilai) || isNaN(qty)) {
      galat('pesan-diskon', 'Isi harga jual, nilai diskon, dan jumlah dengan angka yang valid.');
      return;
    }
    if (isNaN(target)) { target = 0; }

    var jenis = $d.elements.discount_type.value;
    var persen = jenis === 'fixed' ? (harga > 0 ? nilai / harga * 100 : NaN) : nilai;

    if (!isFinite(persen) || persen < 0 || persen > 100) {
      galat('pesan-diskon', 'Diskon harus antara 0 dan 100%.');
      return;
    }

    galat('pesan-diskon');
    var tb = document.getElementById('tombol-diskon');
    tb.disabled = true;
    LK.status($w, 'memuat', 'Memeriksa diskon...');

    siapkanToko().then(function (id) {
      return LK.apiPost('diskon.php', {
        store_id: id,
        normal_price: harga,
        discount_percent: persen,
        quantity: qty,
        additional_cost: 0,
        hpp_per_unit: hppTerakhir,
        target_margin_percent: target
      });
    }).then(function (d) {
      d = d || {};
      var status = d.status;
      var kelas = status === 'loss'
        ? 'peringatan bahaya'
        : (status === 'below_target' ? 'peringatan' : 'peringatan aman');

      var isi = [LK.el('div', { 'class': 'grid-kartu' }, [
        LK.angka('Harga setelah diskon', LK.rupiah(d.final_price_per_unit)),
        LK.angka('Laba per unit', LK.rupiah(d.profit_per_unit)),
        LK.angka('Margin', LK.persen(d.margin_percent)),
        LK.angka('Total laba', LK.rupiah(d.total_profit))
      ])];

      var pesan = d.warning || d.message;
      if (pesan) {
        isi.push(LK.el('p', { 'class': kelas, role: 'alert', text: String(pesan) }));
      }
      $w.replaceChildren.apply($w, isi);
    }).catch(function (err) {
      $w.replaceChildren(LK.el('p', {
        'class': 'pesan-galat',
        role: 'alert',
        text: 'Cek diskon gagal: ' + err.message
      }));
    }).then(function () {
      tb.disabled = false;
    });
  });

  if ($tokoAdmin) {
    $tokoAdmin.addEventListener('change', function () {
      var url = new URL(window.location.href);
      url.searchParams.set('store_id', $tokoAdmin.value);
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);

      storeId = null;
      hppTerakhir = null;
      galat('pesan-hpp');
      galat('pesan-diskon');
      $h.replaceChildren(LK.el('p', { text: 'Isi form lalu tekan Hitung HPP.' }));
      $w.replaceChildren();
      muatTokoAdmin().catch(function (e) {
        galat('pesan-hpp', e.message);
      });
    });
  }

  LK.sesi().then(function (u) {
    if (u && u.role === 'admin') {
      return muatTokoAdmin();
    }
    if ($pilihAdmin) { $pilihAdmin.hidden = true; }
  }).catch(function (e) {
    if ($pilihAdmin && !$pilihAdmin.hidden) {
      galat('pesan-hpp', e.message);
    }
  });
})();