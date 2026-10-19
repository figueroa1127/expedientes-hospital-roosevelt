import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const OPCIONES_DIA = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ valor: d, etiqueta: NOMBRES_DIA[d] }));

function fechaHoy() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function aInputFechaDia(f) {
  if (!f) return '';
  const d = new Date(String(f).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

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
  const [cupos, setCupos] = useState([]);
  const [cupoSeleccionado, setCupoSeleccionado] = useState('');
  const [cargandoCupos, setCargandoCupos] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [reagendando, setReagendando] = useState(null);
  const [rmedico, setRmedico] = useState('');
  const [rfecha, setRfecha] = useState('');
  const [rcupos, setRcupos] = useState([]);
  const [rcupoSeleccionado, setRcupoSeleccionado] = useState('');
  const [cargandoRcupos, setCargandoRcupos] = useState(false);
  const [rmotivo, setRmotivo] = useState('');

  const [horario, setHorario] = useState([]);
  const [guardandoHorario, setGuardandoHorario] = useState(false);
  const [mensajeHorario, setMensajeHorario] = useState('');

  const puedeAgendar = ['admision', 'administrador', 'medico'].includes(usuario.rol);
  const puedeReagendar = ['admision', 'administrador'].includes(usuario.rol);
  const puedeCambiarEstado = ['medico', 'admision', 'administrador'].includes(usuario.rol);
  const esMedico = usuario.rol === 'medico';

  async function cargarTodo() {
    setCargando(true);
    try {
      setCitas(await api.citas(token));
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

  useEffect(() => {
    if (!esMedico) return;
    api
      .miHorario(token)
      .then((franjas) => setHorario(franjas))
      .catch(() => {});
  }, [esMedico, token]);

  useEffect(() => {
    if (esMedico && medicos.length) {
      const propio = medicos.find((m) => m.usuario_id === usuario.id);
      if (propio) setMedicoId((v) => v || String(propio.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicos]);

  useEffect(() => {
    let activo = true;
    if (!medicoId || !fecha) {
      setCupos([]);
      setCupoSeleccionado('');
      return () => { activo = false; };
    }
    setCargandoCupos(true);
    api
      .disponibilidadCitas(token, medicoId, fecha)
      .then((r) => {
        if (!activo) return;
        setCupos(r.cupos || []);
        setCupoSeleccionado('');
      })
      .catch((e) => activo && setError(e.message))
      .finally(() => activo && setCargandoCupos(false));
    return () => { activo = false; };
  }, [medicoId, fecha, token]);

  useEffect(() => {
    let activo = true;
    if (!rmedico || !rfecha || !reagendando) {
      setRcupos([]);
      return () => { activo = false; };
    }
    setCargandoRcupos(true);
    api
      .disponibilidadCitas(token, rmedico, rfecha, reagendando.id)
      .then((r) => {
        if (!activo) return;
        setRcupos(r.cupos || []);
        setRcupoSeleccionado('');
      })
      .catch((e) => activo && setError(e.message))
      .finally(() => activo && setCargandoRcupos(false));
    return () => { activo = false; };
  }, [rmedico, rfecha, reagendando, token]);

  async function manejarEnvio(e) {
    e.preventDefault();
    setError('');
    if (!pacienteId || !medicoId || !fecha || !cupoSeleccionado) {
      setError('Selecciona paciente, médico, fecha y horario disponible.');
      return;
    }
    setGuardando(true);
    try {
      await api.crearCita(token, {
        medico_id: Number(medicoId),
        paciente_id: Number(pacienteId),
        fecha: `${fecha}T${cupoSeleccionado}`,
        motivo,
      });
      setMedicoId('');
      setPacienteId('');
      setFecha('');
      setCupos([]);
      setCupoSeleccionado('');
      setMotivo('');
      setMostrarFormulario(false);
      await cargarTodo();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  function abrirReagendar(c) {
    setError('');
    setMostrarFormulario(false);
    setReagendando(c);
    setRfecha(aInputFechaDia(c.fecha));
    setRmedico(String(c.medico_id));
    setRmotivo(c.motivo || '');
    setRcupoSeleccionado('');
  }

  async function guardarReagendar(e) {
    e.preventDefault();
    setError('');
    if (!rcupoSeleccionado) {
      setError('Selecciona un horario disponible.');
      return;
    }
    try {
      await api.reagendarCita(token, reagendando.id, {
        medico_id: Number(rmedico),
        fecha: `${rfecha}T${rcupoSeleccionado}`,
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

  function agregarFranja() {
    setMensajeHorario('');
    setHorario((h) => [...h, { dia_semana: 1, hora_inicio: '08:00', hora_fin: '12:00' }]);
  }

  function actualizarFranja(i, campo, valor) {
    setHorario((h) => h.map((f, idx) => (idx === i ? { ...f, [campo]: valor } : f)));
  }

  function quitarFranja(i) {
    setHorario((h) => h.filter((_, idx) => idx !== i));
  }

  async function guardarHorario() {
    setError('');
    setMensajeHorario('');
    setGuardandoHorario(true);
    try {
      await api.guardarMiHorario(
        token,
        horario.map((f) => ({
          dia_semana: Number(f.dia_semana),
          hora_inicio: f.hora_inicio,
          hora_fin: f.hora_fin,
        }))
      );
      setMensajeHorario('Horario guardado correctamente.');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoHorario(false);
    }
  }

  return (
    <div>
      <div className="encabezado-pagina">
        <h1>{usuario.rol === 'paciente' ? 'Mis citas' : esMedico ? 'Mi agenda' : 'Citas'}</h1>
        <p>Agenda y seguimiento de citas médicas.</p>
      </div>

      {error && <div className="mensaje-error">{error}</div>}

      {esMedico && (
        <div className="tarjeta">
          <h3>Mi horario de atención</h3>
          <p style={{ color: 'var(--gris-texto)' }}>
            Define los días y horas en que los pacientes pueden agendar contigo. Los cupos se generan cada 30 minutos.
          </p>
          {mensajeHorario && <div style={{ color: 'var(--verde-ok)', marginBottom: 10 }}>{mensajeHorario}</div>}
          {horario.length === 0 ? (
            <p className="vacio">Aún no tienes franjas. Agrega una para habilitar tu agenda.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
              {horario.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select value={f.dia_semana} onChange={(e) => actualizarFranja(i, 'dia_semana', Number(e.target.value))}>
                    {OPCIONES_DIA.map((o) => (
                      <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
                    ))}
                  </select>
                  <input type="time" value={f.hora_inicio} onChange={(e) => actualizarFranja(i, 'hora_inicio', e.target.value)} />
                  <span>a</span>
                  <input type="time" value={f.hora_fin} onChange={(e) => actualizarFranja(i, 'hora_fin', e.target.value)} />
                  <button type="button" className="boton-secundario" onClick={() => quitarFranja(i)}>Quitar</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="boton-secundario" onClick={agregarFranja}>+ Agregar franja</button>
            <button type="button" className="boton-primario" style={{ width: 'auto' }} onClick={guardarHorario} disabled={guardandoHorario}>
              {guardandoHorario ? 'Guardando…' : 'Guardar horario'}
            </button>
          </div>
        </div>
      )}

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
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="campo">
                  <label>Médico</label>
                  <select value={medicoId} onChange={(e) => setMedicoId(e.target.value)} required>
                    <option value="">Selecciona…</option>
                    {medicos.map((m) => (
                      <option key={m.id} value={m.id}>{m.nombre} — {m.especialidad}</option>
                    ))}
                  </select>
                </div>
                <div className="campo">
                  <label>Fecha</label>
                  <input type="date" min={fechaHoy()} value={fecha} onChange={(e) => setFecha(e.target.value)} required />
                </div>
                <div className="campo">
                  <label>Motivo</label>
                  <input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                </div>
              </div>

              {medicoId && fecha && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Horarios disponibles</label>
                  {cargandoCupos ? (
                    <p className="vacio">Cargando horarios…</p>
                  ) : cupos.length === 0 ? (
                    <p className="vacio">El médico no tiene cupos disponibles ese día.</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {cupos.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={cupoSeleccionado === c ? 'boton-primario' : 'boton-secundario'}
                          style={{ width: 'auto' }}
                          onClick={() => setCupoSeleccionado(c)}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button className="boton-primario" type="submit" style={{ width: 'auto' }} disabled={guardando}>
                  {guardando ? 'Agendando…' : 'Agendar cita'}
                </button>
                <button type="button" className="boton-secundario" onClick={() => setMostrarFormulario(false)}>Cancelar</button>
              </div>
            </form>
          )}
        </div>
      )}

      {reagendando && (
        <div className="tarjeta">
          <h3>Reagendar cita</h3>
          <p>Cita de <strong>{reagendando.paciente_nombre}</strong>. Elige un nuevo horario disponible.</p>
          <form onSubmit={guardarReagendar}>
            <div className="form-en-linea">
              <div className="campo">
                <label>Médico</label>
                <select value={rmedico} onChange={(e) => setRmedico(e.target.value)} required>
                  {medicos.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre} — {m.especialidad}</option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label>Fecha</label>
                <input type="date" min={fechaHoy()} value={rfecha} onChange={(e) => setRfecha(e.target.value)} required />
              </div>
              <div className="campo">
                <label>Motivo / registro clínico</label>
                <input value={rmotivo} onChange={(e) => setRmotivo(e.target.value)} />
              </div>
            </div>

            {rmedico && rfecha && (
              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Horarios disponibles</label>
                {cargandoRcupos ? (
                  <p className="vacio">Cargando horarios…</p>
                ) : rcupos.length === 0 ? (
                  <p className="vacio">No hay cupos disponibles ese día.</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {rcupos.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={rcupoSeleccionado === c ? 'boton-primario' : 'boton-secundario'}
                        style={{ width: 'auto' }}
                        onClick={() => setRcupoSeleccionado(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="boton-primario" type="submit" style={{ width: 'auto' }}>Guardar nueva fecha</button>
              <button type="button" className="boton-secundario" onClick={() => setReagendando(null)}>Cancelar</button>
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
                    <td>{new Date(String(c.fecha).replace(' ', 'T')).toLocaleString('es-GT')}</td>
                    <td>{c.paciente_nombre}</td>
                    <td>{c.medico_nombre}</td>
                    <td>{c.motivo || '—'}</td>
                    <td>
                      <span className={`insignia ${c.estado}`}>{c.estado}</span>
                    </td>
                    {(puedeReagendar || puedeCambiarEstado) && (
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {puedeReagendar && (
                          <button className="boton-secundario" onClick={() => abrirReagendar(c)}>Reagendar</button>
                        )}{' '}
                        {puedeCambiarEstado && c.estado === 'programada' && (
                          <>
                            <button className="boton-secundario" onClick={() => cambiarEstado(c.id, 'atendida')}>Marcar atendida</button>{' '}
                            <button className="boton-secundario" onClick={() => cambiarEstado(c.id, 'cancelada')}>Cancelar</button>
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
