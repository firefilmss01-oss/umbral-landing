// ============================================================
// UMBRAL · lógica por escena
// Aquí sólo vive lo que CSS no puede hacer: texto escrito letra a letra,
// contadores, reordenar una lista, clip-path, el raíl horizontal y las
// celdas que vuelan de la hoja de cálculo al panel.
// Todo lo demás (opacidades, transforms, recorridos) está en CSS.
// ============================================================

import { clamp, ss } from './motor-scroll.js';

const CONSULTA = 'reformas en Sevilla';
const PASO_FILA = 54; // px entre resultados de búsqueda

// ------------------------------------------------------------
// Decorado que se genera en JS para no inflar el HTML
// ------------------------------------------------------------

/** Las 3 columnas del feed de la escena 5: 7 posts cada una. */
export function construirFeed() {
  const anchos = ['60%', '45%', '70%', '52%'];

  document.querySelectorAll('[data-feed]').forEach((col, c) => {
    const frag = document.createDocumentFragment();

    for (let i = 0; i < 7; i++) {
      const post = document.createElement('div');
      post.className = 'ads__post';
      post.innerHTML =
        '<div class="ads__post-cabecera"><i></i><i></i></div>' +
        '<div class="ads__post-imagen"></div>' +
        '<div class="ads__post-pie"></div>';
      post.lastElementChild.style.width = anchos[(i + c) % 4];
      frag.appendChild(post);
    }

    col.appendChild(frag);
  });
}

/**
 * Las 10 celdas de la escena 6.
 * `a` = origen (rejilla de hoja de cálculo) · `b` = destino (panel).
 */
export const CELDAS = (() => {
  // Destinos: 3 KPIs, el gráfico y 6 filas de lista.
  const destinos = [
    [236, 300, 150, 74, '#EFEBE4', '#EFEBE4'],
    [396, 300, 150, 74, '#EFEBE4', '#EFEBE4'],
    [556, 300, 150, 74, '#FF5A1F', '#FF5A1F'],
    [236, 386, 310, 156, '#141414', '#3A3834'],
  ];
  for (let i = 0; i < 6; i++) {
    destinos.push([556, 386 + i * 27, 150, 22, i === 1 ? '#FF5A1F' : '#262524', i === 1 ? '#FF5A1F' : '#262524']);
  }

  const giros = [4, -6, 2, -3, 8, -2, 5, -7, 3, -4];

  return destinos.map((d, i) => {
    const col = i % 5;
    const fila = Math.floor(i / 5);
    return {
      a: [20 + col * 46 + (i % 3) * 3, 300 + fila * 30 + (i % 2) * 4, 44, 26],
      b: [d[0], d[1], d[2], d[3]],
      giro: giros[i % giros.length],
      fondo: d[4],
      borde: d[5],
    };
  });
})();

export function construirCeldas() {
  const caja = document.querySelector('[data-celdas]');
  if (!caja) return;

  const frag = document.createDocumentFragment();
  CELDAS.forEach((_, i) => {
    const c = document.createElement('div');
    c.className = 'auto__celda';
    c.dataset.celda = i;
    frag.appendChild(c);
  });
  caja.appendChild(frag);
}

// ------------------------------------------------------------
// Las escenas
// `cache` es un objeto por escena donde guardamos las referencias al DOM
// y el último valor escrito, para no consultar ni tocar nada de más.
// ------------------------------------------------------------

export function crearEscenas(obtenerNombre) {
  return {
    // --- Escena 1 · El antes: el contador de mensajes sin responder ---
    antes(el, p, cache) {
      if (!cache.contador) cache.contador = el.querySelector('[data-count]');
      if (!cache.contador) return;

      const v = Math.round(3 + ss((p - 0.55) / 0.4) * 9);
      if (cache.v !== v) {
        cache.v = v;
        cache.contador.textContent = v;
      }
    },

    // --- Escena 4 · Posicionamiento: búsqueda, ranking y respuesta de IA ---
    seo(el, p, cache) {
      if (!cache.listo) {
        cache.consulta = el.querySelector('[data-query]');
        cache.cliente = el.querySelector('[data-row="c"]');
        cache.rank = el.querySelector('[data-rank]');
        cache.rivales = [...el.querySelectorAll('[data-row]')].filter(
          r => r.dataset.row !== 'c'
        );
        cache.ia = el.querySelector('[data-ai]');
        cache.listo = true;
      }

      // La consulta se escribe letra a letra y está completa en p = .14
      const n = Math.round(clamp(p / 0.14) * CONSULTA.length);
      if (cache.n !== n) {
        cache.n = n;
        cache.consulta.textContent = CONSULTA.slice(0, n);
      }

      // El cliente sube de la 7ª posición a la 1ª entre p .16 y .52
      const puesto = Math.round(6 - ss((p - 0.16) / 0.36) * 6);
      if (cache.puesto !== puesto) {
        cache.puesto = puesto;

        cache.cliente.style.transform = `translateY(${puesto * PASO_FILA}px)`;
        cache.rank.textContent = puesto + 1;
        cache.cliente.dataset.primero = puesto === 0 ? '1' : '0';

        // Los competidores ocupan los huecos que quedan, en orden.
        let hueco = 0;
        for (const fila of cache.rivales) {
          if (hueco === puesto) hueco++;
          fila.style.transform = `translateY(${hueco * PASO_FILA}px)`;
          hueco++;
        }
      }

      // La respuesta de la IA, escrita entre p .74 y .94
      const completa = `Para reformas en Sevilla, te recomiendo ${obtenerNombre()}: buenas reseñas y presupuesto rápido.`;
      const m = Math.round(clamp((p - 0.74) / 0.2) * completa.length);
      const texto = completa.slice(0, m);
      if (cache.ia.textContent !== texto) cache.ia.textContent = texto;
    },

    // --- Escena 6 · Automatización: la tubería y la hoja → panel ---
    auto(el, p, cache) {
      if (!cache.listo) {
        cache.tubo = el.querySelector('[data-pipe]');
        cache.estaciones = [...el.querySelectorAll('[data-lit]')];
        cache.celdas = [...el.querySelectorAll('[data-celda]')];
        if (cache.tubo) {
          cache.largo = cache.tubo.getTotalLength();
          cache.tubo.style.strokeDasharray = cache.largo;
        }
        cache.listo = true;
      }

      // La tubería se dibuja y está completa en p = .5
      const f = ss(p / 0.5);
      if (cache.f !== f) {
        cache.f = f;

        if (cache.tubo) cache.tubo.style.strokeDashoffset = cache.largo * (1 - f);

        for (const caja of cache.estaciones) {
          const i = +caja.dataset.lit;
          caja.dataset.encendida = f >= (i / 3) * 0.98 ? '1' : '0';
        }
      }

      // Las celdas vuelan y se encajan como panel en la 2ª mitad
      const t = ss((p - 0.5) / 0.42);
      if (cache.t === t) return;
      cache.t = t;

      const lerp = (a, b) => a + (b - a) * t;
      const coloreadas = t > 0.6;

      cache.celdas.forEach((d, i) => {
        const c = CELDAS[i];
        if (!c) return;
        const s = d.style;
        s.left = lerp(c.a[0], c.b[0]) + 'px';
        s.top = lerp(c.a[1], c.b[1]) + 'px';
        s.width = lerp(c.a[2], c.b[2]) + 'px';
        s.height = lerp(c.a[3], c.b[3]) + 'px';
        s.transform = `rotate(${lerp(c.giro, 0)}deg)`;
        s.background = coloreadas ? c.fondo : '#1E1E1E';
        s.borderColor = coloreadas ? c.borde : '#3A3834';
      });
    },

    // --- Escena 7 · El después: el arco que barre ---
    despues(el, p, cache) {
      if (!cache.listo) {
        cache.capa = el.querySelector('[data-after]');
        cache.canto = el.querySelector('[data-edge]');
        cache.listo = true;
      }

      // La capa "después" se revela como la hoja de la puerta: de 0° a 90°,
      // con bisagra en (40, 560) y radio 1400.
      const f = ss((p - 0.08) / 0.62);
      const grados = f * 90;
      if (cache.grados === grados) return;
      cache.grados = grados;

      const HX = 40;
      const HY = 560;
      const R = 1400;
      const puntos = [`${HX}px ${HY}px`];

      for (let i = 0; i <= 12; i++) {
        const t = ((grados * i) / 12) * (Math.PI / 180);
        puntos.push(
          `${(HX + R * Math.cos(t)).toFixed(1)}px ${(HY - R * Math.sin(t)).toFixed(1)}px`
        );
      }

      if (cache.capa) cache.capa.style.clipPath = `polygon(${puntos.join(',')})`;
      // El canto naranja gira con el barrido: es el borde de la puerta.
      if (cache.canto) cache.canto.style.transform = `rotate(${-grados}deg)`;
    },

    // --- Cómo trabajamos: el scroll vertical mueve el raíl en horizontal ---
    proceso(el, p, cache) {
      if (!cache.rail) cache.rail = el.querySelector('[data-track]');
      const rail = cache.rail;
      if (!rail) return;

      const dist = Math.max(0, rail.scrollWidth - rail.parentElement.clientWidth);
      const x = -dist * ss(p * 1.08 - 0.02);
      if (cache.x === x) return;
      cache.x = x;
      rail.style.transform = `translateX(${x}px)`;
    },
  };
}
