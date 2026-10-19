import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const FORM_VACIO = {
  paciente_id: '',
  temperatura: '',
  presion_sistolica: '',
  presion_diastolica: '',
  frecuencia_cardiaca: '',
  frecuencia_respiratoria: '',
  saturacion_oxigeno: '',
  peso: '',
  talla: '',
  notas: '',
};

function valor(v, sufijo = '') {
  return v === null || v === undefined || v === '' ? '—' : `${v}${sufijo}`;
}

function presion(s) {
  if (!s.presion_sistolica && !s.presion_diastolica) return '—';
  return `${s.presion_sistolica ?? '—'}/${s.presion_diastolica ?? '—'}`;
}

export default function SignosVitales() {
  const { token, usuario } = useAuth();
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDpi, setBusquedaDpi] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [dpi, setDpi] = useState('');
  const [pacienteSel, setPacienteSel] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [form, setForm] = useState({ paciente_id: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const puedeRegistrar = ['medico', 'enfermeria'].includes(usuario?.rol);

  useEffect(() => {
    let activo = true;
    api
      .signos(token)
      .then((s) => {
        if (!activo) return;
        setRegistros(s);
      })
      .catch((e) => activo && setError(e.message))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [token]);

  function actualizar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function buscarPaciente() {
    setError('');
    setExito('');
    setPacienteSel(null);
    const valor = dpi.trim();
    if (!valor) {
      setError('Ingresa el DPI del paciente.');
      return null;
    }
    setBuscando(true);
    try {
      const p = await api.buscarPacienteDpi(token, valor);
      setPacienteSel(p);
      actualizar('paciente_id', p.id);
      return p;
    } catch (err) {
      setError('No se encontró un paciente con ese DPI.');
      return null;
    } finally {
      setBuscando(false);
    }
  }

  async function guardar(e) {
    e.preventDefault();
    setError('');
    setExito('');
    const p = pacienteSel || (await buscarPaciente());
    if (!p || !form.paciente_id) {
      setError('Busca al paciente por su DPI antes de guardar.');
      return;
    }
    setGuardando(true);
    try {
      await api.crearSignos(token, form);
      const s = await api.signos(token);
      setRegistros(s);
      setForm({ paciente_id: '' });
      setDpi('');
      setPacienteSel(null);
      setAbierto(false);
      setExito('Signos vitales registrados correctamente.');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  const visibles = registros.filter(
    (r) =>
      (r.paciente_nombre || '').toLowerCase().includes(busqueda.toLowerCase()) &&
      (r.paciente_dpi || '').toLowerCase().includes(busquedaDpi.trim().toLowerCase())
  );

  return (
    <div>
      <div className="encabezado-pagina">
        <h1>Signos vitales</h1>
        <p>Registro y seguimiento de temperatura, presión, frecuencia cardíaca y saturación.</p>
      </div>

      {error && <div className="mensaje-error">{error}</div>}
      {exito && <div style={{ color: 'var(--verde-ok)', marginBottom: 12 }}>{exito}</div>}

      {puedeRegistrar && (
        <div className="tarjeta">
          {abierto ? (
            <form onSubmit={guardar}>
              <h3>Registrar signos vitales</h3>
              <div className="campo" style={{ maxWidth: 420 }}>
                <label>Paciente (DPI)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={dpi}
                    onChange={(e) => {
                      setDpi(e.target.value);
                      setPacienteSel(null);
                      actualizar('paciente_id', '');
                    }}
                    placeholder="Número de DPI"
                  />
                  <button
                    type="button"
                    className="boton-secundario"
                    style={{ width: 'auto', whiteSpace: 'nowrap' }}
                    onClick={buscarPaciente}
                    disabled={buscando}
                  >
                    {buscando ? 'Buscando…' : 'Buscar'}
                  </button>
                </div>
                {pacienteSel && (
                  <span style={{ color: 'var(--verde-ok)', fontSize: '0.85rem' }}>
                    Paciente: {pacienteSel.nombre}
                  </span>
                )}
              </div>

              <div className="rejilla-signos">
                <div className="campo">
                  <label>Temperatura (°C)</label>
                  <input type="number" step="0.1" value={form.temperatura || ''} onChange={(e) => actualizar('temperatura', e.target.value)} placeholder="36.5" />
                </div>
                <div className="campo">
                  <label>Presión sistólica (mmHg)</label>
                  <input type="number" value={form.presion_sistolica || ''} onChange={(e) => actualizar('presion_sistolica', e.target.value)} placeholder="120" />
                </div>
                <div className="campo">
                  <label>Presión diastólica (mmHg)</label>
                  <input value={form.presion_diastolica || ''} onChange={(e) => actualizar('presion_diastolica', e.target.value)} placeholder="80" />
                </div>
                <div className="campo">
                  <label>Frec. cardíaca (lpm)</label>
                  <input type="number" value={form.frecuencia_cardiaca} onChange={(e) => actualizar('frecuencia_cardiaca', e.target.value)} placeholder="75" />
                </div>
                <div className="campo">
                  <label>Frec. respiratoria (rpm)</label>
                  <input type="number" value={form.frecuencia_respiratoria} onChange={(e) => actualizar('frecuencia_respiratoria', e.target.value)} placeholder="18" />
                </div>
                <div className="campo">
                  <label>Saturación O₂ (%)</label>
                  <input type="number" value={form.saturacion_oxigeno} onChange={(e) => actualizar('saturacion_oxigeno', e.target.value)} placeholder="98" />
                </div>
                <div className="campo">
                  <label>Peso (kg)</label>
                  <input type="number" step="0.01" value={form.peso} onChange={(e) => actualizar('peso', e.target.value)} placeholder="70" />
                </div>
                <div className="campo">
                  <label>Talla (cm)</label>
                  <input type="number" step="0.01" value={form.talla} onChange={(e) => actualizar('talla', e.target.value)} placeholder="170" />
                </div>
              </div>

              <div className="campo">
                <label>Notas</label>
                <textarea rows={2} value={form.notas || ''} onChange={(e) => actualizar('notas', e.target.value)} placeholder="Observaciones (opcional)" />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="boton-primario" type="submit" style={{ width: 'auto' }} disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Guardar signos vitales'}
                </button>
                <button type="button" className="boton-secundario" onClick={() => setAbierto(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button className="boton-secundario" onClick={() => setAbierto(true)}>
              + Registrar signos vitales
            </button>
          )}
        </div>
      )}

      <div className="tarjeta">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>Registros recientes</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div className="campo" style={{ margin: 0, maxWidth: 220 }}>
              <input placeholder="Filtrar por paciente…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
            <div className="campo" style={{ margin: 0, maxWidth: 200 }}>
              <input placeholder="Filtrar por DPI…" value={busquedaDpi} onChange={(e) => setBusquedaDpi(e.target.value)} />
            </div>
          </div>
        </div>

        {cargando ? (
          <p className="vacio">Cargando registros…</p>
        ) : visibles.length === 0 ? (
          <p className="vacio">Todavía no hay signos vitales registrados.</p>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Paciente</th>
                  <th>DPI</th>
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
                {visibles.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.fecha).toLocaleString('es-GT')}</td>
                    <td>{r.paciente_nombre}</td>
                    <td>{r.paciente_dpi || '—'}</td>
                    <td>{r.temperatura ? `${r.temperatura} °C` : '—'}</td>
                    <td>{r.presion_sistolica || r.presion_diastolica ? `${r.presion_sistolica || '—'}/${r.presion_diastolica || '—'}` : '—'}</td>
                    <td>{r.frecuencia_cardiaca ? `${r.frecuencia_cardiaca} lpm` : '—'}</td>
                    <td>{r.frecuencia_respiratoria ? `${r.frecuencia_respiratoria} rpm` : '—'}</td>
                    <td>{r.saturacion_oxigeno ? `${r.saturacion_oxigeno} %` : '—'}</td>
                    <td>{r.peso ? `${r.peso} kg` : '—'}</td>
                    <td>{r.talla ? `${r.talla} cm` : '—'}</td>
                    <td>{r.registrado_por_nombre || '—'}</td>
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
