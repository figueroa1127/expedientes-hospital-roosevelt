import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import VistaExpediente from '../components/VistaExpediente';

export default function MiExpediente() {
  const { token } = useAuth();
  const [expediente, setExpediente] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api
      .miExpediente(token)
      .then(setExpediente)
      .finally(() => setCargando(false));
  }, [token]);

  return (
    <div>
      <div className="encabezado-pagina">
        <h1>Mi expediente médico</h1>
        <p>Tu historial clínico y las consultas registradas por tus médicos.</p>
      </div>
      {cargando ? (
        <p className="cargando">Cargando…</p>
      ) : (
        <VistaExpediente expediente={expediente} puedeRegistrarConsulta={false} />
      )}
    </div>
  );
}
