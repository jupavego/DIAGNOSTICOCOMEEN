/* ============================================================================
   ui/arranque.js — Punto de entrada
   ----------------------------------------------------------------------------
   Esta línea vivía como <script> en línea dentro de index.html, y el CSP de
   producción la bloqueaba: 'script-src self' no admite código incrustado, así
   que la aplicación no arrancaba y la página quedaba en blanco.

   La solución correcta es sacar el código a un archivo, no debilitar el CSP
   con 'unsafe-inline'. Ese permiso abriría la puerta a la inyección de scripts
   en una aplicación que maneja datos de contacto de negocios reales.
   ========================================================================== */
(function (global) {
  'use strict';

  function arrancar() {
    var raiz = document.getElementById('app');
    if (raiz) global.COMEEN.ui.app.iniciar(raiz);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
