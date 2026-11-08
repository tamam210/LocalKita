(function () {
  'use strict';

  var $list = document.getElementById('daftar-pesanan');
  var $kosong = document.getElementById('pesanan-kosong');

  var STATUS = {
    antrian: { label: 'Antrian', kelas: 'antrian' },
    dikerjakan: { label: 'Dikerjakan', kelas: 'dikerjakan' },
    selesai: { label: 'Selesai', kelas: 'selesai' },
    lunas: { label: 'Lunas', kelas: 'lunas' },
    batal: { label: 'Dibatalkan', kelas: 'batal' }
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

  function salinTeks(teks) {
    if (!navigator.clipboard) { return; }
    navigator.clipboard.writeText(teks).then(function () {
      LK.notif('Nomor rekening disalin', 'sukses', 'Salin');
    }, function () {});
  }

  function bayar(order, metode, btn) {
    if (btn) { btn.disabled = true; }

    LK.apiPost('orders.php?action=pay', {
      order_id: order.order_id,
      method: metode
    }).then(function () {
      LK.notif(
        metode === 'tf'
          ? 'Pembayaran TF tercatat. Pesanan lunas.'
          : 'Pembayaran di kasir tercatat. Pesanan lunas.',
        'sukses',
        'Pembayaran'
      );
      return muat();
    }).catch(function (err) {
      LK.notif(err.message || 'Gagal mencatat pembayaran.', 'bahaya', 'Pembayaran');
      if (btn) { btn.disabled = false; }
    });
  }

  function buatBayar(order) {
    var rekening = order.rekening || '1234-5678-9012';
    var atasan = order.rekening_atasan || ('a/n ' + (order.store_name || 'Toko LokalKita'));

    var rekeningBox = LK.el('div', { 'class': 'rekening-box' }, [
      LK.el('span', { 'class': 'rekening-label', text: 'Rekening transfer' }),
      LK.el('div', { 'class': 'rekening-baris' }, [
        LK.el('span', { 'class': 'rekening-nomor', text: rekening }),
        LK.el('span', { 'class': 'rekening-atasan', text: atasan })
      ]),
      LK.el('button', {
        type: 'button',
        'class': 'tombol salin-rekening tombol-garis',
        'aria-label': 'Salin nomor rekening',
        text: '📋 Salin'
      })
    ]);

    var btnTf = LK.el('button', {
      type: 'button',
      'class': 'tombol bayar-tf',
      'data-bayar': 'tf',
      text: 'Bayar TF'
    });

    var btnKasir = LK.el('button', {
      type: 'button',
      'class': 'tombol tombol-garis bayar-kasir',
      'data-bayar': 'kasir',
      text: 'Di Kasir'
    });

    var aksi = LK.el('div', { 'class': 'aksi-bayar' }, [rekeningBox, btnTf, btnKasir]);

    btnTf.addEventListener('click', function () { bayar(order, 'tf', btnTf); });
    btnKasir.addEventListener('click', function () { bayar(order, 'kasir', btnKasir); });
    rekeningBox.querySelector('.salin-rekening').addEventListener('click', function () {
      salinTeks(rekening);
    });

    return aksi;
  }

  function buatAksi(order) {
    if (order.status === 'selesai') {
      return buatBayar(order);
    }

    if (order.status === 'lunas') {
      return LK.el('span', { 'class': 'pesanan-keterangan', text: 'Sudah lunas' });
    }

    if (order.status === 'batal') {
      return null;
    }

    return LK.el('a', {
      'class': 'tombol tombol-garis',
      href: order.store_id
        ? 'chat.html?store_id=' + encodeURIComponent(order.store_id)
        : 'chat.html',
      text: '💬 Chat Penjual'
    });
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
        LK.el('div', { 'class': 'item-pesanan-toko', text: order.store_name || '-' }),
        LK.el('div', { 'class': 'item-pesanan-toko', text: itemRingkas(order) }),
        LK.el('div', {
          'class': 'item-pesanan-harga',
          text: LK.rupiah(order.total_amount) + ' • ' + LK.tanggal(order.created_at)
        })
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

    return LK.apiGet('orders.php?action=list_buyer').then(function (data) {
      var items = data && Array.isArray(data.items) ? data.items : [];
      render(items);
    }).catch(function (err) {
      $kosong.hidden = true;
      $list.replaceChildren();
      LK.status($list, 'galat', 'Gagal memuat pesanan', err.message, LK.ulang(muat));
    });
  }

  LK.sesiAman().then(function (u) {
    if (!u || !u.user_id) {
      window.location.replace('login.html?lanjut=' + encodeURIComponent('pesanan.html'));
      return;
    }
    muat();
  });
})();