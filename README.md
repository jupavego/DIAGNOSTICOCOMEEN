# Sistema de Diagnóstico Digital COMEEN

Aplicación web para levantar, clasificar y gestionar el estado digital de los
negocios de comida del municipio.

El flujo completo es:

```
DATOS DEL NEGOCIO → DIAGNÓSTICO → PUNTAJE → NIVEL → BRECHAS
        → SERVICIOS RECOMENDADOS → PRIORIDADES → DISPOSICIÓN DE PAGO → FICHA
```

## Cómo abrirla

**En el computador, sin instalar nada:**

```bash
python -m http.server 8765 --directory form
```

Luego abrir `http://localhost:8765`.

Abrir `index.html` con doble clic también funciona, pero algunos navegadores
bloquean el guardado local desde `file://`. El servidor evita ese problema.

**Para verificar el algoritmo:**

```bash
node tests/run.js
```

```bash
node tests/run.js --detalle
```

**Para regenerar el archivo único publicable:**

```bash
node build.js
```

Genera `dist/comeen-diagnostico.html`, que contiene toda la aplicación en un
solo archivo.

## Dónde se guardan los datos

La capa de datos (`src/core/almacenamiento.js`) elige sola entre dos modos:

| Modo | Cuándo | Qué implica |
|---|---|---|
| **Compartido** | En la app publicada | Varias personas levantan negocios y todas ven la misma información en vivo |
| **Local** | Abriendo el archivo en el equipo | Los datos quedan en ese navegador; funciona sin conexión |

La aplicación indica en pantalla en cuál de los dos está trabajando. El avance
de un cuestionario a medias siempre se guarda en el dispositivo y se puede
retomar desde el panel.

## Estructura

```
form/
├── index.html                    versión de desarrollo (módulos separados)
├── build.js                      empaqueta todo en un archivo
├── dist/comeen-diagnostico.html  archivo único publicable
│
├── src/config/                   ← LO QUE SE EDITA PARA CAMBIAR EL INSTRUMENTO
│   ├── instrumento.js            preguntas, canales, brechas, categorías, pagos
│   ├── niveles.js                cortes de puntaje y reglas de coherencia
│   └── servicios.js              catálogo de servicios y sus reglas de activación
│
├── src/core/                     motor: no toca la interfaz
│   ├── reglas.js                 intérprete de condiciones declarativas
│   ├── puntuacion.js             suma las 12 variables → 0–24
│   ├── clasificacion.js          puntaje + coherencia → nivel
│   ├── recomendacion.js          brechas → servicios
│   ├── diagnostico.js            orquestador y modelo del registro
│   ├── almacenamiento.js         adaptadores de datos
│   └── exportacion.js            CSV y Excel
│
├── src/ui/                       interfaz: no calcula nada
│   ├── util.js  asistente.js  resultado.js  panel.js  ficha.js  app.js
│
├── src/styles/
│   ├── tokens.css                colores, tipografía, espaciado
│   └── app.css                   componentes
│
└── tests/
    ├── casos.js                  12 negocios ficticios con su resultado esperado
    └── run.js                    verificador
```

La regla que sostiene todo: **la lógica de negocio no vive dentro de ningún
componente visual.** Las vistas pintan lo que declara `src/config/`.

## Cómo se calcula el nivel

Doce variables (`M01`–`M12`), cada una de 0 a 2 puntos. Máximo **24**.

| Puntaje | Nivel |
|---|---|
| 0–9 | Nivel 1 · Construir |
| 10–17 | Nivel 2 · Fortalecer |
| 18–24 | Nivel 3 · Potenciar |

**Estos cortes son una hipótesis piloto, no una verdad.** Después de 30–50
negocios reales conviene mirar la distribución que muestra el panel y
recalibrarlos. Se cambian en `src/config/niveles.js`.

### Regla de coherencia

Un puntaje alto no basta. Para quedar en **Nivel 3** el negocio debe tener,
como mínimo: canal de contacto digital, alguna red social, información
comercial, fotografías, catálogo e interacción digital. Si falta alguno,
desciende al nivel inmediatamente inferior — y la ficha dice por qué.

Para quedar en **Nivel 2** debe tener al menos un canal digital en uso.

## Cómo se recomiendan los servicios

Cada servicio se activa por dos vías que se registran por separado:

- **diagnóstico** — el instrumento detecta que no lo tiene
- **percibida** — el comerciante lo pide en las preguntas `B01`–`B08`

Ese cruce es lo comercialmente útil:

| Origen | Lectura |
|---|---|
| **ambas** | Ya sabe que lo necesita → venta directa |
| **diagnóstico** | Hay brecha real que él no ve → hay que explicarla |
| **percibida** | La pide aunque el instrumento no la detectó → interés |

Códigos: `IDENT`, `FOTO`, `CAT`, `WAB`, `REDES`, `FB`, `IG`, `WEB`, `GEO`,
`COMEEN`, `PROMO`.

La ficha muestra los cuatro primeros como ruta de trabajo y pliega el resto:
una lista de once servicios no orienta a nadie.

## Qué NO afecta el nivel

Por diseño, y conviene que siga así:

- la matriz de estado de canales (duplicaría a `M06` y `M07`)
- las ocho preguntas de brecha
- las prioridades del comerciante
- la disposición de pago

## Exportación

Excel (`.xls`) y CSV (`;` con BOM, que es lo que Excel en español abre sin
asistente de importación). Una fila por negocio, con las 12 variables en crudo
para poder reanalizar por fuera.

## Cambios frecuentes

| Qué quiere cambiar | Dónde |
|---|---|
| Texto de una pregunta | `src/config/instrumento.js` |
| Categorías de negocio | `src/config/instrumento.js` → `BUSINESS_CATEGORIES` |
| Rangos de precio | `src/config/instrumento.js` → `PAYMENT_RANGES` |
| Cortes de nivel | `src/config/niveles.js` |
| Requisitos de coherencia | `src/config/niveles.js` → `requisitos` |
| Un servicio nuevo | `src/config/servicios.js` |
| Colores y tipografía | `src/styles/tokens.css` |

Al cambiar preguntas, subir `VERSION_INSTRUMENTO` en `instrumento.js`: queda
guardada en cada diagnóstico y permite comparar mediciones hechas con
formularios distintos.

## Verificación

`tests/casos.js` tiene doce negocios ficticios con el resultado que el diseño
del instrumento debe producir: los tres niveles, los bordes exactos de cada
corte (0, 9, 10, 18), dos casos que descienden por coherencia, y un negocio que
dice no necesitar nada para comprobar que los servicios se activan igual por
diagnóstico. `node tests/run.js` compara contra eso y falla si algo cambia.

## Diseño visual

Tomado del sistema de *Come en Girardota* (`directorio-girardota v2`):
violeta corporativo `#5e49d6`, naranja de marca `#ff6a14`, Poppins para títulos
y Manrope para texto. Tema claro comprometido: la aplicación se ve igual en
cualquier dispositivo, tenga o no modo oscuro el sistema.

## Lo que todavía no hace

Por decisión, hasta validar el modelo con negocios reales: sin pagos, sin
comercio electrónico, sin CRM avanzado, sin automatizaciones.

Lo que sí queda preparado: el registro guarda fecha y versión del instrumento,
y la ficha permite repetir el diagnóstico conservando los datos del negocio.
Esa es la base para medir evolución con un segundo levantamiento.
