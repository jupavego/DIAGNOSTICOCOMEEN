/* ============================================================================
   core/puntuacion.js — Motor de puntuación
   ----------------------------------------------------------------------------
   Suma las 12 variables de madurez y separa fortalezas de oportunidades.
   No conoce niveles ni servicios: solo cuenta.
   ========================================================================== */
(function (global) {
  'use strict';

  function calcular(madurez) {
    var Q = global.COMEEN.instrumento.QUESTIONS;
    var maximo = global.COMEEN.niveles.PUNTAJE_MAXIMO;

    var puntaje = 0;
    var respondidas = 0;
    var detalle = [];

    for (var i = 0; i < Q.length; i++) {
      var q = Q[i];
      var bruto = (madurez || {})[q.id];
      var v = (bruto === undefined || bruto === null || bruto === '') ? null : Number(bruto);
      if (v !== null && !isNaN(v)) {
        puntaje += v;
        respondidas++;
      } else {
        v = null;
      }
      detalle.push({
        id: q.id,
        variable: q.variable,
        dimension: q.dimension,
        valor: v,
        fortaleza: q.fortaleza,
        oportunidad: q.oportunidad,
        estado: v === null ? 'sin_dato' : (v === 2 ? 'solido' : (v === 1 ? 'parcial' : 'ausente'))
      });
    }

    return {
      puntaje: puntaje,
      maximo: maximo,
      porcentaje: Math.round((puntaje / maximo) * 100),
      respondidas: respondidas,
      total: Q.length,
      completo: respondidas === Q.length,
      detalle: detalle
    };
  }

  /* Fortalezas: lo que el negocio ya tiene resuelto (valor 2).
     Oportunidades: lo ausente (0) primero, luego lo parcial (1).           */
  function fortalezas(resultado) {
    return resultado.detalle
      .filter(function (d) { return d.estado === 'solido'; })
      .map(function (d) { return { id: d.id, texto: d.fortaleza }; });
  }

  function oportunidades(resultado) {
    var ausentes = resultado.detalle.filter(function (d) { return d.estado === 'ausente'; });
    var parciales = resultado.detalle.filter(function (d) { return d.estado === 'parcial'; });
    return ausentes.concat(parciales).map(function (d) {
      return { id: d.id, texto: d.oportunidad, severidad: d.estado === 'ausente' ? 'alta' : 'media' };
    });
  }

  global.COMEEN = global.COMEEN || {};
  global.COMEEN.puntuacion = {
    calcular: calcular,
    fortalezas: fortalezas,
    oportunidades: oportunidades
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
