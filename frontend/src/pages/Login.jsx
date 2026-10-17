import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CUENTAS_DEMO = [
  { rol: 'Administrador', correo: 'admin@hospitalroosevelt.gt', password: 'Admin123!' },
  { rol: 'Admisión', correo: 'admision@hospitalroosevelt.gt', password: 'Admision123!' },
  { rol: 'Enfermería', correo: 'enfermeria@hospitalroosevelt.gt', password: 'Enfermeria123!' },
  { rol: 'Médico', correo: 'medico@hospitalroosevelt.gt', password: 'Medico123!' },
  { rol: 'Paciente', correo: 'paciente@hospitalroosevelt.gt', password: 'Paciente123!' },
];

const TIPOS_SANGRE = ['', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const REGISTRO_VACIO = {
  nombre: '',
  correo: '',
  password: '',
  confirmar: '',
  dpi: '',
  fecha_nacimiento: '',
  telefono: '',
  direccion: '',
  tipo_sangre: '',
};

export default function Login() {
  const [modo, setModo] = useState('login');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [registro, setRegistro] = useState(REGISTRO_VACIO);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const { iniciarSesion, registrar } = useAuth();
  const navigate = useNavigate();

  function cambiarModo(nuevo) {
    setError('');
    setModo(nuevo);
  }

  function actualizarCampo(campo, valor) {
    setRegistro((prev) => ({ ...prev, [campo]: valor }));
  }

  async function manejarEnvio(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await iniciarSesion(correo, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function manejarRegistro(e) {
    e.preventDefault();
    setError('');

    if (registro.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (registro.password !== registro.confirmar) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setCargando(true);
    try {
      const { confirmar, ...datos } = registro;
      await registrar(datos);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  function usarCuentaDemo(c) {
    setCorreo(c.correo);
    setPassword(c.password);
  }

  return (
    <div className="pantalla-login">
      <div className="login-lateral">
        <div className="marca">
          <span className="marca-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 6v12M6 12h12" />
            </svg>
          </span>
          Hospital Roosevelt
        </div>
        <div className="login-centro">
          <h1>Expediente médico digital</h1>
          <p>
            Un solo lugar para el historial clínico, las consultas y las citas de cada paciente,
            con acceso diferenciado para personal médico, administrativo y pacientes.
          </p>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
          Guatemala, Guatemala · Sistema de expedientes médicos digitales
        </p>
      </div>

      <div className="login-formulario">
        <div className="tarjeta-login">
          <h2>{modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta de paciente'}</h2>
          <p className="subtitulo">
            {modo === 'login'
              ? 'Ingresa con tu correo institucional.'
              : 'Regístrate para consultar tu expediente y tus citas.'}
          </p>

          {error && <div className="mensaje-error">{error}</div>}

          {modo === 'login' ? (
            <>
              <form onSubmit={manejarEnvio}>
                <div className="campo">
                  <label htmlFor="correo">Correo electrónico</label>
                  <input
                    id="correo"
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="nombre@hospitalroosevelt.gt"
                    required
                  />
                </div>
                <div className="campo">
                  <label htmlFor="password">Contraseña</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button className="boton-primario" type="submit" disabled={cargando}>
                  {cargando ? 'Ingresando…' : 'Ingresar'}
                </button>
              </form>

              <div className="cuentas-demo">
                <strong>Cuentas de demostración</strong> (clic para autocompletar):
                <div style={{ marginTop: 8 }}>
                  {CUENTAS_DEMO.map((c) => (
                    <button key={c.correo} className="chip-rol" onClick={() => usarCuentaDemo(c)} type="button">
                      {c.rol}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <form onSubmit={manejarRegistro}>
              <div className="campo">
                <label htmlFor="nombre">Nombre completo</label>
                <input
                  id="nombre"
                  type="text"
                  value={registro.nombre}
                  onChange={(e) => actualizarCampo('nombre', e.target.value)}
                  placeholder="Nombre y apellidos"
                  required
                />
              </div>
              <div className="campo">
                <label htmlFor="correo-reg">Correo electrónico</label>
                <input
                  id="correo-reg"
                  type="email"
                  value={registro.correo}
                  onChange={(e) => actualizarCampo('correo', e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  required
                />
              </div>
              <div className="rejilla-campos">
                <div className="campo">
                  <label htmlFor="password-reg">Contraseña</label>
                  <input
                    id="password-reg"
                    type="password"
                    value={registro.password}
                    onChange={(e) => actualizarCampo('password', e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                </div>
                <div className="campo">
                  <label htmlFor="confirmar">Confirmar contraseña</label>
                  <input
                    id="confirmar"
                    type="password"
                    value={registro.confirmar}
                    onChange={(e) => actualizarCampo('confirmar', e.target.value)}
                    placeholder="Repite la contraseña"
                    required
                  />
                </div>
              </div>
              <div className="rejilla-campos">
                <div className="campo">
                  <label htmlFor="telefono">Teléfono</label>
                  <input
                    id="telefono"
                    type="tel"
                    value={registro.telefono}
                    onChange={(e) => actualizarCampo('telefono', e.target.value)}
                    placeholder="Ej. 5555-5555"
                  />
                </div>
                <div className="campo">
                  <label htmlFor="fecha_nacimiento">Fecha de nacimiento</label>
                  <input
                    id="fecha_nacimiento"
                    type="date"
                    value={registro.fecha_nacimiento}
                    onChange={(e) => actualizarCampo('fecha_nacimiento', e.target.value)}
                  />
                </div>
              </div>
              <div className="rejilla-campos">
                <div className="campo">
                  <label htmlFor="dpi">DPI (opcional)</label>
                  <input
                    id="dpi"
                    type="text"
                    value={registro.dpi}
                    onChange={(e) => actualizarCampo('dpi', e.target.value)}
                    placeholder="Documento de identificación"
                  />
                </div>
                <div className="campo">
                  <label htmlFor="tipo_sangre">Tipo de sangre</label>
                  <select
                    id="tipo_sangre"
                    value={registro.tipo_sangre}
                    onChange={(e) => actualizarCampo('tipo_sangre', e.target.value)}
                  >
                    {TIPOS_SANGRE.map((t) => (
                      <option key={t || 'vacio'} value={t}>
                        {t || 'Selecciona…'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="campo">
                <label htmlFor="direccion">Dirección</label>
                <input
                  id="direccion"
                  type="text"
                  value={registro.direccion}
                  onChange={(e) => actualizarCampo('direccion', e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <button className="boton-primario" type="submit" disabled={cargando}>
                {cargando ? 'Creando cuenta…' : 'Registrarme'}
              </button>
            </form>
          )}

          <div className="cambiar-modo">
            {modo === 'login' ? (
              <>
                ¿No tienes cuenta?{' '}
                <button type="button" className="enlace-cambiar" onClick={() => cambiarModo('registro')}>
                  Regístrate
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{' '}
                <button type="button" className="enlace-cambiar" onClick={() => cambiarModo('login')}>
                  Inicia sesión
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
