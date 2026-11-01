/* login.html. Sesi dikelola server (cookie sesi PHP); frontend tidak menyimpan token atau kata sandi. */
(function () {
  'use strict';
  // Nama field adalah asumsi untuk api/auth.php; cocokkan dengan backend.
  var FIELD = {
    nama: { label: 'Nama lengkap', name: 'nama', type: 'text', ac: 'name', max: 60 },
    email: { label: 'Email', name: 'email', type: 'email', ac: 'email', max: 120 },
    username: { label: 'Username', name: 'username', type: 'text', ac: 'username', min: 3, max: 30, pattern: '[A-Za-z0-9_.]+', hint: '3-30 karakter: huruf, angka, titik, atau garis bawah.' },
    // khusus login: tanpa pattern/minlength agar username lama tetap bisa masuk
    usernameMasuk: { label: 'Username', name: 'username', type: 'text', ac: 'username', max: 30 },
    jenis: { label: 'Jenis jualan', name: 'jenis_jualan', type: 'select' },
    toko: { label: 'Nama toko', name: 'nama_toko', type: 'text', ac: 'organization', max: 60 },
    sandi: { label: 'Kata sandi', name: 'password', type: 'password' }
  };
  // Jenis jualan (nilai = yang dikirim ke server sebagai jenis_jualan; contoh tampil sebagai petunjuk).
  var JENIS = [
    { nilai: 'makanan', label: 'Makanan', contoh: 'nasi, camilan, kue, gorengan, dan lain-lain.' },
    { nilai: 'minuman', label: 'Minuman', contoh: 'es teh, kopi, jus, susu, dan lain-lain.' },
    { nilai: 'barang', label: 'Barang', contoh: 'pakaian, aksesori, sembako, alat tulis, dan lain-lain.' },
    { nilai: 'jasa', label: 'Jasa', contoh: 'laundry, fotokopi, servis, potong rambut, dan lain-lain.' },
    { nilai: 'lain-lain', label: 'Lain-lain', contoh: 'tanaman, hewan ternak, produk digital, dan usaha lainnya.' }
  ];
  // Login sama untuk kedua peran (username + sandi); form daftar berbeda per peran.
  var FORM = {
    pembeli: { masuk: ['usernameMasuk', 'sandi'], daftar: ['username', 'email', 'sandi'] },
    penjual: { masuk: ['usernameMasuk', 'sandi'], daftar: ['username', 'email', 'sandi', 'toko', 'jenis'] }
  };
  var INFO = {
    pembeli: 'Belanja produk UMKM lokal, kumpulkan poin, dan chat dengan penjual.',
    penjual: 'Kelola toko, hitung HPP, dan pantau laporan usaha.'
  };
  // Tujuan ditentukan oleh peran dari server, bukan dari tab yang dipilih.
  var TUJUAN = { pembeli: 'index.html', penjual: 'laporan.html' };
  var peran = 'pembeli', mode = 'masuk';
  var $peran = document.getElementById('pilih-peran'), $mode = document.getElementById('pilih-mode');
  var $form = document.getElementById('form-auth'), $kolom = document.getElementById('kolom-auth');
  var $info = document.getElementById('info-peran'), $pesan = document.getElementById('pesan-auth');
  var $kirim = document.getElementById('tombol-auth');

  function pilihan(f, id) {
    var opsi = [LK.el('option', { value: '', disabled: '', selected: '', text: 'Pilih ' + f.label.toLowerCase() })];
    JENIS.forEach(function (j) { opsi.push(LK.el('option', { value: j.nilai, text: j.label })); });
    return LK.el('select', { id: id, name: f.name, required: '' }, opsi);
  }
  function galat(t) { $pesan.textContent = t || ''; $pesan.hidden = !t; }
  function tandai(box, kunci, nilai) {
    Array.prototype.forEach.call(box.children, function (b) { b.setAttribute('aria-pressed', String(b.dataset[kunci] === nilai)); });
  }
  function render() {
    tandai($peran, 'peran', peran); tandai($mode, 'mode', mode);
    $info.textContent = INFO[peran]; galat('');
    $kolom.replaceChildren();
    FORM[peran][mode].forEach(function (k) {
      var f = FIELD[k], id = 'f-' + f.name, sandi = k === 'sandi';
      var a = { id: id, name: f.name, type: f.type, required: '', autocomplete: sandi ? (mode === 'masuk' ? 'current-password' : 'new-password') : f.ac };
      if (f.max) { a.maxlength = f.max; }
      if (f.min) { a.minlength = f.min; }
      if (f.pattern) { a.pattern = f.pattern; }
      if (sandi && mode === 'daftar') { a.minlength = 8; }
      var hint = f.hint || (sandi && mode === 'daftar' ? 'Minimal 8 karakter.' : '');
      var kontrol = f.type === 'select' ? pilihan(f, id) : LK.el('input', a);
      var kecil = hint || f.type === 'select' ? LK.el('small', { text: hint || 'Pilih jenis usaha tokomu.' }) : null;
      if (f.type === 'select') {
        kontrol.addEventListener('change', function () {
          var j = JENIS.filter(function (x) { return x.nilai === kontrol.value; })[0];
          kecil.textContent = j ? 'Contoh: ' + j.contoh : 'Pilih jenis usaha tokomu.';
        });
      }
      $kolom.appendChild(LK.el('div', { 'class': 'bidang' }, [LK.el('label', { 'for': id, text: f.label }), kontrol, kecil]));
    });
    $kirim.textContent = mode === 'masuk' ? 'Masuk' : (peran === 'penjual' ? 'Daftarkan toko' : 'Daftar');
  }
  $peran.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { peran = b.dataset.peran; render(); } });
  $mode.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { mode = b.dataset.mode; render(); } });

  $form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = { aksi: mode, peran: peran };
    FORM[peran][mode].forEach(function (k) {
      var v = $form.elements[FIELD[k].name].value;
      data[FIELD[k].name] = k === 'sandi' ? v : v.trim();
    });
    galat(''); $kirim.disabled = true;
    LK.apiPost('auth.php', data).then(function (d) {
      var tujuan = TUJUAN[d && d.role];
      if (!tujuan) { throw new Error('Peran akun tidak dikenali.'); }
      window.location.href = tujuan;
    }).catch(function (err) {
      galat(err.message); $form.elements.password.value = ''; $kirim.disabled = false;
    });
  });
  render();
})();
