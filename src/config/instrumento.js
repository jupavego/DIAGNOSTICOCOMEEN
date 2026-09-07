/* ============================================================================
   config/instrumento.js — Instrumento de diagnóstico COMEEN
   ----------------------------------------------------------------------------
   Todo el contenido del cuestionario vive aquí. Para cambiar una pregunta,
   agregar una opción o añadir un canal se edita ESTE archivo y nada más.
   Ningún componente visual contiene texto de preguntas.
   ========================================================================== */
(function (global) {
  'use strict';

  /* Versión del instrumento. Se guarda en cada diagnóstico para poder comparar
     mediciones hechas con formularios distintos. Súbela al cambiar preguntas. */
  var VERSION_INSTRUMENTO = '2.0';

  /* ── Categorías de negocio ──────────────────────────────────────────────── */
  /* COMEEN es un directorio gastronómico: la primera etapa se dirige a
     negocios de comida del municipio. Al ampliar a otros rubros, se agregan
     aquí y en ningún otro archivo.                                            */
  var BUSINESS_CATEGORIES = [
    'Restaurantes',
    'Comidas rápidas',
    'Asaderos y parrillas',
    'Pizzerías',
    'Panaderías y reposterías',
    'Cafeterías y heladerías',
    'Comida casera y corrientazo',
    'Fruterías y jugos',
    'Bares y licoreras',
    'Tiendas y graneros',
    'Carnicerías y pescaderías',
    'Tortas y postres por encargo',
    'Cocinas a domicilio',
    'Eventos y catering',
    'Otros negocios de comida'
  ];

  /* ── Paso 1: datos del negocio ──────────────────────────────────────────── */
  var CAMPOS_NEGOCIO = [
    { id: 'nombre',      etiqueta: 'Nombre del negocio',     tipo: 'texto',     requerido: true,  ayuda: 'Como lo conocen sus clientes' },
    { id: 'propietario', etiqueta: 'Nombre del propietario', tipo: 'texto',     requerido: true },
    /* 'otro' abre un campo de texto cuando se elige esa opción, para no perder
       el rubro real de los negocios que no encajan en la lista. */
    { id: 'categoria',   etiqueta: '¿A qué se dedica?',      tipo: 'seleccion', requerido: true,  opciones: BUSINESS_CATEGORIES,
      otro: { cuando: 'Otros negocios de comida', id: 'categoriaOtro', etiqueta: '¿Cuál? Escríbalo tal como lo llama la gente', requerido: true } },
    { id: 'telefono',    etiqueta: 'Teléfono',               tipo: 'tel',       requerido: false },
    { id: 'whatsapp',    etiqueta: 'WhatsApp',               tipo: 'tel',       requerido: false, ayuda: 'Si es el mismo teléfono, repítelo' },
    { id: 'direccion',   etiqueta: 'Dirección',              tipo: 'texto',     requerido: false },
    { id: 'municipio',   etiqueta: 'Municipio',              tipo: 'texto',     requerido: true,  valorPorDefecto: 'Girardota' },
    { id: 'barrio',      etiqueta: 'Barrio o vereda',        tipo: 'texto',     requerido: false },
    { id: 'descripcion', etiqueta: 'Cuéntenos brevemente qué vende u ofrece', tipo: 'parrafo', requerido: false },
    /* Lo diligencia quien aplica el diagnóstico, no el comerciante: es el dato
       que permite activar el servicio de directorio sin volver a preguntarlo. */
    { id: 'enComeen',    etiqueta: '¿Ya aparece en el directorio COMEEN?', tipo: 'seleccion', requerido: false,
      opciones: ['No', 'Sí'], valorPorDefecto: 'No', interno: true }
  ];

  /* ── Paso 2: las 12 variables que determinan el nivel ───────────────────── */
  /* Cada opción vale 0, 1 o 2. Las 12 suman el índice de 24 puntos.           */
  var QUESTIONS = [
    { id: 'M01', dimension: 'Identidad', variable: 'Identidad visual',
      pregunta: '¿Su negocio tiene un logo o imagen que utiliza para identificarse?',
      mide: 'Existencia de una identidad visual reconocible',
      fortaleza: 'Logo definido', oportunidad: 'Logo e imagen',
      opciones: [
        { valor: 0, texto: 'No tiene' },
        { valor: 1, texto: 'Tiene, pero quisiera mejorarlo' },
        { valor: 2, texto: 'Sí, está definido' }
      ] },
    { id: 'M02', dimension: 'Presentación', variable: 'Fotografías',
      pregunta: '¿Tiene fotografías propias y actuales de sus productos, servicios o establecimiento?',
      mide: 'Material visual propio disponible',
      fortaleza: 'Fotografías propias', oportunidad: 'Fotografías',
      opciones: [
        { valor: 0, texto: 'No' },
        { valor: 1, texto: 'Algunas' },
        { valor: 2, texto: 'Sí, suficientes y adecuadas' }
      ] },
    { id: 'M03', dimension: 'Oferta', variable: 'Catálogo',
      pregunta: '¿Tiene un menú, catálogo o listado digital de sus productos o servicios?',
      mide: 'Oferta comercial estructurada y consultable',
      fortaleza: 'Catálogo digital', oportunidad: 'Catálogo digital',
      opciones: [
        { valor: 0, texto: 'No' },
        { valor: 1, texto: 'Sí, pero incompleto o desactualizado' },
        { valor: 2, texto: 'Sí, completo y actualizado' }
      ] },
    { id: 'M04', dimension: 'Oferta', variable: 'Información comercial',
      pregunta: '¿Sus clientes pueden consultar fácilmente qué ofrece su negocio?',
      mide: 'Accesibilidad de la información comercial',
      fortaleza: 'Información comercial', oportunidad: 'Información comercial',
      opciones: [
        { valor: 0, texto: 'No' },
        { valor: 1, texto: 'Parcialmente' },
        { valor: 2, texto: 'Sí' }
      ] },
    { id: 'M05', dimension: 'Comunicación', variable: 'Canal de contacto',
      pregunta: '¿Tiene un medio digital para que los clientes contacten su negocio?',
      mide: 'Existencia de un canal de contacto digital',
      fortaleza: 'Canal de contacto', oportunidad: 'Canal de contacto',
      opciones: [
        { valor: 0, texto: 'No' },
        { valor: 1, texto: 'Sí, pero poco organizado' },
        { valor: 2, texto: 'Sí, activo y organizado' }
      ] },
    { id: 'M06', dimension: 'Comunicación', variable: 'WhatsApp',
      pregunta: '¿Utiliza WhatsApp o WhatsApp Business para atender clientes?',
      mide: 'Uso del canal conversacional dominante',
      fortaleza: 'WhatsApp', oportunidad: 'WhatsApp',
      opciones: [
        { valor: 0, texto: 'No' },
        { valor: 1, texto: 'Sí, ocasionalmente' },
        { valor: 2, texto: 'Sí, regularmente' }
      ] },
    { id: 'M07', dimension: 'Presencia', variable: 'Redes sociales',
      pregunta: '¿Su negocio tiene presencia en redes sociales?',
      mide: 'Presencia en plataformas sociales',
      fortaleza: 'Redes sociales', oportunidad: 'Redes sociales',
      opciones: [
        { valor: 0, texto: 'No' },
        { valor: 1, texto: 'Tiene, pero está poco activa' },
        { valor: 2, texto: 'Tiene una o más activas' }
      ] },
    { id: 'M08', dimension: 'Presencia', variable: 'Actualización',
      pregunta: '¿La información de su negocio en redes sociales está completa y actualizada?',
      mide: 'Calidad y vigencia de la información publicada',
      fortaleza: 'Información al día', oportunidad: 'Información al día',
      opciones: [
        { valor: 0, texto: 'No' },
        { valor: 1, texto: 'Parcialmente' },
        { valor: 2, texto: 'Sí' }
      ] },
    { id: 'M09', dimension: 'Visibilidad', variable: 'Encontrabilidad',
      pregunta: 'Si una persona busca su negocio en Internet, ¿puede encontrarlo fácilmente?',
      mide: 'Capacidad de ser hallado por un cliente nuevo',
      fortaleza: 'Se encuentra en Internet', oportunidad: 'Ubicación en Internet',
      opciones: [
        { valor: 0, texto: 'No aparece' },
        { valor: 1, texto: 'No estoy seguro' },
        { valor: 2, texto: 'Sí' }
      ] },
    { id: 'M10', dimension: 'Comercial', variable: 'Interacción digital',
      pregunta: '¿Recibe consultas, pedidos, reservas o solicitudes por medios digitales?',
      mide: 'Conversión real del canal digital',
      fortaleza: 'Pedidos y consultas digitales', oportunidad: 'Pedidos y consultas digitales',
      opciones: [
        { valor: 0, texto: 'No' },
        { valor: 1, texto: 'Algunas veces' },
        { valor: 2, texto: 'Regularmente' }
      ] },
    { id: 'M11', dimension: 'Promoción', variable: 'Promoción digital',
      pregunta: '¿Utiliza Internet o redes sociales para promocionar su negocio?',
      mide: 'Actividad promocional propia',
      fortaleza: 'Promoción digital', oportunidad: 'Promoción digital',
      opciones: [
        { valor: 0, texto: 'Nunca' },
        { valor: 1, texto: 'Algunas veces' },
        { valor: 2, texto: 'Regularmente' }
      ] },
    { id: 'M12', dimension: 'Ecosistema', variable: 'Integración',
      pregunta: '¿Utiliza varios medios digitales de manera complementaria para mostrar y atender su negocio?',
      mide: 'Articulación entre herramientas',
      fortaleza: 'Herramientas integradas', oportunidad: 'Integración de canales',
      opciones: [
        { valor: 0, texto: 'No' },
        { valor: 1, texto: 'Algunos' },
        { valor: 2, texto: 'Sí' }
      ] }
  ];

  /* ── Paso 3: matriz de estado de canales ────────────────────────────────── */
  /* Diagnóstica. NO suma al índice de 24 puntos: produciría doble conteo con
     M06 (WhatsApp) y M07 (redes sociales).                                     */
  var CHANNELS = [
    { id: 'whatsapp',  nombre: 'WhatsApp',                servicio: 'WAB' },
    { id: 'facebook',  nombre: 'Facebook',                servicio: 'FB'  },
    { id: 'instagram', nombre: 'Instagram',               servicio: 'IG'  },
    { id: 'web',       nombre: 'Página web o directorio', servicio: 'WEB' }
  ];

  var CHANNEL_STATES = [
    { valor: 0, texto: 'No tiene',                   corto: 'No tiene' },
    { valor: 1, texto: 'Tiene, pero está inactivo',  corto: 'Inactivo' },
    { valor: 2, texto: 'Activo y actualizado',       corto: 'Activo'   }
  ];

  /* ── Paso 4: brechas percibidas ─────────────────────────────────────────── */
  /* NO modifican el nivel de madurez. Activan servicios.                       */
  var GAP_ANSWERS = [
    { valor: 'si',     texto: 'Sí',      activa: true  },
    { valor: 'talvez', texto: 'Tal vez', activa: true  },
    { valor: 'no',     texto: 'No',      activa: false }
  ];

  var GAPS = [
    { id: 'B01', necesidad: 'Fotografía', servicio: 'FOTO',
      pregunta: '¿Considera que necesita mejorar las fotografías de sus productos o servicios?' },
    { id: 'B02', necesidad: 'Catálogo', servicio: 'CAT',
      pregunta: '¿Le gustaría contar con un menú o catálogo digital?' },
    { id: 'B03', necesidad: 'Identidad', servicio: 'IDENT',
      pregunta: '¿Le gustaría mejorar la imagen o presentación visual de su negocio?' },
    { id: 'B04', necesidad: 'Redes sociales', servicio: 'REDES',
      pregunta: '¿Le gustaría crear o mejorar las redes sociales de su negocio?' },
    { id: 'B05', necesidad: 'WhatsApp', servicio: 'WAB',
      pregunta: '¿Le gustaría organizar mejor WhatsApp para atender clientes?' },
    { id: 'B06', necesidad: 'Presencia web', servicio: 'WEB',
      pregunta: '¿Le gustaría que su negocio tuviera una presencia en Internet donde los clientes pudieran encontrarlo?' },
    { id: 'B07', necesidad: 'Directorio COMEEN', servicio: 'COMEEN',
      pregunta: '¿Le gustaría que su negocio apareciera en el directorio digital de COMEEN?' },
    { id: 'B08', necesidad: 'Promoción', servicio: 'PROMO',
      pregunta: '¿Le interesaría que COMEEN ayudara a promocionar su negocio?' }
  ];

  /* ── Paso 5: prioridades del comerciante (máx. 3, se guarda el orden) ───── */
  var PRIORITIES_MAX = 3;

  var PRIORITIES = [
    { id: 'FOTO',   texto: 'Fotografías',          icono: '📸' },
    { id: 'CAT',    texto: 'Menú o catálogo',      icono: '📋' },
    { id: 'IDENT',  texto: 'Logo e imagen',        icono: '🎨' },
    { id: 'WAB',    texto: 'WhatsApp',             icono: '💬' },
    { id: 'FB',     texto: 'Facebook',             icono: '👍' },
    { id: 'IG',     texto: 'Instagram',            icono: '📷' },
    { id: 'WEB',    texto: 'Página web',           icono: '🌐' },
    { id: 'GEO',    texto: 'Aparecer en Internet', icono: '📍' },
    { id: 'PROMO',  texto: 'Promoción',            icono: '📣' },
    { id: 'COMEEN', texto: 'Aparecer en COMEEN',   icono: '🏪' },
    { id: 'OTRO',   texto: 'Otro',                 icono: '✳️' }
  ];

  /* ── Paso 6: disposición de pago (variable comercial, no puntúa) ────────── */
  var PAYMENT_RANGES = [
    { codigo: 'P0', texto: 'Por ahora no invertiría', corto: 'No invertiría', orden: 0 },
    { codigo: 'P1', texto: 'Menos de $50.000',        corto: '< $50k',        orden: 1 },
    { codigo: 'P2', texto: '$50.000 – $100.000',      corto: '$50–100k',      orden: 2 },
    { codigo: 'P3', texto: '$100.001 – $200.000',     corto: '$100–200k',     orden: 3 },
    { codigo: 'P4', texto: 'Más de $200.000',         corto: '> $200k',       orden: 4 }
  ];

  /* ── Estado de atención comercial (ficha del negocio) ───────────────────── */
  var ATTENTION_STATUSES = [
    { id: 'pendiente',  texto: 'Pendiente',            tono: 'neutro' },
    { id: 'contactado', texto: 'Contactado',           tono: 'info'   },
    { id: 'en_proceso', texto: 'En proceso',           tono: 'aviso'  },
    { id: 'realizados', texto: 'Servicios realizados', tono: 'bien'   },
    { id: 'finalizado', texto: 'Finalizado',           tono: 'bien'   }
  ];

  global.COMEEN = global.COMEEN || {};
  global.COMEEN.instrumento = {
    VERSION_INSTRUMENTO: VERSION_INSTRUMENTO,
    BUSINESS_CATEGORIES: BUSINESS_CATEGORIES,
    CAMPOS_NEGOCIO: CAMPOS_NEGOCIO,
    QUESTIONS: QUESTIONS,
    CHANNELS: CHANNELS,
    CHANNEL_STATES: CHANNEL_STATES,
    GAPS: GAPS,
    GAP_ANSWERS: GAP_ANSWERS,
    PRIORITIES: PRIORITIES,
    PRIORITIES_MAX: PRIORITIES_MAX,
    PAYMENT_RANGES: PAYMENT_RANGES,
    ATTENTION_STATUSES: ATTENTION_STATUSES
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
