const { Pool } = require('pg');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// --- Conexión a PostgreSQL --------------------------------------------
// Si existe DATABASE_URL (útil al desplegar en la nube) se usa esa cadena;
// de lo contrario se toman los datos de las variables PG* del archivo .env.
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT || '5432'),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || '',
        database: process.env.PGDATABASE || 'expedientes_hospital',
      }
);

// --- Ayudantes ---------------------------------------------------------
async function filas(sql, params = []) {
  const r = await pool.query(sql, params);
  return r.rows;
}

async function fila(sql, params = []) {
  const r = await pool.query(sql, params);
  return r.rows[0] ?? null;
}

// --- Esquema -----------------------------------------------------------
// Refleja el diagrama de clases del capítulo de arquitectura:
// Usuario (autenticación + rol / RBAC)
// Paciente 1---1 ExpedienteMedico
// ExpedienteMedico 1---N Consulta
// Medico 1---N Consulta
// Consulta 1---N Receta
// Medico/Paciente 1---N Cita

async function initDb() {
  await pool.query(`
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('paciente','medico','enfermeria','admision','administrador')),
  creado_en TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS pacientes (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  dpi TEXT,
  registro_medico TEXT,
  genero TEXT,
  fecha_nacimiento TEXT,
  telefono TEXT,
  direccion TEXT,
  tipo_sangre TEXT
);

CREATE TABLE IF NOT EXISTS medicos (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  colegiado TEXT,
  especialidad TEXT
);

CREATE TABLE IF NOT EXISTS expedientes (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL UNIQUE REFERENCES pacientes(id) ON DELETE CASCADE,
  antecedentes TEXT,
  alergias TEXT,
  creado_en TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
  actualizado_en TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS consultas (
  id SERIAL PRIMARY KEY,
  expediente_id INTEGER NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
  medico_id INTEGER NOT NULL REFERENCES medicos(id),
  fecha TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
  motivo TEXT,
  diagnostico TEXT,
  notas TEXT
);

CREATE TABLE IF NOT EXISTS recetas (
  id SERIAL PRIMARY KEY,
  consulta_id INTEGER NOT NULL REFERENCES consultas(id) ON DELETE CASCADE,
  medicamento TEXT NOT NULL,
  dosis TEXT,
  indicaciones TEXT
);

CREATE TABLE IF NOT EXISTS citas (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  medico_id INTEGER NOT NULL REFERENCES medicos(id),
  fecha TEXT NOT NULL,
  motivo TEXT,
  estado TEXT NOT NULL DEFAULT 'programada' CHECK (estado IN ('programada','atendida','cancelada')),
  creado_por INTEGER REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS disponibilidad_medico (
  id SERIAL PRIMARY KEY,
  medico_id INTEGER NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TEXT NOT NULL,
  hora_fin TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ordenes_laboratorio (
  id SERIAL PRIMARY KEY,
  expediente_id INTEGER NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
  medico_id INTEGER NOT NULL REFERENCES medicos(id),
  examen TEXT NOT NULL,
  indicaciones TEXT,
  estado TEXT NOT NULL DEFAULT 'solicitada' CHECK (estado IN ('solicitada','en_proceso','completada')),
  resultado TEXT,
  archivo_nombre TEXT,
  archivo_tipo TEXT,
  archivo_datos TEXT,
  fecha_solicitud TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
  fecha_resultado TEXT
);

CREATE TABLE IF NOT EXISTS signos_vitales (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  registrado_por INTEGER REFERENCES usuarios(id),
  fecha TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
  temperatura NUMERIC(4,1),
  presion_sistolica INTEGER,
  presion_diastolica INTEGER,
  frecuencia_cardiaca INTEGER,
  frecuencia_respiratoria INTEGER,
  saturacion_oxigeno INTEGER,
  peso NUMERIC(5,2),
  talla NUMERIC(5,2),
  notas TEXT
);

CREATE TABLE IF NOT EXISTS auditoria (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id),
  accion TEXT NOT NULL,
  detalle TEXT,
  fecha TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
);

ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS registro_medico TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS genero TEXT;
ALTER TABLE ordenes_laboratorio ADD COLUMN IF NOT EXISTS archivo_nombre TEXT;
ALTER TABLE ordenes_laboratorio ADD COLUMN IF NOT EXISTS archivo_tipo TEXT;
ALTER TABLE ordenes_laboratorio ADD COLUMN IF NOT EXISTS archivo_datos TEXT;
`);

  // Horario por defecto (lunes a viernes, mañana y tarde) para médicos sin disponibilidad.
  await pool.query(`
INSERT INTO disponibilidad_medico (medico_id, dia_semana, hora_inicio, hora_fin)
SELECT m.id, d.dia, t.ini, t.fin
FROM medicos m
CROSS JOIN (VALUES (1),(2),(3),(4),(5)) AS d(dia)
CROSS JOIN (VALUES ('08:00','12:00'),('14:00','17:00')) AS t(ini,fin)
WHERE NOT EXISTS (SELECT 1 FROM disponibilidad_medico dm WHERE dm.medico_id = m.id);
`);
}

module.exports = { pool, filas, fila, initDb };