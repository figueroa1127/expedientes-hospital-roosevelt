import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('hrv_token'));
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!token) {
      setCargando(false);
      return;
    }
    api
      .perfil(token)
      .then((res) => setUsuario(res.usuario))
      .catch(() => {
        setToken(null);
        localStorage.removeItem('hrv_token');
      })
      .finally(() => setCargando(false));
  }, [token]);

  async function iniciarSesion(correo, password) {
    const res = await api.login(correo, password);
    localStorage.setItem('hrv_token', res.token);
    setToken(res.token);
    setUsuario(res.usuario);
    return res.usuario;
  }

  function cerrarSesion() {
    localStorage.removeItem('hrv_token');
    setToken(null);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ token, usuario, cargando, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
