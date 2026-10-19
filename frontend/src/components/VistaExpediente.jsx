import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { leerArchivoBase64, formatoValido, abrirArchivoAdjunto } from '../utils/archivo';

const ETIQUETA_ORDEN = {
  solicitada: 'Solicitada',
  en_proceso: 'En proceso',
  completada: 'Completada',
};

export default function VistaExpediente({
  expediente,
  pacienteId,
  puedeRegistrarConsulta,
  puedeEditarAntecedentes,
  puedeRegistrarSignos,
  puedeSolicitarOrden,
  puedeRegistrarResultado,
  onAgregarConsulta,
  onActualizarAntecedentes,
  onSolicitarOrden,
  onRegistrarResultado,
}) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [notas, setNotas] = useState('');
  const [medicamento, setMedicamento] = useState('');
  const [dosis, setDosis] = useState('');
  const [enviando, setEnviando] = useState(false);

  const [mostrarFormAntecedentes, setMostrarFormAntecedentes] = useState(false);
  const [antecedentes, setAntecedentes] = useState(expediente?.antecedentes || '');
  const [alergias, setAlergias] = useState(expediente?.alergias || '');
  const [enviandoAntecedentes, setEnviandoAntecedentes] = useState(false);

  const [mostrarFormOrden, setMostrarFormOrden] = useState(false);
  const [examen, setExamen] = useState('');
  const [indicaciones, setIndicaciones] = useState('');
  const [enviandoOrden, setEnviandoOrden] = useState(false);
  const [resultadoAbierto, setResultadoAbierto] = useState(null);
  const [resultadoTexto, setResultadoTexto] = useState('');
  const [resultadoArchivo, setResultadoArchivo] = useState(null);

  const { token } = useAuth();
  const [signos, setSignos] = useState([]);
  const [cargandoSignos, setCargandoSignos] = useState(Boolean(pacienteId));
  const [mostrarFormSignos, setMostrarFormSignos] = useState(false);
  const [formSignos, setFormSignos] = useState({});
  const [enviandoSignos, setEnviandoSignos] = useState(false);

  useEffect(() => {
    if (!pacienteId) return undefined;
    let activo = true;
    api
      .signosDePaciente(token, pacienteId)
      .then((s) => activo && setSignos(s))
      .catch(() => {})
      .finally(() => activo && setCargandoSignos(false));
    return () => {
      activo = false;
    };
  }, [token, pacienteId]);

  if (!expediente) {
    return <p className="vacio">Aún no hay un expediente registrado.</p>;
  }

  async function manejarEnvio(e) {
    e.preventDefault();
    setEnviando(true);
    try {
      const recetas = medicamento ? [{ medicamento, dosis, indicaciones: '' }] : [];
      await onAgregarConsulta({ motivo, diagnostico, notas, recetas });
      setMotivo('');
      setDiagnostico('');
      setNotas('');
      setMedicamento('');
      setDosis('');
      setMostrarFormulario(false);
    } finally {
      setEnviando(false);
    }
  }

  async function manejarAntecedentes(e) {
    e.preventDefault();
    setEnviandoAntecedentes(true);
    try {
      await onActualizarAntecedentes({ antecedentes, alergias });
      setMostrarFormAntecedentes(false);
    } finally {
      setEnviandoAntecedentes(false);
    }
  }

  async function manejarSignos(e) {
    e.preventDefault();
    setEnviandoSignos(true);
    try {
      await api.crearSignos(token, { ...formSignos, paciente_id: pacienteId });
      setSignos(await api.signosDePaciente(token, pacienteId));
      setFormSignos({});
      setMostrarFormSignos(false);
    } finally {
      setEnviandoSignos(false);
    }
  }

  async function manejarOrden(e) {
    e.preventDefault();
    setEnviandoOrden(true);
    try {
      await onSolicitarOrden({ examen, indicaciones });
      setExamen('');
      setIndicaciones('');
      setMostrarFormOrden(false);
    } finally {
      setEnviandoOrden(false);
    }
  }

  async function seleccionarResultadoArchivo(e, o) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!formatoValido(file.type)) {
      alert('Formato no permitido. Usa PDF, PNG o JPG.');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo es demasiado grande (máximo 5 MB).');
      e.target.value = '';
      return;
    }
    setResultadoArchivo(await leerArchivoBase64(file));
  }
  async function manejarResultado(ordenId, extra = {}) {
    const datos = { estado: 'completada', ...extra };
    if (resultadoTexto.trim()) datos.resultado = resultadoTexto;
    if (resultadoArchivo) datos.archivo = resultadoArchivo;
    if (!datos.resultado && !datos.archivo) return;
    await onRegistrarResultado(ordenId, datos);
    setResultadoAbierto(null);
    setResultadoTexto('');
    setResultadoArchivo(null);
  }

  const ordenes = expediente.ordenes || [];
  const pendientes = ordenes.filter((o) => o.estado !== 'completada').length;

  return (
    <div>
      <div className="tarjeta">
        <h3>Datos clínicos generales</h3>
        {mostrarFormAntecedentes ? (
          <form onSubmit={manejarAntecedentes}>
            <div className="campo">
              <label>Antecedentes (historial clínico)</label>
              <textarea
                rows={3}
                value={antecedentes}
                onChange={(e) => setAntecedentes(e.target.value)}
              />
            </div>
            <div className="campo">
              <label>Alergias</label>
              <textarea
                rows={2}
                value={alergias}
                onChange={(e) => setAlergias(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="boton-primario"
                type="submit"
                disabled={enviandoAntecedentes}
                style={{ width: 'auto' }}
              >
                {enviandoAntecedentes ? 'Guardando…' : 'Guardar antecedentes'}
              </button>
              <button
                type="button"
                className="boton-secundario"
                onClick={() => setMostrarFormAntecedentes(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <>
            {expediente.alergias && expediente.alergias.trim() && (
              <div className="alerta-alergia">
                <strong>Alerta de alergias:</strong> {expediente.alergias}
              </div>
            )}
            <p>
              <strong>Antecedentes:</strong>{' '}
              {expediente.antecedentes || 'Sin antecedentes registrados.'}
            </p>
            <p>
              <strong>Alergias:</strong> {expediente.alergias || 'Ninguna registrada.'}
            </p>
            {puedeEditarAntecedentes && (
              <button
                className="boton-secundario"
                onClick={() => {
                  setAntecedentes(expediente.antecedentes || '');
                  setAlergias(expediente.alergias || '');
                  setMostrarFormAntecedentes(true);
                }}
              >
                Editar antecedentes y alergias
              </button>
            )}
          </>
        )}
      </div>

      <div className="tarjeta">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h3 style={{ margin: 0 }}>Signos vitales</h3>
          {puedeRegistrarSignos && !mostrarFormSignos && (
            <button
              className="boton-secundario"
              onClick={() => {
                setFormSignos({});
                setMostrarFormSignos(true);
              }}
            >
              + Registrar
            </button>
          )}
        </div>

        {mostrarFormSignos && (
          <form onSubmit={manejarSignos} style={{ marginTop: 12 }}>
            <div className="rejilla-signos">
              <div className="campo">
                <label>Temperatura (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formSignos.temperatura || ''}
                  onChange={(e) => setFormSignos((p) => ({ ...p, temperatura: e.target.value }))}
                  placeholder="37"
                />
              </div>
              <div className="campo">
                <label>Presión sistólica</label>
                <input
                  type="number"
                  value={formSignos.presion_sistolica || ''}
                  onChange={(e) => setFormSignos((p) => ({ ...p, presion_sistolica: e.target.value }))}
                  placeholder="120"
                />
              </div>
              <div className="campo">
                <label>Presión diastólica</label>
                <input
                  type="number"
                  value={formSignos.presion_diastolica || ''}
                  onChange={(e) => setFormSignos((p) => ({ ...p, presion_diastolica: e.target.value }))}
                  placeholder="80"
                />
              </div>
              <div className="campo">
                <label>Frec. cardíaca (lpm)</label>
                <input
                  type="number"
                  value={formSignos.frecuencia_cardiaca || ''}
                  onChange={(e) => setFormSignos((p) => ({ ...p, frecuencia_cardiaca: e.target.value }))}
                  placeholder="75"
                />
              </div>
              <div className="campo">
                <label>Frec. respiratoria (rpm)</label>
                <input
                  type="number"
                  value={formSignos.frecuencia_respiratoria || ''}
                  onChange={(e) => setFormSignos((p) => ({ ...p, frecuencia_respiratoria: e.target.value }))}
                  placeholder="18"
                />
              </div>
              <div className="campo">
                <label>Saturación O₂ (%)</label>
                <input
                  type="number"
                  value={formSignos.saturacion_oxigeno || ''}
                  onChange={(e) => setFormSignos((p) => ({ ...p, saturacion_oxigeno: e.target.value }))}
                  placeholder="98"
                />
              </div>
              <div className="campo">
                <label>Peso (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formSignos.peso || ''}
                  onChange={(e) => setFormSignos((p) => ({ ...p, peso: e.target.value }))}
                  placeholder="70"
                />
              </div>
              <div className="campo">
                <label>Talla (cm)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formSignos.talla || ''}
                  onChange={(e) => setFormSignos((p) => ({ ...p, talla: e.target.value }))}
                  placeholder="170"
                />
              </div>
            </div>
            <div className="campo">
              <label>Notas</label>
              <textarea
                rows={2}
                value={formSignos.notas || ''}
                onChange={(e) => setFormSignos((p) => ({ ...p, notas: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="boton-primario" type="submit" style={{ width: 'auto' }} disabled={enviandoSignos}>
                {enviandoSignos ? 'Guardando…' : 'Guardar signos'}
              </button>
              <button type="button" className="boton-secundario" onClick={() => setMostrarFormSignos(false)}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        {cargandoSignos ? (
          <p className="vacio">Cargando…</p>
        ) : signos.length === 0 ? (
          <p className="vacio">Sin signos vitales registrados.</p>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Temp.</th>
                  <th>Presión</th>
                  <th>F. cardíaca</th>
                  <th>F. respiratoria</th>
                  <th>SpO₂</th>
                  <th>Peso</th>
                  <th>Talla</th>
                  <th>Registró</th>
                </tr>
              </thead>
              <tbody>
                {signos.map((s) => (
                  <tr key={s.id}>
                    <td>{new Date(s.fecha).toLocaleString('es-GT')}</td>
                    <td>{s.temperatura ? `${s.temperatura} °C` : '—'}</td>
                    <td>
                      {s.presion_sistolica || s.presion_diastolica
                        ? `${s.presion_sistolica || '—'}/${s.presion_diastolica || '—'}`
                        : '—'}
                    </td>
                    <td>{s.frecuencia_cardiaca ? `${s.frecuencia_cardiaca} lpm` : '—'}</td>
                    <td>{s.frecuencia_respiratoria ? `${s.frecuencia_respiratoria} rpm` : '—'}</td>
                    <td>{s.saturacion_oxigeno ? `${s.saturacion_oxigeno} %` : '—'}</td>
                    <td>{s.peso ? `${s.peso} kg` : '—'}</td>
                    <td>{s.talla ? `${s.talla} cm` : '—'}</td>
                    <td>{s.registrado_por_nombre || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {puedeRegistrarConsulta && (
        <div className="tarjeta">
          {!mostrarFormulario ? (
            <button className="boton-secundario" onClick={() => setMostrarFormulario(true)}>
              + Registrar nueva consulta
            </button>
          ) : (
            <form onSubmit={manejarEnvio}>
              <h3>Nueva consulta</h3>
              <div className="campo">
                <label>Motivo de consulta</label>
                <input value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
              </div>
              <div className="campo">
                <label>Diagnóstico</label>
                <input value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} />
              </div>
              <div className="campo">
                <label>Notas</label>
                <textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
              </div>
              <div className="form-en-linea">
                <div className="campo">
                  <label>Medicamento recetado (opcional)</label>
                  <input value={medicamento} onChange={(e) => setMedicamento(e.target.value)} />
                </div>
                <div className="campo">
                  <label>Dosis</label>
                  <input value={dosis} onChange={(e) => setDosis(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button className="boton-primario" type="submit" disabled={enviando} style={{ width: 'auto' }}>
                  {enviando ? 'Guardando…' : 'Guardar consulta'}
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
        <h3>
          Órdenes de laboratorio
          {pendientes > 0 && <span className="chip-pendientes">{pendientes} pendiente(s)</span>}
        </h3>

        {puedeSolicitarOrden && (
          mostrarFormOrden ? (
            <form onSubmit={manejarOrden} style={{ marginBottom: 12 }}>
              <div className="form-en-linea">
                <div className="campo">
                  <label>Examen solicitado</label>
                  <input
                    value={examen}
                    onChange={(e) => setExamen(e.target.value)}
                    placeholder="Ej. Hemograma completo"
                    required
                  />
                </div>
                <div className="campo">
                  <label>Indicaciones</label>
                  <input
                    value={indicaciones}
                    onChange={(e) => setIndicaciones(e.target.value)}
                    placeholder="Ej. Ayuno de 8 horas"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="boton-primario"
                  type="submit"
                  style={{ width: 'auto' }}
                  disabled={enviandoOrden}
                >
                  {enviandoOrden ? 'Solicitando…' : 'Solicitar examen'}
                </button>
                <button type="button" className="boton-secundario" onClick={() => setMostrarFormOrden(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button className="boton-secundario" style={{ marginBottom: 12 }} onClick={() => setMostrarFormOrden(true)}>
              + Solicitar examen de laboratorio
            </button>
          )
        )}

        {ordenes.length === 0 ? (
          <p className="vacio">Sin órdenes de laboratorio.</p>
        ) : (
          ordenes.map((o) => (
            <div className="orden-item" key={o.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{o.examen}</strong>
                <span className={`insignia-orden ${o.estado}`}>{ETIQUETA_ORDEN[o.estado]}</span>
              </div>
              <p style={{ margin: '4px 0' }}>
                Solicitado por {o.medico_nombre} el {new Date(o.fecha_solicitud).toLocaleDateString('es-GT')}
              </p>
              {o.indicaciones && (
                <p style={{ margin: '4px 0' }}>
                  <strong>Indicaciones:</strong> {o.indicaciones}
                </p>
              )}

              {o.estado === 'completada' ? (
                <div className="resultado-caja">
                  <strong>Resultado:</strong>
                  <p style={{ margin: '4px 0 0' }}>{o.resultado || 'Sin detalle del resultado.'}</p>
                  {o.archivo_nombre && (
                    <button
                      type="button"
                      className="boton-secundario"
                      style={{ marginTop: 8 }}
                      onClick={() => abrirArchivoAdjunto(token, o.id).catch((e) => alert(e.message))}
                    >
                      Ver archivo adjunto ({o.archivo_nombre})
                    </button>
                  )}
                </div>
              ) : puedeRegistrarResultado && resultadoAbierto === o.id ? (
                <div style={{ marginTop: 6 }}>
                  <div className="campo">
                    <label>Resultado del examen</label>
                    <textarea
                      rows={3}
                      value={resultadoTexto}
                      onChange={(e) => setResultadoTexto(e.target.value)}
                      placeholder="Escribe los valores o la interpretación…"
                    />
                  </div>
                  <div className="campo">
                    <label>Adjuntar archivo (PDF, PNG o JPG)</label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => seleccionarResultadoArchivo(e, o)}
                    />
                    {resultadoArchivo && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--verde-ok)' }}>{resultadoArchivo.nombre}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className="boton-primario"
                      type="button"
                      style={{ width: 'auto' }}
                      onClick={() => manejarResultado(o.id)}
                    >
                      Guardar resultado
                    </button>
                    <button
                      className="boton-secundario"
                      type="button"
                      onClick={() => {
                        setResultadoAbierto(null);
                        setResultadoTexto('');
                        setResultadoArchivo(null);
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : puedeRegistrarResultado ? (
                <button
                  className="boton-secundario"
                  style={{ marginTop: 4 }}
                        onClick={() => {
                          setResultadoAbierto(o.id);
                          setResultadoTexto(o.resultado || '');
                          setResultadoArchivo(null);
                        }}
                >
                  Registrar resultado
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>

      <h3 style={{ marginTop: 24 }}>Historial de consultas</h3>
      {expediente.consultas.length === 0 ? (
        <p className="vacio">Todavía no hay consultas registradas.</p>
      ) : (
        expediente.consultas.map((c) => (
          <div className="tarjeta tarjeta-consulta" key={c.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{c.motivo}</strong>
              <span style={{ color: 'var(--gris-texto)', fontSize: '0.85rem' }}>
                {new Date(c.fecha).toLocaleDateString('es-GT')}
              </span>
            </div>
            <p style={{ margin: '6px 0' }}>
              Atendido por {c.medico_nombre} · {c.especialidad || 'Medicina General'}
            </p>
            {c.diagnostico && (
              <p>
                <strong>Diagnóstico:</strong> {c.diagnostico}
              </p>
            )}
            {c.notas && <p>{c.notas}</p>}
            {c.recetas.length > 0 && (
              <div>
                <strong>Receta:</strong>
                <ul style={{ margin: '4px 0 0 18px', color: 'var(--gris-texto)' }}>
                  {c.recetas.map((r) => (
                    <li key={r.id}>
                      {r.medicamento} {r.dosis ? `— ${r.dosis}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}