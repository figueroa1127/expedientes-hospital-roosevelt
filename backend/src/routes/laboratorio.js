const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();
router.use(requireAuth);

const ESTADOS_VALIDOS = ['solicitada', 'en_proceso', 'completada'];

const SELECT_ORDENES = `
  SELECT o.id, o.examen, o.indicaciones, o.estado, o.resultado,
         o.fecha_solicitud, o.fecha_resultado,
         o.archivo_nombre, o.archivo_tipo,
         o.expediente_id, e.paciente_id,
         up.nombre AS paciente_nombre,
         um.nombre AS medico_nombre, me.especialidad
  FROM ordenes_laboratorio o
  JOIN expedientes e ON e.id = o.expediente_id
  JOIN pacientes p ON p.id = e.paciente_id
  JOIN usuarios up ON up.id = p.usuario_id
  JOIN medicos me ON me.id = o.medico_id
  JOIN usuarios um ON um.id = me.usuario_id
`;

const TIPOS_ARCHIVO = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
const MAX_ARCHIVO = 7 * 1024 * 1024; // ~7 MB en base64

// GET /api/laboratorio -> bandeja de trabajo del laboratorio (personal clínico)
router.get('/', requireRole('medico', 'enfermeria', 'administrador'), asyncHandler(async (req, res) => {
  const ordenes = await pool.query(`${SELECT_ORDENES} ORDER BY o.fecha_solicitud DESC`);
  res.json(ordenes.rows);
}));

// PUT /api/laboratorio/:id -> registrar resultado, subir archivo y/o cambiar estado
router.put('/:id', requireRole('medico', 'enfermeria', 'administrador'), asyncHandler(async (req, res) => {
  const { estado, resultado, archivo } = req.body;

  const actual = await pool.query('SELECT * FROM ordenes_laboratorio WHERE id = $1', [req.params.id]);
  if (!actual.rows[0]) return res.status(404).json({ error: 'Orden de laboratorio no encontrada.' });

  let estadoFinal = estado ?? actual.rows[0].estado;
  if (!ESTADOS_VALIDOS.includes(estadoFinal)) {
    return res.status(400).json({ error: 'Estado inválido.' });
  }

  const resultadoFinal = resultado ?? actual.rows[0].resultado;

  // Archivo adjunto (PDF, PNG o JPG) guardado en la base de datos.
  let archivoNombre = actual.rows[0].archivo_nombre;
  let archivoTipo = actual.rows[0].archivo_tipo;
  let archivoDatos = actual.rows[0].archivo_datos;

  if (archivo && archivo.datos) {
    if (!TIPOS_ARCHIVO.includes(archivo.tipo)) {
      return res.status(400).json({ error: 'Formato no permitido. Usa PDF, PNG o JPG.' });
    }
    if (String(archivo.datos).length > MAX_ARCHIVO) {
      return res.status(400).json({ error: 'El archivo es demasiado grande (máximo 5 MB).' });
    }
    archivoNombre = archivo.nombre || 'resultado';
    archivoTipo = archivo.tipo;
    archivoDatos = archivo.datos;
  }

  // Si hay resultado o archivo y la orden seguía pendiente, se marca como completada.
  if ((resultado && resultado.trim()) || (archivo && archivo.datos)) {
    if (estado === undefined) estadoFinal = 'completada';
  }

  const fechaResultado =
    estadoFinal === 'completada'
      ? actual.rows[0].fecha_resultado || toStamp()
      : null;

  await pool.query(
    `UPDATE ordenes_laboratorio
       SET estado = $1, resultado = $2, archivo_nombre = $3, archivo_tipo = $4,
           archivo_datos = $5, fecha_resultado = $6
     WHERE id = $7`,
    [estadoFinal, resultadoFinal || null, archivoNombre, archivoTipo, archivoDatos, fechaResultado, req.params.id]
  );

  await pool.query(
    'INSERT INTO auditoria (usuario_id, accion, detalle) VALUES ($1, $2, $3)',
    [req.usuario.id, 'actualizar_orden_laboratorio', `Orden ${req.params.id} -> ${estadoFinal}`]
  );

  res.json({ mensaje: 'Orden de laboratorio actualizada.', estado: estadoFinal });
}));

// GET /api/laboratorio/:id/archivo -> descargar el archivo adjunto de una orden
router.get('/:id/archivo', requireRole('medico', 'enfermeria', 'administrador'), asyncHandler(async (req, res) => {
  const r = await pool.query(
    'SELECT archivo_nombre, archivo_tipo, archivo_datos FROM ordenes_laboratorio WHERE id = $1',
    [req.params.id]
  );
  if (!r.rows[0] || !r.rows[0].archivo_datos) {
    return res.status(404).json({ error: 'Esta orden no tiene un archivo adjunto.' });
  }
  res.json({ nombre: r.rows[0].archivo_nombre, tipo: r.rows[0].archivo_tipo, datos: r.rows[0].archivo_datos });
}));

function toStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

module.exports = router;
