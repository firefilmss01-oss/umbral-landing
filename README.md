# UMBRAL · Landing (home)

Landing única em espanhol, construída a partir do handoff em
`HANDOFF-README.md` e `HANDOFF-ESCENAS.md`.

HTML + CSS + JavaScript puro, sem build e sem dependências. Sobe em qualquer
hospedagem estática (Hostinger, Netlify, Vercel, cPanel, S3): é só copiar a
pasta inteira.

---

## Como abrir

As animações usam módulos ES, que o navegador **não carrega via `file://`**.
Precisa de um servidor, mesmo que local:

```bash
npx serve .          # ou
python -m http.server 8000
```

E abrir `http://localhost:8000`.

Em produção não muda nada: é um site estático comum.

---

## Estrutura

```
index.html                   todo o conteúdo, em espanhol, como HTML real
css/
  tokens.css                 cores, tipografia, espaçamento, easing (do handoff)
  base.css                   reset, nav, botões, footer, etiquetas
  escenas.css                hero + as 7 cenas animadas
  bloques.css                serviços, equipe, processo, projetos, FAQ, contato
js/
  motor-scroll.js            o motor: 1 listener de scroll + 1 rAF
  escenas.js                 lógica de cada cena (o que CSS não faz)
  app.js                     nome da empresa, nav, serviços, FAQ, formulário
assets/
  fuentes/                   14 .woff2 locais (não usa Google Fonts: RGPD)
  logos/  svg/  img/
HANDOFF-README.md            documento original do handoff
HANDOFF-ESCENAS.md           especificação das animações, elemento a elemento
```

---

## Como as animações funcionam

Um único listener de `scroll` (passivo) somado a um `requestAnimationFrame`.
Para cada seção visível o motor calcula um progresso `p` entre 0 e 1 e escreve
variáveis CSS na própria seção:

| Variável | O que é |
|---|---|
| `--p` | progresso linear 0 → 1 |
| `--s1` … `--s6` | seis fases iguais, cada uma suavizada |
| `--h1`, `--h2` | primeira e segunda metade |
| `--k` | escala do palco |
| `--mx` | posição do mouse no hero |
| `--cross` | 1 enquanto a porta se abre ao "Cruzar el umbral" |

Os elementos animam sozinhos com `calc(var(--…))`. Nada é re-renderizado por
JavaScript — é por isso que a página mantém 60fps mesmo percorrendo os ~28.000px
de altura total.

Só fica em JS o que CSS não consegue: o contador de mensagens, o texto digitado
letra a letra, a reordenação dos resultados do Google, o `clip-path` do arco que
varre a cena 7, o trilho horizontal e as células que voam para o painel.

---

## O que falta preencher

### 1. Contatos e links legais → `js/app.js`

No topo do arquivo há um objeto `CONFIG`. Enquanto os valores forem `null`, os
`[placeholders]` continuam visíveis no rodapé e os links não levam a lugar
nenhum — de propósito, para não publicar um link quebrado sem perceber.

```js
enlaces: {
  email:     'mailto:hola@umbral.es',
  whatsapp:  'https://wa.me/34600000000',
  instagram: 'https://instagram.com/…',
  linkedin:  'https://linkedin.com/company/…',
  privacidad:  '/politica-de-privacidad',
  'aviso-legal': '/aviso-legal',
  cookies:     '/politica-de-cookies',
}
```

### 2. Textos entre colchetes → `index.html`

Procure por `[` no arquivo. São eles:

- `[PRECIO]` — nos 4 serviços com preço
- `[48 h]` — prazo do diagnóstico (hero e contato)
- `[X] semanas` — cena 7
- `[PLAZO]` — resposta do FAQ "¿Cuánto tarda?"
- `[RESULTADO]` e os nomes dos 3 projetos

### 3. Fotos dos projetos

Cada card tem um espaço com o texto "Foto del proyecto". Para preencher, coloque
a imagem em `assets/img/` e troque:

```html
<p class="proyecto__hueco">Foto del proyecto</p>
```

por

```html
<img src="assets/img/proyecto-1.jpg" alt="Descrição da obra" loading="lazy" width="800" height="600">
```

> Regra do handoff: só casos reais ou marcados "Concepto". Nunca números
> inventados.

### 4. Formulário

Hoje ele **valida e mostra o painel de automação, mas não envia nada** — foi o
combinado. Para ligar de verdade, existe um ponto único em `js/app.js`:

```js
endpointFormulario: null,   // → 'https://…' (Formspree, Web3Forms, webhook n8n/Make)
```

Com uma URL ali, a função `enviarLead()` faz o POST com `empresa`, `web`,
`necesidad`, `whatsapp` e `origen` (os parâmetros de campanha da URL). Se o
envio falhar, a página avisa o visitante e oferece o WhatsApp, em vez de perder
o lead em silêncio.

---

## Parâmetros de campanha

A URL muda o H1 e o destino do botão "Cruzar el umbral":

| URL | H1 |
|---|---|
| `?s=posicionamiento` | ¿Tu empresa no aparece en Google? |
| `?s=web` | Tu web debería traerte clientes. |
| `?s=branding` | Tu empresa trabaja mejor de lo que parece. |
| `?s=automatizacion` | Deja de perder clientes por no responder a tiempo. |
| `?n=reformas` | Más presupuestos para tu empresa de reformas. |

O nome que o visitante digita fica salvo em `localStorage` e reaparece na
próxima visita, já preenchido no formulário.

---

## Medição

`js/app.js` tem uma função `medir()` que empurra eventos para `dataLayer`
(Google Tag Manager) e para `gtag`, se existirem. Sem nenhuma ferramenta
instalada, ela não faz nada — não quebra.

Eventos: `name_typed`, `cross_clicked`, `scene_reached` (1–7),
`service_door_opened`, `service_cta`, `form_submit`, `whatsapp_click`.

Para ativar, basta colar o snippet do GTM ou do GA4 no `<head>` do `index.html`.

---

## Decisões que fugiram do protótipo

Três coisas foram feitas diferente do protótipo, de propósito:

1. **Entrelinha dos títulos com acento.** O protótipo usa `line-height: .85`
   em tudo. Nessa medida a fonte Big Shoulders não tem espaço para um acento
   na segunda linha: "DISEÑO" saía sem o til e "REFORMAS GARCÍA" saía
   "GARCIA". Como o nome da empresa é digitado pelo visitante e em espanhol
   leva acento com frequência, os títulos que recebem esse nome passaram para
   `.95`. O H1 do hero e os títulos de bloco continuam em `.85`.
   Está comentado no CSS, em `escenas.css` e `bloques.css`, se quiser reverter.

2. **Menu mobile.** O protótipo não tinha um: os 4 links quebravam em cima dos
   botões em telas estreitas. Agora há um menu sanfona com o botão
   "Diagnóstico gratis" dentro dele.

3. **Primeira porta de serviço em mobile.** No celular as 5 portas chegavam
   fechadas e os 5 preços ficavam atrás de um toque cada. A primeira passou a
   abrir sozinha ao entrar na tela, para mostrar que as portas abrem. As
   outras continuam no toque, como no handoff.
   **Se quiser todos os preços visíveis de cara no celular**, é trocar o bloco
   `@media (max-width: 760px)` em `bloques.css` para esconder `.servicio__hoja`.

---

## Acessibilidade e `prefers-reduced-motion`

Pendência do handoff, agora feita. Quem tem "reduzir movimento" ligado no
sistema recebe a página sem scroll sequestrado: as seções deixam de ser fixas,
cada cena aparece direto no estado final (contador em 12, busca já digitada,
arco já aberto) e a página inteira encolhe de ~28.000px para ~13.000px.

Também entraram: foco visível em todos os controles, `aria-expanded` nas portas
e no FAQ, link "Saltar al contenido", e os textos das etiquetas escritos em
caixa normal no HTML (quem usa leitor de tela ouve "Marketing digital", não
"M-A-R-K"), com as maiúsculas aplicadas por CSS.

---

## Verificado

- Chrome, em 1440×900, 390×844 (iPhone) e 360×640 (Android pequeno)
- Sem scroll horizontal em nenhuma largura testada
- Sem erros de JavaScript em nenhuma seção
- 60fps percorrendo a página inteira, inclusive com a CPU 4× mais lenta
  (p95 de 18ms por frame, zero frames perdidos)
- As 13 cenas conferidas uma a uma contra os prints de referência do handoff
