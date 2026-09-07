/* ============================================================================
   ui/app.js — Armazón, ruteo y navegación
   ----------------------------------------------------------------------------
   Dos entradas, y esa es toda la separación de usuarios del sistema:

     /         ENCUESTA.  Sin ingreso. La diligencia el comerciante, o quien
                          esté en campo. Solo puede escribir.
     /panel    PANEL.     Con ingreso. Consulta, edita y exporta.

   Quien contesta la encuesta no ve el panel ni sabe que existe: en la ruta
   pública no hay ningún botón que lleve allá. Al panel se llega escribiendo la
   dirección — y lo que protege los datos no es esconder ese botón, sino el RLS
   de la base, que sin sesión solo permite insertar.

     ?f=campo   marca el diagnóstico como levantado en terreno, sin crear
                usuarios ni roles para distinguirlo.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = global.COMEEN.ui.util;
  var el = U.el;

  var estado = {
    modo: 'encuesta',      // encuesta | panel
    vista: 'panel',        // panel | asistente | resultado | ficha | ingreso
    origen: 'publico',     // publico | campo
    registros: [],
    registroActivo: null,
    indiceInicial: 0,
    almacen: null
  };

  var raiz, zonaBarra, zonaContenido;

  function exigeIngreso() {
    var cfg = global.COMEEN.configSupabase;
    /* Sin base de datos configurada no hay a quién autenticar: la aplicación
       trabaja contra el dispositivo y el panel queda abierto. Es el modo de
       desarrollo y el de uso sin conexión. */
    return !!(cfg && cfg.configurado);
  }

  function conSesion() {
    return !exigeIngreso() || (global.COMEEN.supabase && global.COMEEN.supabase.haySesion());
  }

  /* ── Ruteo ──────────────────────────────────────────────────────────────── */
  function leerRuta() {
    var ruta = global.location.pathname || '';
    var parametros = new URLSearchParams(global.location.search || '');
    estado.modo = (/\/panel\/?$/.test(ruta) || parametros.get('vista') === 'panel') ? 'panel' : 'encuesta';
    estado.origen = parametros.get('f') === 'campo' ? 'campo' : 'publico';
  }

  /* ── Barra superior ─────────────────────────────────────────────────────── */
  function pintarBarra() {
    U.vaciar(zonaBarra);
    var acciones = el('div.barra__acciones');

    if (estado.modo === 'panel' && conSesion()) {
      acciones.appendChild(el('button.barra__btn', {
        type: 'button',
        'aria-current': estado.vista === 'panel' ? 'page' : null,
        onclick: irAlPanel
      }, 'Panel'));
      acciones.appendChild(el('button.barra__btn', {
        type: 'button', onclick: function () { nuevoDiagnostico(); }
      }, 'Nuevo'));
      if (exigeIngreso()) {
        acciones.appendChild(el('button.barra__btn', { type: 'button', onclick: salir }, 'Salir'));
      }
    }

    zonaBarra.appendChild(el('div.barra__vidrio', null, [
      el('div.barra__marca', null, [
        el('span.barra__sello', { 'aria-hidden': 'true' }, '🍽'),
        'COMEEN',
        el('span.barra__sufijo', {
          texto: estado.modo === 'panel' ? 'Panel' : 'Diagnóstico digital'
        })
      ]),
      acciones
    ]));
  }

  function avisoModo() {
    if (!estado.almacen) return null;
    var enCola = global.COMEEN.almacenamiento.pendientes().length;
    var enDispositivo = estado.almacen.modo !== 'supabase';
    var texto;

    if (enCola) {
      texto = enCola + ' diagnóstico(s) esperando conexión para subirse';
    } else if (estado.almacen.modo === 'supabase') {
      texto = 'Base de datos COMEEN · ' + estado.registros.length + ' negocio(s)';
    } else if (estado.almacen.modo === 'compartido') {
      texto = 'Base compartida COMEEN · ' + estado.registros.length + ' negocio(s)';
    } else {
      texto = 'Guardando en este dispositivo · ' + estado.registros.length + ' negocio(s)';
    }

    return el('div.aviso-modo' + (enDispositivo || enCola ? '.aviso-modo--local' : ''), null, [
      el('span.aviso-modo__punto'), texto
    ]);
  }

  /* ── Datos ──────────────────────────────────────────────────────────────── */
  function recargar() {
    if (!estado.almacen.puedeLeer) { estado.registros = []; return Promise.resolve([]); }
    return estado.almacen.listar().then(function (lista) {
      estado.registros = lista;
      return lista;
    }).catch(function (e) {
      U.mensaje(e.message || 'No se pudo leer la base de datos.');
      return estado.registros;
    });
  }

  function guardar(registro, mensaje) {
    return estado.almacen.guardar(registro)
      .then(function () { return recargar(); })
      .then(function () {
        if (mensaje) U.mensaje(mensaje);
        pintar();
      })
      .catch(function (e) { U.mensaje(e.message || 'No se pudo guardar.'); });
  }

  /* ── Navegación ─────────────────────────────────────────────────────────── */
  function irAlPanel() {
    estado.vista = conSesion() ? 'panel' : 'ingreso';
    estado.registroActivo = null;
    pintar();
    global.scrollTo(0, 0);
  }

  function nuevoDiagnostico(registroPrevio) {
    global.COMEEN.almacenamiento.borrador.limpiar();
    estado.registroActivo = global.COMEEN.diagnostico.nuevoRegistro();
    estado.registroActivo.origen = estado.modo === 'panel' ? 'campo' : estado.origen;
    estado.indiceInicial = 0;
    /* Repetir diagnóstico: se conservan los datos del negocio, no las respuestas. */
    if (registroPrevio && registroPrevio.negocio) {
      Object.keys(registroPrevio.negocio).forEach(function (k) {
        estado.registroActivo.negocio[k] = registroPrevio.negocio[k];
      });
    }
    estado.vista = 'asistente';
    pintar();
    global.scrollTo(0, 0);
  }

  function continuarBorrador() {
    var borrador = global.COMEEN.almacenamiento.borrador.leer();
    if (!borrador || !borrador.registro) { U.mensaje('Ya no hay un diagnóstico a medias.'); pintar(); return; }
    estado.registroActivo = borrador.registro;
    estado.indiceInicial = borrador.indice || 0;
    estado.vista = 'asistente';
    pintar();
    global.scrollTo(0, 0);
  }

  function descartarBorrador() {
    global.COMEEN.almacenamiento.borrador.limpiar();
    U.mensaje('Diagnóstico a medias descartado.');
    pintar();
  }

  function abrirFicha(id) {
    estado.registroActivo = estado.registros.filter(function (r) { return r.id === id; })[0] || null;
    if (!estado.registroActivo) { U.mensaje('No se encontró ese negocio.'); return; }
    estado.vista = 'ficha';
    pintar();
    global.scrollTo(0, 0);
  }

  function eliminar(id) {
    estado.almacen.eliminar(id)
      .then(recargar)
      .then(function () { U.mensaje('Diagnóstico eliminado.'); irAlPanel(); })
      .catch(function (e) { U.mensaje(e.message || 'No se pudo eliminar.'); });
  }

  function salir() {
    global.COMEEN.supabase.cerrarSesion().then(function () {
      estado.registros = [];
      estado.vista = 'ingreso';
      pintar();
      global.scrollTo(0, 0);
    });
  }

  function cargarEjemplos() {
    if (!global.COMEEN.casos) { U.mensaje('Los casos de ejemplo no están disponibles.'); return; }
    var enviando = global.COMEEN.casos.map(function (caso, i) {
      var r = global.COMEEN.diagnostico.nuevoRegistro();
      r.id = 'ejemplo-' + (i + 1);
      Object.keys(caso.negocio).forEach(function (k) { r.negocio[k] = caso.negocio[k]; });
      r.madurez = caso.madurez;
      r.canales = caso.canales;
      r.brechas = caso.brechas;
      r.prioridades = caso.prioridades.slice();
      r.pago = caso.pago;
      r.origen = 'ejemplo';
      r.esEjemplo = true;
      r.notas = caso.nota;
      return estado.almacen.guardar(r);
    });
    Promise.all(enviando)
      .then(recargar)
      .then(function () { U.mensaje(global.COMEEN.casos.length + ' negocios de ejemplo cargados.'); pintar(); })
      .catch(function () { U.mensaje('No se pudieron cargar los ejemplos.'); });
  }

  function borrarEjemplos() {
    var ejemplos = estado.registros.filter(function (r) { return r.esEjemplo; });
    Promise.all(ejemplos.map(function (r) { return estado.almacen.eliminar(r.id); }))
      .then(recargar)
      .then(function () { U.mensaje('Ejemplos eliminados.'); pintar(); });
  }

  /* En la encuesta pública el comerciante ve su resultado y termina: no hay
     panel al que volver, ni lista de otros negocios que pueda ver. */
  function accionesEncuesta() {
    return [
      el('button.btn.btn--principal', {
        type: 'button', onclick: function () { nuevoDiagnostico(); }
      }, estado.origen === 'campo' ? 'Levantar otro negocio' : 'Empezar de nuevo')
    ];
  }

  function accionesPanel() {
    return [
      el('button.btn.btn--principal', { type: 'button', onclick: irAlPanel }, 'Guardar y volver al panel'),
      el('button.btn.btn--secundario', {
        type: 'button', onclick: function () { abrirFicha(estado.registroActivo.id); }
      }, 'Abrir la ficha'),
      el('button.btn.btn--fantasma', {
        type: 'button', onclick: function () { nuevoDiagnostico(); }
      }, 'Levantar otro negocio')
    ];
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  function pintar() {
    pintarBarra();
    U.vaciar(zonaContenido);

    /* Cada vista pide su propio ancho: el cuestionario angosto para leerse en
       el celular; el resultado y la ficha, anchos, para no encajonar la
       información en una columna estrecha. */
    var anchos = {
      panel: '.capa--ancha', ficha: '.capa--ancha', resultado: '.capa--media',
      asistente: '.capa--angosta', ingreso: '.capa--angosta'
    };
    var capa = el('div.capa' + (anchos[estado.vista] || '.capa--angosta'));
    zonaContenido.appendChild(capa);

    if (estado.vista === 'ingreso') {
      global.COMEEN.ui.ingreso.pintar(capa, function () {
        estado.vista = 'panel';
        recargar().then(pintar);
      });
      return;
    }

    if (estado.vista === 'asistente') {
      global.COMEEN.ui.asistente.crear(capa, {
        registro: estado.registroActivo,
        indiceInicial: estado.indiceInicial,
        permiteSalir: estado.modo === 'panel',
        alSalir: function () {
          U.mensaje('Su avance quedó guardado. Puede retomarlo cuando quiera.');
          if (estado.modo === 'panel') irAlPanel(); else nuevoDiagnostico();
        },
        alTerminar: function (registro) {
          global.COMEEN.almacenamiento.borrador.limpiar();
          guardar(registro).then(function () {
            estado.registroActivo = registro;
            estado.vista = 'resultado';
            pintar();
            global.scrollTo(0, 0);
          });
        }
      });
      return;
    }

    if (estado.vista === 'resultado') {
      global.COMEEN.ui.resultado.pintar(
        capa, estado.registroActivo,
        estado.modo === 'panel' ? accionesPanel() : accionesEncuesta()
      );
      if (estado.modo === 'panel') capa.insertBefore(avisoModo() || el('span'), capa.firstChild);
      return;
    }

    if (estado.vista === 'ficha') {
      global.COMEEN.ui.ficha.pintar(capa, estado.registroActivo, {
        alVolver: irAlPanel,
        alGuardar: function (msg) { guardar(estado.registroActivo, msg); },
        alEliminar: eliminar,
        alRepetir: function (registro) { nuevoDiagnostico(registro); }
      });
      return;
    }

    global.COMEEN.ui.panel.pintar(capa, estado.registros, {
      borrador: global.COMEEN.almacenamiento.borrador.leer(),
      alContinuarBorrador: continuarBorrador,
      alDescartarBorrador: descartarBorrador,
      alNuevo: function () { nuevoDiagnostico(); },
      alAbrir: abrirFicha,
      alEjemplos: cargarEjemplos,
      alBorrarEjemplos: borrarEjemplos,
      hayEjemplos: estado.registros.some(function (r) { return r.esEjemplo; })
    });

    var aviso = avisoModo();
    if (aviso) capa.appendChild(el('div', { style: 'margin-top:var(--e-6)' }, [aviso]));
  }

  /* ── Arranque ───────────────────────────────────────────────────────────── */
  function iniciar(nodoRaiz) {
    raiz = nodoRaiz;
    leerRuta();

    /* Capa decorativa: va fuera de #app, detrás de todo, y no vuelve a
       tocarse mientras la aplicación se repinta. */
    global.COMEEN.ui.fondo.crear(document.body);

    zonaBarra = el('header.barra');
    zonaContenido = el('main');
    raiz.appendChild(zonaBarra);
    raiz.appendChild(zonaContenido);

    zonaContenido.appendChild(el('div.capa.capa--ancha', null, [
      el('p.campo__ayuda', { texto: 'Cargando…' })
    ]));
    pintarBarra();

    global.COMEEN.almacenamiento.iniciar().then(function (almacen) {
      estado.almacen = almacen;

      if (estado.modo === 'encuesta') {
        /* La ruta pública entra directo al cuestionario: el comerciante no ve
           una lista de negocios ajenos ni un panel. */
        var borrador = global.COMEEN.almacenamiento.borrador.leer();
        if (borrador && borrador.registro) {
          estado.registroActivo = borrador.registro;
          estado.indiceInicial = borrador.indice || 0;
        } else {
          estado.registroActivo = global.COMEEN.diagnostico.nuevoRegistro();
          estado.registroActivo.origen = estado.origen;
          estado.indiceInicial = 0;
        }
        estado.vista = 'asistente';
        pintar();
        return null;
      }

      estado.vista = conSesion() ? 'panel' : 'ingreso';
      if (almacen.modo === 'compartido') {
        almacen.suscribir(function (lista) {
          estado.registros = lista;
          if (estado.vista === 'panel') pintar();
        });
      }
      return recargar().then(pintar);
    }).catch(function (e) {
      U.vaciar(zonaContenido);
      zonaContenido.appendChild(el('div.capa.capa--angosta', null, [
        el('div.vacio', null, [
          el('p.vacio__titulo', { texto: 'No se pudo iniciar la aplicación' }),
          el('p', { texto: (e && e.message) ? e.message : 'Recargue la página e intente de nuevo.' })
        ])
      ]));
    });
  }

  global.COMEEN.ui.app = { iniciar: iniciar, estado: estado };
})(typeof globalThis !== 'undefined' ? globalThis : this);
