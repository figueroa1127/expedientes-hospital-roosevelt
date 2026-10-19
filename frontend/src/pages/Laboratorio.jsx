import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { leerArchivoBase64, formatoValido, abrirArchivoAdjunto } from '../utils/archivo';

const ETIQUETA_ESTADO = {
  solicitada: 'Solicitada',
  en_proceso: 'En proceso',
  completada: 'Completada',
};

const FILTROS = [
  { clave: 'pendientes', etiqueta: 'Pendientes' },
  { clave: 'todas', etiqueta: 'Todas' },
  { clave: 'completada', etiqueta: 'Completadas' },
];

export default function Laboratorio() {
  const { token } = useAuth();
  const [ordenes, setOrdenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('pendientes');
  const [abierta, setAbierta] = useState(null);
  const [resultado, setResultado] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function cargar() {
    setCargando(true);
    try {
      setOrdenes(await api.laboratorio(token));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function seleccionarArchivo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!formatoValido(file.type)) {
      setError('Formato no permitido. Usa PDF, PNG o JPG.');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo es demasiado grande (máximo 5 MB).');
      e.target.value = '';
      return;
    }
    setError('');
    setArchivo(await leerArchivoBase64(file));
  }

  async function guardarResultado(o) {
    if (!resultado.trim() && !archivo) {
      setError('Escribe un resultado o adjunta un archivo.');
      return;
    }
    setError('');
    setEnviando(true);
    try {
      const datos = {};
      if (resultado.trim()) datos.resultado = resultado;
      if (archivo) datos.archivo = archivo;
      await api.actualizarOrdenLaboratorio(token, o.id, datos);
      setAbierta(null);
      setResultado('');
      setArchivo(null);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function cambiarEstado(o, estado) {
    await api.actualizarOrdenLaboratorio(token, o.id, { estado });
    await cargar();
  }

  const visibles = ordenes.filter((o) => {
    if (filtro === 'pendientes') return o.estado !== 'completada';
    if (filtro === 'completada') return o.estado === 'completada';
    return true;
  });

  return (
    <div>
      <div className="encabezado-pagina">
        <h1>Laboratorio</h1>
        <p>Órdenes de exámenes solicitadas por los médicos y registro de resultados.</p>
      </div>

      {error && <div className="mensaje-error">{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {FILTROS.map((f) => (
          <button
            key={f.clave}
            className={filtro === f.clave ? 'boton-primario' : 'boton-secundario'}
            style={{ width: 'auto', padding: '7px 14px' }}
            onClick={() => setFiltro(f.clave)}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="cargando">Cargando órdenes…</p>
      ) : visibles.length === 0 ? (
        <p className="vacio">No hay órdenes en esta vista.</p>
      ) : (
        visibles.map((o) => (
          <div className="tarjeta tarjeta-consulta" key={o.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{o.examen}</strong>
              <span className={`insignia-orden ${o.estado}`}>{ETIQUETA_ESTADO[o.estado]}</span>
            </div>
            <p style={{ margin: '6px 0' }}>
              Paciente <strong>{o.paciente_nombre}</strong> · solicitado por {o.medico_nombre} el{' '}
              {new Date(o.fecha_solicitud).toLocaleDateString('es-GT')}
            </p>
            {o.indicaciones && (
              <p style={{ margin: '4px 0' }}>
                <strong>Indicaciones:</strong> {o.indicaciones}
              </p>
            )}

            {o.estado === 'completada' ? (
              <div className="resultado-caja">
                <strong>Resultado:</strong>
                <p style={{ margin: '4px 0 0' }}>{o.resultado || 'Sin detalle del resultado.'}</p>
                {o.archivo_nombre && (
                  <button
                    type="button"
                    className="boton-secundario"
                    style={{ marginTop: 8 }}
                    onClick={() => abrirArchivoAdjunto(token, o.id).catch((e) => setError(e.message))}
                  >
                    Ver archivo adjunto ({o.archivo_nombre})
                  </button>
                )}
                {o.fecha_resultado && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--gris-texto)', marginLeft: 10 }}>
                    Reportado el {new Date(o.fecha_resultado).toLocaleString('es-GT')}
                  </span>
                )}
              </div>
            ) : abierta === o.id ? (
              <div style={{ marginTop: 8 }}>
                <div className="campo">
                  <label>Resultado del examen</label>
                  <textarea
                    rows={3}
                    value={resultado}
                    onChange={(e) => setResultado(e.target.value)}
                    placeholder="Escribe los valores o la interpretación del resultado…"
                  />
                </div>
                <div className="campo">
                  <label>Adjuntar archivo (PDF, PNG o JPG)</label>
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={seleccionarArchivo} />
                  {archivo && <span style={{ fontSize: '0.8rem', color: 'var(--verde-ok)' }}>{archivo.nombre}</span>}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="boton-primario"
                    style={{ width: 'auto' }}
                    disabled={enviando}
                    onClick={() => guardarResultado(o)}
                  >
                    {enviando ? 'Guardando…' : 'Guardar resultado'}
                  </button>
                  <button
                    className="boton-secundario"
                    onClick={() => {
                      setAbierta(null);
                      setResultado('');
                      setArchivo(null);
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button
                  className="boton-secundario"
                  onClick={() => {
                    setAbierta(o.id);
                    setResultado(o.resultado || '');
                    setArchivo(null);
                  }}
                >
                  Registrar resultado
                </button>
                {o.estado === 'solicitada' && (
                  <button className="boton-secundario" onClick={() => cambiarEstado(o, 'en_proceso')}>
                    Marcar en proceso
                  </button>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
