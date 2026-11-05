/* LokalKita - pesanan.js (frontend only, localStorage) */
(function () {
  'use strict';
  var KEY = 'lokalkita_pesanan';
  var $list = document.getElementById('daftar-pesanan');
  var $kosong = document.getElementById('pesanan-kosong');

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch(e) { return []; }
  }

  function render() {
    var items = load();
    $list.replaceChildren();
    if (!items.length) {
      $kosong.hidden = false;
      return;
    }
    $kosong.hidden = true;
    items.forEach(function (it) {
      var img = LK.el('img', { src: it.image || 'img/produk/keripik-singkong.jpg', alt: it.name || '' });
      var info = LK.el('div', { 'class': 'item-pesanan-info' }, [
        LK.el('div', { 'class': 'item-pesanan-nama', text: it.name || 'Produk' }),
        LK.el('div', { 'class': 'item-pesanan-toko', text: it.store_name || '-' }),
        LK.el('div', { 'class': 'item-pesanan-harga', text: LK.rupiah(it.price) + ' x ' + (it.qty || 1) })
      ]);
      var status = LK.el('span', { 'class': 'pesanan-status menunggu', text: 'Lagi Nunggu Konfirmasi' });
      if (it.status === 'proses') { status.textContent = 'Lagi Disiapin'; status.className = 'pesanan-status proses'; }
      else if (it.status === 'selesai') { status.textContent = 'Sampai Tangan, Makasih!'; status.className = 'pesanan-status selesai'; }
      else if (it.status === 'batal') { status.textContent = 'Dibatalkan'; status.className = 'pesanan-status batal'; }
      var chat = LK.el('a', { 'class': 'tombol tombol-garis', href: it.store_id ? 'chat.html?store_id=' + encodeURIComponent(it.store_id) : 'chat.html', text: '💬 Chat Penjual' });
      var footer = LK.el('div', { 'class': 'item-pesanan-footer' }, [status, chat]);
      var item = LK.el('article', { 'class': 'item-pesanan' }, [img, info, LK.el('div')]);
      item.appendChild(footer);
      $list.appendChild(item);
    });
  }

  // Handle "Pesan Barang" dari katalog
  try {
    var params = new URLSearchParams(location.search);
    var pesanId = params.get('pesan');
    var storeId = params.get('store_id');
    if (pesanId) {
      var items = load();
      items.unshift({
        id: 'PSN-' + Date.now().toString().slice(-6),
        product_id: pesanId,
        name: 'Produk #' + pesanId,
        image: 'img/produk/keripik-singkong.jpg',
        price: 0,
        qty: 1,
        store_id: storeId,
        store_name: 'Toko Penjual',
        status: 'menunggu',
        tanggal: new Date().toISOString()
      });
      localStorage.setItem(KEY, JSON.stringify(items));
      LK.notif('Pesanan berhasil dibuat', 'sukses', 'Pesanan');
      // Bersihkan query
      history.replaceState({}, document.title, 'pesanan.html');
    }
  } catch(e) {}

  render();
})();
