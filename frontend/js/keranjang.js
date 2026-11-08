/* LokalKita - keranjang.js (frontend only, localStorage) */
(function () {
  'use strict';
  var KEY = 'lokalkita_keranjang';
  var $list = document.getElementById('daftar-keranjang');
  var $kosong = document.getElementById('keranjang-kosong');
  var $ringkasan = document.getElementById('ringkasan-keranjang');
  var $total = document.getElementById('total-keranjang');
  var $checkout = document.getElementById('btn-checkout');

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch(e) { return []; }
  }
  function save(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
  }

  function render() {
    var items = load();
    $list.replaceChildren();
    if (!items.length) {
      $kosong.hidden = false;
      $ringkasan.hidden = true;
      return;
    }
    $kosong.hidden = true;
    $ringkasan.hidden = false;
    var total = 0;
    items.forEach(function (it, idx) {
      total += Number(it.price || 0) * Number(it.qty || 1);
      var img = LK.el('img', { src: it.image || 'img/produk/keripik-singkong.jpg', alt: it.name || '' });
      var info = LK.el('div', { 'class': 'item-keranjang-info' }, [
        LK.el('div', { 'class': 'item-keranjang-nama', text: it.name || 'Produk' }),
        LK.el('div', { 'class': 'item-keranjang-toko', text: it.store_name || '-' }),
        LK.el('div', { 'class': 'item-keranjang-harga', text: LK.rupiah(it.price) })
      ]);
      var qty = LK.el('div', { 'class': 'jumlah-keranjang' }, [
        LK.el('button', { type: 'button', text: '-' }, []),
        LK.el('span', { text: String(it.qty || 1) }),
        LK.el('button', { type: 'button', text: '+' }, [])
      ]);
      var minus = qty.children[0], plus = qty.children[2], num = qty.children[1];
      minus.addEventListener('click', function () {
        var cur = Number(num.textContent) || 1;
        if (cur <= 1) return;
        num.textContent = cur - 1;
        items[idx].qty = cur - 1;
        save(items);
        render();
      });
      plus.addEventListener('click', function () {
        var cur = Number(num.textContent) || 1;
        num.textContent = cur + 1;
        items[idx].qty = cur + 1;
        save(items);
        render();
      });
      var hapus = LK.el('button', { type: 'button', 'class': 'hapus-keranjang', text: 'Hapus' });
      hapus.addEventListener('click', function () {
        items.splice(idx, 1);
        save(items);
        render();
      });
      var aksi = LK.el('div', { 'class': 'item-keranjang-aksi' }, [qty, hapus]);
      var item = LK.el('article', { 'class': 'item-keranjang' }, [img, info, aksi]);
      $list.appendChild(item);
    });
    $total.textContent = LK.rupiah(total);
  }

  if ($checkout) {
    $checkout.addEventListener('click', function () {
      var items = load();
      if (!items.length) { return; }

      $checkout.disabled = true;

      LK.apiPost('orders.php?action=create', {
        items: items.map(function (it) {
          return {
            product_id: it.product_id,
            quantity: Number(it.qty) || 1
          };
        })
      }).then(function () {
        var pesanan = [];
        try {
          pesanan = JSON.parse(localStorage.getItem('lokalkita_pesanan') || '[]');
        } catch (e) {}

        items.forEach(function (it) {
          pesanan.unshift({
            id: 'PSN-' + Date.now().toString().slice(-6),
            product_id: it.product_id,
            name: it.name,
            image: it.image,
            price: it.price,
            qty: it.qty || 1,
            store_id: it.store_id,
            store_name: it.store_name,
            status: 'antrian',
            rekening: '1234-5678-9012',
            rekeningAtasan: 'a/n ' + (it.store_name || 'Toko LokalKita'),
            tanggal: new Date().toISOString()
          });
        });

        localStorage.setItem('lokalkita_pesanan', JSON.stringify(pesanan));
        localStorage.setItem(KEY, JSON.stringify([]));

        LK.notif('Pesanan berhasil dibuat', 'sukses', 'Pesanan');
        window.location.href = 'pesanan.html';
      }).catch(function (err) {
        LK.notif(err.message || 'Gagal membuat pesanan.', 'bahaya', 'Pesanan');
        $checkout.disabled = false;
      });
    });
  }

  render();
})();
