/* PLSC 2219 forecast site. Students: you should not need to edit this file.
   The page reads forecast.csv (and seat_sims.csv once you have one) and shows
   whatever your files support:
     pred_dem_share only            -> margins and margin-based ratings
     + p_dem_win, lo_80, hi_80      -> probabilities, intervals, probability-based ratings
     + seat_sims.csv                -> chance of a majority and the seat histogram */
(function () {
  "use strict";
  var CFG = window.SITE_CONFIG || {};
  var HOUSE_MAJ = 218, SENATE_MAJ = 51, HOUSE_N = 435;
  var MARGIN_CUTS = [3, 8, 15];          // points: toss-up < 3, lean < 8, likely < 15, else safe
  var PROB_CUTS = [0.60, 0.80, 0.95];    // win prob of the favorite: toss-up < 60%, lean < 80%, likely < 95%
  var RATINGS = [
    { key: "safe-d", label: "Safe D" }, { key: "likely-d", label: "Likely D" }, { key: "lean-d", label: "Lean D" },
    { key: "toss", label: "Toss-up" },
    { key: "lean-r", label: "Lean R" }, { key: "likely-r", label: "Likely R" }, { key: "safe-r", label: "Safe R" }
  ];
  var TILE = { // Senate tile map: [row, col]
    AK:[0,0], ME:[0,10], VT:[1,9], NH:[1,10],
    WA:[2,0], ID:[2,1], MT:[2,2], ND:[2,3], MN:[2,4], IL:[2,5], WI:[2,6], MI:[2,7], NY:[2,8], RI:[2,9], MA:[2,10],
    OR:[3,0], NV:[3,1], WY:[3,2], SD:[3,3], IA:[3,4], IN:[3,5], OH:[3,6], PA:[3,7], NJ:[3,8], CT:[3,9],
    CA:[4,0], UT:[4,1], CO:[4,2], NE:[4,3], MO:[4,4], KY:[4,5], WV:[4,6], VA:[4,7], MD:[4,8], DE:[4,9],
    AZ:[5,1], NM:[5,2], KS:[5,3], AR:[5,4], TN:[5,5], NC:[5,6], SC:[5,7],
    OK:[6,3], LA:[6,4], MS:[6,5], AL:[6,6], GA:[6,7],
    HI:[7,0], TX:[7,3], FL:[7,8]
  };
  var REGIONS = [
    ["Northeast", ["ME","NH","VT","MA","RI","CT","NY","NJ","PA"]],
    ["Midwest", ["OH","MI","IN","IL","WI","MN","IA","MO","ND","SD","NE","KS"]],
    ["South", ["DE","MD","VA","WV","KY","TN","NC","SC","GA","FL","AL","MS","AR","LA","OK","TX"]],
    ["West", ["MT","ID","WY","CO","NM","AZ","UT","NV","CA","OR","WA","AK","HI"]]
  ];
  var STATE_NAMES = {AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming"};

  var $ = function (id) { return document.getElementById(id); };
  var esc = FC.esc, getCSV = FC.getCSV, num = FC.num, quant = FC.quant, isFixed = FC.isFixed;
  function pct(x, d) { return (100 * x).toFixed(d == null ? 0 : d) + "%"; }


  // ---------------------------------------------------------------- load
  var demo = (new URLSearchParams(location.search)).get("demo");
  var fFile = CFG.forecast_file || "forecast.csv", sFile = CFG.sims_file || "seat_sims.csv";
  if (demo === "prelim") { fFile = "examples/forecast_prelim_example.csv"; sFile = null; }
  if (demo === "probs") { fFile = "examples/forecast_final_example.csv"; sFile = null; }
  if (demo === "final") { fFile = "examples/forecast_final_example.csv"; sFile = "examples/seat_sims_example.csv"; }

  setHeader();
  setLinks();

  Promise.all([
    getCSV("data/races_2026.csv"),
    getCSV("data/senate_seats_not_up_2026.csv"),
    getCSV(fFile).catch(function () { return null; }),
    sFile ? getCSV(sFile).catch(function () { return null; }) : Promise.resolve(null)
  ]).then(function (res) { build(res[0], res[1], res[2], res[3]); })
    .catch(function (e) {
      showEmpty("<p><strong>The page could not load its data.</strong> The site loads its data from its GitHub Pages address; browsers block it when <code>index.html</code> is opened as a file.</p><p class='note'>" + esc(e) + "</p>");
    });

  function setHeader() {
    var name = (CFG.forecaster_name || "").trim();
    if (name) { $("title").textContent = name; document.title = name + " | 2026 Midterm Forecast"; }
    if ((CFG.tagline || "").trim()) { $("tagline").textContent = CFG.tagline; $("tagline").hidden = false; }
    if (demo) {
      $("demo-banner").hidden = false;
      $("demo-banner").innerHTML = "<strong>Example data.</strong> This preview shows the class model's numbers as a " +
        (demo === "prelim" ? "preliminary forecast (point predictions only)" : demo === "probs" ? "forecast with win probabilities (no seat_sims.csv)" : "final forecast (with probabilities and simulations)") +
        ". Remove <code>?demo=" + esc(demo) + "</code> from the address to see your own files.";
    }
  }
  function setLinks() {
    var L = CFG.links || {}, out = [];
    if (L.class_forecast) out.push('<a href="' + esc(L.class_forecast) + '">Class forecast</a>');
    if (L.gallery) out.push('<a href="' + esc(L.gallery) + '">All forecasts</a>');
    if (L.tracker) out.push('<a href="' + esc(L.tracker) + '">Forecast tracker</a>');
    $("links").innerHTML = out.join("");
    $("links").hidden = !out.length;
  }
  function showEmpty(html) { $("empty").innerHTML = html; $("empty").hidden = false; }

  // ---------------------------------------------------------------- build
  function build(races, notup, fc, sims) {
    if (!fc) {
      showEmpty("<h2>No forecast yet</h2><p>Upload your <code>" + esc(fFile) + "</code> to this repository (Add file &rarr; Upload files) and this page will fill in. It can take a minute or two for GitHub Pages to update.</p>" +
        "<p>To preview what the site will look like, add <a href='?demo=prelim'><code>?demo=prelim</code></a> or <a href='?demo=final'><code>?demo=final</code></a> to the address.</p>");
      return;
    }
    var A = FC.analyze(races, notup, fc, sims, sFile);
    races = A.races;
    var problems = A.problems, useP = A.useP, useI = A.useI, S = A.S, asof = A.asof, demNotUp = A.demNotUp;
    if (A.notes.length) {
      $("notes").innerHTML = "<strong>Note.</strong> " + A.notes.join(" ");
      $("notes").hidden = false;
    }

    if (problems.length) {
      $("problems").innerHTML = "<strong><span class='icon' aria-hidden='true'>&#9888;</span>Forecast file problems.</strong> Fix these and upload the file again:<ul><li>" + problems.join("</li><li>") + "</li></ul>";
      $("problems").hidden = false;
    }
    if (asof) $("asof").textContent = "Forecast as of " + asof;

    races.forEach(function (r) { r.rating = rate(r, useP); });
    var house = races.filter(function (r) { return r.office === "house"; });
    var senate = races.filter(function (r) { return r.office === "senate"; });

    $("content").hidden = false;
    topline(house, senate, demNotUp, useP, S);
    senateMap(senate, useP);
    houseGrid(house, useP);
    legends(useP);
    distribution(S, useP);
    table(races, useP, useI);
    method();
  }

  // ---------------------------------------------------------------- helpers
  function margin(r) { return r.share == null ? null : (2 * r.share - 1) * 100; }
  function rate(r, useP) {
    if (r.share == null) return null;
    if (useP) {
      var p = r.p, fav = Math.max(p, 1 - p), d = p >= 0.5;
      if (fav < PROB_CUTS[0]) return RATINGS[3];
      if (fav < PROB_CUTS[1]) return RATINGS[d ? 2 : 4];
      if (fav < PROB_CUTS[2]) return RATINGS[d ? 1 : 5];
      return RATINGS[d ? 0 : 6];
    }
    var m = margin(r), a = Math.abs(m);
    if (a < MARGIN_CUTS[0]) return RATINGS[3];
    if (a < MARGIN_CUTS[1]) return RATINGS[m > 0 ? 2 : 4];
    if (a < MARGIN_CUTS[2]) return RATINGS[m > 0 ? 1 : 5];
    return RATINGS[m > 0 ? 0 : 6];
  }
  function raceName(r) {
    if (r.office === "senate") return STATE_NAMES[r.state] + " Senate" + (r.special === "1" ? " (special)" : "");
    return r.state + "-" + (r.dist < 10 ? "0" : "") + r.dist;
  }
  function sideLabel(name, party, fallback) {
    if (!name) return "<span class='note'>" + fallback + "</span>";
    return esc(name) + (party && party !== "D" && party !== "R" ? " (" + esc(party) + ")" : "");
  }
  function marginText(r) {
    var m = margin(r);
    if (m == null) return "n/a";
    if (Math.abs(m) < 0.05) return "Even";
    return (m > 0 ? "D +" : "R +") + Math.abs(m).toFixed(1);
  }
  function fixedText(r) {
    if (r.race_type === "no_R_side") return "No Republican-side candidate";
    if (r.race_type === "same_party_D") return "Two Democrats; seat stays Democratic";
    if (r.race_type === "same_party_R") return "Two Republicans; seat stays Republican";
    return "Not scored";
  }

  // ---------------------------------------------------------------- topline
  function topline(house, senate, demNotUp, useP, S) {
    var hD = house.filter(function (r) { return r.share != null && r.share > 0.5; }).length;
    var hR = house.filter(function (r) { return r.share != null && r.share < 0.5; }).length;
    var sD = demNotUp + senate.filter(function (r) { return r.share != null && r.share > 0.5; }).length;
    var sR = 100 - demNotUp - senate.length + senate.filter(function (r) { return r.share != null && r.share < 0.5; }).length;
    card($("top-house"), "House", hD, hR, HOUSE_N, HOUSE_MAJ, S, S ? S.h : null, useP ? sum(house) : null, "218 seats for a majority");
    card($("top-senate"), "Senate", sD, sR, 100, SENATE_MAJ, S, S ? S.s : null, useP ? demNotUp + sum(senate) : null,
      "51 seats for control (the vice president breaks 50-50 ties for Republicans). Includes " + demNotUp + " Democratic seats not up this year.");
  }
  function sum(rs) { return rs.reduce(function (a, r) { return a + (r.p || 0); }, 0); }
  function card(el, lab, d, r, n, maj, S, sims, expD, rule) {
    var html = "<p class='lab'>" + lab + (S && S.isDefault ? " <span class='badge'>default uncertainty</span>" : "") + "</p>";
    if (sims && S.kind === "share") {
      var pm0 = sims.filter(function (x) { return x >= maj; }).length / sims.length;
      html += "<p class='hero num'>D " + d + " &ndash; R " + r + "</p>" +
        "<p class='sub'>Projected seats: the party favored in each race" + (n - d - r ? "; " + (n - d - r) + " not called (missing, invalid or exactly 50%)" : "") + ".</p>" +
        "<p class='sub num'>80% range: " + Math.round(quant(sims, 0.1)) + " to " + Math.round(quant(sims, 0.9)) + " Democratic seats. Democrats win " +
        (lab === "House" ? "a majority" : "control") + " in " + pct(pm0) + " of simulations.</p>";
    } else if (sims) {
      var pm = sims.filter(function (x) { return x >= maj; }).length / sims.length;
      var fav = pm >= 0.5 ? "Democrats" : "Republicans", pf = pm >= 0.5 ? pm : 1 - pm;
      html += "<p class='hero num'>" + fav + " " + pct(pf) + "</p>" +
        "<p class='sub'>chance of " + (lab === "House" ? "a majority" : "control") + ". Median " + Math.round(quant(sims, 0.5)) + " Democratic seats (80% range " +
        Math.round(quant(sims, 0.1)) + " to " + Math.round(quant(sims, 0.9)) + ").</p>" +
        "<p class='sub num'>Point forecast: D " + d + ", R " + r + (n - d - r ? ", not called " + (n - d - r) : "") + ".</p>";
    } else {
      html += "<p class='hero num'>D " + d + " &ndash; R " + r + "</p>" +
        "<p class='sub'>Projected seats: the party favored in each race" + (n - d - r ? "; " + (n - d - r) + " not called (missing, invalid or exactly 50%)" : "") + ".</p>";
      if (expD != null) html += "<p class='sub num'>Expected Democratic seats (sum of win probabilities): " + expD.toFixed(1) + ".</p>";
    }
    var w = function (x) { return (100 * x / n).toFixed(2) + "%"; };
    html += "<div class='bar' role='img' aria-label='" + lab + ": Democrats " + d + ", Republicans " + r + "'>" +
      "<span style='width:" + w(d) + ";background:var(--safe-d)'></span>" +
      (n - d - r ? "<span style='width:" + w(n - d - r) + ";background:var(--toss)'></span>" : "") +
      "<span style='width:" + w(r) + ";background:var(--safe-r)'></span>" +
      "<i class='mid' style='left:calc(" + (100 * (maj - 0.5) / n) + "% - 1px)'></i></div>" +
      "<div class='bar-lab'><span>Dem " + d + "</span><span>" + maj + " needed</span><span>Rep " + r + "</span></div>" +
      "<p class='sub' style='font-size:13px'>" + rule + "</p>";
    el.innerHTML = html;
  }

  // ---------------------------------------------------------------- tooltip
  var tip = $("tip");
  function tipHTML(r, useP) {
    var h = "<b>" + esc(raceName(r)) + "</b>";
    h += "<div class='row'><span>D side</span><span>" + sideLabel(r.dem_candidate, r.d_side_party, "none") + "</span></div>";
    h += "<div class='row'><span>R side</span><span>" + sideLabel(r.rep_candidate, r.r_side_party, "none") + "</span></div>";
    if (isFixed(r)) { h += "<div class='row'><span>Forecast</span><span>" + fixedText(r) + "</span></div>"; return h; }
    h += "<div class='row'><span>Margin</span><span class='num'>" + marginText(r) + "</span></div>";
    if (useP) h += "<div class='row'><span>D win chance</span><span class='num'>" + pct(r.p) + "</span></div>";
    if (useP && r.lo != null) h += "<div class='row'><span>D share, 80%</span><span class='num'>" + pct(r.lo, 1) + " to " + pct(r.hi, 1) + "</span></div>";
    if (r.rating) h += "<div class='row'><span>Rating</span><span><i class='sw r-" + r.rating.key + "'></i>" + r.rating.label + "</span></div>";
    return h;
  }
  function attachTip(el, r, useP) {
    el.tabIndex = 0;
    el.setAttribute("aria-label", raceName(r) + ": " + (isFixed(r) ? fixedText(r) : (r.rating ? r.rating.label + ", " : "") + marginText(r)));
    var show = function (ev) {
      tip.innerHTML = tipHTML(r, useP); tip.hidden = false;
      var b = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
      var x = Math.min(Math.max(8, b.left + b.width / 2 - tw / 2), window.innerWidth - tw - 8);
      var y = b.top - th - 8; if (y < 8) y = b.bottom + 8;
      tip.style.left = x + "px"; tip.style.top = y + "px";
      if (ev && ev.type === "click") ev.stopPropagation();
    };
    el.addEventListener("mouseenter", show); el.addEventListener("focus", show); el.addEventListener("click", show);
    el.addEventListener("mouseleave", hideTip); el.addEventListener("blur", hideTip);
  }
  function hideTip() { tip.hidden = true; }
  document.addEventListener("click", hideTip);
  window.addEventListener("scroll", hideTip, { passive: true });

  // ---------------------------------------------------------------- senate map
  function senateMap(senate, useP) {
    var box = $("senate-map"), byState = {};
    senate.forEach(function (r) { (byState[r.state] = byState[r.state] || []).push(r); });
    box.innerHTML = "";
    Object.keys(TILE).forEach(function (st) {
      var d = document.createElement("div"), rc = TILE[st], rs = byState[st];
      d.style.gridRow = rc[0] + 1; d.style.gridColumn = rc[1] + 1;
      if (rs && rs.length) {
        var r = rs[0];
        d.className = "st race " + (r.rating ? "r-" + r.rating.key : "notup") + (isFixed(r) ? " fixed" : "");
        d.innerHTML = st + "<small class='num'>" + (useP ? pct(r.p) : marginText(r).replace(" ", "")) + "</small>";
        attachTip(d, r, useP);
      } else {
        d.className = "st notup"; d.textContent = st; d.title = STATE_NAMES[st] + ": no Senate race in 2026";
      }
      box.appendChild(d);
    });
    $("senate-note").textContent = useP ? "Each state shows the Democratic side's chance of winning. Gray states have no Senate race in 2026."
      : "Each state shows the predicted margin. Gray states have no Senate race in 2026.";
  }

  // ---------------------------------------------------------------- house grid
  function houseGrid(house, useP) {
    var box = $("house-grid"), byState = {};
    house.forEach(function (r) { (byState[r.state] = byState[r.state] || []).push(r); });
    box.innerHTML = "";
    REGIONS.forEach(function (reg) {
      var div = document.createElement("div"); div.className = "region";
      div.innerHTML = "<h3>" + reg[0] + "</h3>";
      reg[1].forEach(function (st) {
        var rs = (byState[st] || []).sort(function (a, b) { return a.dist - b.dist; });
        if (!rs.length) return;
        var row = document.createElement("div"); row.className = "srow";
        row.innerHTML = "<span class='sl' title='" + STATE_NAMES[st] + "'>" + st + "</span>";
        var tiles = document.createElement("div"); tiles.className = "tiles";
        rs.forEach(function (r) {
          var t = document.createElement("div");
          t.className = "t " + (r.rating ? "r-" + r.rating.key : "") + (isFixed(r) ? " fixed" : "");
          attachTip(t, r, useP);
          tiles.appendChild(t);
        });
        row.appendChild(tiles); div.appendChild(row);
      });
      box.appendChild(div);
    });
  }

  function legends(useP) {
    var cuts = useP
      ? ["95%+", "80-95%", "60-80%", "under 60%", "60-80%", "80-95%", "95%+"]
      : ["15+", "8-15", "3-8", "under 3", "3-8", "8-15", "15+"];
    var html = RATINGS.map(function (k, i) {
      return "<span class='key'><i class='sw r-" + k.key + "'></i>" + k.label + " <span class='num'>(" + cuts[i] + ")</span></span>";
    }).join("") + "<span class='key'><i class='sw r-safe-d fixed'></i>Hatched: fixed by the race file</span>";
    var rule = useP ? "<span class='key'>Ratings use the favorite's win probability.</span>"
      : "<span class='key'>Ratings use cutoffs on the predicted margin, in points.</span>";
    $("legend-senate").innerHTML = html + rule;
    $("legend-house").innerHTML = html + rule;
  }

  // ---------------------------------------------------------------- distribution
  function distribution(S, useP) {
    var box = $("dist");
    if (!S) {
      $("dist-note").textContent = "";
      box.style.display = "block";
      box.innerHTML = "<div class='placeholder'><strong>Seat distribution.</strong> " +
        (useP ? "Adding <code>seat_sims.csv</code> (at least 1,000 simulations) shows the range of seat outcomes and each party's chance of a majority here."
              : "Adding win probabilities and <code>seat_sims.csv</code> (HW7) shows the range of seat outcomes and each party's chance of a majority here.") +
        "</div>";
      return;
    }
    $("dist-note").textContent = "How many seats Democrats win across " + S.h.length.toLocaleString() + " simulated elections. Bars at or past the dashed line give Democrats a majority.";
    if (S.isDefault) {
      var why = S.kind === "share"
        ? "Simulated from these predictions with the class model's error sizes: a national error of about 1.7 points shared by every House race (1.3 in the Senate) and a race-specific error of about 4.0 points (5.9 in the Senate)."
        : "Simulated from these win probabilities, with the class model's national swing moving all races together.";
      $("dist-note").innerHTML = esc($("dist-note").textContent) + "<br><span class='badge'>default uncertainty</span> " + esc(why) +
        " An uploaded <code>seat_sims.csv</code> replaces these.";
    }
    box.innerHTML = "";
    box.appendChild(hist("House", S.h, HOUSE_MAJ));
    box.appendChild(hist("Senate", S.s, SENATE_MAJ));
  }
  function hist(lab, xs, maj) {
    var card = document.createElement("div"); card.className = "card";
    var counts = {}, n = xs.length;
    xs.forEach(function (x) { counts[x] = (counts[x] || 0) + 1; });
    var lo = Math.floor(quant(xs, 0.002)), hi = Math.ceil(quant(xs, 0.998));
    lo = Math.min(lo, maj - 1); hi = Math.max(hi, maj);
    var span = hi - lo + 1, W = 480, H = 200, padL = 4, padB = 22, padT = 18;
    var maxC = 0; for (var v = lo; v <= hi; v++) maxC = Math.max(maxC, counts[v] || 0);
    var bw = (W - padL * 2) / span, gap = bw > 4 ? 2 : (bw > 2 ? 1 : 0);
    var pm = xs.filter(function (x) { return x >= maj; }).length / n;
    var svg = "<svg viewBox='0 0 " + W + " " + (H + padB + padT) + "' role='img' aria-label='" + lab + " seat distribution: Democrats win a majority in " + pct(pm) + " of simulations'>";
    for (v = lo; v <= hi; v++) {
      var c = counts[v] || 0; if (!c) continue;
      var h = Math.max(1, (H - 4) * c / maxC), x = padL + (v - lo) * bw, y = padT + H - h;
      var col = v >= maj ? "var(--likely-d)" : "var(--likely-r)";
      svg += "<rect class='b' x='" + (x + gap / 2).toFixed(2) + "' y='" + y.toFixed(2) + "' width='" + Math.max(0.6, bw - gap).toFixed(2) + "' height='" + h.toFixed(2) +
        "' rx='" + Math.min(2, (bw - gap) / 2).toFixed(2) + "' fill='" + col + "' data-v='" + v + "' data-c='" + c + "'></rect>";
    }
    svg += "<line class='base' x1='0' x2='" + W + "' y1='" + (padT + H) + "' y2='" + (padT + H) + "'></line>";
    var mx = padL + (maj - lo) * bw;
    svg += "<line class='maj' x1='" + mx + "' x2='" + mx + "' y1='" + (padT - 6) + "' y2='" + (padT + H) + "'></line>";
    svg += "<text class='majlab' x='" + (mx + 4) + "' y='" + (padT - 2) + "'>" + maj + " (majority)</text>";
    var step = span > 60 ? 10 : (span > 25 ? 5 : (span > 10 ? 2 : 1));
    svg += "<g class='axis'>";
    for (v = Math.ceil(lo / step) * step; v <= hi; v += step)
      svg += "<text x='" + (padL + (v - lo + 0.5) * bw) + "' y='" + (padT + H + 16) + "' text-anchor='middle'>" + v + "</text>";
    svg += "</g></svg>";
    card.innerHTML = "<h3>" + lab + "</h3><p class='note'>Democrats win " + (lab === "House" ? "a majority" : "control") + " in <strong class='num'>" + pct(pm) + "</strong> of simulations.</p>" + svg;
    card.querySelectorAll("rect.b").forEach(function (rc) {
      var f = function () {
        tip.innerHTML = "<b>" + rc.dataset.v + " Democratic seats</b><div class='row'><span>Share of simulations</span><span class='num'>" + pct(rc.dataset.c / n, 1) + "</span></div>";
        tip.hidden = false; var b = rc.getBoundingClientRect();
        tip.style.left = Math.min(Math.max(8, b.left - tip.offsetWidth / 2), window.innerWidth - tip.offsetWidth - 8) + "px";
        tip.style.top = Math.max(8, b.top - tip.offsetHeight - 8) + "px";
      };
      rc.addEventListener("mouseenter", f); rc.addEventListener("click", function (e) { f(); e.stopPropagation(); });
      rc.addEventListener("mouseleave", hideTip);
    });
    return card;
  }

  // ---------------------------------------------------------------- table
  function table(races, useP, useI) {
    var office = "all", q = "", all = false, N = 30;
    var scored = races.filter(function (r) { return !isFixed(r) && r.share != null; });
    var close = function (r) { return useP ? Math.abs(r.p - 0.5) : Math.abs(r.share - 0.5); };
    scored.sort(function (a, b) { return close(a) - close(b); });
    $("table-note").textContent = useP ? "Sorted by how close the win probability is to 50%." : "Sorted by predicted margin, closest first. Margins are in points (Democratic share minus Republican share).";
    function draw() {
      var rows = scored.filter(function (r) {
        if (office !== "all" && r.office !== office) return false;
        if (!q) return true;
        var hay = (raceName(r) + " " + r.state + " " + STATE_NAMES[r.state] + " " + r.dem_candidate + " " + r.rep_candidate).toLowerCase();
        return hay.indexOf(q) >= 0;
      });
      var shown = (all || q) ? rows : rows.slice(0, N);
      var head = "<thead><tr><th>Race</th><th>D side</th><th>R side</th><th class='r'>Margin</th>" +
        (useP ? "<th class='r'>D win</th>" : "") + (useI ? "<th class='r'>D share, 80% range</th>" : "") + "<th>Rating</th></tr></thead>";
      var body = shown.map(function (r) {
        return "<tr><td>" + esc(raceName(r)) + "</td><td class='cand'>" + sideLabel(r.dem_candidate, r.d_side_party, "none") +
          "</td><td class='cand'>" + sideLabel(r.rep_candidate, r.r_side_party, "none") + "</td><td class='r num'>" + marginText(r) + "</td>" +
          (useP ? "<td class='r num'>" + pct(r.p) + "</td>" : "") +
          (useI ? "<td class='r num'>" + pct(r.lo, 1) + " to " + pct(r.hi, 1) + "</td>" : "") +
          "<td><span class='pill r-" + r.rating.key + "'>" + r.rating.label + "</span></td></tr>";
      }).join("");
      $("races-table").innerHTML = head + "<tbody>" + (body || "<tr><td colspan='7' class='note'>No matching races.</td></tr>") + "</tbody>";
      var btn = $("show-all");
      btn.hidden = !!q || rows.length <= N;
      btn.textContent = all ? "Show only the " + N + " closest" : "Show all " + rows.length + " contested races";
    }
    document.querySelectorAll(".seg button").forEach(function (b) {
      b.addEventListener("click", function () {
        document.querySelectorAll(".seg button").forEach(function (x) { x.classList.toggle("on", x === b); });
        office = b.dataset.office; draw();
      });
    });
    $("search").addEventListener("input", function (e) { q = e.target.value.trim().toLowerCase(); draw(); });
    $("show-all").addEventListener("click", function () { all = !all; draw(); });
    draw();
  }

  function method() {
    var m = (CFG.method || []).filter(function (p) { return p && String(p).trim(); });
    $("method-block").hidden = false;
    if (!m.length) {
      $("method").innerHTML = "<div class='placeholder'><strong>Describe your model here.</strong> Open <code>config.js</code> in your repository and write two or three short paragraphs under <code>method</code>: what your forecast is built from, how you set the national environment, and how you handled uncertainty.</div>";
      return;
    }
    $("method").innerHTML = m.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
  }
})();
