(function () {
  'use strict';

  var ids = {};
  var janji = null;

  function terapkan(data) {
    ids = {};
    var list = data && Array.isArray(data.ids) ? data.ids : [];
    list.forEach(function (id) {
      if (id) { ids[String(id)] = true; }
    });
  }

  function muat(paksa) {
    if (janji && !paksa) { return janji; }

    janji = LK.apiGet('favorites.php?action=list')
      .then(function (data) {
        terapkan(data);
        return ids;
      })
      .catch(function () {
        ids = {};
        janji = null;
        return ids;
      });

    return janji;
  }

  function isFavorit(productId) {
    return !!ids[String(productId)];
  }

  function toggle(productId) {
    var key = String(productId);
    var sebelumnya = !!ids[key];

    if (sebelumnya) { delete ids[key]; }
    else { ids[key] = true; }

    return LK.apiPost('favorites.php?action=toggle', { product_id: key })
      .then(function (data) {
        if (data && data.favorited === true) { ids[key] = true; }
        else { delete ids[key]; }
        return !!ids[key];
      })
      .catch(function (err) {
        if (sebelumnya) { ids[key] = true; }
        else { delete ids[key]; }
        throw err;
      });
  }

  function count() {
    return Object.keys(ids).length;
  }

  LK.favorit = {
    isFavorit: isFavorit,
    toggle: toggle,
    count: count,
    load: muat,
    muat: muat
  };
})();