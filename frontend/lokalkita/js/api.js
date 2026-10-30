/* LokalKita - helper bersama. Hanya fetch ke API PHP; tanpa token/secret di sini. */
(function (w) {
  'use strict';
  var BASE = 'api/'; // ubah di satu tempat ini jika folder API berbeda
  var fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

  function urai(res) {
    if (res.status === 401) { throw new Error('Sesi berakhir. Silakan masuk lagi.'); }
    return res.json().catch(function () {
      throw new Error('Respons server bukan JSON yang valid (HTTP ' + res.status + ').');
    }).then(function (j) {
      if (!res.ok || !j || j.ok !== true) {
        throw new Error((j && j.message) || 'Permintaan gagal (HTTP ' + res.status + ').');
      }
      return j.data; // format API: {ok, data, message}
    });
  }
  function jaringan(e) {
    if (e && e.name === 'AbortError') { throw new Error('Server terlalu lama merespons. Coba lagi.'); }
    if (e instanceof TypeError) { throw new Error('Tidak bisa terhubung ke server. Periksa koneksi internet.'); }
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
    return minta(BASE + path, { credentials: 'same-origin', headers: { 'Accept': 'application/json' } })
      .then(urai).catch(jaringan);
  }
  function apiPost(path, body) {
    return minta(BASE + path, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body || {})
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
  w.LK = { apiGet: apiGet, apiPost: apiPost, rupiah: rupiah, el: el, persen: persen, tanggal: tanggal, bulan: bulan, angka: angka, status: status, ulang: ulang };
})(window);
