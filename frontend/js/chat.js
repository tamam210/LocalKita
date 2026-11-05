/* LokalKita - chat.js (integrasi API via chat.php) */
(function () {
  'use strict';
  var $header = document.getElementById('chat-header');
  var $pesan = document.getElementById('chat-pesan');
  var $form = document.getElementById('chat-form');
  var $input = document.getElementById('chat-input');
  var cid = null;

  function getStore() {
    var params = new URLSearchParams(location.search);
    return params.get('store_id') || null;
  }

  function renderHeader(nama) {
    if ($header) $header.textContent = nama || 'Chat Penjual';
  }

  function renderKosong() {
    if (!$pesan) return;
    $pesan.replaceChildren();
    $pesan.appendChild(LK.el('div', { 'class': 'status' }, [
      LK.el('h3', { text: 'Belum ada percakapan' }),
      LK.el('p', { text: 'Mulai obrolan dengan penjual lewat tombol "Beli Langsung" di etalase.' }),
      LK.el('div', { 'class': 'status-aksi' }, [
        LK.el('a', { 'class': 'tombol tombol-lunak', href: 'index.html', text: 'Ke Etalase' })
      ])
    ]));
  }

  function renderPesan(items, userId) {
    if (!$pesan) return;
    $pesan.replaceChildren();
    if (!items.length) {
      $pesan.appendChild(LK.el('div', { 'class': 'status' }, [
        LK.el('h3', { text: 'Belum ada pesan' }),
        LK.el('p', { text: 'Tulis pesan pertama di bawah.' })
      ]));
      return;
    }
    items.forEach(function (m) {
      var saya = userId !== null && userId !== undefined &&
        String(m.sender_user_id) === String(userId);
      var w = LK.el('div', { 'class': 'gelembung' + (saya ? ' saya' : '') }, [
        LK.el('p', { text: m.body || '' }),
        saya ? LK.el('small', { text: m.read_at ? 'Dibaca' : 'Terkirim' }) : null
      ]);
      $pesan.appendChild(w);
    });
    $pesan.scrollTop = $pesan.scrollHeight;
  }

  function muatChat(id, userId, storeId) {
    if (!$pesan) return;
    cid = id;
    LK.status($pesan, 'memuat', 'Memuat percakapan...');
    return LK.apiGet('chat.php?action=messages&conversation_id=' + encodeURIComponent(id) + '&page=1&per_page=30').then(function (d) {
      renderPesan(Array.isArray(d.items) ? d.items : [], userId);
      return LK.apiPost('chat.php', { action: 'read', conversation_id: id }).catch(function () {});
    }).catch(function (e) {
      LK.status($pesan, 'galat', 'Chat gagal dimuat', e.message);
    });
  }

  function muatDaftar(userId, storeId) {
    if (!$pesan) return;
    LK.status($pesan, 'memuat', 'Memuat percakapan...');
    return LK.apiGet('chat.php?action=conversations&store_id=' + encodeURIComponent(storeId)).then(function (d) {
      var cs = Array.isArray(d.items) ? d.items : [];
      if (!cs.length) {
        renderKosong();
        cid = null;
        renderPesan([], userId);
        return;
      }
      var pertama = cs[0];
      renderHeader(pertama.store_name || pertama.buyer_name || 'Chat Penjual');
      return muatChat(pertama.conversation_id, userId, storeId);
    }).catch(function (e) {
      LK.status($pesan, 'galat', 'Chat gagal dimuat', e.message);
    });
  }

  if ($form) {
    $form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = ($input.value || '').trim();
      if (!text) return;
      var storeId = getStore();
      if (!storeId) {
        $input.value = '';
        return;
      }
      var tb = $form.querySelector('button');
      tb.disabled = true;
      var lanjut = function (id) {
        return LK.apiPost('chat.php', {
          action: 'send',
          conversation_id: id,
          type: 'text',
          body: text
        }).then(function () {
          $input.value = '';
          return muatChat(id, null, storeId);
        }).catch(function (err) {
          LK.notif('Pesan gagal dikirim: ' + err.message, 'bahaya', 'Kirim gagal');
        }).then(function () {
          tb.disabled = false;
        });
      };
      if (cid) {
        lanjut(cid);
      } else {
        LK.apiPost('chat.php', { action: 'create', store_id: storeId, order_id: null }).then(function (d) {
          if (!d || !d.conversation_id) {
            throw new Error('Percakapan tidak berhasil dibuat.');
          }
          cid = d.conversation_id;
          renderHeader(null);
          return lanjut(cid);
        }).catch(function (err) {
          LK.notif('Gagal membuat percakapan: ' + err.message, 'bahaya', 'Gagal');
          tb.disabled = false;
        });
      }
    });
  }

  // Saat halaman dimuat, buat percakapan dengan toko dari ?store_id=
  if (getStore()) {
    LK.sesiAman().then(function (u) {
      var userId = u && u.user_id ? u.user_id : null;
      muatDaftar(userId, getStore());
    });
  } else {
    renderKosong();
  }
})();
