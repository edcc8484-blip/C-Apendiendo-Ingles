import { LESSONS, VOCAB, DICTATION, LISTENING } from "./data.js";

// ---------- Estado persistente ----------
const STORE_KEY = "ingles-rapido.v1";
const DEFAULTS = {
  level: "A1", rate: 0.95, dailyGoal: 50, autoSpeak: true,
  xpByDay: {}, lessonsDone: {}, cards: {}, newByDay: {}, talkByDay: {}, dictByDay: {},
};
function load() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE_KEY) || "{}") }; }
  catch { return { ...DEFAULTS }; }
}
const S = load();
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch { /* sin almacenamiento */ } }

const today = () => new Date().toLocaleDateString("en-CA");
const dayOffset = (d, n) => { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + n); return x.toLocaleDateString("en-CA"); };
const xpToday = () => S.xpByDay[today()] || 0;
const totalXP = () => Object.values(S.xpByDay).reduce((a, b) => a + b, 0);
function streak() {
  let d = today(), n = 0;
  if (!S.xpByDay[d]) d = dayOffset(d, -1);
  while (S.xpByDay[d]) { n++; d = dayOffset(d, -1); }
  return n;
}
function addXP(n, msg) {
  const before = xpToday();
  S.xpByDay[today()] = before + n;
  save(); renderStats();
  if (before < S.dailyGoal && before + n >= S.dailyGoal) toast("¡Meta diaria cumplida! Sigue así.");
  else if (msg) toast(msg);
}
const bump = (key, n = 1) => { S[key][today()] = (S[key][today()] || 0) + n; save(); };

// ---------- Utilidades ----------
const $ = (sel, root = document) => root.querySelector(sel);
const app = $("#app");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const LEVEL_ORDER = ["A1", "A2", "B1", "B2"];
const levelIdx = (l) => LEVEL_ORDER.indexOf(l);

const ICON = {
  speaker: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
  slow: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 12h4"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  send: '<svg viewBox="0 0 24 24"><path d="M4 12l16-8-6 16-2-7z"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="1"/></svg>',
};

let toastTimer;
function toast(text) {
  const t = $("#toast");
  t.textContent = text; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), Math.max(2400, text.length * 60));
}

// ---------- Voz: texto a voz ----------
const AUDIO_HELP = "No se pudo reproducir la voz. Abre la app en Chrome o Edge y revisa el volumen.";
let voices = [];
function loadVoices() { voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en")); }
if ("speechSynthesis" in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function pickVoice(alt = false) {
  const pref = alt
    ? [/Guy|Christopher|Eric|Daniel|Google UK English Male/i, /en-GB/i]
    : [/Aria|Jenny|Samantha|Google US English|Zira/i, /en-US/i];
  for (const p of pref) { const v = voices.find((x) => p.test(x.name) || p.test(x.lang)); if (v) return v; }
  return voices[0];
}
function speak(text, { rate = S.rate, alt = false } = {}) {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) { toast("Tu navegador no soporta audio de voz."); return resolve(); }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = rate;
    const v = pickVoice(alt); if (v) u.voice = v;
    if (alt && !v) u.pitch = 0.8;
    u.onend = () => resolve();
    u.onerror = (e) => {
      if (e.error !== "interrupted" && e.error !== "canceled") toast(AUDIO_HELP);
      resolve();
    };
    if (!voices.length && !speechSynthesis.getVoices().length) toast(AUDIO_HELP);
    speechSynthesis.speak(u);
  });
}
const stopSpeaking = () => { if ("speechSynthesis" in window) speechSynthesis.cancel(); };

// ---------- Voz: reconocimiento ----------
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const canListen = !!Recognition;
let activeRec = null;
function listen(onInterim) {
  return new Promise((resolve, reject) => {
    if (!canListen) return reject(new Error("unsupported"));
    stopSpeaking();
    const rec = new Recognition();
    rec.lang = "en-US"; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    let finalText = "", errCode = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      onInterim?.((finalText + " " + interim).trim());
    };
    rec.onerror = (e) => { errCode = e.error; };
    rec.onend = () => {
      activeRec = null;
      if (!finalText.trim() && MIC_ERRORS[errCode]) reject(new Error(MIC_ERRORS[errCode]));
      else resolve(finalText.trim());
    };
    activeRec = rec;
    try { rec.start(); } catch { activeRec = null; reject(new Error(MIC_ERRORS["not-allowed"])); }
  });
}
const stopListening = () => activeRec?.stop();
const MIC_ERRORS = {
  "not-allowed": "El micrófono está bloqueado. Abre la app en Chrome o Edge y, cuando lo pida, elige «Permitir» (o en el candado de la barra de direcciones).",
  "service-not-allowed": "Este navegador no permite el reconocimiento de voz. Usa Google Chrome o Microsoft Edge.",
  "audio-capture": "No se encontró ningún micrófono. Conecta uno o revisa la configuración de sonido de Windows.",
  "network": "El reconocimiento de voz necesita internet. Revisa tu conexión.",
};
const NOT_HEARD = "No te escuché. Habla justo después de tocar el botón, cerca del micrófono.";

// Compara lo dicho/escrito con la frase objetivo, palabra por palabra.
const CONTRACTIONS = {
  "i'm": "i am", "you're": "you are", "he's": "he is", "she's": "she is", "it's": "it is", "we're": "we are",
  "they're": "they are", "i've": "i have", "i'll": "i will", "i'd": "i would", "don't": "do not",
  "doesn't": "does not", "didn't": "did not", "isn't": "is not", "aren't": "are not", "can't": "cannot",
  "won't": "will not", "haven't": "have not", "that's": "that is", "what's": "what is", "let's": "let us",
  "where's": "where is", "there's": "there is", "you'll": "you will", "we'll": "we will", "i ve": "i have",
};
const NUMBERS = { zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10" };
function words(s) {
  const base = s.toLowerCase().replace(/[’`]/g, "'").replace(/[^a-z0-9'\s-]/g, " ").replace(/-/g, " ");
  return base.split(/\s+/).filter(Boolean)
    .flatMap((w) => (CONTRACTIONS[w] || w).split(" "))
    .map((w) => NUMBERS[w] || w.replace(/'/g, ""));
}
function compare(target, said) {
  const t = words(target), s = words(said);
  const dp = Array.from({ length: t.length + 1 }, () => new Array(s.length + 1).fill(0));
  for (let i = t.length - 1; i >= 0; i--) for (let j = s.length - 1; j >= 0; j--)
    dp[i][j] = t[i] === s[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hit = new Set();
  for (let i = 0, j = 0; i < t.length && j < s.length;) {
    if (t[i] === s[j]) { hit.add(i); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  // Muestra la frase original marcando las palabras que faltaron.
  const tokens = target.split(/\s+/);
  let k = 0;
  const html = tokens.map((tok) => {
    const n = words(tok).length || 1;
    const ok = Array.from({ length: n }, (_, x) => hit.has(k + x)).every(Boolean);
    k += n;
    return `<span class="${ok ? "ok" : "miss"}">${esc(tok)}</span>`;
  }).join(" ");
  return { score: t.length ? hit.size / t.length : 0, html, extra: s.length - hit.size };
}

// ---------- Repaso espaciado (SM-2 simplificado) ----------
const DAY = 86400000;
function cardFor(en) { return S.cards[en]; }
function dueCards() { const now = Date.now(); return VOCAB.filter(([en]) => S.cards[en] && S.cards[en].due <= now); }
function newAvailable() { return Math.max(0, 10 - (S.newByDay[today()] || 0)); }
function grade(en, g) {
  const c = S.cards[en] || { ease: 2.5, ivl: 0, reps: 0, due: 0 };
  if (!S.cards[en]) bump("newByDay");
  if (g === 0) { c.reps = 0; c.ivl = 0; c.ease = Math.max(1.3, c.ease - 0.2); c.due = Date.now() + 60_000; }
  else {
    if (g === 1) { c.ivl = Math.max(1, c.ivl * 1.2); c.ease = Math.max(1.3, c.ease - 0.15); }
    else if (c.reps === 0) c.ivl = g === 3 ? 3 : 1;
    else if (c.reps === 1) c.ivl = g === 3 ? 6 : 3;
    else c.ivl = c.ivl * c.ease * (g === 3 ? 1.3 : 1);
    if (g === 3) c.ease += 0.15;
    c.reps++; c.due = Date.now() + Math.round(c.ivl) * DAY - 3600_000;
  }
  S.cards[en] = c; save();
}
const learnedCount = () => Object.values(S.cards).filter((c) => c.reps > 0).length;

// ---------- Navegación ----------
let view = "home";
let ctx = {}; // estado de la vista actual
function go(v, c = {}) {
  stopSpeaking(); stopListening();
  view = v; ctx = c;
  document.querySelectorAll("#tabs button").forEach((b) => {
    const tab = { lesson: "lessons" }[v] || v;
    b.classList.toggle("active", b.dataset.view === tab);
  });
  render();
  window.scrollTo(0, 0);
}
$("#tabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) go(b.dataset.view); });

function renderStats() {
  $("#stats").innerHTML =
    `<span class="pill" title="Días seguidos">🔥 ${streak()}</span>` +
    `<span class="pill" title="XP de hoy / meta">${xpToday()}/${S.dailyGoal} XP</span>`;
}

function render() {
  const views = { home: renderHome, lessons: renderLessons, lesson: renderLesson, vocab: renderVocab, listen: renderListen, talk: renderTalk };
  views[view]();
}

// ---------- Inicio ----------
function nextLesson() {
  return LESSONS.find((l) => !S.lessonsDone[l.id] && levelIdx(l.level) <= levelIdx(S.level))
    || LESSONS.find((l) => !S.lessonsDone[l.id]);
}
function renderHome() {
  const pct = Math.min(100, Math.round((xpToday() / S.dailyGoal) * 100));
  const nl = nextLesson();
  const due = dueCards().length;
  const toReview = due + Math.min(newAvailable(), VOCAB.filter(([en]) => !S.cards[en]).length);
  const talked = (S.talkByDay[today()] || 0) >= 5;
  const dictated = (S.dictByDay[today()] || 0) >= 5;
  const tasks = [
    { done: toReview === 0, title: "Repasa tus palabras", sub: toReview ? `${toReview} tarjetas para hoy` : "Todo al día", go: "vocab" },
    { done: !nl, title: nl ? `Lección: ${nl.title}` : "Todas las lecciones completadas", sub: nl ? `Nivel ${nl.level} · 5-10 min` : "¡Excelente!", go: nl ? "lesson" : "lessons", arg: nl && { id: nl.id } },
    { done: dictated, title: "Entrena el oído", sub: `Dictado: ${Math.min(5, S.dictByDay[today()] || 0)}/5 frases`, go: "listen" },
    { done: talked, title: "Conversa con Emma", sub: `${Math.min(5, S.talkByDay[today()] || 0)}/5 mensajes hablados`, go: "talk" },
  ];
  app.innerHTML = `
    <section class="card hero">
      <h1>${xpToday() ? "¡Buen trabajo hoy!" : "¡Hola! Vamos a practicar."}</h1>
      <p class="muted">15 minutos al día valen más que 3 horas el fin de semana. Escucha, repite en voz alta y conversa.</p>
      <div class="row between small"><span>Meta diaria</span><span>${xpToday()} / ${S.dailyGoal} XP</span></div>
      <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div style="width:${pct}%"></div></div>
    </section>
    <section class="card">
      <h2>Tu plan de hoy</h2>
      <div class="stack">
        ${tasks.map((t, i) => `
          <div class="task ${t.done ? "done" : ""}">
            <span class="check">${t.done ? "✓" : i + 1}</span>
            <div class="grow"><div><b>${esc(t.title)}</b></div><div class="small muted">${esc(t.sub)}</div></div>
            <button class="btn ${t.done ? "" : "primary"}" data-go="${t.go}" data-arg='${t.arg ? JSON.stringify(t.arg) : ""}'>${t.done ? "Repasar" : "Empezar"}</button>
          </div>`).join("")}
      </div>
    </section>
    <div class="grid">
      <section class="card"><div class="muted small">Racha</div><div class="big-num">${streak()} ${streak() === 1 ? "día" : "días"}</div></section>
      <section class="card"><div class="muted small">Palabras aprendidas</div><div class="big-num">${learnedCount()} <span class="small muted">/ ${VOCAB.length}</span></div></section>
      <section class="card"><div class="muted small">Lecciones</div><div class="big-num">${Object.keys(S.lessonsDone).length} <span class="small muted">/ ${LESSONS.length}</span></div></section>
      <section class="card"><div class="muted small">XP total</div><div class="big-num">${totalXP()}</div></section>
    </div>
    <section class="card">
      <h2>Ajustes</h2>
      <div class="row">
        <label>Mi nivel
          <select id="set-level">${LEVEL_ORDER.map((l) => `<option ${l === S.level ? "selected" : ""}>${l}</option>`).join("")}</select>
        </label>
        <label>Velocidad de voz
          <select id="set-rate">${[[0.75, "Lenta"], [0.95, "Normal"], [1.1, "Rápida"]].map(([v, n]) => `<option value="${v}" ${v === S.rate ? "selected" : ""}>${n}</option>`).join("")}</select>
        </label>
        <label>Meta diaria
          <select id="set-goal">${[30, 50, 100, 150].map((v) => `<option ${v === S.dailyGoal ? "selected" : ""}>${v}</option>`).join("")}</select>
        </label>
      </div>
      <p class="small muted" style="margin-top:10px">A1 principiante · A2 básico · B1 intermedio · B2 intermedio alto. El nivel ajusta al tutor y el orden de las lecciones.</p>
      ${canListen ? "" : `<p class="feedback info small">Tu navegador no permite reconocimiento de voz. Usa Google Chrome o Microsoft Edge para practicar hablando.</p>`}
    </section>`;
  app.querySelectorAll("[data-go]").forEach((b) => b.onclick = () => go(b.dataset.go, b.dataset.arg ? JSON.parse(b.dataset.arg) : {}));
  $("#set-level").onchange = (e) => { S.level = e.target.value; save(); render(); };
  $("#set-rate").onchange = (e) => { S.rate = +e.target.value; save(); speak("This is how I sound."); };
  $("#set-goal").onchange = (e) => { S.dailyGoal = +e.target.value; save(); renderStats(); render(); };
}

// ---------- Lecciones ----------
function renderLessons() {
  app.innerHTML = LEVEL_ORDER.filter((lv) => LESSONS.some((l) => l.level === lv)).map((lv) => `
    <section class="card">
      <h2>Nivel ${lv}</h2>
      <div class="stack">
        ${LESSONS.filter((l) => l.level === lv).map((l) => `
          <button class="btn lesson-item" data-id="${l.id}">
            <span class="grow">${esc(l.title)}<br><span class="small muted">${l.phrases.length} frases · ${l.exercises.length} ejercicios</span></span>
            ${S.lessonsDone[l.id] ? '<span class="badge done">Completada</span>' : '<span class="badge">Nueva</span>'}
          </button>`).join("")}
      </div>
    </section>`).join("");
  app.querySelectorAll("[data-id]").forEach((b) => b.onclick = () => go("lesson", { id: b.dataset.id }));
}

function renderLesson() {
  const lesson = LESSONS.find((l) => l.id === ctx.id);
  ctx.phase ??= "learn";
  if (ctx.phase === "learn") {
    app.innerHTML = `
      <button class="back" id="back">← Lecciones</button>
      <section class="card">
        <span class="badge">${lesson.level}</span>
        <h1 style="margin-top:8px">${esc(lesson.title)}</h1>
        <p>${esc(lesson.intro)}</p>
      </section>
      <section class="card">
        <div class="row between"><h2>Frases clave</h2><button class="btn" id="play-all">${ICON.speaker} Escuchar todas</button></div>
        ${lesson.phrases.map((p, i) => `
          <div class="phrase">
            <button class="icon-btn" data-say="${i}" aria-label="Escuchar">${ICON.speaker}</button>
            <div class="grow"><div class="en">${esc(p.en)}</div><div class="small muted">${esc(p.es)}</div></div>
            <button class="icon-btn" data-slow="${i}" aria-label="Escuchar lento" title="Lento">${ICON.slow}</button>
          </div>`).join("")}
      </section>
      <button class="btn primary block" id="start">Practicar (${lesson.exercises.length} ejercicios)</button>`;
    $("#back").onclick = () => go("lessons");
    app.querySelectorAll("[data-say]").forEach((b) => b.onclick = () => speak(lesson.phrases[+b.dataset.say].en));
    app.querySelectorAll("[data-slow]").forEach((b) => b.onclick = () => speak(lesson.phrases[+b.dataset.slow].en, { rate: 0.65 }));
    $("#play-all").onclick = async () => { stopSpeaking(); for (const p of lesson.phrases) { await speak(p.en); await new Promise((r) => setTimeout(r, 500)); } };
    $("#start").onclick = () => { ctx.phase = "practice"; ctx.i = 0; ctx.correct = 0; render(); };
    return;
  }
  if (ctx.phase === "done") {
    const total = lesson.exercises.length;
    app.innerHTML = `
      <section class="card" style="text-align:center">
        <h1>¡Lección completada!</h1>
        <p class="big-num">${ctx.correct}/${total}</p>
        <p class="muted">${ctx.correct === total ? "Perfecto. " : ""}Repite las frases en voz alta durante el día: así se quedan en tu memoria.</p>
        <div class="row" style="justify-content:center">
          <button class="btn" id="again">Repetir</button>
          <button class="btn primary" id="next">Siguiente</button>
        </div>
      </section>`;
    $("#again").onclick = () => go("lesson", { id: lesson.id });
    $("#next").onclick = () => { const n = nextLesson(); n ? go("lesson", { id: n.id }) : go("lessons"); };
    return;
  }
  const ex = lesson.exercises[ctx.i];
  const steps = lesson.exercises.map((_, i) => `<span class="${i <= ctx.i ? "on" : ""}"></span>`).join("");
  const header = `<button class="back" id="back">← ${esc(lesson.title)}</button><div class="steps">${steps}</div>`;
  const next = (ok) => {
    if (ok) { ctx.correct++; addXP(2); }
    const fb = $("#fb");
    fb.innerHTML += `<button class="btn primary block" id="cont" style="margin-top:12px">Continuar</button>`;
    $("#cont").onclick = () => {
      ctx.i++;
      if (ctx.i >= lesson.exercises.length) {
        if (!S.lessonsDone[lesson.id]) addXP(20, "+20 XP por completar la lección");
        S.lessonsDone[lesson.id] = true; save();
        ctx.phase = "done";
      }
      render();
    };
    $("#cont").focus();
  };

  if (ex.type === "choice") {
    app.innerHTML = `${header}<section class="card"><h2>${esc(ex.q)}</h2>
      <div class="choice">${ex.options.map((o, i) => `<button class="btn" data-o="${i}">${esc(o)}</button>`).join("")}</div><div id="fb"></div></section>`;
    app.querySelectorAll("[data-o]").forEach((b) => b.onclick = () => {
      const pick = +b.dataset.o, ok = pick === ex.answer;
      app.querySelectorAll("[data-o]").forEach((x) => { x.disabled = true; if (+x.dataset.o === ex.answer) x.classList.add("right"); });
      if (!ok) b.classList.add("wrong");
      const correct = ex.options[ex.answer];
      if (/^[A-Za-z]/.test(correct)) speak(correct);
      $("#fb").innerHTML = `<div class="feedback ${ok ? "ok" : "no"}">${ok ? "¡Correcto!" : `La respuesta es: <span class="en">${esc(correct)}</span>`}</div>`;
      next(ok);
    });
  } else if (ex.type === "order") {
    const tokens = ex.en.split(" ");
    const bank = shuffle(tokens.map((t, i) => ({ t, i })));
    const chosen = [];
    app.innerHTML = `${header}<section class="card"><h2>Ordena la frase</h2><p class="muted">«${esc(ex.es)}»</p>
      <div class="answer-line" id="ans"></div>
      <div class="word-bank" id="bank">${bank.map((w, k) => `<button class="chip" data-k="${k}">${esc(w.t)}</button>`).join("")}</div>
      <button class="btn primary block" id="check" style="margin-top:14px" disabled>Comprobar</button><div id="fb"></div></section>`;
    const drawAns = () => {
      $("#ans").innerHTML = chosen.map((k, pos) => `<button class="chip" data-pos="${pos}">${esc(bank[k].t)}</button>`).join("");
      $("#ans").querySelectorAll("[data-pos]").forEach((b) => b.onclick = () => {
        const k = chosen.splice(+b.dataset.pos, 1)[0];
        app.querySelector(`#bank [data-k="${k}"]`).classList.remove("used");
        drawAns();
      });
      $("#check").disabled = chosen.length !== tokens.length;
    };
    app.querySelectorAll("#bank [data-k]").forEach((b) => b.onclick = () => {
      if (b.classList.contains("used")) return;
      b.classList.add("used"); chosen.push(+b.dataset.k); drawAns();
    });
    $("#check").onclick = () => {
      const said = chosen.map((k) => bank[k].t).join(" ");
      const ok = words(said).join(" ") === words(ex.en).join(" ");
      $("#check").disabled = true;
      app.querySelectorAll(".chip").forEach((c) => c.disabled = true);
      speak(ex.en);
      $("#fb").innerHTML = `<div class="feedback ${ok ? "ok" : "no"}">${ok ? "¡Correcto!" : "Casi. La frase correcta:"} <span class="en">${esc(ex.en)}</span></div>`;
      next(ok);
    };
  } else if (ex.type === "speak") {
    app.innerHTML = `${header}<section class="card"><h2>Dilo en voz alta</h2>
      <p class="en" style="font-size:1.4rem;font-weight:700">${esc(ex.en)}</p>
      <div class="row">
        <button class="btn" id="listen">${ICON.speaker} Escuchar</button>
        <button class="btn" id="slow">${ICON.slow} Lento</button>
        ${canListen ? `<button class="btn primary" id="rec">${ICON.mic} Hablar</button>` : `<button class="btn primary" id="skip">Ya lo dije en voz alta</button>`}
      </div>
      <p class="small muted" id="heard" style="margin-top:10px"></p>
      <div id="fb"></div></section>`;
    $("#listen").onclick = () => speak(ex.en);
    $("#slow").onclick = () => speak(ex.en, { rate: 0.65 });
    speak(ex.en);
    if (!canListen) { $("#skip").onclick = () => { $("#skip").disabled = true; next(true); }; return; }
    let tries = 0;
    $("#rec").onclick = async () => {
      const btn = $("#rec");
      if (activeRec) return stopListening();
      btn.innerHTML = `${ICON.stop} Detener`;
      let said = "", micError = "";
      try { said = await listen((t) => $("#heard").textContent = `Escuché: «${t}»`); }
      catch (e) { micError = e.message; }
      btn.innerHTML = `${ICON.mic} Hablar otra vez`;
      if (!said) { $("#heard").textContent = micError || NOT_HEARD; return; }
      tries++;
      const r = compare(ex.en, said);
      const ok = r.score >= 0.75;
      $("#fb").innerHTML = `<div class="feedback ${ok ? "ok" : "no"}">
        <div class="diff" style="font-size:1.1rem">${r.html}</div>
        <div style="margin-top:6px">${ok ? `¡Muy bien! Pronunciación ${Math.round(r.score * 100)}%` : `${Math.round(r.score * 100)}% · Las palabras subrayadas no se entendieron. Escucha y prueba otra vez.`}</div></div>`;
      if (ok || tries >= 3) { btn.disabled = true; next(ok); }
    };
  }
  $("#back").onclick = () => go("lesson", { id: lesson.id });
}

// ---------- Vocabulario ----------
function renderVocab() {
  if (!ctx.queue) {
    const fresh = VOCAB.filter(([en]) => !S.cards[en]).slice(0, newAvailable());
    ctx.queue = [...shuffle(dueCards()), ...fresh];
    ctx.done = 0;
  }
  const card = ctx.queue[0];
  if (!card) {
    const upcoming = Object.values(S.cards).filter((c) => c.due > Date.now()).length;
    app.innerHTML = `<section class="card flash">
      <h1>¡Todo al día!</h1>
      <p class="muted">${ctx.done ? `Repasaste ${ctx.done} tarjetas. ` : ""}Las palabras vuelven justo cuando estás por olvidarlas: así se memorizan para siempre.</p>
      <p class="muted small">${learnedCount()} palabras en tu memoria · ${upcoming} programadas para después</p>
      <div class="row" style="justify-content:center">
        <button class="btn" id="more">Aprender 5 más</button>
        <button class="btn primary" id="home">Volver al inicio</button>
      </div></section>
      ${renderWordList()}`;
    $("#home").onclick = () => go("home");
    const rest = VOCAB.filter(([en]) => !S.cards[en]);
    $("#more").disabled = !rest.length;
    $("#more").onclick = () => { ctx.queue = rest.slice(0, 5); render(); };
    return;
  }
  const [en, es, ex] = card;
  const isNew = !cardFor(en);
  app.innerHTML = `
    <div class="row between small muted" style="margin-bottom:8px"><span>${ctx.queue.length} por repasar</span><span>${isNew ? '<span class="badge">Nueva</span>' : ""}</span></div>
    <section class="card flash">
      <div class="word">${esc(en)}</div>
      <button class="icon-btn" id="say" aria-label="Escuchar">${ICON.speaker}</button>
      <div id="back-side" ${ctx.shown ? "" : "hidden"}>
        <p class="meaning" style="margin-top:16px">${esc(es)}</p>
        <p><span class="en">${esc(ex)}</span> <button class="icon-btn" id="say-ex" aria-label="Escuchar ejemplo" style="width:32px;height:32px;vertical-align:middle">${ICON.speaker}</button></p>
      </div>
      ${ctx.shown ? `
        <div class="grades">
          <button class="btn" data-g="0">Otra vez<small>&lt;1 min</small></button>
          <button class="btn" data-g="1">Difícil<small>${isNew ? "1 día" : "poco"}</small></button>
          <button class="btn primary" data-g="2">Bien<small>${isNew ? "1 día" : "más"}</small></button>
          <button class="btn" data-g="3">Fácil<small>${isNew ? "3 días" : "mucho más"}</small></button>
        </div>` : `<button class="btn primary block" id="show" style="margin-top:20px">Mostrar significado</button>`}
    </section>
    <p class="small muted" style="text-align:center">Intenta recordar el significado antes de voltear la tarjeta. Di la palabra en voz alta.</p>`;
  $("#say").onclick = () => speak(en);
  if (!ctx.shown) {
    speak(en);
    $("#show").onclick = () => { ctx.shown = true; render(); speak(ex); };
    $("#show").focus();
  } else {
    $("#say-ex").onclick = () => speak(ex);
    app.querySelectorAll("[data-g]").forEach((b) => b.onclick = () => {
      const g = +b.dataset.g;
      grade(en, g);
      ctx.queue.shift();
      if (g === 0) ctx.queue.push(card);
      else { ctx.done++; addXP(1); }
      ctx.shown = false; render();
    });
  }
}
function renderWordList() {
  const learned = VOCAB.filter(([en]) => S.cards[en]?.reps > 0);
  if (!learned.length) return "";
  return `<section class="card"><h2>Tus palabras</h2><div class="words">
    ${learned.map(([en, es]) => `<span title="${esc(es)}">${esc(en)}</span>`).join("")}</div></section>`;
}

// ---------- Escuchar ----------
function renderListen() {
  ctx.mode ??= "dictation";
  const seg = `<div class="seg" role="tablist">
      <button class="${ctx.mode === "dictation" ? "on" : ""}" data-mode="dictation">Dictado</button>
      <button class="${ctx.mode === "dialog" ? "on" : ""}" data-mode="dialog">Diálogos</button>
    </div>`;
  if (ctx.mode === "dictation") {
    if (ctx.item == null) ctx.item = Math.floor(Math.random() * DICTATION.length);
    const it = DICTATION[ctx.item];
    app.innerHTML = `${seg}
      <section class="card" style="margin-top:14px">
        <h2>Escucha y escribe lo que oyes</h2>
        <p class="muted small">Puedes escucharla las veces que quieras. No importan mayúsculas ni puntuación.</p>
        <div class="row" style="margin-bottom:14px">
          <button class="btn primary" id="play">${ICON.speaker} Reproducir</button>
          <button class="btn" id="slow">${ICON.slow} Lento</button>
        </div>
        <input type="text" id="typed" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Escribe en inglés...">
        <div class="row" style="margin-top:12px">
          <button class="btn primary" id="check">Comprobar</button>
          <button class="btn" id="reveal">No sé, mostrar</button>
        </div>
        <div id="fb"></div>
      </section>`;
    speak(it.en);
    $("#play").onclick = () => speak(it.en);
    $("#slow").onclick = () => speak(it.en, { rate: 0.6 });
    const finish = (html, cls) => {
      $("#fb").innerHTML = `<div class="feedback ${cls}">${html}<div class="small" style="margin-top:6px">${esc(it.es)}</div></div>
        <button class="btn primary block" id="nextd" style="margin-top:12px">Siguiente frase</button>`;
      $("#check").disabled = $("#reveal").disabled = true;
      $("#nextd").onclick = () => { ctx.item = (ctx.item + 1 + Math.floor(Math.random() * (DICTATION.length - 1))) % DICTATION.length; render(); };
      $("#nextd").focus();
    };
    $("#typed").onkeydown = (e) => { if (e.key === "Enter") $("#check").click(); };
    $("#typed").focus();
    $("#check").onclick = () => {
      const typed = $("#typed").value.trim();
      if (!typed) return;
      const r = compare(it.en, typed);
      bump("dictByDay");
      if (r.score === 1 && r.extra === 0) { addXP(3); finish(`¡Perfecto! <span class="en">${esc(it.en)}</span>`, "ok"); }
      else if (r.score >= 0.7) { addXP(1); finish(`<div class="diff en">${r.html}</div>Casi: revisa las palabras subrayadas.`, "info"); }
      else finish(`<div class="diff en">${r.html}</div>Escúchala de nuevo con la frase a la vista.`, "no");
    };
    $("#reveal").onclick = () => finish(`<span class="en">${esc(it.en)}</span>`, "info");
  } else {
    const list = LISTENING.map((d, i) => ({ ...d, i })).sort((a, b) =>
      Math.abs(levelIdx(a.level) - levelIdx(S.level)) - Math.abs(levelIdx(b.level) - levelIdx(S.level)));
    if (ctx.d == null) ctx.d = list[0].i;
    const d = LISTENING[ctx.d];
    app.innerHTML = `${seg}
      <section class="card" style="margin-top:14px">
        <div class="row between"><h2>Escucha el diálogo</h2><span class="badge">${d.level}</span></div>
        <p class="muted small">Escúchalo sin leer. Luego responde la pregunta.</p>
        <div class="row"><button class="btn primary" id="play">${ICON.speaker} Reproducir</button><button class="btn" id="slow">${ICON.slow} Lento</button></div>
        <h3 style="margin-top:18px">${esc(d.q)}</h3>
        <div class="choice">${d.options.map((o, i) => `<button class="btn" data-o="${i}">${esc(o)}</button>`).join("")}</div>
        <div id="fb"></div>
        <div id="script" hidden style="margin-top:14px">${d.lines.map(([who, line]) => `<div class="dialog-line"><b>${who}</b><span>${esc(line)}</span></div>`).join("")}</div>
      </section>
      <section class="card"><h2>Otros diálogos</h2><div class="row">
        ${list.map((x) => `<button class="btn ${x.i === ctx.d ? "primary" : ""}" data-d="${x.i}">${x.level} · ${x.i + 1}</button>`).join("")}
      </div></section>`;
    const playAll = async (rate) => {
      stopSpeaking();
      for (const [who, line] of d.lines) { await speak(line, { rate, alt: who === "B" }); await new Promise((r) => setTimeout(r, 350)); }
    };
    $("#play").onclick = () => playAll(S.rate);
    $("#slow").onclick = () => playAll(0.7);
    app.querySelectorAll("[data-d]").forEach((b) => b.onclick = () => { ctx.d = +b.dataset.d; render(); });
    app.querySelectorAll("[data-o]").forEach((b) => b.onclick = () => {
      const ok = +b.dataset.o === d.answer;
      app.querySelectorAll("[data-o]").forEach((x) => { x.disabled = true; if (+x.dataset.o === d.answer) x.classList.add("right"); });
      if (!ok) b.classList.add("wrong"); else addXP(5);
      $("#fb").innerHTML = `<div class="feedback ${ok ? "ok" : "no"}">${ok ? "¡Correcto! Entendiste el diálogo." : "No exactamente. Lee el texto mientras lo escuchas otra vez."}</div>`;
      $("#script").hidden = false;
    });
  }
  app.querySelectorAll("[data-mode]").forEach((b) => b.onclick = () => go("listen", { mode: b.dataset.mode }));
}

// ---------- Hablar (tutor IA) ----------
const SCENARIOS = {
  free: ["Conversación libre", "Hi! I'm Emma, your English tutor. How are you today?", "¡Hola! Soy Emma, tu tutora de inglés. ¿Cómo estás hoy?"],
  cafe: ["En la cafetería", "Hi there! Welcome to Sunny Café. What can I get for you today?", "¡Hola! Bienvenido a Sunny Café. ¿Qué te sirvo hoy?"],
  airport: ["En el aeropuerto", "Good morning! Can I see your passport, please? Where are you flying today?", "¡Buenos días! ¿Me muestra su pasaporte? ¿A dónde vuela hoy?"],
  hotel: ["En el hotel", "Good evening, welcome to the Grand Hotel. Do you have a reservation?", "Buenas noches, bienvenido al Grand Hotel. ¿Tiene reservación?"],
  job: ["Entrevista de trabajo", "Hello, thanks for coming in today. Let's start. Can you tell me a little about yourself?", "Hola, gracias por venir. Empecemos. ¿Me puede contar un poco sobre usted?"],
  doctor: ["En el médico", "Hello, please have a seat. What seems to be the problem today?", "Hola, siéntese por favor. ¿Cuál es el problema hoy?"],
  shopping: ["De compras", "Hi! Are you looking for anything in particular today?", "¡Hola! ¿Busca algo en particular hoy?"],
  directions: ["Pidiendo direcciones", "Hi, you look a little lost. Can I help you find something?", "Hola, parece un poco perdido. ¿Le ayudo a encontrar algo?"],
};
let tutorStatus = null;
async function checkTutor() {
  try { tutorStatus = await (await fetch("/api/status")).json(); }
  catch { tutorStatus = { tutor: false, offline: true }; }
}
const talk = { scenario: "free", history: [], busy: false };
function startScenario(key) {
  const [, en, es] = SCENARIOS[key];
  talk.scenario = key;
  talk.history = [{ role: "assistant", text: en, es, words: [] }];
  if (S.autoSpeak) speak(en);
}
async function renderTalk() {
  if (!tutorStatus) { app.innerHTML = `<p class="muted">Conectando con el tutor...</p>`; await checkTutor(); if (view !== "talk") return; }
  if (!talk.history.length) startScenario(talk.scenario);
  const off = !tutorStatus.tutor;
  app.innerHTML = `
    <section class="card">
      <div class="row between">
        <label>Situación <select id="scn">${Object.entries(SCENARIOS).map(([k, [n]]) => `<option value="${k}" ${k === talk.scenario ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        <label class="row small"><input type="checkbox" id="auto" ${S.autoSpeak ? "checked" : ""}> Leer respuestas en voz alta</label>
      </div>
      ${off ? `<div class="feedback info small">${tutorStatus.offline
        ? "No hay conexión con el servidor. Abre la app con <b>python server.py</b>."
        : "El tutor IA está desactivado: falta la API key. Configura <b>ANTHROPIC_API_KEY</b> y reinicia el servidor (ver LEEME.md)."}</div>` : ""}
      <div class="chat" id="chat" aria-live="polite"></div>
      <div class="composer">
        ${canListen ? `<button class="mic" id="mic" aria-label="Hablar" ${off ? "disabled" : ""}>${ICON.mic}</button>` : ""}
        <textarea id="msg" rows="1" placeholder="${canListen ? "Toca el micrófono y habla, o escribe..." : "Escribe en inglés..."}" ${off ? "disabled" : ""}></textarea>
        <button class="icon-btn" id="send" aria-label="Enviar" ${off ? "disabled" : ""}>${ICON.send}</button>
      </div>
      <p class="small muted" style="margin-top:8px">Consejo: habla aunque te equivoques. Emma te corrige con la frase natural y una explicación corta en español.</p>
    </section>`;
  drawChat();
  $("#scn").onchange = (e) => { stopSpeaking(); startScenario(e.target.value); drawChat(); };
  $("#auto").onchange = (e) => { S.autoSpeak = e.target.checked; save(); if (!S.autoSpeak) stopSpeaking(); };
  const msg = $("#msg");
  msg.oninput = () => { msg.style.height = "auto"; msg.style.height = msg.scrollHeight + "px"; };
  msg.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendTalk(msg.value, false); } };
  $("#send").onclick = () => sendTalk(msg.value, false);
  if (canListen) $("#mic").onclick = async () => {
    const mic = $("#mic");
    if (activeRec) return stopListening();
    if (talk.busy) return;
    mic.classList.add("rec");
    let said = "", micError = "";
    try { said = await listen((t) => { msg.value = t; }); }
    catch (e) { micError = e.message; }
    mic.classList.remove("rec");
    if (said) sendTalk(said, true); else toast(micError || NOT_HEARD);
  };
}
function drawChat() {
  const chat = $("#chat");
  if (!chat) return;
  chat.innerHTML = talk.history.map((m, i) => m.role === "user"
    ? `<div class="msg me">${esc(m.text)}</div>${m.correction || m.tip ? `<div class="correction">
        ${m.correction ? `Mejor dicho: <span class="en">${esc(m.correction)}</span> <button class="icon-btn" data-sayc="${i}" aria-label="Escuchar corrección" style="width:28px;height:28px;vertical-align:middle">${ICON.speaker}</button>` : ""}
        ${m.tip ? `<div class="small" style="margin-top:4px">${esc(m.tip)}</div>` : ""}</div>` : ""}`
    : `<div class="msg bot">${esc(m.text)}
        <div class="es" ${m.showEs ? "" : "hidden"}>${esc(m.es || "")}</div>
        ${m.words?.length ? `<div class="words">${m.words.map((w) => `<span><b>${esc(w.en)}</b> · ${esc(w.es)}</span>`).join("")}</div>` : ""}
        <div class="tools"><button data-say="${i}">Escuchar</button><button data-slow="${i}">Lento</button><button data-es="${i}">${m.showEs ? "Ocultar" : "Traducir"}</button></div>
      </div>`).join("") + (talk.busy ? `<div class="typing">Emma está escribiendo…</div>` : "");
  chat.querySelectorAll("[data-say]").forEach((b) => b.onclick = () => speak(talk.history[+b.dataset.say].text));
  chat.querySelectorAll("[data-slow]").forEach((b) => b.onclick = () => speak(talk.history[+b.dataset.slow].text, { rate: 0.7 }));
  chat.querySelectorAll("[data-sayc]").forEach((b) => b.onclick = () => speak(talk.history[+b.dataset.sayc].correction));
  chat.querySelectorAll("[data-es]").forEach((b) => b.onclick = () => { const m = talk.history[+b.dataset.es]; m.showEs = !m.showEs; drawChat(); });
  chat.scrollTop = chat.scrollHeight;
}
async function sendTalk(text, spoken) {
  text = text.trim();
  if (!text || talk.busy) return;
  stopSpeaking();
  const userMsg = { role: "user", text };
  talk.history.push(userMsg);
  talk.busy = true;
  const msg = $("#msg"); if (msg) { msg.value = ""; msg.style.height = "auto"; }
  drawChat();
  try {
    const res = await fetch("/api/tutor", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: S.level, scenario: talk.scenario, history: talk.history.map(({ role, text }) => ({ role, text })) }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error del tutor");
    userMsg.correction = data.correction; userMsg.tip = data.tip_es;
    talk.history.push({ role: "assistant", text: data.reply, es: data.reply_es, words: data.new_words || [] });
    addXP(spoken ? 3 : 2);
    if (spoken) bump("talkByDay");
    talk.busy = false;
    drawChat();
    if (S.autoSpeak) speak(data.reply);
  } catch (e) {
    talk.busy = false;
    talk.history.pop();
    drawChat();
    if (msg) msg.value = text;
    toast(e.message || "No se pudo contactar al tutor.");
  }
}

// ---------- Inicio de la app ----------
renderStats();
go("home");
