(function () {
  'use strict';
  var $s = document.getElementById('nilai-saldo'), $rw = document.getElementById('isi-reward'), $rv = document.getElementById('isi-riwayat');
  var $dc = document.getElementById('daftar-chat'), $ps = document.getElementById('isi-pesan'), $fc = document.getElementById('form-chat'), $pc = document.getElementById('pesan-chat');
  var saldo = 0, userId = null, cid = null, storeId = null;

  function th(t) { return LK.el('th', { scope: 'col', text: t }); }
  function td(t) { return LK.el('td', { text: t }); }

  function tokoDariUrl() {
    var m = /[?&]store_id=([^&]+)/.exec(window.location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }

  // Toko diambil dari ?store_id= (tautan "Chat penjual" di kartu produk) atau
  // dari sesi penjual. Tidak ada lagi toko demo diam-diam.
  function siapkanToko() {
    if (storeId) { return Promise.resolve(storeId); }
    return LK.sesi().then(function (u) {
      if (!u || !u.user_id) {
        throw new Error('Masuk dulu untuk melihat poin dan chat.');
      }
      userId = u.user_id;
      storeId = tokoDariUrl() || u.store_id || null;
      if (!storeId) {
        throw new Error('Toko belum dipilih. Buka halaman ini lewat tombol "Chat penjual" di kartu produk.');
      }
      return storeId;
    });
  }

  function muat() {
    LK.status($rw, 'memuat', 'Memuat reward...');
    LK.status($rv, 'memuat', 'Memuat riwayat...');

    return siapkanToko().then(function (id) {
      return Promise.all([
        LK.apiGet('poin.php?action=balance&store_id=' + encodeURIComponent(id)),
        LK.apiGet('poin.php?action=rewards&store_id=' + encodeURIComponent(id)),
        LK.apiGet('poin.php?action=history&store_id=' + encodeURIComponent(id) + '&page=1&per_page=20')
      ]);
    }).then(function (hasil) {
      var b = hasil[0] || {}, r = hasil[1] || {}, h = hasil[2] || {};
      saldo = Number(b.available_balance !== undefined ? b.available_balance : b.balance) || 0;
      $s.textContent = saldo.toLocaleString('id-ID') + ' poin';
      reward(Array.isArray(r.items) ? r.items : []);
      riwayat(Array.isArray(h.items) ? h.items : []);
    }).catch(function (e) {
      $s.textContent = '-';
      $rv.replaceChildren();
      LK.status($rw, 'galat', 'Data poin gagal dimuat', e.message, LK.ulang(muat));
    });
  }

  function reward(list) {
    if (!list.length) {
      LK.status($rw, 'kosong', 'Belum ada reward', 'Reward muncul setelah penjual menambahkannya.');
      return;
    }
    var g = LK.el('div', { 'class': 'grid-kartu' });
    list.forEach(function (r) {
      var perlu = Number(r.points_required) || 0;
      var kuota = r.quota === null || r.quota === undefined ? NaN : Number(r.quota);
      var habis = isFinite(kuota) && kuota <= 0;
      var kurang = saldo < perlu;
      var b = LK.el('button', {
        type: 'button',
        'class': 'tombol',
        text: habis ? 'Kuota habis' : (kurang ? 'Poin kurang' : 'Tukar')
      });
      b.disabled = habis || kurang;
      b.addEventListener('click', function () { tukar(r, b); });
      g.appendChild(LK.el('article', { 'class': 'kartu-angka' }, [
        LK.el('h3', { text: r.name || 'Reward' }),
        LK.el('span', {
          'class': 'label',
          text: perlu.toLocaleString('id-ID') + ' poin' +
            (Number(r.cash_addon) > 0 ? ' + ' + LK.rupiah(r.cash_addon) : '')
        }),
        isFinite(kuota) ? LK.el('span', { 'class': 'label', text: 'Kuota ' + kuota }) : null,
        b
      ]));
    });
    $rw.replaceChildren(g);
  }

  function tukar(r, b) {
    var perlu = Number(r.points_required) || 0;

    LK.konfirmasi({
      label: 'Tukar poin',
      judul: 'Tukar ' + perlu.toLocaleString('id-ID') + ' poin?',
      pesan: 'Poin akan dipotong untuk ' + (r.name || 'reward') + '.',
      teksYa: 'Ya, tukar'
    }).then(function (lanjut) {
      if (!lanjut) { return; }
      b.disabled = true;

      siapkanToko().then(function (id) {
        return LK.apiPost('poin.php', {
          action: 'redeem',
          store_id: id,
          reward_id: r.reward_id,
          quantity: 1
        });
      }).then(function () {
        LK.notif('Poin berhasil ditukar dengan ' + (r.name || 'reward') + '.', 'sukses', 'Penukaran berhasil');
        return muat();
      }).catch(function (e) {
        LK.notif('Gagal menukar: ' + e.message, 'bahaya', 'Penukaran gagal');
        b.disabled = false;
      });
    });
  }

  function riwayat(list) {
    if (!list.length) {
      LK.status($rv, 'kosong', 'Belum ada riwayat', 'Riwayat poin muncul setelah ada transaksi.');
      return;
    }

    var JENIS = {
      earn: 'Poin masuk',
      redeem: 'Poin ditukar',
      adjust: 'Penyesuaian',
      expire: 'Poin hangus'
    };

    var tb = LK.el('tbody');
    list.forEach(function (x) {
      var p = Number(x.points) || 0;
      var ket = JENIS[x.type] || x.type || '-';
      tb.appendChild(LK.el('tr', {}, [
        td(LK.tanggal(x.created_at)),
        td(ket),
        td((p > 0 ? '+' : '') + p)
      ]));
    });

    $rv.replaceChildren(LK.el('table', {}, [
      LK.el('caption', { 'class': 'sr-only', text: 'Riwayat poin' }),
      LK.el('thead', {}, [LK.el('tr', {}, [th('Tanggal'), th('Keterangan'), th('Poin')])]),
      tb
    ]));
  }

  function potong(t, n) {
    t = String(t || '').replace(/\s+/g, ' ').trim();
    return t.length > n ? t.slice(0, n - 1) + '…' : t;
  }

  function daftarChat(cs) {
    $dc.replaceChildren();
    cs.forEach(function (c, i) {
      var nama = c.store_name || c.buyer_name || ('Percakapan ' + (i + 1));
      var belum = Number(c.unread_count) || 0;
      var akhir = potong(c.last_message, 40);
      var teks = nama +
        (akhir ? ': ' + akhir : '') +
        (belum > 0 ? ' (' + belum + ')' : '');
      var b = LK.el('button', {
        type: 'button',
        'class': 'chip',
        'aria-pressed': String(String(c.conversation_id) === String(cid)),
        title: c.last_message || nama,
        text: teks
      });
      b.addEventListener('click', function () {
        Array.prototype.forEach.call($dc.children, function (x) {
          x.setAttribute('aria-pressed', String(x === b));
        });
        muatChat(c.conversation_id);
      });
      $dc.appendChild(b);
    });
  }

  function pesan(list) {
    if (!list.length) {
      LK.status($ps, 'kosong', 'Belum ada pesan', 'Tulis pesan pertama di bawah.');
      return;
    }
    var w = LK.el('div', { 'class': 'pesan-daftar' });
    list.forEach(function (m) {
      var saya = userId !== null && userId !== undefined &&
        String(m.sender_user_id) === String(userId);
      w.appendChild(LK.el('div', { 'class': 'gelembung' + (saya ? ' saya' : '') }, [
        LK.el('p', { text: m.body || '' }),
        saya ? LK.el('small', { text: m.read_at ? 'Dibaca' : 'Terkirim' }) : null
      ]));
    });
    $ps.replaceChildren(w);
    w.scrollTop = w.scrollHeight;
  }

  function muatChat(id) {
    if (id) { cid = id; }
    LK.status($ps, 'memuat', 'Memuat percakapan...');

    return siapkanToko().then(function () {
      if (id) {
        return LK.apiGet('chat.php?action=messages&conversation_id=' + encodeURIComponent(id)).then(function (d) {
          pesan(Array.isArray(d.items) ? d.items : []);
          return LK.apiPost('chat.php', {
            action: 'read',
            conversation_id: id
          }).catch(function () {});
        });
      }

      return LK.apiGet('chat.php?action=conversations&store_id=' + encodeURIComponent(storeId)).then(function (d) {
        var cs = Array.isArray(d.items) ? d.items : [];
        daftarChat(cs);

        if (!cs.length) {
          cid = null;
          pesan([]);
          return;
        }

        var cocok = cs.filter(function (c) {
          return String(c.conversation_id) === String(cid);
        })[0];
        cid = cocok ? cocok.conversation_id : cs[0].conversation_id;
        return muatChat(cid);
      });
    }).catch(function (e) {
      LK.status($ps, 'galat', 'Chat gagal dimuat', e.message, LK.ulang(function () { muatChat(id); }));
    }).then(function () {
      var bisa = !!storeId;
      $fc.elements.body.disabled = !bisa;
      $fc.querySelector('button').disabled = !bisa;
    });
  }

  $fc.addEventListener('submit', function (e) {
    e.preventDefault();
    var body = $fc.elements.body.value.trim();
    if (!body) { return; }

    var tb = $fc.querySelector('button');
    tb.disabled = true;
    $pc.hidden = true;

    siapkanToko().then(function () {
      if (cid) { return cid; }
      return LK.apiPost('chat.php', {
        action: 'create',
        store_id: storeId,
        order_id: null
      }).then(function (d) {
        if (!d || !d.conversation_id) {
          throw new Error('Percakapan tidak berhasil dibuat.');
        }
        cid = d.conversation_id;
        return cid;
      });
    }).then(function (id) {
      return LK.apiPost('chat.php', {
        action: 'send',
        conversation_id: id,
        type: 'text',
        body: body
      });
    }).then(function () {
      $fc.elements.body.value = '';
      return muatChat();
    }).catch(function (err) {
      $pc.textContent = 'Pesan gagal dikirim: ' + err.message;
      $pc.hidden = false;
    }).then(function () {
      tb.disabled = !storeId;
    });
  });

  muat();
  muatChat();
})();
