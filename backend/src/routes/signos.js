const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();
router.use(requireAuth);

const SELECT_SIGNOS = `
  SELECT s.id, s.paciente_id, s.registrado_por, s.fecha,
         s.temperatura, s.presion_sistolica, s.presion_diastolica,
         s.frecuencia_cardiaca, s.frecuencia_respiratoria, s.saturacion_oxigeno,
         s.peso, s.talla, s.notas,
         u.nombre AS paciente_nombre,
         p.dpi AS paciente_dpi,
         ur.nombre AS registrado_por_nombre
  FROM signos_vitales s
  JOIN pacientes p ON p.id = s.paciente_id
  JOIN usuarios u ON u.id = p.usuario_id
  LEFT JOIN usuarios ur ON ur.id = s.registrado_por
`;

function num(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// GET /api/signos -> registro reciente de todos los pacientes (personal clínico)
router.get('/', requireRole('medico', 'enfermeria', 'administrador'), asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`${SELECT_SIGNOS} ORDER BY s.fecha DESC LIMIT 200`);
  res.json(rows);
}));

// GET /api/signos/mio -> el propio paciente consulta sus signos vitales
router.get('/mio', requireRole('paciente'), asyncHandler(async (req, res) => {
  const paciente = await pool.query('SELECT id FROM pacientes WHERE usuario_id = $1', [req.usuario.id]);
  if (!paciente.rows[0]) return res.json([]);
  const { rows } = await pool.query(`${SELECT_SIGNOS} WHERE s.paciente_id = $1 ORDER BY s.fecha DESC`, [
    paciente.rows[0].id,
  ]);
  res.json(rows);
}));

// GET /api/signos/paciente/:pacienteId -> historial de un paciente (personal clínico)
router.get('/paciente/:pacienteId', requireRole('medico', 'enfermeria', 'administrador'), asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`${SELECT_SIGNOS} WHERE s.paciente_id = $1 ORDER BY s.fecha DESC`, [
    req.params.pacienteId,
  ]);
  res.json(rows);
}));

// POST /api/signos -> enfermería o médico registran signos vitales
router.post('/', requireRole('medico', 'enfermeria'), asyncHandler(async (req, res) => {
  const {
    paciente_id,
    temperatura,
    presion_sistolica,
    presion_diastolica,
    frecuencia_cardiaca,
    frecuencia_respiratoria,
    saturacion_oxigeno,
    peso,
    talla,
    notas,
  } = req.body;

  if (!paciente_id) {
    return res.status(400).json({ error: 'Debes seleccionar un paciente.' });
  }

  const paciente = await pool.query('SELECT id FROM pacientes WHERE id = $1', [paciente_id]);
  if (!paciente.rows[0]) {
    return res.status(404).json({ error: 'Paciente no encontrado.' });
  }

  const valores = [
    num(temperatura),
    num(presion_sistolica),
    num(presion_diastolica),
    num(frecuencia_cardiaca),
    num(frecuencia_respiratoria),
    num(saturacion_oxigeno),
    num(peso),
    num(talla),
  ];

  if (valores.every((v) => v === null)) {
    return res.status(400).json({ error: 'Registra al menos un signo vital.' });
  }

  const info = await pool.query(
    `INSERT INTO signos_vitales
       (paciente_id, registrado_por, temperatura, presion_sistolica, presion_diastolica,
        frecuencia_cardiaca, frecuencia_respiratoria, saturacion_oxigeno, peso, talla, notas)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [paciente_id, req.usuario.id, ...valores, notas || null]
  );

  await pool.query(
    'INSERT INTO auditoria (usuario_id, accion, detalle) VALUES ($1, $2, $3)',
    [req.usuario.id, 'registrar_signos_vitales', `Signos ${info.rows[0].id} del paciente ${paciente_id}`]
  );

  res.status(201).json({ id: info.rows[0].id, mensaje: 'Signos vitales registrados correctamente.' });
}));

module.exports = router;
