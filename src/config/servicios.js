/* ============================================================================
   config/servicios.js — Catálogo y reglas de activación de servicios COMEEN
   ----------------------------------------------------------------------------
   Un servicio se activa por DOS vías independientes que se registran por
   separado:

     diagnostico → la brecha la detecta el instrumento (el negocio no lo tiene)
     percibida   → el comerciante la declara en las preguntas B01–B08

   Guardar ambas permite el cruce que interesa comercialmente:
   necesidad DIAGNOSTICADA vs. necesidad PERCIBIDA. Un negocio sin Instagram
   que dice no necesitarlo aparece con origen 'diagnostico' — y esa diferencia
   es información de venta, no un error.

   'orden' fija la secuencia recomendada de intervención (primero los activos
   digitales base, después visibilidad y promoción).
   ========================================================================== */
(function (global) {
  'use strict';

  var SERVICE_RULES = [
    {
      codigo: 'IDENT', nombre: 'Identidad visual', icono: '🎨', orden: 10,
      descripcion: 'Diseño o mejora del logo y la presentación visual del negocio.',
      diagnostico: { variable: 'M01', max: 1 },
      percibida: 'B03'
    },
    {
      codigo: 'FOTO', nombre: 'Fotografía de productos', icono: '📸', orden: 20,
      descripcion: 'Producción de fotografías propias del establecimiento, productos o servicios.',
      diagnostico: { variable: 'M02', max: 1 },
      percibida: 'B01'
    },
    {
      codigo: 'CAT', nombre: 'Menú o catálogo digital', icono: '📋', orden: 30,
      descripcion: 'Construcción del listado de productos o servicios con precios, listo para compartir.',
      diagnostico: { cualquiera: [ { variable: 'M03', max: 1 }, { variable: 'M04', max: 1 } ] },
      percibida: 'B02'
    },
    {
      codigo: 'WAB', nombre: 'WhatsApp Business', icono: '💬', orden: 40,
      descripcion: 'Configuración del perfil, catálogo, respuestas rápidas y horario de atención.',
      diagnostico: { cualquiera: [ { variable: 'M06', max: 1 }, { canal: 'whatsapp', max: 1 } ] },
      percibida: 'B05'
    },
    {
      codigo: 'REDES', nombre: 'Redes sociales', icono: '📱', orden: 50,
      descripcion: 'Creación u ordenamiento general de las redes del negocio y su contenido.',
      diagnostico: { cualquiera: [ { variable: 'M07', max: 1 }, { variable: 'M08', max: 1 } ] },
      percibida: 'B04'
    },
    {
      codigo: 'FB', nombre: 'Facebook', icono: '👍', orden: 60,
      descripcion: 'Creación o reactivación de la página de Facebook del negocio.',
      diagnostico: { canal: 'facebook', max: 1 },
      percibida: null
    },
    {
      codigo: 'IG', nombre: 'Instagram', icono: '📷', orden: 70,
      descripcion: 'Creación u optimización del perfil de Instagram y su parrilla de contenido.',
      diagnostico: { canal: 'instagram', max: 1 },
      percibida: null
    },
    {
      /* WEB responde a "no tiene un sitio propio". GEO responde a "no lo
         encuentran". Son brechas distintas y por eso tienen reglas distintas:
         un negocio puede tener web y aun así no aparecer al buscarlo. */
      codigo: 'WEB', nombre: 'Presencia web', icono: '🌐', orden: 80,
      descripcion: 'Micrositio o ficha web propia donde el cliente encuentra todo el negocio.',
      diagnostico: { canal: 'web', max: 1 },
      percibida: 'B06'
    },
    {
      codigo: 'GEO', nombre: 'Ubicación en Internet', icono: '📍', orden: 90,
      descripcion: 'Registro en mapas y buscadores para que el negocio aparezca al buscarlo.',
      /* "No estoy seguro" (1) cuenta como brecha: si el dueño no sabe si lo
         encuentran, el cliente tampoco lo está encontrando. */
      diagnostico: { variable: 'M09', max: 1 },
      percibida: null
    },
    {
      codigo: 'COMEEN', nombre: 'Directorio COMEEN', icono: '🏪', orden: 100,
      descripcion: 'Inclusión del negocio en el directorio digital de COMEEN.',
      diagnostico: { campo: 'enComeen', igual: 'No' },
      percibida: 'B07'
    },
    {
      codigo: 'PROMO', nombre: 'Promoción COMEEN', icono: '📣', orden: 110,
      descripcion: 'Difusión del negocio en los canales y campañas de COMEEN.',
      diagnostico: { variable: 'M11', max: 1 },
      percibida: 'B08'
    }
  ];

  global.COMEEN = global.COMEEN || {};
  global.COMEEN.servicios = { SERVICE_RULES: SERVICE_RULES };
})(typeof globalThis !== 'undefined' ? globalThis : this);
