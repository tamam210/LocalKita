/* LokalKita - helper bersama. Hanya fetch ke API PHP; tanpa token/secret di sini. */
(function (w) {
  'use strict';
  // Kalau frontend dibuka dari origin yang sama dengan API
  // (http://localhost:8000/frontend/), pakai jalur relatif supaya
  // bebas CORS dan cookie sesi tetap terkirim.
  var BASE = location.origin === 'http://localhost:8000'
    ? '/backend/api/'
    : 'http://localhost:8000/backend/api/';
  var fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
  var sesiCache = null;
  
  function urai(res) {
    if (res.status === 401) {
      sesiCache = null;
      throw new Error ('Sesi berakhir. Silakan masuk lagi.');
    }
    return res.json().catch(function () {
      throw new Error('Respons server bukan JSON yang valid (HTTP ' + res.status + ').');
    }).then(function (j) {
      if (!res.ok || !j || j.ok !== true) {
        throw new Error((j && j.message) || 'Permintaan gagal (HTTP ' + res.status + ').');
      }
      return j.data;
    });
  }

  function jaringan(e) {
    if (e && e.name === 'AbortError') { throw new Error('Server terlalu lama merespons. Coba lagi.'); }
    if (e instanceof TypeError) {
      throw new Error('Tidak bisa menghubungi API. Pastikan backend berjalan dan buka aplikasi lewat http://localhost:8000/frontend/.');
    }
    throw e;
  }
  // fetch dengan batas waktu 15 detik supaya loading tidak menggantung selamanya
  function minta(url, opts) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var t = null;
    if (ctl) { opts.signal = ctl.signal; t = setTimeout(function () { ctl.abort(); }, 15000); }
    return fetch(url, opts).then(function (r) { clearTimeout(t); return r; }, function (e) { clearTimeout(t); throw e; });
  }
   function apiGet(path) {
    return minta(BASE + path, {
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    }).then(urai).catch(jaringan);
  }

  function apiPost(path, body) {
    return minta(BASE + path, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body || {})
    }).then(urai).catch(jaringan);
  }

 function apiUpload(path, fields) {
    var fd = new FormData();
    Object.keys(fields || {}).forEach(function (k) {
      fd.append(k, fields[k]);
    });
    return minta(BASE + path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Accept': 'application/json' },
      body: fd
    }).then(urai).catch(jaringan);
  }

  function rupiah(n) { n = Number(n); return isFinite(n) ? fmt.format(n) : fmt.format(0); }
  // Buat elemen DOM tanpa innerHTML (aman dari XSS). attrs.text = textContent.
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') { e.className = attrs[k]; }
      else if (k === 'text') { e.textContent = attrs[k]; }
      else { e.setAttribute(k, attrs[k]); }
    });
    (children || []).forEach(function (c) { if (c) { e.appendChild(c); } });
    return e;
  }
  function persen(n) { n = Number(n); return isFinite(n) ? n.toFixed(1).replace('.', ',') + '%' : '-'; }
  function tanggal(s) {
    var d = new Date(String(s || '').replace(' ', 'T'));
    return isNaN(d) ? '-' : d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  }
  function bulan(y, m) {
    var d = new Date(Number(y), Number(m) - 1, 1);
    return isNaN(d) ? '-' : d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }
  function angka(label, nilai) {
    return el('div', { 'class': 'kartu-angka' }, [el('span', { 'class': 'label', text: label }), el('strong', { 'class': 'nilai', text: nilai })]);
  }
  // jenis: memuat | galat | kosong
  function status(box, jenis, judul, pesan, aksi) {
    box.replaceChildren(el('div', { 'class': 'status' + (jenis === 'galat' ? ' status-galat' : ''), role: jenis === 'galat' ? 'alert' : 'status' },
      [el('h3', { text: judul }), pesan ? el('p', { text: pesan }) : null, aksi || null]));
  }
  function ulang(fn) {
    var b = el('button', { type: 'button', 'class': 'tombol tombol-garis', text: 'Coba lagi' });
    b.addEventListener('click', fn); return b;
  }

  /* ---------- Popup konfirmasi + notifikasi (tanpa innerHTML) ---------- */
  var nomorPopup = 0;
  var popupAktif = null;

  // LK.konfirmasi({judul, pesan, teksYa, teksTidak, jenis}) -> Promise<boolean>
  function popup(opsi) {
    opsi = opsi || {};
    return new Promise(function (selesai) {
      if (popupAktif) { popupAktif.tutup(false); }

      var fokusAsal = document.activeElement;
      var id = 'lk-popup-' + (++nomorPopup);
      var idJudul = id + '-judul', idPesan = id + '-pesan';
      var adaPesan = !!opsi.pesan;
      var jenis = opsi.jenis === 'bahaya' ? 'bahaya' : 'tanya';

      var batal = el('button', { type: 'button', 'class': 'tombol tombol-garis', text: opsi.teksTidak || 'Batal' });
      var lanjut = el('button', { type: 'button', 'class': 'tombol' + (jenis === 'bahaya' ? ' tombol-bahaya' : ''), text: opsi.teksYa || 'Ya, lanjutkan' });
      var aksi = el('div', { 'class': 'popup-aksi' }, opsi.tanpaBatal ? [lanjut] : [batal, lanjut]);

      var isi = [
        el('p', { 'class': 'eyebrow', text: opsi.label || 'Konfirmasi' }),
        el('h2', { id: idJudul, text: opsi.judul || 'Lanjutkan tindakan?' })
      ];
      if (adaPesan) { isi.push(el('p', { id: idPesan, text: opsi.pesan })); }
      isi.push(aksi);

      var dialog = el('div', {
        'class': 'popup kaca', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': idJudul
      }, isi);
      if (adaPesan) { dialog.setAttribute('aria-describedby', idPesan); }

      var latar = el('div', { 'class': 'popup-latar' }, [dialog]);
      var gulirAsal = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      function tutup(hasil) {
        if (!latar.parentNode) { return; }
        document.removeEventListener('keydown', kunci, true);
        latar.parentNode.removeChild(latar);
        document.body.style.overflow = gulirAsal;
        if (popupAktif && popupAktif.latar === latar) { popupAktif = null; }
        if (fokusAsal && typeof fokusAsal.focus === 'function') { fokusAsal.focus(); }
        selesai(hasil);
      }

      // Esc untuk membatalkan, Tab berputar di dalam dialog.
      function kunci(e) {
        if (e.key === 'Escape') { e.preventDefault(); tutup(false); return; }
        if (e.key !== 'Tab') { return; }
        var fokusable = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!fokusable.length) { return; }
        var pertama = fokusable[0], terakhir = fokusable[fokusable.length - 1];
        if (e.shiftKey && document.activeElement === pertama) { e.preventDefault(); terakhir.focus(); }
        else if (!e.shiftKey && document.activeElement === terakhir) { e.preventDefault(); pertama.focus(); }
      }

      batal.addEventListener('click', function () { tutup(false); });
      lanjut.addEventListener('click', function () { tutup(true); });
      latar.addEventListener('mousedown', function (e) { if (e.target === latar) { tutup(false); } });

      document.addEventListener('keydown', kunci, true);
      document.body.appendChild(latar);
      popupAktif = { latar: latar, tutup: tutup };
      (opsi.tanpaBatal || jenis !== 'bahaya' ? lanjut : batal).focus();
    });
  }

  function konfirmasi(opsi) {
    return popup(typeof opsi === 'string' ? { judul: opsi } : opsi);
  }

  // LK.notif(pesan, jenis, judul) dengan jenis: sukses | bahaya | info
  var wadahToast = null;
  function ambilWadahToast() {
    if (wadahToast && wadahToast.parentNode) { return wadahToast; }
    wadahToast = el('div', { 'class': 'toast-wadah' });
    document.body.appendChild(wadahToast);
    return wadahToast;
  }

  function notif(pesan, jenis, judul) {
    jenis = jenis === 'bahaya' || jenis === 'info' ? jenis : 'sukses';
    var judulBaku = jenis === 'bahaya' ? 'Gagal' : (jenis === 'info' ? 'Info' : 'Berhasil');
    var wadah = ambilWadahToast();

    var tutupBtn = el('button', { type: 'button', 'class': 'toast-tutup', 'aria-label': 'Tutup notifikasi', text: '\u00D7' });
    var kotak = el('div', {
      'class': 'toast toast-' + jenis,
      role: jenis === 'bahaya' ? 'alert' : 'status',
      'aria-live': jenis === 'bahaya' ? 'assertive' : 'polite',
      'aria-atomic': 'true'
    }, [
      el('span', { 'class': 'toast-tanda', 'aria-hidden': 'true' }),
      el('div', { 'class': 'toast-isi' }, [
        el('strong', { text: judul || judulBaku }),
        el('p', { text: String(pesan === null || pesan === undefined ? '' : pesan) })
      ]),
      tutupBtn
    ]);

    var waktu = null;
    function buang() {
      if (waktu) { clearTimeout(waktu); waktu = null; }
      if (!kotak.parentNode) { return; }
      kotak.classList.add('toast-keluar');
      setTimeout(function () { if (kotak.parentNode) { kotak.parentNode.removeChild(kotak); } }, 180);
    }
    function jadwalkan(ms) {
      if (waktu) { clearTimeout(waktu); }
      waktu = setTimeout(buang, ms);
    }

    tutupBtn.addEventListener('click', buang);
    kotak.addEventListener('mouseenter', function () { if (waktu) { clearTimeout(waktu); waktu = null; } });
    kotak.addEventListener('mouseleave', function () { jadwalkan(2500); });
    kotak.addEventListener('focusin', function () { if (waktu) { clearTimeout(waktu); waktu = null; } });
    kotak.addEventListener('focusout', function () { jadwalkan(2500); });

    wadah.appendChild(kotak);
    while (wadah.children.length > 4) { wadah.removeChild(wadah.firstChild); }
    jadwalkan(jenis === 'bahaya' ? 7000 : 5000);
    return kotak;
  }

   function sesi(paksa) {
    if (sesiCache && !paksa) { return Promise.resolve(sesiCache); }
    return apiGet('auth.php?action=me').then(function (u) {
      sesiCache = u;
      return u;
    });
  }
   // Sesi opsional: kalau belum login / server mati, anggap tamu.
  function sesiAman() {
    return sesi().catch(function () { return null; });
  }

  // Logout. Tetap lanjut ke halaman tamu walau server tidak merespons.
  function keluar() {
    return apiPost('auth.php?action=logout', {})
      .catch(function () { return null; })
      .then(function () { sesiCache = null; });
  }
w.LK = {
    apiGet: apiGet, apiPost: apiPost, rupiah: rupiah, el: el, persen: persen,
    tanggal: tanggal, bulan: bulan, angka: angka, status: status, ulang: ulang,
    popup: popup, konfirmasi: konfirmasi, notif: notif, sesi: sesi, sesiAman: sesiAman, keluar: keluar
  };
})(window);