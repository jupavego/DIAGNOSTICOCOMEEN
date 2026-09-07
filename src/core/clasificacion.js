/* ============================================================================
   core/clasificacion.js — Del puntaje al nivel, con regla de coherencia
   ----------------------------------------------------------------------------
   1. Se busca el nivel cuyo rango contiene el puntaje.
   2. Se verifican sus requisitos de coherencia.
   3. Si no los cumple, desciende un nivel y se vuelve a verificar.

   Así un negocio con 19/24 pero sin fotografías, sin catálogo, sin WhatsApp y
   sin redes NO puede quedar en Nivel 3 solo por sumar puntos.
   ========================================================================== */
(function (global) {
  'use strict';

  function requisitosDe(nivel, datos) {
    var evaluar = global.COMEEN.reglas.evaluar;
    return (nivel.requisitos || []).map(function (r) {
      return { id: r.id, etiqueta: r.etiqueta, cumple: evaluar(r.condicion, datos) };
    });
  }

  function nivelPorPuntaje(reglas, puntaje) {
    for (var i = 0; i < reglas.length; i++) {
      if (puntaje >= reglas[i].min && puntaje <= reglas[i].max) return i;
    }
    return puntaje > reglas[reglas.length - 1].max ? reglas.length - 1 : 0;
  }

  /**
   * @param {number} puntaje
   * @param {Object} datos  { madurez, canales, brechas }
   */
  function clasificar(puntaje, datos) {
    var reglas = global.COMEEN.niveles.LEVEL_RULES;
    var indicePorPuntaje = nivelPorPuntaje(reglas, puntaje);
    var indice = indicePorPuntaje;
    var descensos = [];
    var requisitos = requisitosDe(reglas[indice], datos);

    while (indice > 0 && requisitos.some(function (r) { return !r.cumple; })) {
      descensos.push({
        desde: reglas[indice].etiqueta,
        hacia: reglas[indice - 1].etiqueta,
        faltantes: requisitos.filter(function (r) { return !r.cumple; })
                             .map(function (r) { return r.etiqueta; })
      });
      indice--;
      requisitos = requisitosDe(reglas[indice], datos);
    }

    var nivel = reglas[indice];
    return {
      nivel: nivel,
      id: nivel.id,
      clave: nivel.clave,
      etiqueta: nivel.etiqueta,
      tono: nivel.tono,
      titular: nivel.titular,
      mensaje: nivel.mensaje,
      requisitos: requisitos,
      /* Trazabilidad: si el puntaje daba para más, aquí queda por qué no.   */
      nivelPorPuntaje: reglas[indicePorPuntaje].etiqueta,
      descendido: descensos.length > 0,
      descensos: descensos
    };
  }

  global.COMEEN = global.COMEEN || {};
  global.COMEEN.clasificacion = { clasificar: clasificar };
})(typeof globalThis !== 'undefined' ? globalThis : this);
