import { BOOKS, COMMON } from "./books.js";
import { VERB_FORM_INDEX } from "./verbs.js";
import {
  S, save, addXP, $, app, esc, ICON, toast, speak, stopSpeaking, canListen, listen, stopListening, isListening,
  NOT_HEARD, compare, allVocab, checkTutor, tutorStatus,
} from "./core.js";

// ---------- Progreso por capítulo ----------
function progress(bookId, ch) {
  S.books[bookId] ??= {};
  return (S.books[bookId][ch] ??= { listened: false, readBest: 0 });
}
const chapterDone = (bookId, ch) => { const p = S.books[bookId]?.[ch]; return !!(p?.listened && p.readBest >= 0.8); };

// ---------- Texto: frases y palabras tocables ----------
function splitSentences(text) {
  return (text.match(/[^.!?]+[.!?]+["”]?/g) || [text]).map((s) => s.trim()).filter(Boolean);
}
// Devuelve el HTML de una frase con cada palabra en un <span data-w> y su posición en la frase.
function sentenceHTML(sentence, si) {
  let html = "", last = 0;
  for (const m of sentence.matchAll(/[A-Za-zÀ-ÿ]+(?:['’-][A-Za-zÀ-ÿ]+)*/g)) {
    html += esc(sentence.slice(last, m.index));
    html += `<span class="w" data-w="${esc(m[0])}" data-s="${si}" data-c="${m.index}">${esc(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  return html + esc(sentence.slice(last));
}

// ---------- Diccionario: busca la palabra en el glosario, palabras comunes, verbos y vocabulario ----------
function normalize(w) { return w.toLowerCase().replace(/’/g, "'"); }
function lookup(raw, chapter, sentence) {
  const w = normalize(raw);
  const gl = chapter.glossary || {};
  const vocab = Object.fromEntries(allVocab().map(([en, es]) => [en.toLowerCase(), es]));
  const find = (x) => gl[x] || COMMON[x] || vocab[x];
  const result = { word: raw, meaning: "", verb: null, note: "" };

  // Expresiones de varias palabras del capítulo presentes en esta frase.
  const s = normalize(sentence);
  result.phrases = Object.entries(gl).filter(([k]) => k.includes(" ") && s.includes(k) && k.split(" ").includes(w));

  let base = w;
  if (w.endsWith("'s") && !find(w)) { base = w.slice(0, -2); result.note = "«'s» indica posesión (de) o es la contracción de «is»."; }
  result.meaning = find(base) || "";
  const verb = VERB_FORM_INDEX[base];
  if (verb) {
    result.verb = verb;
    if (!result.meaning) result.meaning = verb.es;
    const forms = [[verb.past, "el pasado"], [verb.pp, "el participio"], [verb.ing, "la forma -ing"], [verb.s, "la 3ª persona (he/she/it)"]];
    const found = verb.base === base ? [] : forms.filter(([f]) => f.split(" / ").includes(base)).map(([, n]) => n);
    if (found.length) result.note = `Es ${[...new Set(found)].join(" y ")} de «${verb.base}» (${verb.es}).`;
  }
  if (!result.meaning && base.includes("-")) {
    // Palabras compuestas (twenty-four, medium-sized): se buscan por partes.
    const parts = base.split("-").map((p) => find(p) || VERB_FORM_INDEX[p]?.es);
    if (parts.every(Boolean)) result.meaning = parts.join(" + ");
  }
  if (!result.meaning && /^[A-ZÁÉÍÓÚÑ]/.test(raw)) {
    result.meaning = "Nombre propio";
    result.note = "Es el nombre de una persona o un lugar; no se traduce.";
  }
  if (!result.meaning) {
    // Plurales y comparativos simples.
    const tries = [[/ies$/, "y"], [/es$/, ""], [/s$/, ""], [/ly$/, ""], [/er$/, ""], [/est$/, ""]];
    for (const [re, rep] of tries) {
      if (!re.test(base)) continue;
      const cand = base.replace(re, rep);
      if (find(cand)) { result.meaning = find(cand); result.note ||= `Forma derivada de «${cand}».`; break; }
    }
  }
  return result;
}

// ---------- Panel de palabra ----------
let panelSeq = 0;
function closePanel() { document.querySelector(".sheet")?.remove(); document.querySelector(".sheet-bg")?.remove(); }
async function openWordPanel(raw, chapter, sentence, go) {
  closePanel();
  const info = lookup(raw, chapter, sentence);
  const seq = ++panelSeq;
  const saved = allVocab().some(([en]) => en.toLowerCase() === normalize(raw));
  const bg = document.createElement("div"); bg.className = "sheet-bg"; bg.onclick = closePanel;
  const el = document.createElement("div"); el.className = "sheet"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", `Significado de ${raw}`);
  el.innerHTML = `
    <div class="row between">
      <div class="row"><span class="sheet-word">${esc(raw)}</span>
        <button class="icon-btn" id="pw-say" aria-label="Escuchar">${ICON.speaker}</button>
        <button class="icon-btn" id="pw-slow" aria-label="Escuchar lento">${ICON.slow}</button></div>
      <button class="icon-btn" id="pw-close" aria-label="Cerrar">✕</button>
    </div>
    <p class="meaning" id="pw-meaning">${info.meaning ? esc(info.meaning) : '<span class="muted">No está en el diccionario sin conexión.</span>'}</p>
    ${info.note ? `<p class="small">${esc(info.note)}</p>` : ""}
    ${info.phrases.map(([k, v]) => `<p class="small"><b>Expresión:</b> «${esc(k)}» = ${esc(v)}</p>`).join("")}
    ${info.verb ? `<div class="verb-mini"><span><b>${esc(info.verb.base)}</b> · ${esc(info.verb.past)} · ${esc(info.verb.pp)}</span>
      <button class="btn small-btn" id="pw-verb">Ver conjugación</button></div>` : ""}
    <div id="pw-ai"></div>
    <div class="row" style="margin-top:12px">
      <button class="btn" id="pw-explain">Explicar en esta frase (IA)</button>
      <button class="btn ${saved ? "" : "primary"}" id="pw-save" ${saved ? "disabled" : ""}>${saved ? "Ya está en tus tarjetas" : "Agregar a mis tarjetas"}</button>
      <a class="btn" href="https://www.wordreference.com/es/translation.asp?tranword=${encodeURIComponent(raw.toLowerCase())}" target="_blank" rel="noopener">WordReference</a>
    </div>`;
  document.body.append(bg, el);
  speak(raw);
  $("#pw-say").onclick = () => speak(raw);
  $("#pw-slow").onclick = () => speak(raw, { rate: 0.6 });
  $("#pw-close").onclick = closePanel;
  if (info.verb) $("#pw-verb").onclick = () => { closePanel(); go("verb", { base: info.verb.base }); };
  let meaning = info.meaning;
  $("#pw-save").onclick = () => {
    S.customVocab.push([raw.toLowerCase(), meaning || "(ver ejemplo)", sentence]);
    save();
    $("#pw-save").disabled = true; $("#pw-save").textContent = "Agregada a tus tarjetas";
    toast("La repasarás en la sección Palabras.");
  };
  const explain = async () => {
    if (!tutorStatus) await checkTutor();
    if (!tutorStatus.tutor) { $("#pw-ai").innerHTML = `<p class="small muted">La explicación con IA necesita la API key configurada en el servidor.</p>`; return; }
    $("#pw-explain").disabled = true;
    $("#pw-ai").innerHTML = `<p class="small muted">Buscando el significado en esta frase…</p>`;
    try {
      const r = await fetch("/api/explain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "word", word: raw, sentence }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (seq !== panelSeq) return;
      if (!info.meaning) { meaning = d.meaning_es; $("#pw-meaning").textContent = d.meaning_es; }
      $("#pw-ai").innerHTML = `<div class="ai-box">
        <div><b>${esc(d.meaning_es)}</b> <span class="muted small">(${esc(d.part_of_speech_es)}${d.base_form && d.base_form.toLowerCase() !== raw.toLowerCase() ? ` · forma base: ${esc(d.base_form)}` : ""})</span></div>
        <div class="small" style="margin-top:6px"><span class="en">${esc(d.example_en)}</span><br><span class="muted">${esc(d.example_es)}</span></div>
        ${d.note_es ? `<div class="small" style="margin-top:6px">${esc(d.note_es)}</div>` : ""}</div>`;
    } catch (e) {
      if (seq === panelSeq) $("#pw-ai").innerHTML = `<p class="small muted">${esc(e.message || "No se pudo obtener la explicación.")}</p>`;
    }
  };
  $("#pw-explain").onclick = explain;
  if (!info.meaning) { if (!tutorStatus) await checkTutor(); if (tutorStatus?.tutor && seq === panelSeq) explain(); }
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });

// ---------- Lista de libros ----------
export function renderBooks(ctx, go) {
  app.innerHTML = `
    <section class="card">
      <h1>Audiolibros</h1>
      <p class="muted">Primero <b>escucha</b> el capítulo siguiendo el texto; toca cualquier palabra para ver su significado. Después <b>léelo tú en voz alta</b> y te corrijo frase por frase.</p>
    </section>
    ${BOOKS.map((b) => {
      const done = b.chapters.filter((_, i) => chapterDone(b.id, i)).length;
      return `<section class="card">
        <div class="row between"><h2>${esc(b.title)}</h2><span class="badge">${b.level}</span></div>
        <p class="small muted">${esc(b.title_es)} · ${esc(b.about)}</p>
        <div class="stack">${b.chapters.map((c, i) => {
          const p = S.books[b.id]?.[i];
          const status = chapterDone(b.id, i) ? '<span class="badge done">Completado</span>'
            : p?.listened ? '<span class="badge">Escuchado · falta leer</span>' : "";
          return `<button class="btn lesson-item" data-b="${b.id}" data-c="${i}">
            <span class="grow">${i + 1}. ${esc(c.title)}${p?.readBest ? `<br><span class="small muted">Mejor lectura: ${Math.round(p.readBest * 100)}%</span>` : ""}</span>${status}</button>`;
        }).join("")}</div>
        <div class="small muted" style="margin-top:8px">${done}/${b.chapters.length} capítulos completados</div>
      </section>`;
    }).join("")}`;
  app.querySelectorAll("[data-b]").forEach((b) => b.onclick = () => go("book", { bookId: b.dataset.b, ch: +b.dataset.c, mode: "listen" }));
}

// ---------- Lector: escuchar y leer en voz alta ----------
let playToken = 0;
export function stopBook() { playToken++; closePanel(); }

export function renderBook(ctx, go) {
  const book = BOOKS.find((b) => b.id === ctx.bookId);
  const chapter = book.chapters[ctx.ch];
  const sentences = splitSentences(chapter.text);
  ctx.idx ??= 0;
  const header = `
    <button class="back" id="back">← Audiolibros</button>
    <section class="card">
      <div class="row between"><div><span class="badge">${book.level}</span> <span class="small muted">${esc(book.title)}</span></div>
        <select id="chsel" aria-label="Capítulo">${book.chapters.map((c, i) => `<option value="${i}" ${i === ctx.ch ? "selected" : ""}>Capítulo ${i + 1}</option>`).join("")}</select></div>
      <h1 style="margin-top:8px">${esc(chapter.title)}</h1>
      <div class="seg" role="tablist">
        <button class="${ctx.mode === "listen" ? "on" : ""}" data-mode="listen">1. Escuchar</button>
        <button class="${ctx.mode === "read" ? "on" : ""}" data-mode="read">2. Leer en voz alta</button>
      </div>
    </section>`;
  const bindHeader = () => {
    $("#back").onclick = () => go("books");
    $("#chsel").onchange = (e) => go("book", { bookId: book.id, ch: +e.target.value, mode: "listen" });
    app.querySelectorAll("[data-mode]").forEach((b) => b.onclick = () => go("book", { bookId: book.id, ch: ctx.ch, mode: b.dataset.mode }));
    app.querySelectorAll(".w").forEach((w) => w.onclick = (e) => {
      e.stopPropagation();
      ctx.pause?.();
      openWordPanel(w.dataset.w, chapter, sentences[+w.dataset.s], go);
    });
  };
  const phrases = Object.entries(chapter.glossary).filter(([k]) => k.includes(" "));
  const expressions = phrases.length ? `<section class="card"><h3>Expresiones de este capítulo</h3>
    ${phrases.map(([k, v]) => `<div class="small"><b>${esc(k)}</b> — ${esc(v)}</div>`).join("")}</section>` : "";

  if (ctx.mode === "listen") {
    app.innerHTML = `${header}
      <section class="card player">
        <div class="row">
          <button class="icon-btn" id="prev" aria-label="Frase anterior">⏮</button>
          <button class="mic play" id="play" aria-label="Reproducir">▶</button>
          <button class="icon-btn" id="next" aria-label="Frase siguiente">⏭</button>
          <select id="rate" aria-label="Velocidad">${[[0.7, "Lenta"], [0.85, "Media"], [0.95, "Normal"], [1.1, "Rápida"]]
            .map(([v, n]) => `<option value="${v}" ${v === (S.bookRate ?? 0.85) ? "selected" : ""}>${n}</option>`).join("")}</select>
          <button class="btn" id="translate">Traducir frase</button>
        </div>
        <div class="small muted" id="pos" style="margin-top:8px"></div>
        <div id="tr"></div>
      </section>
      <section class="card book-text" id="text">
        ${sentences.map((s, i) => `<span class="sent" data-i="${i}">${sentenceHTML(s, i)}</span> `).join("")}
      </section>
      ${expressions}
      <div id="end"></div>`;
    bindHeader();
    const mark = () => {
      app.querySelectorAll(".sent").forEach((el) => el.classList.toggle("now", +el.dataset.i === ctx.idx));
      app.querySelectorAll(".w.speaking").forEach((el) => el.classList.remove("speaking"));
      $("#pos").textContent = `Frase ${Math.min(ctx.idx + 1, sentences.length)} de ${sentences.length}`;
      $("#tr").innerHTML = "";
    };
    const setPlaying = (on) => { ctx.playing = on; $("#play").textContent = on ? "⏸" : "▶"; $("#play").setAttribute("aria-label", on ? "Pausa" : "Reproducir"); };
    const finished = () => {
      const p = progress(book.id, ctx.ch);
      if (!p.listened) { p.listened = true; save(); addXP(10, "+10 XP por escuchar el capítulo"); }
      $("#end").innerHTML = `<section class="card" style="text-align:center">
        <h2>¡Terminaste de escuchar!</h2>
        <p class="muted">Ahora léelo tú en voz alta. Te escucho frase por frase y te marco las palabras que hay que mejorar.</p>
        <button class="btn primary" id="toread">${ICON.mic} Leer en voz alta</button></section>`;
      $("#toread").onclick = () => go("book", { bookId: book.id, ch: ctx.ch, mode: "read" });
      $("#end").scrollIntoView({ behavior: "smooth", block: "center" });
    };
    const play = async () => {
      const token = ++playToken;
      setPlaying(true);
      while (ctx.idx < sentences.length && token === playToken) {
        mark();
        const el = app.querySelector(`.sent[data-i="${ctx.idx}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        const words = el ? [...el.querySelectorAll(".w")] : [];
        await speak(sentences[ctx.idx], {
          rate: S.bookRate ?? 0.85,
          onBoundary: (c) => {
            words.forEach((w) => w.classList.toggle("speaking", +w.dataset.c === c));
          },
        });
        if (token !== playToken) return;
        await new Promise((r) => setTimeout(r, 250));
        if (token !== playToken) return;
        ctx.idx++;
      }
      setPlaying(false);
      if (ctx.idx >= sentences.length) { ctx.idx = sentences.length - 1; mark(); finished(); }
    };
    const pause = () => { playToken++; stopSpeaking(); setPlaying(false); };
    ctx.pause = () => { if (ctx.playing) pause(); };
    const jump = (i) => { const was = ctx.playing; pause(); ctx.idx = Math.max(0, Math.min(sentences.length - 1, i)); mark(); if (was) play(); };
    $("#play").onclick = () => (ctx.playing ? pause() : play());
    $("#prev").onclick = () => jump(ctx.idx - 1);
    $("#next").onclick = () => jump(ctx.idx + 1);
    $("#rate").onchange = (e) => { S.bookRate = +e.target.value; save(); };
    app.querySelectorAll(".sent").forEach((el) => el.ondblclick = () => jump(+el.dataset.i));
    $("#translate").onclick = async () => {
      const sentence = sentences[ctx.idx];
      if (!tutorStatus) await checkTutor();
      if (!tutorStatus.tutor) { $("#tr").innerHTML = `<p class="small muted" style="margin-top:8px">La traducción con IA necesita la API key configurada en el servidor.</p>`; return; }
      $("#tr").innerHTML = `<p class="small muted" style="margin-top:8px">Traduciendo…</p>`;
      try {
        const r = await fetch("/api/explain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "sentence", sentence }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        $("#tr").innerHTML = `<div class="ai-box" style="margin-top:8px"><span class="en">${esc(sentence)}</span><br>${esc(d.translation_es)}${d.note_es ? `<div class="small muted" style="margin-top:4px">${esc(d.note_es)}</div>` : ""}</div>`;
      } catch (e) { $("#tr").innerHTML = `<p class="small muted">${esc(e.message || "No se pudo traducir.")}</p>`; }
    };
    mark();
    setPlaying(false);
    return;
  }

  // ----- Modo lectura en voz alta -----
  ctx.results ??= [];
  const done = ctx.idx >= sentences.length;
  if (done) {
    const scores = ctx.results.map((r) => r?.score ?? 0);
    const avg = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
    const missed = [...new Set(ctx.results.flatMap((r) => r?.missed ?? []).map((w) => w.toLowerCase()))].filter(Boolean);
    const p = progress(book.id, ctx.ch);
    if (!ctx.saved) {
      ctx.saved = true;
      if (avg > p.readBest) p.readBest = avg;
      save();
      addXP(Math.round(10 + avg * 10), `+${Math.round(10 + avg * 10)} XP por leer el capítulo`);
    }
    const skipped = ctx.results.filter((r) => r?.skipped).length;
    const nextCh = ctx.ch + 1 < book.chapters.length ? ctx.ch + 1 : null;
    app.innerHTML = `${header}
      <section class="card" style="text-align:center">
        <h2>¡Capítulo leído!</h2>
        <p class="big-num">${Math.round(avg * 100)}%</p>
        ${skipped ? `<p class="small muted">Saltaste ${skipped} de ${sentences.length} frases; cuentan como 0%.</p>` : ""}
        <p class="muted">${avg >= 0.9 ? "¡Excelente pronunciación!" : avg >= 0.75 ? "¡Muy bien! Repasa las palabras marcadas." : "Buen esfuerzo. Escucha otra vez las palabras marcadas y vuelve a intentarlo."}</p>
      </section>
      ${missed.length ? `<section class="card"><h3>Palabras para practicar</h3>
        <p class="small muted">Tócalas para escucharlas y ver su significado.</p>
        <div class="words">${missed.map((w) => `<button class="chip w" data-w="${esc(w)}" data-s="0">${esc(w)}</button>`).join("")}</div></section>` : ""}
      <div class="row" style="justify-content:center">
        <button class="btn" id="again">Leer otra vez</button>
        ${nextCh !== null ? `<button class="btn primary" id="nextch">Capítulo ${nextCh + 1}</button>` : `<button class="btn primary" id="lib">Elegir otro libro</button>`}
      </div>`;
    bindHeader();
    // Las palabras para practicar se buscan en la frase donde fallaron.
    app.querySelectorAll(".words .w").forEach((b) => b.onclick = () => {
      const s = sentences.find((x) => x.toLowerCase().includes(b.dataset.w)) || "";
      openWordPanel(b.dataset.w, chapter, s, go);
    });
    $("#again").onclick = () => go("book", { bookId: book.id, ch: ctx.ch, mode: "read" });
    if (nextCh !== null) $("#nextch").onclick = () => go("book", { bookId: book.id, ch: nextCh, mode: "listen" });
    else $("#lib").onclick = () => go("books");
    return;
  }

  const current = sentences[ctx.idx];
  app.innerHTML = `${header}
    <section class="card">
      <div class="steps">${sentences.map((_, i) => {
        const r = ctx.results[i];
        const cls = i === ctx.idx ? "on" : r ? (r.score >= 0.8 ? "good" : "weak") : "";
        return `<span class="${cls}"></span>`;
      }).join("")}</div>
      <div class="small muted">Frase ${ctx.idx + 1} de ${sentences.length}. Lee en voz alta, con calma.</div>
      <p class="read-now">${sentenceHTML(current, ctx.idx)}</p>
      <div class="row">
        ${canListen ? `<button class="btn primary" id="rec">${ICON.mic} Leer</button>` : ""}
        <button class="btn" id="model">${ICON.speaker} Escuchar modelo</button>
        <button class="btn" id="skip">Saltar</button>
      </div>
      <p class="small muted" id="heard" style="margin-top:10px"></p>
      <div id="fb"></div>
      ${canListen ? "" : `<p class="feedback info small">Tu navegador no permite reconocimiento de voz. Usa Chrome o Edge para que te corrija.</p>`}
    </section>
    <section class="card book-text small">
      ${sentences.map((s, i) => {
        const r = ctx.results[i];
        return i < ctx.idx
          ? `<span class="sent ${r ? (r.score >= 0.8 ? "read-good" : "read-weak") : ""}">${r?.html ? `<span class="diff">${r.html}</span>` : sentenceHTML(s, i)}</span> `
          : `<span class="sent ${i === ctx.idx ? "now" : "muted"}">${sentenceHTML(s, i)}</span> `;
      }).join("")}
    </section>`;
  bindHeader();
  const advance = () => { ctx.idx++; render(); };
  const render = () => renderBook(ctx, go);
  $("#model").onclick = () => speak(current, { rate: S.bookRate ?? 0.85 });
  $("#skip").onclick = () => { ctx.results[ctx.idx] = { score: 0, missed: [], html: "", skipped: true }; advance(); };
  if (!canListen) return;
  let tries = 0;
  $("#rec").onclick = async () => {
    const btn = $("#rec");
    if (isListening()) return stopListening();
    stopSpeaking();
    btn.innerHTML = `${ICON.stop} Terminar`;
    let said = "", micError = "";
    try { said = await listen((t) => { $("#heard").textContent = `Escuché: «${t}»`; }); }
    catch (e) { micError = e.message; }
    btn.innerHTML = `${ICON.mic} Leer otra vez`;
    if (!said) { $("#heard").textContent = micError || NOT_HEARD; return; }
    tries++;
    const r = compare(current, said);
    const best = ctx.results[ctx.idx];
    if (!best || r.score > best.score) ctx.results[ctx.idx] = r;
    const pct = Math.round(r.score * 100);
    const good = r.score >= 0.8;
    $("#fb").innerHTML = `<div class="feedback ${good ? "ok" : "no"}">
      <div class="diff" style="font-size:1.1rem">${r.html}</div>
      <div style="margin-top:6px">${good ? `¡Bien leído! ${pct}%` : `${pct}% · Las palabras subrayadas no se entendieron bien.`}</div>
      ${!good && r.missed.length ? `<div class="words" style="margin-top:8px">${r.missed.filter(Boolean).map((w) => `<button class="chip" data-say="${esc(w)}">${ICON.speaker} ${esc(w)}</button>`).join("")}</div>` : ""}
    </div>
    <div class="row" style="margin-top:10px">
      ${good ? `<button class="btn primary" id="go-next">Siguiente frase</button>` : `<button class="btn" id="go-next">Seguir de todos modos</button>`}
    </div>`;
    app.querySelectorAll("[data-say]").forEach((b) => b.onclick = () => speak(b.dataset.say, { rate: 0.7 }));
    $("#go-next").onclick = advance;
    if (good) { addXP(1); $("#go-next").focus(); }
    else if (tries === 1) speak(current, { rate: S.bookRate ?? 0.85 });
  };
}
