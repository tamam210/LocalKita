(function () {
  'use strict';

  var body = document.body;
  var perluAkun = body.getAttribute('data-perlu-akun');
  var halaman = body.getAttribute('data-halaman') || '';
  var itemAkun = document.querySelectorAll('[data-akun]');
  var itemTamu = document.querySelectorAll('[data-tamu]');

  function tampilkan(isAkun) {
    Array.prototype.forEach.call(itemAkun, function (el) {
      el.hidden = !isAkun;
    });
    Array.prototype.forEach.call(itemTamu, function (el) {
      el.hidden = isAkun;
    });
  }

  function alamatLogin() {
    var lanjut = location.pathname.split('/').pop() + location.search;
    return 'login.html?lanjut=' + encodeURIComponent(lanjut);
  }

  function keluar() {
    LK.konfirmasi({
      label: 'Akun',
      judul: 'Keluar dari akun?',
      pesan: 'Kamu bisa masuk lagi kapan saja.',
      teksYa: 'Ya, keluar',
      jenis: 'bahaya'
    }).then(function (ya) {
      if (!ya) { return; }
      LK.keluar().then(function () {
        window.location.href = 'index.html';
      });
    });
  }

  function pasangKeluar() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-keluar]'), function (tombol) {
      tombol.addEventListener('click', keluar);
    });
  }

  function masuk(u) {
    tampilkan(true);
    pasangKeluar();

    Array.prototype.forEach.call(document.querySelectorAll('[data-nama-user]'), function (el) {
      el.textContent = u.name || '';
    });

    // Sudah login tapi membuka halaman login: lempar ke home sesuai role.
    if (halaman === 'login') {
      var tujuan = (u.role === 'seller' || u.role === 'admin')
        ? 'dashboard-penjual.html'
        : 'index.html';
      window.location.replace(tujuan);
    }
  }

  function tamu() {
    tampilkan(false);

    if (halaman !== 'login' && perluAkun) {
      window.location.replace(alamatLogin());
    }
  }

  LK.sesiAman().then(function (u) {
    if (u && u.user_id) {
      masuk(u);
    } else {
      tamu();
    }
  });
})();