(function () {
  'use strict';

  var $grid = document.getElementById('isi-produk');
  var $info = document.getElementById('info-produk');
  var $jumlah = document.getElementById('jumlah-produk');
  if (!$grid) { return; }

  function info(pesan, galat) {
    if (!$info) { return; }
    $info.replaceChildren(LK.el('p', { text: pesan }));
    $info.className = 'info-data' + (galat ? ' info-galat' : '');
    $info.hidden = false;
  }

  function statusTeks(p) {
    if (p.status === 'active') { return 'Aktif'; }
    if (p.status === 'draft') { return 'Draft'; }
    if (p.status === 'inactive') { return 'Nonaktif'; }
    return p.status || '-';
  }

  function kartu(p) {
    var gambar = LK.el('div', { 'class': 'kartu-gambar' });

    function pasangGambar(url) {
      if (!url) {
        gambar.replaceChildren(LK.el('span', { 'class': 'placeholder', text: 'Belum ada foto' }));
        return;
      }
      var img = LK.el('img', {
        src: url,
        alt: p.name || 'Foto produk',
        loading: 'lazy'
      });
      img.addEventListener('error', function () {
        img.remove();
        gambar.replaceChildren(LK.el('span', { 'class': 'placeholder', text: 'Foto tidak bisa dimuat' }));
      });
      gambar.replaceChildren(img);
    }

    pasangGambar(p.primary_image_url);

    var status = LK.el('span', { 'class': 'upload-status', text: 'Upload foto akan tersedia saat backend menyediakan endpoint.' });
    status.className = 'upload-status info';

    return LK.el('article', { 'class': 'kartu-produk-saya' }, [
      gambar,
      LK.el('div', { 'class': 'kartu-isi' }, [
        LK.el('h3', { 'class': 'kartu-nama', text: p.name || 'Produk tanpa nama' }),
    LK.el('span', { 'class': 'kartu-harga', text: LK.rupiah(p.min_price || 0) }),
    LK.el('span', { 'class': 'kartu-toko', text: statusTeks(p) }),
    status
  ])
    ]);
  }

  function muat() {
    $grid.replaceChildren(LK.el('div', { 'class': 'skeleton' }));

    LK.apiGet('products.php?per_page=50').then(function (data) {
      var items = data && Array.isArray(data.items) ? data.items : [];

      if ($jumlah) {
        $jumlah.textContent = items.length + ' produk';
      }

      if (items.length && items[0].store_name) {
        var nama = document.getElementById('nama-toko');
        if (nama) { nama.textContent = items[0].store_name; }
      }

      if (!items.length) {
        $grid.replaceChildren(LK.el('div', { 'class': 'status' }, [
          LK.el('h3', { text: 'Belum ada produk' }),
          LK.el('p', { text: 'Produk yang kamu tambahkan akan muncul di sini.' })
        ]));
        return;
      }

      $grid.replaceChildren.apply($grid, items.map(kartu));
      if ($info) { $info.hidden = true; }
    }).catch(function (e) {
      $grid.replaceChildren();
      info(e.message || 'Gagal memuat produk.', true);
    });
  }

  // Pastikan hanya penjual yang bisa lihat/upload.
  LK.sesi().then(function (u) {
    if (!u || u.role !== 'seller') {
      info('Halaman ini khusus akun penjual.', true);
      return;
    }
    muat();
  }).catch(function () {
    info('Silakan login sebagai penjual.', true);
  });
})();