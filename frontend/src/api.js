const BASE_URL = '/api';

async function solicitud(ruta, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${ruta}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const datos = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(datos.error || 'Ocurrió un error al comunicarse con el servidor.');
  }
  return datos;
}

export const api = {
  login: (correo, password) => solicitud('/auth/login', { method: 'POST', body: { correo, password } }),
  registro: (datos) => solicitud('/auth/registro', { method: 'POST', body: datos }),
  perfil: (token) => solicitud('/auth/perfil', { token }),

  pacientes: (token) => solicitud('/pacientes', { token }),
  actualizarPaciente: (token, id, datos) =>
    solicitud(`/pacientes/${id}`, { method: 'PUT', body: datos, token }),

  miExpediente: (token) => solicitud('/expedientes/mio', { token }),
  expedienteDePaciente: (token, pacienteId) =>
    solicitud(`/expedientes/paciente/${pacienteId}`, { token }),
  agregarConsulta: (token, expedienteId, datos) =>
    solicitud(`/expedientes/${expedienteId}/consultas`, { method: 'POST', body: datos, token }),
  actualizarExpediente: (token, expedienteId, datos) =>
    solicitud(`/expedientes/${expedienteId}`, { method: 'PUT', body: datos, token }),
  crearOrdenLaboratorio: (token, expedienteId, datos) =>
    solicitud(`/expedientes/${expedienteId}/ordenes`, { method: 'POST', body: datos, token }),

  laboratorio: (token) => solicitud('/laboratorio', { token }),
  actualizarOrdenLaboratorio: (token, id, datos) =>
    solicitud(`/laboratorio/${id}`, { method: 'PUT', body: datos, token }),

  reportesResumen: (token) => solicitud('/reportes/resumen', { token }),

  citas: (token) => solicitud('/citas', { token }),
  medicos: (token) => solicitud('/citas/medicos', { token }),
  crearCita: (token, datos) => solicitud('/citas', { method: 'POST', body: datos, token }),
  cambiarEstadoCita: (token, id, estado) =>
    solicitud(`/citas/${id}/estado`, { method: 'PUT', body: { estado }, token }),

  usuarios: (token) => solicitud('/usuarios', { token }),
  crearUsuario: (token, datos) => solicitud('/usuarios', { method: 'POST', body: datos, token }),
};
