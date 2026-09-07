/* ============================================================================
   config/niveles.js — Reglas de clasificación por nivel de madurez
   ----------------------------------------------------------------------------
   Los cortes de puntaje y las condiciones de coherencia se declaran aquí y en
   ningún otro sitio. Cambiar un rango es cambiar un número en este archivo.

   NOTA METODOLÓGICA: los cortes 0–9 / 10–17 / 18–24 son una HIPÓTESIS PILOTO.
   Después de 30–50 diagnósticos reales conviene revisar la distribución
   observada (el panel la muestra) y recalibrar estos límites.
   ========================================================================== */
(function (global) {
  'use strict';

  var PUNTAJE_MAXIMO = 24; // 12 variables × 2 puntos

  /* Gramática de condiciones (evaluada por core/reglas.js):
       { variable: 'M05', min: 1 }        una variable de madurez
       { canal: 'whatsapp', min: 1 }      un canal de la matriz
       { brecha: 'B07', activa: true }    una respuesta de brecha
       { cualquiera: [ ...condiciones ] } al menos una se cumple
       { todas:      [ ...condiciones ] } todas se cumplen                     */

  var LEVEL_RULES = [
    {
      id: 1,
      clave: 'CONSTRUIR',
      nombre: 'Construir',
      etiqueta: 'Nivel 1 — Construir',
      min: 0,
      max: 9,
      tono: 'critico',
      titular: 'Su negocio está empezando en lo digital',
      mensaje: 'Todavía no hay una base digital sobre la cual trabajar. Lo primero es crear los elementos esenciales: imagen, fotografías y un canal de contacto que funcione.',
      requisitos: []
    },
    {
      id: 2,
      clave: 'FORTALECER',
      nombre: 'Fortalecer',
      etiqueta: 'Nivel 2 — Fortalecer',
      min: 10,
      max: 17,
      tono: 'aviso',
      titular: 'Su negocio ya está presente, pero puede mejorar',
      mensaje: 'Ya existe presencia digital. Ahora el trabajo es de calidad, orden y cobertura: presentar mejor lo que ofrece y llegar a más clientes.',
      requisitos: [
        {
          id: 'presencia_minima',
          etiqueta: 'Al menos un canal digital en uso',
          condicion: { cualquiera: [
            { variable: 'M05', min: 1 },
            { variable: 'M06', min: 1 },
            { variable: 'M07', min: 1 }
          ] }
        }
      ]
    },
    {
      id: 3,
      clave: 'POTENCIAR',
      nombre: 'Potenciar',
      etiqueta: 'Nivel 3 — Potenciar',
      min: 18,
      max: 24,
      tono: 'bien',
      titular: 'Su negocio tiene una base digital sólida',
      mensaje: 'Los elementos esenciales ya están. El siguiente paso es visibilidad y promoción: que más clientes lo encuentren y le compren.',
      /* Regla de coherencia: un puntaje alto NO basta. Sin estos seis mínimos
         el negocio desciende al nivel inmediatamente inferior. */
      requisitos: [
        { id: 'canal_contacto', etiqueta: 'Canal de contacto digital',        condicion: { variable: 'M05', min: 1 } },
        { id: 'red_social',     etiqueta: 'Presencia en alguna red social',   condicion: { variable: 'M07', min: 1 } },
        { id: 'info_comercial', etiqueta: 'Información comercial disponible', condicion: { variable: 'M04', min: 1 } },
        { id: 'fotografias',    etiqueta: 'Fotografías del negocio',          condicion: { variable: 'M02', min: 1 } },
        { id: 'catalogo',       etiqueta: 'Catálogo o listado de productos',  condicion: { variable: 'M03', min: 1 } },
        { id: 'interaccion',    etiqueta: 'Interacción digital con clientes', condicion: { variable: 'M10', min: 1 } }
      ]
    }
  ];

  global.COMEEN = global.COMEEN || {};
  global.COMEEN.niveles = {
    PUNTAJE_MAXIMO: PUNTAJE_MAXIMO,
    LEVEL_RULES: LEVEL_RULES
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
