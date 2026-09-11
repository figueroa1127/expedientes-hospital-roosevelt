import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const SALUDO_POR_ROL = {
  administrador: 'Panel general del sistema de expedientes médicos digitales.',
  admision: 'Gestiona el ingreso de pacientes y la agenda de citas.',
  enfermeria: 'Consulta expedientes y da seguimiento a las citas del día.',
  medico: 'Revisa tu agenda y registra las consultas de tus pacientes.',
  paciente: 'Consulta tu expediente médico y tus próximas citas.',
};

export default function Resumen() {
  const { usuario, token } = useAuth();
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const citasRes = await api.citas(token);
        if (!activo) return;
        setCitas(citasRes);

        if (['medico', 'enfermeria', 'admision', 'administrador'].includes(usuario.rol)) {
          const pacientesRes = await api.pacientes(token);
          if (activo) setPacientes(pacientesRes);
        }
      } finally {
        if (activo) setCargando(false);
      }
    }
    cargar();
    return () => {
      activo = false;
    };
  }, [token, usuario.rol]);

  if (cargando) return <div className="cargando">Cargando resumen…</div>;

  const proximas = citas.filter((c) => c.estado === 'programada').slice(0, 5);

  return (
    <div>
      <div className="encabezado-pagina">
        <h1>Hola, {usuario.nombre.split(' ')[0]}</h1>
        <p>{SALUDO_POR_ROL[usuario.rol]}</p>
      </div>

      <div className="rejilla">
        <div className="metrica">
          <div className="valor">{citas.filter((c) => c.estado === 'programada').length}</div>
          <div className="etiqueta">Citas programadas</div>
        </div>
        <div className="metrica">
          <div className="valor">{citas.filter((c) => c.estado === 'atendida').length}</div>
          <div className="etiqueta">Citas atendidas</div>
        </div>
        {pacientes !== null && (
          <div className="metrica">
            <div className="valor">{pacientes.length}</div>
            <div className="etiqueta">Pacientes registrados</div>
          </div>
        )}
      </div>

      <div className="tarjeta">
        <h3>Próximas citas</h3>
        {proximas.length === 0 ? (
          <p className="vacio">No hay citas programadas.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Paciente</th>
                <th>Médico</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {proximas.map((c) => (
                <tr key={c.id}>
                  <td>{new Date(c.fecha).toLocaleString('es-GT')}</td>
                  <td>{c.paciente_nombre}</td>
                  <td>{c.medico_nombre}</td>
                  <td>{c.motivo || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
