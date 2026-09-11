const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();
router.use(requireAuth);

// GET /api/usuarios -> solo el administrador ve el listado completo de cuentas
router.get('/', requireRole('administrador'), asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, nombre, correo, rol, creado_en FROM usuarios ORDER BY creado_en DESC'
  );
  res.json(rows);
}));

// POST /api/usuarios -> el administrador crea cuentas para personal o pacientes
router.post('/', requireRole('administrador'), asyncHandler(async (req, res) => {
  const { nombre, correo, password, rol } = req.body;
  const rolesValidos = ['paciente', 'medico', 'enfermeria', 'admision', 'administrador'];

  if (!nombre || !correo || !password || !rol) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }
  if (!rolesValidos.includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido.' });
  }

  const existente = await pool.query('SELECT id FROM usuarios WHERE correo = $1', [correo]);
  if (existente.rows[0]) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese correo.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const info = await pool.query(
    'INSERT INTO usuarios (nombre, correo, password_hash, rol) VALUES ($1, $2, $3, $4) RETURNING id',
    [nombre, correo, hash, rol]
  );
  const id = info.rows[0].id;

  if (rol === 'paciente') {
    await pool.query('INSERT INTO pacientes (usuario_id) VALUES ($1)', [id]);
  }
  if (rol === 'medico') {
    await pool.query('INSERT INTO medicos (usuario_id) VALUES ($1)', [id]);
  }

  await pool.query(
    'INSERT INTO auditoria (usuario_id, accion, detalle) VALUES ($1, $2, $3)',
    [req.usuario.id, 'crear_usuario', `Creó la cuenta ${correo} (${rol})`]
  );

  res.status(201).json({ id, nombre, correo, rol });
}));

module.exports = router;