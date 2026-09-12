import { useState } from 'react';

export default function VistaExpediente({
  expediente,
  puedeRegistrarConsulta,
  puedeEditarAntecedentes,
  onAgregarConsulta,
  onActualizarAntecedentes,
}) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [notas, setNotas] = useState('');
  const [medicamento, setMedicamento] = useState('');
  const [dosis, setDosis] = useState('');
  const [enviando, setEnviando] = useState(false);

  const [mostrarFormAntecedentes, setMostrarFormAntecedentes] = useState(false);
  const [antecedentes, setAntecedentes] = useState(expediente?.antecedentes || '');
  const [alergias, setAlergias] = useState(expediente?.alergias || '');
  const [enviandoAntecedentes, setEnviandoAntecedentes] = useState(false);

  if (!expediente) {
    return <p className="vacio">Aún no hay un expediente registrado.</p>;
  }

  async function manejarEnvio(e) {
    e.preventDefault();
    setEnviando(true);
    try {
      const recetas = medicamento ? [{ medicamento, dosis, indicaciones: '' }] : [];
      await onAgregarConsulta({ motivo, diagnostico, notas, recetas });
      setMotivo('');
      setDiagnostico('');
      setNotas('');
      setMedicamento('');
      setDosis('');
      setMostrarFormulario(false);
    } finally {
      setEnviando(false);
    }
  }

  async function manejarAntecedentes(e) {
    e.preventDefault();
    setEnviandoAntecedentes(true);
    try {
      await onActualizarAntecedentes({ antecedentes, alergias });
      setMostrarFormAntecedentes(false);
    } finally {
      setEnviandoAntecedentes(false);
    }
  }

  return (
    <div>
      <div className="tarjeta">
        <h3>Datos clínicos generales</h3>
        {mostrarFormAntecedentes ? (
          <form onSubmit={manejarAntecedentes}>
            <div className="campo">
              <label>Antecedentes (historial clínico)</label>
              <textarea
                rows={3}
                value={antecedentes}
                onChange={(e) => setAntecedentes(e.target.value)}
              />
            </div>
            <div className="campo">
              <label>Alergias</label>
              <textarea
                rows={2}
                value={alergias}
                onChange={(e) => setAlergias(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="boton-primario"
                type="submit"
                disabled={enviandoAntecedentes}
                style={{ width: 'auto' }}
              >
                {enviandoAntecedentes ? 'Guardando…' : 'Guardar antecedentes'}
              </button>
              <button
                type="button"
                className="boton-secundario"
                onClick={() => setMostrarFormAntecedentes(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <>
            <p>
              <strong>Antecedentes:</strong>{' '}
              {expediente.antecedentes || 'Sin antecedentes registrados.'}
            </p>
            <p>
              <strong>Alergias:</strong> {expediente.alergias || 'Ninguna registrada.'}
            </p>
            {puedeEditarAntecedentes && (
              <button
                className="boton-secundario"
                onClick={() => {
                  setAntecedentes(expediente.antecedentes || '');
                  setAlergias(expediente.alergias || '');
                  setMostrarFormAntecedentes(true);
                }}
              >
                Editar antecedentes y alergias
              </button>
            )}
          </>
        )}
      </div>

      {puedeRegistrarConsulta && (
        <div className="tarjeta">
          {!mostrarFormulario ? (
            <button className="boton-secundario" onClick={() => setMostrarFormulario(true)}>
              + Registrar nueva consulta
            </button>
          ) : (
            <form onSubmit={manejarEnvio}>
              <h3>Nueva consulta</h3>
              <div className="campo">
                <label>Motivo de consulta</label>
                <input value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
              </div>
              <div className="campo">
                <label>Diagnóstico</label>
                <input value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} />
              </div>
              <div className="campo">
                <label>Notas</label>
                <textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
              </div>
              <div className="form-en-linea">
                <div className="campo">
                  <label>Medicamento recetado (opcional)</label>
                  <input value={medicamento} onChange={(e) => setMedicamento(e.target.value)} />
                </div>
                <div className="campo">
                  <label>Dosis</label>
                  <input value={dosis} onChange={(e) => setDosis(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button className="boton-primario" type="submit" disabled={enviando} style={{ width: 'auto' }}>
                  {enviando ? 'Guardando…' : 'Guardar consulta'}
                </button>
                <button
                  type="button"
                  className="boton-secundario"
                  onClick={() => setMostrarFormulario(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <h3 style={{ marginTop: 24 }}>Historial de consultas</h3>
      {expediente.consultas.length === 0 ? (
        <p className="vacio">Todavía no hay consultas registradas.</p>
      ) : (
        expediente.consultas.map((c) => (
          <div className="tarjeta tarjeta-consulta" key={c.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{c.motivo}</strong>
              <span style={{ color: 'var(--gris-texto)', fontSize: '0.85rem' }}>
                {new Date(c.fecha).toLocaleDateString('es-GT')}
              </span>
            </div>
            <p style={{ margin: '6px 0' }}>
              Atendido por {c.medico_nombre} · {c.especialidad || 'Medicina General'}
            </p>
            {c.diagnostico && (
              <p>
                <strong>Diagnóstico:</strong> {c.diagnostico}
              </p>
            )}
            {c.notas && <p>{c.notas}</p>}
            {c.recetas.length > 0 && (
              <div>
                <strong>Receta:</strong>
                <ul style={{ margin: '4px 0 0 18px', color: 'var(--gris-texto)' }}>
                  {c.recetas.map((r) => (
                    <li key={r.id}>
                      {r.medicamento} {r.dosis ? `— ${r.dosis}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}