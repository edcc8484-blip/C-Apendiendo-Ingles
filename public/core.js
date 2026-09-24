import { VOCAB } from "./data.js";

// Núcleo compartido: estado, voz, micrófono, comparación de frases y repaso espaciado.
// ---------- Estado persistente ----------
const STORE_KEY = "ingles-rapido.v1";
const DEFAULTS = {
  level: "A1", rate: 0.95, dailyGoal: 50, autoSpeak: true,
  xpByDay: {}, lessonsDone: {}, cards: {}, newByDay: {}, talkByDay: {}, dictByDay: {},
  customVocab: [], books: {}, verbQuiz: { right: 0, total: 0 },
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
function speak(text, { rate = S.rate, alt = false, onBoundary } = {}) {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) { toast("Tu navegador no soporta audio de voz."); return resolve(); }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = rate;
    const v = pickVoice(alt); if (v) u.voice = v;
    if (alt && !v) u.pitch = 0.8;
    if (onBoundary) u.onboundary = (e) => { if (e.name === "word") onBoundary(e.charIndex); };
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
const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
// El reconocimiento de voz escribe "24" donde el texto dice "twenty-four": se pasa todo a palabras.
function numToWords(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
  if (n < 1000) return ONES[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + numToWords(n % 100) : "");
  if (n < 10000) return numToWords(Math.floor(n / 1000)) + " thousand" + (n % 1000 ? " " + numToWords(n % 1000) : "");
  return String(n);
}
function words(s) {
  const base = s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[’`]/g, "'").replace(/[^a-z0-9'\s-]/g, " ").replace(/-/g, " ");
  return base.split(/\s+/).filter((w) => w && w !== "00" && w !== "'")
    .flatMap((w) => (/^\d+$/.test(w) ? numToWords(+w) : CONTRACTIONS[w] || w).split(" "))
    .map((w) => w.replace(/'/g, ""));
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
  const missed = [];
  const html = tokens.map((tok) => {
    const n = words(tok).length;
    const ok = Array.from({ length: n }, (_, x) => hit.has(k + x)).every(Boolean);
    k += n;
    if (!ok) missed.push(tok.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, ""));
    return `<span class="${ok ? "ok" : "miss"}">${esc(tok)}</span>`;
  }).join(" ");
  return { score: t.length ? hit.size / t.length : 0, html, missed, extra: s.length - hit.size };
}

// ---------- Repaso espaciado (SM-2 simplificado) ----------
const DAY = 86400000;
function cardFor(en) { return S.cards[en]; }
function dueCards() { const now = Date.now(); return allVocab().filter(([en]) => S.cards[en] && S.cards[en].due <= now); }
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

function renderStats() {
  $("#stats").innerHTML =
    `<span class="pill" title="Días seguidos">🔥 ${streak()}</span>` +
    `<span class="pill" title="XP de hoy / meta">${xpToday()}/${S.dailyGoal} XP</span>`;
}

// ---------- Estado del tutor IA ----------
export let tutorStatus = null;
async function checkTutor() {
  try { tutorStatus = await (await fetch("/api/status")).json(); }
  catch { tutorStatus = { tutor: false, offline: true }; }
}

export const isListening = () => !!activeRec;
// Vocabulario base + palabras que el usuario guardó desde los libros.
export const allVocab = () => [...VOCAB, ...S.customVocab];

export {
  S, save, today, xpToday, totalXP, streak, addXP, bump, $, app, esc, shuffle, LEVEL_ORDER, levelIdx, ICON, toast, speak, stopSpeaking, canListen, listen, stopListening, NOT_HEARD, words, compare, DAY, cardFor, dueCards, newAvailable, grade, learnedCount, renderStats, checkTutor,
};
