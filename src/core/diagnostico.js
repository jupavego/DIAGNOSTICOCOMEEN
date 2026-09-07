/* ============================================================================
   core/diagnostico.js — Orquestador y modelo del registro
   ----------------------------------------------------------------------------
   Une puntuación + clasificación + recomendación en una sola ficha.
   Es la ÚNICA función que la interfaz necesita llamar para obtener un
   diagnóstico completo. La lógica de negocio no vive en ningún componente.
   ========================================================================== */
(function (global) {
  'use strict';

  function nuevoId() {
    var t = Date.now().toString(36);
    var r = Math.random().toString(36).slice(2, 8);
    return 'neg-' + t + '-' + r;
  }

  /* Registro vacío: la forma canónica de un negocio en el sistema. */
  function nuevoRegistro() {
    var I = global.COMEEN.instrumento;
    var negocio = {};
    I.CAMPOS_NEGOCIO.forEach(function (c) {
      negocio[c.id] = c.valorPorDefecto || '';
      if (c.otro) negocio[c.otro.id] = '';
    });

    return {
      id: nuevoId(),
      versionInstrumento: I.VERSION_INSTRUMENTO,
      creado: new Date().toISOString(),
      actualizado: new Date().toISOString(),
      negocio: negocio,
      madurez: {},          // M01..M12 → 0 | 1 | 2
      canales: {},          // whatsapp/facebook/instagram/web → 0 | 1 | 2
      brechas: {},          // B01..B08 → 'si' | 'talvez' | 'no'
      prioridades: [],      // hasta 3 códigos de servicio, en el orden elegido
      prioridadOtro: '',
      pago: '',             // 'P0'..'P4'
      estado: 'pendiente',
      notas: ''
    };
  }

  /* Devuelve el valor legible de un campo del negocio; si se eligió la opción
     "otro", devuelve lo que la persona escribió. Así ninguna vista tiene que
     saber que existe un campo alterno. */
  function textoCampo(negocio, campoId) {
    var campos = global.COMEEN.instrumento.CAMPOS_NEGOCIO;
    var campo = null;
    for (var i = 0; i < campos.length; i++) if (campos[i].id === campoId) campo = campos[i];
    var valor = (negocio || {})[campoId] || '';
    if (campo && campo.otro && valor === campo.otro.cuando) {
      var escrito = String((negocio || {})[campo.otro.id] || '').trim();
      if (escrito) return escrito;
    }
    return valor;
  }

  function rangoPago(codigo) {
    var lista = global.COMEEN.instrumento.PAYMENT_RANGES;
    for (var i = 0; i < lista.length; i++) if (lista[i].codigo === codigo) return lista[i];
    return null;
  }

  function estadoCanales(canales) {
    var C = global.COMEEN.instrumento.CHANNELS;
    var estados = global.COMEEN.instrumento.CHANNEL_STATES;
    return C.map(function (canal) {
      var v = (canales || {})[canal.id];
      v = (v === undefined || v === null || v === '') ? null : Number(v);
      var estado = null;
      for (var i = 0; i < estados.length; i++) if (estados[i].valor === v) estado = estados[i];
      return {
        id: canal.id,
        nombre: canal.nombre,
        valor: v,
        texto: estado ? estado.corto : 'Sin dato',
        tono: v === 2 ? 'bien' : (v === 1 ? 'aviso' : (v === 0 ? 'critico' : 'neutro'))
      };
    });
  }

  /**
   * Ficha completa de diagnóstico a partir de un registro.
   * @param {Object} registro
   */
  function evaluar(registro) {
    var datos = {
      negocio: registro.negocio || {},
      madurez: registro.madurez || {},
      canales: registro.canales || {},
      brechas: registro.brechas || {}
    };

    var puntuacion = global.COMEEN.puntuacion.calcular(datos.madurez);
    var clasificacion = global.COMEEN.clasificacion.clasificar(puntuacion.puntaje, datos);
    var servicios = global.COMEEN.recomendacion.recomendar(datos, registro.prioridades || []);

    var catalogoPrioridades = global.COMEEN.instrumento.PRIORITIES;
    var prioridades = (registro.prioridades || []).map(function (codigo, i) {
      var def = null;
      for (var k = 0; k < catalogoPrioridades.length; k++) {
        if (catalogoPrioridades[k].id === codigo) def = catalogoPrioridades[k];
      }
      return {
        posicion: i + 1,
        codigo: codigo,
        texto: def ? (codigo === 'OTRO' && registro.prioridadOtro ? registro.prioridadOtro : def.texto) : codigo,
        icono: def ? def.icono : '•'
      };
    });

    return {
      id: registro.id,
      fecha: registro.actualizado || registro.creado,
      versionInstrumento: registro.versionInstrumento,
      puntaje: puntuacion.puntaje,
      maximo: puntuacion.maximo,
      porcentaje: puntuacion.porcentaje,
      completo: puntuacion.completo,
      nivel: clasificacion,
      fortalezas: global.COMEEN.puntuacion.fortalezas(puntuacion),
      oportunidades: global.COMEEN.puntuacion.oportunidades(puntuacion),
      canales: estadoCanales(datos.canales),
      servicios: servicios,
      codigosServicio: servicios.map(function (s) { return s.codigo; }),
      cruce: global.COMEEN.recomendacion.cruce(servicios),
      prioridades: prioridades,
      pago: rangoPago(registro.pago),
      detalle: puntuacion.detalle
    };
  }

  global.COMEEN = global.COMEEN || {};
  global.COMEEN.diagnostico = {
    nuevoRegistro: nuevoRegistro,
    nuevoId: nuevoId,
    evaluar: evaluar,
    textoCampo: textoCampo,
    estadoCanales: estadoCanales,
    rangoPago: rangoPago
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
