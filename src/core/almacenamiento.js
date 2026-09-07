/* ============================================================================
   core/almacenamiento.js — Capa de datos
   ----------------------------------------------------------------------------
   Dos adaptadores tras una misma interfaz:

     compartido → base de datos del artefacto publicado. Varias personas
                  levantando negocios en la calle ven la misma información.
     local      → localStorage del navegador. Funciona abriendo el archivo
                  directamente, sin servidor ni conexión.

   La interfaz elige adaptador al arrancar; el resto de la aplicación no sabe
   cuál está activo.
   ========================================================================== */
(function (global) {
  'use strict';

  var CLAVE_LOCAL = 'comeen.diagnosticos.v2';
  var CLAVE_BORRADOR = 'comeen.borrador.v2';
  var COLECCION = 'negocios';

  /* ── Utilidades de localStorage tolerantes a fallo ─────────────────────── */
  function leerLocal(clave, porDefecto) {
    try {
      var crudo = global.localStorage.getItem(clave);
      return crudo ? JSON.parse(crudo) : porDefecto;
    } catch (e) { return porDefecto; }
  }
  function escribirLocal(clave, valor) {
    try { global.localStorage.setItem(clave, JSON.stringify(valor)); return true; }
    catch (e) { return false; }
  }

  /* ── Adaptador local ───────────────────────────────────────────────────── */
  function adaptadorLocal() {
    var oyentes = [];
    function todos() { return leerLocal(CLAVE_LOCAL, []); }
    function avisar() { var lista = todos(); oyentes.forEach(function (f) { f(lista); }); }

    return {
      modo: 'local',
      etiqueta: 'Este dispositivo',
      listar: function () { return Promise.resolve(todos()); },
      obtener: function (id) {
        var r = todos().filter(function (x) { return x.id === id; })[0] || null;
        return Promise.resolve(r);
      },
      guardar: function (registro) {
        var lista = todos();
        var i = -1;
        for (var k = 0; k < lista.length; k++) if (lista[k].id === registro.id) i = k;
        registro.actualizado = new Date().toISOString();
        if (i >= 0) lista[i] = registro; else lista.unshift(registro);
        var ok = escribirLocal(CLAVE_LOCAL, lista);
        avisar();
        return ok ? Promise.resolve(registro)
                  : Promise.reject(new Error('No se pudo guardar en este dispositivo. Puede que el almacenamiento esté lleno o bloqueado.'));
      },
      eliminar: function (id) {
        escribirLocal(CLAVE_LOCAL, todos().filter(function (x) { return x.id !== id; }));
        avisar();
        return Promise.resolve();
      },
      suscribir: function (fn) {
        oyentes.push(fn);
        fn(todos());
        return function () { oyentes = oyentes.filter(function (f) { return f !== fn; }); };
      }
    };
  }

  /* ── Adaptador compartido (capacidad db del artefacto) ─────────────────── */
  function adaptadorCompartido(db) {
    return {
      modo: 'compartido',
      etiqueta: 'Base compartida COMEEN',
      listar: function () {
        return db.collection(COLECCION).get().then(function (snap) {
          return snap.docs.map(function (d) { return d.data(); })
            .sort(function (a, b) { return (b.actualizado || '').localeCompare(a.actualizado || ''); });
        });
      },
      obtener: function (id) {
        return db.doc(COLECCION + '/' + id).get().then(function (s) {
          return s.exists ? s.data() : null;
        });
      },
      guardar: function (registro) {
        registro.actualizado = new Date().toISOString();
        return db.doc(COLECCION + '/' + registro.id).set(registro).then(function () { return registro; });
      },
      eliminar: function (id) { return db.doc(COLECCION + '/' + id).delete(); },
      suscribir: function (fn) {
        return db.collection(COLECCION).onSnapshot(function (snap) {
          fn(snap.docs.map(function (d) { return d.data(); })
            .sort(function (a, b) { return (b.actualizado || '').localeCompare(a.actualizado || ''); }));
        }, function () { /* la interfaz sigue mostrando lo último recibido */ });
      }
    };
  }

  /* Resuelve el adaptador disponible. Nunca falla: si no hay base compartida,
     el trabajo de campo continúa en el dispositivo. */
  function iniciar() {
    var local = adaptadorLocal();
    if (!global.claude || typeof global.claude.use !== 'function') {
      return Promise.resolve(local);
    }
    return global.claude.use('db')
      .then(function (db) { return db ? adaptadorCompartido(db) : local; })
      .catch(function () { return local; });
  }

  /* ── Borrador en curso (siempre local: es progreso, no dato definitivo) ── */
  var borrador = {
    leer: function () { return leerLocal(CLAVE_BORRADOR, null); },
    escribir: function (estado) { return escribirLocal(CLAVE_BORRADOR, estado); },
    limpiar: function () { try { global.localStorage.removeItem(CLAVE_BORRADOR); } catch (e) {} }
  };

  global.COMEEN = global.COMEEN || {};
  global.COMEEN.almacenamiento = { iniciar: iniciar, borrador: borrador, CLAVE_LOCAL: CLAVE_LOCAL };
})(typeof globalThis !== 'undefined' ? globalThis : this);
