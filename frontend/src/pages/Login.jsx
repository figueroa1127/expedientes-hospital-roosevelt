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

export default function Login() {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();

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

  function usarCuentaDemo(cuenta) {
    setCorreo(cuenta.correo);
    setPassword(cuenta.password);
  }

  return (
    <div className="pantalla-login">
      <div className="login-lateral">
        <div className="marca">
          <span className="marca-icono">+</span>
          Hospital Roosevelt
        </div>
        <div>
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
          <h2>Iniciar sesión</h2>
          <p className="subtitulo">Ingresa con tu correo institucional.</p>

          {error && <div className="mensaje-error">{error}</div>}

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
        </div>
      </div>
    </div>
  );
}
