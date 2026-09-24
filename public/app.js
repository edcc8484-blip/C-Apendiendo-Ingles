import { LESSONS, DICTATION, LISTENING } from "./data.js";
import {
  S, save, today, xpToday, totalXP, streak, addXP, bump, $, app, esc, shuffle, LEVEL_ORDER, levelIdx, ICON, toast,
  speak, stopSpeaking, canListen, listen, stopListening, NOT_HEARD, words, compare, cardFor, dueCards, newAvailable, grade,
  learnedCount, renderStats, checkTutor, tutorStatus, isListening, allVocab,
} from "./core.js";
import { renderBooks, renderBook, stopBook } from "./library.js";
import { renderVerbs, renderVerb, renderVerbQuiz } from "./verbs-view.js";
import { BOOKS } from "./books.js";
import { IT_LESSONS, IT_STAGES } from "./it-track.js";

const ALL_LESSONS = [...LESSONS, ...IT_LESSONS];
// La ruta de Redes se desbloquea en orden: cada lección exige completar la anterior.
const itUnlocked = (l) => { const i = IT_LESSONS.indexOf(l); return i <= 0 || !!S.lessonsDone[IT_LESSONS[i - 1].id]; };

// ---------- Navegación ----------
let view = "home";
let ctx = {}; // estado de la vista actual
function go(v, c = {}) {
  stopBook(); stopSpeaking(); stopListening();
  view = v; ctx = c;
  document.querySelectorAll("#tabs button").forEach((b) => {
    const tab = { lesson: "lessons", book: "books", verb: "verbs", verbquiz: "verbs" }[v] || v;
    b.classList.toggle("active", b.dataset.view === tab);
  });
  render();
  window.scrollTo(0, 0);
}
$("#tabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) go(b.dataset.view); });


function render() {
  const views = {
    home: renderHome, lessons: renderLessons, lesson: renderLesson, vocab: renderVocab, listen: renderListen, talk: renderTalk,
    books: () => renderBooks(ctx, go), book: () => renderBook(ctx, go),
    verbs: () => renderVerbs(ctx, go), verb: () => renderVerb(ctx, go), verbquiz: () => renderVerbQuiz(ctx, go),
  };
  views[view]();
}

// ---------- Inicio ----------
// Siguiente capítulo de audiolibro sin completar, empezando por el nivel del usuario.
function nextChapter() {
  const books = [...BOOKS].sort((a, b) => Math.abs(levelIdx(a.level) - levelIdx(S.level)) - Math.abs(levelIdx(b.level) - levelIdx(S.level)));
  for (const b of books) for (let i = 0; i < b.chapters.length; i++) {
    const p = S.books[b.id]?.[i];
    if (!(p?.listened && p.readBest >= 0.8)) {
      return { done: false, title: `Audiolibro: ${b.title}`, sub: `Capítulo ${i + 1} · ${p?.listened ? "léelo en voz alta" : "escúchalo y luego léelo"}`,
        go: "book", arg: { bookId: b.id, ch: i, mode: p?.listened ? "read" : "listen" } };
    }
  }
  return { done: true, title: "Audiolibros terminados", sub: "¡Leíste todos los libros!", go: "books" };
}
function nextLesson() {
  if (S.lessonTrack === "it") return IT_LESSONS.find((l) => !S.lessonsDone[l.id]);
  return LESSONS.find((l) => !S.lessonsDone[l.id] && levelIdx(l.level) <= levelIdx(S.level))
    || LESSONS.find((l) => !S.lessonsDone[l.id]);
}
function renderHome() {
  const pct = Math.min(100, Math.round((xpToday() / S.dailyGoal) * 100));
  const nl = nextLesson();
  const due = dueCards().length;
  const toReview = due + Math.min(newAvailable(), allVocab().filter(([en]) => !S.cards[en]).length);
  const talked = (S.talkByDay[today()] || 0) >= 5;
  const dictated = (S.dictByDay[today()] || 0) >= 5;
  const tasks = [
    { done: toReview === 0, title: "Repasa tus palabras", sub: toReview ? `${toReview} tarjetas para hoy` : "Todo al día", go: "vocab" },
    { done: !nl, title: nl ? `Lección: ${nl.title}` : "Todas las lecciones completadas", sub: nl ? `Nivel ${nl.level} · 5-10 min` : "¡Excelente!", go: nl ? "lesson" : "lessons", arg: nl && { id: nl.id } },
    { done: dictated, title: "Entrena el oído", sub: `Dictado: ${Math.min(5, S.dictByDay[today()] || 0)}/5 frases`, go: "listen" },
    nextChapter(),
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
      <section class="card"><div class="muted small">Palabras aprendidas</div><div class="big-num">${learnedCount()} <span class="small muted">/ ${allVocab().length}</span></div></section>
      <section class="card"><div class="muted small">Lecciones</div><div class="big-num">${Object.keys(S.lessonsDone).length} <span class="small muted">/ ${ALL_LESSONS.length}</span></div></section>
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
      <p class="small muted" style="margin-top:10px">A1 principiante · A2 básico · B1 intermedio · B2 intermedio alto · C1 avanzado · C2 dominio. El nivel ajusta al tutor (y cuánto español usa) y el orden de las lecciones.</p>
      ${canListen ? "" : `<p class="feedback info small">Tu navegador no permite reconocimiento de voz. Usa Google Chrome o Microsoft Edge para practicar hablando.</p>`}
    </section>`;
  app.querySelectorAll("[data-go]").forEach((b) => b.onclick = () => go(b.dataset.go, b.dataset.arg ? JSON.parse(b.dataset.arg) : {}));
  $("#set-level").onchange = (e) => { S.level = e.target.value; save(); render(); };
  $("#set-rate").onchange = (e) => { S.rate = +e.target.value; save(); speak("This is how I sound."); };
  $("#set-goal").onchange = (e) => { S.dailyGoal = +e.target.value; save(); renderStats(); render(); };
}

// ---------- Lecciones ----------
function lessonButton(l) {
  const locked = l.track === "it" && !itUnlocked(l);
  const badge = S.lessonsDone[l.id] ? '<span class="badge done">Completada</span>'
    : locked ? '<span class="badge locked">🔒 Completa la anterior</span>' : '<span class="badge">Nueva</span>';
  return `<button class="btn lesson-item" data-id="${l.id}" ${locked ? "disabled" : ""}>
    <span class="grow">${esc(l.title)}<br><span class="small muted">${l.terms ? `${l.terms.length} términos · ` : ""}${l.phrases.length} frases · ${l.exercises.length} ejercicios</span></span>${badge}</button>`;
}
function renderLessons() {
  const it = S.lessonTrack === "it";
  const seg = `<div class="seg" role="tablist" style="margin-bottom:14px">
      <button class="${it ? "" : "on"}" data-track="general">Inglés general</button>
      <button class="${it ? "on" : ""}" data-track="it">Redes y TI</button>
    </div>`;
  const body = it
    ? `<section class="card"><h1>Inglés para Redes e Infraestructura</h1>
        <p class="muted">Ruta de 4 niveles, de principiante a ejecutivo. Cada término trae su IPA y pronunciación figurada. Los ejercicios de cada lección son su quiz: al completarla se desbloquea la siguiente.</p></section>`
      + IT_STAGES.map((st) => {
        const ls = IT_LESSONS.filter((l) => l.stage === st.stage);
        const done = ls.filter((l) => S.lessonsDone[l.id]).length;
        return `<section class="card"><div class="row between"><h2>${esc(st.name)}</h2><span class="badge">${st.cefr}</span></div>
          <div class="small muted" style="margin-bottom:10px">${done}/${ls.length} lecciones completadas</div>
          <div class="stack">${ls.map(lessonButton).join("")}</div></section>`;
      }).join("")
    : LEVEL_ORDER.filter((lv) => LESSONS.some((l) => l.level === lv)).map((lv) => `
      <section class="card"><h2>Nivel ${lv}</h2>
        <div class="stack">${LESSONS.filter((l) => l.level === lv).map(lessonButton).join("")}</div>
      </section>`).join("");
  app.innerHTML = seg + body;
  app.querySelectorAll("[data-track]").forEach((b) => b.onclick = () => { S.lessonTrack = b.dataset.track; save(); renderLessons(); });
  app.querySelectorAll("[data-id]").forEach((b) => b.onclick = () => go("lesson", { id: b.dataset.id }));
}

function renderLesson() {
  const lesson = ALL_LESSONS.find((l) => l.id === ctx.id);
  S.lessonTrack = lesson.track || "general";
  ctx.phase ??= "learn";
  if (ctx.phase === "learn") {
    app.innerHTML = `
      <button class="back" id="back">← Lecciones</button>
      <section class="card">
        <span class="badge">${lesson.level}</span>
        <h1 style="margin-top:8px">${esc(lesson.title)}</h1>
        <p>${esc(lesson.intro)}</p>
      </section>
      ${lesson.terms ? `<section class="card">
        <h2>Vocabulario técnico</h2>
        ${lesson.terms.map((t, i) => `
          <div class="phrase">
            <button class="icon-btn" data-term="${i}" aria-label="Escuchar ${esc(t.en)}">${ICON.speaker}</button>
            <div class="grow"><div><span class="en">${esc(t.en)}</span> <span class="ipa">${esc(t.ipa)}</span> <span class="say">${esc(t.say)}</span></div>
              <div class="small muted">${esc(t.es)}</div></div>
          </div>`).join("")}
      </section>` : ""}
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
    app.querySelectorAll("[data-term]").forEach((b) => b.onclick = () => speak(lesson.terms[+b.dataset.term].en));
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
      if (isListening()) return stopListening();
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
    const fresh = allVocab().filter(([en]) => !S.cards[en]).slice(0, newAvailable());
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
    const rest = allVocab().filter(([en]) => !S.cards[en]);
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
  const learned = allVocab().filter(([en]) => S.cards[en]?.reps > 0);
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
  "it-coach": ["Clase: tutor de Redes", "Hi! I'm Emma, your English coach for networking. Let's start: is the router up or down? Answer with a full sentence.", "¡Hola! Soy Emma, tu coach de inglés para redes. Empecemos: ¿el router está arriba o caído? Responde con una oración completa."],
  "it-incident": ["Incidente P1 (bridge call)", "This is the P1 bridge for the main office outage. What is the current status of the core switch?", "Esta es la llamada P1 por la caída de la oficina principal. ¿Cuál es el estado actual del switch core?"],
  "it-ticket": ["Ticket en ServiceNow", "Let's document this incident in ServiceNow. What should we write in the short description?", "Documentemos este incidente en ServiceNow. ¿Qué escribimos en la descripción corta?"],
  "it-vendor": ["Llamada con Cisco TAC", "Thank you for calling Cisco TAC. Can you give me the serial number and the software version of the device?", "Gracias por llamar a Cisco TAC. ¿Me da el número de serie y la versión de software del equipo?"],
  "it-standup": ["Stand-up del equipo", "Good morning, team. Let's start the stand-up. What did you work on yesterday?", "Buenos días, equipo. Empecemos el stand-up. ¿En qué trabajaste ayer?"],
};
const scenarioOptions = () => {
  const opt = ([k, [n]]) => `<option value="${k}" ${k === talk.scenario ? "selected" : ""}>${n}</option>`;
  const all = Object.entries(SCENARIOS);
  return `<optgroup label="Vida diaria">${all.filter(([k]) => !k.startsWith("it-")).map(opt).join("")}</optgroup>
    <optgroup label="Redes y TI">${all.filter(([k]) => k.startsWith("it-")).map(opt).join("")}</optgroup>`;
};
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
        <label>Situación <select id="scn">${scenarioOptions()}</select></label>
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
    if (isListening()) return stopListening();
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
    : `${m.lesson ? `<div class="lesson-box"><h4>Core Concept</h4>${esc(m.lesson)}</div>` : ""}
      <div class="msg bot">${m.lesson ? '<div class="small" style="font-weight:700;margin-bottom:2px">Your Turn</div>' : ""}${esc(m.text)}
        <div class="es" ${m.showEs ? "" : "hidden"}>${esc(m.es || "")}</div>
        ${m.words?.length ? `<div class="words">${m.words.map((w) => `<span><b>${esc(w.en)}</b> · ${esc(w.es)}</span>`).join("")}</div>` : ""}
        ${m.terms?.length ? `<div class="terms">${m.terms.map((t) => `<button data-term="${esc(t.en)}"><b>${esc(t.en)}</b><span class="ipa">${esc(t.ipa)}</span><span class="say">${esc(t.say_es)}</span><span class="small muted">${esc(t.es)}</span></button>`).join("")}</div>` : ""}
        <div class="tools"><button data-say="${i}">Escuchar</button><button data-slow="${i}">Lento</button><button data-es="${i}">${m.showEs ? "Ocultar" : "Traducir"}</button></div>
      </div>`).join("") + (talk.busy ? `<div class="typing">Emma está escribiendo…</div>` : "");
  chat.querySelectorAll("[data-say]").forEach((b) => b.onclick = () => speak(talk.history[+b.dataset.say].text));
  chat.querySelectorAll("[data-slow]").forEach((b) => b.onclick = () => speak(talk.history[+b.dataset.slow].text, { rate: 0.7 }));
  chat.querySelectorAll("[data-term]").forEach((b) => b.onclick = () => speak(b.dataset.term));
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
    talk.history.push({ role: "assistant", text: data.reply, es: data.reply_es, words: data.new_words || [], lesson: data.lesson || "", terms: data.terms || [] });
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
