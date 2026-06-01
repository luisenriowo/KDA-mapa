// ---- Configuración de categorías (color + emoji para el pin) ----
const CATEGORIAS = {
	"Bebederos":                         { color: "#00a3e0", emoji: "💧" },
	"Unidades":                          { color: "#0033a0", emoji: "🏛️" },
	"Cafeterías":                        { color: "#e07b00", emoji: "🍽️" },
	"Teléfonos":                         { color: "#6a1b9a", emoji: "📞" },
	"Agentes Bancarios":                 { color: "#2e7d32", emoji: "🏧" },
	"Fotocopias":                        { color: "#5d4037", emoji: "🖨️" },
	"Puntos de acceso WIFI":             { color: "#0288d1", emoji: "📶" },
	"Estacionamiento de autos":          { color: "#455a64", emoji: "🚗" },
	"Estacionamiento de motos":          { color: "#607d8b", emoji: "🏍️" },
	"Estacionamiento de bicicletas":     { color: "#009688", emoji: "🚲" },
	"Auditorios":                        { color: "#c2185b", emoji: "🎭" },
	"Deportes":                          { color: "#43a047", emoji: "⚽" },
	"Museos":                            { color: "#8d6e63", emoji: "🏺" },
	"Librerías y tiendas":               { color: "#f9a825", emoji: "📚" },
	"Paraderos de Plaza Bus":            { color: "#d84315", emoji: "🚌" },
	"Servicios para la comunidad PUCP":  { color: "#7b1fa2", emoji: "🛎️" },
	"Asociaciones estudiantiles":        { color: "#1565c0", emoji: "👥" },
	"Lavado de autos":                   { color: "#00838f", emoji: "🧽" },
	"Otros":                             { color: "#9e9e9e", emoji: "📍" }
};
// Estados de los bebederos (mock). Definen el color del pin y el detalle del popup.
const ESTADOS_BEBEDERO = {
	"operativo":      { color: "#2e9e3f", label: "Operativo",          desc: "Funcionando con normalidad." },
	"filtro":         { color: "#f5a623", label: "Filtro por cambiar", desc: "Reportado: el filtro requiere mantenimiento/cambio." },
	"revision":       { color: "#00a3e0", label: "En revisión",        desc: "Reporte recibido, pendiente de verificación." },
	"fuera_servicio": { color: "#d0021b", label: "Fuera de servicio",  desc: "Disfuncional: no apto para consumo por el momento." }
};
const ESTADO_DEFECTO = "operativo";

// Categorías marcadas al iniciar
const ACTIVAS_INICIO = new Set(["Bebederos", "Unidades"]);

// URL del formulario de reportes (se le pasan los datos del bebedero por query string)
const FORM_REPORTE = "reporte.html";

const map = L.map("el-mapa", { zoomControl: true }).setView([-12.0694982, -77.079835], 17);
// Fondo minimalista (CartoDB Positron): gris claro, sin ruido de comercios/colores.
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
	maxZoom: 20,
	subdomains: "abcd",
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
}).addTo(map);

function colorDePunto(p) {
	// Los bebederos se colorean por su estado actual; el resto por su categoría.
	if (p.tipo === "Bebederos") {
		const est = ESTADOS_BEBEDERO[p.estado] || ESTADOS_BEBEDERO[ESTADO_DEFECTO];
		return est.color;
	}
	return (CATEGORIAS[p.tipo] || CATEGORIAS["Otros"]).color;
}

function crearIcono(p) {
	const cfg = CATEGORIAS[p.tipo] || CATEGORIAS["Otros"];
	return L.divIcon({
		className: "",
		html: `<div class="pin" style="background:${colorDePunto(p)}"><span>${cfg.emoji}</span></div>`,
		iconSize: [22, 22],
		iconAnchor: [11, 22],
		popupAnchor: [0, -22]
	});
}

function escapeHtml(s) {
	return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function construirPopup(p) {
	if (p.tipo !== "Bebederos") {
		return p.globo && p.globo.trim() ? p.globo : `<strong>${escapeHtml(p.title)}</strong>`;
	}
	const est = ESTADOS_BEBEDERO[p.estado] || ESTADOS_BEBEDERO[ESTADO_DEFECTO];
	const nombre = p.title.replace(/^Bebedero\s*-\s*/, "");
	const params = new URLSearchParams({ id: p.id || "", bebedero: nombre, estado: est.label });
	return `
		<div class="popup-beb">
			<div class="popup-titulo">💧 ${escapeHtml(nombre)}</div>
			<span class="estado-badge" style="background:${est.color}">${est.label}</span>
			<p class="estado-desc">${escapeHtml(est.desc)}</p>
			<dl class="popup-detalles">
				<dt>Ubicación</dt><dd>${escapeHtml(p.ubicacion || "—")}</dd>
				<dt>Último reporte</dt><dd>${escapeHtml(p.ultimoReporte || "—")}</dd>
				<dt>Reportes</dt><dd>${p.reportes != null ? p.reportes : 0}</dd>
			</dl>
			<a class="btn-reporte" href="${FORM_REPORTE}?${params.toString()}" target="_blank" rel="noopener">📝 Reportar un problema</a>
		</div>`;
}

const marcadores = [];   // { punto, marker }
const grupos = {};       // tipo -> [marker]

function agregarPuntos(puntos) {
	puntos.forEach(p => {
		const marker = L.marker([p.lat, p.lng], { icon: crearIcono(p), title: p.title });
		marker.bindPopup(construirPopup(p), { minWidth: p.tipo === "Bebederos" ? 240 : 200 });
		marcadores.push({ punto: p, marker });
		(grupos[p.tipo] = grupos[p.tipo] || []).push(marker);
	});
}

function construirFiltros() {
	const cont = document.getElementById("filtros");
	cont.innerHTML = "";
	// Orden: primero Bebederos, luego el resto por nombre
	const tipos = Object.keys(grupos).sort((a, b) => {
		if (a === "Bebederos") return -1;
		if (b === "Bebederos") return 1;
		return a.localeCompare(b, "es");
	});
	tipos.forEach((tipo, i) => {
		const cfg = CATEGORIAS[tipo] || CATEGORIAS["Otros"];
		const id = "fi" + i;
		const checked = ACTIVAS_INICIO.has(tipo);
		const div = document.createElement("div");
		div.className = "filtro-item";
		div.innerHTML = `
			<input type="checkbox" id="${id}" value="${tipo}" ${checked ? "checked" : ""}>
			<label for="${id}">
				<span class="swatch" style="background:${cfg.color}"></span>
				<span>${cfg.emoji} ${tipo}</span>
				<span class="conteo">(${grupos[tipo].length})</span>
			</label>`;
		div.querySelector("input").addEventListener("change", aplicarFiltros);
		cont.appendChild(div);
	});
}

function aplicarFiltros() {
	const activos = new Set();
	document.querySelectorAll("#filtros input:checked").forEach(c => activos.add(c.value));
	for (const tipo in grupos) {
		const mostrar = activos.has(tipo);
		grupos[tipo].forEach(m => {
			if (mostrar) { if (!map.hasLayer(m)) m.addTo(map); }
			else { if (map.hasLayer(m)) map.removeLayer(m); }
		});
	}
}

// ---- Buscador con sugerencias ----
function configurarBuscador() {
	const input = document.getElementById("buscador");
	const lista = document.getElementById("sugerencias");
	let indiceActivo = -1;

	function cerrar() { lista.style.display = "none"; lista.innerHTML = ""; indiceActivo = -1; }

	function buscar(q) {
		q = q.trim().toLowerCase();
		if (!q) { cerrar(); return; }
		const res = marcadores
			.filter(m => m.punto.title.toLowerCase().includes(q))
			.slice(0, 12);
		if (!res.length) { cerrar(); return; }
		lista.innerHTML = "";
		res.forEach(m => {
			const li = document.createElement("li");
			li.textContent = m.punto.title;
			li.addEventListener("click", () => seleccionar(m));
			lista.appendChild(li);
		});
		lista.style.display = "block";
		indiceActivo = -1;
	}

	function seleccionar(m) {
		// Asegura que su categoría esté visible
		const chk = document.querySelector(`#filtros input[value="${m.punto.tipo}"]`);
		if (chk && !chk.checked) { chk.checked = true; aplicarFiltros(); }
		if (!map.hasLayer(m.marker)) m.marker.addTo(map);
		map.setView([m.punto.lat, m.punto.lng], 19);
		m.marker.openPopup();
		input.value = m.punto.title;
		cerrar();
	}

	input.addEventListener("input", () => buscar(input.value));
	input.addEventListener("keydown", e => {
		const items = [...lista.querySelectorAll("li")];
		if (!items.length) return;
		if (e.key === "ArrowDown") { e.preventDefault(); indiceActivo = (indiceActivo + 1) % items.length; }
		else if (e.key === "ArrowUp") { e.preventDefault(); indiceActivo = (indiceActivo - 1 + items.length) % items.length; }
		else if (e.key === "Enter") { e.preventDefault(); items[indiceActivo >= 0 ? indiceActivo : 0].click(); return; }
		else return;
		items.forEach((it, i) => it.classList.toggle("activa", i === indiceActivo));
	});
	document.addEventListener("click", e => { if (!e.target.closest(".panel-head")) cerrar(); });
}

function agregarLeyenda() {
	const ctrl = L.control({ position: "bottomright" });
	ctrl.onAdd = function () {
		const div = L.DomUtil.create("div", "leyenda");
		div.innerHTML = "<strong>💧 Estado de bebederos</strong>" +
			Object.values(ESTADOS_BEBEDERO).map(e =>
				`<div class="ley-item"><span class="swatch" style="background:${e.color}"></span>${e.label}</div>`
			).join("");
		return div;
	};
	ctrl.addTo(map);
}

document.getElementById("toggle-todos").addEventListener("click", () => {
	const checks = [...document.querySelectorAll("#filtros input")];
	const algunoApagado = checks.some(c => !c.checked);
	checks.forEach(c => c.checked = algunoApagado);
	aplicarFiltros();
});

// ---- Carga de datos ----
Promise.all([
	fetch("data/puntos.json").then(r => r.json()),
	fetch("data/bebederos.json").then(r => r.json())
]).then(([puntos, bebederos]) => {
	agregarPuntos(bebederos);   // bebederos primero para que queden encima
	agregarPuntos(puntos);
	construirFiltros();
	configurarBuscador();
	agregarLeyenda();
	aplicarFiltros();
}).catch(err => {
	alert("No se pudieron cargar los datos. Ejecuta la página desde un servidor local (no abriendo el archivo directamente).\n\n" + err);
	console.error(err);
});
