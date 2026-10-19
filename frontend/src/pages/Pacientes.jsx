import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const TIPOS_SANGRE = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const GENEROS = ['', 'Masculino', 'Femenino', 'Otro', 'Prefiero no decir'];

function edadDe(fecha) {
  if (!fecha) return null;
  const n = new Date(fecha);
  if (Number.isNaN(n.getTime())) return null;
  const hoy = new Date();
  let e = hoy.getFullYear() - n.getFullYear();
  const m = hoy.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) e--;
  return e >= 0 ? e : null;
}

const NUEVO_VACIO = {
  dpi: '',
  nombre: '',
  correo: '',
  password: '',
  genero: '',
  registro_medico: '',
  fecha_nacimiento: '',
  telefono: '',
  tipo_sangre: '',
  direccion: '',
};

export default function Pacientes() {
  const { token, usuario } = useAuth();
  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState(null);
  const [formulario, setFormulario] = useState({});
  const [creando, setCreando] = useState(false);
  const [nuevo, setNuevo] = useState({});
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  async function cargar() {
    setPacientes(await api.pacientes(token));
  }

  useEffect(() => {
    api
      .pacientes(token)
      .then(setPacientes)
      .finally(() => setCargando(false));
  }, [token]);

  const termino = busqueda.trim().toLowerCase();
  const filtrados = pacientes.filter(
    (p) =>
      p.nombre.toLowerCase().includes(termino) ||
      (p.dpi || '').toLowerCase().includes(termino)
  );

  const puedeVerExpediente = ['medico', 'enfermeria', 'administrador'].includes(usuario.rol);
  const puedeEditar = ['admision', 'administrador'].includes(usuario.rol);

  function abrirEdicion(p) {
    setError('');
    setExito('');
    setCreando(false);
    setEditando(p);
    setFormulario({
      nombre: p.nombre || '',
      dpi: p.dpi || '',
      registro_medico: p.registro_medico || '',
      genero: p.genero || '',
      fecha_nacimiento: p.fecha_nacimiento || '',
      telefono: p.telefono || '',
      direccion: p.direccion || '',
      tipo_sangre: p.tipo_sangre || '',
    });
  }

  function abrirCreacion() {
    setError('');
    setExito('');
    setEditando(null);
    setNuevo({});
    setCreando(true);
  }

  async function guardarDatos(e) {
    e.preventDefault();
    setError('');
    setExito('');
    try {
      await api.actualizarPaciente(token, editando.id, formulario);
      await cargar();
      setExito('Datos del paciente actualizados correctamente.');
      setEditando(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function registrarPaciente(e) {
    e.preventDefault();
    setError('');
    setExito('');
    try {
      await api.registrarPaciente(token, nuevo);
      await cargar();
      setExito('Paciente registrado correctamente.');
      setCreando(false);
      setNuevo({});
    } catch (err) {
      setError(err.message);
    }
  }

  function edad(fecha) {
    const e = edadDe(fecha);
    return e === null ? '—' : `${e} años`;
  }

  return (
    <div>
      <div className="encabezado-pagina">
        <h1>{usuario.rol === 'medico' ? 'Registro médico' : 'Pacientes'}</h1>
        <p>Listado de pacientes registrados en el sistema.</p>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <div className="campo" style={{ maxWidth: 320, margin: 0, flex: 1 }}>
          <input
            placeholder="Buscar por nombre o número de DPI…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        {puedeEditar && (
          <button className="boton-secundario" onClick={abrirCreacion}>
            + Registrar paciente
          </button>
        )}
      </div>

      {creando && (
        <div className="tarjeta">
          <h3>Registrar nuevo paciente</h3>
          <p>Crea la cuenta y la ficha clínica del paciente.</p>
          {error && <div className="mensaje-error">{error}</div>}
          <form onSubmit={registrarPaciente}>
            <div className="rejilla-campos">
              <div className="campo">
                <label>DPI</label>
                <input
                  value={nuevo.dpi || ''}
                  onChange={(e) => setNuevo({ ...nuevo, dpi: e.target.value })}
                  required
                />
              </div>
              <div className="campo">
                <label>Nombre completo</label>
                <input
                  value={nuevo.nombre || ''}
                  onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="rejilla-campos">
              <div className="campo">
                <label>Correo electrónico</label>
                <input
                  type="email"
                  value={nuevo.correo || ''}
                  onChange={(e) => setNuevo({ ...nuevo, correo: e.target.value })}
                  required
                />
              </div>
              <div className="campo">
                <label>Contraseña temporal</label>
                <input
                  type="text"
                  value={nuevo.password || ''}
                  onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>
            </div>
            <div className="rejilla-campos">
              <div className="campo">
                <label>Género</label>
                <select
                  value={nuevo.genero || ''}
                  onChange={(e) => setNuevo({ ...nuevo, genero: e.target.value })}
                >
                  {GENEROS.map((g) => (
                    <option key={g || 'vacio'} value={g}>
                      {g || 'Selecciona…'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label>Registro médico</label>
                <input
                  value={nuevo.registro_medico || ''}
                  onChange={(e) => setNuevo({ ...nuevo, registro_medico: e.target.value })}
                  placeholder="Número de registro o expediente"
                />
              </div>
            </div>
            <div className="rejilla-campos">
              <div className="campo">
                <label>Fecha de nacimiento</label>
                <input
                  type="date"
                  value={nuevo.fecha_nacimiento || ''}
                  onChange={(e) => setNuevo({ ...nuevo, fecha_nacimiento: e.target.value })}
                />
              </div>
              <div className="campo">
                <label>Edad</label>
                <input value={edad(nuevo.fecha_nacimiento)} readOnly />
              </div>
            </div>
            <div className="rejilla-campos">
              <div className="campo">
                <label>Teléfono</label>
                <input
                  value={nuevo.telefono || ''}
                  onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })}
                />
              </div>
              <div className="campo">
                <label>Tipo de sangre</label>
                <select
                  value={nuevo.tipo_sangre || ''}
                  onChange={(e) => setNuevo({ ...nuevo, tipo_sangre: e.target.value })}
                >
                  <option value="">— Sin asignar —</option>
                  {TIPOS_SANGRE.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="campo">
              <label>Dirección</label>
              <input
                value={nuevo.direccion || ''}
                onChange={(e) => setNuevo({ ...nuevo, direccion: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button className="boton-primario" type="submit" style={{ width: 'auto' }}>
                Registrar paciente
              </button>
              <button type="button" className="boton-secundario" onClick={() => setCreando(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {editando && (
        <div className="tarjeta">
          <h3>Editar datos de {editando.nombre}</h3>
          <p>Actualiza la ficha demográfica del paciente.</p>
          {error && <div className="mensaje-error">{error}</div>}
          <form onSubmit={guardarDatos}>
            <div className="form-en-linea">
              <div className="campo">
                <label>Nombre completo</label>
                <input
                  value={formulario.nombre || ''}
                  onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
                />
              </div>
              <div className="campo">
                <label>DPI</label>
                <input
                  value={formulario.dpi}
                  onChange={(e) => setFormulario({ ...formulario, dpi: e.target.value })}
                />
              </div>
              <div className="campo">
                <label>Registro médico</label>
                <input
                  value={formulario.registro_medico || ''}
                  onChange={(e) => setFormulario({ ...formulario, registro_medico: e.target.value })}
                />
              </div>
              <div className="campo">
                <label>Género</label>
                <select
                  value={formulario.genero || ''}
                  onChange={(e) => setFormulario({ ...formulario, genero: e.target.value })}
                >
                  {GENEROS.map((g) => (
                    <option key={g || 'vacio'} value={g}>
                      {g || '— Sin asignar —'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-en-linea">
              <div className="campo">
                <label>Fecha de nacimiento</label>
                <input
                  type="date"
                  value={formulario.fecha_nacimiento}
                  onChange={(e) =>
                    setFormulario({ ...formulario, fecha_nacimiento: e.target.value })
                  }
                />
              </div>
              <div className="campo">
                <label>Edad</label>
                <input value={edad(formulario.fecha_nacimiento)} readOnly />
              </div>
              <div className="campo">
                <label>Teléfono</label>
                <input
                  value={formulario.telefono}
                  onChange={(e) => setFormulario({ ...formulario, telefono: e.target.value })}
                />
              </div>
              <div className="campo">
                <label>Tipo de sangre</label>
                <select
                  value={formulario.tipo_sangre}
                  onChange={(e) => setFormulario({ ...formulario, tipo_sangre: e.target.value })}
                >
                  <option value="">— Sin asignar —</option>
                  {TIPOS_SANGRE.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="campo">
              <label>Dirección</label>
              <textarea
                value={formulario.direccion}
                onChange={(e) => setFormulario({ ...formulario, direccion: e.target.value })}
                rows={2}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button className="boton-primario" type="submit" style={{ width: 'auto' }}>
                Guardar cambios
              </button>
              <button
                type="button"
                className="boton-secundario"
                onClick={() => setEditando(null)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {exito && <div style={{ color: 'var(--verde-ok)', marginBottom: 12 }}>{exito}</div>}

      <div className="tarjeta">
        {cargando ? (
          <p className="vacio">Cargando pacientes…</p>
        ) : filtrados.length === 0 ? (
          <p className="vacio">No se encontraron pacientes.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>DPI</th>
                  <th>Registro médico</th>
                  <th>Nombre</th>
                  <th>Edad</th>
                  <th>Género</th>
                  <th>Correo</th>
                  <th>Tipo de sangre</th>
                  <th>Teléfono</th>
                  {(puedeVerExpediente || puedeEditar) && <th />}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => (
                  <tr key={p.id}>
                    <td>{p.dpi || '—'}</td>
                    <td>{p.registro_medico || '—'}</td>
                    <td>{p.nombre}</td>
                    <td>{edad(p.fecha_nacimiento)}</td>
                    <td>{p.genero || '—'}</td>
                    <td>{p.correo}</td>
                    <td>{p.tipo_sangre || '—'}</td>
                    <td>{p.telefono || '—'}</td>
                    {(puedeVerExpediente || puedeEditar) && (
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {puedeVerExpediente && (
                          <Link className="boton-secundario" to={`/pacientes/${p.id}`}>
                            Ver expediente
                          </Link>
                        )}{' '}
                        {puedeEditar && (
                          <button className="boton-secundario" onClick={() => abrirEdicion(p)}>
                            Editar
                          </button>
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

