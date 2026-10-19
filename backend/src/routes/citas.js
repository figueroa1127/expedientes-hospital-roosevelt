const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();
router.use(requireAuth);

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const PASO_CUPO_MIN = 30;

function fechaHoy() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function horaValida(t) {
  return typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

// Genera cupos de 30 minutos entre hora_inicio y hora_fin (fin exclusivo).
function generarCupos(inicio, fin) {
  const [hi, mi] = inicio.split(':').map(Number);
  const [hf, mf] = fin.split(':').map(Number);
  const finMin = hf * 60 + mf;
  const cupos = [];
  for (let t = hi * 60 + mi; t + PASO_CUPO_MIN <= finMin; t += PASO_CUPO_MIN) {
    const h = String(Math.floor(t / 60)).padStart(2, '0');
    const m = String(t % 60).padStart(2, '0');
    cupos.push(`${h}:${m}`);
  }
  return cupos;
}

// Verifica que el horario pedido esté dentro de la disponibilidad y libre de choques.
async function validarCupo(medicoId, fecha, excluirId) {
  const fechaDia = String(fecha).slice(0, 10);
  const hora = String(fecha).replace('T', ' ').slice(11, 16);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaDia) || !horaValida(hora)) {
    return 'La fecha y hora no tienen un formato válido.';
  }
  const dia = new Date(`${fechaDia}T00:00:00`).getDay();
  const rangos = await pool.query(
    'SELECT hora_inicio, hora_fin FROM disponibilidad_medico WHERE medico_id = $1 AND dia_semana = $2',
    [Number(medicoId), dia]
  );
  const cupos = [];
  for (const r of rangos.rows) cupos.push(...generarCupos(r.hora_inicio, r.hora_fin));
  if (!cupos.includes(hora)) {
    return 'El médico no tiene disponibilidad en ese horario.';
  }
  const params = [Number(medicoId), fechaDia, hora];
  let sql = `SELECT id FROM citas WHERE medico_id = $1 AND estado <> 'cancelada'
             AND substr(fecha, 1, 10) = $2 AND substr(replace(fecha, 'T', ' '), 12, 5) = $3`;
  if (excluirId) {
    params.push(Number(excluirId));
    sql += ' AND id <> $4';
  }
  const ocupado = await pool.query(sql, params);
  if (ocupado.rows[0]) return 'Ese horario ya está ocupado. Elige otra hora u otra fecha.';
  return null;
}

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
    `SELECT m.id, m.usuario_id, u.nombre, m.especialidad FROM medicos m JOIN usuarios u ON u.id = m.usuario_id`
  );
  res.json(medicos.rows);
}));

// Resuelve el medico_id a usar: el propio si es médico, o el indicado si es administrador.
async function resolverMedico(req, indicado) {
  if (req.usuario.rol === 'medico') {
    const m = await pool.query('SELECT id FROM medicos WHERE usuario_id = $1', [req.usuario.id]);
    return m.rows[0] ? m.rows[0].id : null;
  }
  return indicado ? Number(indicado) : null;
}

// GET /api/citas/mi-horario -> horario semanal del médico (o de uno indicado por administrador)
router.get('/mi-horario', asyncHandler(async (req, res) => {
  const medicoId = await resolverMedico(req, req.query.medicoId);
  if (!medicoId) return res.status(400).json({ error: 'Médico no válido.' });
  const franjas = await pool.query(
    'SELECT id, dia_semana, hora_inicio, hora_fin FROM disponibilidad_medico WHERE medico_id = $1 ORDER BY dia_semana, hora_inicio',
    [medicoId]
  );
  res.json(franjas.rows);
}));

// PUT /api/citas/mi-horario -> reemplaza el horario semanal del médico
router.put('/mi-horario', requireRole('medico', 'administrador'), asyncHandler(async (req, res) => {
  const medicoId = await resolverMedico(req, req.body.medico_id);
  if (!medicoId) return res.status(400).json({ error: 'Médico no válido.' });

  const franjas = Array.isArray(req.body.franjas) ? req.body.franjas : [];
  for (const f of franjas) {
    const dia = Number(f.dia_semana);
    if (!Number.isInteger(dia) || dia < 0 || dia > 6) {
      return res.status(400).json({ error: 'Día de la semana inválido.' });
    }
    if (!horaValida(f.hora_inicio) || !horaValida(f.hora_fin) || f.hora_inicio >= f.hora_fin) {
      return res.status(400).json({ error: 'Las horas deben tener formato HH:MM y el inicio ser menor que el fin.' });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM disponibilidad_medico WHERE medico_id = $1', [medicoId]);
    for (const f of franjas) {
      await client.query(
        'INSERT INTO disponibilidad_medico (medico_id, dia_semana, hora_inicio, hora_fin) VALUES ($1, $2, $3, $4)',
        [medicoId, Number(f.dia_semana), f.hora_inicio, f.hora_fin]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  await pool.query(
    'INSERT INTO auditoria (usuario_id, accion, detalle) VALUES ($1, $2, $3)',
    [req.usuario.id, 'actualizar_horario', `Médico ${medicoId}: ${franjas.length} franja(s)`]
  );

  res.json({ mensaje: 'Horario guardado correctamente.' });
}));

// GET /api/citas/disponibilidad/:medicoId?fecha=YYYY-MM-DD -> cupos libres de 30 min
router.get('/disponibilidad/:medicoId', asyncHandler(async (req, res) => {
  const { fecha, excluir } = req.query;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) {
    return res.status(400).json({ error: 'Fecha inválida.' });
  }
  const dia = new Date(`${fecha}T00:00:00`).getDay();

  const rangos = await pool.query(
    'SELECT hora_inicio, hora_fin FROM disponibilidad_medico WHERE medico_id = $1 AND dia_semana = $2 ORDER BY hora_inicio',
    [Number(req.params.medicoId), dia]
  );

  const params = [Number(req.params.medicoId), fecha];
  let sql = `SELECT fecha FROM citas WHERE medico_id = $1 AND estado <> 'cancelada' AND substr(fecha, 1, 10) = $2`;
  if (excluir) {
    params.push(Number(excluir));
    sql += ' AND id <> $3';
  }
  const ocupadas = await pool.query(sql, params);
  const ocupados = new Set(
    ocupadas.rows.map((r) => String(r.fecha).replace('T', ' ').slice(11, 16))
  );

  let cupos = [];
  for (const r of rangos.rows) cupos.push(...generarCupos(r.hora_inicio, r.hora_fin));
  cupos = [...new Set(cupos)];

  if (fecha === fechaHoy()) {
    const ahora = new Date();
    const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
    cupos = cupos.filter((c) => {
      const [h, m] = c.split(':').map(Number);
      return h * 60 + m > minAhora;
    });
  }

  // `detalle` incluye todos los cupos del día marcando los ya ocupados, para que
  // la interfaz pueda avisar que ese horario no está disponible.
  const detalle = cupos.map((c) => ({ hora: c, disponible: !ocupados.has(c) }));
  const libres = cupos.filter((c) => !ocupados.has(c));

  res.json({ fecha, dia: DIAS[dia], cupos: libres, detalle });
}));

// POST /api/citas -> agendar una cita (admisión, administrador o médico)
router.post('/', requireRole('admision', 'administrador', 'medico'), asyncHandler(async (req, res) => {
  const { medico_id, fecha, motivo, paciente_id } = req.body;
  const pacienteIdFinal = paciente_id;

  if (!pacienteIdFinal || !medico_id || !fecha) {
    return res.status(400).json({ error: 'Paciente, médico y fecha son obligatorios.' });
  }

  const errorCupo = await validarCupo(medico_id, fecha);
  if (errorCupo) return res.status(409).json({ error: errorCupo });

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

// PUT /api/citas/:id -> reagendar una cita (fecha, médico y motivo). Admisión y administrador.
router.put('/:id', requireRole('admision', 'administrador'), asyncHandler(async (req, res) => {
  const { medico_id, fecha, motivo } = req.body;

  const cita = await pool.query('SELECT * FROM citas WHERE id = $1', [req.params.id]);
  if (!cita.rows[0]) return res.status(404).json({ error: 'Cita no encontrada.' });

  const medicoFinal = medico_id || cita.rows[0].medico_id;
  const fechaFinal = fecha || cita.rows[0].fecha;
  const motivoFinal = motivo === undefined ? cita.rows[0].motivo : motivo;

  if (medico_id || fecha) {
    const errorCupo = await validarCupo(medicoFinal, fechaFinal, req.params.id);
    if (errorCupo) return res.status(409).json({ error: errorCupo });
  }

  await pool.query('UPDATE citas SET medico_id = $1, fecha = $2, motivo = $3 WHERE id = $4', [
    medicoFinal,
    fechaFinal,
    motivoFinal,
    req.params.id,
  ]);

  await pool.query(
    'INSERT INTO auditoria (usuario_id, accion, detalle) VALUES ($1, $2, $3)',
    [req.usuario.id, 'reagendar_cita', `Cita ${req.params.id} reagendada`]
  );

  res.json({ mensaje: 'Cita reagendada correctamente.' });
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