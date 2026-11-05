(function () {
  'use strict';
  var $s = document.getElementById('nilai-saldo'), $rw = document.getElementById('isi-reward'), $rv = document.getElementById('isi-riwayat');
  var $dc = document.getElementById('daftar-chat'), $ps = document.getElementById('isi-pesan'), $fc = document.getElementById('form-chat'), $pc = document.getElementById('pesan-chat');
  var $pilih = document.getElementById('pilih-toko-poin'), $toko = document.getElementById('toko-poin'), $judul = document.getElementById('judul-poin');
  var $saldo = document.getElementById('saldo-poin'), $reward = document.getElementById('daftar-reward'), $riwayat = document.getElementById('riwayat-poin');
  var saldo = 0, userId = null, cid = null, storeId = null, role = null;

  function th(t) { return LK.el('th', { scope: 'col', text: t }); }
  function td(t) { return LK.el('td', { text: t }); }

  function tokoDariUrl() {
    var m = /[?&]store_id=([^&]+)/.exec(window.location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function aturTampilan(peran) {
    var pembeli = peran === 'buyer';
    [$saldo, $reward, $riwayat].forEach(function (bagian) {
      if (bagian) { bagian.hidden = !pembeli; }
    });
    if ($pilih) { $pilih.hidden = !pembeli; }
    if ($judul) { $judul.textContent = pembeli ? 'Poin Pelanggan' : 'Chat'; }
    document.title = (pembeli ? 'Poin' : 'Chat') + ' - LokalKita';
  }

  function bisaKirim() {
    return !!storeId && (role === 'buyer' || !!cid);
  }

  function aturTombolChat() {
    var bisa = bisaKirim();
    $fc.elements.body.disabled = !bisa;
    $fc.querySelector('button').disabled = !bisa;
  }

  function muatToko() {
    return LK.apiGet('poin.php?action=stores').then(function (d) {
      var items = Array.isArray(d.items) ? d.items : [];
      if (!items.length) {
        throw new Error('Belum ada toko dengan poin aktif.');
      }

      var dariUrl = tokoDariUrl();
      var dipilih = items.filter(function (x) {
        return String(x.store_id) === String(dariUrl);
      })[0] || items[0];

      storeId = dipilih.store_id;
      $toko.replaceChildren.apply($toko, items.map(function (x) {
        var poin = Number(x.available_balance) || 0;
        return LK.el('option', {
          value: x.store_id,
          text: (x.store_name || 'Toko') + ' · ' + poin.toLocaleString('id-ID') + ' poin'
        });
      }));
      $toko.value = storeId;
      if ($pilih) { $pilih.hidden = items.length <= 1; }
      return storeId;
    });
  }

  function muatPoin() {
    if (role !== 'buyer' || !storeId) { return Promise.resolve(); }

    $s.textContent = 'Memuat...';
    LK.status($rw, 'memuat', 'Memuat reward...');
    LK.status($rv, 'memuat', 'Memuat riwayat...');

    return Promise.all([
      LK.apiGet('poin.php?action=balance&store_id=' + encodeURIComponent(storeId)),
      LK.apiGet('poin.php?action=rewards&store_id=' + encodeURIComponent(storeId)),
      LK.apiGet('poin.php?action=history&store_id=' + encodeURIComponent(storeId) + '&page=1&per_page=20')
    ]).then(function (hasil) {
      var b = hasil[0] || {}, r = hasil[1] || {}, h = hasil[2] || {};
      saldo = Number(b.available_balance !== undefined ? b.available_balance : b.balance) || 0;
      $s.textContent = saldo.toLocaleString('id-ID') + ' poin';
      reward(Array.isArray(r.items) ? r.items : []);
      riwayat(Array.isArray(h.items) ? h.items : []);
    }).catch(function (e) {
      $s.textContent = '-';
      LK.status($rw, 'galat', 'Data poin gagal dimuat', e.message, LK.ulang(muatPoin));
      LK.status($rv, 'galat', 'Data riwayat gagal dimuat', e.message);
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

      LK.apiPost('poin.php', {
        action: 'redeem',
        store_id: storeId,
        reward_id: r.reward_id,
        quantity: 1
      }).then(function () {
        LK.notif('Poin berhasil ditukar dengan ' + (r.name || 'reward') + '.', 'sukses', 'Penukaran berhasil');
        return muatPoin();
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
      reserve: 'Poin ditahan',
      release: 'Poin dilepas',
      redeem: 'Poin ditukar',
      adjustment: 'Penyesuaian',
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
      var nama = role === 'seller'
        ? (c.buyer_name || 'Pembeli')
        : (c.store_name || 'Toko');
      var belum = Number(c.unread_count) || 0;
      var akhir = potong(c.last_message, 40);
      var teks = (nama || ('Percakapan ' + (i + 1))) +
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
      var petunjuk = role === 'seller'
        ? 'Belum ada pesan untuk toko ini.'
        : 'Tulis pesan pertama di bawah.';
      LK.status($ps, 'kosong', 'Belum ada pesan', petunjuk);
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
    if (!storeId) {
      LK.status($ps, 'galat', 'Chat gagal dimuat', 'Toko belum dipilih.');
      aturTombolChat();
      return Promise.resolve();
    }

    LK.status($ps, 'memuat', 'Memuat percakapan...');

    if (id) {
      return LK.apiGet('chat.php?action=messages&conversation_id=' + encodeURIComponent(id)).then(function (d) {
        pesan(Array.isArray(d.items) ? d.items : []);
        return LK.apiPost('chat.php', {
          action: 'read',
          conversation_id: id
        }).catch(function () {});
      }).catch(function (e) {
        LK.status($ps, 'galat', 'Chat gagal dimuat', e.message, LK.ulang(function () { muatChat(id); }));
      }).then(aturTombolChat);
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
    }).catch(function (e) {
      LK.status($ps, 'galat', 'Chat gagal dimuat', e.message, LK.ulang(function () { muatChat(id); }));
    }).then(aturTombolChat);
  }

  $toko.addEventListener('change', function () {
    storeId = $toko.value;
    cid = null;

    var url = new URL(window.location.href);
    url.searchParams.set('store_id', storeId);
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);

    muatPoin();
    muatChat();
  });

  $fc.addEventListener('submit', function (e) {
    e.preventDefault();
    var body = $fc.elements.body.value.trim();
    if (!body) { return; }

    if (!storeId) {
      $pc.textContent = 'Toko belum dipilih.';
      $pc.hidden = false;
      return;
    }

    if (!cid && role !== 'buyer') {
      $pc.textContent = 'Pilih percakapan terlebih dahulu.';
      $pc.hidden = false;
      return;
    }

    var tb = $fc.querySelector('button');
    tb.disabled = true;
    $pc.hidden = true;

    var siap = cid
      ? Promise.resolve(cid)
      : LK.apiPost('chat.php', {
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

    siap.then(function (id) {
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
    }).then(aturTombolChat);
  });

  function mulai() {
    LK.sesi().then(function (u) {
      if (!u || !u.user_id) {
        throw new Error('Masuk dulu untuk melihat poin dan chat.');
      }

      userId = u.user_id;
      role = u.role;

      if (role === 'seller') {
        storeId = u.store_id || null;
        if (!storeId) {
          throw new Error('Akun ini belum terhubung ke toko.');
        }
        aturTampilan('seller');
        return muatChat();
      }

      if (role !== 'buyer') {
        throw new Error('Halaman ini hanya untuk pembeli atau penjual.');
      }

      aturTampilan('buyer');
      return muatToko().then(function () {
        return Promise.all([muatPoin(), muatChat()]);
      });
    }).catch(function (e) {
      $s.textContent = '-';
      LK.status($rw, 'galat', 'Data gagal dimuat', e.message, LK.ulang(mulai));
      LK.status($rv, 'galat', 'Data gagal dimuat', e.message);
      LK.status($ps, 'galat', 'Chat gagal dimuat', e.message);
      $fc.elements.body.disabled = true;
      $fc.querySelector('button').disabled = true;
    });
  }

  mulai();
})();
