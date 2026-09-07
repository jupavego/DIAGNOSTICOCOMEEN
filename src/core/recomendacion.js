/* ============================================================================
   core/recomendacion.js — Motor de recomendación de servicios
   ----------------------------------------------------------------------------
   Convierte brechas en servicios COMEEN. Registra por separado si la brecha la
   detectó el instrumento, si la declaró el comerciante, o ambas.

   Orden de presentación:
     1. lo que el comerciante puso como prioridad 1, 2 y 3
     2. lo que aparece por diagnóstico Y por percepción (coincidencia)
     3. el orden de intervención definido en config/servicios.js
   ========================================================================== */
(function (global) {
  'use strict';

  function recomendar(datos, prioridades) {
    var evaluar = global.COMEEN.reglas.evaluar;
    var brechaActiva = global.COMEEN.reglas.brechaActiva;
    var catalogo = global.COMEEN.servicios.SERVICE_RULES;
    prioridades = prioridades || [];

    var activados = [];

    for (var i = 0; i < catalogo.length; i++) {
      var s = catalogo[i];
      var porDiagnostico = s.diagnostico ? evaluar(s.diagnostico, datos) : false;
      var porPercepcion = s.percibida ? brechaActiva((datos.brechas || {})[s.percibida]) : false;
      if (!porDiagnostico && !porPercepcion) continue;

      var posicion = prioridades.indexOf(s.codigo);
      activados.push({
        codigo: s.codigo,
        nombre: s.nombre,
        icono: s.icono,
        descripcion: s.descripcion,
        porDiagnostico: porDiagnostico,
        porPercepcion: porPercepcion,
        origen: porDiagnostico && porPercepcion ? 'ambas' : (porDiagnostico ? 'diagnostico' : 'percibida'),
        esPrioridad: posicion >= 0,
        prioridad: posicion >= 0 ? posicion + 1 : null,
        orden: s.orden
      });
    }

    activados.sort(function (a, b) {
      if (a.esPrioridad !== b.esPrioridad) return a.esPrioridad ? -1 : 1;
      if (a.esPrioridad && b.esPrioridad) return a.prioridad - b.prioridad;
      var coincideA = a.origen === 'ambas' ? 0 : 1;
      var coincideB = b.origen === 'ambas' ? 0 : 1;
      if (coincideA !== coincideB) return coincideA - coincideB;
      return a.orden - b.orden;
    });

    return activados;
  }

  /* Cruce necesidad diagnosticada vs. percibida — la lectura comercial:
       ambas       → el comerciante ya sabe que lo necesita (venta directa)
       diagnostico → hay brecha real que él no ve (venta que hay que explicar)
       percibida   → la pide aunque el instrumento no la detectó (interés)     */
  function cruce(servicios) {
    var salida = { ambas: [], diagnostico: [], percibida: [] };
    servicios.forEach(function (s) { salida[s.origen].push(s.codigo); });
    return salida;
  }

  global.COMEEN = global.COMEEN || {};
  global.COMEEN.recomendacion = { recomendar: recomendar, cruce: cruce };
})(typeof globalThis !== 'undefined' ? globalThis : this);
