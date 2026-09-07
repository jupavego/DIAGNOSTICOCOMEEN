/* ============================================================================
   core/reglas.js — Intérprete de condiciones
   ----------------------------------------------------------------------------
   Una sola función evalúa las condiciones declaradas en config/niveles.js y
   config/servicios.js. Así las reglas se escriben como datos y no como código
   repartido por la aplicación.

   Formas aceptadas:
     { variable: 'M05', min: 1 }        madurez ≥ 1
     { variable: 'M03', max: 1 }        madurez ≤ 1
     { variable: 'M03', igual: 0 }      madurez exactamente 0
     { canal: 'whatsapp', max: 1 }      estado del canal ≤ 1
     { campo: 'enComeen', igual: 'No' } un dato del negocio
     { brecha: 'B07', activa: true }    la brecha activa servicio (sí / tal vez)
     { cualquiera: [ ... ] }            OR
     { todas: [ ... ] }                 AND
     { no: { ... } }                    NOT
   ========================================================================== */
(function (global) {
  'use strict';

  var GAP_ANSWERS = null; // se resuelve perezosamente para no exigir orden de carga

  function brechaActiva(valor) {
    if (!GAP_ANSWERS) {
      GAP_ANSWERS = (global.COMEEN.instrumento && global.COMEEN.instrumento.GAP_ANSWERS) || [];
    }
    for (var i = 0; i < GAP_ANSWERS.length; i++) {
      if (GAP_ANSWERS[i].valor === valor) return !!GAP_ANSWERS[i].activa;
    }
    return false;
  }

  /**
   * @param {Object} cond   condición declarativa
   * @param {Object} datos  { madurez, canales, brechas }
   * @returns {boolean}
   */
  function evaluar(cond, datos) {
    if (!cond) return false;

    if (cond.cualquiera) {
      for (var i = 0; i < cond.cualquiera.length; i++) {
        if (evaluar(cond.cualquiera[i], datos)) return true;
      }
      return false;
    }
    if (cond.todas) {
      for (var j = 0; j < cond.todas.length; j++) {
        if (!evaluar(cond.todas[j], datos)) return false;
      }
      return true;
    }
    if (cond.no) return !evaluar(cond.no, datos);

    var valor;
    if (cond.campo) {
      /* Campo textual del negocio: se compara tal cual, sin convertir a número. */
      var dato = (datos.negocio || {})[cond.campo];
      if (cond.igual !== undefined) return dato === cond.igual;
      if (cond.distinto !== undefined) return dato !== cond.distinto;
      return !!dato;
    }
    if (cond.variable) {
      valor = (datos.madurez || {})[cond.variable];
    } else if (cond.canal) {
      valor = (datos.canales || {})[cond.canal];
    } else if (cond.brecha) {
      var respuesta = (datos.brechas || {})[cond.brecha];
      return brechaActiva(respuesta) === (cond.activa !== false);
    } else {
      return false;
    }

    /* Sin respuesta la condición no se cumple: nunca se inventa un valor. */
    if (valor === undefined || valor === null || valor === '') return false;
    valor = Number(valor);
    if (isNaN(valor)) return false;

    if (cond.igual !== undefined) return valor === cond.igual;
    if (cond.min !== undefined && valor < cond.min) return false;
    if (cond.max !== undefined && valor > cond.max) return false;
    return true;
  }

  global.COMEEN = global.COMEEN || {};
  global.COMEEN.reglas = { evaluar: evaluar, brechaActiva: brechaActiva };
})(typeof globalThis !== 'undefined' ? globalThis : this);
