import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ENLACES_POR_ROL = {
  administrador: [
    { to: '/', etiqueta: 'Resumen' },
    { to: '/pacientes', etiqueta: 'Pacientes' },
    { to: '/citas', etiqueta: 'Citas' },
    { to: '/usuarios', etiqueta: 'Usuarios' },
  ],
  admision: [
    { to: '/', etiqueta: 'Resumen' },
    { to: '/pacientes', etiqueta: 'Pacientes' },
    { to: '/citas', etiqueta: 'Citas' },
  ],
  enfermeria: [
    { to: '/', etiqueta: 'Resumen' },
    { to: '/pacientes', etiqueta: 'Pacientes' },
    { to: '/citas', etiqueta: 'Citas' },
  ],
  medico: [
    { to: '/', etiqueta: 'Resumen' },
    { to: '/pacientes', etiqueta: 'Pacientes' },
    { to: '/citas', etiqueta: 'Mi agenda' },
  ],
  paciente: [
    { to: '/', etiqueta: 'Resumen' },
    { to: '/mi-expediente', etiqueta: 'Mi expediente' },
    { to: '/citas', etiqueta: 'Mis citas' },
  ],
};

export default function Layout() {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const enlaces = ENLACES_POR_ROL[usuario?.rol] || [];

  function salir() {
    cerrarSesion();
    navigate('/login');
  }

  return (
    <div className="app-layout">
      <aside className="barra-lateral">
        <div className="marca">
          <span className="marca-icono" style={{ color: 'var(--azul-clinico)' }}>
            +
          </span>
          Hospital Roosevelt
        </div>
        <nav>
          {enlaces.map((enlace) => (
            <NavLink
              key={enlace.to}
              to={enlace.to}
              end={enlace.to === '/'}
              className={({ isActive }) => `enlace-nav${isActive ? ' activo' : ''}`}
            >
              {enlace.etiqueta}
            </NavLink>
          ))}
        </nav>
        <div className="perfil-usuario">
          <strong>{usuario?.nombre}</strong>
          <span className="rol">{usuario?.rol}</span>
          <button className="boton-salir" onClick={salir}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}
