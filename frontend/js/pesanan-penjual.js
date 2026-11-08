(function () {
  'use strict';

  var $list = document.getElementById('daftar-pesanan');
  var $kosong = document.getElementById('pesanan-kosong');
  var $info = document.getElementById('info-pesanan');
  var $namaToko = document.getElementById('nama-toko');
  var storeAktif = null;

  var STATUS = {
    antrian: { label: 'Antrian', kelas: 'antrian', next: 'dikerjakan', nextLabel: 'Mulai Dikerjakan' },
    dikerjakan: { label: 'Dikerjakan', kelas: 'dikerjakan', next: 'selesai', nextLabel: 'Tandai Selesai' },
    selesai: { label: 'Selesai', kelas: 'selesai', next: 'lunas', nextLabel: 'Tandai Lunas' },
    lunas: { label: 'Lunas', kelas: 'lunas', next: null },
    batal: { label: 'Dibatalkan', kelas: 'batal', next: null }
  };

  function statusInfo(s) {
    return STATUS[s] || STATUS.antrian;
  }

  function gambarPesanan(order) {
    var items = Array.isArray(order.items) ? order.items : [];
    var url = items[0] && items[0].image_url;
    var kotak = LK.el('div', { 'class': 'kartu-gambar' });

    if (url) {
      kotak.appendChild(LK.el('img', {
        src: url,
        alt: order.order_number || 'Pesanan',
        loading: 'lazy'
      }));
    } else {
      kotak.appendChild(LK.el('span', { 'aria-hidden': 'true', text: '?' }));
    }

    return kotak;
  }

  function itemRingkas(order) {
    var items = Array.isArray(order.items) ? order.items : [];
    var teks = items.map(function (it) {
      return (it.product_name || 'Produk') + ' x ' + (it.quantity || 1);
    }).join(', ');
    return teks || 'Tidak ada item';
  }

  function ubahStatus(order, next, btn) {
    if (!next) { return; }
    if (btn) { btn.disabled = true; }

    LK.apiPost('orders.php?action=update_status', {
      order_id: order.order_id,
      status: next
    }).then(function () {
      LK.notif('Status pesanan: ' + statusInfo(next).label, 'sukses', 'Produk Terpesan');
      return muat();
    }).catch(function (err) {
      LK.notif(err.message || 'Gagal mengubah status.', 'bahaya', 'Produk Terpesan');
      if (btn) { btn.disabled = false; }
    });
  }

  function buatAksi(order) {
    var st = statusInfo(order.status);

    if (!st.next) {
      return LK.el('span', { 'class': 'pesanan-keterangan', text: st.label });
    }

    var btn = LK.el('button', {
      type: 'button',
      'class': 'tombol aksi-status',
      'data-next': st.next,
      text: st.nextLabel
    });

    btn.addEventListener('click', function () {
      ubahStatus(order, st.next, btn);
    });

    return btn;
  }

  function render(items) {
    $list.replaceChildren();

    if (!items.length) {
      $kosong.hidden = false;
      return;
    }

    $kosong.hidden = true;

    items.forEach(function (order) {
      var st = statusInfo(order.status);
      var info = LK.el('div', { 'class': 'item-pesanan-info' }, [
        LK.el('div', { 'class': 'item-pesanan-nama', text: order.order_number || 'Pesanan' }),
        LK.el('div', { 'class': 'item-pesanan-toko', text: 'Pembeli: ' + (order.buyer_name || '-') }),
        LK.el('div', { 'class': 'item-pesanan-toko', text: itemRingkas(order) }),
        LK.el('div', { 'class': 'item-pesanan-harga', text: LK.rupiah(order.total_amount) })
      ]);

      var status = LK.el('span', { 'class': 'pesanan-status ' + st.kelas, text: st.label });
      var footer = LK.el('div', { 'class': 'item-pesanan-footer' }, [status, buatAksi(order)]);
      var item = LK.el('article', { 'class': 'item-pesanan' }, [
        gambarPesanan(order),
        info,
        LK.el('div')
      ]);

      item.appendChild(footer);
      $list.appendChild(item);
    });
  }

  function muat() {
    if (!$list) { return; }

    $kosong.hidden = true;
    $list.replaceChildren(LK.el('div', { 'class': 'status' }, [
      LK.el('h3', { text: 'Memuat pesanan...' })
    ]));

    var url = 'orders.php?action=list_seller';
    if (storeAktif) {
      url += '&store_id=' + encodeURIComponent(storeAktif);
    }

    return LK.apiGet(url).then(function (data) {
      var items = data && Array.isArray(data.items) ? data.items : [];
      render(items);
    }).catch(function (err) {
      $kosong.hidden = true;
      $list.replaceChildren();
      LK.status($list, 'galat', 'Gagal memuat pesanan', err.message, LK.ulang(muat));
    });
  }

  LK.sesi().then(function (u) {
    if (!u || !u.user_id) {
      window.location.replace('login.html?lanjut=' + encodeURIComponent('pesanan-penjual.html'));
      return;
    }

    if (u.role !== 'seller' && u.role !== 'admin') {
      $info.hidden = false;
      $info.replaceChildren(LK.el('p', { text: 'Halaman ini hanya untuk penjual atau admin.' }));
      return;
    }

    storeAktif = u.store_id || null;
    if ($namaToko) {
      $namaToko.textContent = u.store_name || 'Toko saya';
    }
    muat();
  }).catch(function () {
    window.location.replace('login.html?lanjut=' + encodeURIComponent('pesanan-penjual.html'));
  });
})();