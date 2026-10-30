/* LokalKita - katalog (B1). Data dari api/products.php; fallback dummy bila API belum siap. */
(function () {
  'use strict';
  // Asumsi bentuk data: {product_id, name, category_name, price, stock, store_name, image_url, image_alt}
  var DUMMY = [
    { product_id: 1, name: 'Keripik Singkong', category_name: 'Makanan', price: 15000, stock: 40, store_name: 'UMKM Bandung' },
    { product_id: 2, name: 'Tas Anyaman', category_name: 'Barang', price: 120000, stock: 8, store_name: 'UMKM Yogyakarta' },
    { product_id: 3, name: 'Kopi Lokal', category_name: 'Minuman', price: 45000, stock: 25, store_name: 'UMKM Aceh' },
    { product_id: 4, name: 'Kain Batik Tulis', category_name: 'Barang', price: 185000, stock: 5, store_name: 'UMKM Pekalongan' },
    { product_id: 5, name: 'Laundry Kiloan', category_name: 'Jasa', price: 7000, store_name: 'UMKM Ponorogo' },
    { product_id: 6, name: 'Sambal Roa', category_name: 'Makanan', price: 35000, stock: 0, store_name: 'UMKM Manado' }
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
    var stok = p.stock === null || p.stock === undefined ? NaN : Number(p.stock);
    var lencana = isFinite(stok)
      ? LK.el('span', { 'class': 'lencana' + (stok <= 0 ? ' lencana-habis' : ''), text: stok <= 0 ? 'Stok habis' : 'Stok ' + stok })
      : null;
    var poin = (p.earns_points === true || Number(p.earns_points) === 1) ? LK.el('span', { 'class': 'lencana', text: 'Dapat poin' }) : null;
    return LK.el('article', { 'class': 'kartu-produk' }, [gambar, LK.el('div', { 'class': 'kartu-isi' }, [
      LK.el('h3', { 'class': 'kartu-nama', text: p.name || 'Produk tanpa nama' }),
      LK.el('span', { 'class': 'kartu-toko', text: p.store_name || kategoriDari(p) }),
      LK.el('span', { 'class': 'kartu-harga', text: LK.rupiah(p.price) }),
      LK.el('div', { 'class': 'lencana-baris' }, [lencana, poin])
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

  function muat() {
    $info.hidden = true;
    tampilMemuat();
    LK.apiGet('products.php').then(function (data) {
      if (!Array.isArray(data)) { throw new Error('Format data produk tidak sesuai.'); }
      semua = data;
    }).catch(function (err) {
      semua = DUMMY;
      var ulang = LK.el('button', { type: 'button', 'class': 'tombol tombol-garis', text: 'Coba lagi' });
      ulang.addEventListener('click', muat);
      $info.replaceChildren(LK.el('p', { text: 'Menampilkan data contoh. ' + err.message }), ulang);
      $info.hidden = false;
    }).then(function () { buatChip(); render(); });
  }

  $cari.addEventListener('input', render);
  muat();
})();
