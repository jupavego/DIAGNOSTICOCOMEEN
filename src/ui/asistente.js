/* ============================================================================
   ui/asistente.js — Cuestionario paso a paso
   ----------------------------------------------------------------------------
   Solo interfaz: pinta lo que declara config/instrumento.js y guarda respuestas
   en el registro. No calcula puntajes, niveles ni servicios.

   Tono: el comerciante nunca lee que está siendo evaluado. Lee que estamos
   conociendo su negocio para saber cómo ayudarle.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = global.COMEEN.ui.util;
  var el = U.el;

  function construirPantallas() {
    var I = global.COMEEN.instrumento;
    var pantallas = [{ tipo: 'intro', bloque: 'Bienvenida', preguntas: 0 }];

    pantallas.push({ tipo: 'datos', bloque: 'Su negocio', preguntas: 0,
      titulo: 'Cuéntenos de su negocio',
      intro: 'Con estos datos podemos identificarlo y volver a contactarlo.' });

    for (var i = 0; i < I.QUESTIONS.length; i += 2) {
      pantallas.push({
        tipo: 'madurez',
        bloque: 'Su negocio en Internet',
        items: I.QUESTIONS.slice(i, i + 2),
        preguntas: I.QUESTIONS.slice(i, i + 2).length,
        titulo: i === 0 ? 'Cómo se ve hoy su negocio' : null
      });
    }

    pantallas.push({ tipo: 'canales', bloque: 'Sus canales', preguntas: 1,
      titulo: '¿Dónde está su negocio hoy?',
      intro: 'Marque cómo está cada uno. Si lo tiene pero no lo usa hace meses, es "inactivo".' });

    pantallas.push({ tipo: 'brechas', bloque: 'Lo que necesita', items: I.GAPS.slice(0, 4), preguntas: 4,
      titulo: 'En qué le gustaría que le ayudáramos',
      intro: 'No hay respuestas correctas. Marque lo que de verdad le interesa.' });
    pantallas.push({ tipo: 'brechas', bloque: 'Lo que necesita', items: I.GAPS.slice(4), preguntas: 4 });

    pantallas.push({ tipo: 'prioridades', bloque: 'Sus prioridades', preguntas: 1,
      titulo: 'Si pudiera mejorar solo tres cosas',
      intro: 'Elija hasta tres, en el orden que las quiere. Ese orden nos dice por dónde empezar.' });

    pantallas.push({ tipo: 'pago', bloque: 'Para cerrar', preguntas: 1,
      titulo: 'Una última pregunta',
      intro: 'Nos ayuda a armar paquetes de servicio que sí estén al alcance de los negocios del municipio.' });

    return pantallas;
  }

  function crear(contenedor, opciones) {
    var I = global.COMEEN.instrumento;
    var pantallas = construirPantallas();
    var registro = opciones.registro;
    var indice = opciones.indiceInicial || 0;
    var errores = [];

    var totalPreguntas = pantallas.reduce(function (a, p) { return a + (p.preguntas || 0); }, 0);

    function preguntasAntesDe(i) {
      var n = 0;
      for (var k = 0; k < i; k++) n += pantallas[k].preguntas || 0;
      return n;
    }

    function guardarBorrador() {
      global.COMEEN.almacenamiento.borrador.escribir({ registro: registro, indice: indice });
    }

    /* ── Piezas ───────────────────────────────────────────────────────────── */

    function bloquePregunta(item, valorActual, alElegir, opcionesLista, dimension) {
      var opciones = el('div.opciones', { role: 'group', 'aria-label': item.pregunta });
      opcionesLista.forEach(function (op) {
        var elegida = String(valorActual) === String(op.valor);
        opciones.appendChild(el('button.opcion', {
          type: 'button',
          'aria-pressed': elegida ? 'true' : 'false',
          onclick: function () { alElegir(op.valor); }
        }, [el('span.opcion__marca'), el('span', { texto: op.texto })]));
      });

      return el('div.pregunta', null, [
        dimension ? el('span.pregunta__dimension', { texto: dimension }) : null,
        el('p.pregunta__texto', { texto: item.pregunta }),
        opciones
      ]);
    }

    function pantallaIntro() {
      return el('div', null, [
        el('div.resultado__cabecera', null, [
          el('p.resultado__eyebrow', { texto: 'Diagnóstico digital COMEEN' }),
          el('h1.resultado__negocio', { texto: 'Conozcamos su negocio' }),
          el('p.resultado__mensaje', {
            texto: 'Son unas preguntas cortas sobre cómo se ve hoy su negocio en Internet. ' +
                   'Al terminar le mostramos en qué está bien, qué le falta y cómo podemos ayudarle. ' +
                   'Toma entre 3 y 5 minutos.'
          })
        ]),
        el('div.tarjeta', { style: 'margin-top:var(--e-5)' }, [
          el('p.tarjeta__titulo', { texto: 'Qué vamos a mirar' }),
          el('ul.lista-marcas', null, [
            el('li', null, [el('span.marca-si', { texto: '1' }), 'Cómo se presenta su negocio: imagen, fotos y lo que ofrece']),
            el('li', null, [el('span.marca-si', { texto: '2' }), 'Por dónde lo contactan y dónde lo encuentran sus clientes']),
            el('li', null, [el('span.marca-si', { texto: '3' }), 'Qué le gustaría mejorar y con qué contamos para lograrlo'])
          ])
        ])
      ]);
    }

    function pantallaDatos() {
      var caja = el('div.grupo');
      I.CAMPOS_NEGOCIO.forEach(function (campo) {
        var valor = registro.negocio[campo.id] || '';
        var conError = errores.indexOf(campo.id) >= 0;
        var control;

        if (campo.tipo === 'seleccion') {
          control = el('select.campo__control' + (conError ? '.campo__control--error' : ''), {
            id: 'campo-' + campo.id,
            onchange: function (ev) { registro.negocio[campo.id] = ev.target.value; guardarBorrador(); }
          });
          control.appendChild(el('option', { value: '', texto: 'Seleccione…' }));
          campo.opciones.forEach(function (o) {
            var op = el('option', { value: o, texto: o });
            if (o === valor) op.selected = true;
            control.appendChild(op);
          });
        } else {
          var etiquetaHtml = campo.tipo === 'parrafo' ? 'textarea' : 'input';
          control = el(etiquetaHtml + '.campo__control' + (conError ? '.campo__control--error' : ''), {
            id: 'campo-' + campo.id,
            type: campo.tipo === 'tel' ? 'tel' : 'text',
            inputmode: campo.tipo === 'tel' ? 'tel' : null,
            valor: valor,
            oninput: function (ev) { registro.negocio[campo.id] = ev.target.value; guardarBorrador(); }
          });
        }

        caja.appendChild(el('div.campo', null, [
          el('label.campo__etiqueta', { for: 'campo-' + campo.id }, [
            campo.etiqueta,
            campo.requerido ? el('span.requerido', { texto: ' *' }) : null
          ]),
          campo.ayuda ? el('span.campo__ayuda', { texto: campo.ayuda }) : null,
          control,
          conError ? el('span.campo__error', { texto: 'Este dato es necesario para poder contactarlo.' }) : null
        ]));

        /* Al elegir la opción "otro" se abre un campo para escribir cuál. */
        if (campo.otro && valor === campo.otro.cuando) {
          var errorOtro = errores.indexOf(campo.otro.id) >= 0;
          caja.appendChild(el('div.campo.campo--anidado', null, [
            el('label.campo__etiqueta', { for: 'campo-' + campo.otro.id }, [
              campo.otro.etiqueta,
              campo.otro.requerido ? el('span.requerido', { texto: ' *' }) : null
            ]),
            el('input.campo__control' + (errorOtro ? '.campo__control--error' : ''), {
              id: 'campo-' + campo.otro.id,
              type: 'text',
              autocomplete: 'off',
              valor: registro.negocio[campo.otro.id] || '',
              oninput: function (ev) { registro.negocio[campo.otro.id] = ev.target.value; guardarBorrador(); }
            }),
            errorOtro ? el('span.campo__error', { texto: 'Escriba a qué se dedica el negocio.' }) : null
          ]));
        }
      });
      return caja;
    }

    function pantallaMadurez(pantalla) {
      var caja = el('div.grupo');
      pantalla.items.forEach(function (q) {
        caja.appendChild(bloquePregunta(q, registro.madurez[q.id], function (v) {
          registro.madurez[q.id] = v;
          guardarBorrador();
          pintar();
        }, q.opciones, q.dimension));
      });
      return caja;
    }

    function pantallaCanales() {
      var caja = el('div.matriz');
      I.CHANNELS.forEach(function (canal) {
        var opciones = el('div.matriz__opciones', { role: 'group', 'aria-label': canal.nombre });
        I.CHANNEL_STATES.forEach(function (estado) {
          var elegida = String(registro.canales[canal.id]) === String(estado.valor);
          opciones.appendChild(el('button.matriz__btn', {
            type: 'button',
            'aria-pressed': elegida ? 'true' : 'false',
            onclick: function () { registro.canales[canal.id] = estado.valor; guardarBorrador(); pintar(); }
          }, estado.corto));
        });
        caja.appendChild(el('div.matriz__fila', null, [
          el('div.matriz__canal', null, canal.nombre),
          opciones
        ]));
      });
      return caja;
    }

    function pantallaBrechas(pantalla) {
      var caja = el('div.grupo');
      pantalla.items.forEach(function (g) {
        caja.appendChild(bloquePregunta(g, registro.brechas[g.id], function (v) {
          registro.brechas[g.id] = v;
          guardarBorrador();
          pintar();
        }, I.GAP_ANSWERS, g.necesidad));
      });
      return caja;
    }

    function pantallaPrioridades() {
      var elegidas = registro.prioridades;
      var lleno = elegidas.length >= I.PRIORITIES_MAX;
      var fichas = el('div.fichas');

      I.PRIORITIES.forEach(function (p) {
        var pos = elegidas.indexOf(p.id);
        var activa = pos >= 0;
        fichas.appendChild(el('button.ficha-opcion', {
          type: 'button',
          'aria-pressed': activa ? 'true' : 'false',
          disabled: !activa && lleno,
          onclick: function () {
            if (activa) elegidas.splice(pos, 1);
            else if (!lleno) elegidas.push(p.id);
            guardarBorrador();
            pintar();
          }
        }, [
          el('span', { texto: p.icono }),
          el('span', { texto: p.texto }),
          activa ? el('span.ficha-opcion__orden', { texto: String(pos + 1) }) : null
        ]));
      });

      var caja = el('div.grupo', null, [
        fichas,
        el('p.campo__ayuda', {
          texto: elegidas.length + ' de ' + I.PRIORITIES_MAX + ' elegidas' +
                 (lleno ? ' · para cambiar una, tóquela de nuevo para quitarla' : '')
        })
      ]);

      if (elegidas.indexOf('OTRO') >= 0) {
        caja.appendChild(el('div.campo', null, [
          el('label.campo__etiqueta', { for: 'prioridad-otro', texto: '¿Cuál otra cosa le gustaría mejorar?' }),
          el('input.campo__control', {
            id: 'prioridad-otro', type: 'text', valor: registro.prioridadOtro || '',
            oninput: function (ev) { registro.prioridadOtro = ev.target.value; guardarBorrador(); }
          })
        ]));
      }
      return caja;
    }

    function pantallaPago() {
      var opciones = el('div.opciones', { role: 'group', 'aria-label': 'Disposición de inversión' });
      I.PAYMENT_RANGES.forEach(function (r) {
        var elegida = registro.pago === r.codigo;
        opciones.appendChild(el('button.opcion', {
          type: 'button',
          'aria-pressed': elegida ? 'true' : 'false',
          onclick: function () { registro.pago = r.codigo; guardarBorrador(); pintar(); }
        }, [el('span.opcion__marca'), el('span', { texto: r.texto })]));
      });

      return el('div.pregunta', null, [
        el('span.pregunta__dimension', { texto: 'Inversión' }),
        el('p.pregunta__texto', {
          texto: 'Si COMEEN le ofreciera un paquete de servicios para mejorar la presencia digital de su negocio, ¿cuánto estaría dispuesto a invertir?'
        }),
        opciones
      ]);
    }

    /* ── Validación ───────────────────────────────────────────────────────── */
    function validar(pantalla) {
      errores = [];
      if (pantalla.tipo === 'datos') {
        I.CAMPOS_NEGOCIO.forEach(function (c) {
          if (c.requerido && !String(registro.negocio[c.id] || '').trim()) errores.push(c.id);
          if (c.otro && c.otro.requerido && registro.negocio[c.id] === c.otro.cuando &&
              !String(registro.negocio[c.otro.id] || '').trim()) errores.push(c.otro.id);
        });
      } else if (pantalla.tipo === 'madurez') {
        pantalla.items.forEach(function (q) {
          if (registro.madurez[q.id] === undefined) errores.push(q.id);
        });
      } else if (pantalla.tipo === 'canales') {
        I.CHANNELS.forEach(function (c) {
          if (registro.canales[c.id] === undefined) errores.push(c.id);
        });
      } else if (pantalla.tipo === 'brechas') {
        pantalla.items.forEach(function (g) {
          if (!registro.brechas[g.id]) errores.push(g.id);
        });
      } else if (pantalla.tipo === 'pago') {
        if (!registro.pago) errores.push('pago');
      }
      return errores.length === 0;
    }

    function textoAviso(pantalla) {
      if (!errores.length) return null;
      if (pantalla.tipo === 'datos') return 'Faltan datos marcados con *.';
      if (pantalla.tipo === 'canales') return 'Marque el estado de cada canal, aunque sea "No tiene".';
      if (pantalla.tipo === 'pago') return 'Elija una opción para continuar.';
      return errores.length === 1 ? 'Falta responder una pregunta.' : 'Faltan ' + errores.length + ' preguntas por responder.';
    }

    /* ── Render ───────────────────────────────────────────────────────────── */
    function pintar() {
      var pantalla = pantallas[indice];
      U.vaciar(contenedor);

      var esUltima = indice === pantallas.length - 1;
      var cuerpo;
      switch (pantalla.tipo) {
        case 'intro':        cuerpo = pantallaIntro(); break;
        case 'datos':        cuerpo = pantallaDatos(); break;
        case 'madurez':      cuerpo = pantallaMadurez(pantalla); break;
        case 'canales':      cuerpo = pantallaCanales(); break;
        case 'brechas':      cuerpo = pantallaBrechas(pantalla); break;
        case 'prioridades':  cuerpo = pantallaPrioridades(); break;
        case 'pago':         cuerpo = pantallaPago(); break;
        default:             cuerpo = el('div');
      }

      var desde = preguntasAntesDe(indice);
      var hasta = desde + (pantalla.preguntas || 0);

      if (pantalla.tipo !== 'intro') {
        contenedor.appendChild(el('div.progreso', null, [
          el('div.progreso__cabecera', null, [
            el('span.progreso__etapa', { texto: pantalla.bloque }),
            el('span.progreso__conteo', {
              texto: pantalla.preguntas
                ? (pantalla.preguntas === 1
                    ? 'Pregunta ' + hasta + ' de ' + totalPreguntas
                    : 'Preguntas ' + (desde + 1) + '–' + hasta + ' de ' + totalPreguntas)
                : 'Paso ' + (indice + 1) + ' de ' + pantallas.length
            })
          ]),
          el('div.progreso__riel', {
            role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(totalPreguntas),
            'aria-valuenow': String(hasta)
          }, [
            el('div.progreso__avance', { style: 'width:' + Math.round((hasta / totalPreguntas) * 100) + '%' })
          ])
        ]));
      }

      if (pantalla.titulo) contenedor.appendChild(el('h1.paso__titulo', { texto: pantalla.titulo }));
      if (pantalla.intro)  contenedor.appendChild(el('p.paso__intro', { texto: pantalla.intro }));

      var aviso = textoAviso(pantalla);
      if (aviso) contenedor.appendChild(el('p.aviso-validacion', { role: 'alert', texto: aviso }));

      contenedor.appendChild(cuerpo);

      contenedor.appendChild(el('div.pie-nav', null, [
        /* En la encuesta pública no hay "Salir": no existe un panel al que
           volver, y ofrecerlo solo confundiría al comerciante. */
        indice > 0 ? el('button.btn.btn--secundario', {
          type: 'button',
          onclick: function () { errores = []; indice--; guardarBorrador(); pintar(); global.scrollTo(0, 0); }
        }, 'Atrás') : (opciones.permiteSalir ? el('button.btn.btn--fantasma', {
          type: 'button', onclick: function () { opciones.alSalir && opciones.alSalir(); }
        }, 'Salir') : null),
        el('button.btn.btn--principal', {
          type: 'button',
          onclick: function () {
            if (!validar(pantalla)) { pintar(); return; }
            if (esUltima) { opciones.alTerminar(registro); return; }
            indice++;
            guardarBorrador();
            pintar();
            global.scrollTo(0, 0);
          }
        }, pantalla.tipo === 'intro' ? 'Empezar' : (esUltima ? 'Ver el resultado' : 'Continuar'))
      ]));
    }

    pintar();
    return { pintar: pintar };
  }

  global.COMEEN.ui.asistente = { crear: crear, construirPantallas: construirPantallas };
})(typeof globalThis !== 'undefined' ? globalThis : this);
