# Form Filler — Guía del proyecto

Documento de referencia para humanos y agentes de IA. **Leer antes de modificar código.**

## Propósito

Extensión Chrome (Manifest V3) que:

1. Recibe bloques de texto pegados por el operador (datos de línea, CURP, dirección, CAC, chat, etc.).
2. Los parsea y valida según el **tipo de producto** seleccionado.
3. Muestra un **resultado formateado** listo para copiar.
4. **Autocompleta** un Google Form (`docs.google.com/forms/*`) en 3 páginas mediante los content scripts de `content/`.

La UI vive en el **panel lateral** (`side_panel` → `popup.html`). No hay popup clásico ni botón flotante en la página.

---

## Arquitectura de archivos

| Archivo | Rol |
|---------|-----|
| `manifest.json` | MV3: permisos, side panel, service worker, orden de los content scripts |
| `background.js` | Abre el side panel al clic en el icono de la extensión |
| `popup.html` | UI: estilos inline, inputs, checkboxes, botones, resultado |
| `popup.js` | Lógica UI, plantillas, validación, inyección al form |
| `parser.js` | Parseo heurístico de textareas → objeto `parsed` |
| `content/constants.js` | `SELECTORS` del DOM de Google Forms |
| `content/utils.js` | Helpers puros: normalización de texto, matching de opciones |
| `content/helpers.js` | Helpers DOM: `setInput`, `findInputByLabel`, `selectDropdownOption`, `fillCheckboxes` |
| `content/fillPage1.js` | Relleno de la página 1 (incluye las etiquetas de contacto) |
| `content/fillPage2.js` | Relleno de la página 2 (forma de envío) |
| `content/fillPage3.js` | Relleno de la página 3 (plan elegido, género, EID…) |
| `content/index.js` | Expone `window.FormFiller` |

```
Usuario pega datos → popup.js (processData)
                         ↓
                   parser.js (parseData)
                         ↓
              PRODUCT_TEMPLATES → lastResult → botón Copiar
                         ↓
         btn1/btn2/btn3 → chrome.scripting → content/fillPageN.js
```

Los content scripts se cargan solos vía `content_scripts` del manifest (en orden):
`constants` → `utils` → `helpers` → `fillPage1` → `fillPage2` → `fillPage3` → `index`.
Al agregar un archivo nuevo, agregarlo también al manifest.

---

## Permisos (`manifest.json`)

| Permiso | Uso |
|---------|-----|
| `activeTab` | Pestaña activa para inyectar script |
| `scripting` | `executeScript` con `content.js` |
| `sidePanel` | Panel lateral con `popup.html` |
| `clipboardRead` | Botones ⎘ pegar desde portapapeles |
| `host_permissions` | Solo `https://docs.google.com/forms/*` |

Tras añadir permisos, el usuario debe **recargar la extensión** en `chrome://extensions`.

---

## Tipos de producto

Claves internas (`data-product` / `activeProduct`):

| Clave | Etiqueta UI | ESIM | CAC | Plan requerido |
|-------|-------------|------|-----|----------------|
| `POS_ESIM` | POS ESIM | ✓ | — | ✓ |
| `POS_CAC` | POS CAC | ✓ | ✓ | ✓ |
| `LN_ESIM` | LN ESIM | ✓ | — | ✓ |
| `LN_CAC` | LN CAC | — | ✓ | ✓ |
| `PRE_ESIM` | PRE ESIM | ✓ | — | — |
| `PREPAGO` | PREPAGO | — | ✓ | — |
| `ADIC_CAC` | ADIC CAC | — | ✓ | ✓ |

### Mapeo producto → Google Form (`getCleanProductName`)

Usado en `content.js` para seleccionar el radio **Producto**:

| Clave | `data.producto` |
|-------|-----------------|
| `POS_ESIM` | `PORTABILIDAD POSPAGO E-SIM` |
| `POS_CAC` | `PORTABILIDAD POSPAGO` |
| `LN_ESIM` | `LÍNEA NUEVA E-SIM` |
| `LN_CAC` | `LÍNEA NUEVA` |
| `PRE_ESIM` | `LÍNEA NUEVA PREPAGO` |
| `PREPAGO` | `PORTABILIDAD PREPAGO` |
| `ADIC_CAC` | `ADICIÓN` |

**No cambiar estos strings** sin verificar que coinciden con los `data-value` del formulario real.

---

## Inputs de la UI

Convención de IDs: `input-{field}` y `group-{field}`.

| Campo | ID input | Tipo | Contenido esperado |
|-------|----------|------|-------------------|
| Plan | `input-plan` | text | Nombre o código corto del plan (campo dedicado, no va en línea) |
| Línea | `input-linea` | textarea | DN, NIP, correo (heurístico por línea) |
| CURP | `input-curp` | textarea | Nombre, apellidos, CURP, sexo, fecha, estado |
| Dirección | `input-direccion` | textarea | Calle, CP, colonia, números |
| CAC | `input-cac` | textarea | Línea 1: CAC, 2: CP, 3: FVC |
| Chat ID | `input-chat-id` | text | ID del chat / lead |
| Chat DN | `input-chat-dn` | text | DN Respond (`+52…`) |
| EID | `input-eid` | text | 5 dígitos (solo productos ESIM) |
| Etiquetas | `input-etiqueta-*` | checkbox | Reapertura / Prospección IA (visibles en **todos** los productos) |

### Etiquetas del contacto

Hay **dos fuentes** de etiquetas, ambas en `popup.js` y ambas disponibles para
**todos** los productos:

| Fuente | Constante | UI | Cache |
|--------|-----------|-----|-------|
| Checkboxes frecuentes | `CONTACT_TAGS` | `input-etiqueta-*` (checkbox) | `input_cache_{id}` = `'1'`/`'0'` |
| Dropdown (una sola) | `CONTACT_TAG_OPTIONS` | `select-etiqueta` | `input_cache_etiqueta_extra` (label) |

`FORM_TAGS` es el **catálogo completo** de etiquetas que expone el form (88
entradas, snapshot del form real): sirve de referencia para saber qué existe y
para agregar opciones nuevas al dropdown. `CONTACT_TAG_OPTIONS` (38 entradas) es
el subconjunto que el operador elige desde el dropdown.

Los checkboxes **no** son campos de texto: viven en `CONTACT_TAGS`, fuera de
`ALL_INPUT_FIELDS` (que asume `input-{field}.value`). Su grupo nunca se oculta
y no son obligatorios.

**Cómo funcionan:**

- El dropdown es un `<select>` con un placeholder (`"Sin etiqueta adicional"`) y
  las opciones de `CONTACT_TAG_OPTIONS`. Elige **una sola** etiqueta: no hay
  botón de agregar ni chips, el `value` del select ES el estado.
- El placeholder (valor vacío) significa "ninguna etiqueta adicional".
- `getSelectedTags()` combina los checkboxes con la etiqueta del dropdown
  usando `mergeTagLabels()`, que deduplica **insensible a acentos y mayúsculas**
  (`normalizeTagLabel`) pero conserva el texto canónico de la primera aparición.
- **Limpiar** vacía los checkboxes, resetea el dropdown y borra el cache.

**Reapertura ≠ variantes.** "Reapertura" a secas es una etiqueta distinta de
`Reapertura_Caido`, `Reapertura_Nip`, `Reapertura_Prospecto`, etc. La que se usa
siempre es la simple — por eso está en `CONTACT_TAGS` y no en el dropdown.

### La etiqueta del dropdown va a OTRO campo del form

La etiqueta elegida en el dropdown del panel viaja **aparte** de las casillas:

| Dato | Campo | Destino en el form |
|------|-------|--------------------|
| `parsed.etiquetas` (array) | Checkboxes "Etiquetas del contacto" | `fillCheckboxes` |
| `parsed.etiquetaDropdown` (string) | Dropdown "¿Línea telefónica a la que se comunica?" (Pág 1) | `selectDropdownByHeading` |

**Son catálogos DISTINTOS.** El dropdown del form tiene 63 opciones; las casillas
tienen 88. Las que están en el dropdown y NO en las casillas:
`Convertia Google eSIM` y `reapertura_IA_VOZ`. Las 38 opciones del panel están
en **ambos** (verificado).

Por eso `etiquetaDropdown` NO se mete en `parsed.etiquetas`: son dos campos
diferentes del form y cada uno lleva lo suyo.

El dropdown del form exige **coincidencia exacta** (`minScore = 95`): sin eso
"Reapertura" haría match con "Reaperturas META" (prefijo, score 70) y se
marcaría la etiqueta vecina. Las 38 opciones del panel matchean exacto (100).

El texto canónico conserva la tilde (`Prospección IA`) y el matching con el form es
**insensible a acentos y mayúsculas** (`normalizeLabel` en `content/utils.js`), así que el
match sigue funcionando si el form escribe "Prospeccion IA".

### Visibilidad por producto (`PRODUCT_FIELDS` en `popup.js`)

Actualizar **las tres** tablas al añadir un producto o campo:

- `PRODUCT_FIELDS` — qué grupos mostrar
- `PRODUCT_REQUIRED_FIELDS` — qué campos parseados son obligatorios
- `PRODUCT_TEMPLATES` — texto del resultado formateado

```javascript
// popup.js — fuente de verdad para visibilidad
PRODUCT_FIELDS = {
  POS_ESIM:  ['plan', 'linea', 'curp', 'direccion', 'chat-id', 'chat-dn', 'eid'],
  POS_CAC:   ['plan', 'linea', 'curp', 'direccion', 'cac', 'chat-id', 'chat-dn'],
  LN_ESIM:   ['plan', 'linea', 'curp', 'direccion', 'chat-id', 'chat-dn', 'eid'],
  LN_CAC:    ['plan', 'linea', 'curp', 'direccion', 'cac', 'chat-id', 'chat-dn'],
  PRE_ESIM:  ['linea', 'curp', 'chat-id', 'chat-dn', 'eid'],
  PREPAGO:   ['linea', 'curp', 'cac', 'chat-id', 'chat-dn'],
  ADIC_CAC:  ['plan', 'linea', 'cac', 'chat-id', 'chat-dn'],
}
```

`ALL_INPUT_FIELDS` debe listar **todos** los campos posibles (usado en clear, cache, listeners).

Campos dedicados pasados al parser vía `getFieldOverrides()`:

```javascript
{ plan, chatId, dnChat, eid, etiquetas }
// desde input-plan, input-chat-id, input-chat-dn, input-eid y los checkboxes marcados
```

`getFieldOverrides()` es la **fuente única**: la usan `processData` y `getAccumulatedData`,
así el form nunca recibe datos distintos de los que muestra el panel.

---

## Flujo de parseo (`parser.js`)

### Entrada principal

```javascript
parseData(raw, productKey, lineaRawText, cacRawText, direccionRawText, fieldOverrides)
```

- `raw`: texto concatenado de campos visibles (para regex `ETIQUETA: valor`).
- `lineaRawText`, `cacRawText`, `direccionRawText`: textareas específicos.
- `fieldOverrides`: `{ plan, chatId, dnChat, eid, etiquetas }` — **prioridad sobre heurística**.

### Plan: normalización (`normalizePlan`)

El dropdown **Plan elegido** del form ofrece exactamente:

`Prepago`, `PLAN PRO 11`, `PLAN PRO 13 ILIMITADO`, `PLAN PRO 16`, `PLAN PRO 20`,
`PLAN PRO 30`, `PLAN PRO ILIMITADO`, `PLAN 10`.

`PLAN_OPTIONS` (lista real del form) y `PLAN_ALIASES` (código corto → plan canónico) son la
fuente de verdad en `parser.js`:

| El operador escribe | Se resuelve a |
|---------------------|---------------|
| `30`, `20`, `16`, `11`, `10` | `PLAN PRO 30`, `PLAN PRO 20`, `PLAN PRO 16`, `PLAN PRO 11`, `PLAN 10` |
| `13` | `PLAN PRO 13 ILIMITADO` |
| `ilimitado` | `PLAN PRO ILIMITADO` |
| `pro 30`, `PRO 30`, `plan pro 30` | `PLAN PRO 30` |
| `pro 13 ilimitado` | `PLAN PRO 13 ILIMITADO` |
| texto libre (`Plan Anual`) | sin cambios |

El plan ya normalizado viaja al **resultado formateado** y al dropdown del form.
El panel muestra la resolución en vivo bajo el input (`30 → PLAN PRO 30`).
Si cambia la lista de opciones del form, actualizar `PLAN_OPTIONS` y `PLAN_ALIASES`.

### Reglas heurísticas

**`parseLineaField`** — por línea, sin etiquetas:

| Patrón | Asignación |
|--------|------------|
| Contiene `@` | email |
| 4 dígitos exactos | NIP |
| 8–15 dígitos | teléfono (orden según producto) |
| Texto restante | `nombreTitular` (solo `ADIC_CAC`) |

Teléfonos por producto:

| Productos | phones[0] | phones[1] |
|-----------|-----------|-----------|
| POS_ESIM, POS_CAC, PREPAGO | dnPortar | dnAdicional |
| LN_ESIM, LN_CAC, PRE_ESIM | dnContacto | — |
| ADIC_CAC | dnMovistar | dnContacto |

**LN (LN_ESIM, LN_CAC, PRE_ESIM) — regla de fallback en `parseData`:** el operador puede pegar un DN de contacto en `input-linea` y ese dato **no se overridea nunca**. Si no hay DN en el textarea de línea, `dnContacto` cae al `dnChat` (DN por el cual el cliente se comunica — DN Respond). Cadena de fallback:

1. `lineaData.dnContacto` (primer phone en `input-linea`) si existe.
2. `cleanPhone(dnChat)` si no hay phone en línea.
3. `cleanPhone(get('DN CONTACTO'))` (regex sobre el texto crudo) como último recurso.

Misma regla aplica a `data.dn` (que se usa en `fillPage1` para el campo "DN de contacto" del Google Form).

**`parseCacField`**: línea 1 = CAC, 2 = CP, 3 = FVC (año actual vía `new Date().getFullYear()` si solo dd/mm — el reloj del sistema se usa en parseo; los tests congelan el reloj con `vi.setSystemTime`).

**`parseDireccionField`**: 1–4+ líneas con reglas de calle/colonia/CP/números.

**Teléfonos**: `cleanPhone()` quita no-dígitos y prefijo `52` si length > 10.

**DN chat**: `formatDnChat()` normaliza a `+52` + 10 dígitos.

**EID**: exactamente 5 dígitos; `eidValid` boolean; obligatorio solo si `esEsim` (`POS_ESIM`, `LN_ESIM`, `PRE_ESIM`).

### Salida (`parsed`)

Campos clave usados downstream:

`nombres`, `apellido1`, `apellido2`, `nombreCompleto`, `email`, `plan`, `planRaw`, `planShort`, `nip`, `dnPortar`, `dnAdicional`, `dnContacto`, `dnMovistar`, `dn` (= dnContacto), `curp`, `fecha`, `genero`, `lugarNacimiento`, `calle`, `numExt`, `numInt`, `cpDireccion`, `colonia`, `nombreCAV`, `cpCAC`, `fvc`, `chatId`, `dnChat`, `eid`, `eidValid`, `nombreTitular`, `esEsim`, `esCAC`, `etiquetas`, `producto` (añadido en popup.js).

- `plan` → plan ya normalizado y **completo** (`PLAN PRO 20`): es lo que recibe el dropdown del form.
- `planShort` → la forma **corta** (`PRO 20`): es lo que se muestra en "PLAN:" del resultado formateado.
- `planRaw` → lo que escribió el operador (se usa para el preview `30 → PLAN PRO 30`).
- `etiquetas` → array con las etiquetas de contacto marcadas.

---

## Validación (`popup.js`)

Tres capas independientes:

1. **`validatePhones`** — alertas inline si DN ≠ 10 dígitos o portar === adicional.
2. **`validateChat`** — alertas si chat parcial o EID inválido en ESIM.
3. **`validateRequiredData`** — bloquea botones Pág 1/2/3; muestra badge «Faltan datos».

Reglas especiales:

- `eid` solo se exige si `d.esEsim`.
- `dnSame` si `dnPortar === dnAdicional` en productos de portabilidad.
- `dnAdicional` es **opcional** en porta (POS_ESIM, POS_CAC, PREPAGO): si falta, la plantilla renderiza `DN ADICIONAL: SN` y los botones Pág 1/2/3 quedan habilitados (no bloquea avance). El chequeo `dnSame` se preserva gateado por `required.includes('dnPortar')` para que el duplicado silenciosamente no deje de chequearse al sacar `dnAdicional` del required.

---

## Resultado formateado

`PRODUCT_TEMPLATES[activeProduct](parsed)` genera el texto del resultado.

**El panel NO lo muestra**: no hay título "Resultado Formateado" ni textarea. El texto
queda en la variable `lastResult` (`popup.js`) y el botón verde **Copiar** lo manda al
portapapeles con `copyText()` (textarea temporal + `execCommand('copy')`).

Para verlo, hay que copiarlo. Al agregar campos a las plantillas, verificar que el texto
siga siendo lo que el operador espera pegar en el sistema de destino.

---

## Autocompletado Google Form (`content/`)

Los content scripts se inyectan solos vía `content_scripts` del manifest (no hace falta
`executeScript` para cargarlos). API global:

```javascript
window.FormFiller.fillPage1(data)
window.FormFiller.fillPage2(data)
window.FormFiller.fillPage3(data)
```

Cada `fillPageN` devuelve `{ ok, filled, failed[] }`: `failed` lista los campos que **no**
se pudieron rellenar, y el panel los muestra ("⚠ 8 campos rellenados. No se pudo: Plan elegido").
Antes se contaba un intento como un acierto y el panel podía dar un ✅ falso.

### Página 1

- Dropdown **Nombre** → fijo `"Bruno"`.
- Radio **Producto** → `data.producto`.
- Inputs: nombre cliente, fecha nacimiento, CURP (no línea nueva), DN contacto, email, id lead, dn chat.
- Checkboxes **Etiquetas del contacto** → las marcadas en `data.etiquetas`.
- Dropdown **¿Línea telefónica a la que se comunica?** → `data.etiquetaDropdown`
  (la del dropdown del panel). Coincidencia **exacta** (`minScore = 95`): sin
  ese umbral "Reapertura" matchearía "Reaperturas META". El heading del form
  termina en `&nbsp;` — `normalizeLabel` lo colapsa.

### Página 2

- Radio **Forma de envío**: CAC / ESIM pospago / ESIM línea nueva según `data.esEsim` y tipo.
- CAC: nombre CAV, CP.

### Página 3

- DN portar (o `"En espera"` en línea nueva), NIP, número orden, lugar nacimiento, género, ESIM sí/no, línea nueva, equipo EID, FVC (CAC), plan elegido, últimos 5 dígitos EID.
- Dropdown **Usuario Backend** → siempre `"CHT00096"` (fijo, como el nombre "Bruno").

### Helpers DOM (`content/helpers.js`)

- `setInput` — setter nativo + eventos `input`/`change`/`blur`.
- `findInputByLabel` — busca por texto en `.M7eMe`.
- `selectDropdownOption` — abre el listbox, matchea por `data-value` → texto exacto →
  número de plan, hace **click directo** en la opción y **verifica** que quedó
  seleccionada. Devuelve `{ ok, label, error }`.
- `fillCheckboxes` — marca los checkboxes de una sección (ej. "Etiquetas del contacto")
  verificando `aria-checked`. Lo que el operador no marcó se deja como esté.
  Busca en **todos** los bloques de la sección (`findQuestionBlocks`), no sólo
  en el primero: con 88 casillas el form las reparte en varios bloques del DOM
  y buscar uno solo dejaba tags sin marcar. `collectCheckboxes` deduplica los
  elementos repetidos (el selector de bloques matchea la misma pregunta dos
  veces: contenedor `CP1oW` + hijo `geS5n`).
- `findQuestionBlock`, `findQuestionBlocks`, `collectCheckboxes`, `toggleCheckbox` — supporting de los anteriores.
- `selectDropdownByHeading(heading, valor, minScore)` — `minScore > 0` exige
  coincidencia **exacta** (data-value o texto). Sin él, el matching laxo
  (prefijo = 70, contiene = 50) puede marcar la opción vecina: en el catálogo
  de etiquetas "Reapertura" haría match con "Reaperturas META". El dropdown de
  etiquetas de la Pág 1 usa `minScore = 95`; el de planes usa `0` (porque
  resuelve códigos cortos como "30" → "PLAN PRO 30").

### Esperas: MICROTASK primero, nunca fija

**Regla del proyecto: NUNCA `sleep(ms)` para esperar un cambio de estado del
DOM.** Se usa `waitFor(predicado, timeout)`, que espera en **dos fases**:

1. **Microtask** (primero, y es lo habitual). Google Forms corre sobre Angular:
   tras el click, el change detection se dispara al **vaciar el microtask
   queue**. Un yield de microtask alcanza para que el DOM ya esté actualizado.
2. **Macrotask** (respaldo). Si el cambio no llegó por microtask (un rAF o un
   timer dentro del form), se cede al event loop. El primer fallback usa **0 ms**
   (el cambio se aplica al final de la tarea en curso) y después se separa:
   `[0, 0, 1, 2, 4, 8]` y luego 16 ms.

**Por qué el orden importa.** Un microtask **no deja pintar al navegador**; un
macrotask sí. Medido en el navegador (simulando el change detection de Angular):

| Estrategia | Tiempo | Pinturas |
|------------|--------|----------|
| `setTimeout(16)` (macrotask) | 34 ms | **4** → el menú se ve parpadear |
| Yield de microtask | **0 ms** | **0** → el menú nunca se ve |

O sea: con microtask primero, el relleno no sólo es rápido — **el menú abierto
no llega a pintarse nunca**. El operador sólo ve el dropdown ya con el valor.

**No cerrar el popup con Escape.** Tras seleccionar, NO se llama
`closeListbox`: Google Forms cierra el popup solo en su propio ciclo, y Escape
podría **deseleccionar** lo recién elegido. `closeListbox` queda sólo para la
ruta de fallo (donde no hay selección que perder).

**La detección de "ya está abierto" va ACOTADA a la opción buscada.** La Pág 1
tiene varios dropdowns ("Nombre" con 25 opciones, "Producto" con 64) y al abrir
uno sus opciones se van a un popup en el body. Si la detección mirara
*CUALQUIER* opción fuera del trigger, el dropdown siguiente creería que ya
está abierto sin haberlo abierto: el click caería sobre la opción recortada
(que no recibe el click) y no se seleccionaría nada. Por eso
`hasPopupOption(trigger, valor)` busca sólo la opción con ese `data-value`.

Reglas:

- El `timeout` de `waitFor` es el **peor caso**, no el caso normal. No se
  agranda "por las dudas": un timeout holgado hace que un fallo tarde más en
  detectarse.
- Después de un click, la verificación mira **todas** las opciones con ese
  `data-value` (`isSelectedAnywhere`): el marcador puede quedar en la copia
  del popup o en el original del trigger.


### DOM real de los dropdowns de Google Forms

Verificado contra el form real (experimento del botón de prueba). **Ojo: el click
sintético NO es un click de usuario y hay que respectar esta mecánica:**

- El trigger es `div[role="listbox"]` (`jsname="W85ice"`) y las opciones cuelgan de
  él: `div[role="option"][data-value="…"]`.
- **El click va al div interno** (`div[jsname="LgbsSe"]`), no al listbox. Google Forms
  delega los handlers por `jsname`: el handler del listbox espera `LgbsSe`, así que
  clickear el `div[role=listbox]` no dispara nada.
- **Para abrir van `mousedown` + `mouseup`, y NADA de `click`**: el `mouseup` abre el
  menú y el `click` lo vuelve a cerrar (por eso se veía abrir dos veces). El `click`
  se reserva para elegir la opción.
- Si el operador dejó el dropdown abierto a mano, no se manda ningún evento (el
  `mouseup` haría toggle y lo cerraría).
- `aria-expanded="true"` del trigger es la única señal fiable de que el menú abrió.
  Las opciones **siempre están en el DOM** (con el menú cerrado están recortadas pero
  conservan su layout), así que su visibilidad no dice nada.
- Al abrir, las opciones **se mueven** al popup (`div.OA0qNb`), y el popup **se va del
  bloque de la pregunta** (al body). Hay que elegir la opción que está **fuera** del
  trigger (`findVisibleOption`): la original queda recortada y no recibe el click.
- Al seleccionar, la opción vuelve al trigger con `aria-selected="true"` (y
  `tabindex="0"`). El marcador puede quedar en la original o en la copia: la
  verificación busca `aria-selected` en **todas** las opciones con ese `data-value`.
- La primera opción es el placeholder (`data-value=""`, texto "Elegir") → se descarta.
- La **misma página tiene varios dropdowns** con sus opciones en el DOM (pág. 1:
  "Nombre" con 25 y "Producto" con 64). Además, al abrir un dropdown, los popups de
  los OTROS pueden quedar visibles: nunca se buscan las opciones "en general", se
  toman del popup del dropdown que se está llenando.
- **Nunca barrer el menú con las flechas**: deja el dropdown scrolleado al final y
  el form hecho un bollo. Si el click no selecciona, se informa el fallo.
- Efecto colateral: al abrir/cerrar el menú, el trigger puede quedar con opciones
  duplicadas (25 → 50) hasta la siguiente apertura. No afecta: el matching es por
  `data-value` y al abrir se elige la copia del popup.

### Matching de opciones (`content/utils.js`, funciones puras y testeables)

`optionMatchScore` ordena: `data-value` exacto (100) > texto exacto (95) > número de plan
(90/88) > prefijo (70/65) > contiene (50/45). `findBestOption` elige el mejor y desempata
por etiqueta más corta. La comparación es **insensible a acentos y mayúsculas**.

**Fragilidad**: selectores acoplados al DOM de Google Forms (`div[jsmodel="CP1oW"]`,
`div.geS5n`, `.M7eMe`, `div[role="radio"]`, `div[role="checkbox"]`). Cambios en el form
pueden romper el relleno sin afectar parseo/plantillas.

### OJO: la pregunta aparece DOS veces en el DOM

El selector de bloques `div[jsmodel="CP1oW"], div.geS5n` matchea **la misma pregunta dos
veces** (el contenedor `CP1oW` y su hijo `geS5n`). Consecuencias:

- Rellenar **por heading** (`selectDropdownByHeading`) llenaba el mismo dropdown dos
  veces: se veía abrir y cerrar dos veces. Ahora se agrupan los bloques por **identidad
  del trigger** (un trigger = un dropdown).
- El resto del código (radio, inputs, dropdowns con `break`) toma solo el primer match,
  así que no sufre el duplicado.

---

## Persistencia (`localStorage`)

| Clave | Contenido |
|-------|-----------|
| `active_product` | Clave de producto activo |
| `input_cache_{field}` | Valor de cada input (`plan`, `linea`, `curp`, …) |
| `input_cache_{input-etiqueta-*}` | Estado de cada checkbox de etiquetas (`'1'` / `'0'`) |
| `input_cache_etiqueta_extra` | Etiqueta elegida en el dropdown (un label) |

Migración legacy: si `input_cache_eid` contiene saltos de línea, se reparte en chat-id / chat-dn / eid al cargar.

---

## UI — convenciones actuales

- Panel lateral compacto; **sin** bloque de resultado visible (solo el botón Copiar y los datos faltantes).
- Botón pegar: icono `⎘`, 22×22 px, clase `.btn-paste`.
- Productos: grid 4 columnas, clase `.btn-product.active`.
- **Eliminado**: `floating-button.js` y modal iframe — no reintroducir sin petición explícita.

---

## Checklist al hacer cambios

### Nuevo campo de input

- [ ] HTML: `group-{field}`, `input-{field}`, botón `.btn-paste`
- [ ] `ALL_INPUT_FIELDS`
- [ ] `PRODUCT_FIELDS` por producto afectado
- [ ] `parser.js`: extracción o override
- [ ] `PRODUCT_REQUIRED_FIELDS` si es obligatorio
- [ ] `PRODUCT_TEMPLATES` si aparece en resultado
- [ ] `FIELD_LABELS` para panel de faltantes
- [ ] `content/` si debe rellenar un campo del form
- [ ] Validación inline si aplica (teléfono, EID, etc.)

### Nuevo checkbox (etiqueta de contacto)

- [ ] `CONTACT_TAGS` en `popup.js` (id + label canónico con tilde)
- [ ] HTML: `input-etiqueta-*` en `group-etiquetas` + estilo `.checkbox-item`
- [ ] Cache `input_cache_{id}` y reset en **Limpiar**
- [ ] `parsed.etiquetas` (array) y `fillCheckboxes` en `content/helpers.js`
- [ ] Test de matching con y sin tilde

### Nueva etiqueta en el dropdown

- [ ] `CONTACT_TAG_OPTIONS` en `popup.js` (subconjunto que el operador elige)
- [ ] `FORM_TAGS` en `popup.js` (catálogo completo del form — la referencia)
- [ ] Test: toda opción del dropdown existe en `FORM_TAGS`
- [ ] No duplicar con `CONTACT_TAGS` (Reapertura / Prospección IA ya son checkboxes)

### Etiqueta del dropdown hacia el form

- [ ] `parsed.etiquetaDropdown` en `parser.js` (override + trim)
- [ ] `getFieldOverrides()` en `popup.js` lo pasa como `etiquetaDropdown`
- [ ] `fillPage1.js`: `selectDropdownByHeading` con `minScore = 95` (exacto)
- [ ] Test: la opción matchea exacta contra el catálogo real del dropdown
- [ ] Ojo: el catálogo del dropdown del form (63) ≠ el de las casillas (88)

### Nuevo producto

- [ ] Botón en `.products-grid` con `data-product`
- [ ] Las 4 tablas en `popup.js` (fields, required, template, clean name)
- [ ] Reglas en `parseLineaField` si la asignación de teléfonos difiere
- [ ] Lógica ESIM/CAC en `content/fillPage2/3`

### Cambios en parser

- [ ] Verificar que `processData` y `getAccumulatedData` usan `getFieldOverrides()`
- [ ] No romper `fieldOverrides` para plan/chat/eid/etiquetas
- [ ] Si cambia el plan del form: actualizar `PLAN_OPTIONS` y `PLAN_ALIASES`

### Cambios en el selector de dropdown

- [ ] La lógica de matching va en `content/utils.js` ( pura, testeable)
- [ ] `tests/dropdown.test.js` actualizado
- [ ] Verificar el dropdown sobre el form real (Pág 1 para "Nombre", Pág 3 para "Plan
      elegido" y "Usuario Backend")
- [ ] **Nunca `sleep(ms)` para esperar un cambio del DOM**: usar `waitFor`
      (microtask primero). Un sleep fijo se paga completo aunque el cambio
      ya haya ocurrido, y hace que el navegador pinte el menú abierto

### Cambios en manifest

- [ ] JSON válido (sin comas finales)
- [ ] Documentar permiso nuevo en este archivo
- [ ] Content script nuevo listado en `content_scripts` (en orden)

---

## Pruebas manuales recomendadas

1. Recargar extensión en `chrome://extensions`.
2. Por cada producto: pegar datos de prueba → verificar resultado formateado y badge de faltantes.
3. Botón ⎘ en cada input (requiere `clipboardRead`).
4. Abrir Google Form → Pág 1 (Nombre → Bruno, Producto, etiquetas) / Pág 2 / Pág 3
   (Plan elegido, Usuario Backend → CHT00096, Equipo Modelo → EID).
5. **Limpiar** borra inputs, cache, alertas, desmarca las etiquetas y resetea el dropdown.
6. Cambiar producto oculta/muestra grupos correctos sin perder cache de otros campos.
7. Dropdown de etiquetas: elegir una, volver a elegir otra (reemplaza), recargar el
   panel (persiste) y **Limpiar** (vuelve al placeholder).
8. Pág 1 → el dropdown **¿Línea telefónica a la que se comunica?** queda con la
   etiqueta elegida (es un `<select>` del form, no las casillas).

---

## Pruebas automatizadas

`npm test` (vitest). Cobertura:

| Archivo | Qué cubre |
|---------|-----------|
| `tests/e2e.test.js` | Cadena completa: datos crudos → `parseData` → resultado formateado (texto exacto esperado) |
| `tests/parser.test.js` | `parser.js`: parseo, `normalizePlan`, plan aliases, `formatPlanForOutput`, overrides |
| `tests/popup.test.js` | `popup.js`: constantes, validación, plantillas, `CONTACT_TAGS`, `CONTACT_TAG_OPTIONS`, `FORM_TAGS`, `mergeTagLabels` |
| `tests/dropdown.test.js` | `content/utils.js`: matching de opciones y etiquetas (puro, sin DOM) |
| `tests/helpers.test.js` | `content/helpers.js`: `fillCheckboxes` y `selectDropdownByHeading` con un mini-DOM simulado |
| `tests/dropdown-tags.test.js` | Matching de las 38 etiquetas del panel contra el catálogo REAL del dropdown del form (63 opciones) |
| `tests/timing.test.js` | Tiempos de las esperas activas: que el camino feliz NO duerma (para que no se pinte el menú) |

El resto del código DOM de `content/` **no** tiene tests: se verifica a mano contra el form real.

---

## Trampas de Git en Windows

- **Nunca** `git show :archivo | Set-Content archivo`: PowerShell decodifica la salida con
  el code page de la consola y la reescribe como UTF-8 → **mojibake** (`García` →
  `GarcÃ-a`, `─` → `ÔöÇ`) y el blob commiteado queda corrupto. Usar
  `cmd /c "git show :archivo > archivo"` (redirección cruda) o `[IO.File]::WriteAllText`.
- Al escribir archivos con acentos desde PowerShell, usar
  `[IO.File]::WriteAllText($path, $texto, (New-Object Text.UTF8Encoding($false)))`
  (sin BOM).
- `git add -p` con la entrada pipeada se puede quedar sin respuestas y dejar hunks sin
  staged: **siempre** revisar `git diff --cached` antes de commitear, y verificar que el
  árbol del commit nuevo sea el esperado (`git rev-parse 'HEAD^{tree}'`).

---

## Errores cometidos (leer antes de tocar `content/helpers.js`)

Esta sección existe porque los tres errores de abajo **pasaron los tests** y sólo
se detectaron contra el form real. Ninguno se deduce leyendo el código.

### 1. `closeListbox` (Escape) en la ruta de ÉXITO deseleccionaba

Se agregó "cerrar el popup tras seleccionar" para quitar el tiempo muerto entre
dropdowns. Error: `closeListbox` manda **Escape**, y Escape sobre un listbox
abierto **deselecciona** lo recién elegido. La secuencia era click → verificar
`aria-selected=true` ✓ → Escape → Forms revierte → devolver `ok:true` mentiroso.

Antes de este cambio, `closeListbox` sólo se usaba en la ruta de **fallo**
(donde no hay selección que perder). **No volver a meterlo en la ruta de éxito.**

### 2. La detección de "dropdown abierto" miraba CUALQUIER opción

`hasPopup(trigger)` devolvía `true` si había cualquier opción fuera del
trigger. En la Pág 1 hay varios dropdowns y al abrir uno sus opciones se van a
un popup en el body → el dropdown siguiente creía que ya estaba abierto sin
haberlo abierto → el click caía sobre la opción recortada (que no recibe el
click) → **no seleccionaba nada**.

Por eso `hasPopupOption(trigger, valor)` busca sólo la opción con ese
`data-value`.

### 3. El mini-DOM de los tests era demasiado permisivo

El mock inicial marcaba `aria-selected` con cualquier click y movía las
opciones en un microtask. Con eso el test de regresión **pasaba con el bug y
sin él**: no probaba nada.

Para que un test del DOM de Forms sirva, el mock tiene que replicar **las
tres** cosas del DOM real:

| Comportamiento real | Por qué importa |
|----------------------|----------------|
| Las opciones se mueven a un popup en el **body** | El popup de un dropdown confunde a los demás |
| La mudanza tarda un **macrotask** (layout) | Con microtask el `await` se reanuda después y enmascara la detección prematura |
| La opción recortada (dentro del trigger) **no** recibe el click | Si no, el click "funciona" siempre y el test no falla |

**Regla: un test de regresión tiene que FALLAR con el bug aplicado.** Si pasa
con y sin el fix, no sirve. Verificar revirtiendo el fix a mano.

### Reglas de proceso que fallan

- **No presentar como "pedido por el usuario" algo que fue interpretación
  propia.** Una vez se anunció "el punto que pediste" sobre un cambio que el
  usuario sólo había descrito como síntoma. Si la solución sale de una
  inferencia, se dice: "esto es lo que encontré que podría ser la causa".
- **Trabajar en una rama desde el principio**, no sobre master (aunque el
  working tree esté limpio: un commit accidental sobre master ya no se
  deshace fácil).
- **Un cambio de performance se mide antes de darse por bueno.** Los tiempos
  se comparan con un banco, no con la impresión.

---

## Commits

Un commit = una unidad de trabajo revisable (feature, fix, docs), con sus tests en el
mismo commit. Sin atribución de IA ni `Co-Authored-By`. Si un fix sale de una sesión de
debugging, se **aplastan** los commits iterativos antes de mergear: el historial final
tiene que contar la historia del producto, no la de la depuración.

---

## Decisiones históricas (no revertir sin consultar)

| Decisión | Motivo |
|----------|--------|
| Side panel en lugar de popup/botón flotante | UX preferida del usuario |
| Plan / chat / EID en inputs separados | Pegado granular por campo |
| `clipboardRead` en manifest | API Clipboard en side panel |
| Plan fuera de `parseLineaField` | Campo dedicado `input-plan` |
| Matching de planes por `data-value` + número de plan | "30" no debe elegir "Pro 130" |
| Texto canónico con tilde + matching insensible a acentos | El form puede cambiar "Prospección" por "Prospeccion" |
| Las etiquetas NO van en el Resultado Formateado | Solo se usan para el Google Form |
| Checkboxes de etiquetas fuera de `ALL_INPUT_FIELDS` | Ese array asume inputs de texto |
| Dropdown de etiqueta única, sin botón `+` ni chips | Del dropdown sólo se usa una etiqueta a la vez: el `value` del select es el estado y el form recibe una sola etiqueta extra |
| Catálogo completo (`FORM_TAGS`) aparte del subconjunto del dropdown | `FORM_TAGS` es la referencia de qué existe en el form; el dropdown es lo que el operador usa |
| "Reapertura" simple separada de las variantes `Reapertura_*` | Son checkboxes distintos en el form; la simple es la que se usa |
| La etiqueta del dropdown va a OTRO campo (`etiquetaDropdown`) | El form tiene dos campos distintos: casillas "Etiquetas del contacto" (88 opciones) y dropdown "¿Línea telephone...?" (63 opciones). Son catálogos diferentes |
| `minScore = 95` para el dropdown de etiquetas | Sin coincidencia exacta, "Reapertura" matchea "Reaperturas META" (prefijo) y se marca la etiqueta vecina |
