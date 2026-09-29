/**
 * Sonora - Backend Server (Phase 4)
 * Express server providing Authentication and Preferences endpoints with bcrypt & JWT.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_sonora';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// JWT Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso no autorizado. Token no proporcionado.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado.' });
    }
    req.user = user;
    next();
  });
}

// -------------------------------------------------------------
// Endpoints de Autenticación
// -------------------------------------------------------------

/**
 * POST /api/register
 * Registra un nuevo usuario con contraseña hasheada y crea sus preferencias por defecto.
 */
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    // Check if email already exists
    const existingUser = db.prepare('SELECT id FROM Usuarios WHERE email = ?').get(email.trim().toLowerCase());
    if (existingUser) {
      return res.status(409).json({ error: 'El correo electrónico ya está registrado.' });
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user into Usuarios table
    const insertUser = db.prepare('INSERT INTO Usuarios (email, password_hash) VALUES (?, ?)');
    const result = insertUser.run(email.trim().toLowerCase(), passwordHash);
    const userId = result.lastInsertRowid;

    // Create default preferences in Preferencias table
    const insertPrefs = db.prepare('INSERT INTO Preferencias (usuario_id, tema_oscuro, volumen_guardado, ultima_cancion_id) VALUES (?, 0, 0.8, NULL)');
    insertPrefs.run(userId);

    // Generate JWT token
    const token = jwt.sign({ id: userId, email: email.trim().toLowerCase() }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Usuario registrado exitosamente.',
      token,
      user: {
        id: userId,
        email: email.trim().toLowerCase()
      }
    });
  } catch (error) {
    console.error('Error in /api/register:', error);
    res.status(500).json({ error: 'Error interno del servidor al registrar el usuario.' });
  }
});

/**
 * POST /api/login
 * Autentica al usuario verificando su contraseña hasheada con bcrypt y retorna un JWT.
 */
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
    }

    // Query user
    const user = db.prepare('SELECT id, email, password_hash FROM Usuarios WHERE email = ?').get(email.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // Compare password with bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Inicio de sesión exitoso.',
      token,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error in /api/login:', error);
    res.status(500).json({ error: 'Error interno del servidor al iniciar sesión.' });
  }
});

// -------------------------------------------------------------
// Endpoints de Preferencias del Usuario (Protegidos)
// -------------------------------------------------------------

/**
 * GET /api/preferences
 * Obtiene las preferencias guardadas del usuario autenticado.
 */
app.get('/api/preferences', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    let prefs = db.prepare('SELECT tema_oscuro, volumen_guardado, ultima_cancion_id FROM Preferencias WHERE usuario_id = ?').get(userId);

    if (!prefs) {
      // Create preferences if they didn't exist
      db.prepare('INSERT INTO Preferencias (usuario_id, tema_oscuro, volumen_guardado, ultima_cancion_id) VALUES (?, 0, 0.8, NULL)').run(userId);
      prefs = { tema_oscuro: 0, volumen_guardado: 0.8, ultima_cancion_id: null };
    }

    res.json({
      preferences: {
        tema_oscuro: Boolean(prefs.tema_oscuro),
        volumen_guardado: parseFloat(prefs.volumen_guardado),
        ultima_cancion_id: prefs.ultima_cancion_id
      }
    });
  } catch (error) {
    console.error('Error in GET /api/preferences:', error);
    res.status(500).json({ error: 'Error al obtener preferencias.' });
  }
});

/**
 * PUT /api/preferences
 * Actualiza las preferencias del usuario (tema oscuro, volumen guardado, última canción).
 */
app.put('/api/preferences', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const { tema_oscuro, volumen_guardado, ultima_cancion_id } = req.body;

    // Get existing preferences
    const existing = db.prepare('SELECT * FROM Preferencias WHERE usuario_id = ?').get(userId);

    const newTemaOscuro = (tema_oscuro !== undefined) ? (tema_oscuro ? 1 : 0) : (existing ? existing.tema_oscuro : 0);
    const newVolumen = (volumen_guardado !== undefined) ? Math.max(0, Math.min(1, parseFloat(volumen_guardado))) : (existing ? existing.volumen_guardado : 0.8);
    const newUltimaCancion = (ultima_cancion_id !== undefined) ? ultima_cancion_id : (existing ? existing.ultima_cancion_id : null);

    if (existing) {
      db.prepare('UPDATE Preferencias SET tema_oscuro = ?, volumen_guardado = ?, ultima_cancion_id = ? WHERE usuario_id = ?')
        .run(newTemaOscuro, newVolumen, newUltimaCancion, userId);
    } else {
      db.prepare('INSERT INTO Preferencias (usuario_id, tema_oscuro, volumen_guardado, ultima_cancion_id) VALUES (?, ?, ?, ?)')
        .run(userId, newTemaOscuro, newVolumen, newUltimaCancion);
    }

    res.json({
      message: 'Preferencias actualizadas correctamente.',
      preferences: {
        tema_oscuro: Boolean(newTemaOscuro),
        volumen_guardado: newVolumen,
        ultima_cancion_id: newUltimaCancion
      }
    });
  } catch (error) {
    console.error('Error in PUT /api/preferences:', error);
    res.status(500).json({ error: 'Error al actualizar preferencias.' });
  }
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor Sonora ejecutándose en http://localhost:${PORT}`);
  });
}

module.exports = app;
