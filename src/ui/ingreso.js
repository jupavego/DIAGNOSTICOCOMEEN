/* ============================================================================
   ui/ingreso.js — Ingreso del administrador
   ----------------------------------------------------------------------------
   Solo protege el panel. La encuesta no pasa por aquí: quien la diligencia
   nunca inicia sesión.

   No hay pantalla de registro, y es a propósito: en Supabase el registro
   público está desactivado y existe una sola cuenta. Así "administrador" no es
   un rol guardado en una tabla, sino el simple hecho de tener sesión.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = global.COMEEN.ui.util;
  var el = U.el;

  function pintar(contenedor, alEntrar) {
    U.vaciar(contenedor);

    var error = null;
    var enviando = false;

    function dibujar() {
      U.vaciar(contenedor);

      var correo = el('input.campo__control', {
        id: 'ingreso-correo', type: 'email', autocomplete: 'username',
        placeholder: 'correo@ejemplo.com', valor: recordado.correo || ''
      });
      var clave = el('input.campo__control', {
        id: 'ingreso-clave', type: 'password', autocomplete: 'current-password'
      });

      function entrar(ev) {
        if (ev) ev.preventDefault();
        if (enviando) return;
        if (!correo.value.trim() || !clave.value) {
          error = 'Escriba el correo y la contraseña.';
          dibujar();
          return;
        }
        enviando = true;
        error = null;
        dibujar();

        global.COMEEN.supabase.iniciarSesion(correo.value.trim(), clave.value)
          .then(function () {
            recordado.correo = correo.value.trim();
            try { global.localStorage.setItem('comeen.ultimoCorreo', recordado.correo); } catch (e) {}
            alEntrar();
          })
          .catch(function (e) {
            enviando = false;
            error = e.message || 'No se pudo ingresar.';
            dibujar();
          });
      }

      var formulario = el('form.grupo', { onsubmit: entrar }, [
        el('div.campo', null, [
          el('label.campo__etiqueta', { for: 'ingreso-correo', texto: 'Correo' }),
          correo
        ]),
        el('div.campo', null, [
          el('label.campo__etiqueta', { for: 'ingreso-clave', texto: 'Contraseña' }),
          clave
        ]),
        error ? el('p.aviso-validacion', { role: 'alert', texto: error }) : null,
        el('button.btn.btn--principal.btn--bloque', {
          type: 'submit', disabled: enviando
        }, enviando ? 'Entrando…' : 'Entrar al panel')
      ]);

      contenedor.appendChild(el('div.ingreso', null, [
        el('div.resultado__cabecera', null, [
          el('p.resultado__eyebrow', { texto: 'Panel COMEEN' }),
          el('h1.resultado__negocio', { texto: 'Ingreso' }),
          el('p.resultado__mensaje', {
            texto: 'Aquí se consultan los diagnósticos levantados. Para aplicar la encuesta no hace falta ingresar.'
          })
        ]),
        el('div.tarjeta', null, [formulario]),
        el('div.acciones-fila', null, [
          el('a.btn.btn--fantasma.btn--pequeno', { href: rutaEncuesta() }, '← Ir a la encuesta')
        ])
      ]));

      if (!enviando) setTimeout(function () { (correo.value ? clave : correo).focus(); }, 30);
    }

    var recordado = { correo: null };
    try { recordado.correo = global.localStorage.getItem('comeen.ultimoCorreo'); } catch (e) {}

    dibujar();
  }

  function rutaEncuesta() {
    var base = global.location.pathname.replace(/\/panel\/?$/, '/');
    return base || '/';
  }

  global.COMEEN.ui.ingreso = { pintar: pintar };
})(typeof globalThis !== 'undefined' ? globalThis : this);
