import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CUENTAS_DEMO = [
  { rol: 'Administrador', correo: 'admin@hospitalroosevelt.gt', password: 'Admin123!' },
  { rol: 'Admisión', correo: 'admision@hospitalroosevelt.gt', password: 'Admision123!' },
  { rol: 'Enfermería', correo: 'enfermeria@hospitalroosevelt.gt', password: 'Enfermeria123!' },
  { rol: 'Laboratorio', correo: 'laboratorio@hospitalroosevelt.gt', password: 'Laboratorio123!' },
  { rol: 'Médico', correo: 'medico@hospitalroosevelt.gt', password: 'Medico123!' },
  { rol: 'Paciente', tipo: 'paciente', dpi: '1234567890101', password: 'Paciente123!' },
];

export default function Login() {
  const [tipoAcceso, setTipoAcceso] = useState('personal');
  const [accionPaciente, setAccionPaciente] = useState('ingresar');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [dpi, setDpi] = useState('');
  const [passwordPaciente, setPasswordPaciente] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const { iniciarSesion, accesoPaciente } = useAuth();
  const navigate = useNavigate();

  function cambiarTipo(nuevo) {
    setError('');
    setTipoAcceso(nuevo);
  }

  function cambiarAccionPaciente(nuevo) {
    setError('');
    setAccionPaciente(nuevo);
  }

  async function manejarEnvio(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      if (tipoAcceso === 'personal') {
        await iniciarSesion(correo, password);
      } else {
        await accesoPaciente(dpi.trim(), passwordPaciente, accionPaciente === 'crear');
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  function usarCuentaDemo(c) {
    setError('');
    if (c.tipo === 'paciente') {
      setTipoAcceso('paciente');
      setAccionPaciente('ingresar');
      setDpi(c.dpi);
      setPasswordPaciente(c.password);
    } else {
      setTipoAcceso('personal');
      setCorreo(c.correo);
      setPassword(c.password);
    }
  }

  const botonSegmento = (activo) => ({
    flex: 1,
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid var(--linea)',
    background: activo ? 'var(--azul-clinico)' : 'transparent',
    color: activo ? '#fff' : 'var(--gris-texto)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.9rem',
  });

  return (
    <div className="pantalla-login">
      <div className="login-lateral">
        <div className="marca">
          <span className="marca-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 6v12M6 12h12" />
            </svg>
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
            <span>Hospital Roosevelt</span>
            <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>Guatemala, Guatemala</span>
            <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>Expediente médico digital</span>
          </div>
        </div>
        <div className="login-centro">
          <h1>Expediente médico digital</h1>
          <p>
            Un solo lugar para el historial clínico, las consultas y las citas de cada paciente,
            con acceso diferenciado para personal médico, administrativo y pacientes.
          </p>
        </div>
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>
          By Edy Figueroa, Joel Castillo
        </p>
      </div>

      <div className="login-formulario">
        <div className="tarjeta-login">
          <h2>{tipoAcceso === 'personal' ? 'Iniciar sesión' : 'Acceso de pacientes'}</h2>
          <p className="subtitulo">
            {tipoAcceso === 'personal'
              ? 'Ingresa con tu correo institucional.'
              : accionPaciente === 'crear'
              ? 'Crea tu acceso usando tu número de DPI.'
              : 'Ingresa con tu número de DPI y contraseña.'}
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button type="button" style={botonSegmento(tipoAcceso === 'personal')} onClick={() => cambiarTipo('personal')}>
              Personal
            </button>
            <button type="button" style={botonSegmento(tipoAcceso === 'paciente')} onClick={() => cambiarTipo('paciente')}>
              Paciente
            </button>
          </div>

          {error && <div className="mensaje-error">{error}</div>}

          {tipoAcceso === 'personal' ? (
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
          ) : (
            <form onSubmit={manejarEnvio}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <button
                  type="button"
                  style={botonSegmento(accionPaciente === 'ingresar')}
                  onClick={() => cambiarAccionPaciente('ingresar')}
                >
                  Ingresar
                </button>
                <button
                  type="button"
                  style={botonSegmento(accionPaciente === 'crear')}
                  onClick={() => cambiarAccionPaciente('crear')}
                >
                  Crear acceso
                </button>
              </div>
              <div className="campo">
                <label htmlFor="dpi">DPI</label>
                <input
                  id="dpi"
                  type="text"
                  value={dpi}
                  onChange={(e) => setDpi(e.target.value)}
                  placeholder="Documento de identificación"
                  required
                />
              </div>
              <div className="campo">
                <label htmlFor="password-paciente">Contraseña</label>
                <input
                  id="password-paciente"
                  type="password"
                  value={passwordPaciente}
                  onChange={(e) => setPasswordPaciente(e.target.value)}
                  placeholder={accionPaciente === 'crear' ? 'Elige una contraseña (mín. 6)' : '••••••••'}
                  required
                />
              </div>
              <button className="boton-primario" type="submit" disabled={cargando}>
                {cargando
                  ? 'Procesando…'
                  : accionPaciente === 'crear'
                  ? 'Crear mi acceso'
                  : 'Ingresar'}
              </button>
            </form>
          )}

          <div className="cuentas-demo">
            <strong>Cuentas de demostración</strong> (clic para autocompletar):
            <div style={{ marginTop: 8 }}>
              {CUENTAS_DEMO.map((c) => (
                <button key={c.correo || c.rol} className="chip-rol" onClick={() => usarCuentaDemo(c)} type="button">
                  {c.rol}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
