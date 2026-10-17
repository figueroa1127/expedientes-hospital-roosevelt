const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

function firmarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
    }

    const { rows } = await pool.query('SELECT * FROM usuarios WHERE lower(correo) = lower($1)', [correo]);
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

// POST /api/auth/registro -> autoregistro público de pacientes (rol fijo: paciente)
router.post(
  '/registro',
  asyncHandler(async (req, res) => {
    const {
      nombre,
      correo,
      password,
      dpi,
      fecha_nacimiento,
      telefono,
      direccion,
      tipo_sangre,
    } = req.body;

    if (!nombre || !nombre.trim() || !correo || !password) {
      return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios.' });
    }

    const correoNormalizado = String(correo).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoNormalizado)) {
      return res.status(400).json({ error: 'El correo no tiene un formato válido.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const existente = await pool.query('SELECT id FROM usuarios WHERE lower(correo) = $1', [
      correoNormalizado,
    ]);
    if (existente.rows[0]) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo electrónico.' });
    }

    const hash = bcrypt.hashSync(String(password), 10);

    const client = await pool.connect();
    let nuevoId;
    try {
      await client.query('BEGIN');

      const info = await client.query(
        'INSERT INTO usuarios (nombre, correo, password_hash, rol) VALUES ($1, $2, $3, $4) RETURNING id',
        [nombre.trim(), correoNormalizado, hash, 'paciente']
      );
      const usuarioId = info.rows[0].id;
      nuevoId = usuarioId;

      const paciente = await client.query(
        `INSERT INTO pacientes (usuario_id, dpi, fecha_nacimiento, telefono, direccion, tipo_sangre)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          usuarioId,
          dpi ? String(dpi).trim() : null,
          fecha_nacimiento || null,
          telefono || null,
          direccion || null,
          tipo_sangre || null,
        ]
      );

      await client.query('INSERT INTO expedientes (paciente_id) VALUES ($1)', [paciente.rows[0].id]);

      await client.query(
        'INSERT INTO auditoria (usuario_id, accion, detalle) VALUES ($1, $2, $3)',
        [nuevoId, 'registro', `Autoregistro de paciente ${correoNormalizado}`]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const usuario = { id: nuevoId, nombre: nombre.trim(), correo: correoNormalizado, rol: 'paciente' };
    res.status(201).json({ token: firmarToken(usuario), usuario });
  })
);

// GET /api/auth/perfil  -> confirma la sesión activa (usado por el frontend al recargar)
router.get('/perfil', requireAuth, (req, res) => {
  res.json({ usuario: req.usuario });
});

module.exports = router;