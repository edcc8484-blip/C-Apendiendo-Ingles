# Inglés Rápido

App para aprender a **hablar y entender inglés** rápido, con práctica diaria de 15 minutos.

## Qué incluye

| Sección | Para qué sirve |
|---|---|
| **Inicio** | Tu plan del día, meta de XP, racha de días y ajustes (nivel, velocidad de voz). |
| **Lecciones** | 12 lecciones cortas A1 → B1: frases clave con audio y ejercicios (opción múltiple, ordenar palabras, decirlo en voz alta con evaluación de pronunciación). |
| **Palabras** | ~130 palabras de uso frecuente con **repaso espaciado**: cada palabra vuelve justo antes de que la olvides. 10 nuevas por día. |
| **Escuchar** | Dictado (escucha y escribe) y diálogos con preguntas de comprensión, a velocidad normal o lenta. |
| **Hablar** | Conversación por voz con **Emma**, tutora con IA (Claude). Escenarios: cafetería, aeropuerto, hotel, entrevista de trabajo, médico, compras, direcciones o charla libre. Corrige tus errores y te explica en español. |

El progreso se guarda en el navegador (sin cuentas ni login).

## Requisitos

- Python 3.10 o superior
- Google Chrome o Microsoft Edge (para el micrófono y el reconocimiento de voz)
- Para el tutor de conversación: una API key de Anthropic (https://console.anthropic.com)

## Instalar (una sola vez)

```powershell
python -m pip install -r requirements.txt
```

## Ejecutar

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."   # tu API key (solo para el tutor)
python server.py
```

Abre http://localhost:8000 en Chrome o Edge. Sin API key todo funciona excepto la sección **Hablar**.

También puedes hacer doble clic en `iniciar.bat` si guardas tu key como variable de entorno de Windows.

## Configuración opcional

| Variable | Por defecto | Uso |
|---|---|---|
| `TUTOR_MODEL` | `claude-opus-5` | Modelo de Claude para el tutor |
| `PORT` | `8000` | Puerto del servidor |

## Método recomendado (15 min/día)

1. **Palabras** (3 min): repasa las tarjetas del día, di cada palabra en voz alta.
2. **Lección** (5 min): escucha las frases, repítelas, haz los ejercicios.
3. **Escuchar** (3 min): 5 frases de dictado.
4. **Hablar** (5 min): conversa con Emma usando el micrófono. Equivócate sin miedo.
