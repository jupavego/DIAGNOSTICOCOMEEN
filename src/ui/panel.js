/* ============================================================================
   ui/panel.js — Panel de seguimiento
   ----------------------------------------------------------------------------
   Vista de trabajo, no de lectura: primero el resumen, luego el detalle.
   Los gráficos son de una sola serie, así que no llevan leyenda; el valor va
   siempre escrito junto a la barra y no depende del color.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = global.COMEEN.ui.util;
  var el = U.el;

  var filtros = { texto: '', nivel: '', categoria: '', estado: '' };

  function conteo(lista, clave) {
    var mapa = {};
    lista.forEach(function (x) {
      var k = clave(x);
      if (k === undefined || k === null || k === '') return;
      mapa[k] = (mapa[k] || 0) + 1;
    });
    return mapa;
  }

  function aDatos(mapa, orden) {
    var filas = Object.keys(mapa).map(function (k) { return { etiqueta: k, valor: mapa[k] }; });
    if (orden === 'valor') filas.sort(function (a, b) { return b.valor - a.valor; });
    return filas;
  }

  function evaluados(registros) {
    return registros.map(function (r) {
      return { registro: r, d: global.COMEEN.diagnostico.evaluar(r) };
    });
  }

  function aplicarFiltros(items) {
    var t = filtros.texto.trim().toLowerCase();
    return items.filter(function (x) {
      var n = x.registro.negocio;
      if (filtros.nivel && String(x.d.nivel.id) !== filtros.nivel) return false;
      if (filtros.categoria && global.COMEEN.diagnostico.textoCampo(n, 'categoria') !== filtros.categoria) return false;
      if (filtros.estado && x.registro.estado !== filtros.estado) return false;
      if (t) {
        var heno = [n.nombre, n.propietario, n.barrio, n.categoria, n.categoriaOtro, n.telefono, n.whatsapp]
          .join(' ').toLowerCase();
        if (heno.indexOf(t) < 0) return false;
      }
      return true;
    });
  }

  /* Cuestionario que quedó a medias: se anuncia a la vista, en el panel, en
     lugar de aparecer como un diálogo del navegador. */
  function avisoBorrador(acciones) {
    var b = acciones.borrador;
    if (!b || !b.registro) return null;
    var nombre = (b.registro.negocio && b.registro.negocio.nombre) || 'un negocio sin nombre';
    return el('div.aviso-borrador', null, [
      el('div.aviso-borrador__texto', null, [
        'Quedó un diagnóstico a medias de ', el('strong', { texto: nombre }), '.'
      ]),
      el('button.btn.btn--calido.btn--pequeno', { type: 'button', onclick: acciones.alContinuarBorrador }, 'Continuarlo'),
      el('button.btn.btn--fantasma.btn--pequeno', { type: 'button', onclick: acciones.alDescartarBorrador }, 'Descartarlo')
    ]);
  }

  /* ── Bloques ────────────────────────────────────────────────────────────── */

  function bloqueKpis(items) {
    var porNivel = { 1: 0, 2: 0, 3: 0 };
    var interesados = 0;
    items.forEach(function (x) {
      porNivel[x.d.nivel.id]++;
      if (x.d.codigosServicio.indexOf('COMEEN') >= 0) interesados++;
    });

    function kpi(valor, etiqueta, mod) {
      return el('div.kpi' + (mod ? '.kpi--' + mod : ''), null, [
        el('span.kpi__valor', { texto: String(valor) }),
        el('span.kpi__etiqueta', { texto: etiqueta })
      ]);
    }

    return el('div.kpis', null, [
      kpi(items.length, 'Negocios diagnosticados'),
      kpi(porNivel[1], 'Nivel 1 · Construir', 'n1'),
      kpi(porNivel[2], 'Nivel 2 · Fortalecer', 'n2'),
      kpi(porNivel[3], 'Nivel 3 · Potenciar', 'n3'),
      kpi(interesados, 'Candidatos al directorio')
    ]);
  }

  function graficoNiveles(items) {
    var reglas = global.COMEEN.niveles.LEVEL_RULES;
    var porNivel = { 1: 0, 2: 0, 3: 0 };
    items.forEach(function (x) { porNivel[x.d.nivel.id]++; });

    var datos = reglas.map(function (n) {
      return {
        etiqueta: 'Nivel ' + n.id + ' · ' + n.nombre,
        valor: porNivel[n.id],
        color: 'var(--nivel-' + n.id + ')'
      };
    });

    return el('div.tarjeta', null, [
      el('p.tarjeta__titulo', { texto: 'Distribución por nivel' }),
      U.graficoBarras(datos, {
        nota: 'Los cortes 0–9 / 10–17 / 18–24 son provisionales. Con 30–50 negocios levantados conviene revisar esta distribución y recalibrarlos.'
      })
    ]);
  }

  function graficoServicios(items) {
    var mapa = {};
    var catalogo = global.COMEEN.servicios.SERVICE_RULES;
    catalogo.forEach(function (s) { mapa[s.nombre] = 0; });
    items.forEach(function (x) {
      x.d.servicios.forEach(function (s) { mapa[s.nombre] = (mapa[s.nombre] || 0) + 1; });
    });
    var datos = aDatos(mapa, 'valor').filter(function (d) { return d.valor > 0; });

    return el('div.tarjeta', null, [
      el('p.tarjeta__titulo', { texto: 'Servicios más recomendados' }),
      datos.length ? U.graficoBarras(datos) : el('p.campo__ayuda', { texto: 'Todavía no hay diagnósticos.' })
    ]);
  }

  function graficoPago(items) {
    var rangos = global.COMEEN.instrumento.PAYMENT_RANGES;
    var mapa = {};
    rangos.forEach(function (r) { mapa[r.codigo] = 0; });
    items.forEach(function (x) { if (x.registro.pago) mapa[x.registro.pago]++; });

    /* Rampa violeta ordinal: a mayor disposición, paso más oscuro. */
    var datos = rangos.map(function (r, i) {
      return { etiqueta: r.texto, valor: mapa[r.codigo], color: 'var(--serie-' + (i + 1) + ')' };
    });

    return el('div.tarjeta', null, [
      el('p.tarjeta__titulo', { texto: 'Disposición de inversión' }),
      U.graficoBarras(datos, { nota: 'Variable comercial independiente: no influye en el nivel de presencia digital.' })
    ]);
  }

  function graficoCategorias(items) {
    var datos = aDatos(conteo(items, function (x) {
      return global.COMEEN.diagnostico.textoCampo(x.registro.negocio, 'categoria');
    }), 'valor');
    return el('div.tarjeta', null, [
      el('p.tarjeta__titulo', { texto: 'Negocios por categoría' }),
      datos.length ? U.graficoBarras(datos) : el('p.campo__ayuda', { texto: 'Todavía no hay diagnósticos.' })
    ]);
  }

  function graficoBarrios(items) {
    var datos = aDatos(conteo(items, function (x) { return x.registro.negocio.barrio; }), 'valor').slice(0, 10);
    return el('div.tarjeta', null, [
      el('p.tarjeta__titulo', { texto: 'Barrios y veredas' }),
      datos.length ? U.graficoBarras(datos) : el('p.campo__ayuda', { texto: 'Sin barrios registrados todavía.' })
    ]);
  }

  function graficoBrechas(items) {
    var gaps = global.COMEEN.instrumento.GAPS;
    var mapa = {};
    gaps.forEach(function (g) { mapa[g.necesidad] = 0; });
    items.forEach(function (x) {
      gaps.forEach(function (g) {
        if (global.COMEEN.reglas.brechaActiva(x.registro.brechas[g.id])) mapa[g.necesidad]++;
      });
    });
    var datos = aDatos(mapa, 'valor').filter(function (d) { return d.valor > 0; });

    return el('div.tarjeta', null, [
      el('p.tarjeta__titulo', { texto: 'Lo que los negocios piden' }),
      datos.length ? U.graficoBarras(datos, { nota: 'Necesidad declarada por el comerciante, distinta de la detectada por el instrumento.' })
                   : el('p.campo__ayuda', { texto: 'Todavía no hay diagnósticos.' })
    ]);
  }

  function barraFiltros(todos, alCambiar) {
    var I = global.COMEEN.instrumento;
    var categorias = Object.keys(conteo(todos, function (x) {
      return global.COMEEN.diagnostico.textoCampo(x.registro.negocio, 'categoria');
    })).sort();

    function selector(clave, vacio, opciones) {
      var s = el('select.campo__control', {
        'aria-label': vacio,
        onchange: function (ev) { filtros[clave] = ev.target.value; alCambiar(); }
      });
      s.appendChild(el('option', { value: '', texto: vacio }));
      opciones.forEach(function (o) {
        var op = el('option', { value: o.valor, texto: o.texto });
        if (filtros[clave] === o.valor) op.selected = true;
        s.appendChild(op);
      });
      return s;
    }

    return el('div.filtros', null, [
      el('div.filtros__buscador', null, [
        el('input.campo__control', {
          type: 'search', placeholder: 'Buscar negocio, dueño o barrio…',
          'aria-label': 'Buscar', valor: filtros.texto,
          oninput: function (ev) { filtros.texto = ev.target.value; alCambiar(); }
        })
      ]),
      selector('nivel', 'Todos los niveles', global.COMEEN.niveles.LEVEL_RULES.map(function (n) {
        return { valor: String(n.id), texto: 'Nivel ' + n.id + ' · ' + n.nombre };
      })),
      selector('categoria', 'Todas las categorías', categorias.map(function (c) { return { valor: c, texto: c }; })),
      selector('estado', 'Todos los estados', I.ATTENTION_STATUSES.map(function (e) {
        return { valor: e.id, texto: e.texto };
      }))
    ]);
  }

  function tabla(items, alAbrir) {
    if (!items.length) {
      return el('div.vacio', null, [
        el('p.vacio__titulo', { texto: 'No hay negocios que coincidan' }),
        el('p', { texto: 'Cambie los filtros o levante un diagnóstico nuevo.' })
      ]);
    }

    var cuerpo = el('tbody');
    items.forEach(function (x) {
      var n = x.registro.negocio;
      cuerpo.appendChild(el('tr', {
        tabindex: '0',
        onclick: function () { alAbrir(x.registro.id); },
        onkeydown: function (ev) { if (ev.key === 'Enter') alAbrir(x.registro.id); }
      }, [
        el('td', null, [
          el('div.tabla__negocio', null, [
            n.nombre || 'Sin nombre',
            x.registro.esEjemplo ? el('span.etiqueta-origen', { style: 'margin-left:.4rem', texto: 'ejemplo' }) : null
          ]),
          el('div.tabla__sub', {
            texto: [global.COMEEN.diagnostico.textoCampo(n, 'categoria'), n.barrio].filter(Boolean).join(' · ') || '—'
          })
        ]),
        el('td', null, [U.insigniaNivel(x.d.nivel.id, 'N' + x.d.nivel.id + ' ' + x.d.nivel.nivel.nombre)]),
        el('td.tabla__num', { texto: x.d.puntaje + '/' + x.d.maximo }),
        el('td.tabla__servicios', { texto: x.d.codigosServicio.slice(0, 4).join(' · ') + (x.d.codigosServicio.length > 4 ? ' +' + (x.d.codigosServicio.length - 4) : '') }),
        el('td', { texto: x.d.pago ? x.d.pago.corto : '—' }),
        el('td', null, [U.insigniaEstado(x.registro.estado)]),
        el('td', { texto: U.fechaCorta(x.registro.creado) })
      ]));
    });

    return el('div.tabla-envoltura', null, [
      el('table.tabla', null, [
        el('thead', null, [
          el('tr', null, ['Negocio', 'Nivel', 'Puntaje', 'Servicios', 'Inversión', 'Estado', 'Fecha']
            .map(function (t) { return el('th', { texto: t }); }))
        ]),
        cuerpo
      ])
    ]);
  }

  function botonesExportar(items) {
    var registros = items.map(function (x) { return x.registro; });

    function exportar(formato) {
      if (!registros.length) { U.mensaje('No hay nada que exportar todavía.'); return; }
      var E = global.COMEEN.exportacion;
      var contenido = formato === 'csv' ? E.aCSV(registros) : E.aExcel(registros);
      var nombre = E.nombreArchivo(formato === 'csv' ? 'csv' : 'xls');
      var tipo = formato === 'csv' ? 'text/csv;charset=utf-8' : 'application/vnd.ms-excel';
      E.descargar(contenido, nombre, tipo).then(function () {
        U.mensaje(registros.length + ' negocio(s) exportados a ' + nombre);
      }).catch(function () {
        U.mensaje('No se pudo generar el archivo. Intente de nuevo.');
      });
    }

    return el('div.acciones-fila', null, [
      el('button.btn.btn--secundario.btn--pequeno', { type: 'button', onclick: function () { exportar('excel'); } }, 'Exportar a Excel'),
      el('button.btn.btn--secundario.btn--pequeno', { type: 'button', onclick: function () { exportar('csv'); } }, 'Exportar a CSV')
    ]);
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  function pintar(contenedor, registros, acciones) {
    var todos = evaluados(registros);
    var items = aplicarFiltros(todos);
    U.vaciar(contenedor);

    if (!registros.length) {
      contenedor.appendChild(el('div.seccion', null, [
        el('div.seccion__cabecera', null, [
          el('h1.seccion__titulo', { texto: 'Panel COMEEN' })
        ]),
        avisoBorrador(acciones),
        el('div.vacio', null, [
          el('p.vacio__titulo', { texto: 'Todavía no hay negocios levantados' }),
          el('p', { texto: 'Aplique el primer diagnóstico y aquí aparecerán el nivel, las brechas y los servicios recomendados de cada negocio.' }),
          el('div.acciones-fila', { style: 'margin-top:var(--e-5);justify-content:center' }, [
            el('button.btn.btn--principal', { type: 'button', onclick: acciones.alNuevo }, 'Aplicar un diagnóstico'),
            el('button.btn.btn--secundario', { type: 'button', onclick: acciones.alEjemplos }, 'Ver con 12 negocios de ejemplo')
          ]),
          el('p.campo__ayuda', { style: 'margin-top:var(--e-3)',
            texto: 'Los ejemplos son negocios inventados para probar el instrumento. Quedan marcados y se pueden borrar en un clic.' })
        ])
      ]));
      return;
    }

    contenedor.appendChild(el('div.seccion', null, [
      el('div.seccion__cabecera', null, [
        el('div', null, [
          el('h1.seccion__titulo', { texto: 'Panel COMEEN' }),
          el('p.seccion__nota', { texto: 'Estado de la digitalización de los negocios de comida levantados hasta hoy.' })
        ]),
        el('button.btn.btn--principal.btn--pequeno', { type: 'button', onclick: acciones.alNuevo }, 'Nuevo diagnóstico')
      ]),
      avisoBorrador(acciones),
      bloqueKpis(items)
    ]));

    contenedor.appendChild(el('div.seccion', null, [
      el('div.rejilla-paneles', null, [
        graficoNiveles(items),
        graficoServicios(items),
        graficoBrechas(items),
        graficoPago(items),
        graficoCategorias(items),
        graficoBarrios(items)
      ])
    ]));

    contenedor.appendChild(el('div.seccion', null, [
      el('div.seccion__cabecera', null, [
        el('h2.seccion__titulo', { texto: 'Negocios (' + items.length + ')' }),
        el('div.acciones-fila', null, [
          acciones.hayEjemplos ? el('button.btn.btn--fantasma.btn--pequeno', {
            type: 'button', onclick: acciones.alBorrarEjemplos
          }, 'Borrar los ejemplos') : null,
          botonesExportar(items)
        ])
      ]),
      barraFiltros(todos, function () { pintar(contenedor, registros, acciones); }),
      tabla(items, acciones.alAbrir)
    ]));
  }

  global.COMEEN.ui.panel = { pintar: pintar, filtros: filtros };
})(typeof globalThis !== 'undefined' ? globalThis : this);
