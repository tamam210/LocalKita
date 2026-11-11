(function () {
  'use strict';

  var $grid = document.getElementById('isi-produk');
  var $info = document.getElementById('info-produk');
  var $jumlah = document.getElementById('jumlah-produk');
  var $form = document.getElementById('form-produk');
  var $kategori = document.getElementById('produk-kategori');
  var $pesanForm = document.getElementById('produk-pesan');
  var $submit = document.getElementById('produk-submit');

  if (!$grid) { return; }

  function info(pesan, galat) {
    if (!$info) { return; }
    $info.replaceChildren(LK.el('p', { text: pesan }));
    $info.className = 'info-data' + (galat ? ' info-galat' : '');
    $info.hidden = false;
  }

  function pesanForm(pesan, galat) {
    if (!$pesanForm) { return; }
    $pesanForm.replaceChildren(LK.el('p', { text: pesan }));
    $pesanForm.className = 'info-data' + (galat ? ' info-galat' : '');
    $pesanForm.hidden = !pesan;
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

      url = LK.mediaUrl(url);

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

    var input = LK.el('input', {
      type: 'file',
      accept: 'image/jpeg,image/png,image/webp'
    });

    var tombol = LK.el('button', {
      type: 'button',
      'class': 'tombol',
      text: 'Upload foto'
    });

    var status = LK.el('span', {
      'class': 'upload-status',
      text: ''
    });

    tombol.addEventListener('click', function () {
      var file = input.files && input.files[0];

      if (!file) {
        status.className = 'upload-status galat';
        status.textContent = 'Pilih foto dulu.';
        return;
      }

      tombol.disabled = true;
      status.className = 'upload-status';
      status.textContent = 'Mengunggah...';

      LK.apiUpload('product_image.php', {
        product_id: p.product_id,
        image: file
      }).then(function (d) {
        if (d && d.image_url) {
          pasangGambar(d.image_url);
        }
        status.className = 'upload-status sukses';
        status.textContent = 'Foto berhasil diunggah.';
        LK.notif('Foto produk berhasil diunggah.', 'sukses', 'Upload berhasil');
      }).catch(function (e) {
        status.className = 'upload-status galat';
        status.textContent = e.message || 'Gagal upload.';
        LK.notif(e.message || 'Gagal upload.', 'bahaya', 'Upload gagal');
      }).then(function () {
        tombol.disabled = false;
      });
    });

    return LK.el('article', { 'class': 'kartu-produk-saya' }, [
      gambar,
      LK.el('div', { 'class': 'kartu-isi' }, [
        LK.el('h3', { 'class': 'kartu-nama', text: p.name || 'Produk tanpa nama' }),
        LK.el('span', { 'class': 'kartu-harga', text: LK.rupiah(p.min_price || 0) }),
        LK.el('span', { 'class': 'kartu-toko', text: statusTeks(p) }),
        LK.el('div', { 'class': 'upload-baris' }, [input, tombol]),
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

  function muatKategori() {
    if (!$kategori) { return Promise.resolve(); }

    return LK.apiGet('categories.php?all=1').then(function (data) {
      var items = data && Array.isArray(data.items) ? data.items : [];

      items.forEach(function (k) {
        if (!k || !k.category_id) { return; }
        $kategori.appendChild(
          LK.el('option', { value: k.category_id, text: k.name })
        );
      });
    }).catch(function () {});
  }

  if ($form) {
    $form.addEventListener('submit', function (e) {
      e.preventDefault();

      var fd = new FormData($form);
      var file = fd.get('image');

      var data = {
        name: String(fd.get('name') || '').trim(),
        category_id: String(fd.get('category_id') || '').trim(),
        price: Number(fd.get('price') || 0),
        stock: Number(fd.get('stock') || 0),
        description: String(fd.get('description') || '').trim()
      };

      if (!data.name) {
        pesanForm('Nama produk wajib diisi.', true);
        return;
      }

      if ($submit) { $submit.disabled = true; }
      pesanForm('Menyimpan produk...', false);

      LK.apiPost('product_create.php', data).then(function (hasil) {
        var productId = hasil && hasil.product_id;

        if (!productId) {
          throw new Error('Produk tersimpan tapi ID tidak diterima.');
        }

        if (file && file.size) {
          return LK.apiUpload('product_image.php', {
            product_id: productId,
            image: file
          }).then(function () {
            return hasil;
          });
        }

        return hasil;
      }).then(function () {
        $form.reset();
        pesanForm('Produk berhasil ditambahkan.', false);
        LK.notif('Produk berhasil ditambahkan.', 'sukses', 'Produk');
        muat();
      }).catch(function (err) {
        pesanForm(err.message || 'Gagal menambah produk.', true);
        LK.notif(err.message || 'Gagal menambah produk.', 'bahaya', 'Produk');
      }).then(function () {
        if ($submit) { $submit.disabled = false; }
      });
    });
  }

  LK.sesi().then(function (u) {
    if (!u || (u.role !== 'seller' && u.role !== 'admin')) {
      info('Halaman ini khusus akun penjual.', true);
      return;
    }

    muatKategori().then(muat);
  }).catch(function () {
    info('Silakan login sebagai penjual.', true);
  });
})();