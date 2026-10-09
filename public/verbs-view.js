import { VERBS, VERB_BY_BASE, TENSES, conjugate } from "./verbs.js";
import { S, save, addXP, $, app, esc, ICON, speak } from "./core.js";
import { TOP_VERBS } from "./course.js";

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

// ---------- Lista y búsqueda ----------
export function renderVerbs(ctx, go) {
  ctx.q ??= "";
  ctx.filter ??= "all";
  const irregularCount = VERBS.filter((v) => v.irregular).length;
  app.innerHTML = `
    <section class="card">
      <h1>Diccionario de verbos</h1>
      <p class="muted">${VERBS.length} verbos: ${irregularCount} irregulares y ${VERBS.length - irregularCount} regulares. Toca un verbo para ver cómo se conjuga en todos los tiempos.</p>
      <input type="text" id="vq" placeholder="Busca en inglés o en español (ej. «go» o «comer»)" value="${esc(ctx.q)}" autocomplete="off" spellcheck="false">
      <div class="row between" style="margin-top:12px">
        <div class="seg" role="tablist">
          <button class="${ctx.filter === "all" ? "on" : ""}" data-f="all">Todos</button>
          <button class="${ctx.filter === "irr" ? "on" : ""}" data-f="irr">Irregulares</button>
          <button class="${ctx.filter === "reg" ? "on" : ""}" data-f="reg">Regulares</button>
        </div>
        <button class="btn primary" id="quiz">Practicar irregulares</button>
      </div>
    </section>
    <section class="card">
      <div class="verb-row verb-head"><span>Verbo</span><span>Pasado</span><span>Participio</span><span>Significado</span></div>
      <div id="vlist"></div>
    </section>
    <section class="card small muted">
      <b>Regla de los regulares:</b> pasado y participio terminan en <b>-ed</b> (work → worked). Si termina en <b>e</b> se agrega solo <b>-d</b> (live → lived);
      consonante + <b>y</b> cambia a <b>-ied</b> (study → studied); una sílaba con consonante-vocal-consonante dobla la última letra (stop → stopped).
      Los <b>irregulares</b> hay que memorizarlos: practícalos a diario.
    </section>`;
  const draw = () => {
    const q = norm(ctx.q.trim());
    const list = VERBS.filter((v) => (ctx.filter === "all" || (ctx.filter === "irr") === v.irregular)
      && (!q || [v.base, v.past, v.pp, v.ing, v.s].some((f) => f.startsWith(q)) || norm(v.es).includes(q)));
    $("#vlist").innerHTML = list.length
      ? list.map((v) => `<button class="verb-row" data-v="${esc(v.base)}">
          <span><b>${esc(v.base)}</b>${v.irregular ? ' <span class="badge">irr.</span>' : ""}</span>
          <span>${esc(v.past)}</span><span>${esc(v.pp)}</span><span class="muted">${esc(v.es)}</span></button>`).join("")
      : `<p class="muted">No encontré «${esc(ctx.q)}». Prueba con otra palabra.</p>`;
    $("#vlist").querySelectorAll("[data-v]").forEach((b) => b.onclick = () => go("verb", { base: b.dataset.v, back: { q: ctx.q, filter: ctx.filter } }));
  };
  draw();
  $("#vq").oninput = (e) => { ctx.q = e.target.value; draw(); };
  app.querySelectorAll("[data-f]").forEach((b) => b.onclick = () => { ctx.filter = b.dataset.f; renderVerbs(ctx, go); });
  $("#quiz").onclick = () => go("verbquiz");
}

// ---------- Ficha de un verbo ----------
export function renderVerb(ctx, go) {
  const v = VERB_BY_BASE[ctx.base];
  ctx.tense ??= "present";
  const tense = TENSES.find((t) => t.id === ctx.tense);
  const forms = [["Base", v.base], ["Pasado", v.past], ["Participio", v.pp], ["Gerundio (-ing)", v.ing], ["3ª persona", v.s]];
  const table = conjugate(v, ctx.tense);
  app.innerHTML = `
    <button class="back" id="back">← Verbos</button>
    <section class="card">
      <div class="row between">
        <div><h1 style="margin:0">to ${esc(v.base)}</h1><div class="meaning" style="margin-top:4px">${esc(v.es)}</div></div>
        <span class="badge ${v.irregular ? "" : "done"}">${v.irregular ? "Irregular" : "Regular"}</span>
      </div>
      <div class="forms">
        ${forms.map(([label, f]) => `<button class="form" data-say="${esc(f.replace(" / ", ", "))}">
          <span class="small muted">${label}</span><b>${esc(f)}</b></button>`).join("")}
      </div>
      <p class="small muted" style="margin-top:10px">Toca cualquier forma o frase para escucharla.</p>
    </section>
    <section class="card">
      <label class="small muted" for="tense">Tiempo verbal</label>
      <div class="chips-scroll" role="tablist">
        ${TENSES.map((t) => `<button class="chip ${t.id === ctx.tense ? "chip-on" : ""}" data-t="${t.id}">${esc(t.name)}</button>`).join("")}
      </div>
      <h2 style="margin-top:14px">${esc(tense.name)}</h2>
      <p class="small">${esc(tense.es)} <span class="muted">Ej.: ${esc(tense.ex)}</span></p>
      <div class="conj">
        <div class="conj-head"><span></span><span>Afirmativa</span><span>Negativa</span><span>Pregunta</span></div>
        ${table.map(({ person, rows }) => `
          <div class="conj-row">
            <span class="conj-person">${esc(person)}</span>
            ${rows.map((r, i) => `<button class="conj-cell" data-say="${esc(r)}"><span class="conj-sign">${["+", "−", "?"][i]}</span>${esc(r)}</button>`).join("")}
          </div>`).join("")}
      </div>
    </section>`;
  $("#back").onclick = () => go("verbs", ctx.back || {});
  app.querySelectorAll("[data-say]").forEach((b) => b.onclick = () => speak(b.dataset.say));
  app.querySelectorAll("[data-t]").forEach((b) => b.onclick = () => { ctx.tense = b.dataset.t; renderVerb(ctx, go); });
}

// ---------- Práctica de irregulares ----------
export function renderVerbQuiz(ctx, go) {
  // set "top": reto «Domina los verbos» del Curso (los más usados, primero los que aún no dominas).
  const top = ctx.set === "top";
  const pending = TOP_VERBS.filter((b) => !S.verbMastered[b]);
  const pool = top ? (pending.length ? pending : TOP_VERBS).map((b) => VERB_BY_BASE[b]) : VERBS.filter((v) => v.irregular && v.base !== "be");
  ctx.v ??= pool[Math.floor(Math.random() * pool.length)];
  const v = ctx.v;
  const q = S.verbQuiz;
  app.innerHTML = `
    <button class="back" id="back">← ${top ? "Curso" : "Verbos"}</button>
    <section class="card">
      <div class="row between"><h2>${top ? "Domina los verbos" : "Practica los irregulares"}</h2>
        <span class="pill">${top ? `${TOP_VERBS.length - pending.length}/${TOP_VERBS.length} dominados` : `${q.right}/${q.total} correctas`}</span></div>
      <p class="muted">Escribe el pasado y el participio.</p>
      <div class="row" style="align-items:baseline"><span class="sheet-word">${esc(v.base)}</span>
        <button class="icon-btn" id="say" aria-label="Escuchar">${ICON.speaker}</button>
        <span class="muted">${esc(v.es)}</span></div>
      <div class="grid" style="margin-top:14px">
        <label>Pasado<input type="text" id="past" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
        <label>Participio<input type="text" id="pp" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
      </div>
      <div class="row" style="margin-top:12px"><button class="btn primary" id="check">Comprobar</button><button class="btn" id="skip">No sé</button></div>
      <div id="fb"></div>
    </section>`;
  $("#back").onclick = () => go(top ? "course" : "verbs");
  $("#say").onclick = () => speak(v.base);
  $("#past").focus();
  const next = () => { ctx.v = null; renderVerbQuiz(ctx, go); };
  const show = (ok, msg) => {
    $("#fb").innerHTML = `<div class="feedback ${ok ? "ok" : "no"}">${msg}
      <div class="en" style="margin-top:6px">${esc(v.base)} → ${esc(v.past)} → ${esc(v.pp)}</div></div>
      <button class="btn primary block" id="next" style="margin-top:12px">Siguiente verbo</button>`;
    $("#check").disabled = $("#skip").disabled = true;
    speak(`${v.base}, ${v.past}, ${v.pp}`);
    $("#next").onclick = next;
    $("#next").focus();
  };
  const accept = (typed, form) => form.split(" / ").includes(typed.trim().toLowerCase());
  const check = () => {
    const a = $("#past").value, b = $("#pp").value;
    if (!a.trim() || !b.trim()) return;
    const ok = accept(a, v.past) && accept(b, v.pp);
    q.total++; if (ok) { q.right++; addXP(2); if (top && !S.verbMastered[v.base]) S.verbMastered[v.base] = true; }
    save();
    show(ok, ok ? "¡Correcto!" : "Casi. La forma correcta es:");
  };
  $("#check").onclick = check;
  for (const id of ["#past", "#pp"]) $(id).onkeydown = (e) => { if (e.key === "Enter") (id === "#past" ? $("#pp").focus() : check()); };
  $("#skip").onclick = () => { q.total++; save(); show(false, "Esta es la respuesta:"); };
}
