// Crea usuarios y datos de demostración para poder iniciar sesión de inmediato
// con cada uno de los 5 roles definidos en la arquitectura del sistema.
const bcrypt = require('bcryptjs');
const { pool, initDb } = require('./db');

async function upsertUsuario({ nombre, correo, password, rol }) {
  const existente = await pool.query('SELECT id FROM usuarios WHERE correo = $1', [correo]);
  if (existente.rows[0]) return existente.rows[0].id;
  const hash = bcrypt.hashSync(password, 10);
  const info = await pool.query(
    'INSERT INTO usuarios (nombre, correo, password_hash, rol) VALUES ($1, $2, $3, $4) RETURNING id',
    [nombre, correo, hash, rol]
  );
  return info.rows[0].id;
}

async function main() {
  await initDb();
  console.log('Sembrando datos de demostración...\n');

  const adminId = await upsertUsuario({
    nombre: 'Ana Administradora',
    correo: 'admin@hospitalroosevelt.gt',
    password: 'Admin123!',
    rol: 'administrador',
  });

  const admisionId = await upsertUsuario({
    nombre: 'Carlos Admisión',
    correo: 'admision@hospitalroosevelt.gt',
    password: 'Admision123!',
    rol: 'admision',
  });

  const enfermeriaId = await upsertUsuario({
    nombre: 'Lucía Enfermera',
    correo: 'enfermeria@hospitalroosevelt.gt',
    password: 'Enfermeria123!',
    rol: 'enfermeria',
  });

  const medicoUsuarioId = await upsertUsuario({
    nombre: 'Dr. Mario Solís',
    correo: 'medico@hospitalroosevelt.gt',
    password: 'Medico123!',
    rol: 'medico',
  });

  let medico = await pool.query('SELECT id FROM medicos WHERE usuario_id = $1', [medicoUsuarioId]);
  let medicoId;
  if (!medico.rows[0]) {
    const info = await pool.query(
      'INSERT INTO medicos (usuario_id, colegiado, especialidad) VALUES ($1, $2, $3) RETURNING id',
      [medicoUsuarioId, '12345', 'Medicina Interna']
    );
    medicoId = info.rows[0].id;
  } else {
    medicoId = medico.rows[0].id;
  }

  const pacienteUsuarioId = await upsertUsuario({
    nombre: 'José Pérez',
    correo: 'paciente@hospitalroosevelt.gt',
    password: 'Paciente123!',
    rol: 'paciente',
  });

  let paciente = await pool.query('SELECT id FROM pacientes WHERE usuario_id = $1', [pacienteUsuarioId]);
  let pacienteId;
  if (!paciente.rows[0]) {
    const info = await pool.query(
      'INSERT INTO pacientes (usuario_id, dpi, fecha_nacimiento, telefono, direccion, tipo_sangre) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [pacienteUsuarioId, '1234567890101', '1990-05-14', '5555-1234', 'Zona 1, Guatemala', 'O+']
    );
    pacienteId = info.rows[0].id;
  } else {
    pacienteId = paciente.rows[0].id;
  }

  let expediente = await pool.query('SELECT id FROM expedientes WHERE paciente_id = $1', [pacienteId]);
  let expedienteId;
  if (!expediente.rows[0]) {
    const info = await pool.query(
      'INSERT INTO expedientes (paciente_id, antecedentes, alergias) VALUES ($1, $2, $3) RETURNING id',
      [pacienteId, 'Hipertensión controlada.', 'Penicilina']
    );
    expedienteId = info.rows[0].id;
  } else {
    expedienteId = expediente.rows[0].id;
  }

  const consultaExistente = await pool.query('SELECT id FROM consultas WHERE expediente_id = $1', [expedienteId]);
  if (!consultaExistente.rows[0]) {
    const info = await pool.query(
      'INSERT INTO consultas (expediente_id, medico_id, motivo, diagnostico, notas) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [expedienteId, medicoId, 'Dolor abdominal', 'Gastritis leve', 'Se recomienda dieta blanda y control en 15 días.']
    );
    const consultaId = info.rows[0].id;

    await pool.query(
      'INSERT INTO recetas (consulta_id, medicamento, dosis, indicaciones) VALUES ($1, $2, $3, $4)',
      [consultaId, 'Omeprazol 20mg', '1 cápsula cada 24h', 'Tomar en ayunas por 14 días']
    );
  }

  const citaExistente = await pool.query('SELECT id FROM citas WHERE paciente_id = $1', [pacienteId]);
  if (!citaExistente.rows[0]) {
    const enUnaSemana = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await pool.query(
      'INSERT INTO citas (paciente_id, medico_id, fecha, motivo, estado, creado_por) VALUES ($1, $2, $3, $4, $5, $6)',
      [pacienteId, medicoId, enUnaSemana, 'Control de gastritis', 'programada', admisionId]
    );
  }

  console.log('Usuarios de prueba creados:');
  console.table([
    { rol: 'administrador', correo: 'admin@hospitalroosevelt.gt', password: 'Admin123!' },
    { rol: 'admision', correo: 'admision@hospitalroosevelt.gt', password: 'Admision123!' },
    { rol: 'enfermeria', correo: 'enfermeria@hospitalroosevelt.gt', password: 'Enfermeria123!' },
    { rol: 'medico', correo: 'medico@hospitalroosevelt.gt', password: 'Medico123!' },
    { rol: 'paciente', correo: 'paciente@hospitalroosevelt.gt', password: 'Paciente123!' },
  ]);

  console.log('\nListo. Ya puedes iniciar sesión con cualquiera de estos usuarios.');
  await pool.end();
}

main().catch((err) => {
  console.error('Error al sembrar la base de datos:', err);
  process.exit(1);
});