const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();
router.use(requireAuth);

// GET /api/pacientes -> personal clínico y administrativo consulta el listado
router.get('/', requireRole('medico', 'enfermeria', 'admision', 'administrador'), asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.id, u.nombre, u.correo, p.dpi, p.fecha_nacimiento, p.telefono, p.tipo_sangre
     FROM pacientes p JOIN usuarios u ON u.id = p.usuario_id
     ORDER BY u.nombre`
  );
  res.json(rows);
}));

// PUT /api/pacientes/:id -> completar datos demográficos (admisión o administrador)
router.put('/:id', requireRole('admision', 'administrador'), asyncHandler(async (req, res) => {
  const { dpi, fecha_nacimiento, telefono, direccion, tipo_sangre } = req.body;
  const paciente = await pool.query('SELECT * FROM pacientes WHERE id = $1', [req.params.id]);
  if (!paciente.rows[0]) return res.status(404).json({ error: 'Paciente no encontrado.' });

  await pool.query(
    `UPDATE pacientes SET dpi = $1, fecha_nacimiento = $2, telefono = $3, direccion = $4, tipo_sangre = $5
     WHERE id = $6`,
    [dpi, fecha_nacimiento, telefono, direccion, tipo_sangre, req.params.id]
  );

  res.json({ mensaje: 'Datos del paciente actualizados.' });
}));

module.exports = router;