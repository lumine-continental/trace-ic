/**
 * TRACE IC — Micro-Snippet de Autoatribución para Sitio Web y Landings (< 1 KB)
 * Instituto Continental (https://trace.icontinental.edu.pe)
 *
 * Propósito:
 * 1. Persiste en sessionStorage los parámetros UTM con los que el visitante llegó al sitio.
 * 2. Detecta automáticamente todos los enlaces (<a>) que apunten a `trace.icontinental.edu.pe`
 *    y les inyecta la ruta exacta de la página actual (`_p=/carreras/contabilidad`) más los UTMs
 *    de la sesión, garantizando 100% de precisión incluso si el navegador oculta el HTTP Referer.
 */
(function () {
  var TRACE_HOST = 'trace.icontinental.edu.pe';
  var STORAGE_KEY = 'trace_ic_utms';
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ad_id', 'placement'];

  try {
    var params = new URLSearchParams(window.location.search);
    var stored = {};
    try {
      stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) {}

    var updated = false;
    UTM_KEYS.forEach(function (key) {
      if (params.has(key) && params.get(key)) {
        stored[key] = params.get(key);
        updated = true;
      }
    });
    if (updated) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    }

    function decorateLinks() {
      var links = document.querySelectorAll('a[href*="' + TRACE_HOST + '"]');
      var currentPath = window.location.pathname || '/';
      for (var i = 0; i < links.length; i++) {
        try {
          var url = new URL(links[i].href);
          if (!url.searchParams.has('_p')) {
            url.searchParams.set('_p', currentPath);
          }
          Object.keys(stored).forEach(function (k) {
            if (!url.searchParams.has(k) && stored[k]) {
              url.searchParams.set(k, stored[k]);
            }
          });
          links[i].href = url.toString();
        } catch (err) {}
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', decorateLinks);
    } else {
      decorateLinks();
    }
  } catch (e) {}
})();
