(function (w) {
  'use strict';

  function svg(tag, attrs, text) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) {
      e.setAttribute(k, attrs[k]);
    });
    if (text !== undefined && text !== null) {
      e.textContent = text;
    }
    return e;
  }

  function ringkas(n) {
    n = Number(n) || 0;
    var a = Math.abs(n);
    if (a >= 1000000000) return (n / 1000000000).toFixed(1).replace('.', ',') + ' M';
    if (a >= 1000000) return (n / 1000000).toFixed(1).replace('.', ',') + ' jt';
    if (a >= 1000) return (n / 1000).toFixed(0) + ' rb';
    return String(Math.round(n));
  }

  function gambar(wadah, list) {
    var W = 640, H = 260;
    var L = 64, R = 16, T = 24, B = 44;

    var data = (list || []).map(function (r) {
      var s = r.summary || r || {};
      return {
        label: r.period && r.period.label ? r.period.label : ((r.period_month || r.month || '') + '/' + (r.period_year || r.year || '')),
        omzet: Number(s.gross_revenue) || 0,
        laba: Number(s.net_profit) || 0
      };
    });

    if (!data.length) {
      wadah.replaceChildren();
      return;
    }

    var max = Math.max.apply(null, [1].concat(data.map(function (d) {
      return Math.max(d.omzet, d.laba);
    })));
    var min = Math.min.apply(null, [0].concat(data.map(function (d) {
      return Math.min(d.omzet, d.laba);
    })));
    var span = (max - min) || 1;

    function x(i) {
      if (data.length === 1) return L + (W - L - R) / 2;
      return L + i * (W - L - R) / (data.length - 1);
    }

    function y(v) {
      return T + (max - v) / span * (H - T - B);
    }

    var root = svg('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      'class': 'grafik-garis',
      role: 'img',
      'aria-label': 'Grafik omzet dan laba bersih'
    });

    for (var i = 0; i <= 4; i++) {
      var v = min + span * i / 4;
      var yy = y(v);
      root.appendChild(svg('line', { x1: L, x2: W - R, y1: yy, y2: yy, 'class': 'grid' }));
      root.appendChild(svg('text', { x: L - 8, y: yy + 4, 'text-anchor': 'end' }, ringkas(v)));
    }

    data.forEach(function (d, i) {
      root.appendChild(svg('text', { x: x(i), y: H - 14, 'text-anchor': 'middle' }, d.label));
    });

    [
      ['omzet', 'line-omzet', 'dot-omzet', 'Omzet'],
      ['laba', 'line-laba', 'dot-laba', 'Laba bersih']
    ].forEach(function (s) {
      var key = s[0];
      var d = data.map(function (v, i) {
        return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v[key]).toFixed(1);
      }).join(' ');
      root.appendChild(svg('path', { d: d, 'class': s[1] }));
      data.forEach(function (v, i) {
        var c = svg('circle', { cx: x(i), cy: y(v[key]), r: 4, 'class': s[2] });
        c.appendChild(svg('title', {}, s[3] + ': ' + (w.LK && LK.rupiah ? LK.rupiah(v[key]) : v[key])));
        root.appendChild(c);
      });
    });

    wadah.replaceChildren(root);
  }

  w.LK = w.LK || {};
  w.LK.grafikGaris = gambar;
})(window);
