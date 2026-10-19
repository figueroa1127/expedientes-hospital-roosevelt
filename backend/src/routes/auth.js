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

// POST /api/auth/paciente/acceso -> acceso de pacientes con DPI + contraseña.
// Con crear=true activa el acceso (si el DPI ya está activo avisa "el usuario es existente").
router.post(
  '/paciente/acceso',
  asyncHandler(async (req, res) => {
    const { dpi, password, crear } = req.body;

    if (!dpi || !password) {
      return res.status(400).json({ error: 'El DPI y la contraseña son obligatorios.' });
    }

    const { rows } = await pool.query(
      `SELECT p.id AS paciente_id, p.acceso_activo, u.id AS usuario_id, u.nombre, u.correo, u.password_hash
         FROM pacientes p
         JOIN usuarios u ON u.id = p.usuario_id
        WHERE p.dpi = $1`,
      [String(dpi).trim()]
    );
    const paciente = rows[0];
    if (!paciente) {
      return res.status(404).json({ error: 'No encontramos ese DPI. Por favor solicítelo en admisión.' });
    }

    if (crear) {
      if (paciente.acceso_activo) {
        return res.status(409).json({ error: 'El usuario es existente.' });
      }
      if (String(password).length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
      }
      const hash = bcrypt.hashSync(String(password), 10);
      await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [hash, paciente.usuario_id]);
      await pool.query('UPDATE pacientes SET acceso_activo = true WHERE id = $1', [paciente.paciente_id]);
      await pool.query(
        'INSERT INTO auditoria (usuario_id, accion, detalle) VALUES ($1, $2, $3)',
        [paciente.usuario_id, 'activar_acceso', `Activación de acceso del paciente ${paciente.correo}`]
      );
    } else {
      if (!paciente.acceso_activo) {
        return res
          .status(400)
          .json({ error: 'Tu acceso aún no está activo. Usa "Crear acceso" con tu DPI.' });
      }
      const ok = bcrypt.compareSync(password, paciente.password_hash);
      if (!ok) {
        return res.status(401).json({ error: 'DPI o contraseña incorrectos.' });
      }
      await pool.query(
        'INSERT INTO auditoria (usuario_id, accion, detalle) VALUES ($1, $2, $3)',
        [paciente.usuario_id, 'login', 'Inicio de sesión (paciente, DPI)']
      );
    }

    const usuario = {
      id: paciente.usuario_id,
      nombre: paciente.nombre,
      correo: paciente.correo,
      rol: 'paciente',
    };
    res.json({ token: firmarToken(usuario), usuario });
  })
);

// GET /api/auth/perfil  -> confirma la sesión activa (usado por el frontend al recargar)
router.get('/perfil', requireAuth, (req, res) => {
  res.json({ usuario: req.usuario });
});

module.exports = router;