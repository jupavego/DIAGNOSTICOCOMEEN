/* ============================================================================
   tests/casos.js — Casos ficticios de verificación
   ----------------------------------------------------------------------------
   Doce negocios inventados que cubren los tres niveles y los casos límite del
   algoritmo. 'espera' es lo que el diseño del instrumento DEBE producir; el
   runner compara contra eso, no contra lo que el código haga.
   ========================================================================== */
(function (global) {
  'use strict';

  /* Atajo: m(2,1,0,...) → { M01:2, M02:1, M03:0, ... } */
  function m() {
    var o = {};
    for (var i = 0; i < 12; i++) {
      o['M' + (i < 9 ? '0' : '') + (i + 1)] = arguments[i];
    }
    return o;
  }
  function c(wa, fb, ig, web) { return { whatsapp: wa, facebook: fb, instagram: ig, web: web }; }
  function b() {
    var ids = ['B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08'], o = {};
    for (var i = 0; i < 8; i++) o[ids[i]] = arguments[i];
    return o;
  }

  var CASOS = [
    {
      titulo: 'Panadería La Espiga — arranque típico',
      nota: 'Solo WhatsApp personal y un logo viejo. El perfil más común entre los negocios de comida del municipio.',
      negocio: { nombre: 'Panadería La Espiga', categoria: 'Panaderías y reposterías', municipio: 'Girardota', barrio: 'El Palmar' },
      //     M01 M02 M03 M04 M05 M06 M07 M08 M09 M10 M11 M12
      madurez: m(1,  1,  0,  1,  1,  1,  0,  0,  0,  1,  0,  0),
      canales: c(1, 0, 0, 0),
      brechas: b('si','si','si','si','si','si','si','si'),
      prioridades: ['FOTO', 'CAT', 'COMEEN'],
      pago: 'P2',
      espera: { puntaje: 6, nivel: 1, incluyeServicios: ['FOTO', 'CAT', 'WAB', 'IDENT', 'COMEEN'] }
    },
    {
      titulo: 'Granero Doña Rosa — cero digital',
      nota: 'Piso del instrumento. Debe dar 0 y Nivel 1 sin ambigüedad.',
      negocio: { nombre: 'Granero Doña Rosa', categoria: 'Tiendas y graneros', municipio: 'Girardota', barrio: 'Llano' },
      madurez: m(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
      canales: c(0, 0, 0, 0),
      brechas: b('no','no','no','no','no','no','talvez','no'),
      prioridades: ['WAB'],
      pago: 'P0',
      espera: { puntaje: 0, nivel: 1, incluyeServicios: ['IDENT', 'FOTO', 'CAT', 'WAB', 'REDES', 'FB', 'IG', 'WEB', 'GEO', 'COMEEN', 'PROMO'] }
    },
    {
      titulo: 'Asadero El Buen Sabor — el ejemplo de la matriz',
      nota: 'Presencia real pero sin catálogo ni directorio. Debe caer en Nivel 2.',
      negocio: { nombre: 'Asadero El Buen Sabor', categoria: 'Asaderos y parrillas', municipio: 'Girardota', barrio: 'Centro' },
      madurez: m(2, 1, 0, 2, 2, 2, 2, 1, 2, 1, 1, 1),
      canales: c(2, 2, 1, 0),
      brechas: b('si','si','no','talvez','no','si','si','talvez'),
      prioridades: ['FOTO', 'CAT', 'PROMO'],
      pago: 'P2',
      espera: { puntaje: 17, nivel: 2, incluyeServicios: ['FOTO', 'CAT', 'IG', 'WEB', 'COMEEN', 'PROMO'] }
    },
    {
      titulo: 'Restaurante Sabor Girardota — base consolidada',
      nota: 'Cumple los seis mínimos de coherencia. Debe llegar a Nivel 3.',
      negocio: { nombre: 'Restaurante Sabor Girardota', categoria: 'Restaurantes', municipio: 'Girardota', barrio: 'Centro' },
      madurez: m(2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1),
      canales: c(2, 2, 2, 1),
      brechas: b('no','no','no','no','no','talvez','si','si'),
      prioridades: ['PROMO', 'COMEEN', 'WEB'],
      pago: 'P3',
      espera: { puntaje: 22, nivel: 3, incluyeServicios: ['WEB', 'COMEEN', 'PROMO'] }
    },
    {
      titulo: 'Heladería Dulce Antojo — Instagram sin carta',
      nota: 'Muy activa en redes pero sin carta ni precios publicados.',
      negocio: { nombre: 'Heladería Dulce Antojo', categoria: 'Cafeterías y heladerías', municipio: 'Girardota', barrio: 'San Andrés' },
      madurez: m(2, 2, 0, 1, 2, 2, 2, 2, 1, 2, 2, 1),
      canales: c(2, 0, 2, 0),
      brechas: b('no','si','no','no','no','talvez','si','no'),
      prioridades: ['CAT', 'WEB', 'COMEEN'],
      pago: 'P1',
      espera: { puntaje: 19, nivel: 2, incluyeServicios: ['CAT', 'WEB', 'COMEEN', 'FB', 'GEO'], descendido: true }
    },
    {
      titulo: 'LÍMITE · Pizzería Forno Antiguo — 18 puntos sin carta',
      nota: 'El puntaje da Nivel 3 pero falla la coherencia (no hay carta digital). Debe bajar a Nivel 2.',
      negocio: { nombre: 'Pizzería Forno Antiguo', categoria: 'Pizzerías', municipio: 'Girardota', barrio: 'Industrial', enComeen: 'Sí' },
      madurez: m(2, 2, 0, 2, 2, 2, 2, 2, 2, 2, 0, 0),
      canales: c(2, 2, 1, 1),
      brechas: b('no','no','no','no','no','no','no','no'),
      prioridades: [],
      pago: 'P0',
      /* Ya está en el directorio y no lo pide: COMEEN no debe activarse. */
      espera: { puntaje: 18, nivel: 2, descendido: true, incluyeServicios: ['CAT', 'PROMO'], excluyeServicios: ['COMEEN'] }
    },
    {
      titulo: 'LÍMITE · Frutería Vida Sana — puntaje 9 exacto',
      nota: 'Borde superior del Nivel 1.',
      negocio: { nombre: 'Frutería Vida Sana', categoria: 'Fruterías y jugos', municipio: 'Girardota', barrio: 'Centro' },
      madurez: m(1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0),
      canales: c(1, 1, 0, 0),
      brechas: b('talvez','talvez','no','si','si','si','si','si'),
      prioridades: ['REDES', 'WAB'],
      pago: 'P1',
      espera: { puntaje: 9, nivel: 1 }
    },
    {
      titulo: 'LÍMITE · Comidas Rápidas El Punto — puntaje 10 exacto',
      nota: 'Borde inferior del Nivel 2, con presencia mínima acreditada.',
      negocio: { nombre: 'Comidas Rápidas El Punto', categoria: 'Comidas rápidas', municipio: 'Girardota', barrio: 'Centro' },
      madurez: m(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0),
      canales: c(1, 1, 0, 0),
      brechas: b('no','no','no','no','no','no','si','no'),
      prioridades: ['COMEEN'],
      pago: 'P1',
      espera: { puntaje: 10, nivel: 2 }
    },
    {
      titulo: 'LÍMITE · Repostería Delicias de Nubia — 10 puntos sin ningún canal',
      nota: 'Tiene fotos y catálogo propios pero ningún canal en uso. La coherencia debe devolverlo a Nivel 1.',
      negocio: { nombre: 'Repostería Delicias de Nubia', categoria: 'Tortas y postres por encargo', municipio: 'Girardota', barrio: 'Centro' },
      madurez: m(2, 2, 2, 2, 0, 0, 0, 1, 1, 0, 0, 0),
      canales: c(0, 0, 0, 0),
      brechas: b('no','no','no','no','no','no','no','no'),
      prioridades: [],
      pago: 'P0',
      espera: { puntaje: 10, nivel: 1, descendido: true }
    },
    {
      titulo: 'LÍMITE · Bar Camino Real — puntaje 18 completo',
      nota: 'Borde inferior del Nivel 3 cumpliendo los seis mínimos.',
      negocio: { nombre: 'Bar Camino Real', categoria: 'Bares y licoreras', municipio: 'Girardota', barrio: 'Vía Barbosa' },
      madurez: m(1, 2, 2, 2, 2, 2, 2, 1, 1, 2, 1, 0),
      canales: c(2, 2, 1, 1),
      brechas: b('no','no','si','no','no','si','si','si'),
      prioridades: ['WEB', 'PROMO', 'COMEEN'],
      pago: 'P4',
      espera: { puntaje: 18, nivel: 3, incluyeServicios: ['IDENT', 'WEB', 'PROMO', 'COMEEN'] }
    },
    {
      titulo: 'PERFIL · Cocina Casera La Cosecha — solo WhatsApp + FB + IG',
      nota: 'El perfil que probablemente más se repita: redes sí, carta y web no.',
      negocio: { nombre: 'Cocina Casera La Cosecha', categoria: 'Comida casera y corrientazo', municipio: 'Girardota', barrio: 'Loma' },
      madurez: m(2, 1, 0, 1, 2, 2, 2, 1, 1, 2, 2, 2),
      canales: c(2, 2, 2, 0),
      brechas: b('si','si','no','no','no','si','si','si'),
      prioridades: ['CAT', 'FOTO', 'WEB'],
      pago: 'P2',
      espera: { puntaje: 18, nivel: 2, descendido: true, incluyeServicios: ['CAT', 'FOTO', 'WEB', 'COMEEN', 'GEO'] }
    },
    {
      titulo: 'CRUCE · Catering Sabores del Valle — dice que no necesita nada',
      nota: 'Responde "No" a todas las brechas. Los servicios deben activarse igual por diagnóstico.',
      negocio: { nombre: 'Catering Sabores del Valle', categoria: 'Eventos y catering', municipio: 'Girardota', barrio: 'Centro' },
      madurez: m(2, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0),
      canales: c(1, 0, 0, 0),
      brechas: b('no','no','no','no','no','no','no','no'),
      prioridades: [],
      pago: 'P0',
      espera: { puntaje: 5, nivel: 1, incluyeServicios: ['FOTO', 'CAT', 'REDES', 'FB', 'IG', 'WEB', 'GEO', 'PROMO'], soloDiagnostico: true }
    }
  ];

  global.COMEEN = global.COMEEN || {};
  global.COMEEN.casos = CASOS;
})(typeof globalThis !== 'undefined' ? globalThis : this);
