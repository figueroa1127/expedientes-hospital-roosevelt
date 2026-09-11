import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function Pacientes() {
  const { token, usuario } = useAuth();
  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    api
      .pacientes(token)
      .then(setPacientes)
      .finally(() => setCargando(false));
  }, [token]);

  const filtrados = pacientes.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const puedeVerExpediente = ['medico', 'enfermeria', 'administrador'].includes(usuario.rol);

  return (
    <div>
      <div className="encabezado-pagina">
        <h1>Pacientes</h1>
        <p>Listado de pacientes registrados en el sistema.</p>
      </div>

      <div className="campo" style={{ maxWidth: 320 }}>
        <input
          placeholder="Buscar por nombre…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="tarjeta">
        {cargando ? (
          <p className="vacio">Cargando pacientes…</p>
        ) : filtrados.length === 0 ? (
          <p className="vacio">No se encontraron pacientes.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Tipo de sangre</th>
                <th>Teléfono</th>
                {puedeVerExpediente && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td>{p.correo}</td>
                  <td>{p.tipo_sangre || '—'}</td>
                  <td>{p.telefono || '—'}</td>
                  {puedeVerExpediente && (
                    <td>
                      <Link className="boton-secundario" to={`/pacientes/${p.id}`}>
                        Ver expediente
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
