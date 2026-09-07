/* ============================================================================
   ui/resultado.js — Ficha de diagnóstico
   ----------------------------------------------------------------------------
   El resultado NUNCA es solo "Nivel 2". Es: dónde está, qué ya tiene, qué le
   falta y qué haría COMEEN, en ese orden.

   Se muestran primero cuatro servicios como ruta de trabajo; el resto queda
   plegado. Un listado de once servicios no orienta a nadie.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = global.COMEEN.ui.util;
  var el = U.el;
  var SERVICIOS_EN_RUTA = 4;

  function cabecera(registro, d) {
    var cortes = global.COMEEN.niveles.LEVEL_RULES;
    return el('div.resultado__cabecera', null, [
      el('p.resultado__eyebrow', { texto: 'Presencia digital COMEEN' }),
      el('h1.resultado__negocio', { texto: registro.negocio.nombre || 'Negocio sin nombre' }),
      el('span.resultado__nivel', null, [
        el('span.insignia__punto', { style: 'background:var(--nivel-' + d.nivel.id + ')' }),
        d.nivel.etiqueta
      ]),
      el('p.resultado__mensaje', { texto: d.nivel.mensaje }),
      el('div.medidor', null, [
        el('div.medidor__cifra', null, [String(d.puntaje), el('span', { texto: ' / ' + d.maximo + ' puntos' })]),
        el('div.medidor__riel', null, [
          el('div.medidor__avance', { style: 'width:' + Math.max(2, d.porcentaje) + '%' })
        ]),
        el('div.medidor__cortes', null, cortes.map(function (n) {
          return el('span', { texto: n.min + '–' + n.max + ' ' + n.nombre });
        }))
      ])
    ]);
  }

  function notaCoherencia(d) {
    if (!d.nivel.descendido) return null;
    var faltantes = d.nivel.descensos[0].faltantes;
    return el('div.nota-coherencia', null, [
      el('strong', { texto: 'Por puntaje daba ' + d.nivel.nivelPorPuntaje + '. ' }),
      'Todavía no llega ahí porque falta lo esencial: ' + faltantes.join(', ').toLowerCase() + '.'
    ]);
  }

  function listaFortalezas(d) {
    if (!d.fortalezas.length) {
      return el('p.campo__ayuda', { texto: 'Aún no hay elementos consolidados. Todo está por construir, y eso también es un buen punto de partida.' });
    }
    return el('ul.lista-marcas', null, d.fortalezas.map(function (f) {
      return el('li', null, [el('span.marca-si', { texto: '✓' }), f.texto]);
    }));
  }

  function listaOportunidades(d) {
    if (!d.oportunidades.length) {
      return el('p.campo__ayuda', { texto: 'No se detectaron vacíos en las doce variables. Un caso poco frecuente: vale la pena revisar las respuestas.' });
    }
    return el('ul.lista-marcas', null, d.oportunidades.map(function (o) {
      return el('li', null, [
        el('span.' + (o.severidad === 'alta' ? 'marca-falta' : 'marca-parcial'), { texto: o.severidad === 'alta' ? '!' : '~' }),
        o.texto
      ]);
    }));
  }

  function pasoServicio(s, numero) {
    var etiqueta = null;
    if (s.origen === 'ambas') etiqueta = el('span.etiqueta-origen.etiqueta-origen--ambas', { texto: 'lo pidió y le falta' });
    else if (s.origen === 'percibida') etiqueta = el('span.etiqueta-origen.etiqueta-origen--pedida', { texto: 'lo pidió' });
    else etiqueta = el('span.etiqueta-origen', { texto: 'detectado' });

    return el('li.ruta__paso', null, [
      el('span.ruta__orden', { texto: String(numero) }),
      el('div', null, [
        el('div.ruta__nombre', null, [s.icono + ' ' + s.nombre, etiqueta]),
        el('p.ruta__desc', { texto: s.descripcion })
      ])
    ]);
  }

  function bloqueServicios(d) {
    if (!d.servicios.length) {
      return el('div.tarjeta', null, [
        el('p.tarjeta__titulo', { texto: 'Qué recomienda COMEEN' }),
        el('p', { texto: 'No se detectaron brechas ni el negocio pidió nada. Conviene revisarlo en campo antes de darlo por cerrado.' })
      ]);
    }

    var ruta = d.servicios.slice(0, SERVICIOS_EN_RUTA);
    var resto = d.servicios.slice(SERVICIOS_EN_RUTA);

    var tarjeta = el('div.tarjeta', null, [
      el('p.tarjeta__titulo', { texto: 'Qué recomienda COMEEN, en este orden' }),
      el('ol.ruta', null, ruta.map(function (s, i) { return pasoServicio(s, i + 1); }))
    ]);

    if (resto.length) {
      tarjeta.appendChild(el('details.plegable', null, [
        el('summary', { texto: 'Otras ' + resto.length + ' oportunidades detectadas' }),
        el('ol.ruta', { style: 'margin-top:var(--e-2)' },
          resto.map(function (s, i) { return pasoServicio(s, i + 1 + SERVICIOS_EN_RUTA); }))
      ]));
    }
    return tarjeta;
  }

  function bloqueCanales(d) {
    return el('div.tarjeta', null, [
      el('p.tarjeta__titulo', { texto: 'Sus canales hoy' }),
      el('div.canales-fila', null, d.canales.map(function (c) {
        return el('div.canal-pastilla.canal-pastilla--' + c.tono, null, [
          el('span.canal-pastilla__nombre', { texto: c.nombre }),
          el('span.canal-pastilla__estado', { texto: c.texto })
        ]);
      }))
    ]);
  }

  function bloquePrioridadesYPago(registro, d) {
    return el('div.dos-columnas', null, [
      el('div.tarjeta', null, [
        el('p.tarjeta__titulo', { texto: 'Lo que él quiere primero' }),
        d.prioridades.length
          ? el('ol.ruta', null, d.prioridades.map(function (p) {
              return el('li.ruta__paso', null, [
                el('span.ruta__orden', { texto: String(p.posicion) }),
                el('div.ruta__nombre', null, p.icono + ' ' + p.texto)
              ]);
            }))
          : el('p.campo__ayuda', { texto: 'No señaló prioridades.' })
      ]),
      el('div.tarjeta', null, [
        el('p.tarjeta__titulo', { texto: 'Disposición de inversión' }),
        el('p', { style: 'font-family:var(--font-titulo);font-weight:700;font-size:var(--texto-md);margin:0',
                  texto: d.pago ? d.pago.texto : 'Sin respuesta' }),
        el('p.campo__ayuda', { style: 'margin-top:var(--e-2)',
                               texto: 'Dato comercial. No influye en el nivel de presencia digital.' })
      ])
    ]);
  }

  /**
   * @param {HTMLElement} contenedor
   * @param {Object} registro
   * @param {Array} acciones  botones a mostrar bajo la ficha
   */
  function pintar(contenedor, registro, acciones) {
    var d = global.COMEEN.diagnostico.evaluar(registro);
    U.vaciar(contenedor);

    var vista = el('div.resultado', null, [
      cabecera(registro, d),
      notaCoherencia(d),
      el('div.dos-columnas', null, [
        el('div.tarjeta', null, [
          el('p.tarjeta__titulo', { texto: 'Lo que ya tiene' }),
          listaFortalezas(d)
        ]),
        el('div.tarjeta', null, [
          el('p.tarjeta__titulo', { texto: 'Lo que puede mejorar' }),
          listaOportunidades(d)
        ])
      ]),
      bloqueCanales(d),
      bloqueServicios(d),
      bloquePrioridadesYPago(registro, d)
    ]);

    if (acciones && acciones.length) {
      vista.appendChild(el('div.acciones-fila', null, acciones));
    }
    contenedor.appendChild(vista);
    return d;
  }

  global.COMEEN.ui.resultado = { pintar: pintar };
})(typeof globalThis !== 'undefined' ? globalThis : this);
