/* LokalKita - katalog clickable: buat kartu, gambar, dan nama produk bisa diklik ke detail. */
(function () {
  'use strict';

  function buatTautan(product) {
    if (!product || !product.product_id) return null;
    return 'produk-detail.html?id=' + encodeURIComponent(product.product_id);
  }

  function cariProduk(el) {
    var kartu = el.closest('.kartu-produk');
    if (!kartu) return null;
    var id = kartu.getAttribute('data-product-id');
    if (id) return 'produk-detail.html?id=' + encodeURIComponent(id);
    var href = kartu.querySelector('a[href^="produk-detail.html"]');
    if (href) return href.getAttribute('href');
    return null;
  }

  function pasang() {
    var grid = document.getElementById('grid-produk');
    if (!grid || grid.getAttribute('data-click-dihandle')) return;
    grid.setAttribute('data-click-dihandle', 'true');

    grid.addEventListener('click', function (e) {
      var target = e.target;
      // Jika yang diklik adalah link/chat, biarin dia yang handle
      if (target.closest('a, button')) return;
      var tujuan = cariProduk(target);
      if (tujuan) {
        // Simpan ke riwayat produk yang dilihat (frontend only)
        try {
          var kartu = target.closest('.kartu-produk');
          if (kartu) {
            var id = kartu.getAttribute('data-product-id');
            var namaEl = kartu.querySelector('.kartu-nama');
            var nama = namaEl ? namaEl.textContent : '';
            if (id) { LK.dilihat.tambah(id, nama); }
          }
        } catch(e) {}
        window.location.href = tujuan;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pasang);
  } else {
    pasang();
  }

  // Observasi kalau grid diisi ulang (render ulang)
  if (window.MutationObserver) {
    var grid = document.getElementById('grid-produk');
    if (grid) {
      new MutationObserver(function () {
        if (!grid.getAttribute('data-click-dihandle')) pasang();
      }).observe(grid, { childList: true, subtree: true });
    }
  }
})();