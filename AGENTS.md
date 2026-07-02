# Form Filler — Guía del proyecto

Documento de referencia para humanos y agentes de IA. **Leer antes de modificar código.**

## Propósito

Extensión Chrome (Manifest V3) que:

1. Recibe bloques de texto pegados por el operador (datos de línea, CURP, dirección, CAC, chat, etc.).
2. Los parsea y valida según el **tipo de producto** seleccionado.
3. Muestra un **resultado formateado** listo para copiar.
4. **Autocompleta** un Google Form (`docs.google.com/forms/*`) en 3 páginas mediante inyección de `content.js`.

La UI vive en el **panel lateral** (`side_panel` → `popup.html`). No hay popup clásico ni botón flotante en la página.

---

## Arquitectura de archivos

| Archivo | Rol |
|---------|-----|
| `manifest.json` | MV3: permisos, side panel, service worker |
| `background.js` | Abre el side panel al clic en el icono de la extensión |
| `popup.html` | UI: estilos inline, inputs, botones, resultado |
| `popup.js` | Lógica UI, plantillas, validación, inyección al form |
| `parser.js` | Parseo heurístico de textareas → objeto `parsed` |
| `content.js` | `window.FormFiller`: relleno DOM en Google Forms |

```
Usuario pega datos → popup.js (processData)
                         ↓
                   parser.js (parseData)
                         ↓
              PRODUCT_TEMPLATES → #result-final
                         ↓
         btn1/btn2/btn3 → chrome.scripting → content.js
```

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
| `POS_ESIM` | `Porta Pospago Esim` |
| `POS_CAC` | `Porta Pospago` |
| `LN_ESIM` | `Linea Nueva Esim` |
| `LN_CAC` | `Linea Nueva` |
| `PRE_ESIM` | `Línea Nueva Prepago Esim` |
| `PREPAGO` | `Porta Prepago` |
| `ADIC_CAC` | `Adición` |

**No cambiar estos strings** sin verificar que coinciden con los `data-value` del formulario real.

---

## Inputs de la UI

Convención de IDs: `input-{field}` y `group-{field}`.

| Campo | ID input | Tipo | Contenido esperado |
|-------|----------|------|-------------------|
| Plan | `input-plan` | text | Nombre del plan (campo dedicado, no va en línea) |
| Línea | `input-linea` | textarea | DN, NIP, correo (heurístico por línea) |
| CURP | `input-curp` | textarea | Nombre, apellidos, CURP, sexo, fecha, estado |
| Dirección | `input-direccion` | textarea | Calle, CP, colonia, números |
| CAC | `input-cac` | textarea | Línea 1: CAC, 2: CP, 3: FVC |
| Chat ID | `input-chat-id` | text | ID del chat / lead |
| Chat DN | `input-chat-dn` | text | DN Respond (`+52…`) |
| EID | `input-eid` | text | 5 dígitos (solo productos ESIM) |

### Visibilidad por producto (`PRODUCT_FIELDS` en `popup.js`)

Actualizar **las tres** tablas al añadir un producto o campo:

- `PRODUCT_FIELDS` — qué grupos mostrar
- `PRODUCT_REQUIRED_FIELDS` — qué campos parseados son obligatorios
- `PRODUCT_TEMPLATES` — texto del resultado formateado

```javascript
// popup.js — fuente de verdad para visibilidad
PRODUCT_FIELDS = {
  POS_ESIM:  ['plan', 'linea', 'curp', 'chat-id', 'chat-dn', 'eid'],
  POS_CAC:   ['plan', 'linea', 'curp', 'cac', 'chat-id', 'chat-dn', 'eid'],
  LN_ESIM:   ['plan', 'linea', 'curp', 'direccion', 'chat-id', 'chat-dn', 'eid'],
  LN_CAC:    ['plan', 'linea', 'curp', 'direccion', 'cac', 'chat-id', 'chat-dn', 'eid'],
  PRE_ESIM:  ['linea', 'curp', 'chat-id', 'chat-dn', 'eid'],
  PREPAGO:   ['linea', 'curp', 'cac', 'chat-id', 'chat-dn'],
  ADIC_CAC:  ['plan', 'linea', 'cac', 'chat-id', 'chat-dn'],
}
```

`ALL_INPUT_FIELDS` debe listar **todos** los campos posibles (usado en clear, cache, listeners).

Campos dedicados pasados al parser vía `getFieldOverrides()`:

```javascript
{ plan, chatId, dnChat, eid }  // desde input-plan, input-chat-id, input-chat-dn, input-eid
```

---

## Flujo de parseo (`parser.js`)

### Entrada principal

```javascript
parseData(raw, productKey, lineaRawText, cacRawText, direccionRawText, fieldOverrides)
```

- `raw`: texto concatenado de campos visibles (para regex `ETIQUETA: valor`).
- `lineaRawText`, `cacRawText`, `direccionRawText`: textareas específicos.
- `fieldOverrides`: `{ plan, chatId, dnChat, eid }` — **prioridad sobre heurística**.

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

**`parseCacField`**: línea 1 = CAC, 2 = CP, 3 = FVC (año actual vía `new Date().getFullYear()` si solo dd/mm — el reloj del sistema se usa en parseo; los tests congelan el reloj con `vi.setSystemTime`).

**`parseDireccionField`**: 1–4+ líneas con reglas de calle/colonia/CP/números.

**Teléfonos**: `cleanPhone()` quita no-dígitos y prefijo `52` si length > 10.

**DN chat**: `formatDnChat()` normaliza a `+52` + 10 dígitos.

**EID**: exactamente 5 dígitos; `eidValid` boolean; obligatorio solo si `esEsim` (`POS_ESIM`, `LN_ESIM`, `PRE_ESIM`).

### Salida (`parsed`)

Campos clave usados downstream:

`nombres`, `apellido1`, `apellido2`, `nombreCompleto`, `email`, `plan`, `nip`, `dnPortar`, `dnAdicional`, `dnContacto`, `dnMovistar`, `dn` (= dnContacto), `curp`, `fecha`, `genero`, `lugarNacimiento`, `calle`, `numExt`, `numInt`, `cpDireccion`, `colonia`, `nombreCAV`, `cpCAC`, `fvc`, `chatId`, `dnChat`, `eid`, `eidValid`, `nombreTitular`, `esEsim`, `esCAC`, `producto` (añadido en popup.js).

---

## Validación (`popup.js`)

Tres capas independientes:

1. **`validatePhones`** — alertas inline si DN ≠ 10 dígitos o portar === adicional.
2. **`validateChat`** — alertas si chat parcial o EID inválido en ESIM.
3. **`validateRequiredData`** — bloquea botones Pág 1/2/3; muestra badge «Faltan datos».

Reglas especiales:

- `eid` solo se exige si `d.esEsim`.
- `dnSame` si `dnPortar === dnAdicional` en productos de portabilidad.

---

## Resultado formateado

`PRODUCT_TEMPLATES[activeProduct](parsed)` genera el texto de `#result-final`.

Es **independiente** del autocompletado del form, pero debe mantener coherencia con los mismos datos parseados.

Botón **Copiar** usa `document.execCommand('copy')` (no requiere `clipboardRead`).

---

## Autocompletado Google Form (`content.js`)

Inyectado bajo demanda con `chrome.scripting.executeScript`. API global:

```javascript
window.FormFiller.fillPage1(data)
window.FormFiller.fillPage2(data)
window.FormFiller.fillPage3(data)
```

### Página 1

- Dropdown **Nombre** → fijo `"Bruno"`.
- Radio **Producto** → `data.producto`.
- Inputs: nombre cliente, fecha nacimiento, CURP (no línea nueva), DN contacto, email, id lead, dn chat.

### Página 2

- Radio **Forma de envío**: CAC / ESIM pospago / ESIM línea nueva según `data.esEsim` y tipo.
- CAC: nombre CAV, CP.

### Página 3

- DN portar (o `"En espera"` en línea nueva), NIP, número orden, lugar nacimiento, género, ESIM sí/no, línea nueva, equipo EID, FVC (CAC), plan elegido, últimos 5 dígitos EID.

### Helpers DOM

- `setInput` — setter nativo + eventos `input`/`change`/`blur`.
- `findInputByLabel` — busca por texto en `.M7eMe`.
- `selectDropdownOption` — ArrowDown + Enter en listbox de Google Forms.

**Fragilidad**: selectores acoplados al DOM de Google Forms (`div[jsmodel="CP1oW"]`, `.M7eMe`, `div[role="radio"]`). Cambios en el form pueden romper el relleno sin afectar parseo/plantillas.

---

## Persistencia (`localStorage`)

| Clave | Contenido |
|-------|-----------|
| `active_product` | Clave de producto activo |
| `input_cache_{field}` | Valor de cada input (`plan`, `linea`, `curp`, …) |

Migración legacy: si `input_cache_eid` contiene saltos de línea, se reparte en chat-id / chat-dn / eid al cargar.

---

## UI — convenciones actuales

- Panel lateral compacto; resultado sin fondo gris.
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
- [ ] `content.js` si debe rellenar un campo del form
- [ ] Validación inline si aplica (teléfono, EID, etc.)

### Nuevo producto

- [ ] Botón en `.products-grid` con `data-product`
- [ ] Las 4 tablas en `popup.js` (fields, required, template, clean name)
- [ ] Reglas en `parseLineaField` si la asignación de teléfonos difiere
- [ ] Lógica ESIM/CAC en `content.js` fillPage2/3

### Cambios en parser

- [ ] Verificar que `processData` y `getAccumulatedData` pasan los mismos argumentos
- [ ] No romper `fieldOverrides` para plan/chat/eid

### Cambios en manifest

- [ ] JSON válido (sin comas finales)
- [ ] Documentar permiso nuevo en este archivo

---

## Pruebas manuales recomendadas

1. Recargar extensión en `chrome://extensions`.
2. Por cada producto: pegar datos de prueba → verificar resultado formateado y badge de faltantes.
3. Botón ⎘ en cada input (requiere `clipboardRead`).
4. Abrir Google Form → Pág 1/2/3 con datos completos.
5. **Limpiar** borra inputs, cache y alertas.
6. Cambiar producto oculta/muestra grupos correctos sin perder cache de otros campos.

---

## Decisiones históricas (no revertir sin consultar)

| Decisión | Motivo |
|----------|--------|
| Side panel en lugar de popup/botón flotante | UX preferida del usuario |
| Plan / chat / EID en inputs separados | Pegado granular por campo |
| `clipboardRead` en manifest | API Clipboard en side panel |
| Plan fuera de `parseLineaField` | Campo dedicado `input-plan` |
