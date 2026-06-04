# Auditoría técnica — Caída de tráfico de Google en los *lives* de VAVEL.com

**Fecha:** 2026-06-04
**Alcance:** Por qué Google envía menos tráfico que antes a las páginas de cobertura en vivo (LIVE Score Updates / "en directo" / "goles y mejores momentos").
**Base de evidencia:** Dos capturas (Google Analytics *En tiempo real* y el CMS `editor.vavel.com`) + comportamiento conocido de Google News / Top Stories / hreflang.

> ⚠️ **Limitación importante de esta auditoría.** No pude rastrear el sitio en vivo: `robots.txt`, `sitemap/news.xml` y `sitemap/1.xml` devolvieron **HTTP 403** a mi *fetcher*. Eso, por sí solo, es una pista (ver Hallazgo #1). Las partes marcadas con 🔎 **REQUIERE VERIFICAR** necesitan acceso a Search Console o a los logs del servidor para confirmarse. El resto se deduce directamente de las capturas.

---

## TL;DR — orden de prioridad de los sospechosos

| # | Sospecha | Probabilidad | Impacto | Esfuerzo de verificación |
|---|----------|:---:|:---:|---|
| 1 | **WAF/CDN devuelve 403/429 a Googlebot / Googlebot-News** | Alta | Crítico | Bajo (GSC → Estadísticas de rastreo) |
| 2 | **Sobre-segmentación de hreflang** (ES, ES-ES, ES-MX, ES-US, EN, EN-US, x-default para el *mismo* texto) → clustering y canonical equivocado | Alta | Crítico | Medio |
| 3 | **`sitemap/news.xml` mal mantenido** (lives caducados, no se borran, idioma incorrecto, > 48 h) | Media-alta | Alto | Bajo |
| 4 | **Reescritura del `<title>`/H1 del live en la misma URL** ("Kickoff" → "Great match" → "Goles y mejores momentos") | Media | Alto | Bajo |
| 5 | **AMP mal emparejado o dependencia de AMP ya obsoleta** | Media | Medio | Bajo |
| 6 | **Factores externos**: actualización de Discover (feb 2026) y core update (mar 2026) golpearon a *publishers* no-US | Media | Variable | Bajo |

---

## Hallazgo #1 — El WAF está bloqueando rastreadores (el sospechoso nº 1 de una caída *repentina*)

Cuando intento leer `https://www.vavel.com/robots.txt`, `…/sitemap/news.xml` y `…/sitemap/1.xml`, los tres devuelven **403 Forbidden**. Eso significa que hay un cortafuegos/CDN (tipo Cloudflare/Akamai) filtrando por *user-agent* o por IP.

**Por qué importa:** si esa misma regla devuelve 403, 429 o *timeouts* a **Googlebot** o **Googlebot-News** —aunque sea de forma intermitente o solo desde ciertos rangos de IP—, Google rastrea menos, deja de descubrir los lives a tiempo y los saca de Top Stories / News. Es la causa **más común** de una caída brusca de tráfico de noticias y la más barata de descartar.

🔎 **REQUIERE VERIFICAR (hazlo primero):**
1. Search Console → **Configuración → Estadísticas de rastreo**. Mira:
   - % de respuestas que **no** son 200 (busca picos de 403/429/5xx que coincidan con la caída).
   - "Por respuesta" y "Por finalidad de Googlebot".
2. Search Console → **Inspección de URL** sobre un live reciente → *Probar URL publicada*. Si dice "bloqueado" o "no se puede acceder", es esto.
3. En los **logs del servidor/CDN**, filtra por `Googlebot` y `Googlebot-News` y cuenta cuántas respuestas ≠ 200 hay.
4. Revisa reglas de *rate limiting* / *bot fight mode* del CDN: deben **permitir explícitamente** a los rastreadores verificados de Google.

> Nota: que *mi* fetcher reciba 403 no prueba que Googlebot también lo reciba (Google usa IPs y UA verificados que el WAF puede tener en lista blanca). Pero es exactamente el tipo de configuración que provoca este problema, así que hay que confirmarlo.

---

## Hallazgo #2 — Sobre-segmentación de hreflang → contenido casi duplicado y canonical equivocado

En la captura del CMS, **cada** artículo lleva una hilera de locales. Para un mismo partido aparecen, por ejemplo:

- "Francia vs Costa de Marfil EN VIVO…" → `EN-US`, `X-DEFAULT`, `EN`, `MX`, `ES-MX`, `ES`, `ES-US`
- "Spain vs Iraq… Ferran opens the score (1-0)" → `EN-US`, `X-DEFAULT`, `EN`, `ES`, `ES-ES`
- "España vs Irak, en directo…" → `ES`, `ES-ES`, `EN-US`, `X-DEFAULT`, `EN`

Esto implica que del **mismo texto** se publican hasta **4 variantes en español** (`es`, `es-ES`, `es-MX`, `es-US`) y **2 en inglés** (`en`, `en-US`). El problema no es tener hreflang —está bien hacerlo— sino que esas variantes suelen ser **idénticas o casi idénticas** salvo el dominio/edición.

**Consecuencias en Google:**
- Google las mete en el **mismo *cluster* de duplicados** y elige **un único canonical**. Las demás caen a "Alternativa con etiqueta canónica adecuada" o, peor, a **"Duplicada: Google eligió un canónico distinto al del usuario"** → desaparecen de los resultados directos.
- Si el canonical que Google elige no es el de la edición que antes traía el tráfico (p. ej. consolida todo en `en-US` y tu tráfico venía de `es`/`es-ES`), **pierdes** ese tráfico aunque la noticia siga indexada.
- En **Top Stories** solo entra normalmente una URL por *cluster*; multiplicar variantes **diluye** las señales (enlaces, *clicks*) entre 6 URLs en lugar de concentrarlas.

**Corroboración en la captura de Analytics:** el partido de Suecia aparece con **dos títulos en inglés** —"Goals and highlights of Sweden 2 x 2 in the Friendly Match" (21) y el mismo con sufijo "| 06/04/2026 - VAVEL USA" (16)—. Son **dos URLs** compitiendo por la misma consulta en el mismo idioma: canibalización clásica.

### Errores concretos de hreflang que hay que descartar 🔎 **REQUIERE VERIFICAR**
Revisa el `<head>` renderizado (no el de la plantilla) de un live y comprueba:
1. **Reciprocidad total**: si A apunta a B con hreflang, B debe apuntar a A. Un solo enlace que falta invalida ese par.
2. **Un único `x-default`** por *cluster*. Si dos URLs distintas se declaran ambas `x-default`, Google ignora **todo** el conjunto de hreflang.
3. **`rel=canonical` coherente con hreflang**: cada variante debe canonicalizar **a sí misma**, no a otra edición. Un canonical cruzado + hreflang es contradictorio y gana el canonical.
4. **URLs absolutas y 200** en cada `hreflang` (nada de redirecciones ni 404 dentro del set).
5. **Códigos válidos**: `es-US` y `en-US` son válidos como `idioma-REGIÓN`, pero asegúrate de que no haya inventos tipo `es-LATAM` o regiones mal escritas — un código inválido tira la entrada.

### Recomendación
- Reduce la matriz de variantes: si el texto en español es el mismo para ES/MX/US, plantéate **un solo `es` (o `es` + `es-ES`)** con `x-default`, en vez de cuatro clones. Menos URLs = señales concentradas = mejor posicionamiento. Multiplicar ediciones solo aporta si el **contenido es realmente distinto** (alineaciones locales, horario local, etc.).

---

## Hallazgo #3 — `sitemap/news.xml`: higiene de noticias

No pude leerlo (403), así que esto es checklist 🔎 **REQUIERE VERIFICAR** contra los requisitos vigentes de Google News:

1. **Solo artículos de las últimas 48 h.** Todo lo más viejo debe salir del news sitemap (puede seguir en el sitemap normal).
2. **Cuando un live termina y se convierte en "Goles y mejores momentos", saca la URL del live del news sitemap** si cambió de naturaleza, o actualiza su entrada de forma coherente (ver Hallazgo #4).
3. **`<news:language>` correcto por URL.** Si publicas 6 variantes de idioma, el news sitemap debe declarar el idioma real de cada una. Un idioma mal puesto las descarta.
4. **No incluir las 6 variantes casi-duplicadas** del mismo partido: enviar duplicados al news sitemap es contraproducente. Incluye solo la canónica de cada idioma realmente distinto.
5. **`<news:publication_date>` con fecha+hora ISO 8601 y zona horaria** real de publicación.
6. **Tamaño**: ≤ 1.000 URLs por news sitemap. Si lo superas, divídelo.
7. Comprueba en GSC → **Sitemaps** que `news.xml` está **"Correcto"** y con fecha de lectura reciente (no "No se ha podido obtener" → eso enlaza con el Hallazgo #1).

También revisa `sitemap/1.xml` (el general):
- `lastmod` **real** (que cambie solo cuando cambia el contenido). Un `lastmod = ahora` permanente hace que Google deje de fiarse y rastree menos.
- Que el `<loc>` sea **la URL canónica** (con/sin barra, www, protocolo) coherente con el canonical del `<head>`.

---

## Hallazgo #4 — La URL del live muta de título/contenido (riesgo de "perder la identidad" de la página)

En Analytics se ve el **mismo** live bajo títulos distintos según el minuto:
`France vs Ivory Coast LIVE Score Updates: **Kickoff (0-0)**` (10) y `… **Great match (0-0)**` (18); y en el CMS el de España va de "Ferran opens the score (1-0)" hacia el eventual "Goles y mejores momentos".

Reescribir `<title>`/H1 **en la misma URL** durante el directo es normal y aceptable. El riesgo aparece en **dos puntos**:

1. **Transición de "LIVE" a "resumen/goles y mejores momentos".** Si la misma URL pasa de página en vivo a recap, puede **perder la elegibilidad de live** y el *ranking* acumulado para la consulta previa/durante el partido. Verifica si usáis la **misma URL** o creáis una **URL nueva** para el resumen.
2. **Estabilidad del `<title>` para Search.** Cambios de título muy frecuentes hacen que Google reescriba el título mostrado y que el *snippet* baile; durante el directo es tolerable, pero conviene fijar un patrón estable lo antes posible.

🔎 **REQUIERE VERIFICAR — datos estructurados del live:**
- ¿Usáis **`LiveBlogPosting`** (JSON-LD) con `coverageStartTime`, `coverageEndTime`, `headline` y `liveBlogUpdate` con `datePublished`/`dateModified`? Es **requisito de facto** para el badge rojo "EN VIVO" en Top Stories. Sin él, el live no compite como live.
- `datePublished` debe quedar **fijo**; solo `dateModified`/`liveBlogUpdate` deben avanzar. Si `datePublished` se reescribe en cada actualización, Google puede tratarlo como contenido reciclado.
- Frecuencia de actualización razonable (cada ~5–15 min durante el evento) ayuda; rachas de cientos de cambios/minuto pueden parecer *spam*.

---

## Hallazgo #5 — AMP

No pude inspeccionar el par AMP↔canónica (403). Checklist 🔎 **REQUIERE VERIFICAR:**
1. La **canónica HTML** debe declarar `<link rel="amphtml" href="…">` y la **AMP** debe declarar `<link rel="canonical" href="…">` apuntando a la HTML. Si ese par está roto o cruzado entre ediciones/idiomas, se rompe la indexación.
2. **hreflang también en las páginas AMP**, coherente con el de las HTML.
3. **Recordatorio estratégico:** Google ya **no exige AMP** para Top Stories ni para el *badge* de noticias desde hace años, y lo está desincentivando. Si vuestra arquitectura aún **depende** de AMP para entrar en News, o si lo que Google indexa es la versión AMP en lugar de la canónica, conviene migrar a una HTML rápida (Core Web Vitals) y dejar AMP como secundario o retirarlo. Mantener AMP roto resta más de lo que suma.
4. Valida una AMP en el **AMP Test** y en **Rich Results Test**.

---

## Hallazgo #6 — Contexto externo (no es culpa técnica vuestra, pero contribuye)

Conviene separar lo técnico de lo algorítmico para no perseguir fantasmas:
- **Discover Core Update (feb 2026):** golpeó específicamente el tráfico de **Discover** de *publishers* fuera de EE. UU. Si parte de la caída es de Discover (no de Búsqueda/News), encaja con esto y **no** se arregla con cambios técnicos.
- **Core Update (mar 2026):** volatilidad amplia; caídas medias del 20–35 % en sitios afectados.
- **Tendencia 2025–2026:** más "Rastreada: actualmente sin indexar" y des-indexaciones.

🔎 **REQUIERE VERIFICAR:** en GSC → Rendimiento, **segmenta por tipo** (Búsqueda web vs Discover vs News) y por **fecha** para ver si la caída coincide con feb/mar 2026 (algorítmica) o con un cambio vuestro de infraestructura/plantilla (técnica). Esto decide dónde invertir el esfuerzo.

---

## Plan de acción priorizado

**Hoy (descarte rápido, alto ROI):**
1. GSC → **Estadísticas de rastreo**: buscar picos de 403/429/5xx (Hallazgo #1).
2. GSC → **Inspección de URL** en 3-4 lives: ver canónica elegida por Google, estado de indexación y resultado de "Probar URL publicada".
3. GSC → **Sitemaps**: estado de `news.xml` y `sitemap/1.xml` (¿"Correcto"? ¿fecha de lectura reciente?).
4. GSC → **Rendimiento**: separar Search / Discover / News y cruzar con fechas de updates (Hallazgo #6).

**Esta semana:**
5. Auditar el `<head>` renderizado de un live: reciprocidad hreflang, **un solo `x-default`**, canonical *self-referential*, par `amphtml`/`canonical` (Hallazgos #2 y #5).
6. Decidir **reducir la matriz de idiomas** si las variantes son clones (Hallazgo #2).
7. Limpiar `news.xml`: solo < 48 h, idioma correcto, sin duplicados de variantes (Hallazgo #3).
8. Confirmar `LiveBlogPosting` con `datePublished` fijo y `coverageEndTime` al cerrar (Hallazgo #4).
9. Definir política clara: **misma URL** para live→recap, o URL nueva (Hallazgo #4).

**Datos que necesito para cerrar el diagnóstico (si quieres que profundice):**
- Captura de **Estadísticas de rastreo** (por respuesta) de los últimos 3 meses.
- El `<head>` **renderizado** (no la plantilla) de una URL de live.
- El XML de `news.xml` y de `sitemap/1.xml` (pégalos; o desbloquea mi *user-agent* / dame una URL accesible).
- Captura de **Rendimiento** segmentada por Search/Discover/News con el rango de fechas de la caída.

---

## Fuentes (lado Google)
- [Create a News Sitemap — Google Search Central](https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap)
- [Consolidate duplicate URLs (canonical) — Google Search Central](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Article / LiveBlogPosting structured data — Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/article)
- [LiveBlogPosting y el badge "LIVE" en Top Stories — Tickaroo](https://tickaroo.com/en/blog/how-to-get-the-red-live-badge-on-google-using-liveblogs)
- [How Google handles Clustering and Canonicalization — TSW](https://www.tsw.it/en/journal-eng/marketing-experiences/how-google-handles-clustering-and-canonicalization/)
- [Duplicate, Google chose different canonical — Ahrefs](https://ahrefs.com/blog/duplicate-google-chose-different-canonical-than-user/)
- [Google's December update y el tráfico de Discover para sitios de noticias — PPC Land](https://ppc.land/googles-december-update-destroys-discover-traffic-for-news-sites/)
- [Google March 2026 Core Update — análisis de volatilidad (ALM Corp)](https://almcorp.com/blog/google-search-ranking-volatility-march-2026/)
