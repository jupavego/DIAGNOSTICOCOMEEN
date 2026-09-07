/* ============================================================================
   ui/ficha.js — Ficha individual del negocio
   ----------------------------------------------------------------------------
   Reutiliza la ficha de resultado y le agrega lo que solo interesa a COMEEN:
   datos de contacto, estado de atención, notas y trazabilidad del diagnóstico.

   Distribución: el diagnóstico ocupa la columna principal y los datos de
   gestión la lateral, que se queda fija al hacer scroll. En pantalla angosta
   cae a una sola columna.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = global.COMEEN.ui.util;
  var el = U.el;

  function dato(etiqueta, valor) {
    return el('div.dato', null, [
      el('div.dato__etiqueta', { texto: etiqueta }),
      el('div.dato__valor', { texto: valor || '—' })
    ]);
  }

  function enlaceWhatsapp(numero) {
    var limpio = String(numero || '').replace(/[^0-9]/g, '');
    if (limpio.length < 7) return null;
    if (limpio.length === 10) limpio = '57' + limpio;
    return el('a.btn.btn--secundario.btn--pequeno', {
      href: 'https://wa.me/' + limpio, target: '_blank', rel: 'noopener'
    }, 'Escribir por WhatsApp');
  }

  function bloqueContacto(registro) {
    var n = registro.negocio;
    var wa = enlaceWhatsapp(n.whatsapp || n.telefono);
    return el('div.tarjeta', null, [
      el('p.tarjeta__titulo', { texto: 'Datos del negocio' }),
      el('div.datos-lista', null, [
        dato('Propietario', n.propietario),
        dato('Categoría', global.COMEEN.diagnostico.textoCampo(n, 'categoria')),
        dato('Teléfono', n.telefono),
        dato('WhatsApp', n.whatsapp),
        dato('Dirección', n.direccion),
        dato('Municipio', n.municipio),
        dato('Barrio o vereda', n.barrio),
        dato('En directorio COMEEN', n.enComeen)
      ]),
      n.descripcion ? el('div', { style: 'margin-top:var(--e-4)' }, [
        el('div.dato__etiqueta', { texto: 'Qué ofrece' }),
        el('div.dato__valor', { texto: n.descripcion })
      ]) : null,
      wa ? el('div.acciones-fila', { style: 'margin-top:var(--e-4)' }, [wa]) : null
    ]);
  }

  function bloqueGestion(registro, alGuardar) {
    var I = global.COMEEN.instrumento;

    var selectorEstado = el('select.campo__control', {
      id: 'estado-atencion',
      onchange: function (ev) { registro.estado = ev.target.value; alGuardar('Estado actualizado.'); }
    });
    I.ATTENTION_STATUSES.forEach(function (e) {
      var op = el('option', { value: e.id, texto: e.texto });
      if (registro.estado === e.id) op.selected = true;
      selectorEstado.appendChild(op);
    });

    var notas = el('textarea.campo__control', {
      id: 'notas-negocio',
      placeholder: 'Qué se acordó, cuándo volver a pasar, quién atendió…',
      valor: registro.notas || ''
    });

    return el('div.tarjeta', null, [
      el('p.tarjeta__titulo', { texto: 'Gestión COMEEN' }),
      el('div.campo', null, [
        el('label.campo__etiqueta', { for: 'estado-atencion', texto: 'Estado de atención' }),
        selectorEstado
      ]),
      el('div.campo', { style: 'margin-top:var(--e-4)' }, [
        el('label.campo__etiqueta', { for: 'notas-negocio', texto: 'Notas de seguimiento' }),
        notas,
        el('button.btn.btn--secundario.btn--pequeno', {
          type: 'button',
          style: 'align-self:flex-start;margin-top:var(--e-2)',
          onclick: function () { registro.notas = notas.value; alGuardar('Notas guardadas.'); }
        }, 'Guardar notas')
      ])
    ]);
  }

  function bloqueTrazabilidad(registro) {
    return el('div.tarjeta', null, [
      el('p.tarjeta__titulo', { texto: 'Trazabilidad' }),
      el('div.datos-lista', null, [
        dato('Fecha del diagnóstico', U.fechaCorta(registro.creado)),
        dato('Última actualización', U.fechaCorta(registro.actualizado)),
        dato('Versión del instrumento', registro.versionInstrumento),
        dato('Identificador', registro.id)
      ]),
      el('p.campo__ayuda', { style: 'margin-top:var(--e-3)',
        texto: 'La versión del instrumento permite comparar este diagnóstico con uno posterior aunque el formulario haya cambiado.' })
    ]);
  }

  function pintar(contenedor, registro, acciones) {
    U.vaciar(contenedor);

    contenedor.appendChild(el('div', { style: 'margin-bottom:var(--e-4)' }, [
      el('button.btn.btn--fantasma.btn--pequeno', { type: 'button', onclick: acciones.alVolver }, '← Volver al panel')
    ]));

    var principal = el('div.ficha__principal');
    var lateral = el('div.ficha__lateral');

    global.COMEEN.ui.resultado.pintar(principal, registro, []);

    lateral.appendChild(bloqueContacto(registro));
    lateral.appendChild(bloqueGestion(registro, acciones.alGuardar));
    lateral.appendChild(bloqueTrazabilidad(registro));
    /* Eliminar en dos pasos: el segundo clic confirma. Evita depender de los
       diálogos del navegador, que pueden estar bloqueados en la app publicada. */
    var zonaAcciones = el('div.acciones-fila');
    function pintarAcciones(confirmando) {
      U.vaciar(zonaAcciones);
      zonaAcciones.appendChild(el('button.btn.btn--secundario', {
        type: 'button', onclick: function () { acciones.alRepetir(registro); }
      }, 'Repetir el diagnóstico'));

      if (!confirmando) {
        zonaAcciones.appendChild(el('button.btn.btn--fantasma', {
          type: 'button', style: 'color:var(--critico)',
          onclick: function () { pintarAcciones(true); }
        }, 'Eliminar'));
      } else {
        zonaAcciones.appendChild(el('button.btn.btn--peligro', {
          type: 'button', onclick: function () { acciones.alEliminar(registro.id); }
        }, 'Sí, eliminar definitivamente'));
        zonaAcciones.appendChild(el('button.btn.btn--fantasma', {
          type: 'button', onclick: function () { pintarAcciones(false); }
        }, 'Cancelar'));
      }
    }
    pintarAcciones(false);
    lateral.appendChild(zonaAcciones);

    contenedor.appendChild(el('div.ficha', null, [principal, lateral]));
  }

  global.COMEEN.ui.ficha = { pintar: pintar };
})(typeof globalThis !== 'undefined' ? globalThis : this);
