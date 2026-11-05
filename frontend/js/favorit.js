/* LokalKita - favorit/wishlist (frontend only, localStorage) */
(function () {
  'use strict';
  var KEY = 'lokalkita_favorit';

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch(e) { return []; }
  }
  function save(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
  }
  function isFavorit(productId) {
    var items = load();
    for (var i = 0; i < items.length; i++) {
      if (String(items[i]) === String(productId)) return true;
    }
    return false;
  }
  function toggle(productId) {
    var items = load();
    var idx = -1;
    for (var i = 0; i < items.length; i++) {
      if (String(items[i]) === String(productId)) { idx = i; break; }
    }
    if (idx >= 0) { items.splice(idx, 1); } else { items.push(productId); }
    save(items);
    return idx < 0;
  }
  function count() {
    return load().length;
  }

  LK.favorit = {
    isFavorit: isFavorit,
    toggle: toggle,
    count: count,
    load: load
  };
})();
