require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const pacientesRoutes = require('./routes/pacientes');
const expedientesRoutes = require('./routes/expedientes');
const citasRoutes = require('./routes/citas');
const { initDb } = require('./db');

if (!process.env.JWT_SECRET) {
  console.error(
    '\n[ERROR] Falta la variable JWT_SECRET. Copia backend/.env.example a backend/.env y define una clave.\n'
  );
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/salud', (req, res) => {
  res.json({ estado: 'ok', servicio: 'Expedientes Médicos Digitales - Hospital Roosevelt' });
});

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/expedientes', expedientesRoutes);
app.use('/api/citas', citasRoutes);

// Manejo de errores no controlados
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Ocurrió un error inesperado en el servidor.' });
});

const PORT = process.env.PORT || 4000;

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API de expedientes médicos escuchando en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error al inicializar la base de datos PostgreSQL:', err);
    process.exit(1);
  });
