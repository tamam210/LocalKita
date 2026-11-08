/* LokalKita - katalog (B1). Data dari api/products.php dengan urutan acak. */
(function () {
  'use strict';
  var perHalaman = (function () {
    var n = parseInt(new URLSearchParams(window.location.search).get('per_page'), 10);
    return isFinite(n) ? Math.min(50, Math.max(1, n)) : 35;
  })();
  var seedAcak = (function () {
    var n = parseInt(new URLSearchParams(window.location.search).get('seed'), 10);
    return isFinite(n) && n > 0 ? n : Math.floor(Math.random() * 2147483646) + 1;
  })();
  var semua = [], kategori = [], kategoriAktif = '', q = '';
  var halaman = 1, total = 0, totalHalaman = 0, permintaan = 0, timerCari = null;
   var seed = (function () {
    try {
      var a = new Uint32Array(2);
      crypto.getRandomValues(a);
      return a[0].toString(36) + a[1].toString(36);
    } catch (e) {
      return Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
  })();
  var $grid = document.getElementById('grid-produk');
  var $cari = document.getElementById('cari');
  var $chip = document.getElementById('daftar-kategori');
  var $jumlah = document.getElementById('jumlah-hasil');
  var $paginasi = document.getElementById('paginasi-katalog');

  function kategoriDari(p) { return p.category_name || 'Lainnya'; }

  function tampilMemuat() {
    $grid.setAttribute('aria-busy', 'true');
    $grid.replaceChildren();
    for (var i = 0; i < 6; i++) { $grid.appendChild(LK.el('div', { 'class': 'skeleton', 'aria-hidden': 'true' })); }
  }

  function buatChip() {
    var ada = kategori.filter(function (k) { return k.category_id === kategoriAktif; });
    if (kategoriAktif && !ada.length) { kategoriAktif = ''; }

    $chip.replaceChildren();
    [{ category_id: '', name: 'Semua' }].concat(kategori).forEach(function (k) {
      var b = LK.el('button', {
        type: 'button',
        'class': 'chip',
        'aria-pressed': String(k.category_id === kategoriAktif),
        text: k.name || 'Lainnya'
      });
      b.addEventListener('click', function () {
        if (timerCari) { clearTimeout(timerCari); timerCari = null; }
        kategoriAktif = k.category_id;
        q = $cari.value.trim();
        Array.prototype.forEach.call($chip.children, function (c) {
          c.setAttribute('aria-pressed', String(c === b));
        });
        halaman = 1;
        muat();
      });
      $chip.appendChild(b);
    });
  }

  function kartu(p) {
    var gambar = LK.el('div', { 'class': 'kartu-gambar' });
    var awal = LK.el('span', { 'aria-hidden': 'true', text: String(p.name || '?').charAt(0).toUpperCase() });
    var url = p.image_url;
    if (typeof url === 'string' && /^(https?:\/\/|\/|[\w\-.\/]+$)/.test(url)) {
      var img = LK.el('img', { src: url, alt: String(p.image_alt || p.alt_text || ''), loading: 'lazy' });
      img.addEventListener('error', function () { img.remove(); gambar.appendChild(awal); });
      gambar.appendChild(img);
    } else { gambar.appendChild(awal); }
    // Tombol keranjang kecil di gambar
    if (p.product_id) {
      var keranjangBtn = LK.el('button', { type: 'button', 'class': 'tombol-keranjang-kecil', 'aria-label': 'Masukkan ke keranjang', text: '🛒' });
      keranjangBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        try {
          var KEY = 'lokalkita_keranjang';
          var items = JSON.parse(localStorage.getItem(KEY) || '[]');
          // Cek sudah ada
          var ada = false;
          for (var i = 0; i < items.length; i++) {
            if (String(items[i].product_id) === String(p.product_id)) { items[i].qty = (items[i].qty || 1) + 1; ada = true; break; }
          }
          if (!ada) {
            items.push({
              product_id: p.product_id,
              name: p.name,
              price: p.price,
              image: p.image_url,
              store_id: p.store_id,
              store_name: p.store_name,
              qty: 1
            });
          }
          localStorage.setItem(KEY, JSON.stringify(items));
        } catch(ex) {}
        LK.notif('Produk dimasukkan ke keranjang', 'sukses', 'Keranjang');
      });
      gambar.appendChild(keranjangBtn);
    }
        // Tombol favorit
    if (p.product_id) {
      var sudah = LK.favorit.isFavorit(p.product_id);
      var favBtn = LK.el('button', {
        type: 'button',
        'class': 'tombol-favorit ' + (sudah ? 'terpilih' : ''),
        'aria-label': sudah ? 'Hapus dari favorit' : 'Masukkan ke favorit',
        text: sudah ? '\u2665' : '\u2661'
      });

      favBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        favBtn.disabled = true;

        LK.favorit.toggle(p.product_id).then(function (now) {
          favBtn.className = 'tombol-favorit ' + (now ? 'terpilih' : '');
          favBtn.setAttribute('aria-label', now ? 'Hapus dari favorit' : 'Masukkan ke favorit');
          favBtn.textContent = now ? '\u2665' : '\u2661';
          LK.notif(
            now ? 'Produk masuk ke favorit' : 'Produk dihapus dari favorit',
            'sukses',
            'Favorit'
          );
        }).catch(function (err) {
          LK.notif(err.message || 'Gagal mengubah favorit.', 'bahaya', 'Favorit');
        }).then(function () {
          favBtn.disabled = false;
        });
      });

      gambar.appendChild(favBtn);
    }
    var pesanBtn = null;
    if (p.store_id) {
      pesanBtn = LK.el('button', { type: 'button', 'class': 'tombol-lunak', text: 'Beli Langsung' });
      pesanBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        pesanBtn.disabled = true;

        LK.apiPost('orders.php?action=create', {
          items: [{
            product_id: p.product_id,
            quantity: 1
          }]
        }).then(function () {
          try {
            var pesananKey = 'lokalkita_pesanan';
            var pesanan = JSON.parse(localStorage.getItem(pesananKey) || '[]');

            pesanan.unshift({
              id: 'PSN-' + Date.now().toString().slice(-6),
              product_id: p.product_id,
              name: p.name,
              image: p.image_url,
              price: p.price,
              qty: 1,
              store_id: p.store_id,
              store_name: p.store_name,
              status: 'antrian',
              rekening: '1234-5678-9012',
              rekeningAtasan: 'a/n ' + (p.store_name || 'Toko LokalKita'),
              tanggal: new Date().toISOString()
            });

            localStorage.setItem(pesananKey, JSON.stringify(pesanan));
          } catch (ex) {}

          LK.notif('Pesanan berhasil dibuat', 'sukses', 'Pesanan');
          window.location.href = 'pesanan.html';
        }).catch(function (err) {
          LK.notif(err.message || 'Gagal membuat pesanan.', 'bahaya', 'Pesanan');
          pesanBtn.disabled = false;
        });
      });
    }
    var kartuAttr = { 'class': 'kartu-produk' };
    if (p.product_id) { kartuAttr['data-product-id'] = p.product_id; }
    var judulProduk = LK.el('h3', { 'class': 'kartu-nama', text: p.name || 'Produk tanpa nama' });
    var stok = p.stock === null || p.stock === undefined ? NaN : Number(p.stock);
    var lencana = isFinite(stok)
      ? LK.el('span', { 'class': 'lencana' + (stok <= 0 ? ' lencana-habis' : ''), text: stok <= 0 ? 'Stok habis' : 'Stok ' + stok })
      : null;
    var poin = (p.earns_points === true || Number(p.earns_points) === 1) ? LK.el('span', { 'class': 'lencana', text: 'Dapat poin' }) : null;
    return LK.el('article', kartuAttr, [gambar, LK.el('div', { 'class': 'kartu-isi' }, [
      judulProduk,
      LK.el('span', { 'class': 'kartu-toko', text: p.store_name || kategoriDari(p) }),
      LK.el('span', { 'class': 'kartu-harga', text: LK.rupiah(p.price) }),
      LK.el('div', { 'class': 'lencana-baris' }, [lencana, poin]),
      pesanBtn
    ])]);
  }

  function render() {
    $grid.setAttribute('aria-busy', 'false');
    $grid.replaceChildren();

    var mulai = total ? (halaman - 1) * perHalaman + 1 : 0;
    var akhir = total ? Math.min(halaman * perHalaman, total) : 0;
    $jumlah.textContent = total
      ? 'Menampilkan ' + mulai + '-' + akhir + ' dari ' + total + ' produk'
      : '0 produk';

    if (!semua.length) {
      var adaFilter = q !== '' || kategoriAktif !== '';
      $grid.appendChild(LK.el('div', { 'class': 'status' }, [
        LK.el('h3', { text: adaFilter ? 'Produk tidak ditemukan' : 'Belum ada produk' }),
        LK.el('p', { text: adaFilter ? 'Coba kata kunci lain atau pilih kategori Semua.' : 'Penjual belum menambahkan produk. Cek lagi nanti.' })
      ]));
      return;
    }

    semua.forEach(function (p) { $grid.appendChild(kartu(p)); });
  }

  function tombolHalaman(label, target, aktif, nonaktif) {
    var b = LK.el('button', {
      type: 'button',
      'class': 'tombol' + (aktif ? '' : ' tombol-garis'),
      text: label
    });
    if (aktif) { b.setAttribute('aria-current', 'page'); }
    b.disabled = !!nonaktif;
    b.addEventListener('click', function () {
      if (target === halaman) { return; }
      halaman = target;
      muat();
    });
    return b;
  }

  function renderPaginasi() {
    if (!$paginasi) { return; }
    if (totalHalaman <= 1) {
      $paginasi.replaceChildren();
      $paginasi.hidden = true;
      return;
    }

    $paginasi.hidden = false;
    var isi = [tombolHalaman('Sebelumnya', halaman - 1, false, halaman <= 1)];
    var awal = Math.max(1, halaman - 2);
    var akhir = Math.min(totalHalaman, halaman + 2);

    if (awal > 1) {
      isi.push(tombolHalaman('1', 1, halaman === 1, false));
      if (awal > 2) { isi.push(LK.el('span', { 'class': 'paginasi-titik', 'aria-hidden': 'true', text: '…' })); }
    }
    for (var i = awal; i <= akhir; i++) {
      isi.push(tombolHalaman(String(i), i, i === halaman, false));
    }
    if (akhir < totalHalaman) {
      if (akhir < totalHalaman - 1) { isi.push(LK.el('span', { 'class': 'paginasi-titik', 'aria-hidden': 'true', text: '…' })); }
      isi.push(tombolHalaman(String(totalHalaman), totalHalaman, halaman === totalHalaman, false));
    }

    isi.push(tombolHalaman('Berikutnya', halaman + 1, false, halaman >= totalHalaman));
    $paginasi.replaceChildren.apply($paginasi, isi);
  }

  function normalisasi(p) {
    var img = p.primary_image_url || p.image_url || (p.images && p.images[0] && (p.images[0].url || p.images[0].image_url)) || '';
    return {
      product_id: p.product_id,
      name: p.name || p.product_name || 'Produk tanpa nama',
      category_id: p.category_id || '',
      category_name: p.category_name || p.category || 'Lainnya',
      price: p.min_price !== undefined && p.min_price !== null ? p.min_price : p.price,
      stock: p.total_stock !== undefined && p.total_stock !== null ? p.total_stock : p.stock,
      store_id: p.store_id || '',
      store_name: p.store_name || '',
      image_url: img,
      image_alt: p.image_alt || p.alt_text || p.name || p.product_name || '',
      earns_points: p.earns_points
    };
  }

  function urlProduk() {
    var params = [
      'status=active',
      'etalase=1',
      'sort=random',
      'seed=' + encodeURIComponent(seedAcak),
      'page=' + encodeURIComponent(halaman),
      'per_page=' + encodeURIComponent(perHalaman)
    ];
    if (q) { params.push('q=' + encodeURIComponent(q)); }
    if (kategoriAktif) { params.push('category_id=' + encodeURIComponent(kategoriAktif)); }
    return 'products.php?' + params.join('&');
  }

  function muat() {
    var seq = ++permintaan;
    $jumlah.textContent = '';
    if ($paginasi) { $paginasi.hidden = true; }
    tampilMemuat();

    LK.apiGet(urlProduk()).then(function (data) {
      if (seq !== permintaan) { return; }
      var items = Array.isArray(data)
        ? data
        : (data && Array.isArray(data.items) ? data.items : null);

      if (!items) { throw new Error('Format data produk tidak sesuai.'); }
      semua = items.map(normalisasi);

      var pag = (data && data.pagination) || {};
      halaman = Number(pag.page) || halaman;
      total = Number(pag.total);
      if (!isFinite(total)) { total = semua.length; }
      totalHalaman = Number(pag.total_pages);
      if (!isFinite(totalHalaman) || totalHalaman < 1) {
        totalHalaman = total > 0 ? Math.ceil(total / perHalaman) : 0;
      }

      if (!kategori.length && semua.length) {
        kategori = kategoriDariItem();
        buatChip();
      }
      render();
      renderPaginasi();
    }).catch(function (err) {
      if (seq !== permintaan) { return; }
      semua = [];
      total = 0;
      totalHalaman = 0;
      $grid.setAttribute('aria-busy', 'false');
      $grid.replaceChildren();
      $jumlah.textContent = '';
      if ($paginasi) { $paginasi.hidden = true; }
      LK.status($grid, 'galat', 'Katalog gagal dimuat', err.message, LK.ulang(muat));
    });
  }

  function muatKategori() {
    return LK.apiGet('categories.php').then(function (data) {
      var items = data && Array.isArray(data.items) ? data.items : [];
      kategori = items.filter(function (k) {
        return k && k.category_id && k.name;
      }).map(function (k) {
        return { category_id: k.category_id, name: k.name };
      });
      buatChip();
    }).catch(function () {
      kategori = [];
      buatChip();
    });
  }

  $cari.addEventListener('input', function () {
    if (timerCari) { clearTimeout(timerCari); }
    timerCari = setTimeout(function () {
      q = $cari.value.trim();
      halaman = 1;
      muat();
    }, 350);
  });

  Promise.all([muatKategori(), LK.favorit.load()]).then(muat);
})();
