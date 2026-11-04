(function () {
  'use strict';
  function isi() {
    LK.sesiAman().then(function (u) {
      if (!u) { window.location.href = 'login.html'; return; }
      var nama = u.name || u.username || 'Pengguna';
      var email = u.email || '-';
      var role = u.role || '-';
      var huruf = nama.trim().charAt(0).toUpperCase();
      var elAva = document.getElementById('profil-avatar');
      if (elAva) elAva.textContent = huruf;
      var elNama = document.getElementById('profil-nama');
      if (elNama) elNama.textContent = nama;
      var elRole = document.getElementById('profil-role');
      if (elRole) elRole.textContent = role === 'seller' ? 'Penjual' : (role === 'admin' ? 'Admin' : 'Pembeli');
      var elEmail = document.getElementById('profil-email');
      if (elEmail) elEmail.textContent = email;
      var inNama = document.getElementById('profil-nama-input');
      if (inNama) inNama.value = nama;
      var inEmail = document.getElementById('profil-email-input');
      if (inEmail) inEmail.value = email;
      var inRole = document.getElementById('profil-role-input');
      if (inRole) inRole.value = role === 'seller' ? 'Penjual' : (role === 'admin' ? 'Admin' : 'Pembeli');
    });
  }
  document.addEventListener('DOMContentLoaded', isi);
})();
