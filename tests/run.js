/* ============================================================================
   tests/run.js — Verificación del algoritmo contra los casos ficticios
   Uso:  node tests/run.js          (desde la carpeta form/)
        node tests/run.js --detalle (imprime la ficha completa de cada caso)
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const archivos = [
  'src/config/instrumento.js',
  'src/config/niveles.js',
  'src/config/servicios.js',
  'src/core/reglas.js',
  'src/core/puntuacion.js',
  'src/core/clasificacion.js',
  'src/core/recomendacion.js',
  'src/core/diagnostico.js',
  'tests/casos.js'
];
archivos.forEach(f => {
  // eslint-disable-next-line no-eval
  (0, eval)(fs.readFileSync(path.join(raiz, f), 'utf8'));
});

const C = globalThis.COMEEN;
const detalle = process.argv.includes('--detalle');

const VERDE = '\x1b[32m', ROJO = '\x1b[31m', GRIS = '\x1b[90m', NEGRITA = '\x1b[1m', FIN = '\x1b[0m';
let fallos = 0;
const distribucion = { 1: 0, 2: 0, 3: 0 };

console.log(`\n${NEGRITA}Verificación del algoritmo de diagnóstico COMEEN${FIN}`);
console.log(`${GRIS}${C.casos.length} casos ficticios · instrumento v${C.instrumento.VERSION_INSTRUMENTO}${FIN}\n`);

C.casos.forEach((caso, i) => {
  const registro = C.diagnostico.nuevoRegistro();
  Object.assign(registro.negocio, caso.negocio);
  registro.madurez = caso.madurez;
  registro.canales = caso.canales;
  registro.brechas = caso.brechas;
  registro.prioridades = caso.prioridades;
  registro.pago = caso.pago;

  const d = C.diagnostico.evaluar(registro);
  distribucion[d.nivel.id]++;

  const errores = [];
  const e = caso.espera || {};

  if (e.puntaje !== undefined && d.puntaje !== e.puntaje) {
    errores.push(`puntaje ${d.puntaje}, se esperaba ${e.puntaje}`);
  }
  if (e.nivel !== undefined && d.nivel.id !== e.nivel) {
    errores.push(`nivel ${d.nivel.id}, se esperaba ${e.nivel}`);
  }
  if (e.descendido !== undefined && d.nivel.descendido !== e.descendido) {
    errores.push(`descendido=${d.nivel.descendido}, se esperaba ${e.descendido}`);
  }
  if (e.incluyeServicios) {
    const faltan = e.incluyeServicios.filter(s => d.codigosServicio.indexOf(s) < 0);
    if (faltan.length) errores.push(`servicios no activados: ${faltan.join(', ')}`);
  }
  if (e.excluyeServicios) {
    const sobran = e.excluyeServicios.filter(s => d.codigosServicio.indexOf(s) >= 0);
    if (sobran.length) errores.push(`servicios activados que no debían: ${sobran.join(', ')}`);
  }
  if (e.soloDiagnostico && d.cruce.percibida.length + d.cruce.ambas.length > 0) {
    errores.push(`se esperaba activación solo por diagnóstico, hubo percibidas: ${d.cruce.percibida.concat(d.cruce.ambas).join(', ')}`);
  }
  // Coherencia estructural: ningún Nivel 3 puede incumplir sus requisitos.
  if (d.nivel.id === 3 && d.nivel.requisitos.some(r => !r.cumple)) {
    errores.push('Nivel 3 con requisitos de coherencia incumplidos');
  }
  if (d.puntaje < 0 || d.puntaje > d.maximo) errores.push('puntaje fuera de rango');

  const ok = errores.length === 0;
  if (!ok) fallos++;

  const marca = ok ? `${VERDE}PASA${FIN}` : `${ROJO}FALLA${FIN}`;
  const niv = ['', '🔴 N1 Construir', '🟡 N2 Fortalecer', '🟢 N3 Potenciar'][d.nivel.id];
  console.log(`${marca}  ${String(i + 1).padStart(2)}. ${caso.titulo}`);
  console.log(`      ${d.puntaje}/${d.maximo} (${d.porcentaje}%) · ${niv}${d.nivel.descendido ? `  ${GRIS}↓ desde ${d.nivel.nivelPorPuntaje}${FIN}` : ''}`);
  console.log(`      ${GRIS}Servicios: ${d.codigosServicio.join(' · ') || '—'}${FIN}`);
  if (d.nivel.descendido) {
    d.nivel.descensos.forEach(x => console.log(`      ${GRIS}Falta para ${x.desde}: ${x.faltantes.join(', ')}${FIN}`));
  }
  errores.forEach(x => console.log(`      ${ROJO}→ ${x}${FIN}`));

  if (detalle) {
    console.log(`      ${GRIS}Fortalezas:    ${d.fortalezas.map(f => f.texto).join(', ') || '—'}${FIN}`);
    console.log(`      ${GRIS}Oportunidades: ${d.oportunidades.map(o => o.texto).join(', ') || '—'}${FIN}`);
    console.log(`      ${GRIS}Cruce → ambas: [${d.cruce.ambas}] · solo diagnóstico: [${d.cruce.diagnostico}] · solo percibida: [${d.cruce.percibida}]${FIN}`);
    console.log(`      ${GRIS}Prioridades:   ${d.prioridades.map(p => `${p.posicion}. ${p.texto}`).join(' · ') || '—'}${FIN}`);
    console.log(`      ${GRIS}Disposición:   ${d.pago ? d.pago.texto : '—'}${FIN}`);
  }
  console.log('');
});

console.log(`${NEGRITA}Distribución obtenida${FIN}`);
console.log(`  🔴 Nivel 1 Construir  ${distribucion[1]}`);
console.log(`  🟡 Nivel 2 Fortalecer ${distribucion[2]}`);
console.log(`  🟢 Nivel 3 Potenciar  ${distribucion[3]}\n`);

if (fallos === 0) {
  console.log(`${VERDE}${NEGRITA}Los ${C.casos.length} casos se comportan como espera el diseño del instrumento.${FIN}\n`);
} else {
  console.log(`${ROJO}${NEGRITA}${fallos} caso(s) no coinciden con lo esperado.${FIN}\n`);
}
process.exit(fallos === 0 ? 0 : 1);
