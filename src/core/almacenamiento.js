/* ============================================================================
   core/almacenamiento.js — Capa de datos
   ----------------------------------------------------------------------------
   Tres adaptadores tras una misma interfaz. El resto de la aplicación no sabe
   cuál está activo.

     supabase   → base de datos real. Es el modo de producción.
                  Sin sesión solo puede insertar (así lo permite el RLS);
                  con sesión de administrador, leer, editar y borrar.
     compartido → base del artefacto publicado, para uso interno.
     local      → localStorage. Sin servidor y sin conexión.

   COLA DE PENDIENTES. En la calle la señal se cae. Si una inserción falla, el
   diagnóstico no se pierde: queda en el dispositivo y se reintenta solo. Por
   eso 'guardar' nunca le dice al encuestador que perdió su trabajo.
   ========================================================================== */
(function (global) {
  'use strict';

  var CLAVE_LOCAL = 'comeen.diagnosticos.v2';
  var CLAVE_BORRADOR = 'comeen.borrador.v2';
  var CLAVE_PENDIENTES = 'comeen.pendientes.v2';
  var COLECCION = 'negocios';

  /* ── localStorage tolerante a fallo ─────────────────────────────────────── */
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

  /* ── Traducción entre el registro de la app y la fila de la tabla ───────── */
  /* Las columnas derivadas existen para filtrar y graficar en SQL sin abrir el
     json. La verdad completa vive en 'datos': cuando el instrumento cambie, el
     json absorbe la nueva forma sin migrar la tabla. */
  function aFila(registro) {
    var d = global.COMEEN.diagnostico.evaluar(registro);
    var n = registro.negocio || {};
    return {
      id: registro.id,
      creado: registro.creado,
      actualizado: registro.actualizado,
      version_instrumento: registro.versionInstrumento,
      origen: registro.origen || 'publico',
      negocio_nombre: n.nombre || 'Sin nombre',
      categoria: global.COMEEN.diagnostico.textoCampo(n, 'categoria'),
      municipio: n.municipio || null,
      barrio: n.barrio || null,
      nivel: d.nivel.id,
      puntaje: d.puntaje,
      pago: registro.pago || null,
      estado: registro.estado || 'pendiente',
      datos: registro
    };
  }

  function deFila(fila) {
    var r = fila.datos || {};
    /* Las columnas que el panel edita mandan sobre lo que traiga el json:
       si se cambió el estado por SQL, esa es la verdad. */
    r.id = fila.id;
    r.estado = fila.estado || r.estado || 'pendiente';
    r.origen = fila.origen || r.origen || 'publico';
    r.creado = fila.creado || r.creado;
    r.actualizado = fila.actualizado || r.actualizado;
    return r;
  }

  /* ── Cola de pendientes ─────────────────────────────────────────────────── */
  function pendientes() { return leerLocal(CLAVE_PENDIENTES, []); }

  function encolar(registro) {
    var cola = pendientes().filter(function (r) { return r.id !== registro.id; });
    cola.push(registro);
    escribirLocal(CLAVE_PENDIENTES, cola);
  }

  function desencolar(id) {
    escribirLocal(CLAVE_PENDIENTES, pendientes().filter(function (r) { return r.id !== id; }));
  }

  /* Reintenta la cola. Se llama al arrancar y cuando vuelve la conexión. */
  function sincronizar() {
    var cola = pendientes();
    if (!cola.length) return Promise.resolve(0);
    var enviados = 0;
    return cola.reduce(function (previa, registro) {
      return previa.then(function () {
        return global.COMEEN.supabase.insertar(aFila(registro))
          .then(function () { desencolar(registro.id); enviados++; })
          .catch(function () { /* sigue pendiente; se reintenta después */ });
      });
    }, Promise.resolve()).then(function () { return enviados; });
  }

  /* ── Adaptador local ────────────────────────────────────────────────────── */
  function adaptadorLocal() {
    var oyentes = [];
    function todos() { return leerLocal(CLAVE_LOCAL, []); }
    function avisar() { var lista = todos(); oyentes.forEach(function (f) { f(lista); }); }

    return {
      modo: 'local',
      etiqueta: 'Este dispositivo',
      puedeLeer: true,
      listar: function () { return Promise.resolve(todos()); },
      obtener: function (id) {
        return Promise.resolve(todos().filter(function (x) { return x.id === id; })[0] || null);
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

  /* ── Adaptador Supabase ─────────────────────────────────────────────────── */
  function adaptadorSupabase() {
    var S = global.COMEEN.supabase;

    return {
      modo: 'supabase',
      etiqueta: 'Base de datos COMEEN',
      /* Sin sesión el RLS no permite leer: el panel exige ingresar. */
      get puedeLeer() { return S.haySesion(); },

      listar: function () {
        if (!S.haySesion()) return Promise.resolve([]);
        return S.listar().then(function (filas) { return (filas || []).map(deFila); });
      },

      obtener: function (id) {
        if (!S.haySesion()) return Promise.resolve(null);
        return S.obtener(id).then(function (fila) { return fila ? deFila(fila) : null; });
      },

      guardar: function (registro) {
        registro.actualizado = new Date().toISOString();
        var fila = aFila(registro);

        if (S.haySesion()) {
          /* El administrador edita filas existentes: PATCH y, si no existía
             todavía, se crea. */
          return S.actualizar(registro.id, fila)
            .then(function () { return registro; })
            .catch(function (e) {
              if (e.estado === 404 || e.estado === 406) return S.insertar(fila).then(function () { return registro; });
              throw e;
            });
        }

        /* Encuesta pública: insertar y nada más. Si falla, queda en cola —
           nunca se le dice al encuestador que perdió el diagnóstico. */
        return S.insertar(fila)
          .then(function () { desencolar(registro.id); return registro; })
          .catch(function () {
            encolar(registro);
            return registro;
          });
      },

      eliminar: function (id) { return S.eliminar(id); },

      /* Sin websockets: el panel refresca cada 45 segundos. Para el volumen de
         un municipio es de sobra, y evita mantener una conexión abierta en un
         celular en la calle. */
      suscribir: function (fn) {
        var vivo = true;
        var self = this;
        function tic() {
          if (!vivo) return;
          self.listar().then(function (lista) { if (vivo) fn(lista); }).catch(function () {});
        }
        tic();
        var reloj = setInterval(tic, 45000);
        return function () { vivo = false; clearInterval(reloj); };
      }
    };
  }

  /* ── Adaptador del artefacto publicado ──────────────────────────────────── */
  function adaptadorCompartido(db) {
    return {
      modo: 'compartido',
      etiqueta: 'Base compartida COMEEN',
      puedeLeer: true,
      listar: function () {
        return db.collection(COLECCION).get().then(function (snap) {
          return snap.docs.map(function (d) { return d.data(); })
            .sort(function (a, b) { return (b.actualizado || '').localeCompare(a.actualizado || ''); });
        });
      },
      obtener: function (id) {
        return db.doc(COLECCION + '/' + id).get().then(function (s) { return s.exists ? s.data() : null; });
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

  /* Elige el adaptador disponible, en orden de preferencia. Nunca falla: si no
     hay base de datos, el trabajo de campo continúa en el dispositivo. */
  function iniciar() {
    if (global.COMEEN.configSupabase && global.COMEEN.configSupabase.configurado) {
      var sb = adaptadorSupabase();
      /* Reintenta en silencio lo que quedó pendiente de una jornada anterior. */
      sincronizar().catch(function () {});
      global.addEventListener('online', function () { sincronizar().catch(function () {}); });
      return Promise.resolve(sb);
    }

    var local = adaptadorLocal();
    if (!global.claude || typeof global.claude.use !== 'function') return Promise.resolve(local);

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
  global.COMEEN.almacenamiento = {
    iniciar: iniciar,
    borrador: borrador,
    sincronizar: sincronizar,
    pendientes: pendientes,
    aFila: aFila,
    deFila: deFila,
    CLAVE_LOCAL: CLAVE_LOCAL
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
