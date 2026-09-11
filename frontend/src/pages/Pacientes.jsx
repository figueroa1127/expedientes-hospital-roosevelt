import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const TIPOS_SANGRE = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export default function Pacientes() {
  const { token, usuario } = useAuth();
  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState(null);
  const [formulario, setFormulario] = useState({});
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  useEffect(() => {
    api
      .pacientes(token)
      .then(setPacientes)
      .finally(() => setCargando(false));
  }, [token]);

  const filtrados = pacientes.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const puedeVerExpediente = ['medico', 'enfermeria', 'administrador'].includes(usuario.rol);
  const puedeEditar = ['admision', 'administrador'].includes(usuario.rol);

  function abrirEdicion(p) {
    setError('');
    setExito('');
    setEditando(p);
    setFormulario({
      dpi: p.dpi || '',
      fecha_nacimiento: p.fecha_nacimiento || '',
      telefono: p.telefono || '',
      direccion: p.direccion || '',
      tipo_sangre: p.tipo_sangre || '',
    });
  }

  async function guardarDatos(e) {
    e.preventDefault();
    setError('');
    setExito('');
    try {
      await api.actualizarPaciente(token, editando.id, formulario);
      const res = await api.pacientes(token);
      setPacientes(res);
      setExito('Datos del paciente actualizados correctamente.');
      setEditando(null);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="encabezado-pagina">
        <h1>Pacientes</h1>
        <p>Listado de pacientes registrados en el sistema.</p>
      </div>

      <div className="campo" style={{ maxWidth: 320 }}>
        <input
          placeholder="Buscar por nombre…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {editando && (
        <div className="tarjeta">
          <h3>Editar datos de {editando.nombre}</h3>
          <p>Actualiza la ficha demográfica del paciente.</p>
          {error && <div className="mensaje-error">{error}</div>}
          <form onSubmit={guardarDatos}>
            <div className="form-en-linea">
              <div className="campo">
                <label>DPI</label>
                <input
                  value={formulario.dpi}
                  onChange={(e) => setFormulario({ ...formulario, dpi: e.target.value })}
                />
              </div>
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
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Tipo de sangre</th>
                <th>Teléfono</th>
                {puedeVerExpediente && <th></th>}
                {puedeEditar && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td>{p.correo}</td>
                  <td>{p.tipo_sangre || '—'}</td>
                  <td>{p.telefono || '—'}</td>
                  {puedeVerExpediente && (
                    <td>
                      <Link className="boton-secundario" to={`/pacientes/${p.id}`}>
                        Ver expediente
                      </Link>
                    </td>
                  )}
                  {puedeEditar && (
                    <td>
                      <button className="boton-secundario" onClick={() => abrirEdicion(p)}>
                        Editar
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