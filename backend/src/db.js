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

CREATE TABLE IF NOT EXISTS auditoria (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id),
  accion TEXT NOT NULL,
  detalle TEXT,
  fecha TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
);
`);
}

module.exports = { pool, filas, fila, initDb };