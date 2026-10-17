import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { GraficaBarras, GraficaDona, ListaRanking } from '../components/Graficas';

const ETIQUETA_ESTADO = {
  programada: 'Programadas',
  atendida: 'Atendidas',
  cancelada: 'Canceladas',
};

export default function Dashboard() {
  const { token, usuario } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    api
      .reportesResumen(token)
      .then((res) => activo && setDatos(res))
      .catch((e) => activo && setError(e.message))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [token]);

  if (cargando) return <p className="cargando">Cargando panel de control…</p>;
  if (error) return <div className="mensaje-error">{error}</div>;
  if (!datos) return null;

  const { totales } = datos;
  const citasPorEstado = datos.citasPorEstado.map((c) => ({
    etiqueta: ETIQUETA_ESTADO[c.etiqueta] || c.etiqueta,
    valor: c.valor,
  }));

  return (
    <div>
      <div className="encabezado-pagina">
        <h1>Panel de control</h1>
        <p>Indicadores generales del hospital, {usuario.nombre.split(' ')[0]}.</p>
      </div>

      <div className="banner-panel">
        <div className="texto">
          <h2>Resumen en tiempo real</h2>
          <p>
            Vigila la actividad clínica del hospital: pacientes, consultas, citas y órdenes de
            laboratorio, todo actualizado desde la base de datos.
          </p>
        </div>
        <img className="banner-foto" src="/fotos/equipo-medico.jpg" alt="Equipo médico del Hospital Roosevelt" />
      </div>

      <div className="rejilla">
        <div className="metrica metrica-destacada">
          <div className="valor">{totales.pacientes}</div>
          <div className="etiqueta">Pacientes registrados</div>
        </div>
        <div className="metrica metrica-destacada">
          <div className="valor">{totales.consultas}</div>
          <div className="etiqueta">Consultas médicas</div>
        </div>
        <div className="metrica metrica-destacada">
          <div className="valor">{totales.citasProgramadas}</div>
          <div className="etiqueta">Citas programadas</div>
        </div>
        <div className="metrica metrica-destacada">
          <div className="valor">{totales.ordenesPendientes}</div>
          <div className="etiqueta">Órdenes de laboratorio pendientes</div>
        </div>
      </div>

      <div className="rejilla rejilla-doble">
        <div className="tarjeta">
          <h3>Consultas por mes</h3>
          <p style={{ fontSize: '0.85rem' }}>Actividad clínica en los últimos seis meses.</p>
          <GraficaBarras datos={datos.consultasPorMes} />
        </div>

        <div className="tarjeta">
          <h3>Citas por estado</h3>
          <p style={{ fontSize: '0.85rem' }}>Distribución de la agenda de citas.</p>
          <GraficaDona datos={citasPorEstado} unidad="citas" />
        </div>
      </div>

      <div className="rejilla rejilla-doble">
        <div className="tarjeta">
          <h3>Diagnósticos más frecuentes</h3>
          <ListaRanking datos={datos.diagnosticosFrecuentes} />
        </div>

        <div className="tarjeta">
          <h3>Pacientes por grupo de edad</h3>
          <ListaRanking datos={datos.gruposEdad} color="var(--verde-ok)" />
        </div>
      </div>

      <div className="tarjeta">
        <h3>Distribución por tipo de sangre</h3>
        <GraficaBarras datos={datos.tiposSangre} />
      </div>
    </div>
  );
}
