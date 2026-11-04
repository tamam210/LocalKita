/* LokalKita - katalog (B1). Data dari api/products.php; fallback dummy bila API belum siap. */
(function () {
  'use strict';
  // Asumsi bentuk data: {product_id, name, category_name, price, stock, store_name, image_url, image_alt}
  // Nama toko disamakan dengan seed backend supaya tautan chat tidak
  // menampilkan toko yang berbeda dari store_id-nya.
  var DUMMY = [
    { product_id: 1, name: 'Keripik Singkong', category_name: 'Makanan', price: 15000, stock: 40, store_name: 'Dapur Bu Tamam', store_id: '20000000-0000-4000-8000-000000000001', image_url: 'img/produk/keripik-singkong.jpg', image_alt: 'Tumpukan keripik singkong' },
    { product_id: 2, name: 'Tas Anyaman', category_name: 'Barang', price: 120000, stock: 8, store_name: 'Kriya Rasya', store_id: '20000000-0000-4000-8000-000000000002', image_url: 'img/produk/tas-anyaman.jpg', image_alt: 'Tas anyaman pandan' },
    { product_id: 3, name: 'Kopi Lokal', category_name: 'Minuman', price: 45000, stock: 25, store_name: 'Dapur Bu Tamam', store_id: '20000000-0000-4000-8000-000000000001', image_url: 'img/produk/kopi-lokal.jpg', image_alt: 'Kemasan kopi lokal' },
    { product_id: 4, name: 'Kain Batik Tulis', category_name: 'Barang', price: 185000, stock: 5, store_name: 'Kriya Rasya', store_id: '20000000-0000-4000-8000-000000000002', image_url: 'img/produk/kain-batik-tulis.jpg', image_alt: 'Kain batik tulis' },
    { product_id: 5, name: 'Laundry Kiloan', category_name: 'Jasa', price: 7000, store_name: 'Dapur Bu Tamam', store_id: '20000000-0000-4000-8000-000000000001', image_url: 'img/produk/laundry-kiloan.jpg', image_alt: 'Keranjang laundry bersih' },
    { product_id: 6, name: 'Sambal Roa', category_name: 'Makanan', price: 35000, stock: 0, store_name: 'Dapur Bu Tamam', store_id: '20000000-0000-4000-8000-000000000001', image_url: 'img/produk/sambal-roa.jpg', image_alt: 'Toples sambal roa' }
  ];
  var semua = [], kategoriAktif = 'Semua';
  var $grid = document.getElementById('grid-produk');
  var $cari = document.getElementById('cari');
  var $chip = document.getElementById('daftar-kategori');
  var $info = document.getElementById('info-data');
  var $jumlah = document.getElementById('jumlah-hasil');

  function kategoriDari(p) { return p.category_name || 'Lainnya'; }

  function tampilMemuat() {
    $grid.setAttribute('aria-busy', 'true');
    $grid.replaceChildren();
    for (var i = 0; i < 6; i++) { $grid.appendChild(LK.el('div', { 'class': 'skeleton', 'aria-hidden': 'true' })); }
  }

  function buatChip() {
    var nama = ['Semua'];
    semua.forEach(function (p) { var k = kategoriDari(p); if (nama.indexOf(k) === -1) { nama.push(k); } });
    if (nama.indexOf(kategoriAktif) === -1) { kategoriAktif = 'Semua'; }
    $chip.replaceChildren();
    nama.forEach(function (k) {
      var b = LK.el('button', { type: 'button', 'class': 'chip', 'aria-pressed': String(k === kategoriAktif), text: k });
      b.addEventListener('click', function () {
        kategoriAktif = k;
        Array.prototype.forEach.call($chip.children, function (c) { c.setAttribute('aria-pressed', String(c === b)); });
        render();
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
    var pesanBtn = null;
    if (p.store_id) {
      pesanBtn = LK.el('button', { type: 'button', 'class': 'tautan-chat', text: 'Pesan Barang' });
      pesanBtn.addEventListener('click', function (e) {
        e.stopPropagation();
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
            status: 'menunggu',
            tanggal: new Date().toISOString()
          });
          localStorage.setItem(pesananKey, JSON.stringify(pesanan));
        } catch(ex) {}
        LK.notif('Pesanan berhasil dibuat', 'sukses', 'Pesanan');
        window.location.href = 'pesanan.html';
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
    var chat = p.store_id
      ? LK.el('a', {
        'class': 'tautan-chat',
        href: 'pesanan.html?pesan=' + encodeURIComponent(p.product_id || '') + '&store_id=' + encodeURIComponent(p.store_id),
        text: 'Pesan Barang'
      })
      : null;
    return LK.el('article', kartuAttr, [gambar, LK.el('div', { 'class': 'kartu-isi' }, [
      judulProduk,
      LK.el('span', { 'class': 'kartu-toko', text: p.store_name || kategoriDari(p) }),
      LK.el('span', { 'class': 'kartu-harga', text: LK.rupiah(p.price) }),
      LK.el('div', { 'class': 'lencana-baris' }, [lencana, poin]),
      pesanBtn
    ])]);
  }

  function render() {
    var q = $cari.value.trim().toLowerCase();
    var hasil = semua.filter(function (p) {
      var k = kategoriDari(p);
      return (kategoriAktif === 'Semua' || k === kategoriAktif) &&
        (!q || String(p.name || '').toLowerCase().indexOf(q) !== -1 || k.toLowerCase().indexOf(q) !== -1);
    });
    $grid.setAttribute('aria-busy', 'false');
    $grid.replaceChildren();
    $jumlah.textContent = hasil.length + ' produk ditampilkan';
    if (!hasil.length) {
      var ada = semua.length > 0;
      $grid.appendChild(LK.el('div', { 'class': 'status' }, [
        LK.el('h3', { text: ada ? 'Produk tidak ditemukan' : 'Belum ada produk' }),
        LK.el('p', { text: ada ? 'Coba kata kunci lain atau pilih kategori Semua.' : 'Penjual belum menambahkan produk. Cek lagi nanti.' })
      ]));
      return;
    }
    hasil.forEach(function (p) { $grid.appendChild(kartu(p)); });
  }

  // Peta gambar lokal untuk produk yang belum punya foto dari API
  // (backend mengirim primary_image_url null sampai upload file aktif).
  var GAMBAR_LOKAL = [
    { cocok: ['keripik', 'singkong'], file: 'img/produk/keripik-singkong.jpg' },
    { cocok: ['tas anyaman', 'anyaman', 'tas pandan'], file: 'img/produk/tas-anyaman.jpg' },
    { cocok: ['kopi'], file: 'img/produk/kopi-lokal.jpg' },
    { cocok: ['batik'], file: 'img/produk/kain-batik-tulis.jpg' },
    { cocok: ['laundry'], file: 'img/produk/laundry-kiloan.jpg' },
    { cocok: ['sambal'], file: 'img/produk/sambal-roa.jpg' }
  ];

  function gambarLokal(nama) {
    var k = String(nama || '').toLowerCase();
    for (var i = 0; i < GAMBAR_LOKAL.length; i++) {
      var kata = GAMBAR_LOKAL[i].cocok;
      for (var j = 0; j < kata.length; j++) {
        if (k.indexOf(kata[j]) !== -1) { return GAMBAR_LOKAL[i].file; }
      }
    }
    return '';
  }

  function normalisasi(p) {
    var img = p.primary_image_url || p.image_url || (p.images && p.images[0] && (p.images[0].url || p.images[0].image_url)) || '';
    if (!img) { img = gambarLokal(p.name || p.product_name); }
    return {
      product_id: p.product_id,
      name: p.name || p.product_name || 'Produk tanpa nama',
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

  function muat() {
    $info.hidden = true;
    tampilMemuat();

    LK.apiGet('products.php?per_page=50').then(function (data) {
      var items = Array.isArray(data)
        ? data
        : (data && Array.isArray(data.items) ? data.items : null);

      if (!items) { throw new Error('Format data produk tidak sesuai.'); }
      semua = items.map(normalisasi);
    }).catch(function (err) {
      semua = DUMMY.map(normalisasi);
      var ulang = LK.el('button', { type: 'button', 'class': 'tombol tombol-garis', text: 'Coba lagi' });
      ulang.addEventListener('click', muat);
      $info.replaceChildren(LK.el('p', { text: 'Menampilkan data contoh. ' + err.message }), ulang);
      $info.hidden = false;
    }).then(function () {
      buatChip();
      render();
    });
  }

  $cari.addEventListener('input', render);
  muat();
})();
