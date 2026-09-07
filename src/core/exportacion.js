/* ============================================================================
   core/exportacion.js — Exportación a CSV y Excel
   ----------------------------------------------------------------------------
   Una fila por negocio. Las columnas se declaran una sola vez y sirven para
   ambos formatos, así el CSV y el Excel nunca se desincronizan.

   CSV: separador ';' y BOM UTF-8, que es lo que Excel en español abre bien
   sin pedir asistente de importación.
   ========================================================================== */
(function (global) {
  'use strict';

  function columnas() {
    var I = global.COMEEN.instrumento;
    var cols = [
      { titulo: 'ID',          valor: function (r) { return r.id; } },
      { titulo: 'NEGOCIO',     valor: function (r) { return r.negocio.nombre; } },
      { titulo: 'PROPIETARIO', valor: function (r) { return r.negocio.propietario; } },
      { titulo: 'CATEGORIA',   valor: function (r) { return global.COMEEN.diagnostico.textoCampo(r.negocio, 'categoria'); } },
      { titulo: 'CATEGORIA_LISTA', valor: function (r) { return r.negocio.categoria; } },
      { titulo: 'TELEFONO',    valor: function (r) { return r.negocio.telefono; } },
      { titulo: 'WHATSAPP',    valor: function (r) { return r.negocio.whatsapp; } },
      { titulo: 'MUNICIPIO',   valor: function (r) { return r.negocio.municipio; } },
      { titulo: 'BARRIO',      valor: function (r) { return r.negocio.barrio; } },
      { titulo: 'NIVEL',       valor: function (r, d) { return d.nivel.id; } },
      { titulo: 'NIVEL_NOMBRE', valor: function (r, d) { return d.nivel.nivel.nombre; } },
      { titulo: 'PUNTAJE',     valor: function (r, d) { return d.puntaje; } },
      { titulo: 'PORCENTAJE',  valor: function (r, d) { return d.porcentaje; } },
      { titulo: 'DESCENDIDO_POR_COHERENCIA', valor: function (r, d) { return d.nivel.descendido ? 'Sí' : 'No'; } }
    ];

    /* Las 12 variables de madurez, en crudo, para reanalizar en Excel. */
    I.QUESTIONS.forEach(function (q) {
      cols.push({ titulo: q.id + '_' + q.variable.toUpperCase().replace(/ /g, '_'),
                  valor: function (r) { var v = r.madurez[q.id]; return v === undefined ? '' : v; } });
    });

    /* Estado de cada canal. */
    I.CHANNELS.forEach(function (c) {
      cols.push({ titulo: 'CANAL_' + c.id.toUpperCase(),
                  valor: function (r) { var v = r.canales[c.id]; return v === undefined ? '' : v; } });
    });

    /* Brechas percibidas. */
    I.GAPS.forEach(function (g) {
      cols.push({ titulo: g.id + '_' + g.necesidad.toUpperCase().replace(/ /g, '_'),
                  valor: function (r) { return r.brechas[g.id] || ''; } });
    });

    cols.push(
      { titulo: 'SERVICIOS_RECOMENDADOS', valor: function (r, d) { return d.codigosServicio.join(' | '); } },
      { titulo: 'SERVICIOS_DIAGNOSTICADOS_Y_PEDIDOS', valor: function (r, d) { return d.cruce.ambas.join(' | '); } },
      { titulo: 'SERVICIOS_SOLO_DIAGNOSTICADOS',      valor: function (r, d) { return d.cruce.diagnostico.join(' | '); } },
      { titulo: 'SERVICIOS_SOLO_PEDIDOS',             valor: function (r, d) { return d.cruce.percibida.join(' | '); } },
      { titulo: 'PRIORIDAD_1', valor: function (r, d) { return d.prioridades[0] ? d.prioridades[0].texto : ''; } },
      { titulo: 'PRIORIDAD_2', valor: function (r, d) { return d.prioridades[1] ? d.prioridades[1].texto : ''; } },
      { titulo: 'PRIORIDAD_3', valor: function (r, d) { return d.prioridades[2] ? d.prioridades[2].texto : ''; } },
      { titulo: 'DISPOSICION_PAGO_CODIGO', valor: function (r) { return r.pago || ''; } },
      { titulo: 'DISPOSICION_PAGO',        valor: function (r, d) { return d.pago ? d.pago.texto : ''; } },
      { titulo: 'EN_DIRECTORIO_COMEEN',    valor: function (r) { return r.negocio.enComeen || ''; } },
      { titulo: 'ESTADO_ATENCION', valor: function (r) {
          var e = global.COMEEN.instrumento.ATTENTION_STATUSES.filter(function (x) { return x.id === r.estado; })[0];
          return e ? e.texto : r.estado; } },
      { titulo: 'NOTAS',   valor: function (r) { return r.notas || ''; } },
      { titulo: 'VERSION_INSTRUMENTO', valor: function (r) { return r.versionInstrumento || ''; } },
      { titulo: 'FECHA_DIAGNOSTICO',   valor: function (r) { return (r.creado || '').slice(0, 10); } },
      { titulo: 'ULTIMA_ACTUALIZACION', valor: function (r) { return (r.actualizado || '').slice(0, 10); } }
    );

    return cols;
  }

  function filas(registros) {
    var cols = columnas();
    return registros.map(function (r) {
      var d = global.COMEEN.diagnostico.evaluar(r);
      return cols.map(function (c) {
        var v = c.valor(r, d);
        return v === undefined || v === null ? '' : String(v);
      });
    });
  }

  function aCSV(registros) {
    var cols = columnas();
    var lineas = [cols.map(function (c) { return c.titulo; })];
    lineas = lineas.concat(filas(registros));
    var texto = lineas.map(function (fila) {
      return fila.map(function (celda) {
        var s = String(celda);
        /* Comilla siempre: hay direcciones y notas con ';' y saltos de línea. */
        return '"' + s.replace(/"/g, '""') + '"';
      }).join(';');
    }).join('\r\n');
    return '\ufeff' + texto; // BOM: Excel en español lo necesita para las tildes
  }

  function escapar(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* Excel abre esta tabla HTML como hoja de cálculo con formato y encabezado
     congelado. Evita depender de una librería externa. */
  function aExcel(registros) {
    var cols = columnas();
    var cabecera = cols.map(function (c) { return '<th>' + escapar(c.titulo) + '</th>'; }).join('');
    var cuerpo = filas(registros).map(function (fila) {
      return '<tr>' + fila.map(function (celda) {
        return '<td>' + escapar(celda) + '</td>';
      }).join('') + '</tr>';
    }).join('');

    return '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head>' +
      '<meta charset="utf-8">' +
      '<style>table{border-collapse:collapse;font-family:Calibri,sans-serif;font-size:11pt}' +
      'th{background:#5E49D6;color:#fff;font-weight:700;text-align:left;padding:6px 10px;border:1px solid #3D2BBF}' +
      'td{padding:5px 10px;border:1px solid #DDD4C8;mso-number-format:"\\@"}</style>' +
      '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>' +
      '<x:Name>Diagnosticos COMEEN</x:Name><x:WorksheetOptions><x:FreezePanes/>' +
      '<x:SplitHorizontal>1</x:SplitHorizontal><x:TopRowBottomPane>1</x:TopRowBottomPane>' +
      '<x:ActivePane>2</x:ActivePane></x:WorksheetOptions>' +
      '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->' +
      '</head><body><table><thead><tr>' + cabecera + '</tr></thead><tbody>' + cuerpo + '</tbody></table></body></html>';
  }

  function nombreArchivo(extension) {
    var f = new Date().toISOString().slice(0, 10);
    return 'diagnosticos-comeen-' + f + '.' + extension;
  }

  /* Entrega el archivo. En el artefacto publicado el navegador bloquea las
     descargas normales, así que se usa la capacidad 'downloads'; abriendo el
     archivo en el equipo se usa el enlace de siempre. */
  function descargar(contenido, nombre, tipoMime) {
    if (global.claude && typeof global.claude.use === 'function') {
      return global.claude.use('downloads').then(function (d) {
        if (d) return d.save({ filename: nombre, data: contenido }).then(function () { return 'capacidad'; });
        return descargarPorEnlace(contenido, nombre, tipoMime);
      }).catch(function () { return descargarPorEnlace(contenido, nombre, tipoMime); });
    }
    return Promise.resolve(descargarPorEnlace(contenido, nombre, tipoMime));
  }

  function descargarPorEnlace(contenido, nombre, tipoMime) {
    var blob = new Blob([contenido], { type: tipoMime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    return 'enlace';
  }

  global.COMEEN = global.COMEEN || {};
  global.COMEEN.exportacion = {
    columnas: columnas,
    aCSV: aCSV,
    aExcel: aExcel,
    nombreArchivo: nombreArchivo,
    descargar: descargar
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
