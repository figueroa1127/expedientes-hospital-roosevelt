const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
    }

    const { rows } = await pool.query('SELECT * FROM usuarios WHERE correo = $1', [correo]);
    const usuario = rows[0];
    if (!usuario) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    const ok = bcrypt.compareSync(password, usuario.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    await pool.query(
      'INSERT INTO auditoria (usuario_id, accion, detalle) VALUES ($1, $2, $3)',
      [usuario.id, 'login', `Inicio de sesión (${usuario.rol})`]
    );

    res.json({
      token,
      usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol },
    });
  })
);

// GET /api/auth/perfil  -> confirma la sesión activa (usado por el frontend al recargar)
router.get('/perfil', requireAuth, (req, res) => {
  res.json({ usuario: req.usuario });
});

module.exports = router;