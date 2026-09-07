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

La capa de datos (`src/core/almacenamiento.js`) elige sola entre tres modos:

| Modo | Cuándo | Qué implica |
|---|---|---|
| **Supabase** | `src/config/supabase.js` tiene URL y llave | Producción. Sin sesión solo escribe; con sesión de administrador, lee y edita |
| **Compartido** | En el artefacto publicado | Uso interno: varias personas levantan negocios y ven lo mismo en vivo |
| **Local** | Sin lo anterior | Los datos quedan en ese navegador; funciona sin conexión |

La aplicación indica en pantalla en cuál está trabajando, y cuántos
diagnósticos quedaron esperando conexión. El avance de un cuestionario a
medias siempre se guarda en el dispositivo y se puede retomar.

## Puesta en producción

### Las dos entradas

```
diagnosticocomeen.vercel.app
│
├── /            Encuesta     sin ingreso   → solo puede INSERTAR
│                el comerciante, o usted en campo
│
├── /?f=campo    Encuesta     sin ingreso   → igual, pero marca origen = 'campo'
│
└── /panel       Panel        con ingreso   → leer, editar, exportar, borrar
                 solo usted
```

Quien contesta la encuesta no ve el panel ni sabe que existe: en la ruta
pública no hay ningún botón que lleve allá. Y lo que protege los datos no es
esconder ese botón, sino el RLS.

### No hay tabla de roles, y es a propósito

Con el registro público desactivado en Supabase y una sola cuenta creada,
`authenticated` **es** el administrador. No hace falta columna `rol`, ni tabla
de perfiles, ni lógica de permisos en la aplicación.

El precio de esa simplicidad: **si se reactiva el registro público, cualquiera
que se cree una cuenta queda como administrador.** Es el único punto donde el
modelo se puede romper.

### Pasos

**1. Supabase** — crear proyecto y ejecutar `supabase/001_diagnosticos.sql`
completo en el SQL Editor. Después, en el tablero:

- `Authentication → Providers → Email` → **desactivar "Enable sign-ups"**
- `Authentication → Users → Add user` → su correo y contraseña

**2. Conectar la aplicación** — pegar `Project URL` y la llave `anon public`
(`Project Settings → API`) en `src/config/supabase.js`.

La llave `anon` está pensada para vivir en el navegador: no es un secreto. Lo
que impide leer la base es que no existe política de `SELECT` para anónimos.
La llave `service_role` nunca va en este repositorio.

**3. Vercel** — importar el repositorio. No hay nada que compilar:
*Framework Preset* en `Other`, sin *build command*, *output directory* en la
raíz. El `vercel.json` ya trae las rutas y las cabeceras de seguridad.

Cada `git push` a `main` despliega.

### Mientras no haya base de datos

Con `src/config/supabase.js` vacío la aplicación funciona igual, guardando en
el dispositivo y con el panel abierto sin ingreso. Es el modo de desarrollo.

### Si se cae la señal en la calle

Un diagnóstico que no se pudo subir queda en una cola en el dispositivo y se
reintenta solo cuando vuelve la conexión. La aplicación avisa cuántos hay
esperando. Al encuestador nunca se le dice que perdió su trabajo.

## Estructura

```
form/
├── index.html                    versión de desarrollo (módulos separados)
├── build.js                      empaqueta todo en un archivo
├── dist/comeen-diagnostico.html  archivo único publicable
│
├── vercel.json                   rutas y cabeceras de seguridad
├── supabase/001_diagnosticos.sql esquema, índices y políticas RLS
│
├── src/config/                   ← LO QUE SE EDITA PARA CAMBIAR EL INSTRUMENTO
│   ├── instrumento.js            preguntas, canales, brechas, categorías, pagos
│   ├── niveles.js                cortes de puntaje y reglas de coherencia
│   ├── servicios.js              catálogo de servicios y sus reglas de activación
│   └── supabase.js               URL y llave pública del proyecto
│
├── src/core/                     motor: no toca la interfaz
│   ├── reglas.js                 intérprete de condiciones declarativas
│   ├── puntuacion.js             suma las 12 variables → 0–24
│   ├── clasificacion.js          puntaje + coherencia → nivel
│   ├── recomendacion.js          brechas → servicios
│   ├── diagnostico.js            orquestador y modelo del registro
│   ├── supabase.js               cliente REST y sesión, sin dependencias
│   ├── almacenamiento.js         adaptadores de datos y cola de pendientes
│   └── exportacion.js            CSV y Excel
│
├── src/ui/                       interfaz: no calcula nada
│   ├── util.js  asistente.js  resultado.js  panel.js  ficha.js
│   ├── ingreso.js                ingreso del administrador
│   └── app.js                    armazón, ruteo y navegación
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
| Proyecto de Supabase | `src/config/supabase.js` |

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
