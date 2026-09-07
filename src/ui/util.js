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
    fechaCorta: fechaCorta, mensaje: mensaje, graficoBarras: graficoBarras
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
