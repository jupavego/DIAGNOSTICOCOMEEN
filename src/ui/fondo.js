/* ============================================================================
   ui/fondo.js — Hexágonos dispersos del fondo
   ----------------------------------------------------------------------------
   Antes esto era una imagen de fondo en CSS. Se pasó a SVG dentro del documento
   por una razón concreta: como imagen no se puede animar cada contorno por
   separado, y el reflejo tiene que recorrer el perímetro de cada hexágono.

   Dos movimientos, los dos muy lentos:

     órbita   toda la capa describe un círculo de unos 20 px cada 4 minutos.
              No se percibe mirando; se percibe al volver a mirar.
     reflejo  un destello corto recorre el contorno de cada hexágono en 15
              segundos. Los arranques están escalonados para que nunca
              destellen todos a la vez.

   Es decoración pura: no aporta información ni contraste, no recibe clics y
   se apaga por completo con 'prefers-reduced-motion'.
   ========================================================================== */
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var VIOLETA = '#5e49d6', NARANJA = '#ff6a14';
  /* El reflejo es una versión más luminosa del propio contorno, no un blanco
     genérico: así el destello sigue leyéndose como el color de la marca. */
  var BRILLO = { '#5e49d6': '#a48fe8', '#ff6a14': '#ffb066' };

  /* cx, cy, lado, giro, color, opacidad, relleno */
  var COMPOSICION_ANCHA = [
    [ 110,  120, 152,   8, VIOLETA, 0.17, 0.030],
    [ 312,   48,  96, -14, NARANJA, 0.20, null ],
    [  44,  430, 112,  21, NARANJA, 0.11, null ],
    [ 236,  566, 168,  -6, VIOLETA, 0.09, null ],
    [ 712,   26, 122,  11, VIOLETA, 0.07, null ],
    [ 988,   14,  88, -20, NARANJA, 0.08, null ],
    [1492,  108, 174,  12, VIOLETA, 0.16, 0.035],
    [1298,  258, 104, -18, NARANJA, 0.19, null ],
    [1566,  476, 128,   5, NARANJA, 0.10, null ],
    [1386,  668, 148, -10, VIOLETA, 0.12, null ],
    [  32,  716,  82,  -5, NARANJA, 0.14, null ],
    [ 146,  928, 142, -12, VIOLETA, 0.14, 0.030],
    [ 424, 1016,  98,  16, NARANJA, 0.13, null ],
    [ 836, 1030, 132,  14, VIOLETA, 0.08, null ],
    [1148,  972, 162,  -8, NARANJA, 0.10, null ],
    [1528,  906, 112,  22, VIOLETA, 0.15, null ]
  ];

  /* En celular la columna de contenido ocupa casi todo el ancho: los
     hexágonos se apoyan en los bordes laterales. */
  var COMPOSICION_ALTA = [
    [ -20,  110, 138,   9, VIOLETA, 0.17, 0.030],
    [ 196,   30,  92, -15, NARANJA, 0.20, null ],
    [ 776,  180, 150,  12, VIOLETA, 0.15, null ],
    [ 640,  372,  98, -18, NARANJA, 0.18, null ],
    [ -32,  470, 120,  20, NARANJA, 0.12, null ],
    [ 796,  610, 132,   5, VIOLETA, 0.10, null ],
    [  36,  760, 104, -10, VIOLETA, 0.13, null ],
    [ 724,  900, 146,  14, NARANJA, 0.11, 0.025],
    [ -10, 1080, 128,  -7, NARANJA, 0.14, null ],
    [ 700, 1230,  96,  22, VIOLETA, 0.16, null ],
    [ 180, 1330, 140, -12, VIOLETA, 0.12, null ],
    [ 470, 1480, 110,  16, NARANJA, 0.12, null ]
  ];

  function trazoHexagono(cx, cy, s, giro) {
    var r = giro * Math.PI / 180;
    var puntos = [];
    for (var k = 0; k < 6; k++) {
      var a = (k * 60) * Math.PI / 180 + r;
      puntos.push((cx + s * Math.cos(a)).toFixed(1) + ' ' + (cy + s * Math.sin(a)).toFixed(1));
    }
    return 'M' + puntos.join('L') + 'Z';
  }

  function nodo(etiqueta, atributos) {
    var n = document.createElementNS(NS, etiqueta);
    Object.keys(atributos).forEach(function (k) { n.setAttribute(k, atributos[k]); });
    return n;
  }

  function dibujar(svg, piezas, ancho, alto) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', '0 0 ' + ancho + ' ' + alto);

    piezas.forEach(function (p, i) {
      var d = trazoHexagono(p[0], p[1], p[2], p[3]);
      var color = p[4], opacidad = p[5], relleno = p[6];

      if (relleno) {
        svg.appendChild(nodo('path', { d: d, fill: color, 'fill-opacity': relleno, stroke: 'none' }));
      }

      svg.appendChild(nodo('path', {
        d: d, fill: 'none', stroke: color, 'stroke-opacity': opacidad,
        'stroke-width': 2, 'stroke-linejoin': 'round'
      }));

      /* pathLength normaliza el perímetro a 1000 unidades: así el mismo trazo
         discontinuo sirve para un hexágono de 82 px y para uno de 174, y el
         reflejo tarda lo mismo en dar la vuelta en ambos. */
      var brillo = nodo('path', {
        'class': 'fondo-panal__brillo',
        d: d, fill: 'none', stroke: BRILLO[color] || color,
        'stroke-width': 2.5, 'stroke-linecap': 'round',
        pathLength: 1000, 'stroke-dasharray': '70 930'
      });
      /* Arranques escalonados a lo largo del ciclo de 15 s: nunca destellan
         todos a la vez. */
      brillo.style.animationDelay = (-(i * 15 / piezas.length)).toFixed(2) + 's';
      svg.appendChild(brillo);
    });
  }

  function crear(raizDocumento) {
    var svg = nodo('svg', {
      'class': 'fondo-panal',
      xmlns: NS,
      preserveAspectRatio: 'xMidYMid slice',
      'aria-hidden': 'true',
      focusable: 'false'
    });

    var angosta = global.matchMedia ? global.matchMedia('(max-width: 760px)') : null;

    function pintar() {
      if (angosta && angosta.matches) dibujar(svg, COMPOSICION_ALTA, 760, 1500);
      else dibujar(svg, COMPOSICION_ANCHA, 1600, 1040);
    }

    pintar();
    if (angosta) {
      /* addEventListener no existe en navegadores viejos para MediaQueryList. */
      if (angosta.addEventListener) angosta.addEventListener('change', pintar);
      else if (angosta.addListener) angosta.addListener(pintar);
    }

    raizDocumento.insertBefore(svg, raizDocumento.firstChild);
    return svg;
  }

  global.COMEEN = global.COMEEN || {};
  global.COMEEN.ui = global.COMEEN.ui || {};
  global.COMEEN.ui.fondo = { crear: crear };
})(typeof globalThis !== 'undefined' ? globalThis : this);
