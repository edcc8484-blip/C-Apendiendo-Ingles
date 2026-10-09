// Curso "Reto 30 días": bienvenida, retos por nivel (A1, A2, B1), biblioteca y verbos.
// Cada día: frases (aprende) → ejercicios (practica) → misión de habla cronometrada (habla sin parar).
import { BOOKS } from "./books.js";
import {
  S, save, addXP, $, app, esc, ICON, toast, speak, stopSpeaking, canListen, MIC_ERRORS, words,
  checkTutor, tutorStatus,
} from "./core.js";

export const TOP_VERBS = ["be", "have", "do", "say", "go", "get", "make", "know", "think", "take", "see", "come", "want", "look", "use",
  "find", "give", "tell", "work", "call", "try", "ask", "need", "feel", "become", "leave", "put", "mean", "keep", "let"];

export const STAGES = [
  { stage: 1, level: "A1", name: "Basic Level", es: "Básico", color: "c-blue", icon: "🌱", days: [1, 10],
    about: "Desde cero: preséntate, habla de tu trabajo, tu familia y tu rutina, pide en un restaurante y haz preguntas." },
  { stage: 2, level: "A2", name: "Pre-Intermediate Level", es: "Pre-intermedio", color: "c-yellow", icon: "🌿", days: [11, 20],
    about: "Ya tienes las bases: cuenta lo que hiciste, haz planes, pide favores, compara y resuelve situaciones de viaje y trabajo." },
  { stage: 3, level: "B1", name: "Intermediate Level", es: "Intermedio", color: "c-gold", icon: "🌳", days: [21, 30],
    about: "Conversaciones reales: da tu opinión, discute con respeto, cuenta historias, da consejos y participa en reuniones." },
];

// [título, introducción, frases [en, es], misión {es, en, keywords}, escenario sugerido para hablar con Emma]
const DAYS_RAW = [
  ["Preséntate", "Tu primera conversación: quién eres, de dónde eres y a qué te dedicas. Fórmula: Hi, I'm + nombre · I'm from + país · I'm a + profesión.",
    [["Hi, I'm Alex.", "Hola, soy Alex."], ["I'm from Guatemala.", "Soy de Guatemala."], ["I'm a network analyst.", "Soy analista de redes."], ["Nice to meet you.", "Mucho gusto."], ["How are you?", "¿Cómo estás?"], ["I'm good, thanks. And you?", "Bien, gracias. ¿Y tú?"]],
    { es: "Preséntate: tu nombre, de dónde eres y a qué te dedicas.", en: "Introduce yourself: your name, where you are from and what you do.", keywords: ["I'm", "from", "nice to meet you"] }, "free"],
  ["Tu trabajo", "Hablar de tu trabajo es lo que más vas a usar. «I work in / for / as»: in = área, for = empresa, as = puesto.",
    [["I work in IT.", "Trabajo en TI."], ["I work for a big company.", "Trabajo para una empresa grande."], ["I'm responsible for the network.", "Soy responsable de la red."], ["I work from Monday to Friday.", "Trabajo de lunes a viernes."], ["I start at eight and finish at five.", "Entro a las ocho y salgo a las cinco."], ["I like my job.", "Me gusta mi trabajo."]],
    { es: "Habla de tu trabajo: dónde trabajas, qué haces y tu horario.", en: "Talk about your job: where you work, what you do and your schedule.", keywords: ["work", "company", "start"] }, "free"],
  ["Tu familia y tu casa", "«I have» = tengo. «I live in» = vivo en. «My» = mi. Con estas tres estructuras puedes hablar de tu vida personal.",
    [["I live in Guatemala City.", "Vivo en la Ciudad de Guatemala."], ["I live with my family.", "Vivo con mi familia."], ["I have two brothers and a sister.", "Tengo dos hermanos y una hermana."], ["My house is small but comfortable.", "Mi casa es pequeña pero cómoda."], ["I have a dog.", "Tengo un perro."], ["My family is very important to me.", "Mi familia es muy importante para mí."]],
    { es: "Habla de tu familia y de dónde vives.", en: "Talk about your family and where you live.", keywords: ["live", "family", "have"] }, "free"],
  ["Tu rutina", "Presente simple para hábitos. Con he/she el verbo lleva -s (she works). Palabras útiles: usually (normalmente), always (siempre), in the morning / evening.",
    [["I get up at six.", "Me levanto a las seis."], ["I take a shower and have breakfast.", "Me baño y desayuno."], ["I go to work by car.", "Voy al trabajo en carro."], ["I usually have lunch at one.", "Normalmente almuerzo a la una."], ["In the evening, I watch TV.", "En la noche veo televisión."], ["I go to bed at ten.", "Me acuesto a las diez."]],
    { es: "Describe un día normal tuyo, de la mañana a la noche.", en: "Describe a normal day, from morning to night.", keywords: ["get up", "work", "usually"] }, "free"],
  ["En el restaurante", "Para pedir con educación: «Can I have…?» o «I'd like…». Siempre agrega «please».",
    [["Can I see the menu, please?", "¿Me muestra el menú, por favor?"], ["I'd like the chicken, please.", "Quisiera el pollo, por favor."], ["Can I have a glass of water?", "¿Me da un vaso de agua?"], ["It's delicious.", "Está delicioso."], ["Can I have the check, please?", "¿Me trae la cuenta, por favor?"], ["Do you take credit cards?", "¿Aceptan tarjeta de crédito?"]],
    { es: "Imagina que estás en un restaurante: pide comida, bebida y la cuenta.", en: "You are at a restaurant: order food, a drink and ask for the check.", keywords: ["can I have", "I'd like", "please"] }, "cafe"],
  ["Números, hora y precios", "La hora: «It's seven thirty» (7:30) o «half past seven». Precios: «How much is it?». Los teléfonos se dicen dígito por dígito.",
    [["What time is it?", "¿Qué hora es?"], ["It's half past seven.", "Son las siete y media."], ["How much is this?", "¿Cuánto cuesta esto?"], ["It's twenty dollars.", "Cuesta veinte dólares."], ["The meeting is at three o'clock.", "La reunión es a las tres en punto."], ["My phone number is five five five, one two three four.", "Mi teléfono es 555-1234."]],
    { es: "Di tu número de teléfono, a qué hora entras y sales del trabajo y cuánto cuesta algo que compraste.", en: "Say your phone number, your work hours and the price of something you bought.", keywords: ["o'clock", "dollars", "number"] }, "shopping"],
  ["Hacer preguntas", "Las preguntas empiezan con What (qué), Where (dónde), When (cuándo), Why (por qué), How (cómo) + do/does o is/are.",
    [["What's your name?", "¿Cómo te llamas?"], ["Where do you work?", "¿Dónde trabajas?"], ["What do you do?", "¿A qué te dedicas?"], ["When do you start work?", "¿A qué hora entras a trabajar?"], ["Why are you learning English?", "¿Por qué estás aprendiendo inglés?"], ["How do you get to work?", "¿Cómo llegas al trabajo?"]],
    { es: "Hazle 5 preguntas a un compañero nuevo y respóndelas tú mismo.", en: "Ask a new coworker five questions, then answer them yourself.", keywords: ["what", "where", "how"] }, "free"],
  ["Lo que te gusta", "«I like / love / hate» + verbo con -ing: I love playing soccer. Negativo: I don't like… Preferencias: I prefer A to B.",
    [["I like music.", "Me gusta la música."], ["I love playing soccer.", "Me encanta jugar fútbol."], ["I don't like getting up early.", "No me gusta levantarme temprano."], ["I really enjoy cooking.", "Disfruto mucho cocinar."], ["What do you like to do on weekends?", "¿Qué te gusta hacer los fines de semana?"], ["I prefer coffee to tea.", "Prefiero el café al té."]],
    { es: "Habla de lo que te gusta y lo que no te gusta hacer.", en: "Talk about what you like and don't like doing.", keywords: ["like", "love", "don't like"] }, "free"],
  ["Lugares y direcciones", "«There is» (hay, singular) y «There are» (hay, plural). Para direcciones: go straight, turn left / right, next to, on the corner.",
    [["There is a bank near my house.", "Hay un banco cerca de mi casa."], ["There are two supermarkets on my street.", "Hay dos supermercados en mi calle."], ["Is there a pharmacy near here?", "¿Hay una farmacia cerca de aquí?"], ["The office is next to the park.", "La oficina está al lado del parque."], ["Go straight and turn left.", "Sigue derecho y gira a la izquierda."], ["It's on the corner.", "Está en la esquina."]],
    { es: "Describe tu barrio: qué lugares hay cerca y cómo llegar a tu casa.", en: "Describe your neighborhood: what places are near and how to get to your house.", keywords: ["there is", "there are", "next to"] }, "directions"],
  ["Repaso: tu presentación de 1 minuto", "Hoy juntas todo lo de la semana en una presentación completa. Esta es la base de cualquier conversación, entrevista o reunión.",
    [["Let me introduce myself.", "Permítanme presentarme."], ["I work as a network analyst for a big company.", "Trabajo como analista de redes para una empresa grande."], ["I live with my family in Guatemala City.", "Vivo con mi familia en la Ciudad de Guatemala."], ["In my free time, I like watching movies.", "En mi tiempo libre me gusta ver películas."], ["I'm learning English because I need it for my job.", "Aprendo inglés porque lo necesito para mi trabajo."], ["Thank you for listening.", "Gracias por escuchar."]],
    { es: "Haz tu presentación completa: nombre, trabajo, familia, rutina, gustos y por qué aprendes inglés.", en: "Give your full introduction: name, job, family, routine, hobbies and why you are learning English.", keywords: ["introduce", "work", "learning English"] }, "job"],

  ["¿Qué hiciste ayer?", "Pasado de verbos regulares: + ed (worked, cooked, watched). Negativo: I didn't + verbo. Pregunta: Did you + verbo?",
    [["Yesterday I worked until six.", "Ayer trabajé hasta las seis."], ["I cooked dinner for my family.", "Cociné la cena para mi familia."], ["I watched a movie.", "Vi una película."], ["I called my mother.", "Llamé a mi mamá."], ["I didn't study last night.", "No estudié anoche."], ["Did you work yesterday?", "¿Trabajaste ayer?"]],
    { es: "Cuenta todo lo que hiciste ayer, de la mañana a la noche.", en: "Tell me everything you did yesterday, from morning to night.", keywords: ["yesterday", "worked", "didn't"] }, "free"],
  ["Pasado irregular", "Los verbos más usados son irregulares: go → went, have → had, see → saw, eat → ate, buy → bought, come → came. Practícalos en la sección Verbos.",
    [["Last weekend I went to the beach.", "El fin de semana pasado fui a la playa."], ["I had a great time.", "La pasé muy bien."], ["I saw an old friend.", "Vi a un viejo amigo."], ["We ate seafood.", "Comimos mariscos."], ["I bought a new phone.", "Compré un teléfono nuevo."], ["I came back on Sunday.", "Regresé el domingo."]],
    { es: "Cuenta qué hiciste el fin de semana pasado.", en: "Tell me what you did last weekend.", keywords: ["went", "had", "saw"] }, "free"],
  ["Planes para el futuro", "«Going to» para planes ya decididos: I'm going to + verbo. Pregunta: What are you going to do…?",
    [["I'm going to visit my parents this weekend.", "Voy a visitar a mis papás este fin de semana."], ["We're going to have a meeting tomorrow.", "Vamos a tener una reunión mañana."], ["What are you going to do tonight?", "¿Qué vas a hacer esta noche?"], ["I'm going to study English every day.", "Voy a estudiar inglés todos los días."], ["I'm not going to work on Saturday.", "No voy a trabajar el sábado."], ["Next year, I'm going to travel to the United States.", "El próximo año voy a viajar a Estados Unidos."]],
    { es: "Habla de tus planes: este fin de semana, el próximo mes y el próximo año.", en: "Talk about your plans for this weekend, next month and next year.", keywords: ["going to", "next", "this weekend"] }, "free"],
  ["Pedir favores", "«Can you…?» es informal; «Could you…?» es más educado. Úsalas también para sobrevivir cuando no entiendes algo.",
    [["Could you help me, please?", "¿Podría ayudarme, por favor?"], ["Can you repeat that, please?", "¿Puede repetir eso, por favor?"], ["Could you speak more slowly?", "¿Podría hablar más despacio?"], ["Can I ask you a question?", "¿Puedo hacerle una pregunta?"], ["Could you send me the file?", "¿Podría enviarme el archivo?"], ["Sorry, I didn't understand.", "Perdón, no entendí."]],
    { es: "Pide tres favores en el trabajo y di que no entendiste algo.", en: "Ask for three favors at work and say that you didn't understand something.", keywords: ["could you", "can you", "please"] }, "free"],
  ["Comparar", "Adjetivos cortos: + er (bigger, faster) y the + est (the best, the biggest). Largos: more / the most. Irregulares: good → better → the best.",
    [["My city is bigger than my hometown.", "Mi ciudad es más grande que mi pueblo."], ["This laptop is faster than the old one.", "Esta laptop es más rápida que la anterior."], ["English is easier than I thought.", "El inglés es más fácil de lo que pensaba."], ["This is the best restaurant in town.", "Este es el mejor restaurante de la ciudad."], ["Today is hotter than yesterday.", "Hoy hace más calor que ayer."], ["Which one is better?", "¿Cuál es mejor?"]],
    { es: "Compara tu ciudad con otra, y tu trabajo actual con uno anterior.", en: "Compare your city with another one, and your current job with a previous one.", keywords: ["than", "better", "the best"] }, "free"],
  ["De viaje", "Frases que te salvan en el aeropuerto y el hotel. Practícalas hasta que salgan sin pensar.",
    [["I have a reservation under my name.", "Tengo una reservación a mi nombre."], ["Where is the gate?", "¿Dónde está la puerta de embarque?"], ["I'm here on vacation.", "Estoy aquí de vacaciones."], ["How long is the flight?", "¿Cuánto dura el vuelo?"], ["Could you call a taxi for me?", "¿Podría llamarme un taxi?"], ["What time is check-out?", "¿A qué hora es la salida del hotel?"]],
    { es: "Cuenta tu viaje ideal: a dónde vas, cuánto tiempo y qué necesitas en el aeropuerto y el hotel.", en: "Describe your ideal trip: where, how long, and what you need at the airport and hotel.", keywords: ["flight", "hotel", "reservation"] }, "airport"],
  ["Llamadas y videollamadas", "En llamadas de trabajo se usan frases fijas. Apréndelas como bloques y úsalas tal cual.",
    [["Hello, can you hear me?", "Hola, ¿me escuchas?"], ["Sorry, you're breaking up.", "Perdón, se corta tu audio."], ["Can you share your screen?", "¿Puedes compartir tu pantalla?"], ["I'll call you back in five minutes.", "Te devuelvo la llamada en cinco minutos."], ["Can I leave a message?", "¿Puedo dejar un mensaje?"], ["Let me check and get back to you.", "Déjame revisar y te respondo."]],
    { es: "Simula el inicio de una videollamada de trabajo con problemas de audio.", en: "Act out the start of a work video call with audio problems.", keywords: ["hear me", "share your screen", "call you back"] }, "it-standup"],
  ["Problemas y quejas", "Para reportar un problema: «There's a problem with…», «… isn't working». Para lo que ya hiciste: I've already + participio.",
    [["There's a problem with my internet connection.", "Hay un problema con mi conexión a internet."], ["My laptop isn't working.", "Mi laptop no funciona."], ["The printer doesn't print.", "La impresora no imprime."], ["I've already restarted it.", "Ya lo reinicié."], ["Can you send someone to fix it?", "¿Puede enviar a alguien a arreglarlo?"], ["This is the second time this has happened.", "Es la segunda vez que pasa esto."]],
    { es: "Llama a soporte técnico y reporta un problema con tu equipo.", en: "Call technical support and report a problem with your device.", keywords: ["problem", "isn't working", "already"] }, "it-ticket"],
  ["Experiencias", "Present perfect: have/has + participio. Para experiencias (Have you ever…?) y lo que empezó en el pasado y sigue (I've worked here for five years).",
    [["Have you ever been to New York?", "¿Alguna vez has estado en Nueva York?"], ["I've never tried sushi.", "Nunca he probado el sushi."], ["I've worked here for five years.", "Llevo cinco años trabajando aquí."], ["I've just finished the report.", "Acabo de terminar el reporte."], ["Have you finished yet?", "¿Ya terminaste?"], ["I've already done it.", "Ya lo hice."]],
    { es: "Habla de cosas que has hecho y que nunca has hecho en tu vida.", en: "Talk about things you have done and things you have never done.", keywords: ["I've", "never", "ever"] }, "free"],
  ["Repaso: cuenta tu semana", "Hoy combinas pasado, presente y futuro en un solo relato: la habilidad clave para conversar con fluidez.",
    [["Last week was very busy.", "La semana pasada fue muy ocupada."], ["On Monday, I had a lot of meetings.", "El lunes tuve muchas reuniones."], ["On Wednesday, we fixed a big problem.", "El miércoles resolvimos un gran problema."], ["On the weekend, I relaxed with my family.", "El fin de semana descansé con mi familia."], ["Next week, I'm going to take a day off.", "La próxima semana voy a tomar un día libre."], ["Overall, it was a good week.", "En general, fue una buena semana."]],
    { es: "Cuenta tu semana pasada y tus planes para la próxima.", en: "Tell me about last week and your plans for next week.", keywords: ["last week", "had", "going to"] }, "free"],

  ["Dar tu opinión", "Para opinar: I think…, In my opinion…, I believe that…, From my point of view… Y devuelve la pregunta: What do you think?",
    [["I think remote work is great.", "Creo que el trabajo remoto es genial."], ["In my opinion, English is very important.", "En mi opinión, el inglés es muy importante."], ["I don't think it's a good idea.", "No creo que sea buena idea."], ["I believe that practice is the key.", "Creo que la práctica es la clave."], ["From my point of view, it's too expensive.", "Desde mi punto de vista, es demasiado caro."], ["What do you think?", "¿Tú qué piensas?"]],
    { es: "Da tu opinión: ¿es mejor trabajar desde casa o en la oficina? Explica por qué.", en: "Give your opinion: is it better to work from home or at the office? Explain why.", keywords: ["I think", "in my opinion", "because"] }, "free"],
  ["Acuerdo y desacuerdo", "Discute con respeto: primero reconoce («That's a good point»), luego da tu idea («but…»). «I'm afraid I disagree» es la forma educada de no estar de acuerdo.",
    [["I totally agree with you.", "Estoy totalmente de acuerdo contigo."], ["That's a good point.", "Ese es un buen punto."], ["I see what you mean, but I'm not sure.", "Entiendo lo que dices, pero no estoy seguro."], ["I'm afraid I disagree.", "Me temo que no estoy de acuerdo."], ["You're absolutely right.", "Tienes toda la razón."], ["Let's agree to disagree.", "Aceptemos que no pensamos igual."]],
    { es: "Alguien dice «Learning English is too difficult». Responde: reconoce su punto y da tu opinión.", en: "Someone says «Learning English is too difficult». Acknowledge their point and give your opinion.", keywords: ["agree", "good point", "but"] }, "free"],
  ["Conectar ideas", "Los conectores hacen que suenes fluido: because (porque), so (así que), but (pero), however (sin embargo), although (aunque), first / then / finally.",
    [["I was tired, so I went to bed early.", "Estaba cansado, así que me dormí temprano."], ["I like my job because I learn every day.", "Me gusta mi trabajo porque aprendo cada día."], ["It was expensive, but it was worth it.", "Fue caro, pero valió la pena."], ["The plan was good; however, it didn't work.", "El plan era bueno; sin embargo, no funcionó."], ["Although it was raining, we went out.", "Aunque llovía, salimos."], ["First, I checked the cable; then, I restarted the router.", "Primero revisé el cable; luego reinicié el router."]],
    { es: "Explica una decisión importante que tomaste usando because, so, but y however.", en: "Explain an important decision you made using because, so, but and however.", keywords: ["because", "so", "however"] }, "free"],
  ["Contar una historia", "Pasado continuo (was/were + -ing) para el fondo de la historia, y pasado simple para lo que interrumpe: I was driving when my phone rang.",
    [["I was driving to work when my phone rang.", "Iba manejando al trabajo cuando sonó mi teléfono."], ["While I was working, the power went out.", "Mientras trabajaba, se fue la luz."], ["Suddenly, everything stopped.", "De repente, todo se detuvo."], ["At first, I didn't know what to do.", "Al principio, no sabía qué hacer."], ["In the end, everything was fine.", "Al final, todo salió bien."], ["You won't believe what happened to me.", "No vas a creer lo que me pasó."]],
    { es: "Cuenta una anécdota divertida o difícil que te pasó en el trabajo.", en: "Tell a funny or difficult story that happened to you at work.", keywords: ["was", "when", "suddenly"] }, "free"],
  ["Dar consejos", "Should / shouldn't para aconsejar. «If I were you, I would…» suena muy natural. «Why don't you…?» para sugerir.",
    [["You should practice every day.", "Deberías practicar todos los días."], ["You shouldn't worry so much.", "No deberías preocuparte tanto."], ["If I were you, I would ask for help.", "Yo que tú, pediría ayuda."], ["Why don't you take a break?", "¿Por qué no tomas un descanso?"], ["It's a good idea to write it down.", "Es buena idea anotarlo."], ["You'd better leave early.", "Más vale que salgas temprano."]],
    { es: "Un amigo quiere aprender inglés rápido. Dale consejos.", en: "A friend wants to learn English fast. Give them advice.", keywords: ["should", "if I were you", "why don't you"] }, "free"],
  ["Imaginar situaciones", "Para situaciones imaginarias: If + pasado, would + verbo. If I had more time, I would… Para situaciones reales: If + presente, will + verbo.",
    [["If I had more time, I would learn another language.", "Si tuviera más tiempo, aprendería otro idioma."], ["If I won the lottery, I would travel the world.", "Si ganara la lotería, viajaría por el mundo."], ["What would you do if you lost your job?", "¿Qué harías si perdieras tu trabajo?"], ["If it rains tomorrow, we will stay home.", "Si llueve mañana, nos quedaremos en casa."], ["I would love to live abroad.", "Me encantaría vivir en el extranjero."], ["If I could change one thing, I would work less.", "Si pudiera cambiar una cosa, trabajaría menos."]],
    { es: "¿Qué harías si ganaras la lotería? ¿Y si pudieras vivir en otro país?", en: "What would you do if you won the lottery? And if you could live in another country?", keywords: ["if", "would", "could"] }, "free"],
  ["Reuniones de trabajo", "Frases para participar en reuniones sin miedo: abrir, opinar, pedir aclaración, avanzar y cerrar.",
    [["Let's get started.", "Empecemos."], ["I'd like to add something.", "Me gustaría agregar algo."], ["Could you clarify that, please?", "¿Podría aclarar eso, por favor?"], ["Let's move on to the next point.", "Pasemos al siguiente punto."], ["Can we schedule a follow-up meeting?", "¿Podemos agendar una reunión de seguimiento?"], ["To sum up, we need more time.", "En resumen, necesitamos más tiempo."]],
    { es: "Dirige una reunión corta: ábrela, presenta un tema, pide opiniones y ciérrala.", en: "Lead a short meeting: open it, present a topic, ask for opinions and close it.", keywords: ["let's", "I'd like to", "to sum up"] }, "it-standup"],
  ["Small talk", "La charla casual crea relaciones. Pregunta, escucha y haz una pregunta de seguimiento: así nunca se acaba la conversación.",
    [["How was your weekend?", "¿Qué tal tu fin de semana?"], ["What do you do for a living?", "¿A qué te dedicas?"], ["How long have you been working here?", "¿Cuánto tiempo llevas trabajando aquí?"], ["It's nice to finally meet you in person.", "Qué gusto conocerte por fin en persona."], ["Do you have any plans for the holidays?", "¿Tienes planes para las vacaciones?"], ["Let's keep in touch.", "Sigamos en contacto."]],
    { es: "Conoces a alguien en un evento: inicia la charla, haz preguntas y despídete.", en: "You meet someone at an event: start the conversation, ask questions and say goodbye.", keywords: ["how", "nice to meet you", "keep in touch"] }, "free"],
  ["Explicar un problema técnico", "Cuenta un incidente en orden: cuándo empezó, el impacto, qué revisaste, la causa raíz, la solución y el siguiente paso.",
    [["The problem started this morning around nine.", "El problema empezó esta mañana como a las nueve."], ["Users can't connect to the VPN.", "Los usuarios no pueden conectarse a la VPN."], ["We checked the firewall logs and found the issue.", "Revisamos los logs del firewall y encontramos el problema."], ["The root cause was an expired certificate.", "La causa raíz fue un certificado vencido."], ["We renewed it and the service is back.", "Lo renovamos y el servicio regresó."], ["We're going to monitor it for the next hour.", "Lo vamos a monitorear durante la próxima hora."]],
    { es: "Explica un problema técnico real que hayas resuelto, de principio a fin.", en: "Explain a real technical problem you solved, from start to finish.", keywords: ["started", "root cause", "we're going to"] }, "it-incident"],
  ["Graduación: tu historia", "¡Último día! Hoy hablas 2 minutos seguidos sobre tu progreso. Usa todo: presente, pasado, futuro, opiniones y conectores.",
    [["Thirty days ago, I couldn't speak English.", "Hace treinta días no podía hablar inglés."], ["Now I can introduce myself and talk about my work.", "Ahora puedo presentarme y hablar de mi trabajo."], ["The most difficult part was speaking without fear.", "Lo más difícil fue hablar sin miedo."], ["I learned that making mistakes is part of learning.", "Aprendí que equivocarse es parte de aprender."], ["My next goal is to have meetings in English.", "Mi próxima meta es tener reuniones en inglés."], ["I'm proud of my progress.", "Estoy orgulloso de mi progreso."]],
    { es: "Habla 2 minutos: cómo era tu inglés hace 30 días, qué aprendiste y cuál es tu próxima meta.", en: "Speak for two minutes: your English 30 days ago, what you learned and your next goal.", keywords: ["ago", "now I can", "my next goal"] }, "free"],
];

const missionSeconds = (n) => (n === 30 ? 120 : n <= 10 ? 45 : n <= 20 ? 60 : 90);
export const DAYS = DAYS_RAW.map(([title, intro, phrases, mission, scenario], i) => {
  const n = i + 1;
  const st = STAGES.find((s) => n >= s.days[0] && n <= s.days[1]);
  return { n, title, intro, phrases: phrases.map(([en, es]) => ({ en, es })), mission: { ...mission, seconds: missionSeconds(n) }, scenario, stage: st.stage, level: st.level };
});

// Ejercicios generados a partir de las frases del día (rotación fija, sin azar).
function rotate(arr, k) { return arr.map((_, i) => arr[(i + k) % arr.length]); }
function dayLesson(d) {
  const p = d.phrases;
  const short = p.filter((x) => x.en.split(" ").length <= 9);
  const opts = (idxs, field, k) => rotate(idxs.map((i) => p[i][field]), k);
  const ex = [
    { type: "choice", q: `¿Cómo se dice «${p[0].es}»?`, options: opts([0, 2, 4], "en", d.n % 3), answer: (3 - (d.n % 3)) % 3 },
    { type: "choice", q: `«${p[2].en}» significa:`, options: opts([2, 3, 5], "es", (d.n + 1) % 3), answer: (3 - ((d.n + 1) % 3)) % 3 },
    { type: "order", es: (short[1] || p[1]).es, en: (short[1] || p[1]).en },
    { type: "order", es: (short[3] || p[3]).es, en: (short[3] || p[3]).en },
    { type: "speak", en: p[5].en },
  ];
  return { id: `day-${d.n}`, level: d.level, title: `Día ${d.n}: ${d.title}`, intro: d.intro, phrases: p, exercises: ex };
}

// ---------- Progreso ----------
const progress = () => (S.course ??= { welcome: false, days: {} });
const dayDone = (n) => !!progress().days[n]?.done;
const dayUnlocked = (n) => n === 1 || dayDone(n - 1);
export const currentDay = () => DAYS.find((d) => !dayDone(d.n)) || null;
const stagePct = (st) => {
  const ds = DAYS.filter((d) => d.stage === st.stage);
  return Math.round((ds.filter((d) => dayDone(d.n)).length / ds.length) * 100);
};
const bookChapters = BOOKS.flatMap((b) => b.chapters.map((_, i) => [b.id, i]));
const libraryPct = () => Math.round((bookChapters.filter(([id, i]) => { const p = S.books[id]?.[i]; return p?.listened && p.readBest >= 0.8; }).length / bookChapters.length) * 100);
const verbsPct = () => Math.round((TOP_VERBS.filter((v) => S.verbMastered?.[v]).length / TOP_VERBS.length) * 100);

// ---------- Portada del curso ----------
export function renderCourse(ctx, go) {
  const P = progress();
  const cur = currentDay();
  const card = ({ id, color, kicker, big, small, icon, title, desc, pct }) => `
    <button class="course-card" data-card="${id}">
      <div class="course-head ${color}">
        ${kicker ? `<div class="course-kicker">${kicker}</div>` : ""}
        <div class="course-big">${big}</div>${small ? `<div class="course-small">${small}</div>` : ""}
        <div class="course-icon" aria-hidden="true">${icon}</div>
      </div>
      <div class="course-body">
        <div class="course-title">${title}</div>
        <div class="course-desc">${desc}</div>
        <div class="course-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div style="width:${Math.max(pct, 0)}%"><span>${pct}%</span></div></div>
      </div>
    </button>`;
  app.innerHTML = `
    <section class="card">
      <div class="row between">
        <div><h1 style="margin:0">Reto 30 días: habla inglés</h1>
        <p class="muted" style="margin:6px 0 0">${cur ? `Hoy toca el <b>Día ${cur.n}: ${esc(cur.title)}</b>` : "¡Completaste los 30 días!"}</p></div>
        ${cur ? `<button class="btn primary" id="today">${P.welcome ? `Continuar día ${cur.n}` : "Empieza aquí"}</button>` : ""}
      </div>
      <div class="course-bar big" style="margin-top:14px"><div style="width:${Math.round((Object.values(P.days).filter((d) => d.done).length / 30) * 100)}%"><span>${Object.values(P.days).filter((d) => d.done).length}/30 días</span></div></div>
    </section>
    <div class="course-grid">
      ${card({ id: "welcome", color: "c-red", big: "Welcome", small: "(start here)", icon: "📍", title: "Bienvenida (empieza aquí)", desc: "Cómo funciona el reto, tu rutina diaria y qué vas a lograr en 30 días.", pct: P.welcome ? 100 : 0 })}
      ${STAGES.map((st) => card({ id: `stage-${st.stage}`, color: st.color, kicker: "Challenges", big: st.name.replace(" Level", ""), small: "Level", icon: st.icon,
        title: `${st.icon} ${st.name} (${st.level})`, desc: `Días ${st.days[0]}–${st.days[1]}. ${st.about}`, pct: stagePct(st) })).join("")}
      ${card({ id: "library", color: "c-library", big: "Biblioteca", icon: "📚", title: "Biblioteca", desc: "Audiolibros por nivel: escucha, toca las palabras que no entiendas y léelos en voz alta.", pct: libraryPct() })}
      ${card({ id: "verbs", color: "c-navy", big: "Domina los", small: "«VERBOS»", icon: "💬", title: "Verbos", desc: `Los ${TOP_VERBS.length} verbos más importantes del inglés: significado, pasado y participio.`, pct: verbsPct() })}
    </div>`;
  app.querySelectorAll("[data-card]").forEach((b) => b.onclick = () => {
    const id = b.dataset.card;
    if (id === "welcome") go("courseWelcome");
    else if (id === "library") go("books");
    else if (id === "verbs") go("verbquiz", { set: "top" });
    else go("courseStage", { stage: +id.split("-")[1] });
  });
  if (cur) $("#today").onclick = () => (P.welcome ? openDay(cur, go) : go("courseWelcome"));
}

export function renderCourseWelcome(ctx, go) {
  app.innerHTML = `
    <button class="back" id="back">← Curso</button>
    <section class="card">
      <h1>Welcome! 👋 Bienvenido al Reto 30 días</h1>
      <p>La meta: que en 30 días pierdas el miedo y puedas <b>sostener conversaciones reales en inglés</b>: presentarte, hablar de tu trabajo, tu rutina, lo que hiciste y tus planes, opinar y resolver situaciones de viaje y trabajo.</p>
      <p class="feedback info small">Seamos honestos: la fluidez total toma meses. Lo que sí se puede en 30 días, si practicas <b>45–60 minutos diarios hablando en voz alta</b>, es pasar de no hablar a comunicarte con confianza. Después sigues con la ruta de Redes y TI y las conversaciones con Emma.</p>
    </section>
    <section class="card">
      <h2>Cómo funciona cada día</h2>
      <ol class="steps-list">
        <li><b>Aprende (5 min):</b> 6 frases clave con audio. Escúchalas y repítelas en voz alta.</li>
        <li><b>Practica (5 min):</b> ejercicios interactivos: elegir, ordenar y decir la frase.</li>
        <li><b>Misión de habla (2 min):</b> hablas sin parar de 45 segundos a 2 minutos sobre un tema. La app cuenta tus palabras por minuto y las frases clave que usaste. <b>Aquí es donde se gana la fluidez.</b></li>
        <li><b>Conversa (10 min, opcional):</b> practica el tema con Emma, la tutora con IA.</li>
      </ol>
    </section>
    <section class="card">
      <h2>Tu rutina diaria recomendada (45–60 min)</h2>
      <div class="grid">
        <div class="mini"><b>🎯 Reto del día</b><span>20 min</span></div>
        <div class="mini"><b>🗂️ Palabras</b><span>10 min de tarjetas</span></div>
        <div class="mini"><b>📚 Biblioteca</b><span>10 min: escucha y lee en voz alta</span></div>
        <div class="mini"><b>🗣️ Hablar con Emma</b><span>15 min de conversación</span></div>
      </div>
      <p class="small muted" style="margin-top:12px">3 reglas de oro: 1) habla en voz alta siempre, aunque estés solo; 2) equivocarte es avanzar; 3) no rompas la racha: mejor 20 minutos diarios que 3 horas un día.</p>
    </section>
    <section class="card">
      <h2>Los 3 niveles del reto</h2>
      ${STAGES.map((st) => `<p><b>${st.icon} ${st.name} (${st.level}) · Días ${st.days[0]}–${st.days[1]}:</b> ${esc(st.about)}</p>`).join("")}
    </section>
    <button class="btn primary block" id="go">¡Empezar el Día 1!</button>`;
  $("#back").onclick = () => go("course");
  $("#go").onclick = () => {
    const P = progress();
    if (!P.welcome) { P.welcome = true; save(); addXP(5); }
    openDay(DAYS[0], go);
  };
}

export function renderCourseStage(ctx, go) {
  const st = STAGES.find((s) => s.stage === ctx.stage);
  const ds = DAYS.filter((d) => d.stage === st.stage);
  app.innerHTML = `
    <button class="back" id="back">← Curso</button>
    <section class="card course-stage-head ${st.color}">
      <div class="course-kicker">Challenges</div>
      <h1>${st.icon} ${st.name} (${st.level})</h1>
      <p>${esc(st.about)}</p>
      <div class="course-bar"><div style="width:${stagePct(st)}%"><span>${stagePct(st)}%</span></div></div>
    </section>
    <section class="card"><div class="stack">
      ${ds.map((d) => {
        const p = progress().days[d.n];
        const locked = !dayUnlocked(d.n);
        const badge = p?.done ? `<span class="badge done">✓ ${p.wpm ? `${p.wpm} palabras/min` : "Completado"}</span>`
          : locked ? '<span class="badge locked">🔒</span>' : '<span class="badge">Disponible</span>';
        return `<button class="btn lesson-item" data-day="${d.n}" ${locked ? "disabled" : ""}>
          <span class="day-num">${d.n}</span>
          <span class="grow">${esc(d.title)}<br><span class="small muted">Misión: hablar ${d.mission.seconds} segundos</span></span>${badge}</button>`;
      }).join("")}
    </div></section>`;
  $("#back").onclick = () => go("course");
  app.querySelectorAll("[data-day]").forEach((b) => b.onclick = () => openDay(DAYS[+b.dataset.day - 1], go));
}

function openDay(d, go) {
  go("lesson", {
    id: `day-${d.n}`, lessonObj: dayLesson(d), backTo: ["courseStage", { stage: d.stage }], backLabel: `Retos ${d.level}`,
    onDone: (correct, total) => go("courseMission", { day: d.n, exScore: correct / total }),
  });
}

// ---------- Misión de habla cronometrada ----------
let session = null;
export function stopMission() { session?.cancel(); session = null; }

// Escucha de forma continua durante `seconds`, reiniciando el reconocimiento si el navegador lo corta.
function startTalking(seconds, onUpdate, onEnd) {
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  let finalText = "", stopped = false, silent = false, rec = null, error = "";
  const started = Date.now();
  const finish = () => {
    if (stopped) return;
    stopped = true; clearInterval(tick);
    try { rec?.stop(); } catch { /* ya detenido */ }
    if (!silent) onEnd(finalText.trim(), error, (Date.now() - started) / 1000);
  };
  const tick = setInterval(() => {
    const left = Math.max(0, seconds - Math.floor((Date.now() - started) / 1000));
    onUpdate(finalText, "", left);
    if (left <= 0) finish();
  }, 250);
  const run = () => {
    rec = new R();
    rec.lang = "en-US"; rec.continuous = true; rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += " " + e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      onUpdate(finalText, interim, Math.max(0, seconds - Math.floor((Date.now() - started) / 1000)));
    };
    rec.onerror = (e) => { if (MIC_ERRORS[e.error]) { error = MIC_ERRORS[e.error]; finish(); } };
    rec.onend = () => { if (!stopped) { try { run(); } catch { finish(); } } };
    rec.start();
  };
  stopSpeaking();
  try { run(); } catch { error = MIC_ERRORS["not-allowed"]; finish(); }
  return { stop: finish, cancel: () => { silent = true; finish(); } };
}

export function renderCourseMission(ctx, go) {
  const d = DAYS[ctx.day - 1];
  const m = d.mission;
  const kwHtml = (used = []) => m.keywords.map((k) => `<span class="${used.includes(k) ? "kw used" : "kw"}">${esc(k)}</span>`).join("");
  app.innerHTML = `
    <button class="back" id="back">← Retos ${d.level}</button>
    <section class="card">
      <div class="steps"><span class="on"></span><span class="on"></span><span class="on"></span></div>
      <span class="badge">Día ${d.n} · Misión de habla</span>
      <h1 style="margin-top:8px">${esc(m.es)}</h1>
      <p class="en" style="font-weight:600">${esc(m.en)} <button class="icon-btn" id="say-prompt" aria-label="Escuchar instrucción" style="width:32px;height:32px;vertical-align:middle">${ICON.speaker}</button></p>
      <p class="small muted">Habla sin parar durante <b>${m.seconds} segundos</b>. Si te trabas, di otra cosa: lo importante es no detenerte. Intenta usar:</p>
      <div class="words" id="kw">${kwHtml()}</div>
      <details class="small" style="margin-top:10px"><summary>Ver las frases de hoy como ayuda</summary>
        ${d.phrases.map((p) => `<div><span class="en">${esc(p.en)}</span> <span class="muted">— ${esc(p.es)}</span></div>`).join("")}
      </details>
    </section>
    <section class="card" style="text-align:center">
      <div class="timer" id="timer">${m.seconds}s</div>
      ${canListen
        ? `<button class="mic big-mic" id="go" aria-label="Empezar a hablar">${ICON.mic}</button><p class="small muted" id="hint">Toca el micrófono y empieza a hablar.</p>`
        : `<p class="feedback info small">Tu navegador no permite reconocimiento de voz. Usa Chrome o Edge para la misión hablada; mientras tanto, escribe tu respuesta.</p>
           <textarea id="typed" rows="5" placeholder="Escribe en inglés…"></textarea><button class="btn primary" id="typed-done" style="margin-top:8px">Terminar</button>`}
      <p class="transcript" id="tr"></p>
    </section>
    <div id="result"></div>`;
  $("#back").onclick = () => go("courseStage", { stage: d.stage });
  $("#say-prompt").onclick = () => speak(m.en);
  const finish = (text, error, elapsed = m.seconds) => {
    session = null;
    if (error) { $("#hint").textContent = error; $("#go").classList.remove("rec"); return; }
    const n = words(text).length;
    const secs = m.seconds;
    const wpm = Math.round(n / (Math.max(10, Math.min(secs, elapsed)) / 60));
    const lower = " " + words(text).join(" ") + " ";
    const used = m.keywords.filter((k) => lower.includes(" " + words(k).join(" ") + " "));
    const minWords = Math.round(secs * 0.25); // ~15 palabras por minuto como mínimo para aprobar
    const pass = n >= minWords;
    $("#kw").innerHTML = kwHtml(used);
    $("#result").innerHTML = `
      <section class="card">
        <h2>${pass ? "¡Misión cumplida!" : "¡Buen intento! Vamos otra vez"}</h2>
        <div class="grid">
          <div class="mini"><b>${n}</b><span>palabras</span></div>
          <div class="mini"><b>${wpm}</b><span>palabras por minuto</span></div>
          <div class="mini"><b>${used.length}/${m.keywords.length}</b><span>frases clave usadas</span></div>
        </div>
        <p class="small muted" style="margin-top:10px">${pass
          ? `Referencia: al conversar con soltura se habla a unas 100–150 palabras por minuto. Cada día intenta superar tu marca${S.course.best ? ` (tu mejor: ${S.course.best} palabras/min)` : ""}.`
          : `Necesitas al menos ${minWords} palabras para completar la misión. No importa equivocarte: lo que cuenta es no detenerte.`}</p>
        <div id="ai"></div>
        <div class="row" style="margin-top:12px">
          <button class="btn" id="retry">Intentar otra vez</button>
          <button class="btn" id="ai-btn">Corrección con IA</button>
          ${pass ? `<button class="btn primary" id="complete">Completar día ${d.n}</button>` : ""}
        </div>
      </section>`;
    $("#retry").onclick = () => go("courseMission", ctx);
    $("#ai-btn").onclick = async () => {
      if (!tutorStatus) await checkTutor();
      if (!tutorStatus.tutor) { $("#ai").innerHTML = `<p class="small muted">La corrección con IA necesita la API key configurada en el servidor.</p>`; return; }
      $("#ai-btn").disabled = true;
      $("#ai").innerHTML = `<p class="small muted">Revisando lo que dijiste…</p>`;
      try {
        const r = await fetch("/api/explain", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "speech", sentence: text, prompt: m.en, level: d.level }) });
        const a = await r.json();
        if (!r.ok) throw new Error(a.error);
        $("#ai").innerHTML = `<div class="ai-box">
          <div class="small"><b>Lo que hiciste bien:</b> ${esc(a.strengths_es)}</div>
          <div class="small" style="margin-top:6px"><b>Para mejorar:</b> ${esc(a.feedback_es)}</div>
          <div style="margin-top:8px"><b>Versión mejorada:</b><br><span class="en">${esc(a.improved_en)}</span>
            <button class="icon-btn" id="say-better" aria-label="Escuchar versión mejorada" style="width:32px;height:32px;vertical-align:middle">${ICON.speaker}</button></div></div>`;
        $("#say-better").onclick = () => speak(a.improved_en);
      } catch (e) { $("#ai").innerHTML = `<p class="small muted">${esc(e.message || "No se pudo revisar.")}</p>`; }
    };
    if (pass) $("#complete").onclick = () => {
      const P = progress();
      const first = !P.days[d.n]?.done;
      P.days[d.n] = { done: true, wpm: Math.max(wpm, P.days[d.n]?.wpm || 0), ex: ctx.exScore ?? 1, date: new Date().toLocaleDateString("en-CA") };
      P.best = Math.max(P.best || 0, wpm);
      save();
      if (first) addXP(30, `+30 XP · Día ${d.n} completado`);
      go("courseDone", { day: d.n });
    };
    $("#result").scrollIntoView({ behavior: "smooth" });
  };
  if (!canListen) {
    $("#typed-done").onclick = () => finish($("#typed").value, "");
    return;
  }
  $("#go").onclick = () => {
    if (session) { session.stop(); return; }
    $("#go").classList.add("rec");
    $("#hint").textContent = "Te escucho… toca otra vez para terminar antes.";
    $("#result").innerHTML = "";
    session = startTalking(m.seconds, (fin, interim, left) => {
      $("#timer").textContent = `${left}s`;
      $("#tr").innerHTML = `${esc(fin)} <span class="muted">${esc(interim)}</span>`;
    }, (text, error, elapsed) => { $("#go")?.classList.remove("rec"); finish(text, error, elapsed); });
  };
}

export function renderCourseDone(ctx, go) {
  const d = DAYS[ctx.day - 1];
  const next = DAYS[d.n] || null;
  const p = progress().days[d.n];
  app.innerHTML = `
    <section class="card" style="text-align:center">
      <div style="font-size:3rem">🎉</div>
      <h1>¡Día ${d.n} completado!</h1>
      <p class="muted">${esc(d.title)} · ${p?.wpm || 0} palabras por minuto · ${Math.round((p?.ex ?? 1) * 100)}% en ejercicios</p>
      ${d.n === 10 || d.n === 20 ? `<p class="feedback ok">¡Terminaste el nivel ${d.level}! Ya puedes subir tu nivel en Inicio → Ajustes.</p>` : ""}
      ${d.n === 30 ? `<p class="feedback ok">¡Terminaste el Reto 30 días! Sigue con la ruta de Redes y TI y conversa con Emma todos los días.</p>` : ""}
    </section>
    <section class="card">
      <h2>Termina tu práctica de hoy</h2>
      <div class="stack">
        <button class="btn lesson-item" id="talk"><span class="grow">🗣️ Conversa con Emma sobre este tema<br><span class="small muted">10 minutos · te corrige mientras hablas</span></span></button>
        <button class="btn lesson-item" id="cards"><span class="grow">🗂️ Repasa tus tarjetas de palabras</span></button>
        <button class="btn lesson-item" id="books"><span class="grow">📚 Escucha y lee un capítulo de la Biblioteca</span></button>
      </div>
    </section>
    <div class="row" style="justify-content:center">
      <button class="btn" id="course">Volver al curso</button>
      ${next ? `<button class="btn primary" id="next">Día ${next.n}: ${esc(next.title)}</button>` : ""}
    </div>`;
  $("#talk").onclick = () => go("talk", { scenario: d.scenario });
  $("#cards").onclick = () => go("vocab");
  $("#books").onclick = () => go("books");
  $("#course").onclick = () => go("course");
  if (next) $("#next").onclick = () => openDay(next, go);
}
