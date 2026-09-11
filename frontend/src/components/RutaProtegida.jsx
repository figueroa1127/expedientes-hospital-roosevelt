import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RutaProtegida({ children, rolesPermitidos }) {
  const { usuario, token, cargando } = useAuth();

  if (cargando) return <div className="cargando">Cargando…</div>;
  if (!token || !usuario) return <Navigate to="/login" replace />;

  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
