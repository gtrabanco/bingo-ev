# Integración del rediseño — `feat/14-design-refactor-design-system`

Paquete listo para tu repo **bingo-ev** (Astro 6 + Tailwind 4 + Cloudflare).
Todo respeta tus rutas reales; cópialo encima de `src/` y `public/`.

> Estos archivos **no** tocan tu backend (D1, OAuth, grupos). Solo CSS, fuentes
> y marcado. Cada `id` / `aria` / clase `hidden` del que depende el script de
> `index.astro` se conserva **verbatim** → toda la funcionalidad sigue igual.

---

## Mapa de archivos

| Archivo del paquete | Destino en tu repo | Acción |
|---|---|---|
| `public/fonts/*.ttf` (5) + `*-OFL.txt` (3) | `public/fonts/` | **Nuevo** — copiar |
| `src/styles/global.css` | `src/styles/global.css` | **Reemplaza** (drop-in) |
| `src/components/BingoCard.astro` | `src/components/BingoCard.astro` | **Reemplaza** (drop-in) |
| `src/components/SiteNav.astro` | `src/components/SiteNav.astro` | **Nuevo** — copiar |

Tras copiar, queda **un único edit manual** en `src/pages/index.astro` (abajo).

---

## Qué cambia, por archivo

### 1. Fuentes (`public/fonts/`) — NUEVO
Bricolage Grotesque (display + UI), Lora (diploma), Space Mono (serials).
**Auto-alojadas**: nada de Google Fonts (privacidad UE + latencia). SIL OFL 1.1;
el texto de licencia viaja en `*-OFL.txt`.

### 2. `global.css` — REEMPLAZA
Idéntico al tuyo **más**:
- 5 reglas `@font-face` apuntando a `/fonts/*.ttf`.
- `--font-sans/serif/mono` dentro de `@theme` → Tailwind genera
  `font-sans/serif/mono` y el *preflight* aplica Bricolage como fuente base del
  `body` automáticamente (no hace falta tocar el `<body>`).
- Dos utilidades nuevas en `@layer components`: `.nav-action` (icono sobre
  etiqueta) y `.nav-box` (glifo de login 42 px), que usa `SiteNav.astro`.

Todo tu CSS de `.cell`, `.dab`, `.expired-stamp`, `.mode-btn`, etc. se mantiene
sin cambios.

### 3. `BingoCard.astro` — REEMPLAZA
- **Quitada la palabra «BINGO»** de la cabecera (un cartón ya se reconoce solo).
  La cabecera ahora lleva el nº a la izquierda y un discreto «Vía pública» a la
  derecha.
- Pie izquierdo «Serie: vía pública» → «Sin validez legal» (la procedencia ya
  está en la cabecera). IDs `bingo-card`, `card-serial`, `bingo-grid`,
  `card-expiry`, `expired-stamp` intactos.

### 4. `SiteNav.astro` — NUEVO (la navbar rediseñada)
- Marca (favicon + nombre) arriba a la izquierda.
- Cada acción = **icono sobre etiqueta** (`.nav-action`): «Hall», «Vincular».
- **«Guardar mis diplomas» → «Jugar con cuenta»**; botones Google/X como glifos
  de 42 px (`.nav-box`) proporcionados a los iconos.
- «Cambiar de dispositivo» → etiqueta «Vincular».
- Estado logueado (perfil público, cerrar sesión, borrar todo) **conservado
  íntegro**. Compatible con tu toggle `hidden`/`flex` (verificado contra el
  script: `account-bar/loggedout/loggedin` reciben `flex` al mostrarse).

---

## El edit manual en `index.astro`

**a) Importa y usa el nav** (sustituye tu bloque `<nav>…</nav>` inline, líneas
~21–160, por el componente):

```astro
---
import SiteNav from '../components/SiteNav.astro';
// … (hasGoogle / hasX / hasAnyProvider ya existen en tu frontmatter)
---
<SiteNav hasGoogle={hasGoogle} hasX={hasX} hasAnyProvider={hasAnyProvider} />
```

Borra el `<nav aria-label="Navegación principal">…</nav>` antiguo. Los diálogos
y paneles que venían justo después (`#delete-account-dialog`,
`#device-code-panel`) **se quedan donde están**.

**b) (Opcional, recomendado) Jerarquía «cartón protagonista».**
Hoy tienes un `<header>` central enorme (eyebrow + H1 + descripción) sobre dos
columnas. Como la marca ya vive en el nav, el rediseño definitivo:
1. **Elimina el H1** del `<header>` (o redúcelo a la eyebrow + descripción
   corta), para que el cartón sea lo primero y más grande.
2. Pasa de dos columnas a **una columna centrada** (`max-w-md`/`lg:max-w-xl`
   `mx-auto`) en pantallas grandes: quita el `lg:grid lg:grid-cols-[…]` del
   contenedor y deja el "papeleo" (guardar, grupos, anuncios) **debajo** del
   cartón en lugar de a la derecha.

Esta parte la dejé como guía y no como código, porque toca mucho marcado tuyo
con IDs/JS y conviene hacerla revisando en local. **Puedo generártela como un
`index.astro` completo si me pasas el archivo o me dices que tire de la copia
montada** — lo hago en el siguiente paso de tu plan.

---

## Checklist de prueba (tras `npm run dev`)

- [ ] Las tres fuentes cargan desde `/fonts/` (Network: sin llamadas a
      fonts.googleapis.com). Titulares en Bricolage, serials en Space Mono.
- [ ] Nav desktop: marca a la izquierda; Hall · Vincular · (Google/X) con sus
      etiquetas alineadas en la misma base.
- [ ] Login: aparece «Jugar con cuenta»; al pulsar Google/X arranca el OAuth.
- [ ] Sesión iniciada: perfil público (crear/editar/desactivar), cerrar sesión
      y «Borrar todo» funcionan igual.
- [ ] «Vincular» aparece solo con cartón guardado y abre el panel de código/QR.
- [ ] El cartón no muestra «BINGO»; el sello «Caducado» sigue saliendo en
      cartones vencidos.
- [ ] Móvil (≤640 px): el nav no se rompe; la marca oculta el texto y deja el
      logo.

---

## Orden de commits sugerido

1. `feat: self-host fonts (Bricolage, Lora, Space Mono)` — `public/fonts/` + `global.css`
2. `refactor(card): drop redundant "BINGO" word from cartón header` — `BingoCard.astro`
3. `feat(nav): icon-over-label navbar + "Jugar con cuenta"` — `SiteNav.astro` + edit en `index.astro`
4. `refactor(home): cartón-protagonist single-column hierarchy` — (el opcional b)
