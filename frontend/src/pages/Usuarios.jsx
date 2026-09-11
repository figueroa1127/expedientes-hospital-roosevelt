import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const ROLES = [
  { valor: 'paciente', etiqueta: 'Paciente' },
  { valor: 'medico', etiqueta: 'Médico' },
  { valor: 'enfermeria', etiqueta: 'Enfermería' },
  { valor: 'admision', etiqueta: 'Admisión' },
  { valor: 'administrador', etiqueta: 'Administrador' },
];

export default function Usuarios() {
  const { token } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [error, setError] = useState('');

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('paciente');

  async function cargar() {
    setCargando(true);
    const res = await api.usuarios(token);
    setUsuarios(res);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function manejarEnvio(e) {
    e.preventDefault();
    setError('');
    try {
      await api.crearUsuario(token, { nombre, correo, password, rol });
      setNombre('');
      setCorreo('');
      setPassword('');
      setRol('paciente');
      setMostrarFormulario(false);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="encabezado-pagina">
        <h1>Usuarios</h1>
        <p>Crea y administra las cuentas de personal y pacientes.</p>
      </div>

      <div className="tarjeta">
        {!mostrarFormulario ? (
          <button className="boton-secundario" onClick={() => setMostrarFormulario(true)}>
            + Crear usuario
          </button>
        ) : (
          <form onSubmit={manejarEnvio}>
            {error && <div className="mensaje-error">{error}</div>}
            <div className="form-en-linea">
              <div className="campo">
                <label>Nombre completo</label>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </div>
              <div className="campo">
                <label>Correo</label>
                <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
              </div>
              <div className="campo">
                <label>Contraseña temporal</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="campo">
                <label>Rol</label>
                <select value={rol} onChange={(e) => setRol(e.target.value)}>
                  {ROLES.map((r) => (
                    <option key={r.valor} value={r.valor}>
                      {r.etiqueta}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button className="boton-primario" type="submit" style={{ width: 'auto' }}>
                Crear cuenta
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

      <div className="tarjeta">
        {cargando ? (
          <p className="vacio">Cargando usuarios…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>{u.nombre}</td>
                  <td>{u.correo}</td>
                  <td style={{ textTransform: 'capitalize' }}>{u.rol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
