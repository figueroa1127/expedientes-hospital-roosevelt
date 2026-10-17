const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../asyncHandler');

const router = express.Router();
router.use(requireAuth);

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Devuelve las últimas 6 etiquetas de mes en formato { anio, mes } en orden cronológico.
function ultimosSeisMeses() {
  const lista = [];
  const hoy = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    lista.push({ anio: d.getFullYear(), mes: d.getMonth() + 1 });
  }
  return lista;
}

function bucketEdad(fechaNacimiento) {
  if (!fechaNacimiento) return 'Sin dato';
  const nacimiento = new Date(fechaNacimiento);
  if (Number.isNaN(nacimiento.getTime())) return 'Sin dato';
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  if (edad < 0) return 'Sin dato';
  if (edad <= 12) return 'Niñez (0-12)';
  if (edad <= 17) return 'Adolescencia (13-17)';
  if (edad <= 29) return 'Juventud (18-29)';
  if (edad <= 44) return 'Adultez joven (30-44)';
  if (edad <= 59) return 'Adultez (45-59)';
  return 'Adulto mayor (60+)';
}

// GET /api/reportes/resumen -> estadísticas para el panel de control
router.get('/resumen', requireRole('medico', 'enfermeria', 'admision', 'administrador'), asyncHandler(async (req, res) => {
  const [pacientes, citas, consultas, ordenes] = await Promise.all([
    pool.query('SELECT id, tipo_sangre, fecha_nacimiento FROM pacientes'),
    pool.query('SELECT id, estado, fecha FROM citas'),
    pool.query('SELECT id, fecha, diagnostico FROM consultas'),
    pool.query("SELECT id, estado FROM ordenes_laboratorio"),
  ]);

  // Citas por estado
  const estados = ['programada', 'atendida', 'cancelada'];
  const citasPorEstado = estados.map((estado) => ({
    etiqueta: estado,
    valor: citas.rows.filter((c) => c.estado === estado).length,
  }));

  // Consultas por mes (últimos 6 meses)
  const consultasPorMes = ultimosSeisMeses().map(({ anio, mes }) => {
    const clave = `${anio}-${String(mes).padStart(2, '0')}`;
    return {
      etiqueta: `${MESES[mes - 1]} ${String(anio).slice(2)}`,
      valor: consultas.rows.filter((c) => (c.fecha || '').startsWith(clave)).length,
    };
  });

  // Diagnósticos más frecuentes (top 5)
  const conteoDiagnosticos = {};
  for (const c of consultas.rows) {
    const d = (c.diagnostico || '').trim();
    if (!d) continue;
    const clave = d.toLowerCase();
    conteoDiagnosticos[clave] = (conteoDiagnosticos[clave] || { etiqueta: d, valor: 0 });
    conteoDiagnosticos[clave].valor++;
  }
  const diagnosticosFrecuentes = Object.values(conteoDiagnosticos)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);

  // Distribución por tipo de sangre
  const tiposOrden = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
  const conteoGrupos = {};
  for (const p of pacientes.rows) {
    const t = (p.tipo_sangre || 'Sin dato').toUpperCase().replace(/\s/g, '');
    const etiqueta = tiposOrden.includes(t) ? t : 'Sin dato';
    conteoGrupos[etiqueta] = (conteoGrupos[etiqueta] || 0) + 1;
  }
  const tiposSangre = Object.entries(conteoGrupos)
    .map(([etiqueta, valor]) => ({ etiqueta, valor }))
    .sort((a, b) => b.valor - a.valor);

  // Grupos de edad
  const conteoEdad = {};
  for (const p of pacientes.rows) {
    const grupo = bucketEdad(p.fecha_nacimiento);
    conteoEdad[grupo] = (conteoEdad[grupo] || 0) + 1;
  }
  const ordenEdad = [
    'Niñez (0-12)', 'Adolescencia (13-17)', 'Juventud (18-29)',
    'Adultez joven (30-44)', 'Adultez (45-59)', 'Adulto mayor (60+)', 'Sin dato',
  ];
  const gruposEdad = ordenEdad
    .filter((g) => conteoEdad[g])
    .map((g) => ({ etiqueta: g, valor: conteoEdad[g] }));

  res.json({
    totales: {
      pacientes: pacientes.rowCount,
      consultas: consultas.rowCount,
      citas: citas.rowCount,
      citasProgramadas: citas.rows.filter((c) => c.estado === 'programada').length,
      ordenesPendientes: ordenes.rows.filter((o) => o.estado !== 'completada').length,
    },
    citasPorEstado,
    consultasPorMes,
    diagnosticosFrecuentes,
    tiposSangre,
    gruposEdad,
  });
}));

module.exports = router;
