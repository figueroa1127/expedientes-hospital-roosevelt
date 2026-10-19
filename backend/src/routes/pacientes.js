const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();
router.use(requireAuth);

const SELECT_PACIENTES = `
  SELECT p.id, p.dpi, p.registro_medico, p.genero, p.fecha_nacimiento,
         p.telefono, p.direccion, p.tipo_sangre,
         u.nombre, u.correo
  FROM pacientes p
  JOIN usuarios u ON u.id = p.usuario_id
`;

// GET /api/pacientes -> listado de pacientes (personal clínico y administrativo)
router.get('/', requireRole('medico', 'enfermeria', 'admision', 'administrador'), asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`${SELECT_PACIENTES} ORDER BY u.nombre`);
  res.json(rows);
}));

// GET /api/pacientes/dpi/:dpi -> registrar clínico buscando directamente por DPI
router.get('/dpi/:dpi', requireRole('medico', 'enfermeria', 'admision', 'administrador'), asyncHandler(async (req, res) => {
  const dpi = String(req.params.dpi).trim();
  const { rows } = await pool.query(`${SELECT_PACIENTES} WHERE p.dpi = $1`, [dpi]);
  if (!rows[0]) return res.status(404).json({ error: 'No se encontró un paciente con ese DPI.' });
  res.json(rows[0]);
}));

// POST /api/pacientes -> registrar un nuevo paciente (admisión y administrador)
router.post('/', requireRole('admision', 'administrador'), asyncHandler(async (req, res) => {
  const {
    nombre,
    correo,
    password,
    dpi,
    registro_medico,
    genero,
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

  const existente = await pool.query('SELECT id FROM usuarios WHERE lower(correo) = $1', [correoNormalizado]);
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
      `INSERT INTO pacientes (usuario_id, dpi, registro_medico, genero, fecha_nacimiento, telefono, direccion, tipo_sangre)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        usuarioId,
        dpi ? String(dpi).trim() : null,
        registro_medico ? String(registro_medico).trim() : null,
        genero || null,
        fecha_nacimiento || null,
        telefono || null,
        direccion || null,
        tipo_sangre || null,
      ]
    );

    await client.query('INSERT INTO expedientes (paciente_id) VALUES ($1)', [paciente.rows[0].id]);

    await client.query(
      'INSERT INTO auditoria (usuario_id, accion, detalle) VALUES ($1, $2, $3)',
      [req.usuario.id, 'registrar_paciente', `Alta de paciente ${correoNormalizado}`]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  res.status(201).json({ id: nuevoId, mensaje: 'Paciente registrado correctamente.' });
}));

// PUT /api/pacientes/:id -> actualizar ficha y nombre del paciente (admisión y administrador)
router.put('/:id', requireRole('admision', 'administrador'), asyncHandler(async (req, res) => {
  const {
    nombre,
    dpi,
    registro_medico,
    genero,
    fecha_nacimiento,
    telefono,
    direccion,
    tipo_sangre,
  } = req.body;

  const paciente = await pool.query('SELECT * FROM pacientes WHERE id = $1', [req.params.id]);
  if (!paciente.rows[0]) return res.status(404).json({ error: 'Paciente no encontrado.' });

  await pool.query(
    `UPDATE pacientes
       SET dpi = $1, registro_medico = $2, genero = $3, fecha_nacimiento = $4,
           telefono = $5, direccion = $6, tipo_sangre = $7
     WHERE id = $8`,
    [dpi, registro_medico, genero, fecha_nacimiento, telefono, direccion, tipo_sangre, req.params.id]
  );

  if (nombre && nombre.trim()) {
    await pool.query('UPDATE usuarios SET nombre = $1 WHERE id = $2', [
      nombre.trim(),
      paciente.rows[0].usuario_id,
    ]);
  }

  await pool.query(
    'INSERT INTO auditoria (usuario_id, accion, detalle) VALUES ($1, $2, $3)',
    [req.usuario.id, 'actualizar_paciente', `Paciente ${req.params.id}`]
  );

  res.json({ mensaje: 'Datos del paciente actualizados.' });
}));

module.exports = router;
