const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();
router.use(requireAuth);

async function registrarAuditoria(usuario_id, accion, detalle, ejecutor) {
  const con = ejecutor || pool;
  await con.query(
    'INSERT INTO auditoria (usuario_id, accion, detalle) VALUES ($1, $2, $3)',
    [usuario_id, accion, detalle || null]
  );
}

async function cargarExpedienteCompleto(expedienteId) {
  const ex = await pool.query('SELECT * FROM expedientes WHERE id = $1', [expedienteId]);
  const expediente = ex.rows[0];
  if (!expediente) return null;

  const cs = await pool.query(
    `SELECT c.*, u.nombre AS medico_nombre, m.especialidad
     FROM consultas c
     JOIN medicos m ON m.id = c.medico_id
     JOIN usuarios u ON u.id = m.usuario_id
     WHERE c.expediente_id = $1
     ORDER BY c.fecha DESC`,
    [expedienteId]
  );

  const consultas = [];
  for (const c of cs.rows) {
    const recs = await pool.query('SELECT * FROM recetas WHERE consulta_id = $1', [c.id]);
    consultas.push({ ...c, recetas: recs.rows });
  }

  return { ...expediente, consultas };
}

// GET /api/expedientes/mio -> el propio paciente ve su expediente
router.get('/mio', requireRole('paciente'), asyncHandler(async (req, res) => {
  const paciente = await pool.query('SELECT * FROM pacientes WHERE usuario_id = $1', [req.usuario.id]);
  if (!paciente.rows[0]) return res.status(404).json({ error: 'No se encontró tu ficha de paciente.' });

  const expediente = await pool.query('SELECT id FROM expedientes WHERE paciente_id = $1', [paciente.rows[0].id]);
  if (!expediente.rows[0]) return res.json(null);

  await registrarAuditoria(req.usuario.id, 'ver_expediente_propio', `Expediente ${expediente.rows[0].id}`);
  res.json(await cargarExpedienteCompleto(expediente.rows[0].id));
}));

// GET /api/expedientes/paciente/:pacienteId -> personal clínico consulta el historial
router.get('/paciente/:pacienteId', requireRole('medico', 'enfermeria', 'administrador'), asyncHandler(async (req, res) => {
  let expediente = await pool.query('SELECT id FROM expedientes WHERE paciente_id = $1', [req.params.pacienteId]);

  if (!expediente.rows[0]) {
    const info = await pool.query(
      'INSERT INTO expedientes (paciente_id) VALUES ($1) RETURNING id',
      [req.params.pacienteId]
    );
    expediente = { rows: [{ id: info.rows[0].id }] };
  }

  await registrarAuditoria(
    req.usuario.id,
    'ver_expediente',
    `Expediente ${expediente.rows[0].id} del paciente ${req.params.pacienteId}`
  );
  res.json(await cargarExpedienteCompleto(expediente.rows[0].id));
}));

// POST /api/expedientes/:expedienteId/consultas -> el médico agrega una nueva consulta
router.post('/:expedienteId/consultas', requireRole('medico'), asyncHandler(async (req, res) => {
  const { motivo, diagnostico, notas, recetas } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const medico = await client.query('SELECT id FROM medicos WHERE usuario_id = $1', [req.usuario.id]);
    if (!medico.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No se encontró tu ficha médica.' });
    }

    const info = await client.query(
      'INSERT INTO consultas (expediente_id, medico_id, motivo, diagnostico, notas) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [req.params.expedienteId, medico.rows[0].id, motivo, diagnostico, notas]
    );
    const consultaId = info.rows[0].id;

    if (Array.isArray(recetas)) {
      for (const r of recetas) {
        if (r.medicamento) {
          await client.query(
            'INSERT INTO recetas (consulta_id, medicamento, dosis, indicaciones) VALUES ($1, $2, $3, $4)',
            [consultaId, r.medicamento, r.dosis, r.indicaciones]
          );
        }
      }
    }

    await client.query(
      `UPDATE expedientes SET actualizado_en = to_char(now(), 'YYYY-MM-DD HH24:MI:SS') WHERE id = $1`,
      [req.params.expedienteId]
    );

    await client.query(
      'INSERT INTO auditoria (usuario_id, accion, detalle) VALUES ($1, $2, $3)',
      [req.usuario.id, 'crear_consulta', `Consulta ${consultaId} en expediente ${req.params.expedienteId}`]
    );

    await client.query('COMMIT');
    res.status(201).json({ mensaje: 'Consulta registrada correctamente.', consultaId });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// PUT /api/expedientes/:expedienteId -> actualizar antecedentes / alergias
router.put('/:expedienteId', requireRole('medico', 'enfermeria', 'administrador'), asyncHandler(async (req, res) => {
  const { antecedentes, alergias } = req.body;
  await pool.query(
    `UPDATE expedientes SET antecedentes = $1, alergias = $2,
        actualizado_en = to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
     WHERE id = $3`,
    [antecedentes, alergias, req.params.expedienteId]
  );

  await registrarAuditoria(req.usuario.id, 'actualizar_expediente', `Expediente ${req.params.expedienteId}`);
  res.json({ mensaje: 'Expediente actualizado.' });
}));

module.exports = router;