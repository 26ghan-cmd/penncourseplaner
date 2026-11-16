// Applies the saved theme before the page draws (avoids a light/dark flash) and loads web fonts unless turned off.
(function () {
  var p = {};
  try { var m = document.cookie.match(/(?:^|; )plnr_prefs=([^;]*)/); if (m) p = JSON.parse(decodeURIComponent(m[1])); } catch (e) {}
  if (!p.theme) { try { var ls = JSON.parse(localStorage.getItem("plnr_prefs") || "{}"); if (ls.theme) p = ls; } catch (e) {} }
  document.documentElement.setAttribute("data-theme", p.theme || "system");
  if (!(p.privacy && p.privacy.googleFonts === false)) {
    var l = document.createElement("link"); l.id = "gfonts"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,500;6..72,600&family=JetBrains+Mono:wght@500&display=swap";
    document.head.appendChild(l);
  }
})();
