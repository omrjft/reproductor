# Plan de Desarrollo: Reproductor de Música Libre de Derechos

## 1. Descripción del Proyecto
Aplicación web responsiva para reproducir música libre de derechos obtenida a través de una API de terceros. Los usuarios podrán escuchar un catálogo básico, controlar la reproducción y crear cuentas para guardar sus opciones personalizadas.

## 2. Stack Tecnológico Sugerido
*   **Frontend:** HTML5, CSS3 (Grid y Flexbox para responsividad), JavaScript (Vanilla JS o un framework como React/Vue) + HTML5 `<audio>` API.
*   **Backend:** Node.js (Express) o Java (Spring Boot) para gestionar la autenticación y la conexión a la base de datos.
*   **Base de Datos:** MySQL o PostgreSQL (esquemas relacionales normalizados) para gestionar usuarios y configuraciones.
*   **API de Música:** [Jamendo API](https://developer.jamendo.com/) (excelente para música libre de derechos) o Free Music Archive API.

---

## 3. Requisitos del Sistema

### Funciones del Reproductor (Core)
- [ ] Obtener y cargar un mínimo de 6 canciones iniciales desde la API al iniciar la aplicación.
- [ ] Mostrar metadatos de la pista actual: Portada (imagen), Título de la canción y Artista.
- [ ] Controles de reproducción: Botones de Play, Pausa, Anterior y Siguiente.
- [ ] Interfaz de tiempo: Mostrar tiempo actual (`0:00`), duración total (`3:45`) y barra de progreso interactiva.
- [ ] Lógica de cola: Cambiar automáticamente a la siguiente canción al terminar la pista actual.

### Lista de Reproducción (Playlist)
- [ ] Renderizar una lista visible de las canciones cargadas.
- [ ] Permitir hacer clic en cualquier canción de la lista para reproducirla inmediatamente.
- [ ] Resaltar visualmente la canción que se está reproduciendo actualmente en la lista.

### Diseño y UI/UX
- [ ] Diseño Responsivo (Mobile-First): 
  - **Celular:** Diseño en columna (portada grande arriba, controles en el medio, lista colapsable o debajo usando CSS Flexbox).
  - **Computadora:** Diseño extendido (lista lateral usando CSS Grid, barra de reproducción fija en la parte inferior).
- [ ] Uso de `place-items: center` y Flexbox para alineación fluida de la portada y los modales (como el modal de login).

### Autenticación y Base de Datos (Backend)
- [ ] Sistema de Registro y Login de usuarios (con contraseñas encriptadas, ej. bcrypt).
- [ ] Base de datos relacional en Segunda Forma Normal (2NF) mínima.
- [ ] Tablas principales:
  - `Usuarios` (id, email, password_hash, fecha_creacion)
  - `Preferencias` (id, usuario_id, tema_oscuro, volumen_guardado, ultima_cancion_id)

---

## 4. Fases de Desarrollo

### Fase 1: Maquetación estática y diseño responsivo
1. Crear el esqueleto HTML (contenedor del reproductor, imagen, textos, barra de progreso, controles, lista).
2. Aplicar CSS Grid y Flexbox para estructurar la vista móvil y de escritorio.
3. Estilizar la barra de progreso (input tipo `range`) y los botones.

### Fase 2: Lógica del reproductor de audio (JavaScript)
1. Instanciar el objeto `new Audio()` en JS.
2. Programar las funciones de `playSong()`, `pauseSong()`, `prevSong()`, y `nextSong()`.
3. Sincronizar el evento `timeupdate` del audio con la barra de progreso y los contadores de tiempo.
4. Escuchar el evento `ended` para disparar automáticamente `nextSong()`.

### Fase 3: Integración de la API de Música
1. Leer la documentación de Jamendo API (o la elegida) y obtener las credenciales/llaves.
2. Hacer un `fetch()` al endpoint de pistas para traer al menos 6 canciones (filtrar por populares o un género específico).
3. Mapear el JSON recibido para extraer la URL del audio, portada, título y artista.
4. Llenar la lista de reproducción dinámica en el DOM con estos datos.

### Fase 4: Backend y Base de Datos
1. Configurar el servidor y conectar la base de datos relacional.
2. Crear los scripts SQL de creación de tablas.
3. Desarrollar los endpoints de la API interna:
   - `POST /api/register`
   - `POST /api/login`
   - `GET /api/preferences` (protegido por sesión/token)
   - `PUT /api/preferences`

### Fase 5: Integración Frontend-Backend y Pruebas
1. Construir el modal o página de Login/Registro.
2. Guardar el estado de la sesión (Local Storage o Cookies).
3. Modificar la UI si el usuario está logueado (mostrar su nombre, guardar en DB si marca una canción como favorita o su ajuste de volumen).
4. Pruebas de usabilidad en dispositivos reales (móvil y escritorio).