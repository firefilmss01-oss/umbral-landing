// ============================================================
// UMBRAL · Home
// Orquesta la página: el nombre de la empresa, la puerta de la nav,
// las puertas de servicios, el FAQ, el formulario y los parámetros
// de campaña. Las animaciones de scroll viven en motor-scroll.js
// y la lógica de cada escena en escenas.js.
// ============================================================

import { iniciarMotor, escalarPalcos, doorD, clamp, reducirMovimiento } from './motor-scroll.js';
import { crearEscenas, construirFeed, construirCeldas } from './escenas.js';

// ============================================================
// 1 · CONFIGURACIÓN — rellenar antes de publicar
// Todo lo que falta por recibir está aquí. Los [placeholders] del
// HTML se quedan a la vista a propósito hasta que se rellenen.
// ============================================================

const CONFIG = {
  // Enlaces de contacto y legales. En cuanto tengan valor, sustituyen
  // automáticamente el href y el texto de los [placeholders] del footer.
  enlaces: {
    email: null,        // ej.: 'mailto:hola@umbral.es'
    whatsapp: null,     // ej.: 'https://wa.me/34600000000'
    instagram: null,    // ej.: 'https://instagram.com/umbral'
    linkedin: null,     // ej.: 'https://linkedin.com/company/umbral'
    privacidad: null,   // ej.: '/politica-de-privacidad'
    'aviso-legal': null,
    cookies: null,
  },

  // Texto visible de los enlaces del footer cuando ya hay URL.
  etiquetas: {
    email: 'hola@umbral.es',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
  },

  // ⚠️ PUNTO ÚNICO DE INTEGRACIÓN DEL FORMULARIO
  // Mientras valga null, el formulario sólo valida y muestra el panel de
  // automatización (no envía nada). Para conectarlo de verdad, pon aquí
  // la URL del endpoint (Formspree, Web3Forms, un webhook de n8n/Make…)
  // y `enviarLead()` hará el POST con los datos del formulario.
  endpointFormulario: null,
};

// ============================================================
// 2 · Medición (README §9)
// Empuja los eventos a dataLayer / gtag si existen. Si no hay ninguna
// herramienta instalada, no hace nada.
// ============================================================

function medir(evento, datos = {}) {
  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event: evento, ...datos });
  }
  if (typeof window.gtag === 'function') {
    window.gtag('event', evento, datos);
  }
}

// ============================================================
// 3 · El nombre de la empresa
// Aparece en la placa de la puerta, en las 7 escenas, en el formulario
// y en el panel post-envío. Sin nombre: "Tu Empresa".
// ============================================================

const CLAVE_NOMBRE = 'umbral-home-name';
const NOMBRE_POR_DEFECTO = 'Tu Empresa';

let nombreBruto = '';

const obtenerNombre = () => nombreBruto.trim() || NOMBRE_POR_DEFECTO;

const destinosNombre = [...document.querySelectorAll('[data-nombre]')];
const destinosMayus = [...document.querySelectorAll('[data-nombre-mayus]')];
const camposNombre = [...document.querySelectorAll('[data-nombre-input]')];

function pintarNombre() {
  const n = obtenerNombre();
  for (const el of destinosNombre) {
    if (el.textContent !== n) el.textContent = n;
  }
  const mayus = n.toUpperCase();
  for (const el of destinosMayus) {
    if (el.textContent !== mayus) el.textContent = mayus;
  }
}

function fijarNombre(valor, origen) {
  nombreBruto = valor;
  pintarNombre();

  // Los dos campos (hero y formulario) se mantienen sincronizados.
  for (const campo of camposNombre) {
    if (campo !== origen && campo.value !== valor) campo.value = valor;
  }

  try {
    localStorage.setItem(CLAVE_NOMBRE, valor);
  } catch (e) {
    /* modo privado o almacenamiento bloqueado: seguimos sin persistir */
  }
}

// Recupera el nombre de una visita anterior.
try {
  const guardado = localStorage.getItem(CLAVE_NOMBRE);
  if (guardado) nombreBruto = guardado;
} catch (e) {
  /* sin localStorage */
}

for (const campo of camposNombre) {
  campo.value = nombreBruto;
  campo.addEventListener('input', e => {
    fijarNombre(e.target.value, e.target);
    if (!campo.dataset.medido && e.target.value.trim()) {
      campo.dataset.medido = '1';
      medir('name_typed');
    }
  });
}

pintarNombre();

// ============================================================
// 4 · Parámetros de campaña (README §7)
// ?s=posicionamiento|web|branding|automatizacion · ?n=reformas
// Cambian el H1 y el destino de "Cruzar el umbral".
// ============================================================

const TITULARES = {
  posicionamiento: ['¿Tu empresa no aparece en Google?', 'posicionamiento'],
  web: ['Tu web debería traerte clientes.', 'webs'],
  branding: ['Tu empresa trabaja mejor de lo que parece.', 'branding'],
  automatizacion: ['Deja de perder clientes por no responder a tiempo.', 'automatizacion'],
};

let destinoCruzar = 'historia';

(function aplicarVariante() {
  const q = new URLSearchParams(location.search);
  const s = q.get('s');
  const n = q.get('n');

  let titular = null;
  if (s && TITULARES[s]) {
    titular = TITULARES[s][0];
    destinoCruzar = TITULARES[s][1];
  } else if (n === 'reformas') {
    titular = 'Más presupuestos para tu empresa de reformas.';
    destinoCruzar = 'historia';
  }
  if (!titular) return;

  const h1 = document.querySelector('[data-h1]');
  if (!h1) return;

  // Una frase por línea; la última va en naranja (lo hace el CSS).
  const frases = titular.split(/(?<=\.)\s+/);
  h1.textContent = '';
  for (const frase of frases) {
    const span = document.createElement('span');
    span.textContent = frase;
    h1.appendChild(span);
  }
})();

// ============================================================
// 5 · Hero: el ratón y "Cruzar el umbral"
// ============================================================

const hero = document.getElementById('inicio');
const temporizadores = [];

function cruzarElUmbral() {
  const destino = document.getElementById(destinoCruzar) || document.getElementById('historia');
  if (!hero || !destino) return;

  medir('cross_clicked', { destino: destinoCruzar });

  // Con movimiento reducido, sólo el scroll.
  if (reducirMovimiento()) {
    destino.scrollIntoView();
    return;
  }

  hero.style.setProperty('--cross', '1');
  temporizadores.push(
    // La puerta se abre del todo y el palco escala ×3,6 (1.4s);
    // a los 650ms arranca el scroll, con la puerta aún abriéndose.
    setTimeout(() => window.scrollTo({ top: destino.offsetTop, behavior: 'smooth' }), 650),
    // A los 2.4s el hero ya está fuera de pantalla: se resetea.
    setTimeout(() => hero.style.setProperty('--cross', '0'), 2400)
  );
}

if (hero) {
  const botonCruzar = hero.querySelector('[data-cross]');
  if (botonCruzar) botonCruzar.addEventListener('click', cruzarElUmbral);

  const campoHero = hero.querySelector('[data-nombre-input]');
  if (campoHero) {
    campoHero.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        cruzarElUmbral();
      }
    });
  }

  // La puerta sigue al ratón. Sólo en punteros finos: en táctil no aporta
  // nada y evitamos escribir la variable en cada scroll con el dedo.
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reducirMovimiento()) {
    let rafRaton = 0;
    let mxPendiente = 0;

    hero.addEventListener(
      'mousemove',
      e => {
        const r = hero.getBoundingClientRect();
        mxPendiente = clamp((e.clientX - r.left) / r.width);
        if (rafRaton) return;
        rafRaton = requestAnimationFrame(() => {
          rafRaton = 0;
          hero.style.setProperty('--mx', mxPendiente.toFixed(3));
        });
      },
      { passive: true }
    );
  }
}

// ============================================================
// 6 · Nav: la puerta de progreso y el botón fijo
// La puerta del logo abre de 0 a 100% entre el inicio de #historia
// y el final de #despues.
// ============================================================

const puertaNav = document.querySelector('[data-navdoor]');
const botonFijo = document.querySelector('[data-sticky]');
const seccionHistoria = document.getElementById('historia');
const seccionDespues = document.getElementById('despues');

let ultimoD = '';
let ultimoVisible = null;

function actualizarNav() {
  if (!seccionHistoria || !seccionDespues) return;

  const vh = window.innerHeight;
  const y = window.scrollY;
  const inicio = seccionHistoria.offsetTop - vh * 0.3;
  const fin = seccionDespues.offsetTop + seccionDespues.offsetHeight - vh;
  const progreso = clamp((y - inicio) / Math.max(1, fin - inicio));

  if (puertaNav) {
    const d = doorD(progreso);
    if (d !== ultimoD) {
      ultimoD = d;
      puertaNav.setAttribute('d', d);
    }
  }

  if (botonFijo) {
    const visible =
      y > seccionHistoria.offsetTop - vh * 0.2 &&
      y < seccionDespues.offsetTop + seccionDespues.offsetHeight - vh * 0.6;
    if (visible !== ultimoVisible) {
      ultimoVisible = visible;
      botonFijo.dataset.visible = visible ? '1' : '0';
    }
  }
}

// ============================================================
// 7 · Nav móvil
// ============================================================

(function navMovil() {
  const boton = document.querySelector('.nav__hamburguesa');
  const panel = document.getElementById('nav-enlaces');
  if (!boton || !panel) return;

  const cerrar = () => {
    boton.setAttribute('aria-expanded', 'false');
    boton.setAttribute('aria-label', 'Abrir el menú');
    delete panel.dataset.abierto;
  };

  boton.addEventListener('click', () => {
    const abierto = boton.getAttribute('aria-expanded') === 'true';
    if (abierto) {
      cerrar();
    } else {
      boton.setAttribute('aria-expanded', 'true');
      boton.setAttribute('aria-label', 'Cerrar el menú');
      panel.dataset.abierto = '1';
    }
  });

  // Al elegir un destino, el panel se cierra.
  panel.addEventListener('click', e => {
    if (e.target.closest('a')) cerrar();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') cerrar();
  });
})();

// ============================================================
// 8 · Servicios: las 5 puertas
// Hover en escritorio, tap en móvil. Una abierta a la vez.
// ============================================================

(function puertasServicios() {
  const servicios = [...document.querySelectorAll('[data-servicio]')];
  if (!servicios.length) return;

  const hayHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const abrir = servicio => {
    for (const otro of servicios) {
      if (otro !== servicio) delete otro.dataset.abierta;
    }
    servicio.dataset.abierta = '1';
    medir('service_door_opened', { servicio: servicio.querySelector('.servicio__num').textContent });
  };

  servicios.forEach(servicio => {
    const cta = servicio.querySelector('.servicio__cta');

    if (hayHover) {
      servicio.addEventListener('mouseenter', () => abrir(servicio));
      servicio.addEventListener('mouseleave', () => delete servicio.dataset.abierta);
      // Con teclado: al enfocar el CTA, la puerta se abre.
      if (cta) {
        cta.addEventListener('focus', () => abrir(servicio));
      }
    }

    servicio.addEventListener('click', e => {
      const esCta = e.target.closest('.servicio__cta');
      const abierta = servicio.dataset.abierta === '1';

      // En táctil, con la puerta cerrada el primer toque la abre —
      // aunque caiga sobre el CTA, que está debajo.
      if (!hayHover && !abierta) {
        if (esCta) e.preventDefault();
        abrir(servicio);
        return;
      }

      if (esCta) {
        // Preselecciona "¿Qué necesitas?" en el formulario.
        const necesidad = servicio.dataset.need;
        if (necesidad) elegirNecesidad(necesidad);
        medir('service_cta', { servicio: servicio.querySelector('.servicio__num').textContent });
        return;
      }

      if (!hayHover) delete servicio.dataset.abierta;
    });
  });

  // En táctil las 5 puertas llegan cerradas y los precios quedan detrás de
  // un toque. Abrimos la primera al entrar en pantalla para que se vea que
  // las puertas se abren; las demás siguen a un toque.
  if (!hayHover && 'IntersectionObserver' in window) {
    const observador = new IntersectionObserver(
      entradas => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          abrir(entrada.target);
          observador.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observador.observe(servicios[0]);
  }
})();

// ============================================================
// 9 · FAQ: acordeón, una abierta a la vez
// ============================================================

(function faq() {
  const lista = document.querySelector('[data-faq]');
  if (!lista) return;

  const botones = [...lista.querySelectorAll('.faq__boton')];

  lista.addEventListener('click', e => {
    const boton = e.target.closest('.faq__boton');
    if (!boton) return;

    const abierta = boton.getAttribute('aria-expanded') === 'true';

    for (const otro of botones) {
      const cuerpo = document.getElementById(otro.getAttribute('aria-controls'));
      const abrirEsta = otro === boton && !abierta;
      otro.setAttribute('aria-expanded', abrirEsta ? 'true' : 'false');
      if (cuerpo) {
        if (abrirEsta) cuerpo.dataset.abierta = '1';
        else delete cuerpo.dataset.abierta;
      }
    }
  });
})();

// ============================================================
// 10 · Formulario de contacto
// ============================================================

const formulario = document.querySelector('[data-form]');
const campoNecesidad = document.querySelector('[data-necesidad]');

function elegirNecesidad(valor) {
  const chips = [...document.querySelectorAll('[data-chips] .chip')];
  for (const chip of chips) {
    chip.setAttribute('aria-pressed', chip.textContent.trim() === valor ? 'true' : 'false');
  }
  if (campoNecesidad) campoNecesidad.value = valor;

  const campo = document.querySelector('[data-chips-campo]');
  if (campo) delete campo.dataset.invalido;
}

(function chips() {
  const grupo = document.querySelector('[data-chips]');
  if (!grupo) return;
  grupo.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (chip) elegirNecesidad(chip.textContent.trim());
  });
})();

/**
 * ⚠️ PUNTO ÚNICO DE INTEGRACIÓN
 * Conecta el lead con el CRM / WhatsApp / Radar.
 * Hoy, sin endpoint configurado, no envía nada: el formulario sólo valida
 * y el panel de automatización se muestra igualmente.
 */
async function enviarLead(datos) {
  if (!CONFIG.endpointFormulario) return { simulado: true };

  const respuesta = await fetch(CONFIG.endpointFormulario, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(datos),
  });

  if (!respuesta.ok) throw new Error('El envío falló: ' + respuesta.status);
  return respuesta.json().catch(() => ({}));
}

if (formulario) {
  const panelFlujo = document.querySelector('[data-flujo]');

  const marcarCampo = (campo, invalido) => {
    if (!campo) return;
    if (invalido) campo.dataset.invalido = '1';
    else delete campo.dataset.invalido;
  };

  formulario.addEventListener('submit', async e => {
    e.preventDefault();

    // Validación propia, para no depender del popup del navegador.
    let primerError = null;

    /** @param {Element} campo el .campo que se marca · @param {boolean} valido */
    const comprobar = (campo, valido) => {
      marcarCampo(campo, !valido);
      if (!valido && !primerError) primerError = campo;
    };

    const empresa = formulario.querySelector('#f-empresa');
    const whatsapp = formulario.querySelector('#f-whatsapp');
    const rgpd = formulario.querySelector('[name="rgpd"]');

    comprobar(empresa.closest('.campo'), !!empresa.value.trim());
    comprobar(
      formulario.querySelector('[data-chips-campo]'),
      !!(campoNecesidad && campoNecesidad.value)
    );
    comprobar(whatsapp.closest('.campo'), whatsapp.value.trim().length >= 6);
    comprobar(rgpd.closest('.campo'), rgpd.checked);

    if (primerError) {
      const foco = primerError.querySelector('input');
      if (foco) foco.focus();
      return;
    }

    const datos = {
      empresa: empresa.value.trim(),
      web: formulario.querySelector('#f-web').value.trim(),
      necesidad: campoNecesidad.value,
      whatsapp: whatsapp.value.trim(),
      origen: location.search || '(directo)',
    };

    medir('form_submit', { necesidad: datos.necesidad });

    try {
      await enviarLead(datos);
    } catch (error) {
      // El lead no se pierde en silencio: lo decimos y dejamos reintentar.
      console.error('[umbral] no se pudo enviar el lead', error);
      const aviso = formulario.querySelector('.contacto__pie span');
      if (aviso) {
        aviso.textContent =
          'No hemos podido enviarlo. Escríbenos por WhatsApp y lo resolvemos.';
        aviso.style.color = '#C1290B';
      }
      return;
    }

    // El propio sitio demuestra la automatización: 4 pasos cada 650ms.
    formulario.hidden = true;
    if (!panelFlujo) return;

    panelFlujo.hidden = false;
    const pasos = [...panelFlujo.querySelectorAll('.flujo__paso')];
    pasos.forEach((paso, i) => {
      temporizadores.push(
        setTimeout(() => {
          paso.dataset.encendido = '1';
        }, (i + 1) * 650)
      );
    });
  });
}

// ============================================================
// 11 · Enlaces pendientes
// Mientras CONFIG.enlaces siga en null, los [placeholders] quedan a la
// vista y el enlace no lleva a ninguna parte (así no se publica un href
// roto por descuido).
// ============================================================

(function enlaces() {
  for (const el of document.querySelectorAll('[data-enlace]')) {
    const clave = el.dataset.enlace;
    const url = CONFIG.enlaces[clave];

    if (!url) {
      el.setAttribute('aria-disabled', 'true');
      el.addEventListener('click', e => e.preventDefault());
      continue;
    }

    el.href = url;
    if (/^https?:/.test(url)) {
      el.target = '_blank';
      el.rel = 'noopener';
    }
    // Sólo cambiamos el texto de los [placeholders] del footer.
    const etiqueta = CONFIG.etiquetas[clave];
    if (etiqueta && el.textContent.trim().startsWith('[')) el.textContent = etiqueta;

    if (clave === 'whatsapp') {
      el.addEventListener('click', () => medir('whatsapp_click'));
    }
  }
})();

// ============================================================
// 12 · Las puertas de "Cómo trabajamos" (2 / 33 / 66 / 100%)
// ============================================================

for (const path of document.querySelectorAll('[data-door]')) {
  path.setAttribute('d', doorD(+path.dataset.door));
}

// ============================================================
// 13 · Medición: scene_reached (1–7)
// ============================================================

(function escenasVistas() {
  const ids = ['historia', 'branding', 'webs', 'posicionamiento', 'publicidad', 'automatizacion', 'despues'];
  if (!('IntersectionObserver' in window)) return;

  const observador = new IntersectionObserver(
    entradas => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        const n = ids.indexOf(entrada.target.id) + 1;
        medir('scene_reached', { escena: n });
        observador.unobserve(entrada.target);
      }
    },
    { threshold: 0.35 }
  );

  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) observador.observe(el);
  }
})();

// ============================================================
// 14 · Arranque
// ============================================================

construirFeed();
construirCeldas();

iniciarMotor(crearEscenas(obtenerNombre), actualizarNav);

// Las imágenes y las fuentes cambian las alturas: un reajuste al terminar
// de cargar evita palcos mal escalados en la primera pintada.
window.addEventListener('load', escalarPalcos);
