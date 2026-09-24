// Diccionario de verbos y motor de conjugación.

// Irregulares: [base, pasado, participio, significado]
const IRREGULAR = [
  ["arise", "arose", "arisen", "surgir"],
  ["awake", "awoke", "awoken", "despertar(se)"],
  ["be", "was / were", "been", "ser / estar"],
  ["bear", "bore", "borne", "soportar / cargar"],
  ["beat", "beat", "beaten", "vencer / golpear"],
  ["become", "became", "become", "convertirse en / llegar a ser"],
  ["begin", "began", "begun", "empezar"],
  ["bend", "bent", "bent", "doblar"],
  ["bet", "bet", "bet", "apostar"],
  ["bite", "bit", "bitten", "morder"],
  ["bleed", "bled", "bled", "sangrar"],
  ["blow", "blew", "blown", "soplar"],
  ["break", "broke", "broken", "romper"],
  ["bring", "brought", "brought", "traer"],
  ["build", "built", "built", "construir"],
  ["burn", "burned", "burned", "quemar"],
  ["buy", "bought", "bought", "comprar"],
  ["catch", "caught", "caught", "atrapar / tomar (bus, tren)"],
  ["choose", "chose", "chosen", "elegir"],
  ["come", "came", "come", "venir"],
  ["cost", "cost", "cost", "costar"],
  ["cut", "cut", "cut", "cortar"],
  ["deal", "dealt", "dealt", "tratar / lidiar"],
  ["dig", "dug", "dug", "cavar"],
  ["do", "did", "done", "hacer"],
  ["draw", "drew", "drawn", "dibujar"],
  ["dream", "dreamed", "dreamed", "soñar"],
  ["drink", "drank", "drunk", "beber"],
  ["drive", "drove", "driven", "manejar / conducir"],
  ["eat", "ate", "eaten", "comer"],
  ["fall", "fell", "fallen", "caer(se)"],
  ["feed", "fed", "fed", "alimentar"],
  ["feel", "felt", "felt", "sentir(se)"],
  ["fight", "fought", "fought", "pelear / luchar"],
  ["find", "found", "found", "encontrar"],
  ["fly", "flew", "flown", "volar"],
  ["forbid", "forbade", "forbidden", "prohibir"],
  ["forget", "forgot", "forgotten", "olvidar"],
  ["forgive", "forgave", "forgiven", "perdonar"],
  ["freeze", "froze", "frozen", "congelar(se)"],
  ["get", "got", "gotten", "conseguir / obtener / llegar"],
  ["give", "gave", "given", "dar"],
  ["go", "went", "gone", "ir"],
  ["grow", "grew", "grown", "crecer / cultivar"],
  ["hang", "hung", "hung", "colgar"],
  ["have", "had", "had", "tener / haber"],
  ["hear", "heard", "heard", "oír"],
  ["hide", "hid", "hidden", "esconder(se)"],
  ["hit", "hit", "hit", "golpear"],
  ["hold", "held", "held", "sostener / agarrar"],
  ["hurt", "hurt", "hurt", "lastimar / doler"],
  ["keep", "kept", "kept", "mantener / guardar / seguir"],
  ["kneel", "knelt", "knelt", "arrodillarse"],
  ["know", "knew", "known", "saber / conocer"],
  ["lay", "laid", "laid", "colocar / poner (algo)"],
  ["lead", "led", "led", "guiar / dirigir"],
  ["learn", "learned", "learned", "aprender"],
  ["leave", "left", "left", "irse / dejar / salir"],
  ["lend", "lent", "lent", "prestar"],
  ["let", "let", "let", "dejar / permitir"],
  ["lie", "lay", "lain", "yacer / estar acostado"],
  ["light", "lit", "lit", "encender"],
  ["lose", "lost", "lost", "perder"],
  ["make", "made", "made", "hacer / fabricar"],
  ["mean", "meant", "meant", "significar / querer decir"],
  ["meet", "met", "met", "conocer / reunirse"],
  ["mistake", "mistook", "mistaken", "confundir"],
  ["overcome", "overcame", "overcome", "superar"],
  ["pay", "paid", "paid", "pagar"],
  ["put", "put", "put", "poner"],
  ["quit", "quit", "quit", "renunciar / dejar"],
  ["read", "read", "read", "leer"],
  ["ride", "rode", "ridden", "montar / andar (en bici, caballo)"],
  ["ring", "rang", "rung", "sonar / timbrar"],
  ["rise", "rose", "risen", "subir / elevarse"],
  ["run", "ran", "run", "correr / dirigir"],
  ["say", "said", "said", "decir"],
  ["see", "saw", "seen", "ver"],
  ["seek", "sought", "sought", "buscar"],
  ["sell", "sold", "sold", "vender"],
  ["send", "sent", "sent", "enviar"],
  ["set", "set", "set", "establecer / poner"],
  ["shake", "shook", "shaken", "sacudir / agitar"],
  ["shine", "shone", "shone", "brillar"],
  ["shoot", "shot", "shot", "disparar"],
  ["show", "showed", "shown", "mostrar"],
  ["shrink", "shrank", "shrunk", "encoger"],
  ["shut", "shut", "shut", "cerrar"],
  ["sing", "sang", "sung", "cantar"],
  ["sink", "sank", "sunk", "hundir(se)"],
  ["sit", "sat", "sat", "sentarse"],
  ["sleep", "slept", "slept", "dormir"],
  ["slide", "slid", "slid", "deslizar(se)"],
  ["speak", "spoke", "spoken", "hablar"],
  ["spend", "spent", "spent", "gastar / pasar (tiempo)"],
  ["spin", "spun", "spun", "girar"],
  ["split", "split", "split", "dividir"],
  ["spread", "spread", "spread", "extender / untar"],
  ["stand", "stood", "stood", "estar de pie / soportar"],
  ["steal", "stole", "stolen", "robar"],
  ["stick", "stuck", "stuck", "pegar / atascarse"],
  ["sting", "stung", "stung", "picar (insecto)"],
  ["strike", "struck", "struck", "golpear / atacar"],
  ["swear", "swore", "sworn", "jurar / decir groserías"],
  ["sweep", "swept", "swept", "barrer"],
  ["swim", "swam", "swum", "nadar"],
  ["swing", "swung", "swung", "columpiar(se)"],
  ["take", "took", "taken", "tomar / llevar"],
  ["teach", "taught", "taught", "enseñar"],
  ["tear", "tore", "torn", "rasgar / romper"],
  ["tell", "told", "told", "decir / contar"],
  ["think", "thought", "thought", "pensar / creer"],
  ["throw", "threw", "thrown", "lanzar / tirar"],
  ["understand", "understood", "understood", "entender"],
  ["upset", "upset", "upset", "molestar / disgustar"],
  ["wake", "woke", "woken", "despertar(se)"],
  ["wear", "wore", "worn", "llevar puesto / usar (ropa)"],
  ["win", "won", "won", "ganar"],
  ["withdraw", "withdrew", "withdrawn", "retirar"],
  ["write", "wrote", "written", "escribir"],
];
// Verbos con pasado regular pero de uso irregular en inglés británico (burnt, dreamt, learnt).
const ALSO_REGULAR = new Set(["burn", "dream", "learn"]);

// Regulares: [base, significado]. Las formas se generan con las reglas de ortografía.
const REGULAR = [
  ["accept", "aceptar"], ["add", "agregar / sumar"], ["admit", "admitir"], ["agree", "estar de acuerdo"],
  ["allow", "permitir"], ["answer", "responder"], ["appear", "aparecer"], ["apply", "aplicar / postularse"],
  ["argue", "discutir"], ["arrive", "llegar"], ["ask", "preguntar / pedir"], ["attack", "atacar"],
  ["avoid", "evitar"], ["bake", "hornear"], ["believe", "creer"], ["belong", "pertenecer"],
  ["book", "reservar"], ["borrow", "pedir prestado"], ["brush", "cepillar"], ["call", "llamar"],
  ["care", "importar / cuidar"], ["carry", "cargar / llevar"], ["cause", "causar"], ["change", "cambiar"],
  ["chat", "platicar / chatear"], ["check", "revisar"], ["clean", "limpiar"], ["climb", "escalar / subir"],
  ["close", "cerrar"], ["collect", "coleccionar / recoger"], ["complain", "quejarse"], ["complete", "completar"],
  ["continue", "continuar"], ["cook", "cocinar"], ["copy", "copiar"], ["count", "contar (números)"],
  ["cover", "cubrir"], ["create", "crear"], ["cross", "cruzar"], ["cry", "llorar"],
  ["dance", "bailar"], ["decide", "decidir"], ["deliver", "entregar"], ["depend", "depender"],
  ["describe", "describir"], ["develop", "desarrollar"], ["die", "morir"], ["discover", "descubrir"],
  ["dress", "vestir(se)"], ["drop", "dejar caer / soltar"], ["earn", "ganar (dinero)"], ["enjoy", "disfrutar"],
  ["enter", "entrar"], ["expect", "esperar (suponer)"], ["explain", "explicar"], ["fail", "fallar / reprobar"],
  ["fill", "llenar"], ["finish", "terminar"], ["fix", "arreglar"], ["follow", "seguir"],
  ["guess", "adivinar / suponer"], ["happen", "pasar / suceder"], ["hate", "odiar"], ["help", "ayudar"],
  ["hope", "esperar (desear)"], ["hug", "abrazar"], ["hurry", "apurarse"], ["imagine", "imaginar"],
  ["improve", "mejorar"], ["include", "incluir"], ["invite", "invitar"], ["join", "unirse"],
  ["jump", "saltar"], ["kiss", "besar"], ["laugh", "reír"], ["like", "gustar"],
  ["listen", "escuchar"], ["live", "vivir"], ["look", "mirar / verse"], ["love", "amar / encantar"],
  ["manage", "lograr / administrar"], ["marry", "casarse"], ["mention", "mencionar"], ["miss", "extrañar / perder (el bus)"],
  ["move", "mover(se) / mudarse"], ["need", "necesitar"], ["notice", "notar"], ["occur", "ocurrir"],
  ["offer", "ofrecer"], ["open", "abrir"], ["order", "ordenar / pedir"], ["own", "poseer"],
  ["paint", "pintar"], ["pass", "pasar / aprobar"], ["pick", "escoger / recoger"], ["plan", "planear"],
  ["plant", "plantar / sembrar"], ["play", "jugar / tocar (instrumento)"], ["practice", "practicar"], ["prefer", "preferir"],
  ["prepare", "preparar"], ["pretend", "fingir"], ["produce", "producir"], ["promise", "prometer"],
  ["protect", "proteger"], ["provide", "proveer / proporcionar"], ["pull", "jalar"], ["push", "empujar"],
  ["rain", "llover"], ["reach", "alcanzar / llegar a"], ["realize", "darse cuenta"], ["receive", "recibir"],
  ["recommend", "recomendar"], ["reduce", "reducir"], ["refuse", "negarse"], ["relax", "relajarse"],
  ["remember", "recordar"], ["remove", "quitar"], ["rent", "rentar / alquilar"], ["repeat", "repetir"],
  ["reply", "responder"], ["rest", "descansar"], ["return", "regresar / devolver"], ["save", "ahorrar / guardar / salvar"],
  ["seem", "parecer"], ["serve", "servir"], ["share", "compartir"], ["shop", "ir de compras"],
  ["sign", "firmar"], ["smell", "oler"], ["smile", "sonreír"], ["solve", "resolver"],
  ["start", "empezar"], ["stay", "quedarse"], ["stop", "parar / detener"], ["study", "estudiar"],
  ["succeed", "tener éxito"], ["suggest", "sugerir"], ["support", "apoyar"], ["suppose", "suponer"],
  ["surprise", "sorprender"], ["talk", "hablar / platicar"], ["taste", "probar / saber (sabor)"], ["thank", "agradecer"],
  ["touch", "tocar"], ["travel", "viajar"], ["trust", "confiar"], ["try", "intentar / probar"],
  ["turn", "girar / voltear"], ["use", "usar"], ["visit", "visitar"], ["wait", "esperar (aguardar)"],
  ["walk", "caminar"], ["want", "querer"], ["wash", "lavar"], ["watch", "mirar / ver (TV)"],
  ["wish", "desear"], ["wonder", "preguntarse"], ["work", "trabajar / funcionar"], ["worry", "preocuparse"],
];

// Verbos de varias sílabas que doblan la consonante final (acento al final).
const DOUBLE = new Set(["admit", "begin", "commit", "control", "forbid", "forget", "occur", "permit", "prefer", "quit", "refer", "regret", "upset"]);
const VOWELS = "aeiou";
const isV = (c) => VOWELS.includes(c);

function syllables(w) { return (w.match(/[aeiouy]+/g) || []).length; }
function doubles(w) {
  if (DOUBLE.has(w)) return true;
  const n = w.length;
  if (n < 3 || syllables(w) !== 1) return false;
  const [a, b, c] = w.slice(-3);
  return !isV(a) && isV(b) && !isV(c) && !"wxy".includes(c);
}
export function thirdPerson(w) {
  if (w === "be") return "is";
  if (w === "have") return "has";
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + "ies";
  if (/(s|sh|ch|x|z|o)$/.test(w)) return w + "es";
  return w + "s";
}
export function ingForm(w) {
  if (w === "be") return "being";
  if (/ie$/.test(w)) return w.slice(0, -2) + "ying";
  if (/ee$/.test(w)) return w + "ing";
  if (/[^aeiou]e$/.test(w) || /ue$/.test(w)) return w.slice(0, -1) + "ing";
  if (doubles(w)) return w + w.at(-1) + "ing";
  return w + "ing";
}
function edForm(w) {
  if (/e$/.test(w)) return w + "d";
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + "ied";
  if (doubles(w)) return w + w.at(-1) + "ed";
  return w + "ed";
}

export const VERBS = [
  ...IRREGULAR.map(([base, past, pp, es]) => ({ base, past, pp, es, irregular: !ALSO_REGULAR.has(base) })),
  ...REGULAR.map(([base, es]) => ({ base, past: edForm(base), pp: edForm(base), es, irregular: false })),
].map((v) => ({ ...v, ing: ingForm(v.base), s: thirdPerson(v.base) }))
  .sort((a, b) => a.base.localeCompare(b.base));

export const VERB_BY_BASE = Object.fromEntries(VERBS.map((v) => [v.base, v]));

// Cualquier forma conjugada → verbo base (para buscar palabras de los libros).
export const VERB_FORM_INDEX = (() => {
  const idx = {};
  const add = (form, v) => { for (const f of form.split(" / ")) if (!idx[f]) idx[f] = v; };
  for (const v of VERBS) { add(v.base, v); add(v.past, v); add(v.pp, v); add(v.ing, v); add(v.s, v); }
  for (const f of ["am", "is", "are", "was", "were", "been", "being"]) idx[f] = VERB_BY_BASE.be;
  return idx;
})();

const PERSONS = ["I", "you", "he", "we", "they"];
export const PERSON_LABEL = { I: "I", you: "You", he: "He / She / It", we: "We", they: "They" };
const BE_PRESENT = { I: "am", you: "are", he: "is", we: "are", they: "are" };
const BE_PAST = { I: "was", you: "were", he: "was", we: "were", they: "were" };
const HAVE = (p) => (p === "he" ? "has" : "have");
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// Cada tiempo devuelve, para una persona: [afirmativa, negativa, pregunta].
export const TENSES = [
  {
    id: "present", name: "Presente simple", es: "Hábitos, rutinas y verdades generales.", ex: "I work every day. / Trabajo todos los días.",
    make: (v, p) => v.base === "be"
      ? [`${p} ${BE_PRESENT[p]}`, `${p} ${BE_PRESENT[p]} not`, `${BE_PRESENT[p]} ${p.toLowerCase()}?`]
      : [`${p} ${p === "he" ? v.s : v.base}`, `${p} ${p === "he" ? "doesn't" : "don't"} ${v.base}`, `${p === "he" ? "does" : "do"} ${p} ${v.base}?`],
  },
  {
    id: "present-cont", name: "Presente continuo", es: "Algo que pasa ahora mismo o un plan cercano.", ex: "I'm working now. / Estoy trabajando ahora.",
    make: (v, p) => [`${p} ${BE_PRESENT[p]} ${v.ing}`, `${p} ${BE_PRESENT[p]} not ${v.ing}`, `${BE_PRESENT[p]} ${p} ${v.ing}?`],
  },
  {
    id: "past", name: "Pasado simple", es: "Acción terminada en un momento del pasado.", ex: "I worked yesterday. / Trabajé ayer.",
    make: (v, p) => v.base === "be"
      ? [`${p} ${BE_PAST[p]}`, `${p} ${BE_PAST[p]}n't`, `${BE_PAST[p]} ${p}?`]
      : [`${p} ${v.past.split(" / ")[0]}`, `${p} didn't ${v.base}`, `did ${p} ${v.base}?`],
  },
  {
    id: "past-cont", name: "Pasado continuo", es: "Acción en progreso en un momento del pasado.", ex: "I was working when you called. / Estaba trabajando cuando llamaste.",
    make: (v, p) => [`${p} ${BE_PAST[p]} ${v.ing}`, `${p} ${BE_PAST[p]}n't ${v.ing}`, `${BE_PAST[p]} ${p} ${v.ing}?`],
  },
  {
    id: "perfect", name: "Presente perfecto", es: "Experiencias, o algo que empezó en el pasado y sigue.", ex: "I have worked here for two years. / Llevo dos años trabajando aquí.",
    make: (v, p) => [`${p} ${HAVE(p)} ${v.pp}`, `${p} ${HAVE(p)}n't ${v.pp}`, `${HAVE(p)} ${p} ${v.pp}?`],
  },
  {
    id: "past-perfect", name: "Pasado perfecto", es: "Algo que pasó antes de otro momento del pasado.", ex: "I had worked there before. / Había trabajado ahí antes.",
    make: (v, p) => [`${p} had ${v.pp}`, `${p} hadn't ${v.pp}`, `had ${p} ${v.pp}?`],
  },
  {
    id: "will", name: "Futuro (will)", es: "Decisiones del momento, promesas y predicciones.", ex: "I will work tomorrow. / Trabajaré mañana.",
    make: (v, p) => [`${p} will ${v.base}`, `${p} won't ${v.base}`, `will ${p} ${v.base}?`],
  },
  {
    id: "going-to", name: "Futuro (going to)", es: "Planes ya decididos.", ex: "I'm going to work on Saturday. / Voy a trabajar el sábado.",
    make: (v, p) => [`${p} ${BE_PRESENT[p]} going to ${v.base}`, `${p} ${BE_PRESENT[p]} not going to ${v.base}`, `${BE_PRESENT[p]} ${p} going to ${v.base}?`],
  },
  {
    id: "conditional", name: "Condicional (would)", es: "Lo que harías: situaciones hipotéticas y peticiones educadas.", ex: "I would work less if I could. / Trabajaría menos si pudiera.",
    make: (v, p) => [`${p} would ${v.base}`, `${p} wouldn't ${v.base}`, `would ${p} ${v.base}?`],
  },
];

// Arregla detalles de presentación: persona en mayúscula, "am not" → "I'm not", etc.
function tidy(s) {
  s = s.replace(/\bhe\b/, "he").replace(/^i\b/, "I").replace(/ i\b/, " I");
  s = s.replace("I am not", "I'm not").replace(/\b(are|is) not\b/, (m, a) => `${a}n't`);
  return cap(s);
}
export function conjugate(verb, tenseId) {
  const t = TENSES.find((x) => x.id === tenseId);
  return PERSONS.map((p) => {
    const [a, n, q] = t.make(verb, p);
    return { person: PERSON_LABEL[p], rows: [tidy(a), tidy(n), tidy(q)] };
  });
}
