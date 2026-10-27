import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const ROLES = [
  { valor: 'paciente', etiqueta: 'Paciente' },
  { valor: 'medico', etiqueta: 'Médico' },
  { valor: 'enfermeria', etiqueta: 'Enfermería' },
  { valor: 'laboratorio', etiqueta: 'Laboratorio' },
  { valor: 'admision', etiqueta: 'Admisión' },
  { valor: 'administrador', etiqueta: 'Administrador' },
];

export default function Usuarios() {
  const { token } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('paciente');

  const [editando, setEditando] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editCorreo, setEditCorreo] = useState('');
  const [editRol, setEditRol] = useState('paciente');
  const [editPassword, setEditPassword] = useState('');
  const [guardando, setGuardando] = useState(false);

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
    setMensaje('');
    try {
      await api.crearUsuario(token, { nombre, correo, password, rol });
      setNombre('');
      setCorreo('');
      setPassword('');
      setRol('paciente');
      setMostrarFormulario(false);
      setMensaje('Usuario creado correctamente.');
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  function abrirEditar(u) {
    setEditando(u);
    setEditNombre(u.nombre || '');
    setEditCorreo(u.correo || '');
    setEditRol(u.rol || 'paciente');
    setEditPassword('');
    setError('');
    setMensaje('');
  }

  function cerrarEditar() {
    setEditando(null);
    setEditPassword('');
  }

  async function guardarEdicion(e) {
    e.preventDefault();
    if (!editando) return;
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const datos = {
        nombre: editNombre,
        correo: editCorreo,
        rol: editRol,
      };
      if (editPassword && editPassword.trim() !== '') {
        datos.password = editPassword;
      }
      await api.actualizarUsuario(token, editando.id, datos);
      setMensaje('Usuario actualizado correctamente.');
      cerrarEditar();
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <div className="encabezado-pagina">
        <h1>Usuarios</h1>
        <p>Crea, edita, cambia rol o restablece contraseña de las cuentas del sistema.</p>
      </div>

      {mensaje && <div className="mensaje-exito">{mensaje}</div>}
      {error && <div className="mensaje-error">{error}</div>}

      <div className="tarjeta">
        {!mostrarFormulario ? (
          <button className="boton-secundario" onClick={() => setMostrarFormulario(true)}>
            + Crear usuario
          </button>
        ) : (
          <form onSubmit={manejarEnvio}>
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
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td>{u.nombre}</td>
                    <td>{u.correo}</td>
                    <td style={{ textTransform: 'capitalize' }}>{u.rol}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="boton-secundario" style={{ width: 'auto', padding: '6px 10px' }} onClick={() => abrirEditar(u)}>
                        Editar / Cambiar contraseña
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editando && (
        <div className="modal-fondo" onClick={cerrarEditar}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-cabecera">
              <h2>Editar usuario</h2>
              <button className="boton-icono" onClick={cerrarEditar}>
                ×
              </button>
            </div>
            <form onSubmit={guardarEdicion}>
              <div className="campo">
                <label>Nombre completo</label>
                <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} required />
              </div>
              <div className="campo">
                <label>Correo</label>
                <input type="email" value={editCorreo} onChange={(e) => setEditCorreo(e.target.value)} required />
              </div>
              <div className="campo">
                <label>Rol</label>
                <select value={editRol} onChange={(e) => setEditRol(e.target.value)}>
                  {ROLES.map((r) => (
                    <option key={r.valor} value={r.valor}>
                      {r.etiqueta}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label>Nueva contraseña (opcional)</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Dejar vacío para no cambiarla"
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button className="boton-primario" type="submit" disabled={guardando} style={{ width: 'auto' }}>
                  {guardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button type="button" className="boton-secundario" onClick={cerrarEditar} style={{ width: 'auto' }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
