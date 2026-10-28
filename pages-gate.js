// Web-preview "tap to enter": browsers (iOS Safari especially) only allow sound after a tap, so the app starts on that tap —
// the hub intro then plays WITH the announcer welcome. The tap also unlocks one shared <audio> element (window.__momVoiceEl,
// reused by hubAnnouncer for every voice line) and the shared Web Audio context (window.__momAudio).
(function () {
  var APP = document.currentScript.getAttribute("data-app"), LABEL = document.currentScript.getAttribute("data-label") || "Tap to enter";
  function silentWav() { var n = 2205, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), s = function (o, t) { for (var i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    s(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); s(8, "WAVE"); s(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 22050, true); v.setUint32(28, 44100, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, "data"); v.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([b], { type: "audio/wav" })); }
  var unlocked = false;
  function unlock() {
    if (unlocked) return; unlocked = true;
    try { var el = window.__momVoiceEl || (window.__momVoiceEl = new Audio()); el.src = silentWav(); var p = el.play(); if (p && p.catch) p.catch(function () { unlocked = false; }); } catch (e) { unlocked = false; }
    try { var AC = window.AudioContext || window.webkitAudioContext; if (AC) { if (!window.__momAudio || window.__momAudio.state === "closed") window.__momAudio = new AC({ latencyHint: "interactive" }); window.__momAudio.resume(); } } catch (e) {}
  }
  // any later tap also unlocks (covers visits that skip the gate)
  ["touchend", "click", "pointerdown"].forEach(function (t) { window.addEventListener(t, unlock, { capture: true, passive: true }); });
  // a page cached from an older publish can ask for code files that a newer publish replaced: reload once to pick up the new page
  var reloadOnce = function () { try { var k = "mom:reload:" + location.pathname, t = +sessionStorage.getItem(k) || 0; if (Date.now() - t < 60000) return false; sessionStorage.setItem(k, String(Date.now())); } catch (e) { return false; } var u = new URL(location.href); u.searchParams.set("r", String(Date.now() % 1e6)); location.replace(u.href); return true; };
  window.__momReloadOnce = reloadOnce;
  window.addEventListener("vite:preloadError", function (e) { if (reloadOnce()) e.preventDefault(); });
  var start = function () { import(new URL(APP, location.href).href).catch(function (e) { if (!reloadOnce()) { document.body.insertAdjacentHTML("beforeend", '<p style="position:fixed;inset:auto 0 40% 0;text-align:center;color:#fff;font-family:system-ui">Couldn\'t load — pull down to refresh</p>'); } }); };
  // once per tab session (data-once = the sessionStorage key that marks it done; the hub uses its own intro key)
  var ONCE = document.currentScript.getAttribute("data-once") || "mom:gate:" + location.pathname, seen = false;
  try { seen = !!sessionStorage.getItem(ONCE); } catch (e) {}
  var q = new URLSearchParams(location.search);
  if (seen || q.has("nogate") || (navigator.userActivation && navigator.userActivation.hasBeenActive)) { start(); return; }
  var g = document.createElement("div"); g.id = "mom-gate"; g.setAttribute("role", "button"); g.setAttribute("aria-label", LABEL + " (sound on)");
  g.innerHTML = '<style>#mom-gate{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;cursor:pointer;color:#fff;font-family:system-ui,-apple-system,sans-serif;background:radial-gradient(90% 60% at 50% 40%,#3b1a78 0%,#150832 55%,#06040f 100%);-webkit-tap-highlight-color:transparent}'
    + '#mom-gate h1{margin:0;text-align:center;font-size:44px;line-height:.95;font-weight:900;letter-spacing:1px;text-transform:uppercase;background:linear-gradient(180deg,#fff,#d9b8ff 60%,#8f6bff);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 22px rgba(170,110,255,.55))}'
    + '#mom-gate .o{width:96px;height:96px;border-radius:50%;display:grid;place-items:center;font-size:34px;background:radial-gradient(circle at 35% 30%,#ffe7a3,#ffb02e 55%,#d9670b);box-shadow:0 0 0 10px rgba(255,190,80,.12),0 0 50px rgba(255,170,60,.6);animation:momp 1.6s ease-in-out infinite}'
    + '#mom-gate p{margin:0;font-size:15px;letter-spacing:3px;text-transform:uppercase;color:#d8ccff;opacity:.9}@keyframes momp{50%{transform:scale(1.08)}}@media (prefers-reduced-motion:reduce){#mom-gate .o{animation:none}}</style>'
    + '<h1>Masters<br>of Music</h1><div class="o">▶</div><p>' + LABEL + ' · 🔊 sound on</p>';
  var go = function () { unlock(); try { sessionStorage.setItem(ONCE, "1"); } catch (e) {} g.remove(); start(); };
  g.addEventListener("click", go, { once: true });
  (document.body ? document.body.appendChild(g) : document.addEventListener("DOMContentLoaded", function () { document.body.appendChild(g); }));
})();
