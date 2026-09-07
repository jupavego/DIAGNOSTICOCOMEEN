/* ============================================================================
   ui/app.js — Armazón y navegación
   ----------------------------------------------------------------------------
   Une almacenamiento, asistente, resultado, panel y ficha. Es el único módulo
   que conoce el estado de la aplicación completa.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = global.COMEEN.ui.util;
  var el = U.el;

  var estado = {
    vista: 'panel',        // panel | asistente | resultado | ficha
    registros: [],
    registroActivo: null,
    almacen: null
  };

  var raiz, zonaBarra, zonaContenido;

  /* ── Barra superior ─────────────────────────────────────────────────────── */
  function pintarBarra() {
    U.vaciar(zonaBarra);
    var enPanel = estado.vista === 'panel';

    zonaBarra.appendChild(el('div.barra__vidrio', null, [
      el('div.barra__marca', null, [
        el('span.barra__sello', { 'aria-hidden': 'true' }, '🍽'),
        'COMEEN',
        el('span.barra__sufijo', { texto: 'Diagnóstico digital' })
      ]),
      el('div.barra__acciones', null, [
        el('button.barra__btn', {
          type: 'button',
          'aria-current': enPanel ? 'page' : null,
          onclick: irAlPanel
        }, 'Panel'),
        el('button.barra__btn', { type: 'button', onclick: nuevoDiagnostico }, 'Nuevo')
      ])
    ]));
  }

  function avisoModo() {
    if (!estado.almacen) return null;
    var local = estado.almacen.modo === 'local';
    return el('div.aviso-modo' + (local ? '.aviso-modo--local' : ''), null, [
      el('span.aviso-modo__punto'),
      local ? 'Guardando en este dispositivo · ' + estado.registros.length + ' negocio(s)'
            : 'Base compartida COMEEN · ' + estado.registros.length + ' negocio(s)'
    ]);
  }

  /* ── Datos ──────────────────────────────────────────────────────────────── */
  function recargar() {
    return estado.almacen.listar().then(function (lista) {
      estado.registros = lista;
      return lista;
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
    estado.vista = 'panel';
    estado.registroActivo = null;
    pintar();
    global.scrollTo(0, 0);
  }

  function nuevoDiagnostico(registroPrevio) {
    global.COMEEN.almacenamiento.borrador.limpiar();
    estado.registroActivo = global.COMEEN.diagnostico.nuevoRegistro();
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

  /* Retomar el cuestionario que quedó a medias. El borrador se anuncia en el
     panel, a la vista, en lugar de aparecer como un diálogo al azar. */
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
      .then(function () { U.mensaje('Diagnóstico eliminado.'); irAlPanel(); });
  }

  /* Carga los casos ficticios de verificación como datos de ejemplo. Quedan
     marcados para no confundirlos nunca con negocios reales. */
  function cargarEjemplos() {
    if (!global.COMEEN.casos) { U.mensaje('Los casos de ejemplo no están disponibles.'); return; }
    var pendientes = global.COMEEN.casos.map(function (caso, i) {
      var r = global.COMEEN.diagnostico.nuevoRegistro();
      r.id = 'ejemplo-' + (i + 1);
      Object.keys(caso.negocio).forEach(function (k) { r.negocio[k] = caso.negocio[k]; });
      r.madurez = caso.madurez;
      r.canales = caso.canales;
      r.brechas = caso.brechas;
      r.prioridades = caso.prioridades.slice();
      r.pago = caso.pago;
      r.esEjemplo = true;
      r.notas = caso.nota;
      return estado.almacen.guardar(r);
    });
    Promise.all(pendientes)
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

  /* ── Render ─────────────────────────────────────────────────────────────── */
  function pintar() {
    pintarBarra();
    U.vaciar(zonaContenido);

    /* Cada vista pide su propio ancho: el cuestionario angosto para leerse en
       el celular; el resultado y la ficha, anchos, para no encajonar la
       información en una columna estrecha. */
    var anchos = { panel: '.capa--ancha', ficha: '.capa--ancha', resultado: '.capa--media', asistente: '.capa--angosta' };
    var capa = el('div.capa' + (anchos[estado.vista] || '.capa--angosta'));
    zonaContenido.appendChild(capa);

    if (estado.vista === 'asistente') {
      global.COMEEN.ui.asistente.crear(capa, {
        registro: estado.registroActivo,
        indiceInicial: estado.indiceInicial,
        alSalir: function () {
          /* No se pide confirmación: el avance ya quedó guardado en cada toque
             y el panel ofrece retomarlo. */
          U.mensaje('Su avance quedó guardado. Puede retomarlo desde el panel.');
          irAlPanel();
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
      global.COMEEN.ui.resultado.pintar(capa, estado.registroActivo, [
        el('button.btn.btn--principal', { type: 'button', onclick: irAlPanel }, 'Guardar y volver al panel'),
        el('button.btn.btn--secundario', {
          type: 'button', onclick: function () { abrirFicha(estado.registroActivo.id); }
        }, 'Abrir la ficha'),
        el('button.btn.btn--fantasma', { type: 'button', onclick: function () { nuevoDiagnostico(); } }, 'Levantar otro negocio')
      ]);
      capa.insertBefore(avisoModo() || el('span'), capa.firstChild);
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
      /* En base compartida, los cambios de otras personas llegan solos. */
      if (almacen.modo === 'compartido') {
        almacen.suscribir(function (lista) {
          estado.registros = lista;
          if (estado.vista === 'panel') pintar();
        });
      }
      return recargar();
    }).then(pintar);
  }

  global.COMEEN.ui.app = { iniciar: iniciar };
})(typeof globalThis !== 'undefined' ? globalThis : this);
