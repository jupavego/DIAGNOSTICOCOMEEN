/* ============================================================================
   config/conexion.js — Conexión con la base de datos
   ----------------------------------------------------------------------------
   ESTO ES JAVASCRIPT, NO SQL. El archivo que va en el SQL Editor de Supabase
   es supabase/001_diagnosticos.sql, y es el único .sql del proyecto.
   ----------------------------------------------------------------------------
   Pegue aquí los dos valores del proyecto de Supabase:
     Project Settings → API → Project URL  y  anon public

   SOBRE PUBLICAR LA LLAVE: la llave 'anon' está pensada para vivir en el
   navegador; no es un secreto. Lo que protege los datos NO es esconderla, sino
   las políticas RLS de supabase/001_diagnosticos.sql, que permiten insertar de
   forma anónima pero no leer. Si esas políticas no están aplicadas, cualquiera
   con esta llave podría leer toda la tabla.

   NUNCA poner aquí la llave 'service_role': esa sí ignora el RLS.

   Mientras 'url' esté vacío la aplicación funciona igual, guardando en el
   dispositivo. Así se puede trabajar y probar sin base de datos.
   ========================================================================== */
(function (global) {
  'use strict';

  var SUPABASE = {
    url: 'https://iiktbawvhceqzusbvkvx.supabase.co',
    anonKey: 'sb_publishable_Y_cOoe-Cn7Wdj0cT95AGEQ_vBVbUmkH',
    tabla: 'diagnosticos'
  };

  /* Permite apuntar a otro proyecto sin tocar el archivo: útil para probar
     contra una base de pruebas desde la consola del navegador. */
  try {
    var guardado = global.localStorage.getItem('comeen.supabase');
    if (guardado) {
      var extra = JSON.parse(guardado);
      if (extra && extra.url) { SUPABASE.url = extra.url; SUPABASE.anonKey = extra.anonKey; }
    }
  } catch (e) { /* sin localStorage: se usa la configuración de arriba */ }

  SUPABASE.configurado = !!(SUPABASE.url && SUPABASE.anonKey);

  global.COMEEN = global.COMEEN || {};
  global.COMEEN.configSupabase = SUPABASE;
})(typeof globalThis !== 'undefined' ? globalThis : this);
