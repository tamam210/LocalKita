/* LokalKita - produk-detail.js */
(function () {
  'use strict';

  var $detail = document.getElementById('detail-produk');
  if (!$detail) return;

  function getId() {
    var params = new URLSearchParams(location.search);
    return params.get('id') || '';
  }

  function skeleton() {
    $detail.replaceChildren(LK.el('div', { 'class': 'skeleton' }));
  }

  function buatLightbox(src, alt) {
    if (!src) return;
    var latar = LK.el('div', { 'class': 'lightbox-latar' });
    var img = LK.el('img', { 'class': 'lightbox-gambar', src: src, alt: alt || 'Gambar produk' });
    var tutup = LK.el('button', { type: 'button', 'class': 'lightbox-tutup', 'aria-label': 'Tutup', text: '\u00D7' });
    tutup.addEventListener('click', function () { if (latar.parentNode) latar.parentNode.removeChild(latar); });
    latar.addEventListener('click', function (e) { if (e.target === latar) if (latar.parentNode) latar.parentNode.removeChild(latar); });
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') {
        if (latar.parentNode) latar.parentNode.removeChild(latar);
        document.removeEventListener('keydown', onKey);
      }
    });
    latar.appendChild(img);
    latar.appendChild(tutup);
    document.body.appendChild(latar);
  }

  function render(p) {
    var gambarUrl = p.image_url || p.primary_image_url || (p.images && p.images[0] && p.images[0].url) || '';
    var gambarAlt = p.image_alt || p.name || 'Produk';
    var storeId = p.store_id || '';
    var storeName = p.store_name || p.store || '-';
    var harga = p.price !== undefined && p.price !== null ? p.price : (p.min_price !== undefined ? p.min_price : 0);
    var stok = p.stock !== undefined && p.stock !== null ? p.stock : (p.total_stock !== undefined ? p.total_stock : null);
    var desc = p.description || p.desc || 'Belum ada deskripsi produk.';
    var specs = p.specification || p.specs || p.details || 'Tidak ada spesifikasi.';
    var infoToko = p.store_info || p.seller_info || 'Informasi toko tidak tersedia.';

    var imgBox = LK.el('div', { 'class': 'detail-gambar' });
    var img = LK.el('img', { src: gambarUrl, alt: gambarAlt });
    img.addEventListener('click', function () { buatLightbox(gambarUrl, gambarAlt); });
    var zoomBtn = LK.el('button', { type: 'button', 'class': 'detail-zoom', text: '\ud83d\udd0d Perbesar' });
    zoomBtn.addEventListener('click', function () { buatLightbox(gambarUrl, gambarAlt); });
    imgBox.appendChild(img);
    if (gambarUrl) imgBox.appendChild(zoomBtn);

    var isi = LK.el('div', { 'class': 'detail-isi' });
    var judul = LK.el('h1', { 'class': 'detail-nama', text: p.name || 'Produk tanpa nama' });
    var toko = LK.el('a', { 'class': 'detail-toko', href: storeId ? 'poin.html?store_id=' + encodeURIComponent(storeId) : '#', text: '\ud83c\udfe0 ' + storeName });
    toko.addEventListener('click', function (e) { if (!storeId) e.preventDefault(); });
    var hrg = LK.el('div', { 'class': 'detail-harga', text: LK.rupiah(harga) });
    var st = LK.el('div', { 'class': 'detail-stok', text: stok === null ? 'Stok: -' : (stok <= 0 ? 'Stok: Habis' : 'Stok: ' + stok) });

    // Varian sederhana
    var varianWrap = LK.el('div', { 'class': 'detail-varian', 'aria-label': 'Pilih varian' });
    var varianList = Array.isArray(p.variants) ? p.variants : (p.variant_options || []);
    if (varianList.length === 0) {
      varianWrap.style.display = 'none';
    } else {
      varianList.forEach(function (v, idx) {
        var btn = LK.el('button', { type: 'button', text: v.name || v.label || ('Varian ' + (idx+1)) });
        btn.setAttribute('aria-pressed', idx === 0 ? 'true' : 'false');
        btn.addEventListener('click', function () {
          Array.prototype.forEach.call(varianWrap.children, function (b) { b.setAttribute('aria-pressed', 'false'); });
          btn.setAttribute('aria-pressed', 'true');
        });
        varianWrap.appendChild(btn);
      });
    }

    // Tabs
    var tabs = LK.el('div', { 'class': 'detail-tabs', role: 'tablist' });
    var tabBtn1 = LK.el('button', { type: 'button', role: 'tab', 'aria-pressed': 'true', text: 'Deskripsi' });
    var tabBtn2 = LK.el('button', { type: 'button', role: 'tab', 'aria-pressed': 'false', text: 'Spesifikasi' });
    var tabBtn3 = LK.el('button', { type: 'button', role: 'tab', 'aria-pressed': 'false', text: 'Informasi Toko' });
    tabs.appendChild(tabBtn1); tabs.appendChild(tabBtn2); tabs.appendChild(tabBtn3);

    var tabIsi1 = LK.el('div', { 'class': 'detail-tab-isi', role: 'tabpanel' }, [LK.el('p', { text: desc })]);
    var tabIsi2 = LK.el('div', { 'class': 'detail-tab-isi', role: 'tabpanel', hidden: true }, [LK.el('p', { text: specs })]);
    var tabIsi3 = LK.el('div', { 'class': 'detail-tab-isi', role: 'tabpanel', hidden: true }, [LK.el('p', { text: infoToko })]);

    function gantiTab(i) {
      [tabBtn1, tabBtn2, tabBtn3].forEach(function (b, idx) { b.setAttribute('aria-pressed', idx === i ? 'true' : 'false'); });
      [tabIsi1, tabIsi2, tabIsi3].forEach(function (t, idx) { t.hidden = idx !== i; });
    }
    tabBtn1.addEventListener('click', function () { gantiTab(0); });
    tabBtn2.addEventListener('click', function () { gantiTab(1); });
    tabBtn3.addEventListener('click', function () { gantiTab(2); });

    // Aksi
    var aksi = LK.el('div', { 'class': 'detail-aksi' });
    var tambah = LK.el('button', { type: 'button', 'class': 'tombol', text: '+ Tambah Keranjang' });
    tambah.addEventListener('click', function () {
      try {
        var KEY = 'lokalkita_keranjang';
        var items = JSON.parse(localStorage.getItem(KEY) || '[]');
        var ada = false;
        for (var i = 0; i < items.length; i++) {
          if (String(items[i].product_id) === String(p.product_id)) { items[i].qty = (items[i].qty || 1) + 1; ada = true; break; }
        }
        if (!ada) {
          items.push({
            product_id: p.product_id,
            name: p.name,
            price: harga,
            image: gambarUrl,
            store_id: storeId,
            store_name: storeName,
            qty: 1
          });
        }
        localStorage.setItem(KEY, JSON.stringify(items));
      } catch(ex) {}
      LK.notif('Produk berhasil ditambahkan ke keranjang', 'sukses', 'Keranjang');
    });
    var hubungi = LK.el('a', { 'class': 'tombol tombol-garis', href: storeId ? 'poin.html?store_id=' + encodeURIComponent(storeId) : 'chat.html', text: '\ud83d\udcac Hubungi Penjual' });
    var bagikan = LK.el('button', { type: 'button', 'class': 'tombol-lunak', text: '\ud83d\udd17 Bagikan' });
    bagikan.addEventListener('click', function () {
      try {
        if (navigator.share) {
          navigator.share({ title: p.name, text: p.name, url: location.href });
        } else {
          navigator.clipboard.writeText(location.href).then(function () {
            LK.notif('Tautan berhasil disalin', 'sukses', 'Bagikan');
          });
        }
      } catch(e) {}
    });
    aksi.appendChild(tambah);
    aksi.appendChild(hubungi);
    aksi.appendChild(bagikan);

    var infoRow = LK.el('div', { 'class': 'detail-info-row' });
    infoRow.appendChild(LK.el('span', {}, [LK.el('strong', { text: 'Kategori: ' }), LK.el('span', { text: p.category_name || '-' })]));
    infoRow.appendChild(LK.el('span', {}, [LK.el('strong', { text: 'SKU: ' }), LK.el('span', { text: p.sku || '-' })]));

    isi.appendChild(judul);
    isi.appendChild(toko);
    isi.appendChild(hrg);
    isi.appendChild(st);
    isi.appendChild(varianWrap);
    isi.appendChild(tabs);
    isi.appendChild(tabIsi1);
    isi.appendChild(tabIsi2);
    isi.appendChild(tabIsi3);
    isi.appendChild(aksi);
    isi.appendChild(infoRow);

    var konten = LK.el('div', { 'class': 'detail-dua-kolom' }, [imgBox, isi]);
    $detail.replaceChildren(konten);
    document.title = (p.name || 'Produk') + ' - LokalKita';
  }

  function muat() {
    skeleton();
    var id = getId();
    if (!id) {
      $detail.replaceChildren(LK.el('div', { 'class': 'status status-galat' }, [
        LK.el('h3', { text: 'Produk tidak ditemukan' }),
        LK.el('p', { text: 'ID produk tidak valid.' }),
        LK.el('a', { href: 'index.html', 'class': 'tombol', text: 'Kembali ke Etalase' })
      ]));
      return;
    }

    // Coba fetch dari API
    LK.apiGet('products.php?product_id=' + encodeURIComponent(id)).then(function (data) {
      var p = Array.isArray(data) ? data[0] : (data && data.item ? data.item : data);
      if (!p || !p.product_id) throw new Error('Data produk tidak ditemukan');
      render(p);
    }).catch(function (err) {
      // Fallback ke katalog jika gagal
      LK.apiGet('products.php?per_page=50').then(function (data) {
        var items = Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : []);
        var p = null;
        for (var i = 0; i < items.length; i++) {
          if (String(items[i].product_id) === String(id)) { p = items[i]; break; }
        }
        if (!p) throw err;
        render(p);
      }).catch(function () {
        $detail.replaceChildren(LK.el('div', { 'class': 'status status-galat' }, [
          LK.el('h3', { text: 'Gagal memuat produk' }),
          LK.el('p', { text: err.message || 'Terjadi kesalahan.' }),
          LK.el('a', { href: 'index.html', 'class': 'tombol tombol-garis', text: 'Kembali ke Etalase' })
        ]));
      });
    });
  }

  muat();
})();
