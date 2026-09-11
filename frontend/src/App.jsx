import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RutaProtegida from './components/RutaProtegida';
import Layout from './components/Layout';

import Login from './pages/Login';
import Resumen from './pages/Resumen';
import Pacientes from './pages/Pacientes';
import ExpedienteDetalle from './pages/ExpedienteDetalle';
import MiExpediente from './pages/MiExpediente';
import Citas from './pages/Citas';
import Usuarios from './pages/Usuarios';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <RutaProtegida>
                <Layout />
              </RutaProtegida>
            }
          >
            <Route path="/" element={<Resumen />} />
            <Route
              path="/pacientes"
              element={
                <RutaProtegida rolesPermitidos={['medico', 'enfermeria', 'admision', 'administrador']}>
                  <Pacientes />
                </RutaProtegida>
              }
            />
            <Route
              path="/pacientes/:id"
              element={
                <RutaProtegida rolesPermitidos={['medico', 'enfermeria', 'administrador']}>
                  <ExpedienteDetalle />
                </RutaProtegida>
              }
            />
            <Route
              path="/mi-expediente"
              element={
                <RutaProtegida rolesPermitidos={['paciente']}>
                  <MiExpediente />
                </RutaProtegida>
              }
            />
            <Route path="/citas" element={<Citas />} />
            <Route
              path="/usuarios"
              element={
                <RutaProtegida rolesPermitidos={['administrador']}>
                  <Usuarios />
                </RutaProtegida>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
