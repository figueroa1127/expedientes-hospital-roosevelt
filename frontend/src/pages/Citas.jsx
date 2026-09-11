import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function Citas() {
  const { token, usuario } = useAuth();
  const [citas, setCitas] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [error, setError] = useState('');

  const [medicoId, setMedicoId] = useState('');
  const [pacienteId, setPacienteId] = useState('');
  const [fecha, setFecha] = useState('');
  const [motivo, setMotivo] = useState('');

  const puedeAgendar = ['paciente', 'admision', 'administrador'].includes(usuario.rol);
  const puedeCambiarEstado = ['medico', 'enfermeria', 'admision', 'administrador'].includes(usuario.rol);

  async function cargarTodo() {
    setCargando(true);
    const [citasRes, medicosRes] = await Promise.all([api.citas(token), api.medicos(token)]);
    setCitas(citasRes);
    setMedicos(medicosRes);
    if (['admision', 'administrador'].includes(usuario.rol)) {
      const pacientesRes = await api.pacientes(token);
      setPacientes(pacientesRes);
    }
    setCargando(false);
  }

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function manejarEnvio(e) {
    e.preventDefault();
    setError('');
    try {
      await api.crearCita(token, {
        medico_id: Number(medicoId),
        paciente_id: pacienteId ? Number(pacienteId) : undefined,
        fecha,
        motivo,
      });
      setMedicoId('');
      setPacienteId('');
      setFecha('');
      setMotivo('');
      setMostrarFormulario(false);
      await cargarTodo();
    } catch (err) {
      setError(err.message);
    }
  }

  async function cambiarEstado(id, estado) {
    await api.cambiarEstadoCita(token, id, estado);
    await cargarTodo();
  }

  return (
    <div>
      <div className="encabezado-pagina">
        <h1>{usuario.rol === 'paciente' ? 'Mis citas' : 'Citas'}</h1>
        <p>Agenda y seguimiento de citas médicas.</p>
      </div>

      {puedeAgendar && (
        <div className="tarjeta">
          {!mostrarFormulario ? (
            <button className="boton-secundario" onClick={() => setMostrarFormulario(true)}>
              + Agendar cita
            </button>
          ) : (
            <form onSubmit={manejarEnvio}>
              {error && <div className="mensaje-error">{error}</div>}
              <div className="form-en-linea">
                {['admision', 'administrador'].includes(usuario.rol) && (
                  <div className="campo">
                    <label>Paciente</label>
                    <select value={pacienteId} onChange={(e) => setPacienteId(e.target.value)} required>
                      <option value="">Selecciona…</option>
                      {pacientes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="campo">
                  <label>Médico</label>
                  <select value={medicoId} onChange={(e) => setMedicoId(e.target.value)} required>
                    <option value="">Selecciona…</option>
                    {medicos.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} {m.especialidad ? `· ${m.especialidad}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="campo">
                  <label>Fecha y hora</label>
                  <input
                    type="datetime-local"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    required
                  />
                </div>
                <div className="campo">
                  <label>Motivo</label>
                  <input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button className="boton-primario" type="submit" style={{ width: 'auto' }}>
                  Guardar cita
                </button>
                <button
                  type="button"
                  className="boton-secundario"
                  onClick={() => setMostrarFormulario(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="tarjeta">
        {cargando ? (
          <p className="vacio">Cargando citas…</p>
        ) : citas.length === 0 ? (
          <p className="vacio">No hay citas registradas.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Paciente</th>
                <th>Médico</th>
                <th>Motivo</th>
                <th>Estado</th>
                {puedeCambiarEstado && <th></th>}
              </tr>
            </thead>
            <tbody>
              {citas.map((c) => (
                <tr key={c.id}>
                  <td>{new Date(c.fecha).toLocaleString('es-GT')}</td>
                  <td>{c.paciente_nombre}</td>
                  <td>{c.medico_nombre}</td>
                  <td>{c.motivo || '—'}</td>
                  <td>
                    <span className={`insignia ${c.estado}`}>{c.estado}</span>
                  </td>
                  {puedeCambiarEstado && c.estado === 'programada' && (
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="boton-secundario" onClick={() => cambiarEstado(c.id, 'atendida')}>
                        Marcar atendida
                      </button>
                      <button className="boton-secundario" onClick={() => cambiarEstado(c.id, 'cancelada')}>
                        Cancelar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
