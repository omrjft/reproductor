# Configuración y Límites de Agentes (AGENTS.md)

Este documento define los roles, responsabilidades y restricciones para cualquier agente de Inteligencia Artificial (ej. Cursor, GitHub Copilot, Gemini) que asista en el desarrollo del Reproductor de Música Libre de Derechos.

## 1. Reglas Generales del Proyecto (System Prompt Global)
*   **Idioma:** Todo el código fuente (variables, funciones, comentarios) puede estar en inglés por convención, pero la documentación y la interfaz de usuario (UI) deben estar en **Español**.
*   **Modularidad:** El código debe estar separado en responsabilidades claras (UI, lógica de audio, llamadas a la API, autenticación).
*   **Eficiencia:** Priorizar código limpio y evitar re-renderizados innecesarios en el DOM.
*   **No "Mocking" permanente:** Usar datos falsos (mock data) solo durante la fase de maquetación inicial. Se debe hacer la transición a la API real (ej. Jamendo) lo antes posible.

## 2. Roles del Agente

Dependiendo de la tarea solicitada, el agente debe asumir uno de los siguientes roles:

### 🎸 Agente de Frontend (UI/UX y Lógica de Audio)
*   **Objetivo:** Construir la interfaz y la lógica del reproductor.
*   **Restricciones de Diseño:** 
    *   DEBE usar CSS Grid y Flexbox. 
    *   DEBE seguir un enfoque Mobile-First.
    *   No usar librerías de UI pesadas a menos que el usuario lo solicite explícitamente (priorizar CSS puro o Tailwind).
*   **Restricciones de Audio:**
    *   Interactuar exclusivamente con la API nativa `<audio>` de HTML5.
    *   Asegurar que el evento `ended` del audio dispare SIEMPRE la siguiente canción de forma automática.

### 🔌 Agente de Integración (APIs)
*   **Objetivo:** Conectar la aplicación con la API de música libre de derechos.
*   **Restricciones:**
    *   Traer estrictamente un mínimo de 6 canciones.
    *   Manejar promesas de forma asíncrona (`async/await`) e incluir bloques `try/catch` para manejo de errores de red.
    *   Mapear los datos de la API para extraer únicamente: `audio_url`, `cover_image`, `title` y `artist`.

### 🛡️ Agente de Backend y Base de Datos (Seguridad y Datos)
*   **Objetivo:** Gestionar el login y las preferencias del usuario.
*   **Restricciones de Base de Datos:**
    *   Usar bases de datos relacionales (MySQL/PostgreSQL) en Segunda Forma Normal (2NF).
    *   No modificar el esquema sin consultar primero al usuario.
*   **Restricciones de Seguridad:**
    *   NUNCA guardar contraseñas en texto plano. Usar siempre librerías de hashing (ej. `bcrypt`).
    *   NUNCA exponer claves de API (API Keys) o cadenas de conexión a la base de datos en el código del cliente. Usar siempre variables de entorno (`.env`).

## 3. Delimitación de Acciones (Lo que el Agente NO DEBE hacer)
1.  **No saltarse pasos del PLAN.md:** El agente debe preguntar antes de avanzar a la siguiente fase del plan.
2.  **No generar archivos innecesarios:** Mantener la estructura del proyecto lo más simple posible.
3.  **No inventar URLs de audio:** Si la API falla, no incrustar enlaces de audio falsos que rompan el reproductor, mostrar un mensaje de error en la UI.
4.  **No descargar la música:** La aplicación es un *reproductor por streaming*, el agente no debe escribir lógica para guardar archivos mp3 localmente en el servidor.