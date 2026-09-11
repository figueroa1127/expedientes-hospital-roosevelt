const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();
router.use(requireAuth);

const SELECT_CITAS = `
  SELECT c.id, c.fecha, c.motivo, c.estado,
         up.nombre AS paciente_nombre, c.paciente_id,
         um.nombre AS medico_nombre, c.medico_id, me.especialidad
  FROM citas c
  JOIN pacientes p ON p.id = c.paciente_id
  JOIN usuarios up ON up.id = p.usuario_id
  JOIN medicos me ON me.id = c.medico_id
  JOIN usuarios um ON um.id = me.usuario_id
`;

// GET /api/citas -> listado según el rol de quien consulta
router.get('/', asyncHandler(async (req, res) => {
  const { rol, id } = req.usuario;

  if (rol === 'paciente') {
    const paciente = await pool.query('SELECT id FROM pacientes WHERE usuario_id = $1', [id]);
    if (!paciente.rows[0]) return res.json([]);
    const citas = await pool.query(`${SELECT_CITAS} WHERE c.paciente_id = $1 ORDER BY c.fecha`, [paciente.rows[0].id]);
    return res.json(citas.rows);
  }

  if (rol === 'medico') {
    const medico = await pool.query('SELECT id FROM medicos WHERE usuario_id = $1', [id]);
    if (!medico.rows[0]) return res.json([]);
    const citas = await pool.query(`${SELECT_CITAS} WHERE c.medico_id = $1 ORDER BY c.fecha`, [medico.rows[0].id]);
    return res.json(citas.rows);
  }

  // enfermería, admisión y administrador ven la agenda completa
  const citas = await pool.query(`${SELECT_CITAS} ORDER BY c.fecha`);
  res.json(citas.rows);
}));

// GET /api/citas/medicos -> listado de médicos disponibles para agendar
router.get('/medicos', asyncHandler(async (req, res) => {
  const medicos = await pool.query(
    `SELECT m.id, u.nombre, m.especialidad FROM medicos m JOIN usuarios u ON u.id = m.usuario_id`
  );
  res.json(medicos.rows);
}));

// POST /api/citas -> agendar una cita (admisión, administrador, o el propio paciente)
router.post('/', requireRole('admision', 'administrador', 'paciente'), asyncHandler(async (req, res) => {
  const { medico_id, fecha, motivo, paciente_id } = req.body;
  let pacienteIdFinal = paciente_id;

  if (req.usuario.rol === 'paciente') {
    const paciente = await pool.query('SELECT id FROM pacientes WHERE usuario_id = $1', [req.usuario.id]);
    if (!paciente.rows[0]) return res.status(404).json({ error: 'No se encontró tu ficha de paciente.' });
    pacienteIdFinal = paciente.rows[0].id;
  }

  if (!pacienteIdFinal || !medico_id || !fecha) {
    return res.status(400).json({ error: 'Paciente, médico y fecha son obligatorios.' });
  }

  const info = await pool.query(
    'INSERT INTO citas (paciente_id, medico_id, fecha, motivo, creado_por) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [pacienteIdFinal, medico_id, fecha, motivo, req.usuario.id]
  );

  await pool.query(
    'INSERT INTO auditoria (usuario_id, accion, detalle) VALUES ($1, $2, $3)',
    [req.usuario.id, 'crear_cita', `Cita ${info.rows[0].id}`]
  );

  res.status(201).json({ id: info.rows[0].id, mensaje: 'Cita agendada correctamente.' });
}));

// PUT /api/citas/:id/estado -> marcar cita como atendida o cancelada
router.put('/:id/estado', requireRole('medico', 'enfermeria', 'admision', 'administrador'), asyncHandler(async (req, res) => {
  const { estado } = req.body;
  if (!['programada', 'atendida', 'cancelada'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido.' });
  }
  await pool.query('UPDATE citas SET estado = $1 WHERE id = $2', [estado, req.params.id]);
  res.json({ mensaje: 'Estado de la cita actualizado.' });
}));

module.exports = router;