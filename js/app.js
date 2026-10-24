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
    email: 'mailto:umbralcontactoes@gmail.com',
    whatsapp: 'https://wa.me/34617492565',
    instagram: 'https://www.instagram.com/umbralcreative.es/',
    linkedin: null,     // ej.: 'https://linkedin.com/company/umbral'
    privacidad: 'politica-de-privacidad.html',
    'aviso-legal': null,
    cookies: 'politica-de-cookies.html',
  },

  // Texto visible de los enlaces del footer cuando ya hay URL.
  etiquetas: {
    email: 'umbralcontactoes@gmail.com',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
  },

  // ⚠️ PUNTO ÚNICO DE INTEGRACIÓN DEL FORMULARIO
  // Mientras valga null, el formulario sólo valida y muestra el panel de
  // automatización (no envía nada). Para conectarlo de verdad, pon aquí
  // la URL del endpoint (Formspree, Web3Forms, un webhook de n8n/Make…)
  // y `enviarLead()` hará el POST con los datos del formulario.
  endpointFormulario: 'https://api.web3forms.com/submit',

  // Clave de acceso de Web3Forms (formulario "Umbral Creative · Landing").
  // Es pública por diseño: sólo permite enviar al correo registrado.
  claveFormulario: '7c553ef3-9921-4d93-93d0-40e9bba178cc',

  // Sistema Umbral: el lead entra en la Central y en la línea de tiempo del
  // cliente. Va en paralelo con el correo; basta que uno funcione.
  endpointSistema: 'https://jqwvayxbzwdsrgjwftjl.supabase.co/functions/v1/receber-lead',

  // Dataset (antes "pixel") de Meta para umbralcreative.com. Es público: aparece en el código
  // de cualquier web que lo use. null lo apaga por completo, aviso de cookies incluido.
  pixelMeta: '1098476749847345',
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
// 2b · Cookies y Meta Pixel
// El pixel nace revocado en el <head>. Aquí sólo se concede el permiso si la persona lo acepta,
// y se guarda la decisión para no volver a preguntar. Rechazar deja el pixel mudo para siempre
// (hasta que lo cambie desde la política de cookies).
// ============================================================

const COOKIES_CLAVE = 'umbral.consentimiento';
const COOKIES_MESES = 6;

function leerConsentimiento() {
  try {
    const v = JSON.parse(localStorage.getItem(COOKIES_CLAVE) || 'null');
    if (!v || !v.fecha) return null;
    // Caducado: volvemos a preguntar, como pide el RGPD.
    if (Date.now() - v.fecha > COOKIES_MESES * 30 * 864e5) return null;
    return v.acepta === true;
  } catch { return null; }
}

function guardarConsentimiento(acepta) {
  try { localStorage.setItem(COOKIES_CLAVE, JSON.stringify({ acepta, fecha: Date.now() })); } catch { /* sin almacenamiento */ }
}

/** Id único por evento: el navegador y el servidor mandan el MISMO, y Meta los cuenta una sola vez. */
function idEvento() {
  try { return crypto.randomUUID(); } catch { return 'ev-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10); }
}

const pixelListo = () => typeof window.fbq === 'function';

/** Un evento del pixel. Sin permiso no hay fbq, así que no hace nada y no sale ninguna petición. */
function pixel(evento, datos = {}, idUnico) {
  if (!pixelListo()) return;
  window.fbq('track', evento, datos, idUnico ? { eventID: idUnico } : undefined);
}

/** Carga el pixel. Se llama SÓLO con permiso: hasta aquí el navegador nunca contactó con Meta. */
function concederPixel() {
  if (!CONFIG.pixelMeta || pixelListo()) return;
  /* eslint-disable */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(
    window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  window.fbq('init', CONFIG.pixelMeta);
  window.fbq('track', 'PageView');
}

(function cookies() {
  const aviso = document.querySelector('[data-cookies]');
  const decidido = leerConsentimiento();

  if (decidido === true) concederPixel();
  else if (decidido === null && aviso) aviso.hidden = false;   // sin decisión: preguntamos

  const responder = (acepta) => {
    guardarConsentimiento(acepta);
    if (aviso) aviso.hidden = true;
    if (acepta) concederPixel();
    medir('consentimiento_cookies', { acepta });
  };

  aviso?.querySelector('[data-cookies-aceptar]')?.addEventListener('click', () => responder(true));
  aviso?.querySelector('[data-cookies-rechazar]')?.addEventListener('click', () => responder(false));

  // Botón "cambiar mis preferencias" de la política de cookies.
  document.querySelector('[data-abrir-cookies]')?.addEventListener('click', () => {
    try { localStorage.removeItem(COOKIES_CLAVE); } catch { /* sin almacenamiento */ }
    location.href = 'index.html';
  });
})();

// ViewContent: llegó hasta los servicios y precios. Separa a quien mira la portada de quien
// se interesó de verdad — y de ahí salen los públicos que valen la pena.
(function verPrecios() {
  const seccion = document.querySelector('#servicios');
  if (!seccion || typeof IntersectionObserver !== 'function') return;
  let visto = false;
  const obs = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (!e.isIntersecting || visto) continue;
      visto = true;
      obs.disconnect();
      pixel('ViewContent', { content_name: 'servicios y precios', content_category: 'umbralcreative' });
      medir('ver_precios');
    }
  }, { threshold: 0.4 });
  obs.observe(seccion);
})();

// Contact: se fue por WhatsApp en vez del formulario. También es un lead, por otro camino.
document.addEventListener('click', (e) => {
  const enlace = e.target.closest('a[href*="wa.me"], a[data-enlace="whatsapp"]');
  if (!enlace) return;
  pixel('Contact', { content_name: 'whatsapp', content_category: 'umbralcreative' });
  medir('clic_whatsapp');
});

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

/** Marca un chip dentro de su grupo y guarda el valor en el campo oculto. */
function elegirChip(grupoNombre, valor) {
  const grupo = document.querySelector(`[data-chips="${grupoNombre}"]`);
  if (!grupo) return;
  for (const chip of grupo.querySelectorAll('.chip')) {
    chip.setAttribute('aria-pressed', chip.textContent.trim() === valor ? 'true' : 'false');
  }
  const oculto = document.querySelector(`[data-${grupoNombre}]`);
  if (oculto) oculto.value = valor;
}

// Se llama desde las tarjetas de servicio, que llevan su necesidad en data-need.
function elegirNecesidad(valor) {
  elegirChip('necesidad', valor);
  const campo = document.querySelector('[data-chips-campo]');
  if (campo) delete campo.dataset.invalido;
}

(function chips() {
  for (const grupo of document.querySelectorAll('[data-chips]')) {
    grupo.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const nombre = grupo.dataset.chips;
      if (nombre === 'necesidad') elegirNecesidad(chip.textContent.trim());
      else elegirChip(nombre, chip.textContent.trim());
    });
  }
})();

// Contador del área de texto: enseña cuánto espacio queda, sin regañar.
(function contadorMensaje() {
  const area = document.querySelector('#f-mensaje');
  const cuenta = document.querySelector('[data-contador]');
  if (!area || !cuenta) return;
  const pintar = () => { cuenta.textContent = `${area.value.length}/${area.maxLength}`; };
  area.addEventListener('input', pintar);
  pintar();
})();

/**
 * ⚠️ PUNTO ÚNICO DE INTEGRACIÓN
 * Conecta el lead con el CRM / WhatsApp / Radar.
 * Hoy, sin endpoint configurado, no envía nada: el formulario sólo valida
 * y el panel de automatización se muestra igualmente.
 */
async function enviarLead(datos) {
  const envios = [];
  if (CONFIG.endpointFormulario) envios.push(enviarCorreo(datos));
  if (CONFIG.endpointSistema) envios.push(enviarSistema(datos));
  if (!envios.length) return { simulado: true };

  // El lead sólo se pierde si fallan los dos caminos.
  const resultados = await Promise.allSettled(envios);
  const fallos = resultados.filter(r => r.status === 'rejected');
  fallos.forEach(r => console.error('[umbral] un envío del lead falló', r.reason));
  if (fallos.length === resultados.length) throw fallos[0].reason;
  return resultados.find(r => r.status === 'fulfilled').value;
}

async function enviarSistema(datos) {
  const respuesta = await fetch(CONFIG.endpointSistema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ formulario: 'contacto', ...datos }),
  });
  const resultado = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || !resultado.ok) {
    throw new Error('Sistema: ' + (resultado.erro || respuesta.status));
  }
  return resultado;
}

async function enviarCorreo(datos) {
  // Web3Forms exige la clave dentro del cuerpo; asunto y remitente ordenan el correo.
  const cuerpo = CONFIG.claveFormulario
    ? {
        access_key: CONFIG.claveFormulario,
        subject: 'Nuevo lead · ' + datos.empresa + ' · ' + datos.nombre + ' · ' + datos.necesidad,
        from_name: 'Landing umbralcreative.com',
        ...datos,
      }
    : datos;

  const respuesta = await fetch(CONFIG.endpointFormulario, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(cuerpo),
  });

  const resultado = await respuesta.json().catch(() => ({}));
  // Web3Forms puede responder con { success: false } y el motivo en `message`.
  if (!respuesta.ok || resultado.success === false) {
    throw new Error('El envío falló: ' + (resultado.message || respuesta.status));
  }
  return resultado;
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

    const nombre = formulario.querySelector('#f-nombre');
    const empresa = formulario.querySelector('#f-empresa');
    const whatsapp = formulario.querySelector('#f-whatsapp');
    const email = formulario.querySelector('#f-email');
    const mensaje = formulario.querySelector('#f-mensaje');
    const cuando = formulario.querySelector('[data-cuando]');
    const rgpd = formulario.querySelector('[name="rgpd"]');

    const tel = whatsapp.value.trim();
    const correo = email.value.trim();
    const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

    comprobar(nombre.closest('.campo'), !!nombre.value.trim());
    comprobar(empresa.closest('.campo'), !!empresa.value.trim());
    comprobar(
      formulario.querySelector('[data-chips-campo]'),
      !!(campoNecesidad && campoNecesidad.value)
    );
    // Con un contacto basta, pero si escribe un email tiene que ser un email.
    comprobar(
      formulario.querySelector('[data-contacto-campo]'),
      (tel.length >= 6 || correoValido) && (!correo || correoValido)
    );
    comprobar(rgpd.closest('.campo'), rgpd.checked);

    if (primerError) {
      const foco = primerError.querySelector('input, textarea');
      if (foco) foco.focus();
      return;
    }

    const datos = {
      nombre: nombre.value.trim(),
      empresa: empresa.value.trim(),
      web: formulario.querySelector('#f-web').value.trim(),
      necesidad: campoNecesidad.value,
      cuando: cuando ? cuando.value : '',
      mensaje: mensaje.value.trim(),
      whatsapp: tel,
      email: correo,
      origen: location.search || '(directo)',
      // Mismo id para el pixel (navegador) y para la API de Conversiones (servidor):
      // así Meta cuenta UN lead, no dos.
      event_id: idEvento(),
      // Trampa para robots: si viene rellena, el servidor descarta el envío.
      botcheck: formulario.querySelector('[name="botcheck"]').value,
    };

    medir('form_submit', { necesidad: datos.necesidad, con_mensaje: datos.mensaje.length > 0 });

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

    // Lead SÓLO aquí: el envío ya salió bien. Dispararlo en el clic contaría leads que no existieron
    // y la campaña optimizaría hacia gente que nunca llegó a enviar.
    pixel('Lead', { content_name: datos.necesidad || 'formulario', content_category: 'umbralcreative' }, datos.event_id);

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
