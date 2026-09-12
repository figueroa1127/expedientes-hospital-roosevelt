import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import VistaExpediente from '../components/VistaExpediente';

export default function ExpedienteDetalle() {
  const { id } = useParams();
  const { token, usuario } = useAuth();
  const [expediente, setExpediente] = useState(null);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    setCargando(true);
    const res = await api.expedienteDePaciente(token, id);
    setExpediente(res);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function manejarNuevaConsulta(datos) {
    await api.agregarConsulta(token, expediente.id, datos);
    await cargar();
  }

  async function manejarActualizarAntecedentes(datos) {
    await api.actualizarExpediente(token, expediente.id, datos);
    await cargar();
  }

  return (
    <div>
      <div className="encabezado-pagina">
        <Link to="/pacientes" style={{ fontSize: '0.85rem' }}>
          ← Volver a pacientes
        </Link>
        <h1>Expediente médico</h1>
      </div>

      {cargando ? (
        <p className="cargando">Cargando expediente…</p>
      ) : (
        <VistaExpediente
          expediente={expediente}
          puedeRegistrarConsulta={usuario.rol === 'medico'}
          puedeEditarAntecedentes={['medico', 'enfermeria', 'administrador'].includes(usuario.rol)}
          onAgregarConsulta={manejarNuevaConsulta}
          onActualizarAntecedentes={manejarActualizarAntecedentes}
        />
      )}
    </div>
  );
}
