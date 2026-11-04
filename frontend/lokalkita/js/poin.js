/* poin.html (B5). Membaca point_accounts, reward_products, conversations, messages lewat API. */
(function () {
  'use strict';
  var $s = document.getElementById('nilai-saldo'), $rw = document.getElementById('isi-reward'), $rv = document.getElementById('isi-riwayat');
  var $dc = document.getElementById('daftar-chat'), $ps = document.getElementById('isi-pesan'), $fc = document.getElementById('form-chat'), $pc = document.getElementById('pesan-chat');
  var saldo = 0, userId = null, cid = null;
  function th(t) { return LK.el('th', { scope: 'col', text: t }); }
  function td(t) { return LK.el('td', { text: t }); }

  function muat() {
    LK.status($rw, 'memuat', 'Memuat reward...');
    LK.status($rv, 'memuat', 'Memuat riwayat...');
    return LK.apiPost('poin.php', { aksi: 'ringkasan' }).then(function (d) {
      d = d || {}; saldo = Number(d.balance) || 0;
      $s.textContent = saldo.toLocaleString('id-ID') + ' poin';
      reward(Array.isArray(d.rewards) ? d.rewards : []);
      riwayat(Array.isArray(d.riwayat) ? d.riwayat : []);
    }).catch(function (e) {
      $s.textContent = '-'; $rv.replaceChildren();
      LK.status($rw, 'galat', 'Data poin gagal dimuat', e.message, LK.ulang(muat));
    });
  }
  function reward(list) {
    if (!list.length) { LK.status($rw, 'kosong', 'Belum ada reward', 'Reward muncul setelah penjual menambahkannya.'); return; }
    var g = LK.el('div', { 'class': 'grid-kartu' });
    list.forEach(function (r) {
      var perlu = Number(r.points_required) || 0, kuota = r.quota === null || r.quota === undefined ? NaN : Number(r.quota);
      var habis = isFinite(kuota) && kuota <= 0, kurang = saldo < perlu;
      var b = LK.el('button', { type: 'button', 'class': 'tombol', text: habis ? 'Kuota habis' : (kurang ? 'Poin kurang' : 'Tukar') });
      b.disabled = habis || kurang;
      b.addEventListener('click', function () { tukar(r, b); });
      g.appendChild(LK.el('article', { 'class': 'kartu-angka' }, [
        LK.el('h3', { text: r.name || 'Reward' }),
        LK.el('span', { 'class': 'label', text: perlu.toLocaleString('id-ID') + ' poin' + (Number(r.cash_addon) > 0 ? ' + ' + LK.rupiah(r.cash_addon) : '') }),
        isFinite(kuota) ? LK.el('span', { 'class': 'label', text: 'Kuota ' + kuota }) : null, b]));
    });
    $rw.replaceChildren(g);
  }
  function tukar(r, b) {
    if (!window.confirm('Tukar ' + (Number(r.points_required) || 0) + ' poin untuk ' + (r.name || 'reward') + '?')) { return; }
    b.disabled = true;
    LK.apiPost('poin.php', { aksi: 'tukar', reward_id: r.reward_id }).then(muat).catch(function (e) {
      window.alert('Gagal menukar: ' + e.message); b.disabled = false;
    });
  }
  function riwayat(list) {
    if (!list.length) { LK.status($rv, 'kosong', 'Belum ada riwayat', 'Riwayat poin muncul setelah ada transaksi.'); return; }
    var tb = LK.el('tbody');
    list.forEach(function (x) {
      var p = Number(x.points) || 0;
      tb.appendChild(LK.el('tr', {}, [td(LK.tanggal(x.created_at)), td(x.keterangan || '-'), td((p > 0 ? '+' : '') + p)]));
    });
    $rv.replaceChildren(LK.el('table', {}, [LK.el('caption', { 'class': 'sr-only', text: 'Riwayat poin' }),
      LK.el('thead', {}, [LK.el('tr', {}, [th('Tanggal'), th('Keterangan'), th('Poin')])]), tb]));
  }

  function daftarChat(cs) {
    $dc.replaceChildren();
    cs.forEach(function (c, i) {
      var b = LK.el('button', { type: 'button', 'class': 'chip', 'aria-pressed': String(String(c.conversation_id) === String(cid)),
        text: 'Percakapan ' + (i + 1) + ' - ' + LK.tanggal(c.last_message_at) });
      b.addEventListener('click', function () {
        Array.prototype.forEach.call($dc.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        muatChat(c.conversation_id);
      });
      $dc.appendChild(b);
    });
  }
  function pesan(list) {
    if (!list.length) { LK.status($ps, 'kosong', 'Belum ada pesan', 'Tulis pesan pertama di bawah.'); return; }
    var w = LK.el('div', { 'class': 'pesan-daftar' });
    list.forEach(function (m) {
      var saya = userId !== null && userId !== undefined && String(m.sender_user_id) === String(userId);
      w.appendChild(LK.el('div', { 'class': 'gelembung' + (saya ? ' saya' : '') }, [
        LK.el('p', { text: m.body || '' }), saya ? LK.el('small', { text: m.read_at ? 'Dibaca' : 'Terkirim' }) : null]));
    });
    $ps.replaceChildren(w); w.scrollTop = w.scrollHeight;
  }
  function muatChat(id) {
    LK.status($ps, 'memuat', 'Memuat percakapan...');
    return LK.apiGet('chat.php' + (id ? '?conversation_id=' + encodeURIComponent(id) : '')).then(function (d) {
      d = d || {}; userId = d.user_id; var cs = Array.isArray(d.conversations) ? d.conversations : [];
      cid = d.conversation_id || id || (cs[0] && cs[0].conversation_id) || null;
      if (!id) {
        if (!cs.length) { $dc.replaceChildren(); }
        else { daftarChat(cs); }
      }
      pesan(Array.isArray(d.messages) ? d.messages : []);
      $fc.elements.body.disabled = !cid; $fc.querySelector('button').disabled = !cid;
    }).catch(function (e) { LK.status($ps, 'galat', 'Chat gagal dimuat', e.message, LK.ulang(function () { muatChat(id); })); });
  }
  $fc.addEventListener('submit', function (e) {
    e.preventDefault();
    var body = $fc.elements.body.value.trim(); if (!body || !cid) { return; }
    var tb = $fc.querySelector('button'); tb.disabled = true; $pc.hidden = true;
    LK.apiPost('chat.php', { conversation_id: cid, body: body }).then(function () {
      $fc.elements.body.value = ''; return muatChat(cid);
    }).catch(function (err) { $pc.textContent = 'Pesan gagal dikirim: ' + err.message; $pc.hidden = false; })
      .then(function () { tb.disabled = !cid; });
  });
  muat(); muatChat();
})();
