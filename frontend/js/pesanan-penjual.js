/* LokalKita - pesanan-penjual.js (frontend only, localStorage) */
(function () {
  'use strict';
  var KEY = 'lokalkita_pesanan';
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

  function ubahStatus(it, nextStatus) {
    var items = load();
    for (var i = 0; i < items.length; i++) {
      if (String(items[i].id) === String(it.id)) {
        items[i].status = nextStatus;
        break;
      }
    }
    simpan(items);
    LK.notif('Status pesanan: ' + STATUS[nextStatus].label, 'sukses', 'Pesanan');
    render();
  }

  function buatAksiPenjual(it) {
    var st = statusInfo(it.status);
    if (!st.next) {
      return LK.el('span', { 'class': 'pesanan-keterangan', text: st.label });
    }
    var btn = LK.el('button', {
      'type': 'button',
      'class': 'tombol aksi-status',
      'data-next': st.next,
      text: st.nextLabel
    });
    btn.addEventListener('click', function () { ubahStatus(it, st.next); });
    return btn;
  }

  function render() {
    $info.hidden = true;
    if (!storeAktif) { return; }
    var items = load().filter(function (it) {
      return String(it.store_id) === String(storeAktif);
    });
    items.sort(function (a, b) {
      return new Date(b.tanggal || 0) - new Date(a.tanggal || 0);
    });
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
      var aksi = buatAksiPenjual(it);
      var footer = LK.el('div', { 'class': 'item-pesanan-footer' }, [status, aksi]);
      var item = LK.el('article', { 'class': 'item-pesanan' }, [img, info, LK.el('div')]);
      item.appendChild(footer);
      $list.appendChild(item);
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
    storeAktif = u.store_id;
    if ($namaToko) { $namaToko.textContent = u.store_name || 'Toko saya'; }
    render();
  }).catch(function () {
    window.location.replace('login.html?lanjut=' + encodeURIComponent('pesanan-penjual.html'));
  });
})();
