/* LokalKita - pesanan.js (frontend only, localStorage) */
(function () {
  'use strict';
  var KEY = 'lokalkita_pesanan';
  var $list = document.getElementById('daftar-pesanan');
  var $kosong = document.getElementById('pesanan-kosong');

  var STATUS = {
    antrian: { label: 'Antrian', kelas: 'antrian' },
    dikerjakan: { label: 'Dikerjakan', kelas: 'dikerjakan' },
    selesai: { label: 'Selesai', kelas: 'selesai' },
    lunas: { label: 'Lunas', kelas: 'lunas' },
    batal: { label: 'Dibatalkan', kelas: 'batal' }
  };

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch(e) { return []; }
  }
  function simpan(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch(e) {}
  }

  function statusInfo(s) {
    return STATUS[s] || STATUS.antrian;
  }

  function buatChat(it) {
    return LK.el('a', {
      'class': 'tombol tombol-garis',
      href: it.store_id ? 'chat.html?store_id=' + encodeURIComponent(it.store_id) : 'chat.html',
      text: '💬 Chat Penjual'
    });
  }

  function salinTeks(teks) {
    if (!navigator.clipboard) { return; }
    navigator.clipboard.writeText(teks).then(function () {
      LK.notif('Nomor rekening disalin', 'sukses', 'Salin');
    }, function () {});
  }

  function tandaiBayar(it, metode) {
    var items = load();
    for (var i = 0; i < items.length; i++) {
      if (String(items[i].id) === String(it.id)) {
        items[i].status = 'lunas';
        items[i].metode_bayar = metode;
        items[i].tanggal_bayar = new Date().toISOString();
        break;
      }
    }
    simpan(items);
    LK.notif(metode === 'tf'
      ? 'Pembayaran TF tercatat. Pesanan lunas.'
      : 'Silakan lunaskan pembayaran di kasir toko.', 'sukses', 'Pembayaran');
    render();
  }

  function buatBayar(it) {
    var rekening = it.rekening || '1234-5678-9012';
    var atasan = it.rekeningAtasan || 'a/n Toko LokalKita';

    var rekeningBox = LK.el('div', { 'class': 'rekening-box' }, [
      LK.el('span', { 'class': 'rekening-label', text: 'Rekening transfer' }),
      LK.el('div', { 'class': 'rekening-baris' }, [
        LK.el('span', { 'class': 'rekening-nomor', text: rekening }),
        LK.el('span', { 'class': 'rekening-atasan', text: atasan })
      ]),
      LK.el('button', {
        'type': 'button',
        'class': 'tombol salin-rekening tombol-garis',
        'aria-label': 'Salin nomor rekening',
        text: '📋 Salin'
      })
    ]);

    var btnTf = LK.el('button', {
      'type': 'button', 'class': 'tombol bayar-tf', 'data-bayar': 'tf', text: 'Bayar TF'
    });
    var btnKasir = LK.el('button', {
      'type': 'button', 'class': 'tombol tombol-garis bayar-kasir', 'data-bayar': 'kasir', text: 'Di Kasir'
    });

    var aksi = LK.el('div', { 'class': 'aksi-bayar' }, [rekeningBox, btnTf, btnKasir]);

    btnTf.addEventListener('click', function () { tandaiBayar(it, 'tf'); });
    btnKasir.addEventListener('click', function () { tandaiBayar(it, 'kasir'); });
    rekeningBox.querySelector('.salin-rekening').addEventListener('click', function () {
      salinTeks(rekening);
    });

    return aksi;
  }

  function buatAksi(it) {
    var st = it.status;
    if (st === 'selesai') { return buatBayar(it); }
    if (st === 'lunas') { return LK.el('span', { 'class': 'pesanan-keterangan', text: 'Sudah lunas' }); }
    if (st === 'batal') { return null; }
    return buatChat(it);
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
      var infoSt = statusInfo(it.status);
      var status = LK.el('span', { 'class': 'pesanan-status ' + infoSt.kelas, text: infoSt.label });
      var aksi = buatAksi(it);
      var footer = LK.el('div', { 'class': 'item-pesanan-footer' }, [status, aksi].filter(Boolean));
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
        status: 'antrian',
        rekening: '1234-5678-9012',
        rekeningAtasan: 'a/n Toko Penjual',
        tanggal: new Date().toISOString()
      });
      simpan(items);
      LK.notif('Pesanan berhasil dibuat', 'sukses', 'Pesanan');
      // Bersihkan query
      history.replaceState({}, document.title, 'pesanan.html');
    }
  } catch(e) {}

  render();
})();
