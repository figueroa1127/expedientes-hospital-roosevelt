import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ENLACES_POR_ROL = {
  administrador: [
    { to: '/', etiqueta: 'Resumen' },
    { to: '/dashboard', etiqueta: 'Panel de control' },
    { to: '/pacientes', etiqueta: 'Pacientes' },
    { to: '/laboratorio', etiqueta: 'Laboratorio' },
    { to: '/citas', etiqueta: 'Citas' },
    { to: '/usuarios', etiqueta: 'Usuarios' },
  ],
  admision: [
    { to: '/', etiqueta: 'Resumen' },
    { to: '/dashboard', etiqueta: 'Panel de control' },
    { to: '/pacientes', etiqueta: 'Pacientes' },
    { to: '/citas', etiqueta: 'Citas' },
  ],
  enfermeria: [
    { to: '/', etiqueta: 'Resumen' },
    { to: '/dashboard', etiqueta: 'Panel de control' },
    { to: '/pacientes', etiqueta: 'Pacientes' },
    { to: '/laboratorio', etiqueta: 'Laboratorio' },
    { to: '/citas', etiqueta: 'Citas' },
  ],
  medico: [
    { to: '/', etiqueta: 'Resumen' },
    { to: '/dashboard', etiqueta: 'Panel de control' },
    { to: '/pacientes', etiqueta: 'Pacientes' },
    { to: '/laboratorio', etiqueta: 'Laboratorio' },
    { to: '/citas', etiqueta: 'Mi agenda' },
  ],
  paciente: [
    { to: '/', etiqueta: 'Resumen' },
    { to: '/mi-expediente', etiqueta: 'Mi expediente' },
    { to: '/citas', etiqueta: 'Mis citas' },
  ],
};

const ICONOS = {
  '/': (
    <>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v10h14V10" />
    </>
  ),
  '/dashboard': (
    <>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </>
  ),
  '/pacientes': (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.2 2.5-5.8 5.5-5.8s5.5 2.6 5.5 5.8" />
      <path d="M16 5a3 3 0 0 1 0 6" />
      <path d="M17.5 14.4c1.9.7 3 2.4 3 4.4" />
    </>
  ),
  '/laboratorio': (
    <>
      <path d="M9 3h6" />
      <path d="M10 3v6l-5 8a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-8V3" />
      <path d="M7.2 15h9.6" />
    </>
  ),
  '/citas': (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 9.5h18" />
      <path d="M8 3v4M16 3v4" />
    </>
  ),
  '/usuarios': (
    <>
      <path d="M12 3l7 3v5c0 4.3-3 8-7 10-4-2-7-5.7-7-10V6z" />
      <path d="M9.3 12l2 2 3.4-3.6" />
    </>
  ),
  '/mi-expediente': (
    <>
      <path d="M6 3h7l5 5v13H6z" />
      <path d="M13 3v5h5" />
      <path d="M9 13h6M9 17h6" />
    </>
  ),
};

function Icono({ to }) {
  return (
    <svg
      className="icono-nav"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONOS[to] || ICONOS['/']}
    </svg>
  );
}

function iniciales(nombre = '') {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function Layout() {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const enlaces = ENLACES_POR_ROL[usuario?.rol] || [];

  function salir() {
    cerrarSesion();
    navigate('/login');
  }

  return (
    <div className="app-layout">
      <aside className="barra-lateral">
        <div className="marca">
          <span className="marca-icono">+</span>
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
              <Icono to={enlace.to} />
              {enlace.etiqueta}
            </NavLink>
          ))}
        </nav>
        <div className="perfil-usuario">
          <span className="perfil-avatar">{iniciales(usuario?.nombre)}</span>
          <span className="perfil-datos">
            <strong>{usuario?.nombre}</strong>
            <span className="rol">{usuario?.rol}</span>
          </span>
        </div>
        <button className="boton-salir" onClick={salir}>
          Cerrar sesión
        </button>
      </aside>
      <main className="contenido">
        <div className="contenido-pagina" key={location.pathname}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
