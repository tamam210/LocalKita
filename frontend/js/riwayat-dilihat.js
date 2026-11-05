/* LokalKita - riwayat produk yang pernah dilihat (frontend only, localStorage) */
(function () {
  'use strict';
  var KEY = 'lokalkita_dilihat';
  var MAX = 10;

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch(e) { return []; }
  }
  function save(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
  }
  function tambah(productId, productName) {
    var items = load();
    var idx = -1;
    for (var i = 0; i < items.length; i++) {
      if (String(items[i].id) === String(productId)) { idx = i; break; }
    }
    if (idx >= 0) { items.splice(idx, 1); }
    items.unshift({ id: productId, name: productName });
    if (items.length > MAX) { items.length = MAX; }
    save(items);
  }
  function hapus(productId) {
    var items = load();
    var baru = [];
    for (var i = 0; i < items.length; i++) {
      if (String(items[i].id) !== String(productId)) { baru.push(items[i]); }
    }
    save(baru);
  }
  function kosongkan() {
    localStorage.removeItem(KEY);
  }

  LK.dilihat = {
    tambah: tambah,
    hapus: hapus,
    kosongkan: kosongkan,
    load: load,
    render: render
  };

  function render(containerId, emptyMsgId) {
    var container = document.getElementById(containerId);
    var emptyMsg = document.getElementById(emptyMsgId);
    var section = document.getElementById('bagian-dilihat');
    var items = load();
    if (!container) return;
    container.replaceChildren();
    if (!items.length) {
      if (section) section.hidden = true;
      if (emptyMsg) emptyMsg.hidden = false;
      return;
    }
    if (section) section.hidden = false;
    if (emptyMsg) emptyMsg.hidden = true;
    items.forEach(function (it) {
      var a = LK.el('a', {
        href: 'produk-detail.html?id=' + encodeURIComponent(it.id),
        'class': 'tombol-lunak',
        text: it.name || 'Produk'
      });
      container.appendChild(a);
    });
  }
})();

