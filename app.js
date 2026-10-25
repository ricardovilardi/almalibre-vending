// Almalibre vending kiosk — clickable prototype
// Drop real videos into assets/video/ with these names and they replace the animated fallbacks.
const VIDEOS = {
  attract: 'assets/video/attract.mp4', // idle/attract loop (portrait 1080×1920)
  fill: 'assets/video/fill.mp4',       // empty cup being filled with açaí (white background)
};

const PRICE_BASE = 4.5;   // bowl base
const PRICE_EXTRA = 1.0;  // each topping
const MAX_QTY = 3;
const IDLE_MS = 45000;

const TOPPINGS = [
  { id: 'pacoca',  type: 'solid',  name: 'Paçoca (Cacahuete dulce)', img: 'assets/t-pacoca.png',
    desc: 'Dulce brasileño de cacahuete tostado, desmenuzado sobre tu açaí.', ing: 'Cacahuete, azúcar, sal.', all: ['peanut'] },
  { id: 'granola', type: 'solid',  name: 'Granola crunchy', img: 'assets/t-granola.png',
    desc: 'Copos de avena tostados con un toque de miel, extra crujientes.', ing: 'Avena, miel, frutos secos.', all: ['nuts', 'peanut', 'gluten'] },
  { id: 'oreo',    type: 'solid',  name: 'Oreo', img: 'assets/t-oreo.png',
    desc: 'Galleta de cacao troceada.', ing: 'Harina de trigo, azúcar, cacao.', all: ['gluten'] },
  { id: 'choco',   type: 'liquid', name: 'Chocolate blanco y nocciola', img: 'assets/t-choco.png',
    desc: 'Crema de chocolate blanco con avellana.', ing: 'Chocolate blanco, avellana.', all: ['nuts'] },
  { id: 'frutos',  type: 'liquid', name: 'Salsa de frutos rojos', img: 'assets/t-frutos.png',
    desc: 'Salsa de fresa, frambuesa y mora.', ing: 'Frutos rojos, azúcar.', all: [] },
  { id: 'crema',   type: 'liquid', name: 'Crema de cacahuete, cacao y avellana', img: 'assets/t-crema.png',
    desc: 'Crema untuosa de cacahuete con cacao y avellana.', ing: 'Cacahuete, cacao, avellana.', all: ['peanut', 'nuts'] },
];
const ALLERGENS = {
  nuts: { name: 'Cáscaras de frutos secos', img: 'assets/al-nuts.png' },
  peanut: { name: 'Cacahuete', img: 'assets/al-peanut.png' },
  gluten: { name: 'Gluten', img: 'assets/al-gluten.png' },
};
const FACTS = [
  'El açaí es el fruto de una palmera de la Amazonía 🌴',
  'Se cosecha a mano, racimo a racimo',
  'Truco: mezcla un topping sólido y uno líquido',
];

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const eur = n => n.toFixed(2).replace('.', ',') + ' €';

const order = {}; // id -> qty
let current = 'attract';
let timers = [];
const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

/* ---------- scaling ---------- */
const kiosk = $('#kiosk');
function fit() {
  const wrap = $('.stage-wrap').getBoundingClientRect();
  const s = Math.min((wrap.width - 24) / 1080, (wrap.height - 24) / 1920);
  kiosk.style.transform = `translate(-50%,-50%) scale(${s})`;
}
if (new URLSearchParams(location.search).has('kiosk')) document.body.classList.add('kiosk-mode');
addEventListener('resize', fit); fit();

/* ---------- navigation ---------- */
function go(name) {
  clearTimers();
  stopMaking();
  $$('.screen').forEach(s => s.classList.toggle('active', s.dataset.screen === name));
  current = name;
  $('#jump').value = name;
  closeSheet(); closeIdle();
  const enter = { attract: enterAttract, welcome: resetOrder, toppings: renderToppings, summary: renderSummary,
    payment: enterPayment, making: startMaking, ready: enterReady }[name];
  enter && enter();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-go]');
  if (b) go(b.dataset.go);
});

/* ---------- 0 · attract ---------- */
const attract = $('.s-attract');
function setupVideo(video, src, host) {
  video.src = src;
  video.addEventListener('loadeddata', () => host.classList.add('has-video'), { once: true });
  video.addEventListener('error', () => host.classList.remove('has-video'), { once: true });
}
setupVideo($('#attractVideo'), VIDEOS.attract, attract);

// fade to dark just before the clip ends, restart, then fade back in
const FADE_S = 0.8;
const av = $('#attractVideo'), fade = $('#attractFade');
av.addEventListener('timeupdate', () => {
  if (av.duration && av.duration - av.currentTime < FADE_S) fade.classList.add('on');
});
av.addEventListener('ended', () => {
  av.currentTime = 0;
  av.play().catch(() => {});
  requestAnimationFrame(() => fade.classList.remove('on'));
});
setupVideo($('#fillVideo'), VIDEOS.fill, $('.s-making'));

function enterAttract() {
  resetOrder();
  $('#attractVideo').play?.().catch(() => {});
  const tags = $$('.tag'); let i = 0;
  const rot = () => { tags.forEach((t, k) => t.classList.toggle('show', k === i)); i = (i + 1) % tags.length; later(rot, 3200); };
  rot();
}
attract.addEventListener('click', () => go('welcome'));

/* ---------- 2 · toppings ---------- */
function resetOrder() { for (const k in order) delete order[k]; }
const units = () => Object.values(order).reduce((a, b) => a + b, 0);
const total = () => PRICE_BASE + units() * PRICE_EXTRA;

function cardHTML(t) {
  return `<div class="card" data-id="${t.id}" role="button" tabindex="0">
    <span class="info" data-info="${t.id}" aria-label="Información">i</span>
    <img src="${t.img}" alt="">
    <div class="illus">Imagen ilustrativa</div>
    <div class="name">${t.name}</div>
    <div class="stepper"><button class="minus" data-dec="${t.id}">−</button><span class="q">1</span><button class="plus" data-inc="${t.id}">+</button></div>
  </div>`;
}
$('#gridSolid').innerHTML = TOPPINGS.filter(t => t.type === 'solid').map(cardHTML).join('');
$('#gridLiquid').innerHTML = TOPPINGS.filter(t => t.type === 'liquid').map(cardHTML).join('');

function renderToppings() {
  $$('.card').forEach(c => {
    const q = order[c.dataset.id] || 0;
    c.classList.toggle('sel', q > 0);
    $('.q', c).textContent = q;
    $('.plus', c).disabled = q >= MAX_QTY;
  });
  const n = units();
  $('#miniTotal').innerHTML = n
    ? `${n} topping${n > 1 ? 's' : ''} · <b>${eur(total())}</b>`
    : `Açaí bowl desde <b>${eur(PRICE_BASE)}</b>`;
}
$('.s-toppings').addEventListener('click', e => {
  const info = e.target.closest('[data-info]');
  if (info) return openSheet(info.dataset.info);
  const inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]');
  if (inc) order[inc.dataset.inc] = Math.min(MAX_QTY, (order[inc.dataset.inc] || 0) + 1);
  else if (dec) { const id = dec.dataset.dec; order[id]--; if (!order[id]) delete order[id]; }
  else {
    const card = e.target.closest('.card');
    if (!card || order[card.dataset.id]) return;
    order[card.dataset.id] = 1;
  }
  renderToppings();
});

function openSheet(id) {
  const t = TOPPINGS.find(x => x.id === id);
  $('#sheetImg').src = t.img; $('#sheetName').textContent = t.name;
  $('#sheetDesc').textContent = t.desc; $('#sheetIng').textContent = t.ing;
  $('#sheetAll').innerHTML = t.all.length
    ? t.all.map(a => `<li><img src="${ALLERGENS[a].img}" alt="">${ALLERGENS[a].name}</li>`).join('')
    : '<li>Sin alérgenos principales</li>';
  $('#sheet').classList.add('open'); $('#sheetScrim').classList.add('open');
}
function closeSheet() { $('#sheet').classList.remove('open'); $('#sheetScrim').classList.remove('open'); }
$('#sheetClose').addEventListener('click', closeSheet);
$('#sheetScrim').addEventListener('click', closeSheet);

/* ---------- 3 · summary ---------- */
function chip(t, q) {
  return `<div class="chip" data-chip="${t.id}"><img src="${t.img}" alt=""><span>${t.name}</span>${q > 1 ? `<span class="x2">×${q}</span>` : ''}</div>`;
}
function renderSummary() {
  for (const [type, panel] of [['solid', '#panelSolid'], ['liquid', '#panelLiquid']]) {
    const items = TOPPINGS.filter(t => t.type === type && order[t.id]);
    $('.chips', $(panel)).innerHTML = items.length ? items.map(t => chip(t, order[t.id])).join('') : '<span class="empty">Ninguno</span>';
  }
  const n = units();
  $('#priceBox').innerHTML = `
    <div class="line"><span>Açaí bowl</span><span>${eur(PRICE_BASE)}</span></div>
    ${n ? `<div class="line"><span>Toppings ×${n}</span><span>+${eur(n * PRICE_EXTRA)}</span></div>` : ''}
    <div class="tot"><span>Total</span><b>${eur(total())}</b></div>`;
}

/* ---------- 4 · payment ---------- */
const pay = $('.s-payment');
function payState(s) {
  pay.classList.remove('proc', 'ok', 'err');
  if (s !== 'wait') pay.classList.add(s);
  $$('.pm', pay).forEach(p => p.classList.toggle('show', p.classList.contains('pm-' + s)));
}
function enterPayment() {
  $('#payTotal').textContent = eur(total());
  const names = TOPPINGS.filter(t => order[t.id]).map(t => t.name + (order[t.id] > 1 ? ` ×${order[t.id]}` : ''));
  $('#payLines').textContent = 'Açaí bowl' + (names.length ? ' · ' + names.join(' · ') : '');
  payState('wait');
}
$('#nfc').addEventListener('click', () => {
  if (pay.classList.contains('proc') || pay.classList.contains('ok')) return;
  payState('proc');
  later(() => {
    if ($('#declineNext').checked) {
      $('#declineNext').checked = false;
      payState('err');
      later(() => payState('wait'), 2600);
    } else {
      payState('ok');
      later(() => go('making'), 1400);
    }
  }, 1800);
});

/* ---------- 5 · making ---------- */
const making = $('.s-making');
let raf = 0;
function stopMaking() { cancelAnimationFrame(raf); raf = 0; }
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = t => 1 - Math.pow(1 - t, 3);
const seg = (t, a, b) => clamp((t - a) / (b - a));

function startMaking() {
  const picks = TOPPINGS.filter(t => order[t.id]);
  const useVideo = making.classList.contains('has-video');
  const video = $('#fillVideo');
  const A = useVideo && video.duration ? video.duration : 5.4;   // açaí phase
  const P = Math.max(1, picks.length) * 1.3;                      // toppings phase
  const T = A + P + 0.9;

  $('#makeChips').innerHTML = picks.map(t => chip(t, order[t.id])).join('');
  $('#drops').innerHTML = '';
  setStep('acai');
  $('#makeTitle').innerHTML = '¡Preparando<br>tu Açaí!';
  $('#makeSub').textContent = 'Sirviendo el açaí…';
  if (useVideo) { video.currentTime = 0; video.play().catch(() => {}); }

  let f = 0;
  const fact = $('#fact');
  const nextFact = () => { fact.classList.remove('show'); later(() => { fact.textContent = FACTS[f++ % FACTS.length]; fact.classList.add('show'); }, 400); later(nextFact, 4200); };
  nextFact();

  const swirl = $('#swirl'), stream = $('#stream'), inner = $('#innerFill');
  const dropped = new Set();
  const t0 = performance.now();
  const frame = now => {
    const t = (now - t0) / 1000;

    // açaí: stream down → inner fills → swirl rises → stream retracts
    const sIn = ease(seg(t, 0, .6 * A / 5.4));
    const fillIn = ease(seg(t, .6 * A / 5.4, 1.6 * A / 5.4));
    const rise = ease(seg(t, 1.6 * A / 5.4, 4.8 * A / 5.4));
    const sOut = ease(seg(t, 4.8 * A / 5.4, A));
    const top = 0.53 - rise * 0.5;                 // reveal line (fraction of cup height)
    swirl.style.clipPath = `inset(${(top * 100).toFixed(2)}% 0 0 0)`;
    swirl.style.transform = `scale(${0.96 + rise * 0.04}) rotate(${(1 - rise) * -3}deg)`;
    inner.setAttribute('cy', 440 - fillIn * 48);
    const bottom = 140 + Math.max(0, top * 791 + 10);  // stream length in px
    stream.style.top = (-140 + sOut * bottom) + 'px';
    stream.style.height = (sIn * bottom * (1 - sOut)) + 'px';
    stream.classList.toggle('wobble', sIn > 0 && sOut < 1);

    // toppings
    if (t > A) {
      if (!making.dataset.tops) { making.dataset.tops = 1; setStep('tops'); $('#makeTitle').innerHTML = '¡Dispensando<br>tu Bowl!'; }
      const i = Math.floor((t - A) / 1.3);
      picks.forEach((p, k) => {
        const c = $(`#makeChips [data-chip="${p.id}"]`);
        c && c.classList.toggle('on', k === i); c && c.classList.toggle('ok', k < i);
        if (k === i && !dropped.has(p.id)) { dropped.add(p.id); dropTopping(p); $('#makeSub').textContent = `Añadiendo ${p.name.toLowerCase()}…`; }
      });
      if (!picks.length) $('#makeSub').textContent = 'Dando los últimos toques…';
    }

    const pr = clamp(t / T);
    $('#bar').style.width = (pr * 100).toFixed(1) + '%';
    $('#eta').textContent = pr < 1 ? `Quedan ${Math.ceil(T - t)} s · ${Math.round(pr * 100)}%` : '100%';

    if (t >= T) {
      setStep('done'); $('#makeSub').textContent = '¡Listo!';
      $$('#makeChips .chip').forEach(c => { c.classList.remove('on'); c.classList.add('ok'); });
      later(() => go('ready'), 700);
      return;
    }
    raf = requestAnimationFrame(frame);
  };
  delete making.dataset.tops;
  raf = requestAnimationFrame(frame);
}
function setStep(k) {
  const order = ['acai', 'tops', 'done'], i = order.indexOf(k);
  $$('#steps li').forEach((li, n) => { li.classList.toggle('ok', n < i || k === 'done'); li.classList.toggle('on', n === i && k !== 'done'); });
}
function dropTopping(t) {
  const host = $('#drops');
  for (let n = 0; n < 5; n++) {
    const img = document.createElement('img');
    img.src = t.img;
    const x = 330 + Math.random() * 240, land = 120 + Math.random() * 160;
    img.style.left = x + 'px'; img.style.top = '-260px';
    host.appendChild(img);
    img.animate([
      { transform: 'translateY(0) scale(.5) rotate(0deg)', opacity: 0 },
      { opacity: 1, offset: .2 },
      { transform: `translateY(${land + 260}px) scale(.8) rotate(${(Math.random() - .5) * 90}deg)`, opacity: 1, offset: .8 },
      { transform: `translateY(${land + 270}px) scale(.3)`, opacity: 0 },
    ], { duration: 1000, delay: n * 90, easing: 'cubic-bezier(.5,0,.7,1)', fill: 'forwards' });
  }
}

/* ---------- 6 · ready ---------- */
function enterReady() {
  const sp = $('#sparkles'); sp.innerHTML = '';
  for (let i = 0; i < 18; i++) {
    const s = document.createElement('i');
    s.style.left = 200 + Math.random() * 680 + 'px'; s.style.top = 120 + Math.random() * 700 + 'px';
    s.style.setProperty('--dx', (Math.random() - .5) * 300 + 'px'); s.style.setProperty('--dy', (Math.random() - .5) * 300 + 'px');
    s.style.animationDelay = .5 + Math.random() * .8 + 's';
    sp.appendChild(s);
  }
  const N = 10; let n = N;
  const tick = () => {
    $('#cdNum').textContent = n;
    $('#cdRing').style.strokeDashoffset = (113.1 * (1 - n / N)).toFixed(1);
    if (n-- <= 0) return go('attract');
    later(tick, 1000);
  };
  tick();
}

/* ---------- idle timeout ---------- */
let idleT = 0, idleTick = 0;
function closeIdle() { $('#idle').classList.remove('open'); clearInterval(idleTick); }
function armIdle() {
  clearTimeout(idleT);
  if (!['welcome', 'toppings', 'summary', 'payment'].includes(current)) return;
  idleT = setTimeout(() => {
    let n = 10; $('#idleNum').textContent = n; $('#idle').classList.add('open');
    idleTick = setInterval(() => { $('#idleNum').textContent = --n; if (n <= 0) go('attract'); }, 1000);
  }, IDLE_MS);
}
['pointerdown', 'keydown'].forEach(ev => kiosk.addEventListener(ev, () => { if (!$('#idle').classList.contains('open')) armIdle(); }));
$('#idleStay').addEventListener('click', () => { closeIdle(); armIdle(); });
new MutationObserver(armIdle).observe(kiosk, { subtree: true, attributeFilter: ['class'], attributes: true });

/* ---------- prototype bar ---------- */
$('#jump').addEventListener('change', e => {
  const v = e.target.value;
  if (['summary', 'payment', 'making', 'ready'].includes(v) && !units()) { order.granola = 1; order.pacoca = 2; order.choco = 1; }
  go(v);
});
$('#restart').addEventListener('click', () => go('attract'));

go('attract');
