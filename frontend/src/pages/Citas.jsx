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

  const [reagendando, setReagendando] = useState(null);
  const [rfecha, setRfecha] = useState('');
  const [rmedico, setRmedico] = useState('');
  const [rmotivo, setRmotivo] = useState('');

  const puedeAgendar = ['admision', 'administrador'].includes(usuario.rol);
  const puedeReagendar = ['admision', 'administrador'].includes(usuario.rol);
  const puedeCambiarEstado = ['medico', 'admision', 'administrador'].includes(usuario.rol);

  async function cargarTodo() {
    setCargando(true);
    try {
      const citasRes = await api.citas(token);
      setCitas(citasRes);
      if (puedeAgendar || puedeReagendar) {
        setMedicos(await api.medicos(token));
        setPacientes(await api.pacientes(token));
      }
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function aInputFecha(f) {
    if (!f) return '';
    const d = new Date(f);
    if (Number.isNaN(d.getTime())) return '';
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }

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

  function abrirReagendar(c) {
    setError('');
    setMostrarFormulario(false);
    setReagendando(c);
    setRfecha(aInputFecha(c.fecha));
    setRmedico(String(c.medico_id));
    setRmotivo(c.motivo || '');
  }

  async function guardarReagendar(e) {
    e.preventDefault();
    setError('');
    try {
      await api.reagendarCita(token, reagendando.id, {
        medico_id: Number(rmedico),
        fecha: rfecha,
        motivo: rmotivo,
      });
      setReagendando(null);
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

      {error && <div className="mensaje-error">{error}</div>}

      {puedeAgendar && (
        <div className="tarjeta">
          {!mostrarFormulario ? (
            <button className="boton-secundario" onClick={() => { setReagendando(null); setMostrarFormulario(true); }}>
              + Agendar cita
            </button>
          ) : (
            <form onSubmit={manejarEnvio}>
              <div className="form-en-linea">
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
                <div className="campo">
                  <label>Médico</label>
                  <select value={medicoId} onChange={(e) => setMedicoId(e.target.value)} required>
                    <option value="">Selecciona…</option>
                    {medicos.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} — {m.especialidad}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="campo">
                  <label>Fecha y hora</label>
                  <input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
                </div>
                <div className="campo">
                  <label>Motivo</label>
                  <input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button className="boton-primario" type="submit" style={{ width: 'auto' }}>
                  Agendar cita
                </button>
                <button type="button" className="boton-secundario" onClick={() => setMostrarFormulario(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {reagendando && (
        <div className="tarjeta">
          <h3>Reagendar cita</h3>
          <p>
            Cita de <strong>{reagendando.paciente_nombre}</strong>. Actualiza la fecha, el médico o el motivo.
          </p>
          {error && <div className="mensaje-error">{error}</div>}
          <form onSubmit={guardarReagendar}>
            <div className="form-en-linea">
              <div className="campo">
                <label>Médico</label>
                <select value={rmedico} onChange={(e) => setRmedico(e.target.value)} required>
                  {medicos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} — {m.especialidad}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label>Nueva fecha y hora</label>
                <input type="datetime-local" value={rfecha} onChange={(e) => setRfecha(e.target.value)} required />
              </div>
              <div className="campo">
                <label>Motivo / registro clínico</label>
                <input value={rmotivo} onChange={(e) => setRmotivo(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button className="boton-primario" type="submit" style={{ width: 'auto' }}>
                Guardar nueva fecha
              </button>
              <button type="button" className="boton-secundario" onClick={() => setReagendando(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="tarjeta">
        {cargando ? (
          <p className="vacio">Cargando citas…</p>
        ) : citas.length === 0 ? (
          <p className="vacio">No hay citas registradas.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Paciente</th>
                  <th>Médico</th>
                  <th>Motivo</th>
                  <th>Estado</th>
                  {(puedeReagendar || puedeCambiarEstado) && <th>Acciones</th>}
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
                    {(puedeReagendar || puedeCambiarEstado) && (
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {puedeReagendar && (
                          <button className="boton-secundario" onClick={() => abrirReagendar(c)}>
                            Reagendar
                          </button>
                        )}{' '}
                        {puedeCambiarEstado && c.estado === 'programada' && (
                          <>
                            <button className="boton-secundario" onClick={() => cambiarEstado(c.id, 'atendida')}>
                              Marcar atendida
                            </button>{' '}
                            <button className="boton-secundario" onClick={() => cambiarEstado(c.id, 'cancelada')}>
                              Cancelar
                            </button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
