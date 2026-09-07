/* ============================================================================
   build.js — Empaqueta la aplicación en un solo archivo publicable
   Uso:  node build.js
   Salida: dist/comeen-diagnostico.html

   El archivo resultante es el que se publica como página web compartible.
   No hay transpilación ni minificación: el código publicado es el mismo que
   se lee en src/, para que cualquiera pueda seguirlo.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const raiz = __dirname;
const leer = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');

const CSS = ['src/styles/tokens.css', 'src/styles/app.css'];

const JS = [
  'src/config/instrumento.js',
  'src/config/niveles.js',
  'src/config/servicios.js',
  'src/config/conexion.js',
  'src/core/reglas.js',
  'src/core/puntuacion.js',
  'src/core/clasificacion.js',
  'src/core/recomendacion.js',
  'src/core/diagnostico.js',
  'src/core/api-supabase.js',
  'src/core/almacenamiento.js',
  'src/core/exportacion.js',
  'tests/casos.js',
  'src/ui/util.js',
  'src/ui/fondo.js',
  'src/ui/asistente.js',
  'src/ui/resultado.js',
  'src/ui/panel.js',
  'src/ui/ficha.js',
  'src/ui/ingreso.js',
  'src/ui/app.js'
];

const estilos = CSS.map(f => `/* ===== ${f} ===== */\n${leer(f)}`).join('\n\n');
const guiones = JS.map(f => `/* ===== ${f} ===== */\n${leer(f)}`).join('\n\n');

const salida = `<title>Diagnóstico Digital COMEEN</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&display=swap');

${estilos}
</style>

<div id="app"></div>

<script>
${guiones}

COMEEN.ui.app.iniciar(document.getElementById('app'));
</script>
`;

const destino = path.join(raiz, 'dist', 'comeen-diagnostico.html');
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, salida, 'utf8');

const kb = (Buffer.byteLength(salida, 'utf8') / 1024).toFixed(1);
console.log(`dist/comeen-diagnostico.html · ${kb} KB · ${CSS.length} hojas de estilo + ${JS.length} módulos`);
