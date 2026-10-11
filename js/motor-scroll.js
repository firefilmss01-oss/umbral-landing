// ============================================================
// UMBRAL · motor de scroll
// Un solo listener de scroll (pasivo) + requestAnimationFrame.
// Para cada [data-scene] visible calcula un progreso p ∈ [0,1] y lo
// escribe como custom properties en la sección. Los hijos animan sólo
// con calc(var(--…)): nada se vuelve a renderizar.
//
// Modos (atributo data-mode):
//   (sin atributo) sección fijada con sticky
//   "leave"  el hero: la puerta se abre al salir
//   "enter"  bloques normales: entran al aparecer en pantalla
//
// Sin dependencias. ES module.
// ============================================================

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

/** smoothstep: 0 antes de la ventana, sube suave dentro, 1 después. */
export const ss = x => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};

export const reducirMovimiento = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Sector de la puerta del símbolo (viewBox 0 0 110 100) para una fracción f.
 * Bisagra en (31,100), radio 78 × 100. Longitud del arco completo: 141.
 */
export function doorD(f) {
  f = clamp(f);
  if (f >= 0.999) return 'M27 0 L31 0 A78 100 0 0 1 109 100 L27 100 Z';
  if (f <= 0.001) return 'M31 100 Z';
  const t = (f * Math.PI) / 2;
  const x = 31 + 78 * Math.cos(t);
  const y = 100 - 100 * Math.sin(t);
  return `M31 100 L109 100 A78 100 0 0 0 ${x.toFixed(2)} ${y.toFixed(2)} Z`;
}

/**
 * Cada palco tiene un tamaño de diseño fijo (data-w × data-h) y se escala
 * con --k = min(ancho/w, alto/h). Nunca se refluye: sólo se escala.
 *
 * Además resuelve el layout apilado (< ~1000px): el texto queda arriba y
 * el palco ocupa la altura restante, que hay que calcular aquí porque
 * depende del alto real del texto.
 */
export function escalarPalcos() {
  const palcos = document.querySelectorAll('[data-stage]');

  for (const el of palcos) {
    const w = +el.dataset.w;
    const h = +el.dataset.h;
    const caja = el.parentElement;

    if (caja && getComputedStyle(caja).position === 'sticky') {
      // Reset antes de medir, si no arrastramos el valor del frame anterior.
      el.style.height = '';
      el.style.minHeight = '';
      caja.style.alignContent = '';

      const apilado = el.offsetTop > 140;

      // En pantallas bajas el párrafo de la escena estorba (README §6).
      for (const p of caja.querySelectorAll('.parrafo')) {
        p.style.display = apilado && window.innerHeight < 760 ? 'none' : '';
      }

      if (apilado) {
        caja.style.alignContent = 'start';
        el.style.height = '0px';
        el.style.minHeight = '0';
        const padInferior = parseFloat(getComputedStyle(caja).paddingBottom) || 0;
        const disponible =
          caja.getBoundingClientRect().bottom - padInferior - el.getBoundingClientRect().top;
        el.style.height = Math.max(160, disponible) + 'px';
      }
    }

    const k = Math.min(el.clientWidth / w, el.clientHeight / h);
    if (k > 0) el.style.setProperty('--k', k.toFixed(4));
  }
}

/**
 * Arranca el motor.
 *
 * @param {Object} escenas  mapa data-scene → función(el, p, cache)
 *                          para lo que no se puede hacer con CSS puro
 *                          (texto escrito letra a letra, contadores,
 *                          reordenar una lista, clip-path, raíl horizontal).
 * @param {Function} [cadaFrame]  se llama una vez por frame, después de las
 *                          escenas (la puerta de la nav y el botón fijo
 *                          dependen del scroll pero no de una sola sección).
 * @returns {Function} detener()
 */
export function iniciarMotor(escenas = {}, cadaFrame = null) {
  // Con movimiento reducido las escenas no son sticky y el CSS ya las deja
  // en su estado final. Falta lo que no se puede hacer con CSS: el contador,
  // el texto escrito letra a letra, el clip-path… Se ejecuta una sola vez
  // con p = 1 para que cada escena quede también en su estado final.
  if (reducirMovimiento()) {
    escalarPalcos();

    const pintarFinal = () => {
      for (const el of document.querySelectorAll('[data-scene]')) {
        const fn = escenas[el.dataset.scene];
        if (fn) fn(el, 1, {});
      }
    };
    pintarFinal();
    // El raíl horizontal pasa a ser scroll nativo: no se mueve solo.
    const rail = document.querySelector('[data-track]');
    if (rail) rail.style.transform = '';

    window.addEventListener('resize', escalarPalcos);
    if (cadaFrame) cadaFrame();
    return () => window.removeEventListener('resize', escalarPalcos);
  }

  const secciones = [...document.querySelectorAll('[data-scene]')];

  // Una caché por escena: evita volver a consultar el DOM en cada frame
  // y guarda el último valor escrito de cada variable para no tocar el
  // estilo cuando no ha cambiado.
  const cachés = new WeakMap();
  const previos = new WeakMap();
  for (const el of secciones) {
    cachés.set(el, {});
    previos.set(el, {});
  }

  const escribir = (el, nombre, valor) => {
    const prev = previos.get(el);
    if (prev[nombre] === valor) return;
    prev[nombre] = valor;
    el.style.setProperty(nombre, valor);
  };

  let raf = 0;

  const frame = () => {
    raf = 0;
    const vh = window.innerHeight;

    for (const el of secciones) {
      const r = el.getBoundingClientRect();

      // Fuera de alcance: no gastamos nada en ella.
      if (r.bottom < -vh || r.top > vh * 2) continue;

      const modo = el.dataset.mode;
      let p;
      if (modo === 'leave') p = clamp(-r.top / Math.max(1, r.height * 0.8));
      else if (modo === 'enter') p = clamp((vh - r.top) / (vh * 0.9));
      else p = clamp(-r.top / Math.max(1, el.offsetHeight - vh));

      escribir(el, '--p', p.toFixed(4));
      for (let i = 1; i <= 6; i++) {
        escribir(el, '--s' + i, ss(p * 6 - (i - 1)).toFixed(4));
      }
      escribir(el, '--h1', ss(p * 2).toFixed(4));
      escribir(el, '--h2', ss(p * 2 - 1).toFixed(4));

      const fn = escenas[el.dataset.scene];
      if (fn) fn(el, p, cachés.get(el));
    }

    if (cadaFrame) cadaFrame();
  };

  const pedirFrame = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };

  const alRedimensionar = () => {
    escalarPalcos();
    // El layout cambió: las posiciones cacheadas y los valores previos ya
    // no sirven de referencia, pero p se recalcula solo en el frame.
    pedirFrame();
  };

  window.addEventListener('scroll', pedirFrame, { passive: true });
  window.addEventListener('resize', alRedimensionar);

  // Las fuentes y las imágenes cambian las alturas al cargar: unos pocos
  // reajustes durante los primeros segundos evitan palcos mal escalados.
  const arranque = setInterval(alRedimensionar, 400);
  setTimeout(() => clearInterval(arranque), 4000);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(alRedimensionar);
  }

  escalarPalcos();
  frame();

  return () => {
    window.removeEventListener('scroll', pedirFrame);
    window.removeEventListener('resize', alRedimensionar);
    clearInterval(arranque);
    if (raf) cancelAnimationFrame(raf);
  };
}
