import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import RutaProtegida from './components/RutaProtegida';
import Layout from './components/Layout';

import Login from './pages/Login';
import Resumen from './pages/Resumen';
import Dashboard from './pages/Dashboard';
import Pacientes from './pages/Pacientes';
import ExpedienteDetalle from './pages/ExpedienteDetalle';
import MiExpediente from './pages/MiExpediente';
import Citas from './pages/Citas';
import Laboratorio from './pages/Laboratorio';
import SignosVitales from './pages/SignosVitales';
import Usuarios from './pages/Usuarios';

function Inicio() {
  const { usuario } = useAuth();
  if (usuario?.rol === 'enfermeria') return <Navigate to="/pacientes" replace />;
  return <Resumen />;
}

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
            <Route path="/" element={<Inicio />} />
            <Route
              path="/dashboard"
              element={
                <RutaProtegida rolesPermitidos={['medico', 'admision', 'administrador']}>
                  <Dashboard />
                </RutaProtegida>
              }
            />
            <Route
              path="/laboratorio"
              element={
                <RutaProtegida rolesPermitidos={['medico', 'enfermeria', 'administrador']}>
                  <Laboratorio />
                </RutaProtegida>
              }
            />
            <Route
              path="/signos"
              element={
                <RutaProtegida rolesPermitidos={['medico', 'enfermeria', 'administrador']}>
                  <SignosVitales />
                </RutaProtegida>
              }
            />
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
            <Route
              path="/citas"
              element={
                <RutaProtegida rolesPermitidos={['medico', 'admision', 'administrador', 'paciente']}>
                  <Citas />
                </RutaProtegida>
              }
            />
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
