const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();
router.use(requireAuth);

const rolesValidos = ['paciente', 'medico', 'enfermeria', 'admision', 'administrador', 'laboratorio'];

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

// PUT /api/usuarios/:id -> el administrador edita datos y/o contraseña de cualquier usuario
router.put('/:id', requireRole('administrador'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nombre, correo, rol, password } = req.body;

  const usuario = await pool.query('SELECT id, correo, rol FROM usuarios WHERE id = $1', [id]);
  if (!usuario.rows[0]) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  const updates = [];
  const values = [];
  let idx = 1;

  if (nombre !== undefined) {
    updates.push(`nombre = $${idx++}`);
    values.push(nombre);
  }
  if (correo !== undefined) {
    const existente = await pool.query('SELECT id FROM usuarios WHERE correo = $1 AND id <> $2', [correo, id]);
    if (existente.rows[0]) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese correo.' });
    }
    updates.push(`correo = $${idx++}`);
    values.push(correo);
  }
  if (rol !== undefined) {
    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido.' });
    }
    updates.push(`rol = $${idx++}`);
    values.push(rol);
  }
  if (password !== undefined && password !== '') {
    const hash = bcrypt.hashSync(password, 10);
    updates.push(`password_hash = $${idx++}`);
    values.push(hash);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No hay campos para actualizar.' });
  }

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, nombre, correo, rol`,
    values
  );

  let detalle = `Actualizó la cuenta ${rows[0].correo}`;
  if (password) detalle += ' (cambió contraseña)';
  if (rol) detalle += ` (rol: ${rows[0].rol})`;
  await pool.query(
    'INSERT INTO auditoria (usuario_id, accion, detalle) VALUES ($1, $2, $3)',
    [req.usuario.id, 'actualizar_usuario', detalle]
  );

  res.json(rows[0]);
}));

// PATCH /api/usuarios/:id -> alias para actualizar
router.patch('/:id', requireRole('administrador'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nombre, correo, rol, password } = req.body;

  const usuario = await pool.query('SELECT id, correo FROM usuarios WHERE id = $1', [id]);
  if (!usuario.rows[0]) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  const updates = [];
  const values = [];
  let idx = 1;

  if (nombre !== undefined) {
    updates.push(`nombre = $${idx++}`);
    values.push(nombre);
  }
  if (correo !== undefined) {
    const existente = await pool.query('SELECT id FROM usuarios WHERE correo = $1 AND id <> $2', [correo, id]);
    if (existente.rows[0]) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese correo.' });
    }
    updates.push(`correo = $${idx++}`);
    values.push(correo);
  }
  if (rol !== undefined) {
    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido.' });
    }
    updates.push(`rol = $${idx++}`);
    values.push(rol);
  }
  if (password !== undefined && password !== '') {
    const hash = bcrypt.hashSync(password, 10);
    updates.push(`password_hash = $${idx++}`);
    values.push(hash);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No hay campos para actualizar.' });
  }

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, nombre, correo, rol`,
    values
  );

  let detalle = `Actualizó la cuenta ${rows[0].correo}`;
  if (password) detalle += ' (cambió contraseña)';
  await pool.query(
    'INSERT INTO auditoria (usuario_id, accion, detalle) VALUES ($1, $2, $3)',
    [req.usuario.id, 'actualizar_usuario', detalle]
  );

  res.json(rows[0]);
}));

module.exports = router;