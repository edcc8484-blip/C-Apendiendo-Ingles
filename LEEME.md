# Inglés Rápido

App para aprender a **hablar y entender inglés** rápido, con práctica diaria de 15 minutos.

## Qué incluye

| Sección | Para qué sirve |
|---|---|
| **Inicio** | Tu plan del día, meta de XP, racha de días y ajustes (nivel, velocidad de voz). |
| **Curso** | **Reto 30 días** para empezar a hablar: bienvenida, retos por nivel (Basic A1 · días 1–10, Pre-Intermediate A2 · 11–20, Intermediate B1 · 21–30), Biblioteca y «Domina los verbos» (los 30 más usados), cada uno con su barra de progreso. Cada día: 6 frases con audio → ejercicios interactivos → **misión de habla cronometrada** (45 s a 2 min hablando sin parar; mide palabras por minuto y frases clave usadas, con corrección opcional por IA) → conversación con Emma sobre el tema. |
| **Lecciones** | Dos rutas. **Inglés general**: 12 lecciones A1 → B1. **Redes y TI**: 11 lecciones en 4 niveles (A1 → C2) para analistas de redes e infraestructura: componentes, comandos, IPs, reporte de incidentes, troubleshooting, tickets, cloud networking, Zero Trust, llamadas de crisis y negociación con proveedores. Cada término técnico trae IPA y pronunciación figurada; cada lección se desbloquea al completar el quiz de la anterior. |
| **Palabras** | ~130 palabras de uso frecuente con **repaso espaciado**: cada palabra vuelve justo antes de que la olvides. 10 nuevas por día. |
| **Escuchar** | Dictado (escucha y escribe) y diálogos con preguntas de comprensión, a velocidad normal o lenta. |
| **Libros** | Audiolibros graduados (A1 → B1): 4 libros, 12 capítulos. Escucha con el texto resaltado frase por frase, **toca cualquier palabra** para ver su significado, sus formas si es verbo y agregarla a tus tarjetas. Al terminar, **léelo tú en voz alta**: te escucha frase por frase y marca las palabras que hay que mejorar. |
| **Verbos** | Diccionario de 280 verbos (117 irregulares) con pasado, participio, -ing y 3ª persona, y su conjugación completa en 9 tiempos (afirmativa, negativa y pregunta), con audio. Incluye práctica de irregulares. |
| **Hablar** | Conversación por voz con **Emma**, tutora con IA (Claude). Escenarios de vida diaria (cafetería, aeropuerto, hotel, entrevista, médico, compras, direcciones, charla libre) y de **Redes y TI**: clase con tutor (formato Feedback → Core Concept → Your Turn, con más o menos español según tu nivel), incidente P1, ticket en ServiceNow, llamada con Cisco TAC y stand-up. Corrige tus errores y te explica en español. |

El progreso se guarda en el navegador (sin cuentas ni login).

## Requisitos

- Python 3.10 o superior
- Google Chrome o Microsoft Edge (para el micrófono y el reconocimiento de voz)
- Para el tutor de conversación: una API key de Anthropic (https://console.anthropic.com)

## Instalar (una sola vez)

```powershell
py -m pip install -r requirements.txt
```

## Ejecutar

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."   # tu API key (solo para el tutor)
py server.py
```

Abre http://localhost:8000 en Chrome o Edge. Sin API key todo funciona excepto la sección **Hablar** y las explicaciones/traducciones con IA en **Libros** (el diccionario sin conexión sí funciona).

También puedes hacer doble clic en `iniciar.bat` si guardas tu key como variable de entorno de Windows.

## Configuración opcional

| Variable | Por defecto | Uso |
|---|---|---|
| `TUTOR_MODEL` | `claude-opus-5` | Modelo de Claude para el tutor |
| `PORT` | `8000` | Puerto del servidor |

> Si el comando `python` te manda a la Microsoft Store, usa `py` (el lanzador de Python para Windows). `iniciar.bat` ya lo hace solo.

## Método recomendado (15 min/día)

1. **Palabras** (3 min): repasa las tarjetas del día, di cada palabra en voz alta.
2. **Lección** (5 min): escucha las frases, repítelas, haz los ejercicios.
3. **Escuchar** (3 min): 5 frases de dictado.
4. **Libros** (5 min): escucha un capítulo y luego léelo en voz alta.
5. **Hablar** (5 min): conversa con Emma usando el micrófono. Equivócate sin miedo.
