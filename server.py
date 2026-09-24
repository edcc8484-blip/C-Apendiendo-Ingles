"""Inglés Rápido — servidor local.

Sirve la app web (carpeta ./public) y expone dos endpoints que usan Claude:
POST /api/tutor (tutor de conversación) y POST /api/explain (significado de una
palabra o traducción de una frase de los audiolibros). La API key se queda en el servidor.

Uso:
    set ANTHROPIC_API_KEY=sk-ant-...        (PowerShell: $env:ANTHROPIC_API_KEY="sk-ant-...")
    python server.py
    abrir http://localhost:8000
"""

import json
import os
import sys
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import anthropic

HERE = Path(__file__).resolve().parent
PUBLIC = HERE / "public"
PORT = int(os.environ.get("PORT", "8000"))
MODEL = os.environ.get("TUTOR_MODEL", "claude-opus-5")
MAX_HISTORY = 24  # turnos que se reenvían al modelo
MAX_BODY = 64 * 1024

LEVELS = {
    "A1": "absolute beginner (A1). Use very short sentences, present tense, the most common 500 words.",
    "A2": "elementary (A2). Short sentences, simple past and future, common everyday vocabulary.",
    "B1": "intermediate (B1). Natural sentences, common phrasal verbs and idioms, varied tenses.",
    "B2": "upper-intermediate (B2). Natural native-like speech, idioms, nuanced vocabulary.",
    "C1": "advanced (C1). Fluent, precise professional English, complex structures and idioms.",
    "C2": "proficient (C2). Native-level executive English: nuance, persuasion, diplomacy.",
}

# Cuánto español usar según el nivel (ruta de Redes).
SPANISH_RATIO = {"A1": "about 70% Spanish and 30% English", "A2": "about 70% Spanish and 30% English",
                 "B1": "about 30% Spanish and 70% English", "B2": "about 30% Spanish and 70% English",
                 "C1": "100% English", "C2": "100% English"}

SCENARIOS = {
    "free": "a friendly casual chat about the learner's life, hobbies, work and plans",
    "cafe": "ordering food and drinks at a coffee shop; you are the barista",
    "airport": "checking in at the airport and going through immigration; you are the airline agent, then the immigration officer",
    "hotel": "checking into a hotel and asking for things; you are the receptionist",
    "job": "a job interview; you are the interviewer, ask typical interview questions one at a time",
    "doctor": "a visit to the doctor; you are the doctor asking about symptoms",
    "shopping": "shopping for clothes in a store; you are the shop assistant",
    "directions": "asking for directions in a city; you are a helpful local",
    # Ruta de Redes e Infraestructura.
    "it-coach": "a one-to-one English class for a Network and Infrastructure Analyst. Follow the TEACHING PROTOCOL below",
    "it-incident": "a P1 incident bridge call: the core switch at the main office is down; you are the Incident Manager asking the network analyst (the learner) for status, impact, ETA and next steps",
    "it-ticket": "working on a ServiceNow network incident ticket together; you are the service desk lead helping the learner write the short description, impact, steps taken and next steps",
    "it-vendor": "a support call with a Cisco TAC engineer; you are the TAC engineer asking for the serial number, software version, logs and the troubleshooting done so far",
    "it-standup": "the daily infrastructure team stand-up; you are the team lead asking what they did yesterday, what they will do today and if they have any blockers",
}

IT_CONTEXT = """The learner is a Network and Infrastructure Analyst (routing, switching, firewalls, IP addressing, Cisco/Juniper, AWS/Azure networking, ServiceNow/Jira, ITIL 4).
Technical vocabulary must be 100% accurate to industry standards (Cisco CCNA/CCNP, ITIL 4, cloud networking).
For every NEW technical term you use, add it to "terms" with its General American IPA and a Spanish-style figurative pronunciation (e.g. router -> /ˈraʊ.tɚ/ -> RÁU-ter)."""

TEACHING_PROTOCOL = """TEACHING PROTOCOL (it-coach scenario):
- Language mix for explanations ("lesson" and "tip_es"): {ratio}.
- "correction" + "tip_es" = Feedback & Corrections on the learner's last message (grammar, vocabulary, pronunciation hints).
  If they made a mistake, first give a hint in "tip_es" so they can self-correct; give the full answer only if they fail again.
- "lesson" = Core Concept: one short grammar rule or networking term explained concisely (2-4 sentences).
- "reply" = Simulated Practice + Your Turn: a short real networking scenario and ONE direct question they must answer in English. Keep it short because it is read aloud.
- Always require full sentences. If the learner answers with one word or a fragment, do not move on: ask them to answer with a complete sentence.
- Progress through the curriculum: Level 1 fundamentals + basic networking, Level 2 support and troubleshooting, Level 3 architecture/cloud/security, Level 4 executive communication. Match the learner's level."""

SYSTEM_PROMPT = """You are "Emma", a warm, patient English conversation tutor for native Spanish speakers who want to speak English fast.

How you work:
- Stay in the role-play scenario the learner chose, and keep the conversation going: every reply ends with a short, easy question or prompt so the learner has to answer.
- Keep "reply" short (1-3 sentences) and spoken-style, because it is read aloud with text-to-speech. No emojis, no markdown, no lists.
- Match the learner's level exactly. If they seem lost or write in Spanish, simplify and gently help them say it in English.
- Latency-sensitive; begin your answer immediately.

Corrections (the most valuable part for the learner):
- Look at the learner's LAST message only. If it has grammar, vocabulary or word-order mistakes, or sounds unnatural, put the natural corrected English version in "correction" and explain the key point briefly in Spanish in "tip_es" (one or two sentences, friendly).
- The learner's text may come from speech recognition, so ignore missing punctuation, capitalization and obvious transcription glitches. Do not correct those.
- If the message is already correct and natural, leave "correction" and "tip_es" as empty strings. You may still put a more natural alternative in "tip_es" if it helps, starting with "Tambien puedes decir:".
- If the learner wrote in Spanish, put the English translation of what they meant in "correction" and in "tip_es" encourage them to try saying it in English.

Other fields:
- "reply_es": a natural Spanish translation of your reply.
- "new_words": 0-3 useful words or short expressions from YOUR reply that a learner at this level may not know, with Spanish meaning. Empty array if none.
- "lesson" and "terms": empty string / empty array unless the scenario instructions below ask for them."""

TUTOR_SCHEMA = {
    "type": "object",
    "properties": {
        "reply": {"type": "string"},
        "reply_es": {"type": "string"},
        "correction": {"type": "string"},
        "tip_es": {"type": "string"},
        "lesson": {"type": "string"},
        "terms": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "en": {"type": "string"}, "ipa": {"type": "string"},
                    "say_es": {"type": "string"}, "es": {"type": "string"},
                },
                "required": ["en", "ipa", "say_es", "es"],
                "additionalProperties": False,
            },
        },
        "new_words": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"en": {"type": "string"}, "es": {"type": "string"}},
                "required": ["en", "es"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["reply", "reply_es", "correction", "tip_es", "lesson", "terms", "new_words"],
    "additionalProperties": False,
}

_client = None


def get_client():
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


def build_messages(history):
    """Convierte el historial del navegador a mensajes de la API.

    Se alterna user/assistant; el primer mensaje debe ser del usuario.
    """
    messages = []
    for turn in history[-MAX_HISTORY:]:
        role = turn.get("role")
        text = str(turn.get("text", "")).strip()[:2000]
        if role not in ("user", "assistant") or not text:
            continue
        if messages and messages[-1]["role"] == role:
            messages[-1]["content"] += "\n" + text
        else:
            messages.append({"role": role, "content": text})
    # La conversación la abre el tutor con un saludo local; la API exige que
    # el primer mensaje sea del usuario.
    if messages and messages[0]["role"] != "user":
        messages.insert(0, {"role": "user", "content": "(Start the role-play.)"})
    return messages


def ask_tutor(payload):
    level = payload.get("level") if payload.get("level") in LEVELS else "A2"
    scenario = payload.get("scenario") if payload.get("scenario") in SCENARIOS else "free"
    messages = build_messages(payload.get("history") or [])
    if not messages or messages[-1]["role"] != "user":
        raise ValueError("El historial debe terminar con un mensaje del estudiante.")

    context = (
        f"Learner level: {LEVELS[level]}\n"
        f"Role-play scenario: {SCENARIOS[scenario]}."
    )
    if scenario.startswith("it-"):
        context += "\n\n" + IT_CONTEXT
    if scenario == "it-coach":
        context += "\n\n" + TEACHING_PROTOCOL.format(ratio=SPANISH_RATIO[level])
    response = get_client().beta.messages.create(
        model=MODEL,
        max_tokens=4000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        output_config={
            "effort": "low",
            "format": {"type": "json_schema", "schema": TUTOR_SCHEMA},
        },
        system=[
            {"type": "text", "text": SYSTEM_PROMPT},
            {"type": "text", "text": context},
        ],
        messages=messages,
    )

    if response.stop_reason == "refusal":
        return {
            "reply": "Let's talk about something else. What did you do today?",
            "reply_es": "Hablemos de otra cosa. ¿Qué hiciste hoy?",
            "correction": "",
            "tip_es": "",
            "lesson": "",
            "terms": [],
            "new_words": [],
        }
    if response.stop_reason == "max_tokens":
        raise RuntimeError("La respuesta del tutor se cortó. Intenta de nuevo.")

    text = next(b.text for b in response.content if b.type == "text")
    return json.loads(text)


EXPLAIN_SYSTEM = """You help native Spanish speakers who are learning English and reading a graded book.
Answer in Spanish, briefly and simply, for a learner. Base the meaning on how the word is used in the given sentence."""

WORD_SCHEMA = {
    "type": "object",
    "properties": {
        "meaning_es": {"type": "string"},
        "part_of_speech_es": {"type": "string"},
        "base_form": {"type": "string"},
        "example_en": {"type": "string"},
        "example_es": {"type": "string"},
        "note_es": {"type": "string"},
    },
    "required": ["meaning_es", "part_of_speech_es", "base_form", "example_en", "example_es", "note_es"],
    "additionalProperties": False,
}
SENTENCE_SCHEMA = {
    "type": "object",
    "properties": {"translation_es": {"type": "string"}, "note_es": {"type": "string"}},
    "required": ["translation_es", "note_es"],
    "additionalProperties": False,
}


def explain(payload):
    kind = payload.get("kind")
    sentence = str(payload.get("sentence", "")).strip()[:600]
    if kind == "word":
        word = str(payload.get("word", "")).strip()[:60]
        if not word:
            raise ValueError("Falta la palabra.")
        prompt = (
            f'Word: "{word}"\nSentence: "{sentence}"\n\n'
            "meaning_es: the Spanish meaning in this sentence (a few words). "
            "part_of_speech_es: e.g. verbo, sustantivo, adjetivo, adverbio, preposición, expresión. "
            "base_form: the dictionary form in English (e.g. 'went' -> 'go'). "
            "example_en/example_es: one new, short, simple example sentence and its translation. "
            "note_es: one short tip (irregular verb, phrasal verb, false friend, pronunciation) or empty string."
        )
        schema = WORD_SCHEMA
    elif kind == "sentence":
        if not sentence:
            raise ValueError("Falta la frase.")
        prompt = (
            f'Sentence: "{sentence}"\n\n'
            "translation_es: a natural Spanish translation. "
            "note_es: one short note about a useful expression or grammar point in it, or empty string."
        )
        schema = SENTENCE_SCHEMA
    else:
        raise ValueError("Tipo de explicación inválido.")

    response = get_client().beta.messages.create(
        model=MODEL,
        max_tokens=2000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        output_config={"effort": "low", "format": {"type": "json_schema", "schema": schema}},
        system=EXPLAIN_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )
    if response.stop_reason in ("refusal", "max_tokens"):
        raise RuntimeError("No se pudo obtener la explicación.")
    text = next(b.text for b in response.content if b.type == "text")
    return json.loads(text)


ROUTES = {"/api/tutor": ask_tutor, "/api/explain": explain}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "/api/" in (self.path or ""):
            sys.stderr.write("%s - %s\n" % (self.log_date_time_string(), fmt % args))

    def send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/status":
            has_key = bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"))
            return self.send_json(HTTPStatus.OK, {"tutor": has_key, "model": MODEL})
        return super().do_GET()

    def do_POST(self):
        route = ROUTES.get(self.path)
        if not route:
            return self.send_json(HTTPStatus.NOT_FOUND, {"error": "No encontrado"})
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Solicitud inválida"})
        try:
            payload = json.loads(self.rfile.read(length))
            return self.send_json(HTTPStatus.OK, route(payload))
        except (ValueError, json.JSONDecodeError) as e:
            return self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(e)})
        except anthropic.AuthenticationError:
            return self.send_json(HTTPStatus.UNAUTHORIZED, {
                "error": "API key inválida o ausente. Configura ANTHROPIC_API_KEY y reinicia el servidor."})
        except TypeError as e:
            # El SDK lanza TypeError cuando no encuentra ninguna credencial.
            if "authentication" not in str(e):
                sys.stderr.write(f"tutor error: {e!r}\n")
                return self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "Error interno del servidor."})
            return self.send_json(HTTPStatus.UNAUTHORIZED, {
                "error": "Falta la API key. Configura ANTHROPIC_API_KEY y reinicia el servidor."})
        except anthropic.RateLimitError:
            return self.send_json(HTTPStatus.TOO_MANY_REQUESTS, {
                "error": "Demasiadas solicitudes. Espera unos segundos."})
        except anthropic.APIStatusError as e:
            return self.send_json(HTTPStatus.BAD_GATEWAY, {"error": f"Error del servicio de IA ({e.status_code})."})
        except anthropic.APIConnectionError:
            return self.send_json(HTTPStatus.BAD_GATEWAY, {"error": "Sin conexión con el servicio de IA."})
        except Exception as e:  # noqa: BLE001
            sys.stderr.write(f"tutor error: {e!r}\n")
            return self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "Error interno del servidor."})


def main():
    Handler.extensions_map.update({".js": "text/javascript", ".json": "application/json"})
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
        print("AVISO: ANTHROPIC_API_KEY no está configurada; el tutor de conversación estará desactivado.")
    print(f"Inglés Rápido en http://localhost:{PORT}  (Ctrl+C para salir)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
