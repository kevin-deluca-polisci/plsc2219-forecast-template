/* PLSC 2219 forecast sites: shared logic used by the forecast page (app.js) and the class gallery.
   Students: you should not need to edit this file. */
(function () {
  "use strict";
  var DEFAULT_ERR = { house: { nat: 1.66, dist: 4.04 }, senate: { nat: 1.32, dist: 5.93 } };
  var N_SIMS = 10000;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); }
  function isFixed(r) { return r.fixed != null && !isNaN(r.fixed); }
  function quant(a, q) { var b = a.slice().sort(function (x, y) { return x - y; }); var i = (b.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return b[lo] + (b[hi] - b[lo]) * (i - lo); }

  // ---------------------------------------------------------------- CSV
  function parseCSV(text) {
    var rows = [], row = [], f = "", q = false, i, c;
    text = text.replace(/^﻿/, "");
    for (i = 0; i < text.length; i++) {
      c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(f); f = ""; if (row.length > 1 || row[0] !== "") rows.push(row); row = [];
      } else f += c;
    }
    if (f !== "" || row.length) { row.push(f); rows.push(row); }
    if (!rows.length) return [];
    var head = rows[0].map(function (h) { return h.trim().toLowerCase(); });
    return rows.slice(1).map(function (r) {
      var o = {}; head.forEach(function (h, j) { o[h] = r[j] == null ? "" : r[j].trim(); }); return o;
    });
  }
  function getCSV(path) {
    return fetch(path + (path.indexOf("?") < 0 ? "?v=" : "&v=") + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(parseCSV);
  }
  function num(v) { if (v == null || v === "" || /^na$/i.test(v)) return null; var x = Number(v); return isFinite(x) ? x : NaN; }

  // ---------------------------------------------------------------- default simulations
  function rng(seed) { // mulberry32: same numbers every time the page loads
    return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function normal(u) { var spare = null; return function () {
    if (spare !== null) { var x = spare; spare = null; return x; }
    var a = u() || 1e-12, b = u(), r = Math.sqrt(-2 * Math.log(a)); spare = r * Math.sin(2 * Math.PI * b); return r * Math.cos(2 * Math.PI * b); }; }
  function qnorm(p) { // inverse standard normal (Acklam)
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    var a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924],
        b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857],
        c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878],
        d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742], q, r;
    if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    if (p > 1 - 0.02425) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    q = p - 0.5; r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  }
  // kind "share": your point predictions + default national and race errors.
  // kind "prob":  your win probabilities, linked by a default national swing. Each race still wins
  //               with exactly your p_dem_win; the swing only makes races move together.
  function defaultSims(races, demNotUp, useP) {
    var rnd = normal(rng(2219)), H = [], Sn = [];
    var prep = races.map(function (r) {
      var e = DEFAULT_ERR[r.office], tot = Math.sqrt(e.nat * e.nat + e.dist * e.dist);
      return { house: r.office === "house", fixed: isFixed(r) ? (r.fixed > 0.5 ? 1 : 0) : null,
               share: r.share * 100, nat: e.nat, dist: e.dist,
               a: e.nat / tot, b: e.dist / tot, cut: useP ? qnorm(r.p) : 0 };
    });
    for (var k = 0; k < N_SIMS; k++) {
      var z = rnd(), h = 0, s = demNotUp;
      for (var i = 0; i < prep.length; i++) {
        var q = prep[i], win;
        if (q.fixed !== null) win = q.fixed;
        else if (useP) win = (q.a * z + q.b * rnd()) < q.cut ? 1 : 0;
        else win = (q.share + q.nat * z + q.dist * rnd()) > 50 ? 1 : 0;
        if (q.house) h += win; else s += win;
      }
      H.push(h); Sn.push(s);
    }
    return { h: H, s: Sn, isDefault: true, kind: useP ? "prob" : "share" };
  }

  // ---------------------------------------------------------------- analyze one forecast
  // races, notup: course files; fc, sims: parsed forecast.csv and seat_sims.csv (sims may be null).
  // Returns the merged races plus everything the pages need. Does not change the inputs.
  function analyze(races, notup, fc, sims, sFile) {
    sFile = sFile || "seat_sims.csv";
    var problems = [], notes = [];
    races = races.map(function (r) { var o = {}; for (var k in r) o[k] = r[k]; return o; });
    var demNotUp = 0;
    notup.forEach(function (r) { if (/^D/.test(r.party)) demNotUp = Number(r.seats_not_up); });

    // index races
    var byId = {};
    races.forEach(function (r) {
      r.fixed = num(r.fixed_prediction);
      r.dist = r.office === "house" ? Number(r.district) : null;
      byId[r.race_id] = r;
    });

    // merge forecast
    var seen = {}, dups = [], extra = [], cols = fc.length ? Object.keys(fc[0]) : [];
    var hasP = cols.indexOf("p_dem_win") >= 0, hasI = cols.indexOf("lo_80") >= 0 && cols.indexOf("hi_80") >= 0;
    if (cols.indexOf("race_id") < 0 || cols.indexOf("pred_dem_share") < 0)
      problems.push("Your file needs columns named <code>race_id</code> and <code>pred_dem_share</code> (lower case). Found: " + esc(cols.join(", ")));
    var asof = "";
    var bad = { share: 0, p: 0, pct: false };
    fc.forEach(function (row) {
      var id = row.race_id;
      if (!id) return;
      if (seen[id]) { dups.push(id); return; }
      seen[id] = true;
      var r = byId[id];
      if (!r) { extra.push(id); return; }
      r.share = num(row.pred_dem_share);
      r.p = hasP ? num(row.p_dem_win) : null;
      r.lo = hasI ? num(row.lo_80) : null;
      r.hi = hasI ? num(row.hi_80) : null;
      [r.share, r.p, r.lo, r.hi].forEach(function (v) { if (v != null && v > 1 && v <= 100) bad.pct = true; });
      if (r.share == null || isNaN(r.share) || r.share < 0 || r.share > 1) { bad.share++; r.share = null; }
      if (hasP && (r.p == null || isNaN(r.p) || r.p < 0 || r.p > 1)) { bad.p++; r.p = null; }
      if (row.asof && row.asof > asof) asof = row.asof;
    });
    var missing = races.filter(function (r) { return !seen[r.race_id]; }).map(function (r) { return r.race_id; });
    function list(a) { return a.slice(0, 5).map(esc).join(", ") + (a.length > 5 ? " &hellip; (" + a.length + " in all)" : ""); }
    if (bad.pct) problems.push("Some values are above 1. Use proportions (0.53), not percentages (53).");
    if (missing.length) problems.push(missing.length + " race(s) from the race file are missing: " + list(missing));
    if (dups.length) problems.push(dups.length + " race_id(s) appear more than once: " + list(dups));
    if (extra.length) problems.push(extra.length + " race_id(s) are not in the race file (check spelling, e.g. HOU_PA_03_2026): " + list(extra));
    if (bad.share) problems.push("<code>pred_dem_share</code> is blank or out of range in " + bad.share + " race(s).");
    if (bad.p) problems.push("<code>p_dem_win</code> is blank or out of range in " + bad.p + " race(s).");

    races.forEach(function (r) { // unscored races always use the race file's fixed value
      if (r.fixed != null && !isNaN(r.fixed)) { r.share = r.fixed; if (hasP) r.p = r.fixed; if (hasI) { r.lo = r.fixed; r.hi = r.fixed; } }
    });
    var useP = hasP && races.every(function (r) { return r.p != null; });
    var useI = useP && hasI && races.every(function (r) { return r.lo != null && r.hi != null && !isNaN(r.lo) && !isNaN(r.hi); });

    // simulations
    var S = null;
    if (sims && sims.length) {
      var h = [], s = [];
      sims.forEach(function (r) { var a = num(r.house_dem_seats), b = num(r.senate_dem_seats); if (a != null && !isNaN(a)) h.push(a); if (b != null && !isNaN(b)) s.push(b); });
      if (h.length >= 100 && s.length >= 100) S = { h: h, s: s };
      else problems.push("<code>" + esc(sFile) + "</code> was found but needs columns <code>house_dem_seats</code> and <code>senate_dem_seats</code> with at least 1,000 rows.");
      // seat_sims.csv should include the Democratic seats not up in 2026. If it clearly counts only the
      // seats up this year (median below 34), add them here so the page shows correct totals.
      if (S && quant(S.s, 0.5) < demNotUp) {
        S.s = S.s.map(function (x) { return x + demNotUp; });
        notes.push("Your <code>" + esc(sFile) + "</code> counts only the Senate seats up in 2026, so this page added the " + demNotUp +
          " Democratic seats not up. The file you submit on Canvas must include them: add " + demNotUp + " to <code>senate_dem_seats</code> before you submit (<code>check_forecast()</code> will remind you).");
      }
    }

    if (!S && races.every(function (r) { return r.share != null; })) {
      S = defaultSims(races, demNotUp, useP);
    }

    return { races: races, problems: problems, notes: notes, useP: useP, useI: useI, S: S, asof: asof, demNotUp: demNotUp };
  }

  // seat summary for one chamber
  function chamber(xs, maj) {
    return { pmaj: xs.filter(function (x) { return x >= maj; }).length / xs.length,
             med: quant(xs, 0.5), lo: quant(xs, 0.1), hi: quant(xs, 0.9) };
  }

  window.FC = { esc: esc, isFixed: isFixed, quant: quant, parseCSV: parseCSV, getCSV: getCSV, num: num,
                defaultSims: defaultSims, analyze: analyze, chamber: chamber, DEFAULT_ERR: DEFAULT_ERR, N_SIMS: N_SIMS };
})();
