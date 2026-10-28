// Web-preview stand-in for the server: answers /_api/* from a recorded snapshot of the local test family (owner@family.test).
// Reads work; plays work (runs aren't saved); writes politely refuse. No real accounts, no network calls.
// Preview extra: an endless live Family War (Quick Battle Banner, dock tab + glow) unless the URL has ?battle=0.
(function () {
  var REC = window.__DEMO_API || {}, real = window.fetch.bind(window);
  var q = new URLSearchParams(location.search);
  try { if (q.has("battle")) sessionStorage.setItem("mom:preview:battle", q.get("battle")); } catch (e) {}
  var battleOn = function () { try { return sessionStorage.getItem("mom:preview:battle") !== "0"; } catch (e) { return true; } };
  var J = function (status, obj) { return new Response(JSON.stringify(obj), { status: status, headers: { "Content-Type": "application/json" } }); };
  var CYCLE = 45 * 60 * 1000, pts = 0, hits = 0, charges = 2;
  var lastCharge = Date.now();
  function live() {
    var now = Date.now();
    var ends = now + (CYCLE - (now % CYCLE)) + (now % CYCLE > CYCLE - 60000 ? CYCLE : 0); // always >= 1 min ahead; restarts every 45 min
    if (charges < 2 && now - lastCharge >= 60000) { charges++; lastCharge = now; }
    var ready = charges > 0;
    return { json: { live: { gameId: "galaxy-strike", title: "Galaxy Strike: Family War", icon: "🚀", open: "./?open=galaxy-war", warId: 4, practice: false,
      endsAt: new Date(ends).toISOString(), now: new Date(now).toISOString(), final: false, position: hits > 2 ? 1 : 2, of: 4, points: pts, gold: hits > 2,
      repairing: false, charges: charges, cap: 2, nextChargeAt: new Date(lastCharge + 60000).toISOString(), chargeEveryMs: 60000,
      actions: [{ id: "hit", icon: "💥", label: "Hit", hint: "Hit Star Jackals (bot)", enabled: ready }, { id: "mine", icon: "⛏️", label: "Mine", hint: "Send a mining ship for a shield bonus", enabled: ready }],
      alert: null }, nextAt: null } };
  }
  // the recorded practice war, shifted onto the real clock and ending with the banner's live window
  function war() {
    var b = JSON.parse(REC["/_api/games/galaxy/war?practice=1"].body), w = b.json.war; if (!w) return b;
    var L = live().json.live, now = Date.now(), off = now - w.now, ends = Date.parse(L.endsAt);
    (function shift(o) { for (var k in o) { var v = o[k]; if (typeof v === "number" && v > 1.6e12) o[k] = v + off; else if (v && typeof v === "object") shift(v); } })(w);
    w.endsAt = ends; w.startsAt = Math.min(w.startsAt, now); w.practice = false; w.over = false;
    if (w.me) { w.me.charges = L.charges; w.me.nextChargeAt = Date.parse(L.nextChargeAt); }
    return b;
  }
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || String(input);
    var i = url.indexOf("/_api/"); if (i < 0) return real(input, init);
    var path = url.slice(i), method = ((init && init.method) || (input && input.method) || "GET").toUpperCase();
    var b = {}; try { b = JSON.parse(init.body).json || {}; } catch (e) {}
    if (method === "GET") {
      if (path.indexOf("/_api/games/live") === 0 && battleOn()) return Promise.resolve(J(200, live()));
      if (path.indexOf("/_api/games/galaxy/war") === 0 && battleOn() && REC["/_api/games/galaxy/war?practice=1"]) return Promise.resolve(J(200, war()));
      var hit = REC[path] || REC[path.split("?")[0]];
      if (hit) return Promise.resolve(new Response(hit.body, { status: hit.status, headers: { "Content-Type": "application/json" } }));
      return Promise.resolve(J(404, { json: { error: "Not available in the web preview" } }));
    }
    if (path.indexOf("/_api/games/quick") === 0 && battleOn()) {
      if (charges <= 0) return Promise.resolve(J(400, { json: { error: "Recharging — next charge in under a minute" } }));
      if (charges === 2) lastCharge = Date.now();
      charges--; hits++; pts += b.action === "mine" ? 40 : 120;
      return Promise.resolve(J(200, { json: { ok: true, text: b.action === "mine" ? "⛏️ Mining ship sent: +40 (preview)" : "💥 Direct hit on Star Jackals: +120 (preview)" } }));
    }
    if (path.indexOf("/_api/games/run/start") === 0) {
      return Promise.resolve(J(200, { json: { runId: "preview-" + Date.now(), seed: (Math.random() * 2147483647) | 0, battleKey: null, gameId: b.gameId, mode: b.mode || "practice" } }));
    }
    if (path.indexOf("/_api/games/run/progress") === 0) return Promise.resolve(J(200, { json: { ok: true } }));
    return Promise.resolve(J(400, { json: { error: "Preview mode: this isn't saved" } }));
  };
})();
