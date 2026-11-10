(function (w) {
  'use strict';

  var KEY = 'lokalkita_keranjang';
  var MAX = 20;

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function save(items) {
    localStorage.setItem(KEY, JSON.stringify(items || []));
  }

  function beda(items) {
    var map = {};
    (items || []).forEach(function (it) {
      if (it && it.product_id) {
        map[String(it.product_id)] = true;
      }
    });
    return Object.keys(map).length;
  }

  function tambah(item) {
    var items = load();
    var qty = Math.max(1, Number(item.qty) || 1);
    var idx = -1;

    for (var i = 0; i < items.length; i++) {
      if (String(items[i].product_id) === String(item.product_id)) {
        idx = i;
        break;
      }
    }

    if (idx >= 0) {
      items[idx].qty = (Number(items[idx].qty) || 1) + qty;
    } else {
      if (beda(items) >= MAX) {
        return { ok: false, pesan: 'Maksimal 20 produk berbeda dalam satu keranjang.' };
      }
      items.push({
        product_id: item.product_id,
        name: item.name,
        price: item.price,
        image: item.image,
        store_id: item.store_id,
        store_name: item.store_name,
        qty: qty
      });
    }

    save(items);
    return { ok: true, items: items };
  }

  w.LK = w.LK || {};
  w.LK.keranjang = {
    KEY: KEY,
    MAX: MAX,
    load: load,
    save: save,
    beda: beda,
    tambah: tambah
  };
})(window);
