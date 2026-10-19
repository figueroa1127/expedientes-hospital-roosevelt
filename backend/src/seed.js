// Crea usuarios y datos de demostración para poder iniciar sesión de inmediato
// con cada uno de los 5 roles definidos en la arquitectura del sistema,
// además de una lista de pacientes de ejemplo con expediente, consultas,
// citas y órdenes de laboratorio para poblar el panel de control.
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

function pad(n) {
  return String(n).padStart(2, '0');
}

// Fecha con formato 'YYYY-MM-DD HH24:MI:SS' desplazada N meses hacia atrás.
function haceMeses(n, dia = 15) {
  const hoy = new Date();
  const d = new Date(hoy.getFullYear(), hoy.getMonth() - n, dia, 10, 30, 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

// Fecha relativa a hoy en días (negativo = pasado, positivo = futuro), en ISO.
function enDias(n) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();
}

async function crearPacienteDemo(datos, medicoId, admisionId) {
  const usuarioId = await upsertUsuario({
    nombre: datos.nombre,
    correo: datos.correo,
    password: datos.password,
    rol: 'paciente',
  });

  let paciente = await pool.query('SELECT id FROM pacientes WHERE usuario_id = $1', [usuarioId]);
  let pacienteId;
  if (paciente.rows[0]) {
    pacienteId = paciente.rows[0].id;
  } else {
    const info = await pool.query(
      'INSERT INTO pacientes (usuario_id, dpi, fecha_nacimiento, telefono, direccion, tipo_sangre) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [usuarioId, datos.dpi, datos.fecha_nacimiento, datos.telefono, datos.direccion, datos.tipo_sangre]
    );
    pacienteId = info.rows[0].id;
  }

  let expediente = await pool.query('SELECT id FROM expedientes WHERE paciente_id = $1', [pacienteId]);
  let expedienteId;
  if (expediente.rows[0]) {
    expedienteId = expediente.rows[0].id;
  } else {
    const info = await pool.query(
      'INSERT INTO expedientes (paciente_id, antecedentes, alergias) VALUES ($1, $2, $3) RETURNING id',
      [pacienteId, datos.antecedentes, datos.alergias]
    );
    expedienteId = info.rows[0].id;
  }

  // Consultas (con su receta) repartidas en los últimos meses.
  const hayConsulta = await pool.query('SELECT id FROM consultas WHERE expediente_id = $1', [expedienteId]);
  if (!hayConsulta.rows[0] && datos.consultas) {
    for (const c of datos.consultas) {
      const info = await pool.query(
        'INSERT INTO consultas (expediente_id, medico_id, fecha, motivo, diagnostico, notas) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [expedienteId, medicoId, haceMeses(c.mesesAtras ?? 0), c.motivo, c.diagnostico, c.notas || null]
      );
      if (c.receta) {
        await pool.query(
          'INSERT INTO recetas (consulta_id, medicamento, dosis, indicaciones) VALUES ($1, $2, $3, $4)',
          [info.rows[0].id, c.receta.medicamento, c.receta.dosis, c.receta.indicaciones]
        );
      }
    }
  }

  // Citas.
  const hayCita = await pool.query('SELECT id FROM citas WHERE paciente_id = $1', [pacienteId]);
  if (!hayCita.rows[0] && datos.citas) {
    for (const cita of datos.citas) {
      await pool.query(
        'INSERT INTO citas (paciente_id, medico_id, fecha, motivo, estado, creado_por) VALUES ($1, $2, $3, $4, $5, $6)',
        [pacienteId, medicoId, enDias(cita.dias), cita.motivo, cita.estado, admisionId]
      );
    }
  }

  // Órdenes de laboratorio.
  const hayOrden = await pool.query('SELECT id FROM ordenes_laboratorio WHERE expediente_id = $1', [expedienteId]);
  if (!hayOrden.rows[0] && datos.ordenes) {
    for (const o of datos.ordenes) {
      await pool.query(
        'INSERT INTO ordenes_laboratorio (expediente_id, medico_id, examen, indicaciones, estado, resultado) VALUES ($1, $2, $3, $4, $5, $6)',
        [expedienteId, medicoId, o.examen, o.indicaciones || null, o.estado || 'solicitada', o.resultado || null]
      );
    }
  }

  return pacienteId;
}

const DEMO_PACIENTES = [
  {
    nombre: 'José Pérez',
    correo: 'paciente@hospitalroosevelt.gt',
    password: 'Paciente123!',
    dpi: '1234567890101',
    fecha_nacimiento: '1990-05-14',
    telefono: '5555-1234',
    direccion: 'Zona 1, Guatemala',
    tipo_sangre: 'O+',
    antecedentes: 'Hipertensión controlada.',
    alergias: 'Penicilina',
    consultas: [
      {
        motivo: 'Dolor abdominal',
        diagnostico: 'Gastritis leve',
        notas: 'Se recomienda dieta blanda y control en 15 días.',
        mesesAtras: 1,
        receta: {
          medicamento: 'Omeprazol 20mg',
          dosis: '1 cápsula cada 24h',
          indicaciones: 'Tomar en ayunas por 14 días',
        },
      },
    ],
    citas: [{ motivo: 'Control de gastritis', estado: 'programada', dias: 7 }],
    ordenes: [
      {
        examen: 'Hemograma completo',
        indicaciones: 'En ayunas',
        estado: 'completada',
        resultado: 'Valores dentro del rango normal.',
      },
    ],
  },
  {
    nombre: 'María López',
    correo: 'maria.lopez@hospitalroosevelt.gt',
    password: 'Paciente123!',
    dpi: '2345678900102',
    fecha_nacimiento: '1985-03-22',
    telefono: '5555-2201',
    direccion: 'Zona 5, Guatemala',
    tipo_sangre: 'O-',
    antecedentes: 'Diabetes mellitus tipo 2.',
    alergias: 'Sulfonamidas',
    consultas: [
      {
        motivo: 'Control de glucosa',
        diagnostico: 'Diabetes mellitus tipo 2',
        notas: 'Se ajusta tratamiento y se solicita control mensual.',
        mesesAtras: 2,
        receta: {
          medicamento: 'Metformina 850mg',
          dosis: '1 tableta cada 12h',
          indicaciones: 'Tomar con las comidas',
        },
      },
    ],
    citas: [{ motivo: 'Control de diabetes', estado: 'atendida', dias: -20 }],
    ordenes: [
      {
        examen: 'Glucosa en ayunas',
        indicaciones: 'Ayuno de 8 horas',
        estado: 'completada',
        resultado: '142 mg/dL (ligeramente elevada).',
      },
    ],
  },
  {
    nombre: 'Pedro Ramírez',
    correo: 'pedro.ramirez@hospitalroosevelt.gt',
    password: 'Paciente123!',
    dpi: '3456789000103',
    fecha_nacimiento: '1978-11-09',
    telefono: '5555-3312',
    direccion: 'Mixco, Guatemala',
    tipo_sangre: 'A+',
    antecedentes: 'Asma bronquial.',
    alergias: 'Ninguna',
    consultas: [
      {
        motivo: 'Dificultad para respirar',
        diagnostico: 'Asma bronquial',
        notas: 'Uso de inhalador de rescate según necesidad.',
        mesesAtras: 3,
      },
    ],
    citas: [{ motivo: 'Control de asma', estado: 'programada', dias: 12 }],
    ordenes: [{ examen: 'Radiografía de tórax', indicaciones: 'Traer placa anterior', estado: 'en_proceso' }],
  },
  {
    nombre: 'Ana Lucía Sac',
    correo: 'ana.sac@hospitalroosevelt.gt',
    password: 'Paciente123!',
    dpi: '4567890100104',
    fecha_nacimiento: '2001-07-30',
    telefono: '5555-4488',
    direccion: 'Villa Nueva, Guatemala',
    tipo_sangre: 'B+',
    antecedentes: 'Ninguno.',
    alergias: 'Penicilina',
    consultas: [{ motivo: 'Cefalea', diagnostico: 'Migraña', notas: 'Se sugiere hidratación y descanso.', mesesAtras: 0 }],
    citas: [{ motivo: 'Consulta general', estado: 'programada', dias: 3 }],
  },
  {
    nombre: 'Luis Choc',
    correo: 'luis.choc@hospitalroosevelt.gt',
    password: 'Paciente123!',
    dpi: '5678901000105',
    fecha_nacimiento: '1965-01-15',
    telefono: '5555-7788',
    direccion: 'Zona 7, Guatemala',
    tipo_sangre: 'AB+',
    antecedentes: 'Hipertensión arterial.',
    alergias: 'Ninguna',
    consultas: [
      {
        motivo: 'Presión arterial elevada',
        diagnostico: 'Hipertensión arterial',
        notas: 'Control diario de presión en casa.',
        mesesAtras: 4,
        receta: {
          medicamento: 'Losartán 50mg',
          dosis: '1 tableta cada 24h',
          indicaciones: 'Tomar a la misma hora todos los días',
        },
      },
    ],
    citas: [{ motivo: 'Control de presión', estado: 'atendida', dias: -45 }],
    ordenes: [
      {
        examen: 'Perfil lipídico',
        indicaciones: 'Ayuno de 12 horas',
        estado: 'completada',
        resultado: 'Colesterol total 220 mg/dL (elevado).',
      },
    ],
  },
  {
    nombre: 'Sofía Morales',
    correo: 'sofia.morales@hospitalroosevelt.gt',
    password: 'Paciente123!',
    dpi: '6789010000106',
    fecha_nacimiento: '1996-09-02',
    telefono: '5555-9090',
    direccion: 'Zona 11, Guatemala',
    tipo_sangre: 'A-',
    antecedentes: 'Migraña crónica.',
    alergias: 'Ninguna',
    consultas: [
      { motivo: 'Migraña', diagnostico: 'Migraña', notas: 'Episodios recurrentes.', mesesAtras: 1 },
      { motivo: 'Migraña recurrente', diagnostico: 'Migraña', notas: 'Se deriva a neurología.', mesesAtras: 5 },
    ],
    citas: [{ motivo: 'Consulta de neurología', estado: 'programada', dias: 20 }],
  },
  {
    nombre: 'Diego Xiloj',
    correo: 'diego.xiloj@hospitalroosevelt.gt',
    password: 'Paciente123!',
    dpi: '7890100000107',
    fecha_nacimiento: '2010-04-18',
    telefono: '5555-6060',
    direccion: 'Amatitlán, Guatemala',
    tipo_sangre: 'O+',
    antecedentes: 'Ninguno.',
    alergias: 'Ninguna',
    consultas: [
      {
        motivo: 'Fiebre',
        diagnostico: 'Infección respiratoria aguda',
        notas: 'Reposo e hidratación.',
        mesesAtras: 2,
        receta: { medicamento: 'Acetaminofén jarabe', dosis: 'Según peso cada 6h', indicaciones: 'Solo si hay fiebre' },
      },
    ],
    citas: [{ motivo: 'Control pediátrico', estado: 'atendida', dias: -10 }],
  },
];

const NOMBRES = [
  'María', 'José', 'Carlos', 'Ana', 'Luis', 'Sofía', 'Pedro', 'Lucía', 'Jorge', 'Andrea',
  'Diego', 'Rosa', 'Manuel', 'Gabriela', 'Francisco', 'Elena', 'Roberto', 'Carmen', 'Miguel', 'Patricia',
  'Héctor', 'Verónica', 'Óscar', 'Silvia', 'Ricardo', 'Claudia', 'Fernando', 'Diana', 'Álvaro', 'Karla',
];
const APELLIDOS = [
  'López', 'García', 'Ramírez', 'Morales', 'Choc', 'Xiloj', 'Sac', 'Pérez', 'Hernández', 'Castillo',
  'Gómez', 'Ruiz', 'De León', 'Ajpacajá', 'Tum', 'Coj', 'Batz', 'Cuc', 'Ixchop', 'Juárez',
  'Vásquez', 'Méndez', 'Ordoñez', 'Espinoza', 'Monzón', 'Reyes', 'Aguilar', 'Cifuentes', 'Barrios', 'Sandoval',
];
const DIRECCIONES = [
  'Zona 1, Guatemala', 'Zona 3, Guatemala', 'Zona 6, Guatemala', 'Zona 7, Guatemala', 'Zona 11, Guatemala',
  'Zona 12, Guatemala', 'Zona 18, Guatemala', 'Mixco, Guatemala', 'Villa Nueva, Guatemala', 'Amatitlán, Guatemala',
  'San Miguel Petapa, Guatemala', 'Chinautla, Guatemala', 'Quetzaltenango', 'Escuintla', 'Antigua Guatemala',
];
const TIPOS_SANGRE = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];
const ANTECEDENTES_LISTA = [
  'Ninguno.', 'Hipertensión arterial.', 'Diabetes mellitus tipo 2.', 'Asma bronquial.',
  'Migraña crónica.', 'Dislipidemia.', 'Hipotiroidismo.', 'Ninguno.',
];
const ALERGIAS_LISTA = ['Ninguna', 'Penicilina', 'Sulfonamidas', 'AINEs', 'Mariscos', 'Ninguna'];
const HISTORIAS = [
  { motivo: 'Fiebre y tos', diagnostico: 'Infección respiratoria aguda' },
  { motivo: 'Dolor abdominal', diagnostico: 'Gastritis leve' },
  { motivo: 'Cefalea', diagnostico: 'Migraña' },
  { motivo: 'Control de presión', diagnostico: 'Hipertensión arterial' },
  { motivo: 'Control de glucosa', diagnostico: 'Diabetes mellitus tipo 2' },
  { motivo: 'Tos persistente', diagnostico: 'Bronquitis aguda' },
  { motivo: 'Dolor lumbar', diagnostico: 'Lumbalgia' },
  { motivo: 'Lesión en la piel', diagnostico: 'Dermatitis alérgica' },
];

// Genera pacientes de ejemplo adicionales con datos variados y deterministas.
function generarPacientesAdicionales(cantidad) {
  const lista = [];
  for (let i = 0; i < cantidad; i++) {
    const num = String(i + 8).padStart(2, '0');
    const nombre = `${NOMBRES[i % NOMBRES.length]} ${APELLIDOS[(i * 5) % APELLIDOS.length]} ${
      APELLIDOS[(i * 11 + 4) % APELLIDOS.length]
    }`;
    const anio = 1948 + ((i * 7) % 66);
    const mes = (i % 12) + 1;
    const dia = (i % 27) + 1;

    const consultas = [];
    const nConsultas = i % 3;
    for (let k = 0; k < nConsultas; k++) {
      const h = HISTORIAS[(i + k) % HISTORIAS.length];
      consultas.push({
        motivo: h.motivo,
        diagnostico: h.diagnostico,
        notas: 'Evolución favorable, control en consulta externa.',
        mesesAtras: (i + k) % 6,
        receta:
          k === 0
            ? {
                medicamento: ['Paracetamol 500mg', 'Ibuprofeno 400mg', 'Omeprazol 20mg'][i % 3],
                dosis: '1 tableta cada 8h',
                indicaciones: 'Solo si presenta molestias',
              }
            : undefined,
      });
    }

    const dias = (i % 60) - 30;
    const citas =
      i % 2 === 0
        ? [
            {
              motivo: 'Consulta de seguimiento',
              estado: dias < 0 ? 'atendida' : 'programada',
              dias,
            },
          ]
        : undefined;

    const ordenes =
      i % 5 === 0
        ? [
            {
              examen: ['Hemograma completo', 'Glucosa en ayunas', 'Perfil lipídico', 'Orina completa', 'Radiografía de tórax'][
                i % 5
              ],
              indicaciones: 'En ayunas',
              estado: ['solicitada', 'en_proceso', 'completada'][i % 3],
              resultado: i % 3 === 2 ? 'Resultado dentro del rango esperado.' : undefined,
            },
          ]
        : undefined;

    lista.push({
      nombre,
      correo: `paciente${num}@hospitalroosevelt.gt`,
      password: 'Paciente123!',
      dpi: `2${String(100000000000 + i).slice(0, 12)}`,
      fecha_nacimiento: `${anio}-${pad(mes)}-${pad(dia)}`,
      telefono: `5555-${String(1000 + i).slice(0, 4)}`,
      direccion: DIRECCIONES[i % DIRECCIONES.length],
      tipo_sangre: TIPOS_SANGRE[i % TIPOS_SANGRE.length],
      antecedentes: ANTECEDENTES_LISTA[i % ANTECEDENTES_LISTA.length],
      alergias: ALERGIAS_LISTA[i % ALERGIAS_LISTA.length],
      consultas,
      citas,
      ordenes,
    });
  }
  return lista;
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

  await upsertUsuario({
    nombre: 'Lucía Enfermera',
    correo: 'enfermeria@hospitalroosevelt.gt',
    password: 'Enfermeria123!',
    rol: 'enfermeria',
  });

  await upsertUsuario({
    nombre: 'Laboratorio Central',
    correo: 'laboratorio@hospitalroosevelt.gt',
    password: 'Laboratorio123!',
    rol: 'laboratorio',
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

  const TODOS_LOS_PACIENTES = [...DEMO_PACIENTES, ...generarPacientesAdicionales(43)];
  for (const paciente of TODOS_LOS_PACIENTES) {
    await crearPacienteDemo(paciente, medicoId, admisionId);
  }

  console.log(`Pacientes de ejemplo creados: ${TODOS_LOS_PACIENTES.length}`);
  console.log('\nUsuarios de prueba:');
  console.table([
    { rol: 'administrador', correo: 'admin@hospitalroosevelt.gt', password: 'Admin123!' },
    { rol: 'admision', correo: 'admision@hospitalroosevelt.gt', password: 'Admision123!' },
    { rol: 'enfermeria', correo: 'enfermeria@hospitalroosevelt.gt', password: 'Enfermeria123!' },
    { rol: 'laboratorio', correo: 'laboratorio@hospitalroosevelt.gt', password: 'Laboratorio123!' },
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
