(function () {
  var $form = document.getElementById('form-login');
  var $peran = document.getElementById('pilih-peran');
  var $mode = document.getElementById('pilih-mode');
  var $email = document.getElementById('email');
  var $pass = document.getElementById('password');
  var $kirim = document.getElementById('kirim');
  var $galat = document.getElementById('galat');

  var peran = 'pembeli';
  var mode = 'login';

  var TUJUAN = {
    pembeli: 'index.html',
    penjual: 'dashboard-penjual.html'
  };

  function galat(pesan) {
    if (!pesan) {
      $galat.classList.add('hidden');
      $galat.textContent = '';
      return;
    }
    $galat.textContent = pesan;
    $galat.classList.remove('hidden');
  }

  function tujuanAman(role) {
    var m = /[?&]lanjut=([^&]+)/.exec(window.location.search);
    var lanjut = m ? decodeURIComponent(m[1]) : '';

    // Hanya izinkan halaman LokalKita, bukan URL luar.
    if (/^(index|dashboard-penjual|hpp|poin|laporan)\.html(\?[^#]*)?$/.test(lanjut)) {
      return lanjut;
    }

    return TUJUAN[role] || null;
  }

  function render() {
    var $btnPeran = $peran.querySelectorAll('button');
    for (var i = 0; i < $btnPeran.length; i++) {
      $btnPeran[i].classList.toggle('active', $btnPeran[i].dataset.peran === peran);
    }
    var $btnMode = $mode.querySelectorAll('button');
    for (var j = 0; j < $btnMode.length; j++) {
      $btnMode[j].classList.toggle('active', $btnMode[j].dataset.mode === mode);
    }
    $kirim.textContent = mode === 'login' ? 'Masuk' : 'Daftar';
  }

  $peran.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b) {
      peran = b.dataset.peran;
      render();
    }
  });

  $mode.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b) {
      mode = b.dataset.mode;
      render();
    }
  });

  $form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = {
      role: peran,
      email: $email.value.trim(),
      password: $pass.value
    };
    if (!data.email || !data.password) {
      galat('Email dan kata sandi wajib diisi.');
      return;
    }
    galat('');
    $kirim.disabled = true;

    LK.apiPost('auth.php?action=login', data).then(function (d) {
      var tujuan = tujuanAman(d && d.role);
      if (!tujuan) {
        throw new Error('Peran akun tidak dikenali.');
      }
      window.location.href = tujuan;
    }).catch(function (err) {
      galat(err.message);
      $form.elements.password.value = '';
      $kirim.disabled = false;
    });
  });

  render();
})();
