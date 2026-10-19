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
  accesoPaciente: (dpi, password, crear) =>
    solicitud('/auth/paciente/acceso', { method: 'POST', body: { dpi, password, crear } }),
  perfil: (token) => solicitud('/auth/perfil', { token }),

  pacientes: (token) => solicitud('/pacientes', { token }),
  buscarPacienteDpi: (token, dpi) => solicitud(`/pacientes/dpi/${encodeURIComponent(dpi)}`, { token }),
  registrarPaciente: (token, datos) =>
    solicitud('/pacientes', { method: 'POST', body: datos, token }),
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
  archivoLaboratorio: (token, id) => solicitud(`/laboratorio/${id}/archivo`, { token }),

  signos: (token) => solicitud('/signos', { token }),
  misSignos: (token) => solicitud('/signos/mio', { token }),
  signosDePaciente: (token, pacienteId) => solicitud(`/signos/paciente/${pacienteId}`, { token }),
  crearSignos: (token, datos) => solicitud('/signos', { method: 'POST', body: datos, token }),

  reportesResumen: (token) => solicitud('/reportes/resumen', { token }),

  citas: (token) => solicitud('/citas', { token }),
  medicos: (token) => solicitud('/citas/medicos', { token }),
  disponibilidadCitas: (token, medicoId, fecha, excluir) =>
    solicitud(
      `/citas/disponibilidad/${medicoId}?fecha=${fecha}${excluir ? `&excluir=${excluir}` : ''}`,
      { token }
    ),
  miHorario: (token) => solicitud('/citas/mi-horario', { token }),
  guardarMiHorario: (token, franjas) =>
    solicitud('/citas/mi-horario', { method: 'PUT', body: { franjas }, token }),
  crearCita: (token, datos) => solicitud('/citas', { method: 'POST', body: datos, token }),
  reagendarCita: (token, id, datos) =>
    solicitud(`/citas/${id}`, { method: 'PUT', body: datos, token }),
  cambiarEstadoCita: (token, id, estado) =>
    solicitud(`/citas/${id}/estado`, { method: 'PUT', body: { estado }, token }),

  usuarios: (token) => solicitud('/usuarios', { token }),
  crearUsuario: (token, datos) => solicitud('/usuarios', { method: 'POST', body: datos, token }),
};
