/* LokalKita - chat.js (frontend only, localStorage) */
(function () {
  'use strict';
  var KEY = 'lokalkita_chat';
  var $header = document.getElementById('chat-header');
  var $pesan = document.getElementById('chat-pesan');
  var $form = document.getElementById('chat-form');
  var $input = document.getElementById('chat-input');

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch(e) { return []; }
  }
  function save(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
  }

  function getStore() {
    var params = new URLSearchParams(location.search);
    var storeId = params.get('store_id') || 'default';
    return storeId;
  }

  function render() {
    var storeId = getStore();
    $header.textContent = 'Toko #' + storeId;
    var items = load().filter(function (m) { return m.store_id === storeId; });
    $pesan.replaceChildren();
    if (!items.length) {
      $pesan.appendChild(LK.el('div', { 'class': 'status', text: '' }, [LK.el('p', { text: 'Belum ada pesan. Mulai chat dengan penjual.' })]));
      return;
    }
    items.forEach(function (m) {
      var gelembung = LK.el('div', { 'class': 'gelembung' + (m.from === 'saya' ? ' saya' : '') }, [
        LK.el('p', { text: m.text }),
        LK.el('small', { text: new Date(m.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) })
      ]);
      $pesan.appendChild(gelembung);
    });
    $pesan.scrollTop = $pesan.scrollHeight;
  }

  if ($form) {
    $form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = ($input.value || '').trim();
      if (!text) return;
      var storeId = getStore();
      var items = load();
      items.push({ id: Date.now(), store_id: storeId, from: 'saya', text: text, time: new Date().toISOString() });
      save(items);
      $input.value = '';
      render();
      // Simulasi balasan penjual
      setTimeout(function () {
        var items2 = load();
        items2.push({ id: Date.now(), store_id: storeId, from: 'penjual', text: 'Terima kasih sudah menghubungi kami. Kami akan segera merespons ya 😊', time: new Date().toISOString() });
        save(items2);
        render();
      }, 800);
    });
  }

  render();
})();
