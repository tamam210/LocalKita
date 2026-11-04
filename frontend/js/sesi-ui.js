(function () {
  'use strict';

  var body = document.body;
  var perluAkun = body.getAttribute('data-perlu-akun');
  var halaman = body.getAttribute('data-halaman') || '';
  var itemAkun = document.querySelectorAll('[data-akun]');
  var itemTamu = document.querySelectorAll('[data-tamu]');
  var itemPembeli = document.querySelectorAll('[data-pembeli]');
  var itemPenjual = document.querySelectorAll('[data-penjual]');
  var urutRiwayatKey = 'lokalkita_urut_riwayat';

  function initProfilDropdown() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-profil-toggle]'), function (btn) {
      var wrap = btn.closest('.menu-profil');
      if (!wrap) return;
      var dd = wrap.querySelector('[data-dropdown]');
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (!dd) return;
        var terbuka = !dd.hidden;
        Array.prototype.forEach.call(document.querySelectorAll('.dropdown-profil'), function (d) { d.hidden = true; });
        Array.prototype.forEach.call(document.querySelectorAll('[data-profil-toggle]'), function (b) { b.setAttribute('aria-expanded', 'false'); });
        if (!terbuka) {
          dd.hidden = false;
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.menu-profil')) {
        Array.prototype.forEach.call(document.querySelectorAll('.dropdown-profil'), function (d) { d.hidden = true; });
        Array.prototype.forEach.call(document.querySelectorAll('[data-profil-toggle]'), function (b) { b.setAttribute('aria-expanded', 'false'); });
      }
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-urut-riwayat]'), function (btn) {
      var saved = localStorage.getItem(urutRiwayatKey) || 'desc';
      btn.textContent = saved === 'asc' ? 'Urutkan Riwayat: Sedikit → Terbanyak' : 'Urutkan Riwayat: Terbanyak → Sedikit';
      btn.addEventListener('click', function () {
        var cur = localStorage.getItem(urutRiwayatKey) || 'desc';
        var next = cur === 'desc' ? 'asc' : 'desc';
        localStorage.setItem(urutRiwayatKey, next);
        btn.textContent = next === 'asc' ? 'Urutkan Riwayat: Sedikit → Terbanyak' : 'Urutkan Riwayat: Terbanyak → Sedikit';
        try { document.dispatchEvent(new CustomEvent('lk:urut-riwayat', { detail: { mode: next } })); } catch(e){}
        var dd = btn.closest('.dropdown-profil');
        if (dd) dd.hidden = true;
      });
    });
  }

  function tampilkan(isAkun, role) {
    Array.prototype.forEach.call(itemAkun, function (el) {
      el.hidden = !isAkun;
    });
    Array.prototype.forEach.call(itemTamu, function (el) {
      el.hidden = isAkun;
    });
    Array.prototype.forEach.call(itemPembeli, function (el) {
      el.hidden = !(isAkun && role === 'buyer');
    });
    Array.prototype.forEach.call(itemPenjual, function (el) {
      el.hidden = !(isAkun && (role === 'seller' || role === 'admin'));
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
    tampilkan(true, u.role);
    pasangKeluar();
    initProfilDropdown();

    Array.prototype.forEach.call(document.querySelectorAll('[data-nama-user]'), function (el) {
      el.textContent = u.name || u.username || 'Pengguna';
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-email-user]'), function (el) {
      el.textContent = u.email || '-';
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-avatar]'), function (el) {
    el.textContent = (u.name || u.username || 'U').trim().charAt(0).toUpperCase();
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-poin-nav]'), function (el) {
    if (!el.textContent || el.textContent.trim() === '') el.textContent = '0';
  });
  // Untuk badge poin di dropdown
  Array.prototype.forEach.call(document.querySelectorAll('.badge-poin[data-poin-nav]'), function (el) {
    if (!el.textContent || el.textContent.trim() === '') el.textContent = '0';
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
    tampilkan(false, null);

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
