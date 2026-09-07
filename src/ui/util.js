/* ============================================================================
   ui/util.js — Utilidades de interfaz
   Construcción de nodos y piezas visuales compartidas. Sin lógica de negocio.
   ========================================================================== */
(function (global) {
  'use strict';

  var doc = global.document;

  /** el('div.clase', {attr}, [hijos | texto]) */
  function el(selector, atributos, hijos) {
    var partes = selector.split('.');
    var etiqueta = partes.shift() || 'div';
    var nodo = doc.createElement(etiqueta);
    if (partes.length) nodo.className = partes.join(' ');

    if (atributos) {
      Object.keys(atributos).forEach(function (k) {
        var v = atributos[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'onclick' || k === 'oninput' || k === 'onchange' || k === 'onsubmit') {
          nodo.addEventListener(k.slice(2), v);
        } else if (k === 'html') {
          nodo.innerHTML = v;
        } else if (k === 'texto') {
          nodo.textContent = v;
        } else if (k === 'valor') {
          nodo.value = v;
        } else {
          nodo.setAttribute(k, v === true ? '' : v);
        }
      });
    }

    if (hijos !== undefined && hijos !== null) {
      (Array.isArray(hijos) ? hijos : [hijos]).forEach(function (h) {
        if (h === null || h === undefined || h === false) return;
        nodo.appendChild(typeof h === 'string' || typeof h === 'number'
          ? doc.createTextNode(String(h)) : h);
      });
    }
    return nodo;
  }

  function vaciar(nodo) { while (nodo.firstChild) nodo.removeChild(nodo.firstChild); }

  function insigniaNivel(nivelId, texto) {
    return el('span.insignia.insignia--nivel-' + nivelId, null, [
      el('span.insignia__punto'), texto
    ]);
  }

  function insigniaEstado(estadoId) {
    var lista = global.COMEEN.instrumento.ATTENTION_STATUSES;
    var e = lista.filter(function (x) { return x.id === estadoId; })[0] || lista[0];
    return el('span.insignia.insignia--' + e.tono, null, [el('span.insignia__punto'), e.texto]);
  }

  function fechaCorta(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    var meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return d.getDate() + ' ' + meses[d.getMonth()] + ' ' + d.getFullYear();
  }

  /* ── Isotipo COMEEN ─────────────────────────────────────────────────────
     Flecha de crecimiento con brote: diagnóstico y negocio que crece.

     Los colores NO van escritos en el SVG sino en clases, para que salgan de
     los tokens de marca. Así el isotipo no puede desincronizarse del resto de
     la aplicación si algún día cambia el violeta o el naranja. */
  function isotipo(tamano) {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'isotipo');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    if (tamano) { svg.setAttribute('width', tamano); svg.setAttribute('height', tamano); }

    function pieza(etiqueta, atributos) {
      var n = document.createElementNS(NS, etiqueta);
      Object.keys(atributos).forEach(function (k) { n.setAttribute(k, atributos[k]); });
      svg.appendChild(n);
      return n;
    }

    var trazo = { 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' };
    function con(base, extra) {
      var o = {};
      Object.keys(base).forEach(function (k) { o[k] = base[k]; });
      Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
      return o;
    }

    pieza('circle', { cx: 50, cy: 50, r: 48, 'class': 'isotipo__fondo' });
    pieza('path', con(trazo, { d: 'M20 68L42 44L58 60L82 28', 'class': 'isotipo__linea' }));
    pieza('path', con(trazo, { d: 'M66 28H82V44', 'class': 'isotipo__linea' }));
    pieza('path', { d: 'M44 40C38 37 36 43 40 47C44 51 50 45 50 40Z',
                    'stroke-width': 2.5, 'stroke-linejoin': 'round', 'class': 'isotipo__brote' });
    pieza('path', { d: 'M68 40C74 37 76 43 72 47C68 51 62 45 62 40Z',
                    'stroke-width': 2.5, 'stroke-linejoin': 'round', 'class': 'isotipo__brote' });

    return svg;
  }

  var temporizadorMensaje = null;
  function mensaje(texto) {
    var previo = doc.querySelector('.mensaje-flotante');
    if (previo) previo.remove();
    var nodo = el('div.mensaje-flotante', { role: 'status', texto: texto });
    doc.body.appendChild(nodo);
    clearTimeout(temporizadorMensaje);
    temporizadorMensaje = setTimeout(function () { nodo.remove(); }, 3200);
  }

  /* Barras horizontales: una serie, sin leyenda (el título nombra el dato).
     El valor va siempre en texto al lado, nunca solo el largo de la barra. */
  function graficoBarras(datos, opciones) {
    opciones = opciones || {};
    var maximo = Math.max.apply(null, datos.map(function (d) { return d.valor; }).concat([1]));
    var contenedor = el('div.grafico');

    datos.forEach(function (d) {
      var ancho = maximo > 0 ? Math.round((d.valor / maximo) * 100) : 0;
      contenedor.appendChild(el('div.barra-dato', null, [
        el('span.barra-dato__etiqueta', { title: d.etiqueta, texto: d.etiqueta }),
        el('div.barra-dato__pista', null, [
          el('div.barra-dato__relleno', {
            style: 'width:' + ancho + '%;' + (d.color ? 'background:' + d.color : '')
          })
        ]),
        el('span.barra-dato__valor', { texto: String(d.valor) })
      ]));
    });

    if (opciones.nota) contenedor.appendChild(el('p.pie-grafico', { texto: opciones.nota }));
    return contenedor;
  }

  global.COMEEN = global.COMEEN || {};
  global.COMEEN.ui = global.COMEEN.ui || {};
  global.COMEEN.ui.util = {
    el: el, vaciar: vaciar, insigniaNivel: insigniaNivel, insigniaEstado: insigniaEstado,
    fechaCorta: fechaCorta, mensaje: mensaje, graficoBarras: graficoBarras, isotipo: isotipo
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
