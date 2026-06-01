# Mapa del campus PUCP + Bebederos

Clon funcional del [mapa del campus de la PUCP](https://www.pucp.edu.pe/mapa-campus/),
reconstruido con **Leaflet + OpenStreetMap** (sin necesidad de API key de Google) y
ampliado con una nueva capa de **Bebederos** (puntos de agua) sobre el campus.

## Qué incluye

- Mapa interactivo centrado en el campus PUCP (`-12.0694982, -77.079835`).
- **336 puntos reales** extraídos del mapa oficial (unidades, cafeterías, wifi,
  estacionamientos, auditorios, etc.) en [data/puntos.json](data/puntos.json).
- **Capa nueva de Bebederos** en [data/bebederos.json](data/bebederos.json).
- Panel de filtros por categoría (con conteo) y buscador con autocompletado.

## Cómo ejecutar

Como la página carga datos con `fetch`, debe servirse desde un servidor local
(no abriendo el `.html` directamente):

```bash
python -m http.server 8765
```

Luego abre http://localhost:8765/ en el navegador.

## Editar / agregar bebederos

Edita [data/bebederos.json](data/bebederos.json). Cada punto:

```json
{ "title": "Bebedero - Nombre del lugar", "lat": -12.0694, "lng": -77.0798,
  "tipo": "Bebederos", "globo": "Texto que aparece en el popup" }
```

> ⚠️ Las coordenadas de los bebederos son **aproximadas** (ubicaciones plausibles
> junto a pabellones conocidos). Reemplázalas por las ubicaciones reales cuando
> las tengas. Para obtener una coordenada exacta, haz clic derecho en Google Maps
> sobre el punto y copia `lat, lng`.

## Estructura

| Archivo | Descripción |
|---|---|
| `index.html` | Página principal |
| `style.css` | Estilos (barra superior, panel de filtros, pines) |
| `app.js` | Lógica del mapa, filtros, buscador y carga de datos |
| `data/puntos.json` | Puntos oficiales del campus |
| `data/bebederos.json` | Bebederos (capa nueva, editable) |

Los colores e iconos de cada categoría se definen en `CATEGORIAS` dentro de `app.js`.
