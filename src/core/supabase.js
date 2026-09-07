/* ============================================================================
   core/supabase.js — Cliente REST y sesión
   ----------------------------------------------------------------------------
   Habla directo con la API de Supabase por HTTP. No se usa la librería oficial
   a propósito: son unas doscientas líneas contra unos cien kilobytes, y así la
   aplicación sigue sin paso de compilación y sin dependencias externas.

   Dos modos de acceso, que es toda la separación de permisos que necesita el
   sistema:

     sin sesión  → la llave 'anon'. Las políticas RLS solo le permiten INSERTAR.
     con sesión  → el token del administrador. Puede leer, editar y borrar.

   Quien diligencia la encuesta nunca inicia sesión. Quien consulta el panel,
   siempre.
   ========================================================================== */
(function (global) {
  'use strict';

  var CLAVE_SESION = 'comeen.sesion';
  var cfg = null;

  function config() {
    if (!cfg) cfg = global.COMEEN.configSupabase;
    return cfg;
  }

  /* ── Sesión guardada ────────────────────────────────────────────────────── */
  function leerSesion() {
    try {
      var crudo = global.localStorage.getItem(CLAVE_SESION);
      return crudo ? JSON.parse(crudo) : null;
    } catch (e) { return null; }
  }

  function escribirSesion(s) {
    try {
      if (s) global.localStorage.setItem(CLAVE_SESION, JSON.stringify(s));
      else global.localStorage.removeItem(CLAVE_SESION);
    } catch (e) { /* sin almacenamiento: la sesión dura lo que la pestaña */ }
  }

  var sesionMemoria = leerSesion();

  function sesion() { return sesionMemoria; }
  function haySesion() { return !!(sesionMemoria && sesionMemoria.access_token); }
  function correo() { return sesionMemoria && sesionMemoria.user ? sesionMemoria.user.email : null; }

  function guardarSesion(datos) {
    if (!datos || !datos.access_token) return null;
    sesionMemoria = {
      access_token: datos.access_token,
      refresh_token: datos.refresh_token,
      expira: Date.now() + ((datos.expires_in || 3600) * 1000) - 60000, // 1 min de margen
      user: datos.user ? { id: datos.user.id, email: datos.user.email } : null
    };
    escribirSesion(sesionMemoria);
    return sesionMemoria;
  }

  function olvidarSesion() { sesionMemoria = null; escribirSesion(null); }

  /* ── Peticiones ─────────────────────────────────────────────────────────── */
  function cabeceras(extra) {
    var h = {
      'apikey': config().anonKey,
      'Content-Type': 'application/json'
    };
    /* Con sesión manda el token del administrador; sin ella, la llave anónima
       —y entonces el RLS solo deja insertar. */
    h['Authorization'] = 'Bearer ' + (haySesion() ? sesionMemoria.access_token : config().anonKey);
    if (extra) Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
    return h;
  }

  function mensajeDeError(estado, cuerpo) {
    if (estado === 401 || estado === 403) return 'La sesión no tiene permiso para esta operación. Vuelva a ingresar.';
    if (estado === 409) return 'Ese diagnóstico ya existe en la base.';
    if (estado === 0)   return 'Sin conexión con la base de datos. Lo que levante queda guardado en el dispositivo.';
    var detalle = cuerpo && (cuerpo.message || cuerpo.error_description || cuerpo.error || cuerpo.hint);
    return detalle ? String(detalle) : 'La base de datos respondió con un error (' + estado + ').';
  }

  function peticion(ruta, opciones) {
    opciones = opciones || {};
    return fetch(config().url + ruta, {
      method: opciones.metodo || 'GET',
      headers: cabeceras(opciones.cabeceras),
      body: opciones.cuerpo ? JSON.stringify(opciones.cuerpo) : undefined
    }).then(function (r) {
      if (r.status === 204) return null;
      return r.text().then(function (texto) {
        var datos = null;
        if (texto) { try { datos = JSON.parse(texto); } catch (e) { datos = { message: texto }; } }
        if (!r.ok) {
          var err = new Error(mensajeDeError(r.status, datos));
          err.estado = r.status;
          throw err;
        }
        return datos;
      });
    }, function () {
      var err = new Error(mensajeDeError(0));
      err.estado = 0;
      throw err;
    });
  }

  /* Renueva el token si está por vencer. Se llama antes de cada operación del
     panel para que una jornada larga de trabajo no expulse al administrador. */
  function asegurarSesion() {
    if (!haySesion()) return Promise.resolve(null);
    if (Date.now() < sesionMemoria.expira) return Promise.resolve(sesionMemoria);
    var refresco = sesionMemoria.refresh_token;
    if (!refresco) { olvidarSesion(); return Promise.resolve(null); }

    return fetch(config().url + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'apikey': config().anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresco })
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (datos) {
        if (!datos) { olvidarSesion(); return null; }
        return guardarSesion(datos);
      })
      .catch(function () { return sesionMemoria; });
  }

  /* ── Autenticación ──────────────────────────────────────────────────────── */
  function iniciarSesion(email, clave) {
    return fetch(config().url + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'apikey': config().anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: clave })
    }).then(function (r) {
      return r.text().then(function (texto) {
        var datos = texto ? JSON.parse(texto) : null;
        if (!r.ok) {
          throw new Error(r.status === 400
            ? 'Correo o contraseña incorrectos.'
            : mensajeDeError(r.status, datos));
        }
        return guardarSesion(datos);
      });
    }, function () { throw new Error('No se pudo conectar para verificar el ingreso.'); });
  }

  function cerrarSesion() {
    var previa = sesionMemoria;
    olvidarSesion();
    if (!previa) return Promise.resolve();
    return fetch(config().url + '/auth/v1/logout', {
      method: 'POST',
      headers: { 'apikey': config().anonKey, 'Authorization': 'Bearer ' + previa.access_token }
    }).catch(function () { /* la sesión local ya se borró: es lo que importa */ });
  }

  /* ── Tabla de diagnósticos ──────────────────────────────────────────────── */
  function ruta(sufijo) { return '/rest/v1/' + config().tabla + (sufijo || ''); }

  function insertar(fila) {
    /* 'return=minimal' es indispensable: sin política de SELECT para anónimos,
       pedir la fila de vuelta haría fallar una inserción que sí funcionó. */
    return peticion(ruta(), {
      metodo: 'POST',
      cabeceras: { 'Prefer': 'return=minimal,resolution=merge-duplicates' },
      cuerpo: fila
    });
  }

  function listar() {
    return asegurarSesion().then(function () {
      return peticion(ruta('?select=*&order=creado.desc'));
    });
  }

  function obtener(id) {
    return asegurarSesion().then(function () {
      return peticion(ruta('?id=eq.' + encodeURIComponent(id) + '&select=*&limit=1'));
    }).then(function (filas) { return filas && filas.length ? filas[0] : null; });
  }

  function actualizar(id, fila) {
    return asegurarSesion().then(function () {
      return peticion(ruta('?id=eq.' + encodeURIComponent(id)), {
        metodo: 'PATCH',
        cabeceras: { 'Prefer': 'return=minimal' },
        cuerpo: fila
      });
    });
  }

  function eliminar(id) {
    return asegurarSesion().then(function () {
      return peticion(ruta('?id=eq.' + encodeURIComponent(id)), {
        metodo: 'DELETE',
        cabeceras: { 'Prefer': 'return=minimal' }
      });
    });
  }

  global.COMEEN = global.COMEEN || {};
  global.COMEEN.supabase = {
    sesion: sesion, haySesion: haySesion, correo: correo,
    iniciarSesion: iniciarSesion, cerrarSesion: cerrarSesion, asegurarSesion: asegurarSesion,
    insertar: insertar, listar: listar, obtener: obtener, actualizar: actualizar, eliminar: eliminar
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
