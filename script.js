// Diagnóstico rápido
const soluciones = {
  lento: {
    servicio: "Mantenimiento",
    texto: "Casi siempre es polvo, un disco lleno o programas innecesarios. Limpiamos el equipo por dentro y por fuera, y lo dejamos rápido otra vez."
  },
  programa: {
    servicio: "Instalación de programas",
    texto: "Instalamos y configuramos el sistema operativo, ofimática, antivirus o el software que necesites."
  },
  wifi: {
    servicio: "Redes básicas",
    texto: "Revisamos el router, la señal Wi-Fi y la configuración de tu equipo hasta que vuelvas a conectarte."
  },
  "no-enciende": {
    servicio: "Soporte técnico",
    texto: "Revisamos fuente de poder, memoria y disco para encontrar la falla y darte el precio antes de reparar."
  }
};

const botones = document.querySelectorAll(".options button");
const resultado = document.getElementById("resultado");

botones.forEach(btn => {
  btn.setAttribute("aria-pressed", "false");
  btn.addEventListener("click", () => {
    botones.forEach(b => b.setAttribute("aria-pressed", "false"));
    btn.setAttribute("aria-pressed", "true");
    const s = soluciones[btn.dataset.p];
    resultado.innerHTML =
      `<p><strong>${s.servicio}</strong></p><p>${s.texto}</p>` +
      `<a href="#contacto" data-servicio="${s.servicio}">Pedir este servicio</a>`;
    resultado.querySelector("a").addEventListener("click", e => {
      document.getElementById("servicio").value = e.currentTarget.dataset.servicio;
    });
  });
});

// Validación del formulario
const form = document.getElementById("form");
const exito = document.getElementById("exito");

function marcar(id, mensaje) {
  const campo = document.getElementById(id);
  document.querySelector(`.error[data-for="${id}"]`).textContent = mensaje;
  campo.classList.toggle("invalid", Boolean(mensaje));
  return !mensaje;
}

// Envío del formulario a Google Sheets y correo (Google Apps Script)
const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbwQ5TzO17zch2POHLUE1sWsKOlOBP23dMkOB8y9qKa_vgd35cRps7_1fpXhNJpkmNue5Q/exec";

async function enviarSolicitud(datos) {
  const boton = form.querySelector('button[type="submit"]');
  boton.disabled = true;
  boton.textContent = "Enviando...";
  exito.hidden = true;
  exito.classList.remove("fallo");

  try {
    // text/plain evita la verificación previa (preflight) que Apps Script no admite
    await fetch(URL_SCRIPT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(datos)
    });
    exito.textContent = `Gracias, ${datos.nombre}. Recibimos tu solicitud de ${datos.servicio.toLowerCase()} y te escribiremos a ${datos.correo}.`;
    form.reset();
  } catch (error) {
    exito.textContent = "No pudimos enviar tu solicitud. Revisa tu conexión e inténtalo de nuevo.";
    exito.classList.add("fallo");
  } finally {
    exito.hidden = false;
    boton.disabled = false;
    boton.textContent = "Enviar solicitud";
  }
}

form.addEventListener("submit", e => {
  e.preventDefault();
  const nombre = document.getElementById("nombre").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const servicio = document.getElementById("servicio").value;
  const mensaje = document.getElementById("mensaje").value.trim();

  const validos = [
    marcar("nombre", nombre.length < 3 ? "Escribe tu nombre (mínimo 3 letras)." : ""),
    marcar("correo", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ? "" : "Escribe un correo válido, por ejemplo nombre@correo.com."),
    marcar("servicio", servicio ? "" : "Selecciona un servicio."),
    marcar("mensaje", mensaje.length < 10 ? "Cuéntanos un poco más (mínimo 10 caracteres)." : "")
  ];

  if (validos.every(Boolean)) {
    enviarSolicitud({ nombre, correo, servicio, mensaje });
  } else {
    exito.hidden = true;
  }
});

// Cotizador
const fmt = valor => valor.toLocaleString("es-CO", {
  style: "currency", currency: "COP", maximumFractionDigits: 0
});
const checksServicios = document.querySelectorAll('input[name="serv"]');
const inputEquipos = document.getElementById("equipos");
const checkDomicilio = document.getElementById("domicilio");
const detalle = document.getElementById("detalle");
const totalEl = document.getElementById("total");
let cotizacionActual = { total: 0, lineas: [], servicios: [] };

function calcular() {
  const equipos = Math.min(20, Math.max(1, parseInt(inputEquipos.value, 10) || 1));
  const elegidos = [...checksServicios].filter(c => c.checked);
  const lineas = [];
  let subtotal = 0;

  elegidos.forEach(c => {
    const monto = Number(c.value) * equipos;
    subtotal += monto;
    lineas.push([`${c.dataset.nombre} × ${equipos}`, monto]);
  });

  let total = subtotal;
  if (equipos >= 3 && subtotal > 0) {
    const descuento = subtotal * 0.1;
    total -= descuento;
    lineas.push(["Descuento 10 %", -descuento]);
  }
  if (checkDomicilio.checked && subtotal > 0) {
    total += 20000;
    lineas.push(["Visita a domicilio", 20000]);
  }

  detalle.innerHTML = lineas.length
    ? lineas.map(([texto, monto]) => `<li><span>${texto}</span><span>${fmt(monto)}</span></li>`).join("")
    : '<li class="muted">Selecciona al menos un servicio.</li>';
  totalEl.textContent = fmt(total);
  cotizacionActual = { total, lineas, servicios: elegidos };
}

[...checksServicios, inputEquipos, checkDomicilio].forEach(el => el.addEventListener("input", calcular));
calcular();

// Limitar el número de equipos entre 1 y 20 (también lo que se ve en el campo)
inputEquipos.addEventListener("input", () => {
  if (inputEquipos.value === "") return;
  const n = parseInt(inputEquipos.value, 10);
  inputEquipos.value = Math.min(20, Math.max(1, Number.isNaN(n) ? 1 : n));
  calcular();
});

inputEquipos.addEventListener("blur", () => {
  if (inputEquipos.value === "") {
    inputEquipos.value = 1;
    calcular();
  }
});

// Bloquear caracteres que no son dígitos (e, +, -, punto, coma)
inputEquipos.addEventListener("keydown", e => {
  if (["e", "E", "+", "-", ".", ","].includes(e.key)) e.preventDefault();
});

document.getElementById("btn-cotizar").addEventListener("click", () => {
  if (!cotizacionActual.servicios.length) {
    detalle.innerHTML = '<li class="muted">Primero selecciona al menos un servicio.</li>';
    return;
  }
  const resumen = cotizacionActual.lineas.map(([t]) => t).join(", ");
  document.getElementById("servicio").value = cotizacionActual.servicios[0].dataset.form;
  document.getElementById("mensaje").value =
    `Quiero solicitar esta cotización: ${resumen}. Total aproximado: ${fmt(cotizacionActual.total)}.`;
  location.hash = "#contacto";
});

// Modo claro / oscuro
const raiz = document.documentElement;
const botonTema = document.getElementById("tema");

function aplicarTema(tema) {
  raiz.dataset.theme = tema;
  botonTema.setAttribute("aria-label", tema === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
  botonTema.setAttribute("aria-pressed", String(tema === "dark"));
}

let temaGuardado = null;
try { temaGuardado = localStorage.getItem("tema"); } catch (e) { /* sin almacenamiento */ }
const prefiereOscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
aplicarTema(temaGuardado || (prefiereOscuro ? "dark" : "light"));

botonTema.addEventListener("click", () => {
  const nuevo = raiz.dataset.theme === "dark" ? "light" : "dark";
  aplicarTema(nuevo);
  try { localStorage.setItem("tema", nuevo); } catch (e) { /* ignorar */ }
});

// Menú desplegable (celular)
const menu = document.getElementById("menu");
const botonMenu = document.getElementById("menu-btn");

function alternarMenu(abrir) {
  menu.classList.toggle("abierto", abrir);
  botonMenu.setAttribute("aria-expanded", String(abrir));
  botonMenu.setAttribute("aria-label", abrir ? "Cerrar menú" : "Abrir menú");
}

botonMenu.addEventListener("click", () => alternarMenu(!menu.classList.contains("abierto")));
menu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => alternarMenu(false)));
document.addEventListener("keydown", e => { if (e.key === "Escape") alternarMenu(false); });
